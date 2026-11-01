import { layoutPreferences, type LayoutCharacteristics } from "./question-characteristics";
import { STATEMENT_GRAPH_SIZE, OPTION_GRAPH_SIZE } from "./graph-sizes";

// Layout engine for the question screen. Pure: nothing here touches the DOM.
// `useQuestionLayout` measures the real panels and hands this module a
// `PanelMeasurer` per panel; this module decides where each one goes and how
// big it is, and is unit-tested with synthetic measurers. Graph frames have
// shared statement/option sizes; long-formula answers may reduce statement graphs.
//
// Model
//  - Three panels (statement, options, optional explanation) are placed as
//    "bands" (rows) of "columns" (stacks). Each panel hugs its content: its
//    width comes from its max-content width (capped to a readable measure) and
//    its height is whatever the content needs at that width. Empty space is
//    allowed around the panels, never inside them.
//  - Candidate arrangements and answer-column counts are measured around
//    shared graph frames. Long-formula answers may reduce the statement graph
//    only when that is necessary to fit the vertical answer layout.
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
  /** Actual formula width including answer/card chrome, measured in local pixels. */
  minimumFormulaWidth?(): number;
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
  characteristics?: LayoutCharacteristics;
  containerWidth: number;
  containerHeight: number;
  hasGraph: boolean;
  hasOptionGraphs?: boolean;
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

}

