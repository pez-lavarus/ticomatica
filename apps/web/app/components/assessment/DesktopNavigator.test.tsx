import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DesktopNavigator } from "./DesktopNavigator";

const positions: Record<number, number> = {};
let visible = true;
let observers: (() => void)[] = [];
let scrollTo: ReturnType<typeof vi.fn>;
const originalScrollTo = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollTo");
const props = {
  testMode: "full" as const,
  sections: [{ topic: "Geometría", questions: [0, 1, 2].map((globalIndex) => ({ globalIndex, section_number: globalIndex + 1 })) }],
  currentTopicIndex: 0, currentIndex: 0, selectedAnswers: {},
  correctAnswers: { 0: "A", 1: "B", 2: "C" }, flaggedQuestions: {}, onJumpToQuestion: vi.fn(),
};

beforeEach(() => {
  vi.useFakeTimers();
  visible = true;
  Object.assign(positions, { 0: 50, 1: 108, 2: 166 });
  observers = [];
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: () => void) { observers.push(callback); }
    observe() {} disconnect() {} unobserve() {}
  });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (this: HTMLElement) {
    return this.classList.contains("overflow-y-auto") && visible ? 200 : 0;
  });
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
    return this.hasAttribute("data-section-header") ? 36 : this.hasAttribute("data-question-index") ? 50 : 0;
  });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const index = this.getAttribute("data-question-index");
    const scroll = this.closest(".overflow-y-auto")?.scrollTop ?? 0;
    const top = index === null ? 0 : positions[Number(index)] - scroll;
    const height = index === null ? 200 : 50;
    return { top, bottom: top + height, left: 0, right: 280, x: 0, y: top, width: 280, height, toJSON: () => ({}) };
  });
  scrollTo = vi.fn(function (this: HTMLElement, options: ScrollToOptions) { this.scrollTop = options.top ?? 0; });
  Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: scrollTo });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  if (originalScrollTo) Object.defineProperty(HTMLElement.prototype, "scrollTo", originalScrollTo);
  else Reflect.deleteProperty(HTMLElement.prototype, "scrollTo");
});

const flushScroll = (scroller: Element) => {
  fireEvent.scroll(scroller);
  act(() => { vi.advanceTimersByTime(20); });
};

describe("DesktopNavigator scroll context", () => {
  it("pins the current section and question to the edge where the natural row is out of view", () => {
    positions[0] = 300;
    const { container } = render(<DesktopNavigator {...props} />);
    const scroller = container.querySelector<HTMLElement>(".overflow-y-auto")!;
    expect(container.querySelector("[data-current-dock]")).toHaveAttribute("data-current-dock", "bottom");
    scroller.scrollTop = 400;
    flushScroll(scroller);
    expect(container.querySelector("[data-current-dock]")).toHaveAttribute("data-current-dock", "top");
    expect(container.querySelector("[data-current-dock]")?.textContent).toContain("Geometría");
    expect(container.querySelector('[data-question-index="0"]')).toHaveAttribute("aria-hidden", "true");
    scroller.scrollTop = 100;
    flushScroll(scroller);
    expect(container.querySelector("[data-current-dock]")).toHaveAttribute("data-current-dock", "bottom");
    scroller.scrollTop = 250;
    flushScroll(scroller);
    expect(container.querySelector("[data-current-dock]")).toBeNull();
  });

  it("scrolls only the navigator toward the next row after a new answer", () => {
    positions[1] = 300;
    const { container, rerender } = render(<DesktopNavigator {...props} />);
    expect(scrollTo).not.toHaveBeenCalled();
    const answers = { 0: "A" };
    rerender(<DesktopNavigator {...props} selectedAnswers={answers} />);
    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 206, behavior: "smooth" });
    expect(container.querySelector<HTMLElement>(".overflow-y-auto")!.scrollTop).toBe(206);
    rerender(<DesktopNavigator {...props} selectedAnswers={answers} />);
    expect(scrollTo).toHaveBeenCalledTimes(1);
    // The session writes a new answer map even when the same option is clicked.
    rerender(<DesktopNavigator {...props} selectedAnswers={{ 0: "A" }} />);
    expect(scrollTo).toHaveBeenCalledTimes(2);
  });

  it("defers the next-row scroll while hints hide the navigator", () => {
    positions[1] = 300;
    const { rerender } = render(<DesktopNavigator {...props} />);
    visible = false;
    rerender(<DesktopNavigator {...props} selectedAnswers={{ 0: "A" }} />);
    expect(scrollTo).not.toHaveBeenCalled();
    visible = true;
    act(() => { observers.forEach((callback) => callback()); vi.advanceTimersByTime(20); });
    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 206, behavior: "smooth" });
  });

  it("preserves restored/review scroll and does not advance beyond the final question", () => {
    const { rerender } = render(<DesktopNavigator {...props} selectedAnswers={{ 0: "A" }} />);
    expect(scrollTo).not.toHaveBeenCalled();
    rerender(<DesktopNavigator {...props} reviewMode selectedAnswers={{ 0: "B" }} />);
    expect(scrollTo).not.toHaveBeenCalled();
    rerender(<DesktopNavigator {...props} currentIndex={2} selectedAnswers={{ 0: "B", 2: "C" }} />);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
