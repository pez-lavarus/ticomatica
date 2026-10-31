import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, fireEvent } from "@testing-library/react";
import type { ComponentProps } from "react";
import type { QuestionExperience } from "@/app/components/assessment/QuestionExperience";
import type { DesktopNavigator } from "@/app/components/assessment/DesktopNavigator";
import QuestionPage from "./page";
import ResultsPage from "../results/page";
import AssessmentLayout from "../layout";
import { quizData } from "@/lib/question-bank";
import { EMPTY_SESSION, loadTestSession, saveTestSession } from "@/lib/test-session";
import { FontScaleProvider } from "@/lib/font-scale";

const { renderQuestion, renderNavigator, router, route } = vi.hoisted(() => ({
  renderQuestion: vi.fn<(props: ComponentProps<typeof QuestionExperience>) => null>(() => null),
  renderNavigator: vi.fn<(props: ComponentProps<typeof DesktopNavigator>) => null>(() => null),
  router: { push: vi.fn() },
  route: { pathname: "/test" },
}));

vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => route.pathname }));
vi.mock("@/app/components/assessment/QuestionExperience", async () => {
  const { memo } = await import("react");
  return { QuestionExperience: memo(renderQuestion) };
});
vi.mock("@/app/components/assessment/DesktopNavigator", async () => {
  const { memo, createElement } = await import("react");
  const actual = await vi.importActual<typeof import("@/app/components/assessment/DesktopNavigator")>("@/app/components/assessment/DesktopNavigator");
  return { DesktopNavigator: memo((props: ComponentProps<typeof DesktopNavigator>) => {
    renderNavigator(props);
    return createElement(actual.DesktopNavigator, props);
  }) };
});
vi.mock("@/app/components/assessment/useQuestionLayout", () => ({
  useHintPanelWidth: () => 440,
}));

