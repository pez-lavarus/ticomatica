import { describe, expect, it } from "vitest";
import {
  EXPLANATION_MIN_PX,
  GAP_WIDE_PX,
  IDEAL_WIDTH_CAP_PX,
  OPTIONS_MIN_PX,
  SAFETY_PX,
  planQuestionLayout,
} from "./question-layout-plan";
import type { LayoutPlan, PanelMeasurer, PanelVariant, Rect } from "./question-layout-plan";

const CHAR_W = 9;
const LINE_H = 32;
const PAD = 66; // padding + border

interface TextPanelSpec {
  chars: number;
  graph?: { width: number; height: number };
  /** Options: one entry per option, in characters. */
  items?: number[];
}

/** A text-flow model of a panel: text wraps by characters, a graph scales to
 *  its max height and to the width, options stack or use two columns. */
function textPanel(spec: TextPanelSpec): PanelMeasurer {
  const graphSize = (avail: number, graphMax: number | null) => {
    if (!spec.graph) return { w: 0, h: 0 };
    const maxH = Math.min(graphMax ?? 450, spec.graph.height);
    const scale = Math.min(1, maxH / spec.graph.height, avail / spec.graph.width);
    return { w: spec.graph.width * scale, h: spec.graph.height * scale };
  };
  const optionHeight = (chars: number, width: number) =>
    Math.max(36, Math.ceil((chars * CHAR_W) / Math.max(width - 112, 40)) * LINE_H) + 40;

  return {
    variants: [
      ...(spec.items
        ? ([{ columns: 1 }, { columns: 2 }] as PanelVariant[])
        : spec.graph && spec.chars > 0
          ? ([{ split: false }, { split: true }] as PanelVariant[])
          : [{}]),
    ],
    height(width, variant, graphMax) {
      const inner = width - PAD;
      const textH = (w: number) => (spec.chars ? Math.ceil((spec.chars * CHAR_W) / w) * LINE_H : 0);
      if (spec.items) {
        const cols = variant.columns ?? 1;
        const colW = cols === 2 ? (inner - 24) / 2 : inner;
        const hs = spec.items.map((c) => optionHeight(c, colW));
        let total = 0;
        for (let i = 0; i < hs.length; i += cols) total += Math.max(...hs.slice(i, i + cols)) + (i ? 24 : 0);
        return PAD + textH(inner) + (spec.chars ? 32 : 0) + total;
      }
      if (variant.split) {
        const half = (inner - 40) / 2;
        return PAD + Math.max(textH(half), graphSize(half, graphMax).h);
      }
      const g = graphSize(inner, graphMax);
      return PAD + textH(inner) + (g.h ? g.h + (spec.chars ? 40 : 0) : 0);
    },
    maxContentWidth(variant, graphMax) {
      const text = spec.chars * CHAR_W;
      if (spec.items) {
        const widest = Math.max(...spec.items) * CHAR_W + 112;
        const cols = variant.columns ?? 1;
        return PAD + Math.max(cols === 2 ? widest * 2 + 24 : widest, spec.chars ? text : 0);
      }
      const g = graphSize(9999, graphMax);
      if (variant.split) return PAD + text + 40 + g.w;
      return PAD + Math.max(text, g.w);
    },
  };
}

const short = textPanel({ chars: 80 });
const longStatement = textPanel({ chars: 240 });
const withGraph = textPanel({ chars: 90, graph: { width: 420, height: 380 } });
const wideGraph = textPanel({ chars: 90, graph: { width: 900, height: 300 } });
const shortOptions = textPanel({ chars: 60, items: [14, 14, 14, 14] });
const longOptions = textPanel({ chars: 60, items: [70, 64, 80, 72] });
const explanation = textPanel({ chars: 420 });

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

function plan(
  overrides: Partial<Parameters<typeof planQuestionLayout>[0]> & {
    statement?: PanelMeasurer;
    options?: PanelMeasurer;
    explanation?: PanelMeasurer | null;
  } = {},
): LayoutPlan {
  const { statement, options, explanation: e, ...rest } = overrides;
  return planQuestionLayout({
    containerWidth: 1000,
    containerHeight: 700,
    hasGraph: false,
    panels: { statement: statement ?? short, options: options ?? shortOptions, explanation: e ?? null },
    ...rest,
  });
}

function assertSane(p: LayoutPlan, width: number) {
  const rects = Object.values(p.rects) as Rect[];
  for (const r of rects) {
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.x + r.width).toBeLessThanOrEqual(width);
    expect(r.width).toBeGreaterThan(0);
    expect(r.height).toBeGreaterThan(0);
  }
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) expect(overlaps(rects[i], rects[j])).toBe(false);
  }
}

