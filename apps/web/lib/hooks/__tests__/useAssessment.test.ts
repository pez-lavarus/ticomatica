import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { EMPTY_SESSION, loadTestSession, saveTestSession } from "@/lib/test-session";
import { useAssessment } from "../useAssessment";
import type { QuizData } from "@/lib/types";

const mockQuizData = {
  questions: [
    { globalIndex: 0, topic: "Geometría", section_number: 1, original_number: 1, text: "Q1", options: [], correct_answer: "A" },
    { globalIndex: 1, topic: "Geometría", section_number: 2, original_number: 2, text: "Q2", options: [], correct_answer: "B" },
    { globalIndex: 2, topic: "Funciones", section_number: 1, original_number: 3, text: "Q3", options: [], correct_answer: "C" },
  ],
} as unknown as QuizData;

describe("useAssessment", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("should initialize with default values", () => {
    const { result } = renderHook(() => useAssessment({ quizData: mockQuizData, onTimerEnd: vi.fn() }));

    // Initial state before mounting might be default
    expect(result.current.currentIndex).toBe(0);
  });

  it("should handle jumping to a question", () => {
    const { result } = renderHook(() => useAssessment({ quizData: mockQuizData, onTimerEnd: vi.fn() }));

    act(() => {
      result.current.jumpToQuestion(1);
    });

    expect(result.current.currentIndex).toBe(1);
  });

  it("should handle selecting an answer", () => {
    const { result } = renderHook(() => useAssessment({ quizData: mockQuizData, onTimerEnd: vi.fn() }));

    act(() => {
      result.current.handleSelect("A");
    });

    expect(result.current.selectedAnswers[0]).toBe("A");
    expect(localStorage.getItem("bxm-pilot-session")).toContain('"0":"A"');
  });

  it("should handle navigation", () => {
    const { result } = renderHook(() => useAssessment({ quizData: mockQuizData, onTimerEnd: vi.fn() }));

    // Set to Geometría mode (default)
    act(() => {
      result.current.handleNext();
    });
    expect(result.current.currentIndex).toBe(1);

    act(() => {
      result.current.handlePrev();
    });
    expect(result.current.currentIndex).toBe(0);
  });
});


describe("hard-mode assessment timing", () => {
  beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });
  it("persists fractional time on a switch, restores on remount, and resumes only the open question", () => {
    saveTestSession({ ...EMPTY_SESSION, hardMode: true });
    const first = renderHook(() => useAssessment({ quizData: mockQuizData, onTimerEnd: vi.fn() }));
    act(() => { vi.advanceTimersByTime(1500); first.result.current.jumpToQuestion(1); });
    expect(loadTestSession().questionTimeLeft[0]).toBe(178.5);
    act(() => { vi.advanceTimersByTime(2000); });
    first.unmount();
    const { result } = renderHook(() => useAssessment({ quizData: mockQuizData, onTimerEnd: vi.fn() }));
    act(() => { result.current.jumpToQuestion(0); });
    expect(result.current.questionTimeLeft).toBe(178.5);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.questionTimeLeft).toBe(177.5);
  });
  it("marks an expiration complete and refuses answers on a locked question", () => {
    saveTestSession({ ...EMPTY_SESSION, hardMode: true, questionTimeLeft: { 0: 1 } });
    const { result } = renderHook(() => useAssessment({ quizData: mockQuizData, onTimerEnd: vi.fn() }));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.expiredQuestions[0]).toBe(true);
    expect(result.current.answeredCount).toBe(1);
    act(() => { result.current.jumpToQuestion(0); });
    act(() => { result.current.handleSelect("A"); });
    expect(result.current.selectedAnswers[0]).toBeUndefined();
    expect(result.current.currentQuestionExpired).toBe(true);
  });
  it("settles a deadline before accepting an answer and pauses clocks in review/results", () => {
    saveTestSession({ ...EMPTY_SESSION, hardMode: true, questionTimeLeft: { 0: 0.5 } });
    const { result } = renderHook(() => useAssessment({ quizData: mockQuizData, onTimerEnd: vi.fn() }));
    act(() => { vi.advanceTimersByTime(600); result.current.handleSelect("A"); });
    expect(result.current.selectedAnswers[0]).toBeUndefined();
    expect(result.current.expiredQuestions[0]).toBe(true);
    act(() => { result.current.update({ phase: "results" }); });
    const remaining = loadTestSession();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(loadTestSession()).toEqual(remaining);
  });
});
