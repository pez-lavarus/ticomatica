"use client";

import { useEffect, useLayoutEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import type { RefObject } from "react";
import { getGraphAspect, preloadGraphAspect } from "@/lib/graph-aspects";

export type QuestionLayout = "horizontal" | "vertical";

// Below this viewport width the layout is always forced vertical (matches the
// `lg` breakpoint used by the previous hardcoded grid).
const VIEWPORT_BREAKPOINT_PX = 1024;

// Even on a wide viewport the sidebar can leave the question column too narrow
// for two columns; below this container width we force vertical.
const CONTAINER_BREAKPOINT_PX = 720;

// A graph wider than this ("heavily horizontal") needs full width, so it stacks
// the components vertically. Tall or squarish graphs fit a narrower column and
// keep the components side by side, with the options given priority for their
// formulas.
const HEAVILY_HORIZONTAL_ASPECT = 2.0;

// When side by side, the statement column takes a fraction of the row. Taller
// graphs get a narrower statement column so options keep room for their formulas;
// horizontal-leaning graphs get a wider statement column so they stretch further.
const STATEMENT_COL_MIN = 0.28;
const STATEMENT_COL_MAX = 0.5;

// For image-option questions the statement is just text, so it gets a compact
// sticky column while the image options take a slightly larger share.
const IMAGE_OPTIONS_STATEMENT_FRACTION = 0.45;

// Graph sizing budget for vertical layout: the graph is shrunk so the options
// stay visible without scrolling, within these bounds. The ceiling keeps the
// graph from expanding past a reasonable figure size.
const MIN_GRAPH_HEIGHT = 140;
const MAX_GRAPH_HEIGHT = 360;
const BOTTOM_MARGIN = 24;

interface UseQuestionLayoutOptions {
  graphSrc?: string;
  questionKey: number;
  hasImageOptions: boolean;
  statementRef: RefObject<HTMLDivElement | null>;
  optionsRef: RefObject<HTMLDivElement | null>;
  graphWrapperRef: RefObject<HTMLDivElement | null>;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getScrollOffset(el: HTMLElement): number {
  let offset = 0;
  let node: HTMLElement | null = el;
  while (node) {
    offset += node.scrollTop;
    node = node.parentElement;
  }
  return offset;
}

let viewportSnapshot: { width: number; height: number } | null = null;

function getViewportSnapshot() {
  if (typeof window === "undefined") return null;
  const width = window.innerWidth;
  const height = window.innerHeight;
  if (!viewportSnapshot || viewportSnapshot.width !== width || viewportSnapshot.height !== height) {
    viewportSnapshot = { width, height };
  }
  return viewportSnapshot;
}

function subscribeToViewport(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("resize", onStoreChange);
  return () => window.removeEventListener("resize", onStoreChange);
}

export function useQuestionLayout({
  graphSrc,
  questionKey,
  hasImageOptions,
  statementRef,
  optionsRef,
  graphWrapperRef,
}: UseQuestionLayoutOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [graphMaxHeight, setGraphMaxHeight] = useState<number | null>(null);
  const [optionsOverflow, setOptionsOverflow] = useState(false);
  const [, forceAspectUpdate] = useReducer((n: number) => n + 1, 0);

  // Server (and hydration) resolve to a single column; the client snapshot kicks
  // in right after hydration without a hydration mismatch.
  const viewport = useSyncExternalStore(
    (onStoreChange) => subscribeToViewport(onStoreChange),
    getViewportSnapshot,
    () => null,
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!graphSrc) return;
    let cancelled = false;
    preloadGraphAspect(graphSrc).then(() => {
      if (!cancelled) forceAspectUpdate();
    });
    return () => {
      cancelled = true;
    };
  }, [graphSrc]);

  const hasGraph = Boolean(graphSrc);
  const graphAspect = getGraphAspect(graphSrc);

  const viewportWidth = viewport?.width ?? null;
  const viewportHeight = viewport?.height ?? null;
  const forcedVertical =
    (viewportWidth !== null && viewportWidth < VIEWPORT_BREAKPOINT_PX) ||
    (containerWidth !== null && containerWidth < CONTAINER_BREAKPOINT_PX);

  // Default is vertical: no graph, an unknown/loading graph, or a heavily
  // horizontal graph all stack. Tall and squarish graphs go side by side.
  // Image-option questions also go side by side with a sticky statement so the
  // options can scroll independently while the statement stays visible.
  let layout: QuestionLayout = "vertical";
  let statementFraction = STATEMENT_COL_MAX;
  if (!forcedVertical) {
    if (hasImageOptions) {
      layout = "horizontal";
      statementFraction = IMAGE_OPTIONS_STATEMENT_FRACTION;
    } else if (
      hasGraph &&
      graphAspect !== null &&
      graphAspect <= HEAVILY_HORIZONTAL_ASPECT
    ) {
      layout = "horizontal";
      statementFraction = clamp(graphAspect / 2, STATEMENT_COL_MIN, STATEMENT_COL_MAX);
    }
  }

  const isStickyStatement = layout === "horizontal" && (hasImageOptions || optionsOverflow);

  const gridTemplateColumns =
    layout === "horizontal"
      ? `minmax(0, ${statementFraction.toFixed(3)}fr) minmax(0, ${(1 - statementFraction).toFixed(3)}fr)`
      : "minmax(0, 1fr)";

  // Detect when the options column is taller than the visible viewport so the
  // statement can stay sticky while the options scroll.
  useLayoutEffect(() => {
    const optionsEl = optionsRef.current;
    const statementEl = statementRef.current;
    if (!optionsEl || !statementEl || viewportHeight === null) return;

    const measure = () => {
      const optionsHeight = optionsEl.offsetHeight;
      const statementRect = statementEl.getBoundingClientRect();
      const contentTop = statementRect.top + getScrollOffset(statementEl);
      const availableHeight = viewportHeight - contentTop - BOTTOM_MARGIN;
      setOptionsOverflow(optionsHeight > availableHeight);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(optionsEl);
    observer.observe(statementEl);
    return () => observer.disconnect();
  }, [questionKey, viewportHeight, statementRef, optionsRef]);

  // In vertical layout, shrink the graph so the statement and options both fit
  // on screen; only the options have to remain fully visible without scrolling.
  // Measured in a layout effect so the first paint already has the final size,
  // which avoids a visible resize when switching questions.
  useLayoutEffect(() => {
    if (!hasGraph || layout !== "vertical" || viewportHeight === null) return;
    const statementEl = statementRef.current;
    const optionsEl = optionsRef.current;
    const graphEl = graphWrapperRef.current;
    if (!statementEl || !optionsEl || !graphEl) return;

    const measure = () => {
      const statementHeight = statementEl.offsetHeight;
      const optionsHeight = optionsEl.offsetHeight;
      const graphBoxHeight = graphEl.offsetHeight;
      const statementRect = statementEl.getBoundingClientRect();
      const optionsRect = optionsEl.getBoundingClientRect();
      const contentTop = statementRect.top + getScrollOffset(statementEl);
      const gap = Math.max(0, optionsRect.top - (statementRect.top + statementHeight));
      const chromeHeight = statementHeight - graphBoxHeight;
      const available = viewportHeight - contentTop - gap - optionsHeight - BOTTOM_MARGIN;
      setGraphMaxHeight(clamp(available - chromeHeight, MIN_GRAPH_HEIGHT, MAX_GRAPH_HEIGHT));
    };

    measure();

    const observer = new ResizeObserver(() => measure());
    observer.observe(statementEl);
    observer.observe(optionsEl);
    observer.observe(graphEl);
    return () => observer.disconnect();
  }, [questionKey, graphSrc, hasGraph, layout, viewportHeight, statementRef, optionsRef, graphWrapperRef]);

  const effectiveGraphMaxHeight =
    hasGraph && layout === "vertical" && graphMaxHeight !== null ? graphMaxHeight : undefined;

  return { containerRef, layout, gridTemplateColumns, graphMaxHeight: effectiveGraphMaxHeight, isStickyStatement };
}
