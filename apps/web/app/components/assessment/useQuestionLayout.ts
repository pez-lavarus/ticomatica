"use client";

import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { getGraphAspect, preloadGraphAspect } from "@/lib/graph-aspects";
import { planQuestionLayout, samePlan } from "@/lib/question-layout-plan";
import type { LayoutPlan, PanelId, PanelMeasurer, PanelVariant } from "@/lib/question-layout-plan";
import type { PanelSlot } from "./QuestionPanel";

// This hook only measures and applies. Every decision (which panels sit side
// by side, how wide each one is, how big the graph is, whether the screen
// scrolls) lives in `lib/question-layout-plan.ts`, which is unit-tested.
//
// How measuring works. Each panel's content element hangs out of flow from its
// frame (see QuestionPanel), so the engine can ask "how tall are you at 520px,
// with the graph capped at 220px, in two columns?" by temporarily setting
// those on the element, reading offsetHeight, and restoring. All of it happens
// synchronously inside one layout effect, so nothing is painted and nothing
// animates while probing; the frame only ever sees the final plan.
//
// Units: the font scale is a CSS `zoom` on an ancestor, so everything is read
// with the offset/client family, which reports in the zoomed element's own
// coordinates. Nothing here uses getBoundingClientRect or window sizes. A
// larger font makes the container smaller in these units, which is what
// triggers a new plan.

interface UseQuestionLayoutOptions {
  questionKey: number;
  hasGraph: boolean;
  hasStatementText: boolean;
  optionCount: number;
  /** The explanation panel is mounted. */
  hasExplanation: boolean;
  /** Every image the panels show, so the layout re-plans once sizes are known. */
  imageSources: string[];
  /** The shared graph source, so its chosen size is reused across questions. */
  graphSrc?: string;
}

interface ContainerBox {
  width: number;
  height: number;
}

interface PlanState {
  plan: LayoutPlan | null;
  /** Panels that already had a place in the previous plan: only they animate. */
  placed: Partial<Record<PanelId, boolean>>;
}

const px = (value: string) => Number.parseFloat(value) || 0;

/** Chosen graph max-height per shared image, so sibling questions that reuse
 *  the same graph keep the same graph dimensions instead of re-shrinking. */
const graphMaxCache = new Map<string, number | null>();

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
  hasExplanation,
  imageSources,
  graphSrc,
}: UseQuestionLayoutOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastPlan = useRef<{
    plan: LayoutPlan;
    questionKey: number;
    box: ContainerBox;
    hasExplanation: boolean;
  } | null>(null);
  const [box, setBox] = useState<ContainerBox | null>(null);
  const [state, setState] = useState<PlanState>({ plan: null, placed: {} });
  // Bumped when something that changes natural sizes finishes loading.
  const [measureVersion, bumpMeasure] = useReducer((n: number) => n + 1, 0);

  // Registry of the panels' content elements, with one stable ref callback per
  // panel. Built once; it is a plain object (not a ref) because the callbacks
  // are handed to the panels during render.
  const [registry] = useState(() => {
    const elements: Partial<Record<PanelId, HTMLElement>> = {};
    const make = (id: PanelId) => (el: HTMLElement | null) => {
      if (el) elements[id] = el;
      else delete elements[id];
    };
    return {
      elements,
      refs: { statement: make("statement"), options: make("options"), explanation: make("explanation") },
    };
  });

  // Container size: read on mount so the first paint is already laid out, then
  // kept current. Font-scale changes resize the container in local pixels.
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

  // Image sizes are needed before the panels have their real height.
  const imageKey = imageSources.join("|");
  useEffect(() => {
    let cancelled = false;
    for (const src of imageKey ? imageKey.split("|") : []) {
      if (getGraphAspect(src) !== null) continue;
      preloadGraphAspect(src).then(() => {
        if (!cancelled) bumpMeasure();
      });
    }
    return () => {
      cancelled = true;
    };
  }, [imageKey]);

  // Web fonts (KaTeX, serif body) change text metrics when they arrive.
  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts) return;
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(bumpMeasure);
    };
    document.fonts.addEventListener("loadingdone", schedule);
    document.fonts.ready.then(schedule);
    return () => {
      cancelAnimationFrame(frame);
      document.fonts.removeEventListener("loadingdone", schedule);
    };
  }, []);

  useLayoutEffect(() => {
    if (!box || box.width <= 0 || box.height <= 0) return;
    const statementEl = registry.elements.statement;
    const optionsEl = registry.elements.options;
    const explanationEl = hasExplanation ? registry.elements.explanation : undefined;
    if (!statementEl || !optionsEl) return;

    const compute = () => {
      const prev = lastPlan.current;
      const sameScreen =
        prev && prev.questionKey === questionKey && prev.box.width === box.width && prev.box.height === box.height;
      // Only bias toward the previous plan when the explanation is (dis)appearing:
      // that is when we want to limit how far the existing panels jump. A pure
      // re-measure (graph or font arrived) must be free to move panels to their
      // true positions, otherwise the layout becomes dependent on visit order.
      const previous = sameScreen && prev.hasExplanation !== hasExplanation ? prev.plan : null;

      const next = planQuestionLayout({
        containerWidth: box.width,
        containerHeight: box.height,
        hasGraph,
        preferredGraphMax: graphSrc ? graphMaxCache.get(graphSrc) : undefined,
        previous,
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
          explanation: explanationEl ? createMeasurer(explanationEl, "explanation", [{}]) : null,
        },
      });
      lastPlan.current = { plan: next, questionKey, box, hasExplanation };
      if (graphSrc) graphMaxCache.set(graphSrc, next.graphMax);

      setState((current) => {
        if (samePlan(current.plan, next)) return current;
        return {
          plan: next,
          placed: {
            statement: Boolean(current.plan?.rects.statement),
            options: Boolean(current.plan?.rects.options),
            explanation: Boolean(current.plan?.rects.explanation),
          },
        };
      });
    };

    compute();

    // Re-plan when a panel's content settles at a different size (an image or
    // a web font arrives, the question changes under our feet, etc.). The probe
    // above mutates and restores widths synchronously, so it never reaches this
    // observer; only real size changes do.
    const observer = new ResizeObserver(compute);
    observer.observe(statementEl);
    observer.observe(optionsEl);
    if (explanationEl) observer.observe(explanationEl);
    return () => observer.disconnect();
  }, [box, questionKey, hasGraph, hasStatementText, optionCount, hasExplanation, measureVersion, registry, graphSrc]);

  // A new question starts at the top.
  useEffect(() => {
    containerRef.current?.scrollTo?.({ top: 0 });
  }, [questionKey]);

  const { plan, placed } = state;

  const slot = useCallback(
    (id: PanelId): PanelSlot => ({
      register: registry.refs[id],
      rect: plan?.rects[id] ?? null,
      animate: Boolean(placed[id]),
    }),
    [plan, placed, registry],
  );

  return {
    containerRef,
    plan,
    slot,
    /** Height for the positioning stage; undefined before the first plan. */
    stageHeight: plan?.stageHeight,
    statementSplit: plan?.statementVariant.split ?? false,
    optionsColumns: (plan?.optionsVariant.columns ?? 1) as 1 | 2,
    graphMax: plan?.graphMax ?? null,
  };
}
