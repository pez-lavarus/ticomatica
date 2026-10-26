"use client";

import { useEffect, useLayoutEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import type { RefObject } from "react";
import { getGraphAspect, getGraphDimensions, preloadGraphAspect } from "@/lib/graph-aspects";
import {
  DEFAULT_FIT,
  WIDE_VIEWPORT_QUERY,
  columnsTemplate,
  gridTemplateRowsFor,
  oneColumnListHeight,
  planVerticalFit,
  resolveArrangement,
  sameFit,
  scrollForRevealedContent,
} from "@/lib/question-layout-plan";
import type { ScrollMode, VerticalFit, VerticalFitInput } from "@/lib/question-layout-plan";

export type { QuestionLayout, ScrollMode } from "@/lib/question-layout-plan";

export type ExplanationPlacement = "options-column" | "below";

// This hook only measures and applies. Every decision (side by side or
// stacked, column widths, graph height, two-column options, page scroll) lives
// in `lib/question-layout-plan.ts` where it is unit-tested.
//
// Measurement rules, because the font scale is a CSS `zoom` on an ancestor:
//  - Everything is measured from elements inside that wrapper, with the
//    offset/client/scroll family, so all numbers share one coordinate space.
//  - Nothing is compared against `window.innerHeight` or
//    `getBoundingClientRect()`, which live in viewport pixels. The container
//    already sits inside the available area (`flex-1 min-h-0`), so its own
//    content box is the height budget at any font size.
//  - Measured inputs never depend on the values this hook outputs (the graph
//    height, the grid choice), so one pass converges and cannot oscillate.

interface UseQuestionLayoutOptions {
  graphSrc?: string;
  questionKey: number;
  hasImageOptions: boolean;
  /** Answer feedback is showing: options collapse to the selected one. */
  revealed: boolean;
  /** Explanation panel is mounted. */
  showExplanation: boolean;
  statementRef: RefObject<HTMLDivElement | null>;
  statementTextRef: RefObject<HTMLDivElement | null>;
  graphWrapperRef: RefObject<HTMLDivElement | null>;
  optionsScrollRef: RefObject<HTMLDivElement | null>;
  explanationRef: RefObject<HTMLDivElement | null>;
}

interface ContainerBox {
  width: number;
  height: number;
  remScale: number;
}

interface FrozenOptions {
  key: number;
  chromeHeight: number;
  itemHeights: number[];
  itemGap: number;
  listWidth: number;
}

const px = (value: string) => Number.parseFloat(value) || 0;

function getContentBox(el: HTMLElement) {
  const style = getComputedStyle(el);
  return {
    width: Math.round(el.clientWidth - px(style.paddingLeft) - px(style.paddingRight)),
    height: Math.round(el.clientHeight - px(style.paddingTop) - px(style.paddingBottom)),
  };
}

function getRemScale() {
  return px(getComputedStyle(document.documentElement).fontSize) / 16 || 1;
}

function subscribeToWideViewport(onChange: () => void) {
  const query = window.matchMedia(WIDE_VIEWPORT_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const getWideViewport = () => window.matchMedia(WIDE_VIEWPORT_QUERY).matches;
const getWideViewportOnServer = () => false;

export function useQuestionLayout({
  graphSrc,
  questionKey,
  hasImageOptions,
  revealed,
  showExplanation,
  statementRef,
  statementTextRef,
  graphWrapperRef,
  optionsScrollRef,
  explanationRef,
}: UseQuestionLayoutOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frozenRef = useRef<FrozenOptions | null>(null);
  const [box, setBox] = useState<ContainerBox | null>(null);
  const [fit, setFit] = useState<VerticalFit>(DEFAULT_FIT);
  const [, forceAspectUpdate] = useReducer((n: number) => n + 1, 0);

  // The server and hydration resolve to stacked; the client value applies
  // right after hydration without a mismatch.
  const isWideViewport = useSyncExternalStore(
    subscribeToWideViewport,
    getWideViewport,
    getWideViewportOnServer,
  );

  // Container size, read synchronously on mount so the first paint already
  // uses the right arrangement, then kept current. Font-scale changes resize
  // the container in local pixels, which lands here too.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const read = () => {
      const { width, height } = getContentBox(el);
      const remScale = getRemScale();
      setBox((prev) =>
        prev && prev.width === width && prev.height === height && prev.remScale === remScale
          ? prev
          : { width, height, remScale },
      );
    };
    read();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!graphSrc || getGraphAspect(graphSrc) !== null) return;
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

  const arrangement = resolveArrangement({
    isWideViewport,
    containerWidth: box?.width ?? null,
    remScale: box?.remScale,
    hasImageOptions,
    hasGraph,
    graphAspect,
  });
  const { layout } = arrangement;
  const remScale = box?.remScale;
  const hasBox = box !== null;

  // Vertical fit: how tall the graph may be, whether the options use two
  // columns, and whether the screen has to scroll as a page.
  useLayoutEffect(() => {
    const resetFit = () => setFit((prev) => (sameFit(prev, DEFAULT_FIT) ? prev : DEFAULT_FIT));
    if (layout !== "vertical" || !hasBox) {
      resetFit();
      return;
    }

    const containerEl = containerRef.current;
    const statementEl = statementRef.current;
    const listEl = optionsScrollRef.current;
    const cardEl = listEl?.parentElement;
    if (!containerEl || !statementEl || !listEl || !cardEl) return;
    const graphEl = graphWrapperRef.current;
    const textEl = statementTextRef.current;
    const explanationEl = explanationRef.current;
    const items = Array.from(listEl.children) as HTMLElement[];

    const compute = () => {
      const content = getContentBox(containerEl);
      const rowGap = px(getComputedStyle(containerEl).rowGap);

      // Options as rendered right now. `space-y-*` spaces with margins and the
      // two-column grid with `gap`, so take whichever is present.
      const itemGap = Math.max(
        px(getComputedStyle(listEl).rowGap),
        items[0] ? px(getComputedStyle(items[0]).marginBottom) : 0,
        items[1] ? px(getComputedStyle(items[1]).marginTop) : 0,
      );
      const live = {
        chromeHeight: cardEl.offsetHeight - listEl.offsetHeight,
        itemHeights: items.map((item) => item.offsetHeight),
        itemGap,
        listWidth: listEl.clientWidth,
      };

      // Remember the full option list while it is visible. After a reveal only
      // the selected option remains, but the layout keeps being planned for the
      // full list so the graph does not jump when feedback appears.
      if (!revealed) frozenRef.current = { key: questionKey, ...live };
      const frozen = revealed && frozenRef.current?.key === questionKey ? frozenRef.current : null;
      const planned = frozen ?? live;

      const textHeight = textEl?.offsetHeight ?? 0;
      const graphBoxHeight = graphEl?.offsetHeight ?? 0;
      const graphBesideText = Boolean(
        graphEl && textEl && textHeight > 0 && graphEl.offsetTop < textEl.offsetTop + textHeight - 1,
      );
      const explanationHeight = explanationEl?.offsetHeight ?? 0;

      const input: VerticalFitInput = {
        containerHeight: content.height,
        rowGap,
        hasGraph,
        graphIntrinsicHeight: getGraphDimensions(graphSrc)?.height ?? null,
        statement: { height: statementEl.offsetHeight, graphBoxHeight, textHeight, graphBesideText },
        options: planned,
        explanationHeight: frozen ? 0 : explanationHeight,
        remScale,
      };
      let next = planVerticalFit(input);

      if (frozen) {
        const contentHeight =
          statementEl.offsetHeight +
          rowGap +
          live.chromeHeight +
          oneColumnListHeight(live.itemHeights, live.itemGap) +
          (explanationHeight > 0 ? rowGap + explanationHeight : 0);
        next = scrollForRevealedContent(next, contentHeight, content.height);
      }

      setFit((prev) => (sameFit(prev, next) ? prev : next));
    };

    compute();

    const observer = new ResizeObserver(compute);
    [containerEl, statementEl, cardEl, listEl, graphEl, explanationEl, ...items].forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [
    layout,
    hasBox,
    remScale,
    questionKey,
    revealed,
    showExplanation,
    hasGraph,
    graphSrc,
    statementRef,
    statementTextRef,
    graphWrapperRef,
    optionsScrollRef,
    explanationRef,
  ]);

  const explanationPlacement: ExplanationPlacement =
    layout === "horizontal" ? "options-column" : "below";
  const scrollMode: ScrollMode = layout === "vertical" ? fit.scroll : "contained";

  return {
    containerRef,
    layout,
    gridTemplateColumns: columnsTemplate(arrangement),
    gridTemplateRows: gridTemplateRowsFor(
      layout,
      scrollMode,
      showExplanation && explanationPlacement === "below",
    ),
    graphMaxHeight: layout === "vertical" && hasGraph ? fit.graphMaxHeight : undefined,
    // A revealed question shows a single option, so two columns make no sense.
    optionsGrid: layout === "vertical" && fit.optionsGrid && !revealed,
    scrollMode,
    explanationPlacement,
  };
}
