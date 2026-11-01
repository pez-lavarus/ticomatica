"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { QuizData } from "@/lib/types";
import { FULL_TEST_TOPICS } from "@/lib/constants";
import { advanceAssessmentClock, questionTimeSeconds } from "@/lib/assessment-clock";
import type { UpdatePatch } from "@/lib/test-session";
import { useTestSession } from "@/lib/test-session";

interface UseAssessmentProps {
  quizData: QuizData;
  onTimerEnd: () => void;
  /** Review mode: pause the countdown. */
  paused?: boolean;
}

export function useAssessment({ quizData, onTimerEnd, paused }: UseAssessmentProps) {
  const { session, hydrated, update: persistUpdate, reset: resetStored } = useTestSession();
  const clockStartedAt = useRef<number | null>(null);
  // Settle time before every action so switching questions saves even partial seconds.
  const update = useCallback((patch: UpdatePatch) => {
    const now = Date.now();
    const elapsed = clockStartedAt.current === null ? 0 : Math.max(0, (now - clockStartedAt.current) / 1000);
    if (clockStartedAt.current !== null) clockStartedAt.current = now;
    persistUpdate((prev) => {
      const timed = advanceAssessmentClock(prev, quizData.questions, elapsed);
      return { ...timed, ...(typeof patch === "function" ? patch(timed) : patch) };
    });
  }, [persistUpdate, quizData.questions]);
  const reset = useCallback((mode: Parameters<typeof resetStored>[0], seconds: number, hardMode = false) => {
    clockStartedAt.current = Date.now();
    resetStored(mode, seconds, hardMode);
  }, [resetStored]);

  const testMode = session.mode;
  const currentTopicIndex = session.topicIndex;
  const currentIndex = session.index;
  const selectedAnswers = session.answers;
  const flaggedQuestions = session.flags;
  const timeLeft = session.timeLeft;
  const reviewMode = session.review || session.phase === "results";

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
  const clockPaused = isPaused || timeLeft <= 0;

  // Wall-clock elapsed time keeps both timers accurate after a delayed browser tick.
  useEffect(() => {
    if (!hydrated || clockPaused) return;
    clockStartedAt.current = Date.now();
    const tick = () => update({});
    const timer = setInterval(tick, 1000);
    window.addEventListener("pagehide", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pagehide", tick);
      document.removeEventListener("visibilitychange", tick);
      clockStartedAt.current = null;
    };
  }, [hydrated, clockPaused, update]);

  useEffect(() => {
    if (timeLeft === 0 && hydrated && !isPaused) {
      onTimerEnd();
    }
  }, [timeLeft, hydrated, isPaused, onTimerEnd]);

  const currentTopic = testMode === "full" ? FULL_TEST_TOPICS[currentTopicIndex] : testMode;

  const currentSectionQuestionsWithGlobalIndex = useMemo(() => quizData.questions
    .map((q, idx) => ({ ...q, globalIndex: idx }))
    .filter((q) => q.topic === currentTopic), [quizData.questions, currentTopic]);

  const currentQuestion = quizData.questions[currentIndex];

  const sectionIndex = currentSectionQuestionsWithGlobalIndex.findIndex(q => q.globalIndex === currentIndex);
  const progress = Math.round(((sectionIndex + 1) / currentSectionQuestionsWithGlobalIndex.length) * 100) || 0;

  const handleSelect = useCallback((option: string) => {
    update((prev) => {
      if (prev.phase !== "active" || prev.review || prev.timeLeft <= 0 || prev.expiredQuestions[currentIndex]
        || (prev.hardMode && prev.questionTimeLeft[currentIndex] === 0)) return {};
      return { answers: { ...prev.answers, [currentIndex]: option } };
    });
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

  const answeredCount = quizData.questions.filter((q, index) => (testMode === "full" || q.topic === testMode)
    && (Boolean(selectedAnswers[index]) || Boolean(session.expiredQuestions[index]))).length;

  const hasMoreSections = currentTopicIndex < FULL_TEST_TOPICS.length - 1;

  const isComplete = answeredCount >= totalQuestionsToFinish;
  const remainingCount = Math.max(0, totalQuestionsToFinish - answeredCount);

  const setTimeLeft = useCallback((seconds: number) => {
    update({ timeLeft: seconds });
  }, [update]);

  return {
    session,
    reset,
    mounted: hydrated,
    testMode,
    currentTopicIndex,
    currentIndex,
    selectedAnswers,
    flaggedQuestions,
    timeLeft,
    hardMode: session.hardMode,
    expiredQuestions: session.expiredQuestions,
    currentQuestionExpired: Boolean(session.expiredQuestions[currentIndex]),
    questionTimeLeft: currentQuestion ? (session.questionTimeLeft[currentIndex] ?? questionTimeSeconds(currentQuestion)) : 0,
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
