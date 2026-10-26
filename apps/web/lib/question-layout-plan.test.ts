import { describe, expect, it } from "vitest";
import {
  COLUMN_GAP_PX,
  MAX_GRAPH_HEIGHT,
  MIN_GRAPH_HEIGHT,
  OPTIONS_MIN_WIDTH_PX,
  STATEMENT_WITH_GRAPH_MIN_WIDTH_PX,
  columnsTemplate,
  gridTemplateRowsFor,
  oneColumnListHeight,
  planVerticalFit,
  resolveArrangement,
  scrollForRevealedContent,
  twoColumnListHeight,
} from "./question-layout-plan";
import type { ArrangementInput, VerticalFitInput } from "./question-layout-plan";

const squarishGraph: ArrangementInput = {
  isWideViewport: true,
  containerWidth: 1000,
  hasImageOptions: false,
  hasGraph: true,
  graphAspect: 1.2,
};

// What the question container reports for a given real width at a font scale:
// `zoom` makes local width = visual width / scale.
const localWidth = (visualWidth: number, scale: number) => Math.round(visualWidth / scale);

describe("resolveArrangement", () => {
  it("stays stacked below the wide-viewport breakpoint", () => {
    expect(resolveArrangement({ ...squarishGraph, isWideViewport: false }).layout).toBe("vertical");
  });

  it("stays stacked until the container has been measured", () => {
    expect(resolveArrangement({ ...squarishGraph, containerWidth: null }).layout).toBe("vertical");
  });

  it("stacks when there is no graph and no image options", () => {
    expect(resolveArrangement({ ...squarishGraph, hasGraph: false, graphAspect: null }).layout).toBe("vertical");
  });

  it("stacks while the graph aspect is unknown or heavily horizontal", () => {
    expect(resolveArrangement({ ...squarishGraph, graphAspect: null }).layout).toBe("vertical");
    expect(resolveArrangement({ ...squarishGraph, graphAspect: 2.6 }).layout).toBe("vertical");
  });

  it("places squarish graphs side by side", () => {
    expect(resolveArrangement(squarishGraph).layout).toBe("horizontal");
  });

  it("keeps both columns above their minimum widths", () => {
    for (const width of [740, 800, 1000, 1400]) {
      for (const graphAspect of [0.6, 1, 1.5, 2]) {
        const result = resolveArrangement({ ...squarishGraph, containerWidth: width, graphAspect });
        if (result.layout !== "horizontal") continue;
        const usable = width - COLUMN_GAP_PX;
        expect(result.statementFraction * usable).toBeGreaterThanOrEqual(STATEMENT_WITH_GRAPH_MIN_WIDTH_PX - 0.5);
        expect((1 - result.statementFraction) * usable).toBeGreaterThanOrEqual(OPTIONS_MIN_WIDTH_PX - 0.5);
      }
    }
  });

  it("gives taller graphs a narrower statement column than wider ones", () => {
    const tall = resolveArrangement({ ...squarishGraph, containerWidth: 1600, graphAspect: 0.7 });
    const wide = resolveArrangement({ ...squarishGraph, containerWidth: 1600, graphAspect: 1.9 });
    expect(tall.statementFraction).toBeLessThan(wide.statementFraction);
  });

  it("uses image options side by side and stacks them when too narrow", () => {
    const base: ArrangementInput = { ...squarishGraph, hasGraph: false, graphAspect: null, hasImageOptions: true };
    expect(resolveArrangement({ ...base, containerWidth: 900 }).layout).toBe("horizontal");
    expect(resolveArrangement({ ...base, containerWidth: 690 }).layout).toBe("vertical");
  });

  it("stacks sooner as the font grows, for the same real width", () => {
    // Real content width 880px (e.g. a 1280px window beside the sidebar).
    const at = (scale: number) =>
      resolveArrangement({ ...squarishGraph, containerWidth: localWidth(880, scale) }).layout;
    expect(at(1)).toBe("horizontal");
    expect(at(1.125)).toBe("horizontal");
    expect(at(1.25)).toBe("vertical");
  });

  it("scales its minimums with the root font size when that is how fonts scale", () => {
    const input = { ...squarishGraph, containerWidth: 800 };
    expect(resolveArrangement({ ...input, remScale: 1 }).layout).toBe("horizontal");
    expect(resolveArrangement({ ...input, remScale: 1.25 }).layout).toBe("vertical");
  });
});

