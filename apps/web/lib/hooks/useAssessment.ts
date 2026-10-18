"use client";

import { useState, useEffect, useCallback } from "react";
import type { QuizData, TestMode } from "@/lib/types";
import { SECTION_TIME, FULL_TEST_TIME, FULL_TEST_TOPICS } from "@/lib/constants";

interface UseAssessmentProps {
  quizData: QuizData;
  onTimerEnd: () => void;
}

export function useAssessment({ quizData, onTimerEnd }: UseAssessmentProps) {
  const [mounted, setMounted] = useState(false);
  const [testMode, setTestMode] = useState<TestMode>("full");
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(SECTION_TIME);

  // Load saved state
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);

    const savedAnswers = localStorage.getItem("bxm-pilot-answers");
    if (savedAnswers) {
      try {
        const parsed = JSON.parse(savedAnswers);
        if (typeof parsed === "object" && parsed !== null) {
          setSelectedAnswers(parsed);
        }
      } catch (e) {
        console.error("Failed to parse saved answers", e);
      }
    }

    const savedFlags = localStorage.getItem("bxm-pilot-flags");
    if (savedFlags) {
      try {
        const parsed = JSON.parse(savedFlags);
        if (typeof parsed === "object" && parsed !== null) {
          setFlaggedQuestions(parsed);
        }
      } catch (e) {
        console.error("Failed to parse saved flags", e);
      }
    }

    const savedMode = localStorage.getItem("bxm-pilot-mode") as TestMode | null;
    if (savedMode) {
      setTestMode(savedMode);

      const savedTopicIndex = localStorage.getItem("bxm-pilot-topic-index");
      if (savedTopicIndex) setCurrentTopicIndex(parseInt(savedTopicIndex));

      const savedIndex = localStorage.getItem("bxm-pilot-index");
      if (savedIndex) {
        setCurrentIndex(parseInt(savedIndex));
      } else if (savedMode !== "full") {
        const firstIndex = quizData.questions.findIndex(q => q.topic === savedMode);
        setCurrentIndex(firstIndex >= 0 ? firstIndex : 0);
      }

      const savedTime = localStorage.getItem("bxm-pilot-time-left");
      if (savedTime) {
        setTimeLeft(parseInt(savedTime));
      } else {
        setTimeLeft(savedMode === "full" ? FULL_TEST_TIME : SECTION_TIME);
      }
    }
  }, [quizData.questions]);

  // Persist state
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("bxm-pilot-answers", JSON.stringify(selectedAnswers));
    }
  }, [selectedAnswers, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("bxm-pilot-flags", JSON.stringify(flaggedQuestions));
    }
  }, [flaggedQuestions, mounted]);

  useEffect(() => {
    if (mounted) localStorage.setItem("bxm-pilot-index", currentIndex.toString());
  }, [currentIndex, mounted]);

  useEffect(() => {
    if (mounted) localStorage.setItem("bxm-pilot-topic-index", currentTopicIndex.toString());
  }, [currentTopicIndex, mounted]);

  useEffect(() => {
    if (mounted) localStorage.setItem("bxm-pilot-time-left", timeLeft.toString());
  }, [timeLeft, mounted]);

  // Timer
  useEffect(() => {
    if (!mounted) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [mounted]);

  useEffect(() => {
    if (timeLeft === 0 && mounted) {
      onTimerEnd();
    }
  }, [timeLeft, mounted, onTimerEnd]);

  const currentTopic = testMode === "full" ? FULL_TEST_TOPICS[currentTopicIndex] : testMode;

  const currentSectionQuestionsWithGlobalIndex = quizData.questions
    .map((q, idx) => ({ ...q, globalIndex: idx }))
    .filter((q) => q.topic === currentTopic);

  const currentQuestion = quizData.questions[currentIndex];

  const sectionIndex = currentSectionQuestionsWithGlobalIndex.findIndex(q => q.globalIndex === currentIndex);
  const progress = Math.round(((sectionIndex + 1) / currentSectionQuestionsWithGlobalIndex.length) * 100) || 0;

  const handleSelect = useCallback((option: string) => {
    setSelectedAnswers(prev => ({ ...prev, [currentIndex]: option }));
  }, [currentIndex]);

  const toggleFlag = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setFlaggedQuestions(prev => ({ ...prev, [currentIndex]: !prev[currentIndex] }));
  }, [currentIndex]);

  const handleNextSection = useCallback(() => {
    if (testMode === "full" && currentTopicIndex < FULL_TEST_TOPICS.length - 1) {
      const nextTopic = FULL_TEST_TOPICS[currentTopicIndex + 1];
      const nextFirstIndex = quizData.questions.findIndex(q => q.topic === nextTopic);
      setCurrentTopicIndex(prev => prev + 1);
      setCurrentIndex(nextFirstIndex);
    }
  }, [testMode, currentTopicIndex, quizData.questions]);

  const handleJumpToSection = useCallback((index: number) => {
    if (testMode !== "full" || index === currentTopicIndex) return;
    const nextTopic = FULL_TEST_TOPICS[index];
    const nextFirstIndex = quizData.questions.findIndex(q => q.topic === nextTopic);
    setCurrentTopicIndex(index);
    setCurrentIndex(nextFirstIndex);
  }, [testMode, currentTopicIndex, quizData.questions]);

  const handleNext = useCallback(() => {
    if (sectionIndex < currentSectionQuestionsWithGlobalIndex.length - 1) {
      setCurrentIndex(currentSectionQuestionsWithGlobalIndex[sectionIndex + 1].globalIndex);
    } else if (testMode === "full" && currentTopicIndex < FULL_TEST_TOPICS.length - 1) {
      handleNextSection();
    }
  }, [sectionIndex, currentSectionQuestionsWithGlobalIndex, testMode, currentTopicIndex, handleNextSection]);

  const handlePrev = useCallback(() => {
    if (sectionIndex > 0) {
      setCurrentIndex(currentSectionQuestionsWithGlobalIndex[sectionIndex - 1].globalIndex);
    }
  }, [sectionIndex, currentSectionQuestionsWithGlobalIndex]);

  const jumpToQuestion = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const totalQuestionsToFinish = testMode === "full" ? quizData.questions.length : currentSectionQuestionsWithGlobalIndex.length;

  const answeredCount = testMode === "full"
    ? Object.values(selectedAnswers).filter(val => val !== undefined && val !== "").length
    : currentSectionQuestionsWithGlobalIndex.filter(q => selectedAnswers[q.globalIndex]).length;

  const hasMoreSections = currentTopicIndex < FULL_TEST_TOPICS.length - 1;

  const isComplete = answeredCount >= totalQuestionsToFinish;
  const remainingCount = Math.max(0, totalQuestionsToFinish - answeredCount);

  return {
    mounted,
    testMode,
    currentTopicIndex,
    currentIndex,
    selectedAnswers,
    flaggedQuestions,
    timeLeft,
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
  };
}
