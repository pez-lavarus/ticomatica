"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { hasGraphAspect, preloadGraphAspect } from "@/lib/graph-aspects";
import { planQuestionLayout, samePlan } from "@/lib/question-layout-plan";
import type { LayoutPlan, PanelId, PanelMeasurer, PanelVariant } from "@/lib/question-layout-plan";
import { hasSourceSvg, preloadSourceSvg } from "./SourceImage";
import type { PanelSlot } from "./QuestionPanel";

// This hook only measures and applies. Every decision (which panels sit side
// by side, how wide each one is, how big the graph is, whether the screen
// scrolls) lives in `lib/question-layout-plan.ts`, which is unit-tested.

interface UseQuestionLayoutOptions {
  questionKey: number;
  hasGraph: boolean;
  hasStatementText: boolean;
  optionCount: number;
  /** Every image the panels show, so the layout re-plans once sizes are known. */
  imageSources: string[];
  /** Inline SVGs can have different proportions from their raster fallback. */
  vectorSources: string[];
  /** The shared graph source, so its chosen size is reused across questions. */
  graphSrc?: string;
}

interface ContainerBox {
  width: number;
  height: number;
}

interface PlanState {
  questionKey: number | null;
  plan: LayoutPlan | null;
  /** Only panels already placed for this question can animate a resize. */
  placed: Partial<Record<PanelId, boolean>>;
}

const px = (value: string) => Number.parseFloat(value) || 0;

/** Graph size a shared image settled on, for the available space it was
 *  planned in. Sibling questions that show the same graph start from it as a
 *  ceiling so the graph keeps its size while the student navigates. The entry
 *  is tied to the container size (which already includes the font scale), so a
 *  resize or a font change starts over and the graph can grow back. */
const graphCeilings = new Map<string, { space: string; graphMax: number; owner: number }>();

const spaceKey = (box: ContainerBox) => `${box.width}x${box.height}`;

/** Only a sibling's size limits this question; its own earlier plans must not,
 *  or a re-plan after a font or image arrives could never grow the graph. */
function graphCeilingFor(src: string | undefined, box: ContainerBox, owner: number): number | undefined {
  if (!src) return undefined;
  const entry = graphCeilings.get(src);
  return entry && entry.owner !== owner && entry.space === spaceKey(box) ? entry.graphMax : undefined;
}

function getContentBox(el: HTMLElement): ContainerBox {
  const style = getComputedStyle(el);
  return {
    width: Math.floor(el.clientWidth - px(style.paddingLeft) - px(style.paddingRight)),
    height: Math.floor(el.clientHeight - px(style.paddingTop) - px(style.paddingBottom)),
  };
}

function createMeasurer(el: HTMLElement, id: PanelId, variants: PanelVariant[]): PanelMeasurer {
  const frame = el.parentElement as HTMLElement;
  const chromeX = Math.max(0, frame.offsetWidth - frame.clientWidth);
  const chromeY = Math.max(0, frame.offsetHeight - frame.clientHeight);

  const probe = <T,>(
    width: string,
    variant: PanelVariant,
    graphMax: number | null,
    read: () => T,
  ): T => {
    const saved = {
      position: el.style.position,
      left: el.style.left,
      top: el.style.top,
      width: el.style.width,
      split: el.dataset.split,
      columns: el.dataset.columns,
      graphMax: el.style.getPropertyValue("--graph-max"),
    };
    el.style.position = "absolute";
    el.style.left = "0";
    el.style.top = "0";
    el.style.width = width;
    if (id === "statement") {
      if (variant.split !== undefined) el.dataset.split = String(variant.split);
      if (graphMax === null) el.style.removeProperty("--graph-max");
      else el.style.setProperty("--graph-max", `${graphMax}px`);
    }
    if (id === "options" && variant.columns !== undefined) el.dataset.columns = String(variant.columns);
    try {
      return read();
    } finally {
      el.style.position = saved.position;
      el.style.left = saved.left;
      el.style.top = saved.top;
      el.style.width = saved.width;
      if (saved.split === undefined) delete el.dataset.split;
      else el.dataset.split = saved.split;
      if (saved.columns === undefined) delete el.dataset.columns;
      else el.dataset.columns = saved.columns;
      if (saved.graphMax) el.style.setProperty("--graph-max", saved.graphMax);
      else el.style.removeProperty("--graph-max");
    }
  };

  return {
    variants,
    height: (width, variant, graphMax) =>
      probe(`${Math.max(width - chromeX, 1)}px`, variant, graphMax, () => el.offsetHeight + chromeY),
    maxContentWidth: (variant, graphMax) =>
      probe("max-content", variant, graphMax, () => el.offsetWidth + chromeX),
  };
}

