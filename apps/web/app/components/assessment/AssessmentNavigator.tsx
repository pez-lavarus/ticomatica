"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DesktopNavigator } from "./DesktopNavigator";
import { useAssessmentContext } from "./AssessmentContext";
import { quizData } from "@/lib/question-bank";
import { FULL_TEST_TOPICS } from "@/lib/constants";

// Static question metadata is shared across both views and never rebuilt on a tick.
const questions = quizData.questions.map((q, globalIndex) => ({ ...q, globalIndex }));
const correctAnswers = Object.fromEntries(questions.map((q) => [q.globalIndex, q.correct_answer]));

export function AssessmentNavigator() {
  const pathname = usePathname();
  const router = useRouter();
  const showingResults = pathname === "/results";
  const { mounted, testMode, currentTopicIndex, currentIndex, selectedAnswers,
    flaggedQuestions, reviewMode, update, jumpToQuestion, isHintModalOpen } = useAssessmentContext();
  const sections = useMemo(() => (testMode === "full" ? FULL_TEST_TOPICS : [testMode]).map((topic) => ({
    topic,
    questions: questions.filter((q) => q.topic === topic).map((q) => ({
      globalIndex: q.globalIndex,
      section_number: testMode === "full" ? q.globalIndex + 1 : q.section_number,
    })),
  })), [testMode]);

  const handleJump = useCallback((index: number) => {
    if (showingResults) update({ phase: "results", review: true });
    jumpToQuestion(index);
    if (showingResults) router.push("/test", { scroll: false });
  }, [showingResults, update, jumpToQuestion, router]);
  const handleResults = useCallback(() => {
    update({ phase: "results", review: false });
    router.push("/results", { scroll: false });
  }, [update, router]);

  return (
    // Keep the bank mounted even while hints temporarily hide it.
    <aside aria-label="Banco de preguntas" className={`hidden ${!isHintModalOpen || showingResults ? "lg:flex" : ""} lg:w-80 xl:w-70 shrink-0 flex-col border-r border-border bg-card min-h-0`}>
      {mounted && <DesktopNavigator
        testMode={testMode}
        sections={sections}
        currentTopicIndex={currentTopicIndex}
        currentIndex={showingResults ? -1 : currentIndex}
        selectedAnswers={selectedAnswers}
        correctAnswers={correctAnswers}
        flaggedQuestions={flaggedQuestions}
        reviewMode={showingResults || reviewMode}
        onResults={showingResults ? undefined : handleResults}
        onJumpToQuestion={handleJump}
      />}
    </aside>
  );
}
