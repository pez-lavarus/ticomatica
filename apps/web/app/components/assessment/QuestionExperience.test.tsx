import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, cleanup, waitFor } from "@testing-library/react";
import React from "react";
import { QuestionExperience } from "./QuestionExperience";
import { computeHintPanelWidth } from "./useQuestionLayout";
import type { Question } from "@/lib/types";

// jsdom does no layout, so element sizes are stubbed with a simple text-flow
// model: a panel's content is `100 + 40000 / width` tall at any width and
// 500px wide with no wrapping. The container is 1000 x 700.
const CONTAINER = { width: 1000, height: 700 };

function stubLayout() {
  const proto = HTMLElement.prototype;
  const isContent = (el: HTMLElement) => el.classList.contains("question-panel-content");
  const widthOf = (el: HTMLElement) => {
    const w = el.style.width;
    return w.endsWith("px") ? Number.parseFloat(w) : 500;
  };
  vi.spyOn(proto, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
    return this.dataset.panel ? 0 : CONTAINER.width;
  });
  vi.spyOn(proto, "clientHeight", "get").mockImplementation(function (this: HTMLElement) {
    return this.dataset.panel ? 0 : CONTAINER.height;
  });
  vi.spyOn(proto, "offsetWidth", "get").mockImplementation(function (this: HTMLElement) {
    return isContent(this) ? widthOf(this) : 0;
  });
  vi.spyOn(proto, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
    return isContent(this) ? Math.round(100 + 40000 / Math.max(widthOf(this), 1)) : 0;
  });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
}

const question: Question = {
  original_number: 7,
  section_number: 7,
  statement: "Considere la función $f(x) = 2x + 1$.",
  problem: "El valor de $f(3)$ es",
  options: [
    { label: "A", text: "$5$" },
    { label: "B", text: "$6$" },
    { label: "C", text: "$7$" },
    { label: "D", text: "$8$" },
  ],
  correct_answer: "C",
  topic: "Funciones",
};

const baseProps = {
  question,
  currentIndex: 0,
  sectionQuestions: [{ globalIndex: 0, section_number: 7 }],
  testMode: "Funciones" as const,
  selectedAnswers: {},
  flaggedQuestions: {},
  onSelect: () => {},
  onNext: () => {},
  onPrev: () => {},
  onJumpToQuestion: () => {},
  onOpenImageModal: () => {},
  isLastQuestionInSection: false,
  hasMoreSections: false,
};

