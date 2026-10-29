/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Trophy, RotateCcw } from "lucide-react";
import { DesktopNavigator } from "@/app/components/assessment/DesktopNavigator";
import { loadTestSession, resetTestSession, saveTestSession, type TestSession } from "@/lib/test-session";
import { quizData } from "@/lib/question-bank";

import { SECTION_TIME, FULL_TEST_TIME, FULL_TEST_TOPICS } from "@/lib/constants";

export default function ResultsPage() {
  const router = useRouter();
  const [session, setSession] = useState<TestSession | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  // Load data from localStorage
  useEffect(() => {
    setSession(loadTestSession());
  }, []);

  useEffect(() => {
    setPortalContainer(document.getElementById("test-header-controls"));
  }, []);

  const selectedAnswers = session?.answers ?? {};
  const flaggedQuestions = session?.flags ?? {};
  const testMode = session?.mode ?? "full";
  const currentTopicIndex = session?.topicIndex ?? 0;
  const timeLeft = session?.timeLeft ?? 0;

  const testQuestionsWithGlobalIndex = quizData.questions
    .map((q, idx) => ({ ...q, globalIndex: idx }))
    .filter((q) => testMode === "full" || q.topic === testMode);

  const score = testQuestionsWithGlobalIndex.reduce(
    (acc: number, q) => acc + (selectedAnswers[q.globalIndex] === q.correct_answer ? 1 : 0),
    0
  );

  const totalQuestions = testQuestionsWithGlobalIndex.length;
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  const passing = percentage >= 65;

  // Performance by topic
  const topicStats = FULL_TEST_TOPICS.map((topic) => {
    const questions = quizData.questions.filter((q) => q.topic === topic);
    const correct = questions.reduce((acc, q) => {
      // Need global index here
      const gIdx = quizData.questions.findIndex((qu) => qu.original_number === q.original_number);
      return acc + (selectedAnswers[gIdx] === q.correct_answer ? 1 : 0);
    }, 0);
    return {
      topic,
      total: questions.length,
      correct,
      percentage: questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0,
    };
  }).filter((s) => testMode === "full" || s.topic === testMode);

  const handleRetake = () => {
    resetTestSession(testMode, testMode === "full" ? FULL_TEST_TIME : SECTION_TIME);
    router.push("/test");
  };

  const allQuestionsWithGlobalIndex = quizData.questions.map((q, idx) => ({ ...q, globalIndex: idx }));
  const correctAnswers = quizData.questions.reduce<Record<number, string>>((acc, q, idx) => {
    acc[idx] = q.correct_answer;
    return acc;
  }, {});
  const navigatorSections = (testMode === "full" ? FULL_TEST_TOPICS : [testMode]).map((topic) => ({
    topic,
    questions: allQuestionsWithGlobalIndex
      .filter((q) => q.topic === topic)
      .map((q) => ({
        globalIndex: q.globalIndex,
        section_number: testMode === "full" ? q.globalIndex + 1 : q.section_number,
      })),
  }));

  const handleJumpToQuestion = (index: number) => {
    const current = loadTestSession();
    saveTestSession({ ...current, index, review: true });
    router.push("/test");
  };

  return (
    <div className="h-full flex flex-col bg-background transition-colors">
      {portalContainer &&
        createPortal(
          <div className="flex items-center gap-1.5 md:gap-3">
            <button
              onClick={handleRetake}
              className="flex items-center gap-1.5 md:gap-2 px-3 md:px-6 py-2 md:py-3 bg-primary text-primary-foreground text-xs md:text-xs font-bold uppercase tracking-[0.15em] md:tracking-[0.2em] rounded-sm shadow-md transition-all hover:brightness-90"
            >
              <RotateCcw className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Reintentar</span>
            </button>
          </div>,
          portalContainer,
        )}

      <div className="flex flex-1 min-h-0">
        <aside className="hidden lg:flex lg:w-80 xl:w-70 shrink-0 flex-col border-r border-border bg-card min-h-0">
          <DesktopNavigator
            testMode={testMode}
            sections={navigatorSections}
            currentTopicIndex={currentTopicIndex}
            currentIndex={-1}
            isFlagged={false}
            selectedAnswers={selectedAnswers}
            correctAnswers={correctAnswers}
            flaggedQuestions={flaggedQuestions}
            reviewMode
            onToggleFlag={() => {}}
            onJumpToQuestion={handleJumpToQuestion}
            onPrev={() => {}}
            onNext={() => {}}
            isLastQuestionInSection={false}
            hasMoreSections={false}
          />
        </aside>

        <div className="flex-1 min-w-0 min-h-0 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
        {/* Score Summary */}
        <div className="bg-card text-card-foreground border border-border/60 rounded-sm shadow-xl p-5 sm:p-10 mb-6 sm:mb-10">
          <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-10">
            {/* Circular Progress */}
            <div className="relative w-40 h-40 sm:w-48 sm:h-48 flex-shrink-0">
              <svg className="w-40 h-40 sm:w-48 sm:h-48 -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60" cy="60" r="52"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-muted"
                />
                <circle
                  cx="60" cy="60" r="52"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={`${percentage * 3.27} 327`}
                  strokeLinecap="butt"
                  className={passing ? "text-success" : "text-destructive"}
                  style={{ transition: "stroke-dasharray 1s ease-in-out" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className={`text-3xl sm:text-5xl font-bold tabular-nums ${passing ? "text-success" : "text-destructive"}`}>
                  {percentage}
                </div>
                <div className="text-xs sm:text-xs font-bold tracking-[0.2em] text-muted-foreground mt-1 uppercase">
                  {passing ? "Aprobado" : "Reprobado"}
                </div>
              </div>
            </div>

            {/* Score Details */}
            <div className="flex-1 w-full text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center md:justify-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-secondary" />
                <div>
                  <div className="text-3xl sm:text-4xl font-bold text-foreground tabular-nums">
                    {percentage} <span className="text-xl sm:text-2xl text-muted-foreground font-normal">/ 100</span>
                  </div>
                  {/* <p className="text-xs sm:text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">Aciertos totales obtenidos</p> */}
                </div>
              </div>

              {/* <h2 className="text-2xl sm:text-3xl font-serif tracking-tight text-foreground mb-4 sm:mb-6 font-semibold leading-tight">
                {passing
                  ? `Certificación Exitosa, ${user?.name?.split(" ")[0] || "Estudiante"}`
                  : `Desempeño, ${user?.name?.split(" ")[0] || "Estudiante"}`}
              </h2> */}

              <div className="grid grid-cols-3 gap-2 sm:gap-6 mt-6 sm:mt-8">
                <div className="text-center p-2 sm:p-4 bg-muted/30 rounded-sm border border-border/60">
                  <div className="text-xl sm:text-2xl font-bold text-success">{score}</div>
                  <div className="text-xs sm:text-xs font-bold text-muted-foreground mt-1 uppercase tracking-[0.1em] sm:tracking-[0.2em]">Correctas</div>
                </div>
                <div className="text-center p-2 sm:p-4 bg-muted/30 rounded-sm border border-border/60">
                  <div className="text-xl sm:text-2xl font-bold text-destructive">{totalQuestions - score}</div>
                  <div className="text-xs sm:text-xs font-bold text-muted-foreground mt-1 uppercase tracking-[0.1em] sm:tracking-[0.2em]">Incorrectas</div>
                </div>
                <div className="text-center p-2 sm:p-4 bg-muted/30 rounded-sm border border-border/60">
                  <div className="text-xl sm:text-2xl font-bold text-foreground">
                    {timeLeft > 0 ? Math.floor(timeLeft / 60) : 0}
                  </div>
                  <div className="text-xs sm:text-xs font-bold text-muted-foreground mt-1 uppercase tracking-[0.1em] sm:tracking-[0.2em]">Minutos</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Topic Breakdown */}
        <div className="bg-card text-card-foreground border border-border/60 rounded-sm shadow-xl overflow-hidden mb-8 sm:mb-12">
          <div className="p-5 sm:p-6 bg-muted/20">
            <h3 className="text-xs sm:text-base font-bold text-foreground uppercase tracking-[0.2em] sm:tracking-[0.3em]">Desempeño por Áreas</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/60">
            {topicStats.map((stat) => (
              <div key={stat.topic} className="p-4 sm:p-8">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-xs sm:text-xs font-bold text-foreground uppercase tracking-[0.1em] sm:tracking-[0.15em]">{stat.topic}</h4>
                  <span className={`text-xs sm:text-xs font-bold uppercase tracking-[0.2em] ${stat.percentage >= 65 ? "text-success" : "text-destructive"}`}>
                    {stat.percentage}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-none overflow-hidden mb-4">
                  <div
                    className={`h-full transition-all duration-1000 ${stat.percentage >= 65 ? "bg-success" : "bg-destructive"}`}
                    style={{ width: `${stat.percentage}%` }}
                  />
                </div>
                <div className="text-xs sm:text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">
                  {stat.correct} de {stat.total} aciertos
                </div>
              </div>
            ))}
          </div>
        </div>

          </div>
        </div>
      </div>
    </div>
  );
}