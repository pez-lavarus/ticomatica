import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import type { ComponentProps } from "react";
import type { QuestionExperience } from "@/app/components/assessment/QuestionExperience";
import type { DesktopNavigator } from "@/app/components/assessment/DesktopNavigator";
import QuestionPage from "./page";
import { FontScaleProvider } from "@/lib/font-scale";

const { renderQuestion, renderNavigator, router } = vi.hoisted(() => ({
  renderQuestion: vi.fn<(props: ComponentProps<typeof QuestionExperience>) => null>(() => null),
  renderNavigator: vi.fn<(props: ComponentProps<typeof DesktopNavigator>) => null>(() => null),
  router: { push: vi.fn() },
}));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/app/components/assessment/QuestionExperience", async () => {
  const { memo } = await import("react");
  return { QuestionExperience: memo(renderQuestion) };
});
vi.mock("@/app/components/assessment/DesktopNavigator", async () => {
  const { memo } = await import("react");
  return { DesktopNavigator: memo(renderNavigator) };
});
vi.mock("@/app/components/assessment/useQuestionLayout", () => ({
  useHintPanelWidth: () => 440,
}));

describe("question page rendering", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("does not render the question again when only the countdown changes", () => {
    render(<FontScaleProvider><QuestionPage /></FontScaleProvider>);
    const renders = renderQuestion.mock.calls.length;
    const navigatorRenders = renderNavigator.mock.calls.length;
    act(() => { vi.advanceTimersByTime(1000); });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(renderQuestion).toHaveBeenCalledTimes(renders);
    expect(renderNavigator).toHaveBeenCalledTimes(navigatorRenders);
  });

  it("still updates the question after answering and navigating", () => {
    render(<FontScaleProvider><QuestionPage /></FontScaleProvider>);
    act(() => { renderQuestion.mock.lastCall![0].onSelect("B"); });
    expect(renderQuestion.mock.lastCall![0].selectedAnswer).toBe("B");
    expect(renderQuestion.mock.lastCall![0].selectedAnswers[0]).toBe("B");
    expect(renderNavigator.mock.lastCall![0].selectedAnswers[0]).toBe("B");

    act(() => { renderQuestion.mock.lastCall![0].onNext(); });
    expect(renderQuestion.mock.lastCall![0].currentIndex).toBe(1);
    expect(renderQuestion.mock.lastCall![0].selectedAnswer).toBeUndefined();

    act(() => { renderQuestion.mock.lastCall![0].onPrev(); });
    expect(renderQuestion.mock.lastCall![0].currentIndex).toBe(0);
    expect(renderQuestion.mock.lastCall![0].selectedAnswer).toBe("B");
  });
});