export interface LayoutPlan {
  wideAnswers?: boolean;
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
export const STATEMENT_WITH_GRAPH_MIN_PX = STATEMENT_GRAPH_SIZE.width + PANEL_PADDING_X_PX + 2;
export const STATEMENT_SPLIT_MIN_PX = 760;
export const OPTIONS_MIN_PX = 320;
// Padding plus two readable answer columns and their gap.
export const OPTIONS_TWO_COLUMN_MIN_PX = PANEL_PADDING_X_PX + 2 * 240 + OPTIONS_COLUMN_GAP_PX;
export const EXPLANATION_MIN_PX = 340;

/** Sub-pixel slack so rounding never clips the last row of a panel. */
export const SAFETY_PX = 1;

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

export function minPanelWidth(id: PanelId, variant: PanelVariant, hasGraph: boolean, hasOptionGraphs = false) {
  if (id === "statement") {
    if (variant.split) return STATEMENT_SPLIT_MIN_PX;
    return hasGraph ? STATEMENT_WITH_GRAPH_MIN_PX : STATEMENT_MIN_PX;
  }
  if (id === "options") {
    const columns = variant.columns ?? 1;
    const base = columns === 2 ? OPTIONS_TWO_COLUMN_MIN_PX : OPTIONS_MIN_PX;
    return hasOptionGraphs ? Math.max(base, PANEL_PADDING_X_PX + columns * (OPTION_GRAPH_SIZE.width + 96) + (columns - 1) * OPTIONS_COLUMN_GAP_PX) : base;
  }
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
  hasOptionGraphs: boolean;
  compactOptionWidth?: number;
  graphFirst: boolean;
  wideAnswers: boolean;
  formulaWidth: number;
  graphMax: number | null;
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
  const graphFirst = ctx.graphFirst && template.name === "side" && ctx.compactOptionWidth !== undefined;
  const minOf = (id: PanelId) => id === O && graphFirst && optionsVariant.columns !== 2 && ctx.compactOptionWidth
    ? ctx.compactOptionWidth
    : minPanelWidth(id, variantOf(id), ctx.hasGraph, ctx.hasOptionGraphs);

  const idealOf = (id: PanelId) => {
    const v = variantOf(id);
    const min = minOf(id);
    const natural = measurer(id).maxContentWidth(v, graphValue);
    const content = id === O && ctx.wideAnswers ? Math.max(natural, ctx.formulaWidth, ctx.width) : natural;
    const cap = id === O && ctx.wideAnswers ? ctx.width : widthCap(id, v, ctx.hasGraph);
    // Shared width increments reduce small card-width changes between questions
    // without narrowing content or exceeding the readable cap.
    const rounded = Math.ceil(content / 80) * 80;
    return Math.min(clamp(rounded, min, Math.max(min, cap)), Math.max(ctx.width, 1));
  };

  const columnInfo = template.bands.map((band) =>
    band.map((ids) => ({
      ids,
      ideal: Math.max(...ids.map(idealOf)),
      min: Math.max(...ids.map(minOf)),
    })),
  );

  const bandIdeal = columnInfo.map(
    (cols) => cols.reduce((sum, c) => sum + c.ideal, 0) + gap * (cols.length - 1),
  );
  const layoutWidth = Math.min(ctx.width, graphFirst
    ? Math.min(GRAPH_WIDTH_CAP_PX, columnInfo[0][0].ideal) + columnInfo[0][1].min + gap
    : Math.max(...bandIdeal));

  const stats: PanelStat[] = [];
  let y = 0;
  let emptyBandArea = 0;

  for (let b = 0; b < columnInfo.length; b++) {
    const cols = columnInfo[b];
    const available = layoutWidth - gap * (cols.length - 1);
    const total = cols.reduce((sum, c) => sum + c.ideal, 0);
    let widths = cols.map((c) => c.ideal);

    if (graphFirst) {
      if (available < cols[0].min + cols[1].min) return null;
      // Reserve a readable answer column first, then give the graph the rest.
      // Equal halves and equal visual area are not objectives for graph cards.
      widths = [Math.min(GRAPH_WIDTH_CAP_PX, available - cols[1].min), 0];
      widths[1] = available - widths[0];
    } else if (total > available) {
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
          && widths[c] < minPanelWidth(id, variant, ctx.hasGraph, ctx.hasOptionGraphs);
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
    cols.forEach((column, c) => {
      const offset = Math.floor((bandHeight - columnHeights[c]) / 2);
      for (const panel of placed) {
        if (column.ids.includes(panel.id)) panel.rect.y += offset;
      }
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
    stats,
    layoutWidth,
    totalHeight: y - gap,
    emptyBandArea,
  };
}

function scoreCandidate(c: Candidate, ctx: Context, previous?: LayoutPlan | null): number {
  let score = c.template.complexity;

  const overflow = Math.max(0, c.totalHeight - ctx.height);
  if (overflow > 0) score += W_OVERFLOW_FLAT + (W_OVERFLOW * overflow) / Math.max(ctx.height, 1);

  let area = 0;
  let waste = 0;
  for (const { id, rect, contentWidth } of c.stats) {
    // Options never wrap a formula, so a panel narrower than its widest line
    // makes that option scroll sideways. Cheap to avoid, so avoid it.
    const answerWidth = ctx.compactOptionWidth && c.template.name === "side"
      ? Math.min(contentWidth, ctx.compactOptionWidth * (c.optionsVariant.columns ?? 1)
        + (c.optionsVariant.columns === 2 ? OPTIONS_COLUMN_GAP_PX : 0))
      : contentWidth;
    if (id === O && rect.width < answerWidth) {
      score += W_CLIPPED_OPTIONS * (1 - rect.width / answerWidth);
    }
    const a = rect.width * rect.height;
    area += a;
    waste += a * Math.max(0, 1 - contentWidth / rect.width);
    score += W_TALL * Math.max(0, rect.height / rect.width - TALL_RATIO);
    const cap = widthCap(id, id === S ? c.statementVariant : id === O ? c.optionsVariant : {}, ctx.hasGraph);
    score += W_LONG_LINE * Math.max(0, (rect.width - cap) / cap);
  }
  const graphFirst = ctx.graphFirst && c.template.name === "side";
  if (!graphFirst && area > 0) score += W_WASTE * (waste / area);

  const bounding = c.layoutWidth * Math.max(c.totalHeight, 1);
  if (!graphFirst) score += (W_RAGGED * c.emptyBandArea) / bounding;

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
  const graphMax = hasGraph ? STATEMENT_GRAPH_SIZE.height : null;
  const facts = input.characteristics;
  const formulaWidth = input.panels.options.minimumFormulaWidth?.() ?? 0;
  const longAnswerFormula = (facts?.largestOptionFormulaLength ?? 0) > 36 || formulaWidth > 480;
  const compactAnswers = !longAnswerFormula && facts?.hasStatementGraph && facts.optionGraphNum === 0
    && facts.largestResponseOptionLength <= 80 && facts.largestOptionFormulaLength <= 24;
  const ctx: Context = {
    width: Math.max(containerWidth, 1),
    height: containerHeight,
    gap: gapFor(containerWidth),
    hasGraph,
    hasOptionGraphs: Boolean(input.hasOptionGraphs),
    graphFirst: hasGraph && !facts?.hasTable && !input.hasOptionGraphs && !longAnswerFormula,
    wideAnswers: longAnswerFormula,
    formulaWidth,
    compactOptionWidth: compactAnswers ? Math.max(formulaWidth, 240, Math.min(360, 120 + facts.largestResponseOptionLength * 8)) : undefined,
    graphMax,
    measurers: {
      statement: memoized(input.panels.statement, hasGraph),
      // These panels never receive --graph-max. Reuse their measurements as
      // the search tries different graph sizes, avoiding forced DOM layouts.
      options: memoized(input.panels.options, false),
      ...(input.panels.explanation ? { explanation: memoized(input.panels.explanation, false) } : {}),
    },
  };

  const templates = withExplanation ? TEMPLATES_THREE : TEMPLATES_TWO;
  const preferences = input.characteristics ? layoutPreferences(input.characteristics) : null;

  let best: { candidate: Candidate; score: number } | null = null;
  const candidates: { candidate: Candidate; score: number; overflow: number }[] = [];

  const graphSizes = longAnswerFormula && hasGraph && !facts?.hasTable ? [graphMax!, 340, 300] : [graphMax];
  for (const template of templates) {
    if (longAnswerFormula && !withExplanation && template.name !== "stack") continue;
    for (const sv of input.panels.statement.variants) {
      // A source graph is read after its statement, even when its card sits
      // beside the answers. Do not split that reading sequence into columns.
      if (hasGraph && sv.split) continue;
      for (const ov of input.panels.options.variants) {
        if ((preferences?.needsWideAnswers || longAnswerFormula) && ov.columns === 2) continue;
        for (const candidateGraphMax of graphSizes) {
          const chosen = layoutCandidate(ctx, template, sv, ov, candidateGraphMax);
          if (!chosen) continue;
          const columns = ov.columns ?? 1;
          const requiredFormulaWidth = PANEL_PADDING_X_PX + columns * Math.max(0, formulaWidth - PANEL_PADDING_X_PX)
            + (columns - 1) * OPTIONS_COLUMN_GAP_PX;
          if (formulaWidth > 0 && chosen.stats.find((panel) => panel.id === O)!.rect.width < requiredFormulaWidth
            && (columns > 1 || formulaWidth <= ctx.width)) continue;
          let score = scoreCandidate(chosen, ctx, input.previous);
          if (candidateGraphMax !== null && graphMax !== null) score += (graphMax - candidateGraphMax) / graphMax;
          if (preferences && !withExplanation) {
            if (template.name !== preferences.template) score += 0.5;
            const preferredColumns = compactAnswers && template.name === "side" ? 1 : preferences.columns;
            if (ov.columns !== preferredColumns) score += 0.5;
          }
          // Favor a graph card beside the answers when readability and fit are
          // comparable. Overflow and minimum-width safeguards still come first.
          if (!preferences && hasGraph && !withExplanation && template.name === "stack") score += 0.65;
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
  }

  // Fitting layouts always beat scrolling layouts, regardless of aesthetic
  // scores or the previous question's orientation. If none fit, limit the
  // shortlist to within one small spacing unit of the least scrolling option.
  const leastOverflow = Math.min(...candidates.map((c) => c.overflow));
  const allowance = leastOverflow === 0 ? 0 : 24;
  const eligible = candidates.filter((candidate) => candidate.overflow <= leastOverflow + allowance);
  const largestFittingGraph = Math.max(0, ...eligible.map(({ candidate }) => candidate.graphMax ?? 0));
  for (const candidate of eligible) {
    if (longAnswerFormula && hasGraph && candidate.candidate.graphMax !== largestFittingGraph) continue;
    if (!best || candidate.score < best.score - 1e-9) best = candidate;
  }

  // The stacked template is always feasible, so this only guards bad input.
  if (!best) {
    const fallback = layoutCandidate(
      ctx,
      templates[0],
      input.panels.statement.variants[0],
      input.panels.options.variants[0],
      graphMax,
    ) as Candidate;
    best = { candidate: fallback, score: 0 };
  }

  const { candidate } = best;
  const overflow = candidate.totalHeight > ctx.height;
  // Center the complete arrangement on both axes whenever it fits. Long
  // content starts at the top so every part remains reachable by scrolling.
  const top = Math.floor(Math.max(0, ctx.height - candidate.totalHeight) / 2);
  const left = Math.round((ctx.width - candidate.layoutWidth) / 2);

  const rects: Partial<Record<PanelId, Rect>> = {};
  for (const { id, rect } of candidate.stats) {
    rects[id] = { ...rect, x: rect.x + left, y: rect.y + top };
  }

  return {
    template: candidate.template.name,
    wideAnswers: longAnswerFormula,
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
  if (Boolean(a.wideAnswers) !== Boolean(b.wideAnswers)) return false;
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
