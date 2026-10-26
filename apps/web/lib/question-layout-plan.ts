// Pure layout decisions for the question screen. Nothing in this file touches
// the DOM: `useQuestionLayout` measures, this module decides, and the decisions
// are unit-tested.
//
// Unit convention: every length is a *local* CSS pixel, i.e. the unit that
// `clientWidth` / `offsetHeight` report inside the font-scale wrapper. Font
// scaling is applied with CSS `zoom`, so a larger font shrinks the local
// container (visual width / scale) while text stays the same local size. All
// thresholds below therefore express "how many characters fit", and a bigger
// font reaches them at a larger real viewport without any special casing.
// `remScale` only matters if font scaling ever moves to the root font size,
// where local px are real px and the thresholds must grow with the text.

export type QuestionLayout = "horizontal" | "vertical";

// ---------------------------------------------------------------------------
// Arrangement: side by side or stacked
// ---------------------------------------------------------------------------

// Below the `lg` viewport breakpoint the sidebar is gone and the mobile
// navigator is shown, and the screen is always stacked.
export const WIDE_VIEWPORT_QUERY = "(min-width: 1024px)";

// Horizontal gap between the two columns (`md:gap-6`).
export const COLUMN_GAP_PX = 24;

// Narrowest the options column may get. Derived from ResponseOptions: card
// padding (64) + option padding (40) + letter badge and gap (72) leaves ~200px
// for a formula, which is roughly one short expression.
export const OPTIONS_MIN_WIDTH_PX = 380;

// Narrowest the statement column may get. With a graph it must also leave the
// graph a usable width after the card padding (64).
export const STATEMENT_MIN_WIDTH_PX = 300;
export const STATEMENT_WITH_GRAPH_MIN_WIDTH_PX = 340;

// A graph wider than this ("heavily horizontal") needs full width, so it
// stacks. Tall or squarish graphs fit a narrower column and sit side by side.
export const HEAVILY_HORIZONTAL_ASPECT = 2.0;

// Preferred share of the row for the statement column. Taller graphs get a
// narrower statement so options keep room for formulas; wide-leaning graphs get
// more room. Image-option questions use a fixed share (the statement is text).
export const STATEMENT_COL_MIN = 0.28;
export const STATEMENT_COL_MAX = 0.5;
export const IMAGE_OPTIONS_STATEMENT_FRACTION = 0.45;

export interface ArrangementInput {
  isWideViewport: boolean;
  /** Content width of the question container, or null before first measure. */
  containerWidth: number | null;
  /** 1 under CSS-zoom font scaling; root-font-size / 16 otherwise. */
  remScale?: number;
  hasImageOptions: boolean;
  hasGraph: boolean;
  /** Graph width / height, or null while unknown (not preloaded yet). */
  graphAspect: number | null;
}

