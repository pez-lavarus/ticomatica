"use client";

import { memo, useMemo, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import type { Question, TestMode } from "@/lib/types";
import type { VisualSpec } from "@/app/types";
import { extractLayoutCharacteristics } from "@/lib/question-characteristics";
import { getModeBehavior } from "@/lib/practice-mode";
import { QuestionStatement } from "./QuestionStatement";
import { ResponseOptions } from "./ResponseOptions";
import { useQuestionLayout } from "./useQuestionLayout";

interface QuestionExperienceProps {
  // Data
  question: Question;
  currentIndex: number;
  sectionQuestions: { globalIndex: number; section_number: number }[];
  testMode: TestMode;

  // State
  selectedAnswer?: string;
  /** Temporary visual reveal, never recorded as an answer. */
  answerPreview?: boolean;
  expired?: boolean;
  expiredQuestions?: Record<number, boolean>;
  highlightKeywords?: readonly string[];
  selectedAnswers: Record<number, string>;
  flaggedQuestions: Record<number, boolean>;

  // Actions
  onSelect: (option: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onJumpToQuestion: (index: number) => void;
  onOpenImageModal: (src: string, alt: string, svg?: string) => void;

  // Navigation State
  isLastQuestionInSection: boolean;
  hasMoreSections: boolean;
  sharedImageSrc?: string;
  /** Structured graph spec rendered by `VisualRenderer`. */
  visualSpec?: VisualSpec | null;
  /** Review mode: force practice behavior regardless of testMode. */
  reviewMode?: boolean;
}

export const QuestionExperience = memo(function QuestionExperience({
  question,
  currentIndex,
  sectionQuestions,
  testMode,
  selectedAnswer,
  answerPreview = false,
  expired = false,
  expiredQuestions,
  highlightKeywords,
  selectedAnswers,
  flaggedQuestions,
  onSelect,
  onNext,
  onPrev,
  onJumpToQuestion,
  onOpenImageModal,
  isLastQuestionInSection,
  hasMoreSections,
  sharedImageSrc,
  visualSpec,
  reviewMode,
}: QuestionExperienceProps) {
  const [isNavigatorExpanded, setIsNavigatorExpanded] = useState(false);
  const [flashAnswer, setFlashAnswer] = useState<string | null>(null);
  const prevQuestionKeyRef = useRef(question.original_number);
  const autoNextTimer = useRef<NodeJS.Timeout | null>(null);
  const behavior = reviewMode
    ? { autoAdvance: false, immediateFeedback: true, showExplanation: true, collapseOptions: false }
    : getModeBehavior(testMode);

  const revealed = behavior.immediateFeedback && (reviewMode || Boolean(selectedAnswer) || expired);

  // Every image that affects panel sizes, so the layout can re-plan once their
  // dimensions are known, including the preferred SVG's actual proportions.
  const imageSources = [
    ...(sharedImageSrc && !visualSpec ? [sharedImageSrc] : []),
    ...question.options.flatMap((option) => (option.image ? [option.image] : [])),
  ];

  const vectorSources = [
    ...(sharedImageSrc && !visualSpec && question.graph_svg ? [question.graph_svg] : []),
    ...question.options.flatMap((option) => (option.image && option.svg ? [option.svg] : [])),
  ];

  const characteristics = useMemo(() => question.layoutCharacteristics ?? extractLayoutCharacteristics(question), [question]);

  const { containerRef, ready, wideAnswers, animate, slot, stageHeight, statementSplit, optionsColumns, graphMax } = useQuestionLayout({
    characteristics,
    questionKey: question.original_number,
    hasGraph: Boolean(visualSpec) || Boolean(sharedImageSrc),
    hasOptionGraphs: question.options.some((option) => Boolean(option.image)),
    hasStatementText: Boolean(question.statement),
    optionCount: question.options.length,
    imageSources,
    vectorSources,
  });

  if (prevQuestionKeyRef.current !== question.original_number) {
    prevQuestionKeyRef.current = question.original_number;
    setFlashAnswer(null);
  }

  const flashActive = revealed && flashAnswer === selectedAnswer;

  useEffect(() => {
    return () => {
      if (autoNextTimer.current) {
        clearTimeout(autoNextTimer.current);
        autoNextTimer.current = null;
      }
    };
  }, [question.original_number]);

  const handleSelect = (label: string) => {
    if (expired || reviewMode) return;
    onSelect(label);
    if (autoNextTimer.current) {
      clearTimeout(autoNextTimer.current);
      autoNextTimer.current = null;
    }
    if (behavior.autoAdvance) {
      autoNextTimer.current = setTimeout(() => {
        onNext();
        autoNextTimer.current = null;
      }, 300);
    } else {
      setFlashAnswer(label);
    }
  };

  const sectionIndex = sectionQuestions.findIndex(q => q.globalIndex === currentIndex);
  const currentSectionNumber = sectionIndex + 1;
  const totalInSection = sectionQuestions.length;

  return (
    <div className="flex flex-col gap-4 md:gap-6 h-full">
      {expired && <p role="status" className="text-sm text-wrong font-semibold px-2">Tiempo agotado. Esta pregunta cuenta como incorrecta y sus respuestas están bloqueadas.</p>}
      <div
        ref={containerRef}
        aria-busy={!ready}
        className="relative flex-1 min-h-0 -mx-1.5 px-1.5 -mb-2 pb-2 overflow-y-auto hide-scrollbar"
      >
        <div
          data-wide-answers={wideAnswers ? "true" : "false"}
          data-ready={ready ? "true" : "false"}
          data-animate={animate ? "true" : "false"}
          style={{ height: stageHeight, visibility: ready ? "visible" : "hidden" }}
          className={
            stageHeight === undefined
              ? "flex flex-col gap-4 md:gap-6"
              : "question-stage relative"
          }
        >
          <QuestionStatement
            question={question}
            highlightKeywords={highlightKeywords}
            sharedImageSrc={sharedImageSrc}
            visualSpec={visualSpec}
            onOpenImageModal={onOpenImageModal}
            slot={slot("statement")}
            split={statementSplit}
            graphMax={graphMax}
          />
          <ResponseOptions
            question={question}
            highlightKeywords={highlightKeywords}
            selectedAnswer={answerPreview ? question.correct_answer : selectedAnswer}
            onSelect={handleSelect}
            onOpenImageModal={onOpenImageModal}
            slot={slot("options")}
            columns={optionsColumns}
            revealed={revealed || answerPreview}
            preview={answerPreview}
            correctAnswer={question.correct_answer}
            flash={flashActive}
            readOnly={reviewMode || expired}
          />
        </div>
      </div>

      {/* Quick Nav for Mobile / Desktop Bottom */}
      <div className="lg:hidden shrink-0">
        <div className="bg-card border border-border rounded-sm shadow-lg p-4">
          {!isNavigatorExpanded ? (
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={onPrev}
                disabled={currentIndex === sectionQuestions[0]?.globalIndex}
                className="w-12 h-12 flex items-center justify-center border border-border rounded-sm disabled:opacity-30 hover:bg-muted/30 transition-colors active:bg-muted"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={() => setIsNavigatorExpanded(true)}
                className="flex-1 h-12 flex items-center justify-center gap-2 bg-muted/50 border border-border rounded-sm active:bg-muted transition-colors"
              >
                <LayoutGrid className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  ({currentSectionNumber}/{totalInSection})
                </span>
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              </button>

              <button
                onClick={onNext}
                className={`w-12 h-12 flex items-center justify-center rounded-sm transition-all active:scale-95 ${isLastQuestionInSection && (!hasMoreSections || testMode !== "full")
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "border border-border active:bg-muted"
                  }`}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          ) : (
            <div className="space-y-6 py-2">
              <div className="flex items-center justify-between">
                <h3 className="uppercase tracking-[0.2em] text-xs font-bold text-muted-foreground">
                  Navegador de Ítems
                </h3>
                <button
                  onClick={() => setIsNavigatorExpanded(false)}
                  className="p-2 hover:bg-muted rounded-sm transition-colors"
                >
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="grid grid-cols-6 xs:grid-cols-8 gap-2">
                {sectionQuestions.map((q) => (
                  <button
                    key={q.globalIndex}
                    onClick={() => {
                      onJumpToQuestion(q.globalIndex);
                      setIsNavigatorExpanded(false);
                    }}
                    className={`relative aspect-square flex items-center justify-center text-xs font-bold rounded-sm border transition-all active:scale-90 ${q.globalIndex === currentIndex
                      ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20"
                      : expiredQuestions?.[q.globalIndex]
                        ? "border-wrong bg-wrong/10 text-wrong"
                        : selectedAnswers[q.globalIndex]
                        ? "bg-success/15 border-success/40 text-foreground"
                        : "bg-card border-border/60 text-foreground"
                      }`}
                  >
                    {q.section_number}
                    {flaggedQuestions[q.globalIndex] && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full border border-card" />
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsNavigatorExpanded(false)}
                className="w-full py-4 bg-muted text-foreground text-xs font-bold uppercase tracking-widest rounded-sm border border-border active:bg-muted/80 transition-colors"
              >
                Cerrar Panel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