describe("columnsTemplate / gridTemplateRowsFor", () => {
  it("emits one column when stacked and two fractions when side by side", () => {
    expect(columnsTemplate({ layout: "vertical", statementFraction: 0.5 })).toBe("minmax(0, 1fr)");
    expect(columnsTemplate({ layout: "horizontal", statementFraction: 0.4 })).toBe(
      "minmax(0, 0.400fr) minmax(0, 0.600fr)",
    );
  });

  it("contains the options row in contained mode and lets rows grow in page mode", () => {
    expect(gridTemplateRowsFor("horizontal", "contained", false)).toBe("minmax(0, 1fr)");
    expect(gridTemplateRowsFor("vertical", "contained", false)).toBe("auto minmax(0, 1fr)");
    expect(gridTemplateRowsFor("vertical", "contained", true)).toBe("auto minmax(0, 1fr) auto");
    expect(gridTemplateRowsFor("vertical", "page", false)).toBe("auto auto");
    expect(gridTemplateRowsFor("vertical", "page", true)).toBe("auto auto auto");
  });
});

describe("list heights", () => {
  it("sums one column with gaps", () => {
    expect(oneColumnListHeight([70, 70, 70, 70], 12)).toBe(316);
    expect(oneColumnListHeight([], 12)).toBe(0);
  });

  it("takes the taller of each pair in two columns", () => {
    expect(twoColumnListHeight([70, 70, 70, 70], 12)).toBe(152);
    expect(twoColumnListHeight([60, 90, 50], 10)).toBe(90 + 10 + 50);
  });
});

// A statement card made of 100px of chrome (padding, text) plus a graph.
function stackedInput(overrides: Partial<VerticalFitInput> = {}): VerticalFitInput {
  return {
    containerHeight: 700,
    rowGap: 24,
    hasGraph: true,
    statement: { height: 400, graphBoxHeight: 300, textHeight: 60, graphBesideText: false },
    options: { chromeHeight: 80, itemHeights: [70, 70, 70, 70], itemGap: 12, listWidth: 600 },
    explanationHeight: 0,
    ...overrides,
  };
}