describe("question page rendering", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
    route.pathname = "/test";
    router.push.mockImplementation((url: string) => { route.pathname = url; });
    const header = document.createElement("div");
    header.id = "test-header-controls";
    document.body.appendChild(header);
  });
  afterEach(() => {
    cleanup();
    document.getElementById("test-header-controls")?.remove();
    vi.useRealTimers();
  });

  it("does not render the question again when only the countdown changes", () => {
    render(<FontScaleProvider><AssessmentLayout><QuestionPage /></AssessmentLayout></FontScaleProvider>);
    const renders = renderQuestion.mock.calls.length;
    const navigatorRenders = renderNavigator.mock.calls.length;
    act(() => { vi.advanceTimersByTime(1000); });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(renderQuestion).toHaveBeenCalledTimes(renders);
    expect(renderNavigator).toHaveBeenCalledTimes(navigatorRenders);
  });

  it("still updates the question after answering and navigating", () => {
    render(<FontScaleProvider><AssessmentLayout><QuestionPage /></AssessmentLayout></FontScaleProvider>);
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

  it("preserves the layout navigator and its scroll across finish, results, review and retake", () => {
    const { rerender } = render(<FontScaleProvider><AssessmentLayout><QuestionPage /></AssessmentLayout></FontScaleProvider>);
    const showRoute = () => rerender(
      <FontScaleProvider><AssessmentLayout>
        {route.pathname === "/results" ? <ResultsPage /> : <QuestionPage />}
      </AssessmentLayout></FontScaleProvider>,
    );
    act(() => { renderQuestion.mock.lastCall![0].onSelect("B"); });
    const bank = screen.getByRole("complementary", { name: "Banco de preguntas" });
    const scroller = bank.querySelector(".overflow-y-auto")!;
    scroller.scrollTop = 360;
    const firstButton = bank.querySelector("button");

    fireEvent.click(screen.getByRole("button", { name: "Finalizar" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, finalizar" }));
    showRoute();
    expect(route.pathname).toBe("/results");
    expect(screen.getByRole("complementary", { name: "Banco de preguntas" })).toBe(bank);
    expect(bank.querySelector(".overflow-y-auto")).toBe(scroller);
    expect(bank.querySelector("button")).toBe(firstButton);
    expect(scroller.scrollTop).toBe(360);
    expect(renderNavigator.mock.lastCall![0].selectedAnswers[0]).toBe("B");
    expect(renderNavigator.mock.lastCall![0].reviewMode).toBe(true);
    const timeLeft = loadTestSession().timeLeft;
    act(() => { vi.advanceTimersByTime(2000); });
    expect(loadTestSession().timeLeft).toBe(timeLeft);

    act(() => { renderNavigator.mock.lastCall![0].onJumpToQuestion(1); });
    showRoute();
    expect(route.pathname).toBe("/test");
    expect(renderQuestion.mock.lastCall![0].currentIndex).toBe(1);
    expect(renderQuestion.mock.lastCall![0].reviewMode).toBe(true);
    expect(bank.querySelector(".overflow-y-auto")).toBe(scroller);
    expect(scroller.scrollTop).toBe(360);

    fireEvent.click(screen.getByRole("button", { name: "Resultado" }));
    showRoute();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    showRoute();
    expect(route.pathname).toBe("/test");
    expect(loadTestSession().answers).toEqual({});
    expect(renderQuestion.mock.lastCall![0].reviewMode).toBe(false);
    expect(bank.querySelector(".overflow-y-auto")).toBe(scroller);
  });

  it("keeps the bank mounted while hints hide it and then navigates to results", () => {
    saveTestSession({ ...EMPTY_SESSION, mode: "Geometría" });
    const { rerender } = render(<FontScaleProvider><AssessmentLayout><QuestionPage /></AssessmentLayout></FontScaleProvider>);
    const bank = screen.getByRole("complementary", { name: "Banco de preguntas" });
    const scroller = bank.querySelector(".overflow-y-auto");
    act(() => { renderQuestion.mock.lastCall![0].onSelect("A"); });
    expect(bank.classList.contains("lg:flex")).toBe(false);
    expect(bank.querySelector(".overflow-y-auto")).toBe(scroller);
    fireEvent.click(screen.getByRole("button", { name: "Finalizar" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, finalizar" }));
    rerender(<FontScaleProvider><AssessmentLayout><ResultsPage /></AssessmentLayout></FontScaleProvider>);
    expect(bank.classList.contains("lg:flex")).toBe(true);
    expect(bank.querySelector(".overflow-y-auto")).toBe(scroller);
    expect(renderNavigator.mock.lastCall![0].testMode).toBe("Geometría");
  });


  it.each(["full", "Funciones"] as const)("automatically finishes %s in the shared session without recreating the bank", (mode) => {
    const questions = quizData.questions.flatMap((q, i) => mode === "full" || q.topic === mode ? [i] : []);
    const last = questions[questions.length - 1];
    saveTestSession({ ...EMPTY_SESSION, mode, index: last,
      answers: Object.fromEntries(questions.slice(0, -1).map((i) => [i, quizData.questions[i].correct_answer])),
    });
    const { rerender } = render(<FontScaleProvider><AssessmentLayout><QuestionPage /></AssessmentLayout></FontScaleProvider>);
    const bank = screen.getByRole("complementary", { name: "Banco de preguntas" });
    const scroller = bank.querySelector(".overflow-y-auto");
    act(() => { renderQuestion.mock.lastCall![0].onSelect(quizData.questions[last].correct_answer); });
    expect(route.pathname).toBe("/results");
    rerender(<FontScaleProvider><AssessmentLayout><ResultsPage /></AssessmentLayout></FontScaleProvider>);
    expect(bank.querySelector(".overflow-y-auto")).toBe(scroller);
    expect(renderNavigator.mock.lastCall![0].selectedAnswers[last]).toBe(quizData.questions[last].correct_answer);
    expect(screen.getByText("Aprobado")).toBeInTheDocument();
  });

});
