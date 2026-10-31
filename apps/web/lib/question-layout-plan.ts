// Layout engine for the question screen. Pure: nothing here touches the DOM.
// `useQuestionLayout` measures the real panels and hands this module a
// `PanelMeasurer` per panel; this module decides where each one goes and how
// big it is, and is unit-tested with synthetic measurers.
//
// Model
//  - Three panels (statement, options, optional explanation) are placed as
//    "bands" (rows) of "columns" (stacks). Each panel hugs its content: its
//    width comes from its max-content width (capped to a readable measure) and
//    its height is whatever the content needs at that width. Empty space is
//    allowed around the panels, never inside them.
//  - Every candidate arrangement x panel variant (statement text beside the
//    graph, options in one or two columns) x graph size is laid out and
//    scored; the lowest score wins. The graph is always sized in local pixels
//    from `GRAPH_LADDER`: the largest rung whose arrangement still fits. When
//    the explanation shows, it is simply one more panel in the search, so the
//    others resize or move only when that yields a better whole.
//
// Unit convention: lengths are local CSS pixels, i.e. what clientWidth and
// offsetHeight report inside the font-scale `zoom` wrapper. A larger font
// shrinks the local container, so every threshold below already scales with
// the text and nothing needs special casing.

export type PanelId = "statement" | "options" | "explanation";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Internal arrangement of a panel. `split`: statement text beside the graph.
 *  `columns`: how many columns the options use. */
export interface PanelVariant {
  split?: boolean;
  columns?: 1 | 2;
}

export interface PanelMeasurer {
  /** Variants worth trying, default first. */
  variants: PanelVariant[];
  /** Natural outer height at an outer width. Graph max-height only affects the statement panel. */
  height(width: number, variant: PanelVariant, graphMax: number | null): number;
  /** Outer width the content would take with no wrapping at all. */
  maxContentWidth(variant: PanelVariant, graphMax: number | null): number;
}

export type TemplateName =
  | "stack"
  | "side"
  | "stack3"
  | "side-top"
  | "side-bottom"
  | "triple"
  | "left-statement"
  | "right-explanation";

export interface PlanInput {
  containerWidth: number;
  containerHeight: number;
  hasGraph: boolean;
  panels: {
    statement: PanelMeasurer;
    options: PanelMeasurer;
    explanation?: PanelMeasurer | null;
  };
  /** Plan on screen for this same question and container, used to limit how
   *  much the existing panels move when the explanation appears. */
  previous?: LayoutPlan | null;
  /** Soft preference across questions at the same viewport size. It never
   * overrides a fitting layout in favor of one that requires scrolling. */
  preferredArrangement?: Pick<LayoutPlan, "template" | "statementVariant" | "optionsVariant"> | null;
  /** Largest graph max-height (px) this question may use. Questions that share
   *  a graph pass the size a sibling settled on, so the graph does not jump
   *  around while navigating. It is a ceiling, not a pin: the graph still
   *  shrinks when the panels need the room (for example when the explanation
   *  opens), and the caller drops the ceiling when the available space changes
   *  so the graph can grow back. */
  graphCeiling?: number | null;
}