export function useQuestionLayout({
  questionKey,
  hasGraph,
  hasStatementText,
  optionCount,
  imageSources,
  vectorSources,
  graphSrc,
}: UseQuestionLayoutOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState<ContainerBox | null>(null);
  const [state, setState] = useState<PlanState>({ questionKey: null, plan: null, placed: {} });
  // Bumped when something that changes natural sizes finishes loading. Multiple
  // arrivals in the same frame are coalesced so the panels re-plan once instead
  // of animating through several intermediate layouts.
  const [measureVersion, setMeasureVersion] = useState(0);
  const measureFrameRef = useRef(0);
  const bumpMeasure = useCallback(() => {
    cancelAnimationFrame(measureFrameRef.current);
    measureFrameRef.current = requestAnimationFrame(() => setMeasureVersion((n) => n + 1));
  }, []);
  const [fontsReady, setFontsReady] = useState<boolean>(() => typeof document !== "undefined" && !document.fonts);

  useEffect(() => () => cancelAnimationFrame(measureFrameRef.current), []);

  // Registry of the panels' content elements.
  const [registry] = useState(() => {
    const elements: Partial<Record<PanelId, HTMLElement>> = {};
    const make = (id: PanelId) => (el: HTMLElement | null) => {
      if (el) elements[id] = el;
      else delete elements[id];
    };
    return {
      elements,
      refs: {
        statement: make("statement"),
        options: make("options"),
        explanation: make("explanation"),
      },
    };
  });

  // Container size: read on mount so the first paint is already laid out, then kept current.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const read = () => {
      const next = getContentBox(el);
      setBox((prev) => (prev && prev.width === next.width && prev.height === next.height ? prev : next));
    };
    read();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Resolve the whole question before exposing its layout. Revealing each
  // image separately paints several candidate arrangements on a cold cache.
  const imageKey = imageSources.join("|");
  const vectorKey = vectorSources.join("|");
  useEffect(() => {
    let cancelled = false;
    const images = imageKey ? imageKey.split("|") : [];
    const vectors = vectorKey ? vectorKey.split("|") : [];
    if (images.every(hasGraphAspect) && vectors.every(hasSourceSvg)) return;
    Promise.all([
      ...images.map(preloadGraphAspect),
      ...vectors.map(preloadSourceSvg),
    ]).then(() => {
      if (!cancelled) bumpMeasure();
    });
    return () => { cancelled = true; };
  }, [imageKey, vectorKey, bumpMeasure]);

  // Web fonts (KaTeX, serif body) change text metrics when they arrive.
  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts) return;
    const fonts = document.fonts;
    let frame = 0;
    let cancelled = false;
    const loading = () => setFontsReady(false);
    const schedule = () => {
      if (cancelled) return;
      setFontsReady(true);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(bumpMeasure);
    };
    fonts.addEventListener("loading", loading);
    fonts.addEventListener("loadingdone", schedule);
    fonts.ready.then(schedule);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      fonts.removeEventListener("loading", loading);
      fonts.removeEventListener("loadingdone", schedule);
    };
  }, [bumpMeasure]);

  const settled = fontsReady && imageSources.every(hasGraphAspect) && vectorSources.every(hasSourceSvg);

  useLayoutEffect(() => {
    if (!settled || !box || box.width <= 0 || box.height <= 0) return;
    const statementEl = registry.elements.statement;
    const optionsEl = registry.elements.options;
    if (!statementEl || !optionsEl) return;

    const compute = () => {
      const next = planQuestionLayout({
        containerWidth: box.width,
        containerHeight: box.height,
        hasGraph,
        graphCeiling: graphCeilingFor(graphSrc, box, questionKey),
        previous: null,
        panels: {
          statement: createMeasurer(
            statementEl,
            "statement",
            hasGraph && hasStatementText ? [{ split: false }, { split: true }] : [{}],
          ),
          options: createMeasurer(
            optionsEl,
            "options",
            optionCount >= 2 ? [{ columns: 1 }, { columns: 2 }] : [{ columns: 1 }],
          ),
          explanation: null,
        },
      });
      if (graphSrc && next.graphMax !== null) {
        graphCeilings.set(graphSrc, { space: spaceKey(box), graphMax: next.graphMax, owner: questionKey });
      }

      setState((current) => {
        const sameQuestion = current.questionKey === questionKey;
        if (sameQuestion && samePlan(current.plan, next)) return current;
        const placed: Partial<Record<PanelId, boolean>> = {
          statement: sameQuestion && Boolean(current.plan?.rects.statement),
          options: sameQuestion && Boolean(current.plan?.rects.options),
          explanation: sameQuestion && Boolean(current.plan?.rects.explanation),
        };
        return {
          questionKey,
          plan: next,
          placed,
        };
      });
    };

    compute();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(compute);
    observer.observe(statementEl);
    observer.observe(optionsEl);
    return () => observer.disconnect();
  }, [box, questionKey, hasGraph, hasStatementText, optionCount, measureVersion, registry, graphSrc, settled]);

  // A new question starts at the top.
  useLayoutEffect(() => {
    containerRef.current?.scrollTo?.({ top: 0 });
  }, [questionKey]);

  const { plan, placed } = state;

  const ready = settled && state.questionKey === questionKey && plan !== null;

  const slot = useCallback(
    (id: PanelId): PanelSlot => ({
      register: registry.refs[id],
      rect: plan?.rects[id] ?? null,
      animate: ready && Boolean(placed[id]),
    }),
    [plan, placed, registry, ready],
  );

  return {
    containerRef,
    ready,
    animate: ready && Boolean(placed.statement || placed.options),
    plan,
    slot,
    /** Height for the positioning stage; undefined before the first plan. */
    stageHeight: plan?.stageHeight,
    statementSplit: plan?.statementVariant.split ?? false,
    optionsColumns: (plan?.optionsVariant.columns ?? 1) as 1 | 2,
    graphMax: plan?.graphMax ?? null,
  };
}

// ---------------------------------------------------------------------------
// Hint panel width
// ---------------------------------------------------------------------------
const HINT_PANEL_IDEAL_PX = 440;
const HINT_PANEL_MIN_PX = 320;
const MIN_QUESTION_SPACE_PX = 560;

export function computeHintPanelWidth(availableWidth: number): number {
  const bySpace = availableWidth - MIN_QUESTION_SPACE_PX;
  return Math.min(HINT_PANEL_IDEAL_PX, Math.max(HINT_PANEL_MIN_PX, bySpace));
}

/** Reactive width (px) for the hint panel, following the viewport size. */
export function useHintPanelWidth(): number {
  const [width, setWidth] = useState<number>(() =>
    typeof window === "undefined" ? HINT_PANEL_IDEAL_PX : computeHintPanelWidth(window.innerWidth),
  );

  useEffect(() => {
    const update = () => setWidth(computeHintPanelWidth(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return width;
}
