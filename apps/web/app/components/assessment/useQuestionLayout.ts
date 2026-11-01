"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LayoutCharacteristics } from "@/lib/question-characteristics";
import { useFontScale } from "@/lib/font-scale";
import { hasGraphAspect, preloadGraphAspect } from "@/lib/graph-aspects";
import { planQuestionLayout, samePlan } from "@/lib/question-layout-plan";
import type { LayoutPlan, PanelId, PanelMeasurer, PanelVariant } from "@/lib/question-layout-plan";
import { hasSourceSvg, preloadSourceSvg } from "./SourceImage";
import type { PanelSlot } from "./QuestionPanel";

// This hook only measures and applies. Every decision (which panels sit side
// by side, how wide each one is, how big the graph is, whether the screen
// scrolls) lives in `lib/question-layout-plan.ts`, which is unit-tested.

interface UseQuestionLayoutOptions {
  characteristics: LayoutCharacteristics;
  questionKey: number;
  hasGraph: boolean;
  hasOptionGraphs: boolean;
  hasStatementText: boolean;
  optionCount: number;
  /** Every image the panels show, so the layout re-plans once sizes are known. */
  imageSources: string[];
  /** Inline SVGs can have different proportions from their raster fallback. */
  vectorSources: string[];
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

const spaceKey = (box: ContainerBox) => `${box.width}x${box.height}`;

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
    minimumFormulaWidth: id === "options" ? () => probe("max-content", { columns: 1 }, null, () => {
      let minimum = 0;
      for (const formula of el.querySelectorAll<HTMLElement>(".option-math .katex-html")) {
        const answer = formula.closest<HTMLElement>(".response-option-button");
        if (!answer) continue;
        const answerStyle = getComputedStyle(answer);
        const panelStyle = getComputedStyle(el.firstElementChild as HTMLElement);
        const letter = answer.firstElementChild as HTMLElement | null;
        const chrome = px(panelStyle.paddingLeft) + px(panelStyle.paddingRight) + chromeX
          + px(answerStyle.paddingLeft) + px(answerStyle.paddingRight)
          + px(answerStyle.borderLeftWidth) + px(answerStyle.borderRightWidth)
          + px(answerStyle.columnGap) + (letter?.offsetWidth ?? 0) + 16;
        let contentPadding = 0;
        for (let parent = formula.parentElement; parent && parent !== answer; parent = parent.parentElement) {
          const style = getComputedStyle(parent);
          contentPadding += px(style.paddingLeft) + px(style.paddingRight);
        }
        minimum = Math.max(minimum, formula.offsetWidth + chrome + contentPadding);
      }
      return minimum;
    }) : undefined,
    height: (width, variant, graphMax) =>
      probe(`${Math.max(width - chromeX, 1)}px`, variant, graphMax, () => el.offsetHeight + chromeY),
    maxContentWidth: (variant, graphMax) =>
      probe("max-content", variant, graphMax, () => el.offsetWidth + chromeX),
  };
}

export function useQuestionLayout({
  characteristics,
  questionKey,
  hasGraph,
  hasOptionGraphs,
  hasStatementText,
  optionCount,
  imageSources,
  vectorSources,
}: UseQuestionLayoutOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastArrangement = useRef<{ space: string; plan: LayoutPlan } | null>(null);
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
        characteristics,
        containerWidth: box.width,
        containerHeight: box.height,
        hasGraph,
        hasOptionGraphs,
        previous: null,
        preferredArrangement: lastArrangement.current?.space === spaceKey(box)
          ? lastArrangement.current.plan : null,
        panels: {
          statement: createMeasurer(
            statementEl,
            "statement",
            hasGraph ? [{ split: false }] : [{}],
          ),
          options: createMeasurer(
            optionsEl,
            "options",
            optionCount >= 2 ? [{ columns: 1 }, { columns: 2 }] : [{ columns: 1 }],
          ),
          explanation: null,
        },
      });
      lastArrangement.current = { space: spaceKey(box), plan: next };


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
  }, [box, characteristics, questionKey, hasGraph, hasOptionGraphs, hasStatementText, optionCount, measureVersion, registry, settled]);

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
    wideAnswers: Boolean(plan?.wideAnswers),
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
const HINT_PANEL_IDEAL_PX = 520;
const HINT_PANEL_MIN_PX = 360;
const MIN_QUESTION_SPACE_PX = 480;
const ASSESSMENT_GUTTER_PX = 96;

export function computeHintPanelWidth(availableWidth: number, navigatorWidth = 0, fontScale = 1): number {
  const bySpace = (availableWidth - navigatorWidth - ASSESSMENT_GUTTER_PX) / fontScale - MIN_QUESTION_SPACE_PX;
  return Math.min(HINT_PANEL_IDEAL_PX, Math.max(HINT_PANEL_MIN_PX, bySpace));
}

/** Reactive width (px) for the hint panel, following the viewport size. */
export function useHintPanelWidth(navigatorVisible = false): number {
  const { scale } = useFontScale();
  const measureWidth = useCallback(() => {
    const viewport = window.innerWidth;
    // Navigator widths match lg:w-80 and xl:w-70 in AssessmentNavigator.
    const navigatorWidth = navigatorVisible && viewport >= 1024 ? (viewport >= 1280 ? 280 : 320) : 0;
    return computeHintPanelWidth(viewport, navigatorWidth, scale);
  }, [navigatorVisible, scale]);
  const [width, setWidth] = useState<number>(() =>
    typeof window === "undefined" ? HINT_PANEL_IDEAL_PX : measureWidth(),
  );

  useLayoutEffect(() => {
    const update = () => setWidth(measureWidth());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [measureWidth]);

  return width;
}
