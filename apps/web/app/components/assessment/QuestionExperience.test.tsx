import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { QuestionExperience } from "./QuestionExperience";
import type { Explanation, Question } from "@/lib/types";

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

const explanation: Explanation = {
  original_number: 7,
  display_number: 7,
  explanation_steps: ["Se sustituye $x = 3$.", "Entonces $f(3) = 7$."],
};

const baseProps = {
  question,
  currentIndex: 0,
  sectionQuestions: [{ globalIndex: 0, section_number: 7 }],
  testMode: "Funciones" as const,
  explanation,
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

describe("QuestionExperience layout", () => {
  beforeEach(stubLayout);
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("places the statement and the options as separate, content-sized panels", () => {
    const { container } = render(<QuestionExperience {...baseProps} />);
    const rects = panelRects(container);
    expect(Object.keys(rects).sort()).toEqual(["options", "statement"]);
    for (const r of Object.values(rects)) {
      expect(r.width).toBeGreaterThan(0);
      expect(r.height).toBeGreaterThan(0);
      expect(r.x + r.width).toBeLessThanOrEqual(CONTAINER.width);
    }
    expect(container.querySelectorAll("[data-panel][data-animate='false']")).toHaveLength(2);
  });

  it("adds the explanation as a third panel without overlapping the others", () => {
    const { container, rerender } = render(<QuestionExperience {...baseProps} />);
    rerender(<QuestionExperience {...baseProps} selectedAnswer="A" selectedAnswers={{ 0: "A" }} />);

    const rects = panelRects(container);
    expect(Object.keys(rects).sort()).toEqual(["explanation", "options", "statement"]);
    const list = Object.values(rects);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
        expect(overlap).toBe(false);
      }
    }
    // The panels that were already on screen animate to their new places; the
    // explanation is placed without flying in from a corner.
    const flags = Object.fromEntries(
      Array.from(container.querySelectorAll<HTMLElement>("[data-panel]")).map((el) => [el.dataset.panel, el.dataset.animate]),
    );
    expect(flags.explanation).toBe("false");
  });

  it("does not render the explanation in full-test mode", () => {
    const { container } = render(
      <QuestionExperience {...baseProps} testMode="full" selectedAnswer="A" selectedAnswers={{ 0: "A" }} />,
    );
    expect(container.querySelector("[data-panel='explanation']")).toBeNull();
  });
});