export interface Arrangement {
  layout: QuestionLayout;
  /** Share of the row given to the statement column (horizontal only). */
  statementFraction: number;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function resolveArrangement(input: ArrangementInput): Arrangement {
  const stacked: Arrangement = { layout: "vertical", statementFraction: STATEMENT_COL_MAX };
  const { isWideViewport, containerWidth, hasImageOptions, hasGraph, graphAspect } = input;
  const rem = input.remScale && input.remScale > 0 ? input.remScale : 1;

  if (!isWideViewport || containerWidth === null) return stacked;

  // Default is stacked: no graph, an unknown graph, or a heavily horizontal
  // graph all stack. Tall and squarish graphs, and image options, go side by
  // side.
  let preferred: number;
  if (hasImageOptions) {
    preferred = IMAGE_OPTIONS_STATEMENT_FRACTION;
  } else if (hasGraph && graphAspect !== null && graphAspect <= HEAVILY_HORIZONTAL_ASPECT) {
    preferred = clamp(graphAspect / 2, STATEMENT_COL_MIN, STATEMENT_COL_MAX);
  } else {
    return stacked;
  }

  // Even when side by side is preferred, both columns need a minimum width.
  // This is what reacts to the font size: a larger font makes the local
  // container narrower until the minimums no longer fit and we stack.
  const usable = containerWidth - COLUMN_GAP_PX * rem;
  const statementMin = (hasGraph ? STATEMENT_WITH_GRAPH_MIN_WIDTH_PX : STATEMENT_MIN_WIDTH_PX) * rem;
  const optionsMin = OPTIONS_MIN_WIDTH_PX * rem;
  if (usable < statementMin + optionsMin) return stacked;

  const statementPx = clamp(preferred * usable, statementMin, usable - optionsMin);
  return { layout: "horizontal", statementFraction: statementPx / usable };
}

export function columnsTemplate(arrangement: Arrangement) {
  if (arrangement.layout === "vertical") return "minmax(0, 1fr)";
  const f = arrangement.statementFraction;
  return `minmax(0, ${f.toFixed(3)}fr) minmax(0, ${(1 - f).toFixed(3)}fr)`;
}

// ---------------------------------------------------------------------------
// Vertical fit: how to get statement + options on screen
// ---------------------------------------------------------------------------

// Graph height bounds in vertical layout. The graph shrinks (down to the
// floor) so the options stay visible; the ceiling stops it from growing past a
// reasonable figure size.
export const MIN_GRAPH_HEIGHT = 140;
export const MAX_GRAPH_HEIGHT = 360;

// The graph wrapper draws a 1px border on each side around the image.
export const GRAPH_FRAME_PX = 2;

// Sub-pixel slack so rounding never clips the last pixel row.
export const SAFETY_PX = 2;

// When even the shrunken graph leaves less than this for the options list, the
// screen stops trying to keep the statement static and scrolls as one page.
export const MIN_OPTIONS_VIEWPORT_PX = 200;

// Two option columns are only worth it when each card keeps room for a formula.
export const TWO_COLUMN_MIN_LIST_WIDTH_PX = 2 * 260 + 24;

export type ScrollMode = "contained" | "page";

export interface VerticalFitInput {
  /** Content height of the question container. */
  containerHeight: number;
  /** Gap between grid rows. */
  rowGap: number;
  hasGraph: boolean;
  /** Intrinsic graph height, so tiny images are not forced up to the floor. */
  graphIntrinsicHeight?: number | null;
  statement: {
    /** Whole statement card, as currently rendered. */
    height: number;
    /** Graph wrapper as currently rendered (0 without a graph). */
    graphBoxHeight: number;
    /** Statement text block (0 without text). */
    textHeight: number;
    /** True when the graph sits next to the text instead of below it. */
    graphBesideText: boolean;
  };
  options: {
    /** Card height minus the list: padding, border and the problem text. */
    chromeHeight: number;
    /** Natural height of each option, in order. */
    itemHeights: number[];
    /** Gap between options. */
    itemGap: number;
    /** Width of the list, to decide whether two columns are legible. */
    listWidth: number;
  };
  /** Explanation block below the options (0 when not shown or placed beside). */
  explanationHeight: number;
  remScale?: number;
}

export interface VerticalFit {
  optionsGrid: boolean;
  /** Max height for the graph image; undefined means "no override". */
  graphMaxHeight: number | undefined;
  scroll: ScrollMode;
}

export const DEFAULT_FIT: VerticalFit = {
  optionsGrid: false,
  graphMaxHeight: undefined,
  scroll: "contained",
};

export function oneColumnListHeight(itemHeights: number[], gap: number) {
  if (itemHeights.length === 0) return 0;
  return itemHeights.reduce((sum, h) => sum + h, 0) + gap * (itemHeights.length - 1);
}

export function twoColumnListHeight(itemHeights: number[], gap: number) {
  if (itemHeights.length === 0) return 0;
  let total = 0;
  let rows = 0;
  for (let i = 0; i < itemHeights.length; i += 2) {
    total += Math.max(itemHeights[i], itemHeights[i + 1] ?? 0);
    rows += 1;
  }
  return total + gap * (rows - 1);
}

interface Budget {
  fits: boolean;
  /** Image max height when it fits. */
  graph: number | undefined;
}

export function planVerticalFit(input: VerticalFitInput): VerticalFit {
  const { statement, options, hasGraph } = input;
  const rem = input.remScale && input.remScale > 0 ? input.remScale : 1;
  const minGraph = Math.min(MIN_GRAPH_HEIGHT, input.graphIntrinsicHeight ?? Infinity);
  const maxGraph = Math.max(minGraph, MAX_GRAPH_HEIGHT);

  const rowGaps = input.rowGap * (input.explanationHeight > 0 ? 2 : 1);
  const available = input.containerHeight - rowGaps - input.explanationHeight - SAFETY_PX;

  // Height of the statement card as a function of the image height.
  //   stacked:  chrome + text + margin + image
  //   beside:   padding + max(text, image)
  const stacked = !statement.graphBesideText;
  const chrome = stacked
    ? statement.height - statement.graphBoxHeight
    : statement.height - Math.max(statement.textHeight, statement.graphBoxHeight);
  const statementHeightFor = (imageHeight: number) => {
    const box = imageHeight + GRAPH_FRAME_PX;
    return stacked ? chrome + box : chrome + Math.max(statement.textHeight, box);
  };

  const budgetFor = (optionsHeight: number): Budget => {
    const room = available - optionsHeight;
    if (!hasGraph) return { fits: statement.height <= room, graph: undefined };
    // Beside the text, the card is as tall as the taller of the two, so the
    // text alone must fit even though the image can use all remaining room.
    if (!stacked && chrome + statement.textHeight > room) return { fits: false, graph: undefined };
    const imageRoom = room - chrome - GRAPH_FRAME_PX;
    if (imageRoom < minGraph) return { fits: false, graph: undefined };
    return { fits: true, graph: clamp(imageRoom, minGraph, maxGraph) };
  };

  const listOne = oneColumnListHeight(options.itemHeights, options.itemGap);
  const listTwo = twoColumnListHeight(options.itemHeights, options.itemGap);
  const canGrid =
    options.itemHeights.length >= 2 && options.listWidth >= TWO_COLUMN_MIN_LIST_WIDTH_PX * rem;

  // 1. Everything fits in a single column.
  const single = budgetFor(options.chromeHeight + listOne);
  if (single.fits) return { optionsGrid: false, graphMaxHeight: single.graph, scroll: "contained" };

  // 2. Everything fits once the options use two columns.
  if (canGrid) {
    const double = budgetFor(options.chromeHeight + listTwo);
    if (double.fits) return { optionsGrid: true, graphMaxHeight: double.graph, scroll: "contained" };
  }

  // 3. Shrink the graph to its floor and let only the options list scroll, as
  //    long as enough of it stays visible to be usable.
  const floorStatement = hasGraph ? statementHeightFor(minGraph) : statement.height;
  const listViewport = available - floorStatement - options.chromeHeight;
  if (listViewport >= MIN_OPTIONS_VIEWPORT_PX) {
    return {
      optionsGrid: canGrid,
      graphMaxHeight: hasGraph ? minGraph : undefined,
      scroll: "contained",
    };
  }

  // 4. Nothing fits comfortably (large font, long statement, short window):
  //    scroll the whole screen as a page with the graph at a normal size.
  return {
    optionsGrid: false,
    graphMaxHeight: hasGraph ? maxGraph : undefined,
    scroll: "page",
  };
}

/**
 * After an answer is revealed the options collapse to the selected one and an
 * explanation appears. The graph and grid decisions are kept from before the
 * reveal so nothing resizes under the reader's eyes; the only thing that may
 * change is that the screen becomes scrollable when the new content overflows.
 */
export function scrollForRevealedContent(
  fit: VerticalFit,
  contentHeight: number,
  containerHeight: number,
): VerticalFit {
  if (fit.scroll === "page") return fit;
  return contentHeight > containerHeight + 1 ? { ...fit, scroll: "page" } : fit;
}

export function sameFit(a: VerticalFit, b: VerticalFit) {
  return (
    a.optionsGrid === b.optionsGrid &&
    a.graphMaxHeight === b.graphMaxHeight &&
    a.scroll === b.scroll
  );
}

export function gridTemplateRowsFor(
  layout: QuestionLayout,
  scroll: ScrollMode,
  hasExplanationRow: boolean,
) {
  if (layout === "horizontal") return "minmax(0, 1fr)";
  const options = scroll === "contained" ? "minmax(0, 1fr)" : "auto";
  return hasExplanationRow ? `auto ${options} auto` : `auto ${options}`;
}