function panelRects(container: HTMLElement) {
  const result: Record<string, { x: number; y: number; width: number; height: number }> = {};
  container.querySelectorAll<HTMLElement>("[data-panel]").forEach((el) => {
    const match = /translate3d\((-?[\d.]+)px, (-?[\d.]+)px/.exec(el.style.transform);
    result[el.dataset.panel as string] = {
      x: Number(match?.[1]),
      y: Number(match?.[2]),
      width: Number.parseFloat(el.style.width),
      height: Number.parseFloat(el.style.height),
    };
  });
  return result;
}

describe("QuestionExperience layout and math rendering", () => {
  beforeEach(stubLayout);
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows a temporary green preview and highlights keywords without selecting an answer", () => {
    const onSelect = vi.fn();
    const { container, rerender } = render(<QuestionExperience {...baseProps} onSelect={onSelect} answerPreview highlightKeywords={["función", "valor"]} />);
    const correct = container.querySelectorAll(".response-option-button")[2];
    expect(correct).toHaveClass("border-success", "answer-preview-flash");
    expect(container.querySelectorAll("mark")).toHaveLength(2);
    expect(onSelect).not.toHaveBeenCalled();
    rerender(<QuestionExperience {...baseProps} onSelect={onSelect} answerPreview={false} />);
    expect(container.querySelector(".answer-preview-flash")).not.toBeInTheDocument();
    expect(container.querySelector(".border-success")).not.toBeInTheDocument();
    expect(container.querySelector("mark")).not.toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("places the statement and the options as separate, content-sized panels and renders KaTeX math", () => {
    const { container } = render(<QuestionExperience {...baseProps} />);
    const rects = panelRects(container);
    expect(Object.keys(rects).sort()).toEqual(["options", "statement"]);
    for (const r of Object.values(rects)) {
      expect(r.width).toBeGreaterThan(0);
      expect(r.height).toBeGreaterThan(0);
      expect(r.x + r.width).toBeLessThanOrEqual(CONTAINER.width);
    }
    expect(container.querySelectorAll("[data-panel][data-animate='false']")).toHaveLength(2);

    // Verify KaTeX math rendering in statement and options
    const katexElements = container.querySelectorAll(".katex");
    expect(katexElements.length).toBeGreaterThan(0);
  });

  it("switches questions without reusing animated geometry or entrance motion", () => {
    const { container, rerender } = render(<QuestionExperience {...baseProps} />);
    const scroller = container.querySelector("[aria-busy]");
    expect(scroller).toHaveAttribute("aria-busy", "false");

    rerender(<QuestionExperience {...baseProps} question={{ ...question, original_number: 8 }} />);

    expect(scroller).toHaveAttribute("aria-busy", "false");
    expect(container.querySelectorAll("[data-panel][data-animate='false']")).toHaveLength(2);
    expect(container.querySelector("[data-ready]")).toHaveAttribute("data-animate", "false");
    expect(container.querySelector(".panel-enter")).toBeNull();
  });

  it("waits for the raster dimensions and SVG before exposing the measured question", async () => {
    let finishRaster: () => void = () => {};
    vi.stubGlobal("Image", class {
      naturalWidth = 600;
      naturalHeight = 200;
      onload: (() => void) | null = null;
      set src(_src: string) { finishRaster = () => this.onload?.(); }
    });
    let finishSvg: (response: Response) => void = () => {};
    const fetchSvg = vi.fn(() => new Promise<Response>((resolve) => { finishSvg = resolve; }));
    vi.stubGlobal("fetch", fetchSvg);
    const { container, rerender } = render(<QuestionExperience {...baseProps} />);
    const next = { ...question, original_number: 81, graph_svg: "/deferred-graph.svg" };

    rerender(<QuestionExperience {...baseProps} question={next} sharedImageSrc="/deferred-graph.png" />);
    const stage = container.querySelector<HTMLElement>("[data-ready]")!;
    expect(stage.style.visibility).toBe("hidden");
    expect(container.querySelector("[aria-busy]")).toHaveAttribute("aria-busy", "true");

    await act(async () => { finishRaster(); });
    expect(stage.style.visibility).toBe("hidden");
    await act(async () => {
      finishSvg(new Response('<svg viewBox="0 0 600 200"><path /></svg>'));
    });
    await waitFor(() => expect(stage.style.visibility).toBe("visible"));
    expect(stage).toHaveAttribute("data-animate", "false");
    expect(container.querySelector(".graph-svg svg")).not.toBeNull();
    // The panel and layout hook share the same in-flight SVG request.
    expect(fetchSvg).toHaveBeenCalledTimes(1);

    rerender(<QuestionExperience {...baseProps} />);
    rerender(<QuestionExperience {...baseProps} question={next} sharedImageSrc="/deferred-graph.png" />);
    expect(stage.style.visibility).toBe("visible");
    expect(fetchSvg).toHaveBeenCalledTimes(1);
  });

  it("settles on the raster fallback when the preferred SVG is missing", async () => {
    let finishRaster: () => void = () => {};
    vi.stubGlobal("Image", class {
      naturalWidth = 400;
      naturalHeight = 300;
      onload: (() => void) | null = null;
      set src(_src: string) { finishRaster = () => this.onload?.(); }
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    const { container } = render(
      <QuestionExperience {...baseProps} question={{ ...question, graph_svg: "/missing.svg" }} sharedImageSrc="/fallback.png" />,
    );
    await act(async () => { finishRaster(); });
    await waitFor(() => expect(container.querySelector("[data-ready]")).toHaveAttribute("data-ready", "true"));
    expect(container.querySelector('img[alt="Imagen de apoyo"]')).toHaveAttribute("src", expect.stringContaining("fallback.png"));
    expect(container.querySelectorAll("[data-panel][data-animate='false']")).toHaveLength(2);
  });

  it("ignores late assets from a question the student has already left", async () => {
    let failRaster: () => void = () => {};
    vi.stubGlobal("Image", class {
      onerror: (() => void) | null = null;
      set src(_src: string) { failRaster = () => this.onerror?.(); }
    });
    let failSvg: (reason: Error) => void = () => {};
    vi.stubGlobal("fetch", () => new Promise<Response>((_resolve, reject) => { failSvg = reject; }));
    const { container, rerender } = render(
      <QuestionExperience {...baseProps} question={{ ...question, graph_svg: "/late.svg" }} sharedImageSrc="/late.png" />,
    );
    expect(container.querySelector("[data-ready]")).toHaveAttribute("data-ready", "false");
    rerender(<QuestionExperience {...baseProps} question={{ ...question, original_number: 82 }} />);
    const rects = panelRects(container);
    await act(async () => { failRaster(); failSvg(new Error("Missing SVG")); });
    expect(container.querySelector("[data-ready]")).toHaveAttribute("data-ready", "true");
    expect(panelRects(container)).toEqual(rects);
  });

  it("waits for text metrics when web fonts are loading", async () => {
    const fonts = new EventTarget();
    let finishFonts: () => void = () => {};
    Object.assign(fonts, {
      status: "loading",
      ready: new Promise<void>((resolve) => { finishFonts = resolve; }),
    });
    Object.defineProperty(document, "fonts", { configurable: true, value: fonts });
    try {
      const { container } = render(<QuestionExperience {...baseProps} />);
      const stage = container.querySelector<HTMLElement>("[data-ready]")!;
      expect(stage.style.visibility).toBe("hidden");
      await act(async () => { finishFonts(); });
      expect(stage.style.visibility).toBe("visible");
      expect(stage).toHaveAttribute("data-animate", "false");
    } finally {
      Reflect.deleteProperty(document, "fonts");
    }
  });

});


describe("hint panel sizing", () => {
  it("widens hints on roomy screens and accounts for the persistent navigator", () => {
    expect(computeHintPanelWidth(1600, 280)).toBe(520);
    const withBank = computeHintPanelWidth(1280, 280);
    expect(withBank).toBeLessThan(computeHintPanelWidth(1280));
    expect(1280 - 280 - 96 - withBank).toBeGreaterThanOrEqual(480);
  });

  it("reserves question space when the font scale grows", () => {
    const normal = computeHintPanelWidth(1440, 280, 1);
    const enlarged = computeHintPanelWidth(1440, 280, 1.25);
    expect(enlarged).toBeLessThan(normal);
    expect((1440 - 280 - 96) / 1.25 - enlarged).toBeGreaterThanOrEqual(480);
    expect(computeHintPanelWidth(800, 320)).toBe(360);
  });
});
