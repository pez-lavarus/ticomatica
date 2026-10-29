import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
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
