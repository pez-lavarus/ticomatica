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
//    scored; the lowest score wins. When the explanation shows, it is simply
//    one more panel in the search, so the others resize or move only when that
//    yields a better whole.
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
  /** Natural outer height at an outer width. */
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
}

export interface LayoutPlan {
  template: TemplateName;
  rects: Partial<Record<PanelId, Rect>>;
  statementVariant: PanelVariant;
  optionsVariant: PanelVariant;
  /** Max graph height in px; null means the CSS default. */
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

export const STATEMENT_MIN_PX = 300;
export const STATEMENT_WITH_GRAPH_MIN_PX = 340;
export const STATEMENT_SPLIT_MIN_PX = 620;
export const OPTIONS_MIN_PX = 240;
// padding (64) + two columns of at least 200 + their gap (24).
export const OPTIONS_TWO_COLUMN_MIN_PX = 64 + 2 * 200 + 24;
export const EXPLANATION_MIN_PX = 340;

/** Graph max-heights tried, largest first, when the screen would overflow. */
export const GRAPH_LADDER: ReadonlyArray<number | null> = [null, 340, 280, 220, 170, 140];

/** Sub-pixel slack so rounding never clips the last row of a panel. */
export const SAFETY_PX = 1;

/** Share of the free vertical space placed above the panels. */
export const TOP_BIAS = 0.25;
export const MAX_TOP_OFFSET_PX = 72;

export function gapFor(containerWidth: number) {
  return containerWidth >= GAP_BREAKPOINT_PX ? GAP_WIDE_PX : GAP_NARROW_PX;
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
const W_WRAP_COLUMNS = 1.2; // two option columns that are narrower than their content
const W_GRAPH_STEP = 0.3; // each step the graph is shrunk
const W_MOVE = 2.5; // displacement of panels that were already on screen
const TALL_RATIO = 1.4;

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

// ---------------------------------------------------------------------------
// Measurement cache
// ---------------------------------------------------------------------------

const variantKey = (v: PanelVariant) => `${v.split ? 1 : 0}${v.columns ?? 0}`;

function memoized(m: PanelMeasurer): PanelMeasurer {
  const heights = new Map<string, number>();
  const widths = new Map<string, number>();
  return {
    variants: m.variants,
    height(width, variant, graphMax) {
      const w = Math.round(width);
      const key = `${w}|${variantKey(variant)}|${graphMax}`;
      let value = heights.get(key);
      if (value === undefined) {
        value = m.height(w, variant, graphMax);
        heights.set(key, value);
      }
      return value;
    },
    maxContentWidth(variant, graphMax) {
      const key = `${variantKey(variant)}|${graphMax}`;
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
  measurers: Partial<Record<PanelId, PanelMeasurer>>;
}

function layoutCandidate(
  ctx: Context,
  template: Template,
  statementVariant: PanelVariant,
  optionsVariant: PanelVariant,
  graphStep: number,
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
    return Math.min(clamp(content, min, Math.max(min, IDEAL_WIDTH_CAP_PX)), Math.max(ctx.width, 1));
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
    graphStep,
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
    if (id === O && c.optionsVariant.columns === 2 && rect.width < contentWidth) {
      score += W_WRAP_COLUMNS * (1 - rect.width / contentWidth);
    }
    const a = rect.width * rect.height;
    area += a;
    waste += a * Math.max(0, 1 - contentWidth / rect.width);
    score += W_TALL * Math.max(0, rect.height / rect.width - TALL_RATIO);
    score += W_LONG_LINE * Math.max(0, (rect.width - IDEAL_WIDTH_CAP_PX) / IDEAL_WIDTH_CAP_PX);
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

export function planQuestionLayout(input: PlanInput): LayoutPlan {
  const { containerWidth, containerHeight, hasGraph } = input;
  const withExplanation = Boolean(input.panels.explanation);
  const ctx: Context = {
    width: Math.max(containerWidth, 1),
    height: containerHeight,
    gap: gapFor(containerWidth),
    hasGraph,
    measurers: {
      statement: memoized(input.panels.statement),
      options: memoized(input.panels.options),
      ...(input.panels.explanation ? { explanation: memoized(input.panels.explanation) } : {}),
    },
  };

  const templates = withExplanation ? TEMPLATES_THREE : TEMPLATES_TWO;
  const ladder = hasGraph ? GRAPH_LADDER : [null];

  let best: { candidate: Candidate; score: number } | null = null;

  for (const template of templates) {
    for (const sv of input.panels.statement.variants) {
      for (const ov of input.panels.options.variants) {
        // Shrink the graph only as far as needed to fit this arrangement.
        let chosen: Candidate | null = null;
        for (let step = 0; step < ladder.length; step++) {
          const candidate = layoutCandidate(ctx, template, sv, ov, step, ladder[step]);
          if (!candidate) break;
          chosen = candidate;
          if (candidate.totalHeight <= ctx.height) break;
        }
        if (!chosen) continue;
        const score = scoreCandidate(chosen, ctx, input.previous);
        if (!best || score < best.score - 1e-9) best = { candidate: chosen, score };
      }
    }
  }

  // The stacked template is always feasible, so this only guards bad input.
  if (!best) {
    const fallback = layoutCandidate(
      ctx,
      templates[0],
      input.panels.statement.variants[0],
      input.panels.options.variants[0],
      0,
      null,
    ) as Candidate;
    best = { candidate: fallback, score: 0 };
  }

  const { candidate } = best;
  const overflow = candidate.totalHeight > ctx.height;
  const slack = Math.max(0, ctx.height - candidate.totalHeight);
  const top = overflow ? 0 : Math.round(Math.min(slack * TOP_BIAS, MAX_TOP_OFFSET_PX));
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
