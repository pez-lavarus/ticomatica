/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trophy, RotateCcw, Home, CheckCircle, XCircle, ChevronDown } from "lucide-react";
import Image from "next/image";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { Logo } from "@/app/components/Logo";
import { KaTeXText, ExplanationText } from "@/lib/katex-utils";
import type { QuizData, UserData, Explanation, TestMode } from "@/lib/types";

// Import the normalized JSON manifest
import quizDataRaw from "@/data/BXM_Math_Full_02_2026_questions_answers.json";
import { SECTION_TIME, FULL_TEST_TOPICS } from "@/lib/constants";
const quizData: QuizData = quizDataRaw as unknown as QuizData;

export default function ResultsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [testMode, setTestMode] = useState<TestMode>("full");
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({});
  const [activeTopicTab, setActiveTopicTab] = useState<string>("Todos");
  const [activeFilter, setActiveFilter] = useState<"all" | "incorrect" | "correct">("all");
  const [isPerformanceExpanded, setIsPerformanceExpanded] = useState(false);

  // Load data from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("bxm-pilot-user");
    const savedAnswers = localStorage.getItem("bxm-pilot-answers");
    const savedTimeStr = localStorage.getItem("bxm-pilot-time-left");
    const savedMode = localStorage.getItem("bxm-pilot-mode") as TestMode | null;
    const savedTopicIndexStr = localStorage.getItem("bxm-pilot-topic-index");

    if (savedUser) setUser(JSON.parse(savedUser));
    if (savedAnswers) setSelectedAnswers(JSON.parse(savedAnswers));
    if (savedMode) setTestMode(savedMode);

    let finalTimeLeft = savedTimeStr ? parseInt(savedTimeStr) : 0;

    // If in full mode, we need to add the time of the remaining sections
    if (savedMode === "full" && savedTopicIndexStr !== null) {
      const topicIdx = parseInt(savedTopicIndexStr);
      const remainingSections = FULL_TEST_TOPICS.length - 1 - topicIdx;
      finalTimeLeft += remainingSections * SECTION_TIME;
    }

    setTimeLeft(finalTimeLeft);
  }, []);

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
    localStorage.removeItem("bxm-pilot-answers");
    localStorage.removeItem("bxm-pilot-time-left");
    localStorage.removeItem("bxm-pilot-index");
    localStorage.removeItem("bxm-pilot-topic-index");
    router.push("/test");
  };

  const handleBackToHome = () => {
    router.push("/welcome");
  };

  return (
    <div className="min-h-screen bg-background transition-colors pb-40 sm:pb-24 ">
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
          <button
            onClick={() => setIsPerformanceExpanded(!isPerformanceExpanded)}
            className="w-full flex items-center justify-between p-5 sm:p-6 bg-muted/20 hover:bg-muted/30 transition-colors"
          >
            <h3 className="text-xs sm:text-base font-bold text-foreground uppercase tracking-[0.2em] sm:tracking-[0.3em]">Desempeño por Áreas</h3>
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="hidden sm:inline text-xs font-bold text-muted-foreground uppercase tracking-widest">
                {isPerformanceExpanded ? "Contraer" : "Expandir detalles"}
              </span>
              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${isPerformanceExpanded ? "rotate-180" : "rotate-0"}`} />
            </div>
          </button>

          <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isPerformanceExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"}`}>
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

      {/* Elegant Sticky Action Bar - Centered & Mobile Optimized */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border/60 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] pb-safe">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 sm:py-6 flex justify-center">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-3xl">
            <button
              onClick={handleRetake}
              className="flex-1 flex items-center justify-center gap-2 sm:gap-4 px-4 sm:px-8 py-4 sm:py-4 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] rounded-sm transition-all active:scale-[0.98] shadow-md sm:shadow-lg border border-primary"
            >
              <RotateCcw className="w-4 h-4" />
              Reintentar
            </button>

            <button
              onClick={handleBackToHome}
              className="flex-1 flex items-center justify-center gap-2 sm:gap-4 px-4 sm:px-8 py-4 sm:py-4 border border-border/60 bg-card text-foreground font-bold text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] rounded-sm transition-all hover:bg-muted active:scale-[0.98]"
            >
              <Home className="w-4 h-4" />
              Inicio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}