export interface LayoutPlan {
  template: TemplateName;
  rects: Partial<Record<PanelId, Rect>>;
  statementVariant: PanelVariant;
  optionsVariant: PanelVariant;
  /** Max graph height in px; null only when the question has no graph. */
  graphMax: number | null;
  /** Height of the positioning stage: the container when everything fits. */
  stageHeight: number;
  /** Height the panels need in total. */
  contentHeight: number;
  /** Panels need more height than the container: the screen scrolls. */
  overflow: boolean;
  score: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const GAP_WIDE_PX = 24;
export const GAP_NARROW_PX = 16;
export const GAP_BREAKPOINT_PX = 720;

/** Widest a text-led panel gets: about 75 characters of the serif body font. */
export const IDEAL_WIDTH_CAP_PX = 760;
/** Widest a statement that carries a graph gets. The text inside is held to a
 *  readable measure by the panel itself, so the extra width only goes to the
 *  graph (wide, short graphs are otherwise stuck at a text-column width). */
export const GRAPH_WIDTH_CAP_PX = 1040;
/** Same, when the text sits beside the graph. */
export const GRAPH_SPLIT_WIDTH_CAP_PX = 1160;

/** Horizontal padding of a panel (`p-5 md:p-6`), border included. Shared with
 *  the CSS so minimum widths describe what the panels really need. */
export const PANEL_PADDING_X_PX = 50;
/** Gap between option columns (`md:gap-4`). */
export const OPTIONS_COLUMN_GAP_PX = 16;

export const STATEMENT_MIN_PX = 300;
export const STATEMENT_WITH_GRAPH_MIN_PX = 340;
export const STATEMENT_SPLIT_MIN_PX = 760;
export const OPTIONS_MIN_PX = 320;
// Padding plus two readable answer columns and their gap.
export const OPTIONS_TWO_COLUMN_MIN_PX = PANEL_PADDING_X_PX + 2 * 240 + OPTIONS_COLUMN_GAP_PX;
export const EXPLANATION_MIN_PX = 340;

/** Graph max-heights tried, largest first. Always local pixels (the same unit
 *  as the container), never a viewport breakpoint. */
export const GRAPH_LADDER: ReadonlyArray<number> = [600, 520, 450, 380, 320];

/** Sub-pixel slack so rounding never clips the last row of a panel. */
export const SAFETY_PX = 1;

/** Share of the free vertical space placed above the panels. */
export const TOP_BIAS = 0.25;
export const MAX_TOP_OFFSET_PX = 72;

export function gapFor(containerWidth: number) {
  return containerWidth >= GAP_BREAKPOINT_PX ? GAP_WIDE_PX : GAP_NARROW_PX;
}

/** Widest a panel is allowed to grow before the layout stops giving it room. */
export function widthCap(id: PanelId, variant: PanelVariant, hasGraph: boolean) {
  if (id === "statement" && hasGraph) {
    return variant.split ? GRAPH_SPLIT_WIDTH_CAP_PX : GRAPH_WIDTH_CAP_PX;
  }
  return IDEAL_WIDTH_CAP_PX;
}

export function minPanelWidth(id: PanelId, variant: PanelVariant, hasGraph: boolean) {
  if (id === "statement") {
    if (variant.split) return STATEMENT_SPLIT_MIN_PX;
    return hasGraph ? STATEMENT_WITH_GRAPH_MIN_PX : STATEMENT_MIN_PX;
  }
  if (id === "options") return variant.columns === 2 ? OPTIONS_TWO_COLUMN_MIN_PX : OPTIONS_MIN_PX;
  return EXPLANATION_MIN_PX;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

type Column = PanelId[];
type Band = Column[];

interface Template {
  name: TemplateName;
  bands: Band[];
  /** Tiny preference for simpler arrangements when scores are close. */
  complexity: number;
}

const S: PanelId = "statement";
const O: PanelId = "options";
const E: PanelId = "explanation";

const TEMPLATES_TWO: Template[] = [
  { name: "stack", bands: [[[S]], [[O]]], complexity: 0 },
  { name: "side", bands: [[[S], [O]]], complexity: 0.15 },
];

const TEMPLATES_THREE: Template[] = [
  { name: "stack3", bands: [[[S]], [[O]], [[E]]], complexity: 0 },
  { name: "side-top", bands: [[[S], [O]], [[E]]], complexity: 0.06 },
  { name: "side-bottom", bands: [[[S]], [[O], [E]]], complexity: 0.06 },
  { name: "left-statement", bands: [[[S], [O, E]]], complexity: 0.1 },
  { name: "right-explanation", bands: [[[S, O], [E]]], complexity: 0.1 },
  { name: "triple", bands: [[[S], [O], [E]]], complexity: 0.4 },
];

// ---------------------------------------------------------------------------
// Scoring weights (lower score is better)
// ---------------------------------------------------------------------------

const W_OVERFLOW_FLAT = 4;
const W_OVERFLOW = 6;
const W_WASTE = 3; // empty space inside panels (width beyond the content)
const W_RAGGED = 2; // empty space beside a shorter column in a band
const W_TALL = 0.8; // panels much taller than wide
const W_LONG_LINE = 1; // panels wider than a comfortable reading measure
const W_CLIPPED_OPTIONS = 3; // options narrower than their widest line (it would scroll)
const W_GRAPH_STEP = 0.3; // each ladder rung the graph is below the largest
const W_MOVE = 2.5; // displacement of panels that were already on screen
const TALL_RATIO = 1.4;

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

// ---------------------------------------------------------------------------
// Measurement cache
// ---------------------------------------------------------------------------

const variantKey = (v: PanelVariant) => `${v.split ? 1 : 0}${v.columns ?? 0}`;

function memoized(m: PanelMeasurer, usesGraphSize: boolean): PanelMeasurer {
  const heights = new Map<string, number>();
  const widths = new Map<string, number>();
  return {
    variants: m.variants,
    height(width, variant, graphMax) {
      const w = Math.round(width);
      const key = `${w}|${variantKey(variant)}|${usesGraphSize ? graphMax : null}`;
      let value = heights.get(key);
      if (value === undefined) {
        value = m.height(w, variant, graphMax);
        heights.set(key, value);
      }
      return value;
    },
    maxContentWidth(variant, graphMax) {
      const key = `${variantKey(variant)}|${usesGraphSize ? graphMax : null}`;
      let value = widths.get(key);
      if (value === undefined) {
        value = m.maxContentWidth(variant, graphMax);
        widths.set(key, value);
      }
      return value;
    },
  };
}

// ---------------------------------------------------------------------------
// Candidate layout
// ---------------------------------------------------------------------------

interface PanelStat {
  id: PanelId;
  rect: Rect;
  contentWidth: number;
}

interface Candidate {
  template: Template;
  statementVariant: PanelVariant;
  optionsVariant: PanelVariant;
  graphMax: number | null;
  /** Rungs of `GRAPH_LADDER` above the chosen graph size. */
  graphStep: number;
  stats: PanelStat[];
  layoutWidth: number;
  totalHeight: number;
  /** Area of band space not covered by panels (shorter columns). */
  emptyBandArea: number;
}

interface Context {
  width: number;
  height: number;
  gap: number;
  hasGraph: boolean;
  /** Rungs to try, largest first; `[null]` when there is no graph. */
  ladder: ReadonlyArray<number | null>;
  measurers: Partial<Record<PanelId, PanelMeasurer>>;
}

function layoutCandidate(
  ctx: Context,
  template: Template,
  statementVariant: PanelVariant,
  optionsVariant: PanelVariant,
  graphValue: number | null,
): Candidate | null {
  const { gap } = ctx;
  const variantOf = (id: PanelId): PanelVariant =>
    id === S ? statementVariant : id === O ? optionsVariant : {};
  const measurer = (id: PanelId) => ctx.measurers[id] as PanelMeasurer;

  const idealOf = (id: PanelId) => {
    const v = variantOf(id);
    const min = minPanelWidth(id, v, ctx.hasGraph);
    const content = measurer(id).maxContentWidth(v, graphValue);
    const cap = widthCap(id, v, ctx.hasGraph);
    // Shared width increments reduce small card-width changes between questions
    // without narrowing content or exceeding the readable cap.
    const rounded = Math.ceil(content / 80) * 80;
    return Math.min(clamp(rounded, min, Math.max(min, cap)), Math.max(ctx.width, 1));
  };

  const columnInfo = template.bands.map((band) =>
    band.map((ids) => ({
      ids,
      ideal: Math.max(...ids.map(idealOf)),
      min: Math.max(...ids.map((id) => minPanelWidth(id, variantOf(id), ctx.hasGraph))),
    })),
  );

  const bandIdeal = columnInfo.map(
    (cols) => cols.reduce((sum, c) => sum + c.ideal, 0) + gap * (cols.length - 1),
  );
  const layoutWidth = Math.min(ctx.width, Math.max(...bandIdeal));

  const stats: PanelStat[] = [];
  let y = 0;
  let emptyBandArea = 0;

  for (let b = 0; b < columnInfo.length; b++) {
    const cols = columnInfo[b];
    const available = layoutWidth - gap * (cols.length - 1);
    const total = cols.reduce((sum, c) => sum + c.ideal, 0);
    let widths = cols.map((c) => c.ideal);

    if (total > available) {
      const slack = cols.reduce((sum, c) => sum + (c.ideal - c.min), 0);
      const need = total - available;
      if (need > slack + 0.5) {
        // Columns cannot both keep their minimum width. A single column just
        // takes the narrow container; side by side is not possible.
        if (cols.length > 1) return null;
        widths = [available];
      } else {
        widths = cols.map((c) => c.ideal - (slack > 0 ? (need * (c.ideal - c.min)) / slack : 0));
      }
    } else if (total < available) {
      const extra = available - total;
      widths = cols.map((c) => c.ideal + (extra * c.ideal) / total);
    }

    widths = widths.map(Math.round);
    widths[widths.length - 1] += available - widths.reduce((s, w) => s + w, 0);

    let bandHeight = 0;
    const columnHeights: number[] = [];
    let x = 0;
    const placed: PanelStat[] = [];
    for (let c = 0; c < cols.length; c++) {
      // A single narrow column is valid for ordinary text, but not for a
      // split graph or two answer columns: those variants need their minimums.
      if (cols[c].ids.some((id) => {
        const variant = variantOf(id);
        return (variant.split || variant.columns === 2)
          && widths[c] < minPanelWidth(id, variant, ctx.hasGraph);
      })) return null;
      let cy = y;
      cols[c].ids.forEach((id, i) => {
        const v = variantOf(id);
        const m = measurer(id);
        const height = Math.ceil(m.height(widths[c], v, graphValue)) + SAFETY_PX;
        placed.push({
          id,
          rect: { x, y: cy, width: widths[c], height },
          contentWidth: m.maxContentWidth(v, graphValue),
        });
        cy += height + (i < cols[c].ids.length - 1 ? gap : 0);
      });
      const colHeight = cy - y;
      columnHeights.push(colHeight);
      bandHeight = Math.max(bandHeight, colHeight);
      x += widths[c] + gap;
    }
    cols.forEach((_, c) => {
      emptyBandArea += (bandHeight - columnHeights[c]) * widths[c];
    });
    stats.push(...placed);
    y += bandHeight + gap;
  }

  return {
    template,
    statementVariant,
    optionsVariant,
    graphMax: graphValue,
    graphStep: graphValue === null ? 0 : GRAPH_LADDER.filter((rung) => rung > graphValue).length,
    stats,
    layoutWidth,
    totalHeight: y - gap,
    emptyBandArea,
  };
}

function scoreCandidate(c: Candidate, ctx: Context, previous?: LayoutPlan | null): number {
  let score = c.template.complexity + W_GRAPH_STEP * c.graphStep;

  const overflow = Math.max(0, c.totalHeight - ctx.height);
  if (overflow > 0) score += W_OVERFLOW_FLAT + (W_OVERFLOW * overflow) / Math.max(ctx.height, 1);

  let area = 0;
  let waste = 0;
  for (const { id, rect, contentWidth } of c.stats) {
    // Options never wrap a formula, so a panel narrower than its widest line
    // makes that option scroll sideways. Cheap to avoid, so avoid it.
    if (id === O && rect.width < contentWidth) {
      score += W_CLIPPED_OPTIONS * (1 - rect.width / contentWidth);
    }
    const a = rect.width * rect.height;
    area += a;
    waste += a * Math.max(0, 1 - contentWidth / rect.width);
    score += W_TALL * Math.max(0, rect.height / rect.width - TALL_RATIO);
    const cap = widthCap(id, id === S ? c.statementVariant : id === O ? c.optionsVariant : {}, ctx.hasGraph);
    score += W_LONG_LINE * Math.max(0, (rect.width - cap) / cap);
  }
  if (area > 0) score += W_WASTE * (waste / area);

  const bounding = c.layoutWidth * Math.max(c.totalHeight, 1);
  score += (W_RAGGED * c.emptyBandArea) / bounding;

  if (previous) {
    let moved = 0;
    let count = 0;
    for (const { id, rect } of c.stats) {
      const before = previous.rects[id];
      if (!before || id === E) continue;
      moved +=
        Math.abs(rect.x - before.x) +
        Math.abs(rect.y - before.y) +
        Math.abs(rect.width - before.width) +
        Math.abs(rect.height - before.height);
      count += 1;
    }
    if (count > 0) score += (W_MOVE * moved) / count / (ctx.width + ctx.height);
  }
  return score;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Largest graph size at which this arrangement fits the container; the
 * smallest rung when none does (the screen then scrolls). Layout height only
 * shrinks as the graph shrinks, so a bisection over the ladder finds it with
 * a handful of layouts instead of one per rung.
 */
function fitGraph(
  ctx: Context,
  template: Template,
  statementVariant: PanelVariant,
  optionsVariant: PanelVariant,
): Candidate | null {
  const at = (index: number) =>
    layoutCandidate(ctx, template, statementVariant, optionsVariant, ctx.ladder[index]);
  let lo = 0;
  let hi = ctx.ladder.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const candidate = at(mid);
    if (!candidate) return null;
    if (candidate.totalHeight <= ctx.height) hi = mid;
    else lo = mid + 1;
  }
  return at(lo);
}

/** Rungs a question may use: the ladder at or below the ceiling. */
export function graphLadder(hasGraph: boolean, ceiling?: number | null): ReadonlyArray<number | null> {
  if (!hasGraph) return [null];
  if (ceiling === undefined || ceiling === null) return GRAPH_LADDER;
  const below = GRAPH_LADDER.filter((rung) => rung < ceiling);
  return [ceiling, ...below];
}

export function planQuestionLayout(input: PlanInput): LayoutPlan {
  const { containerWidth, containerHeight, hasGraph } = input;
  const withExplanation = Boolean(input.panels.explanation);
  const ladder = graphLadder(hasGraph, input.graphCeiling);
  const ctx: Context = {
    width: Math.max(containerWidth, 1),
    height: containerHeight,
    gap: gapFor(containerWidth),
    hasGraph,
    ladder,
    measurers: {
      statement: memoized(input.panels.statement, hasGraph),
      // These panels never receive --graph-max. Reuse their measurements as
      // the search tries different graph sizes, avoiding forced DOM layouts.
      options: memoized(input.panels.options, false),
      ...(input.panels.explanation ? { explanation: memoized(input.panels.explanation, false) } : {}),
    },
  };

  const templates = withExplanation ? TEMPLATES_THREE : TEMPLATES_TWO;

  let best: { candidate: Candidate; score: number } | null = null;
  const candidates: { candidate: Candidate; score: number; overflow: number }[] = [];

  for (const template of templates) {
    for (const sv of input.panels.statement.variants) {
      for (const ov of input.panels.options.variants) {
        const chosen = fitGraph(ctx, template, sv, ov);
        if (!chosen) continue;
        let score = scoreCandidate(chosen, ctx, input.previous);
        const preferred = input.preferredArrangement;
        if (preferred) {
          if (chosen.template.name !== preferred.template) score += 0.35;
          if (Boolean(sv.split) !== Boolean(preferred.statementVariant.split)) score += 0.15;
          if (ov.columns !== preferred.optionsVariant.columns) score += 0.15;
        }
        const overflow = Math.max(0, chosen.totalHeight - ctx.height);
        candidates.push({ candidate: chosen, score, overflow });
      }
    }
  }

  // Fitting layouts always beat scrolling layouts, regardless of aesthetic
  // scores or the previous question's orientation. If none fit, limit the
  // shortlist to within one small spacing unit of the least scrolling option.
  const leastOverflow = Math.min(...candidates.map((c) => c.overflow));
  const allowance = leastOverflow === 0 ? 0 : 24;
  for (const candidate of candidates) {
    if (candidate.overflow > leastOverflow + allowance) continue;
    if (!best || candidate.score < best.score - 1e-9) best = candidate;
  }

  // The stacked template is always feasible, so this only guards bad input.
  if (!best) {
    const fallback = layoutCandidate(
      ctx,
      templates[0],
      input.panels.statement.variants[0],
      input.panels.options.variants[0],
      ladder[ladder.length - 1],
    ) as Candidate;
    best = { candidate: fallback, score: 0 };
  }

  const { candidate } = best;
  const overflow = candidate.totalHeight > ctx.height;
  // Keep the start of the problem anchored as its content height changes.
  const top = 0;
  const left = Math.round((ctx.width - candidate.layoutWidth) / 2);

  const rects: Partial<Record<PanelId, Rect>> = {};
  for (const { id, rect } of candidate.stats) {
    rects[id] = { ...rect, x: rect.x + left, y: rect.y + top };
  }

  return {
    template: candidate.template.name,
    rects,
    statementVariant: candidate.statementVariant,
    optionsVariant: candidate.optionsVariant,
    graphMax: candidate.graphMax,
    stageHeight: overflow ? candidate.totalHeight : ctx.height,
    contentHeight: candidate.totalHeight,
    overflow,
    score: best.score,
  };
}

export function samePlan(a: LayoutPlan | null, b: LayoutPlan | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.stageHeight !== b.stageHeight || a.graphMax !== b.graphMax) return false;
  if (a.statementVariant.split !== b.statementVariant.split) return false;
  if (a.optionsVariant.columns !== b.optionsVariant.columns) return false;
  for (const id of ["statement", "options", "explanation"] as PanelId[]) {
    const ra = a.rects[id];
    const rb = b.rects[id];
    if (Boolean(ra) !== Boolean(rb)) return false;
    if (ra && rb && (ra.x !== rb.x || ra.y !== rb.y || ra.width !== rb.width || ra.height !== rb.height)) {
      return false;
    }
  }
  return true;
}
