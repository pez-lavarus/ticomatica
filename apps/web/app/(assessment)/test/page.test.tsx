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
    document.getElementById("test-app-header")?.remove();
    vi.useRealTimers();
  });

  it("removes standalone section/formula controls and resets help to concepts on question navigation", () => {
    saveTestSession({ ...EMPTY_SESSION, mode: "Geometría" });
    render(<FontScaleProvider><AssessmentLayout><QuestionPage /></AssessmentLayout></FontScaleProvider>);
    expect(screen.queryByRole("button", { name: "Información de la sección" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Fórmulas" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pistas" }));
    fireEvent.click(screen.getByRole("tab", { name: "Respuesta" }));
    act(() => { renderQuestion.mock.lastCall![0].onNext(); });
    expect(screen.getByRole("tab", { name: "Pistas" })).toHaveAttribute("aria-selected", "true");
  });

  it("opens Respuesta after an actual practice answer without changing that saved answer on tab changes", () => {
    saveTestSession({ ...EMPTY_SESSION, mode: "Geometría" });
    render(<FontScaleProvider><AssessmentLayout><QuestionPage /></AssessmentLayout></FontScaleProvider>);
    act(() => { renderQuestion.mock.lastCall![0].onSelect("A"); });
    expect(screen.getByRole("tab", { name: "Respuesta" })).toHaveAttribute("aria-selected", "true");
    expect(renderQuestion.mock.lastCall![0].answerPreview).toBe(false);
    expect(loadTestSession().answers[0]).toBe("A");
    fireEvent.click(screen.getByRole("tab", { name: "Pistas" }));
    fireEvent.click(screen.getByRole("button", { name: "Pistas" }));
    expect(loadTestSession().answers[0]).toBe("A");
  });

  it("previews unanswered practice questions only while Respuesta is active and never persists a response", () => {
    saveTestSession({ ...EMPTY_SESSION, mode: "Geometría" });
    render(<FontScaleProvider><AssessmentLayout><QuestionPage /></AssessmentLayout></FontScaleProvider>);
    expect(renderQuestion.mock.lastCall![0].highlightKeywords).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Pistas" }));
    expect(renderQuestion.mock.lastCall![0].highlightKeywords).toContain("radio");
    expect(renderQuestion.mock.lastCall![0].answerPreview).toBe(false);
    fireEvent.click(screen.getByRole("tab", { name: "Respuesta" }));
    expect(renderQuestion.mock.lastCall![0].answerPreview).toBe(true);
    act(() => { vi.advanceTimersByTime(3500); });
    expect(renderQuestion.mock.lastCall![0].answerPreview).toBe(true);
    expect(loadTestSession().answers).toEqual({});
    expect(renderQuestion.mock.lastCall![0].selectedAnswer).toBeUndefined();
    fireEvent.click(screen.getByRole("tab", { name: "Fórmulas" }));
    expect(renderQuestion.mock.lastCall![0].answerPreview).toBe(false);
    fireEvent.click(screen.getByRole("tab", { name: "Respuesta" }));
    fireEvent.click(screen.getByRole("button", { name: "Pistas" }));
    expect(renderQuestion.mock.lastCall![0].answerPreview).toBe(false);
    expect(renderQuestion.mock.lastCall![0].highlightKeywords).toEqual([]);
    expect(loadTestSession().answers).toEqual({});
    fireEvent.click(screen.getByRole("button", { name: "Pistas" }));
    expect(screen.getByRole("tab", { name: "Pistas" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "Respuesta" }));
    act(() => { renderQuestion.mock.lastCall![0].onNext(); });
    expect(renderQuestion.mock.lastCall![0].answerPreview).toBe(false);
    expect(screen.getByRole("tab", { name: "Pistas" })).toHaveAttribute("aria-selected", "true");
  });

  it("keeps help and its current tab open for header actions but still dismisses it outside", () => {
    saveTestSession({ ...EMPTY_SESSION, mode: "Geometría" });
    const controls = document.getElementById("test-header-controls")!;
    const header = document.createElement("header");
    header.id = "test-app-header";
    controls.replaceWith(header);
    header.appendChild(controls);
    const brandAction = document.createElement("button");
    brandAction.textContent = "Acción de cabecera";
    header.prepend(brandAction);
    render(<FontScaleProvider><AssessmentLayout><QuestionPage /></AssessmentLayout></FontScaleProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Pistas" }));
    fireEvent.click(screen.getByRole("tab", { name: "Respuesta" }));
    act(() => { vi.advanceTimersByTime(50); });
    fireEvent.click(brandAction);
    expect(screen.getByRole("tab", { name: "Respuesta" })).toHaveAttribute("aria-selected", "true");
    expect(renderQuestion.mock.lastCall![0].answerPreview).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Aumentar tamaño de texto" }));
    expect(screen.getByRole("tab", { name: "Respuesta" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("button", { name: "Finalizar" }));
    expect(screen.getByRole("tab", { name: "Respuesta" })).toBeInTheDocument();
    fireEvent.click(document.body);
    expect(screen.queryByRole("tab", { name: "Respuesta" })).not.toBeInTheDocument();
  });

  it("highlights only Pistas and lists hints in the question's keyword reading order", () => {
    saveTestSession({ ...EMPTY_SESSION, mode: "Geometría" });
    render(<FontScaleProvider><AssessmentLayout><QuestionPage /></AssessmentLayout></FontScaleProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Pistas" }));
    expect(renderQuestion.mock.lastCall![0].highlightKeywords).toContain("radio");
    const headings = screen.getAllByRole("heading", { level: 4 });
    // Question 1 mentions the radius before the center, unlike the authored hint order.
    expect(headings.map((heading) => heading.textContent)).toEqual(["Distingue radio de radio al cuadrado", "Lee el centro sin invertirlo"]);
    fireEvent.click(screen.getByRole("tab", { name: "Fórmulas" }));
    expect(renderQuestion.mock.lastCall![0].highlightKeywords).toEqual([]);
    fireEvent.click(screen.getByRole("tab", { name: "Respuesta" }));
    expect(renderQuestion.mock.lastCall![0].highlightKeywords).toEqual([]);
    fireEvent.click(screen.getByRole("tab", { name: "Pistas" }));
    expect(renderQuestion.mock.lastCall![0].highlightKeywords).toContain("centro");
    act(() => { renderQuestion.mock.lastCall![0].onSelect("A"); });
    expect(screen.getByRole("tab", { name: "Respuesta" })).toHaveAttribute("aria-selected", "true");
    expect(renderQuestion.mock.lastCall![0].highlightKeywords).toEqual([]);
  });

  it.each(["full", "Geometría"] as const)("shows the small question timer before the general timer and auto-advances on %s expiry", (mode) => {
    saveTestSession({ ...EMPTY_SESSION, mode, hardMode: true, questionTimeLeft: { 0: 1 } });
    render(<FontScaleProvider><AssessmentLayout><QuestionPage /></AssessmentLayout></FontScaleProvider>);
    const questionTimer = screen.getByRole("timer", { name: "Tiempo de la pregunta" });
    expect(questionTimer).toHaveTextContent("0:01");
    expect(questionTimer.querySelector(".text-wrong")).toBeInTheDocument();
    expect(questionTimer.nextElementSibling).toHaveTextContent(mode === "full" ? "180:00" : "40:00");
    act(() => { vi.advanceTimersByTime(1000); });
    expect(loadTestSession().expiredQuestions[0]).toBe(true);
    expect(loadTestSession().answers[0]).toBeUndefined();
    expect(renderQuestion.mock.lastCall![0].currentIndex).toBe(1);
    expect(renderNavigator.mock.lastCall![0].expiredQuestions![0]).toBe(true);
    act(() => { renderQuestion.mock.lastCall![0].onPrev(); });
    expect(renderQuestion.mock.lastCall![0].expired).toBe(true);
    expect(screen.getByRole("timer", { name: "Tiempo de la pregunta" })).toHaveTextContent("0:00");
  });

  it.each(["full", "Geometría"] as const)("finishes after the last %s timeout, counts it wrong, and preserves hard mode on retake", (mode) => {
    const scoped = quizData.questions.flatMap((q, i) => mode === "full" || q.topic === mode ? [i] : []);
    const last = scoped[scoped.length - 1];
    saveTestSession({ ...EMPTY_SESSION, mode, hardMode: true, index: last,
      topicIndex: mode === "full" ? 2 : 0,
      answers: Object.fromEntries(scoped.slice(0, -1).map((i) => [i, quizData.questions[i].correct_answer])),
      questionTimeLeft: { [last]: 1 },
    });
    const { rerender } = render(<FontScaleProvider><AssessmentLayout><QuestionPage /></AssessmentLayout></FontScaleProvider>);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(route.pathname).toBe("/results");
    expect(loadTestSession().expiredQuestions[last]).toBe(true);
    rerender(<FontScaleProvider><AssessmentLayout><ResultsPage /></AssessmentLayout></FontScaleProvider>);
    expect(screen.getByText("Incorrectas").parentElement).toHaveTextContent("1");
    expect(screen.getByText("Correctas").parentElement).toHaveTextContent(String(scoped.length - 1));
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(loadTestSession()).toMatchObject({ hardMode: true, expiredQuestions: {}, questionTimeLeft: {}, answers: {} });
    expect(loadTestSession().timeLeft).toBe(mode === "full" ? 10800 : 2400);
  });

  it("ends a hard full exam when its overall timer expires instead of moving sections", () => {
    saveTestSession({ ...EMPTY_SESSION, hardMode: true, timeLeft: 1 });
    render(<FontScaleProvider><AssessmentLayout><QuestionPage /></AssessmentLayout></FontScaleProvider>);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(route.pathname).toBe("/results");
    expect(loadTestSession().phase).toBe("results");
    expect(loadTestSession().topicIndex).toBe(0);
    expect(loadTestSession().timeLeft).toBe(0);
  });

  it("does not render or activate a per-question timer when hard mode is off", () => {
    render(<FontScaleProvider><AssessmentLayout><QuestionPage /></AssessmentLayout></FontScaleProvider>);
    expect(screen.queryByRole("timer", { name: "Tiempo de la pregunta" })).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(loadTestSession().expiredQuestions).toEqual({});
    expect(loadTestSession().questionTimeLeft).toEqual({});
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

  it.each(["full", "Geometría"] as const)("keeps hints open throughout %s question review without a header toggle", (mode) => {
    saveTestSession({ ...EMPTY_SESSION, mode, phase: "results" });
    route.pathname = "/results";
    const { rerender } = render(<FontScaleProvider><AssessmentLayout><ResultsPage /></AssessmentLayout></FontScaleProvider>);
    const bank = screen.getByRole("complementary", { name: "Banco de preguntas" });
    const scroller = bank.querySelector(".overflow-y-auto")!;
    scroller.scrollTop = 200;
    act(() => { renderNavigator.mock.lastCall![0].onJumpToQuestion(0); });
    const showQuestion = () => rerender(<FontScaleProvider><AssessmentLayout><QuestionPage /></AssessmentLayout></FontScaleProvider>);
    showQuestion();
    expect(screen.getByText("Pistas de la Pregunta")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pistas" })).not.toBeInTheDocument();
    expect(renderQuestion.mock.lastCall![0].selectedAnswer).toBeUndefined();
    act(() => { vi.advanceTimersByTime(50); });
    fireEvent.click(document.body);
    expect(screen.getByText("Pistas de la Pregunta")).toBeInTheDocument();
    act(() => { renderQuestion.mock.lastCall![0].onNext(); });
    expect(screen.getByText("Pistas de la Pregunta")).toBeInTheDocument();
    expect(renderQuestion.mock.lastCall![0].currentIndex).toBe(1);
    expect(bank).toHaveClass("lg:flex");
    expect(screen.getByRole("complementary", { name: "Banco de preguntas" })).toBe(bank);
    expect(bank.querySelector(".overflow-y-auto")).toBe(scroller);
    expect(scroller.scrollTop).toBe(200);
    expect(loadTestSession().answers).toEqual({});

    fireEvent.click(screen.getByRole("button", { name: "Resultado" }));
    rerender(<FontScaleProvider><AssessmentLayout><ResultsPage /></AssessmentLayout></FontScaleProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    showQuestion();
    expect(screen.queryByText("Pistas de la Pregunta")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pistas" }) !== null).toBe(mode !== "full");
  });

});
