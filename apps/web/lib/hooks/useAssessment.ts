"use client";

import { useCallback, useEffect } from "react";
import type { QuizData } from "@/lib/types";
import { FULL_TEST_TOPICS } from "@/lib/constants";
import { useTestSession } from "@/lib/test-session";

interface UseAssessmentProps {
  quizData: QuizData;
  onTimerEnd: () => void;
  /** Review mode: pause the countdown. */
  paused?: boolean;
}

export function useAssessment({ quizData, onTimerEnd, paused }: UseAssessmentProps) {
  const { session, hydrated, update } = useTestSession();

  const testMode = session.mode;
  const currentTopicIndex = session.topicIndex;
  const currentIndex = session.index;
  const selectedAnswers = session.answers;
  const flaggedQuestions = session.flags;
  const timeLeft = session.timeLeft;
  const reviewMode = session.review;

  // Section-mode practices default their index to 0, which points at the first
  // Geometría question. Ensure the current question belongs to the selected
  // section (legacy sessions and fresh resets both rely on this correction).
  useEffect(() => {
    if (!hydrated || testMode === "full") return;
    if (quizData.questions[currentIndex]?.topic === testMode) return;
    const firstIndex = quizData.questions.findIndex((q) => q.topic === testMode);
    if (firstIndex >= 0) {
      update({ index: firstIndex });
    }
  }, [hydrated, testMode, currentIndex, quizData.questions, update]);

  const isPaused = Boolean(paused) || reviewMode;

  // Timer
  useEffect(() => {
    if (!hydrated || isPaused || timeLeft <= 0) return;
    const timer = setInterval(() => {
      update({ timeLeft: timeLeft - 1 });
    }, 1000);
    return () => clearInterval(timer);
  }, [hydrated, isPaused, timeLeft, update]);

  useEffect(() => {
    if (timeLeft === 0 && hydrated) {
      onTimerEnd();
    }
  }, [timeLeft, hydrated, onTimerEnd]);

  const currentTopic = testMode === "full" ? FULL_TEST_TOPICS[currentTopicIndex] : testMode;

  const currentSectionQuestionsWithGlobalIndex = quizData.questions
    .map((q, idx) => ({ ...q, globalIndex: idx }))
    .filter((q) => q.topic === currentTopic);

  const currentQuestion = quizData.questions[currentIndex];

  const sectionIndex = currentSectionQuestionsWithGlobalIndex.findIndex(q => q.globalIndex === currentIndex);
  const progress = Math.round(((sectionIndex + 1) / currentSectionQuestionsWithGlobalIndex.length) * 100) || 0;

  const handleSelect = useCallback((option: string) => {
    update((prev) => ({ answers: { ...prev.answers, [currentIndex]: option } }));
  }, [currentIndex, update]);

  const toggleFlag = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    update((prev) => ({ flags: { ...prev.flags, [currentIndex]: !prev.flags[currentIndex] } }));
  }, [currentIndex, update]);

  const handleNextSection = useCallback(() => {
    if (testMode === "full" && currentTopicIndex < FULL_TEST_TOPICS.length - 1) {
      const nextTopic = FULL_TEST_TOPICS[currentTopicIndex + 1];
      const nextFirstIndex = quizData.questions.findIndex(q => q.topic === nextTopic);
      update({ topicIndex: currentTopicIndex + 1, index: nextFirstIndex });
    }
  }, [testMode, currentTopicIndex, quizData.questions, update]);

  const handleJumpToSection = useCallback((index: number) => {
    if (testMode !== "full" || index === currentTopicIndex) return;
    const nextTopic = FULL_TEST_TOPICS[index];
    const nextFirstIndex = quizData.questions.findIndex(q => q.topic === nextTopic);
    update({ topicIndex: index, index: nextFirstIndex });
  }, [testMode, currentTopicIndex, quizData.questions, update]);

  const handleNext = useCallback(() => {
    if (sectionIndex < currentSectionQuestionsWithGlobalIndex.length - 1) {
      update({ index: currentSectionQuestionsWithGlobalIndex[sectionIndex + 1].globalIndex });
    } else if (testMode === "full" && currentTopicIndex < FULL_TEST_TOPICS.length - 1) {
      handleNextSection();
    }
  }, [sectionIndex, currentSectionQuestionsWithGlobalIndex, testMode, currentTopicIndex, handleNextSection, update]);

  const handlePrev = useCallback(() => {
    if (sectionIndex > 0) {
      update({ index: currentSectionQuestionsWithGlobalIndex[sectionIndex - 1].globalIndex });
    }
  }, [sectionIndex, currentSectionQuestionsWithGlobalIndex, update]);

  const jumpToQuestion = useCallback((index: number) => {
    if (testMode === "full") {
      const targetTopic = quizData.questions[index]?.topic;
      const topicIndex = FULL_TEST_TOPICS.indexOf(targetTopic);
      if (topicIndex >= 0) {
        update({ index, topicIndex });
        return;
      }
    }
    update({ index });
  }, [testMode, quizData.questions, update]);

  const totalQuestionsToFinish = testMode === "full" ? quizData.questions.length : currentSectionQuestionsWithGlobalIndex.length;

  const answeredCount = testMode === "full"
    ? Object.values(selectedAnswers).filter(val => val !== undefined && val !== "").length
    : currentSectionQuestionsWithGlobalIndex.filter(q => selectedAnswers[q.globalIndex]).length;

  const hasMoreSections = currentTopicIndex < FULL_TEST_TOPICS.length - 1;

  const isComplete = answeredCount >= totalQuestionsToFinish;
  const remainingCount = Math.max(0, totalQuestionsToFinish - answeredCount);

  const setTimeLeft = useCallback((seconds: number) => {
    update({ timeLeft: seconds });
  }, [update]);

  return {
    mounted: hydrated,
    testMode,
    currentTopicIndex,
    currentIndex,
    selectedAnswers,
    flaggedQuestions,
    timeLeft,
    reviewMode,
    currentTopic,
    currentQuestion,
    currentSectionQuestionsWithGlobalIndex,
    sectionIndex,
    progress,
    totalQuestionsToFinish,
    answeredCount,
    isComplete,
    remainingCount,
    handleSelect,
    toggleFlag,
    handleNext,
    handlePrev,
    handleJumpToSection,
    jumpToQuestion,
    handleNextSection,
    setTimeLeft,
    hasMoreSections,
    update,
  };
}