describe("planQuestionLayout", () => {
  it("never overlaps panels or leaves the container, across sizes and content", () => {
    const statements = [short, longStatement, withGraph, wideGraph];
    const options = [shortOptions, longOptions];
    for (const width of [360, 520, 760, 1000, 1400]) {
      for (const height of [420, 700, 1000]) {
        for (const s of statements) {
          for (const o of options) {
            for (const e of [null, explanation]) {
              const p = plan({
                containerWidth: width,
                containerHeight: height,
                hasGraph: s === withGraph || s === wideGraph,
                statement: s,
                options: o,
                explanation: e,
              });
              assertSane(p, width);
              expect(Boolean(p.rects.explanation)).toBe(Boolean(e));
            }
          }
        }
      }
    }
  });

  it("sizes every panel to its content: height equals the natural height", () => {
    const p = plan();
    expect(p.rects.statement!.height).toBe(
      Math.ceil(short.height(p.rects.statement!.width, p.statementVariant, null)) + SAFETY_PX,
    );
    expect(p.rects.options!.height).toBe(
      Math.ceil(shortOptions.height(p.rects.options!.width, p.optionsVariant, null)) + SAFETY_PX,
    );
  });

  it("keeps panels no wider than a readable measure", () => {
    const p = plan({ containerWidth: 1600, statement: longStatement });
    for (const r of Object.values(p.rects) as Rect[]) expect(r.width).toBeLessThanOrEqual(IDEAL_WIDTH_CAP_PX);
  });

  it("does not stretch the options card across a wide container", () => {
    const p = plan({ containerWidth: 1600 });
    expect(p.rects.options!.width).toBeLessThan(1000);
  });

  it("uses two option columns when they make the card clearly more compact", () => {
    const p = plan({ containerWidth: 1000, statement: longStatement, options: shortOptions });
    expect(p.optionsVariant.columns).toBe(2);
  });

  it("stays single column when the options are long", () => {
    const p = plan({ containerWidth: 700, containerHeight: 1200, options: longOptions });
    expect(p.optionsVariant.columns).toBe(1);
  });

  it("places a squarish graph beside the text on a wide screen and stacks when narrow", () => {
    const wide = plan({ containerWidth: 1300, containerHeight: 600, hasGraph: true, statement: withGraph });
    expect(["side", "stack"]).toContain(wide.template);
    const narrow = plan({ containerWidth: 420, hasGraph: true, statement: withGraph });
    expect(narrow.template).toBe("stack");
    expect(narrow.rects.statement!.width).toBeLessThanOrEqual(420);
  });

  it("a larger font (smaller local container) never produces a side-by-side layout below the minimums", () => {
    for (let width = 400; width <= 1400; width += 40) {
      const p = plan({ containerWidth: width, hasGraph: true, statement: withGraph });
      if (p.template !== "side") continue;
      expect(p.rects.options!.width).toBeGreaterThanOrEqual(OPTIONS_MIN_PX);
    }
  });

  it("shrinks the graph before it overflows the screen", () => {
    const tall = textPanel({ chars: 90, graph: { width: 500, height: 500 } });
    const roomy = plan({ containerWidth: 700, containerHeight: 1400, hasGraph: true, statement: tall });
    const tight = plan({ containerWidth: 700, containerHeight: 640, hasGraph: true, statement: tall });
    expect(roomy.graphMax).toBeNull();
    expect(tight.graphMax).not.toBeNull();
  });

  it("scrolls only when nothing fits, and reports the real content height", () => {
    const p = plan({ containerWidth: 420, containerHeight: 300, statement: longStatement });
    expect(p.overflow).toBe(true);
    expect(p.stageHeight).toBe(p.contentHeight);
  });

  it("centers the layout horizontally and biases it toward the top", () => {
    const p = plan({ containerWidth: 1600, containerHeight: 1000 });
    const statement = p.rects.statement!;
    expect(statement.x).toBeGreaterThan(0);
    expect(statement.y).toBeGreaterThanOrEqual(0);
    expect(statement.y).toBeLessThan((1000 - p.contentHeight) / 2);
  });

  describe("with the explanation", () => {
    it("places all three and reads statement, options, explanation in order", () => {
      const p = plan({ containerWidth: 1000, containerHeight: 900, explanation });
      const { statement, options, explanation: e } = p.rects as Required<LayoutPlan["rects"]>;
      const before = (a: Rect, b: Rect) => a.y < b.y + b.height && (a.y + a.height <= b.y + 1 || a.x + a.width <= b.x + 1);
      expect(before(statement, options)).toBe(true);
      expect(before(options, e) || before(statement, e)).toBe(true);
      expect(e.width).toBeGreaterThanOrEqual(EXPLANATION_MIN_PX);
    });

    it("rearranges when stacking would overflow but another arrangement fits", () => {
      const without = plan({ containerWidth: 1300, containerHeight: 560, statement: short, options: shortOptions });
      const withE = plan({
        containerWidth: 1300,
        containerHeight: 560,
        statement: short,
        options: shortOptions,
        explanation,
        previous: without,
      });
      expect(withE.template).not.toBe("stack3");
      expect(withE.overflow).toBe(false);
    });

    it("resizes the graph or the other panels when space is short", () => {
      const tall = textPanel({ chars: 90, graph: { width: 500, height: 500 } });
      const before = plan({ containerWidth: 900, containerHeight: 900, hasGraph: true, statement: tall });
      const after = plan({
        containerWidth: 900,
        containerHeight: 900,
        hasGraph: true,
        statement: tall,
        explanation,
        previous: before,
      });
      const changed =
        after.graphMax !== before.graphMax ||
        after.template !== before.template ||
        after.rects.statement!.width !== before.rects.statement!.width ||
        after.rects.options!.width !== before.rects.options!.width;
      expect(changed).toBe(true);
    });

    it("leaves the arrangement alone when the explanation fits without changes", () => {
      const before = plan({ containerWidth: 1000, containerHeight: 1600 });
      const after = plan({ containerWidth: 1000, containerHeight: 1600, explanation, previous: before });
      expect(after.rects.statement!.width).toBe(before.rects.statement!.width);
      expect(after.rects.options!.width).toBe(before.rects.options!.width);
      expect(after.optionsVariant).toEqual(before.optionsVariant);
    });
  });

  it("is deterministic", () => {
    const a = plan({ containerWidth: 1100, explanation });
    const b = plan({ containerWidth: 1100, explanation });
    expect(a).toEqual(b);
  });

  it("uses the configured gap between stacked panels", () => {
    const p = plan({ containerWidth: 1000, containerHeight: 2000 });
    if (p.template === "stack") {
      const s = p.rects.statement!;
      expect(p.rects.options!.y - (s.y + s.height)).toBe(GAP_WIDE_PX);
    }
  });
});