describe("planVerticalFit", () => {
  it("shrinks the graph to the room left by the options when everything fits", () => {
    const fit = planVerticalFit(stackedInput());
    // 700 - 24 gap - 2 safety - 396 options - 100 chrome - 2 frame
    expect(fit).toEqual({ optionsGrid: false, graphMaxHeight: 176, scroll: "contained" });
  });

  it("never grows the graph past the ceiling", () => {
    const fit = planVerticalFit(stackedInput({ containerHeight: 1200 }));
    expect(fit.graphMaxHeight).toBe(MAX_GRAPH_HEIGHT);
  });

  it("switches to two columns before shrinking the graph below its floor", () => {
    const fit = planVerticalFit(stackedInput({ containerHeight: 500 }));
    expect(fit).toEqual({ optionsGrid: true, graphMaxHeight: MIN_GRAPH_HEIGHT, scroll: "contained" });
  });

  it("does not use two columns when the list is too narrow for them", () => {
    const fit = planVerticalFit(
      stackedInput({
        containerHeight: 500,
        options: { chromeHeight: 80, itemHeights: [70, 70, 70, 70], itemGap: 12, listWidth: 330 },
      }),
    );
    expect(fit.optionsGrid).toBe(false);
    expect(fit.scroll).toBe("page");
  });

  it("scrolls only the options list when the floor graph still leaves usable room", () => {
    const fit = planVerticalFit(
      stackedInput({
        containerHeight: 606,
        options: { chromeHeight: 80, itemHeights: [150, 150, 150, 150], itemGap: 12, listWidth: 600 },
      }),
    );
    expect(fit).toEqual({ optionsGrid: true, graphMaxHeight: MIN_GRAPH_HEIGHT, scroll: "contained" });
  });

  it("falls back to a scrolling page when nothing fits, instead of clipping", () => {
    const fit = planVerticalFit(stackedInput({ containerHeight: 380 }));
    expect(fit).toEqual({ optionsGrid: false, graphMaxHeight: MAX_GRAPH_HEIGHT, scroll: "page" });
  });

  it("handles a statement without a graph", () => {
    const base = stackedInput({
      hasGraph: false,
      statement: { height: 200, graphBoxHeight: 0, textHeight: 200, graphBesideText: false },
    });
    expect(planVerticalFit({ ...base, containerHeight: 700 })).toEqual({
      optionsGrid: false,
      graphMaxHeight: undefined,
      scroll: "contained",
    });
    expect(planVerticalFit({ ...base, containerHeight: 400 })).toEqual({
      optionsGrid: false,
      graphMaxHeight: undefined,
      scroll: "page",
    });
  });

  it("requires the text to fit when the graph sits beside it", () => {
    // Card = 60 padding + max(400 text, 300 graph). Taller than the single-column room.
    const beside = stackedInput({
      containerHeight: 800,
      statement: { height: 460, graphBoxHeight: 300, textHeight: 400, graphBesideText: true },
    });
    const fit = planVerticalFit(beside);
    expect(fit.optionsGrid).toBe(true);
    expect(fit.graphMaxHeight).toBe(MAX_GRAPH_HEIGHT);
  });

  it("does not force a tiny image up to the floor", () => {
    // Two columns leave 120px for the image: enough for a 90px image, not for the floor.
    const tiny = stackedInput({ containerHeight: 480, graphIntrinsicHeight: 90 });
    expect(planVerticalFit(tiny)).toEqual({ optionsGrid: true, graphMaxHeight: 120, scroll: "contained" });
    expect(planVerticalFit({ ...tiny, graphIntrinsicHeight: null }).scroll).toBe("page");
  });

  it("makes the graph smaller when an explanation takes room below", () => {
    // Single column only (narrow list), so the graph is the only thing that can give.
    const options = { chromeHeight: 80, itemHeights: [70, 70, 70, 70], itemGap: 12, listWidth: 330 };
    const without = planVerticalFit(stackedInput({ containerHeight: 900, options }));
    const withExplanation = planVerticalFit(stackedInput({ containerHeight: 900, options, explanationHeight: 120 }));
    expect(without.graphMaxHeight).toBe(MAX_GRAPH_HEIGHT);
    expect(withExplanation.graphMaxHeight).toBe(232);
  });

  it("reaches page mode at larger fonts for the same window", () => {
    // Same window, same content in local px; zoom shrinks the local container.
    const heightAt = (scale: number) => Math.round(560 / scale);
    const scrollAt = (scale: number) => planVerticalFit(stackedInput({ containerHeight: heightAt(scale) })).scroll;
    expect(scrollAt(1)).toBe("contained");
    expect(scrollAt(1.25)).toBe("page");
  });
});

describe("scrollForRevealedContent", () => {
  const fit = { optionsGrid: false, graphMaxHeight: 200, scroll: "contained" as const };

  it("keeps the layout when the revealed content fits", () => {
    expect(scrollForRevealedContent(fit, 600, 600)).toBe(fit);
  });

  it("only turns on scrolling when the revealed content overflows", () => {
    expect(scrollForRevealedContent(fit, 640, 600)).toEqual({ ...fit, scroll: "page" });
  });

  it("never changes the graph size", () => {
    expect(scrollForRevealedContent(fit, 900, 600).graphMaxHeight).toBe(200);
  });
});
