"use client";

import { memo, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import type { Explanation, Question, TestMode } from "@/lib/types";
import { getModeBehavior } from "@/lib/practice-mode";
import { QuestionStatement } from "./QuestionStatement";
import { ResponseOptions } from "./ResponseOptions";
import { ExplanationPanel } from "./ExplanationPanel";
import { useQuestionLayout } from "./useQuestionLayout";

interface QuestionExperienceProps {
  // Data
  question: Question;
  currentIndex: number;
  sectionQuestions: { globalIndex: number; section_number: number }[];
  testMode: TestMode;
  explanation?: Explanation;

  // State
  selectedAnswer?: string;
  selectedAnswers: Record<number, string>;
  flaggedQuestions: Record<number, boolean>;

  // Actions
  onSelect: (option: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onJumpToQuestion: (index: number) => void;
  onOpenImageModal: (src: string, alt: string) => void;

  // Navigation State
  isLastQuestionInSection: boolean;
  hasMoreSections: boolean;
  sharedImageSrc?: string;
}

export const QuestionExperience = memo(function QuestionExperience({
  question,
  currentIndex,
  sectionQuestions,
  testMode,
  explanation,
  selectedAnswer,
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
}: QuestionExperienceProps) {
  const [isNavigatorExpanded, setIsNavigatorExpanded] = useState(false);
  const [flashAnswer, setFlashAnswer] = useState<string | null>(null);
  const prevQuestionKeyRef = useRef(question.original_number);
  const autoNextTimer = useRef<NodeJS.Timeout | null>(null);
  const statementRef = useRef<HTMLDivElement | null>(null);
  const statementTextRef = useRef<HTMLDivElement | null>(null);
  const graphWrapperRef = useRef<HTMLDivElement | null>(null);
  const optionsScrollRef = useRef<HTMLDivElement | null>(null);
  const explanationRef = useRef<HTMLDivElement | null>(null);
  const hasImageOptions = question.options.some((option) => option.image);
  const behavior = getModeBehavior(testMode);

  const revealed = behavior.immediateFeedback && Boolean(selectedAnswer);
  const showPanel = behavior.showExplanation && revealed;

  const {
    containerRef,
    layout,
    gridTemplateColumns,
    gridTemplateRows,
    graphMaxHeight,
    optionsGrid,
    scrollMode,
    explanationPlacement,
  } = useQuestionLayout({
    graphSrc: sharedImageSrc,
    questionKey: question.original_number,
    hasImageOptions,
    revealed,
    showExplanation: showPanel,
    statementRef,
    statementTextRef,
    graphWrapperRef,
    optionsScrollRef,
    explanationRef,
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

  // Keep the screen from feeling stuck: a wheel gesture anywhere in the
  // question area scrolls whichever region can actually move. Over a scrollable
  // region the browser handles it natively (momentum, scroll chaining); over
  // dead space or a region that cannot scroll, it is redirected to the options
  // list. In page mode the container itself scrolls natively, so nothing to do.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || scrollMode === "page") return;

    const canScroll = (el: HTMLElement | null): el is HTMLElement =>
      el !== null && el.scrollHeight > el.clientHeight + 1;

    const handleWheel = (e: WheelEvent) => {
      if (e.defaultPrevented || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      const options = optionsScrollRef.current;
      const target = e.target as Node | null;
      if (target && options?.contains(target) && canScroll(options)) return;
      if (target && statementRef.current?.contains(target) && canScroll(statementRef.current)) return;
      if (!canScroll(options)) return;

      const atTop = options.scrollTop <= 0;
      const atBottom = options.scrollTop + options.clientHeight >= options.scrollHeight - 1;
      if ((e.deltaY > 0 && atBottom) || (e.deltaY < 0 && atTop)) return;

      // Lines and pages (Firefox, some mice) are not pixels.
      const delta =
        e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * options.clientHeight : e.deltaY;
      e.preventDefault();
      options.scrollTop += delta;
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [containerRef, scrollMode]);

  const handleSelect = (label: string) => {
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
      {/* Statement + Options: arrangement is decided by useQuestionLayout.
          The container is padded and pulled back with a negative margin so the
          cards' shadows are not clipped by the scroll overflow. */}
      <div
        ref={containerRef}
        className={`grid items-start gap-4 md:gap-6 [&>*]:min-w-0 flex-1 min-h-0 -mx-1.5 px-1.5 -mb-2 pb-2 ${
          scrollMode === "page" ? "overflow-y-auto hide-scrollbar" : ""
        }`}
        style={{ gridTemplateColumns, gridTemplateRows }}
      >
        <div
          ref={statementRef}
          className={
            layout === "horizontal"
              ? "min-h-0 max-h-full overflow-y-auto hide-scrollbar -mx-1.5 px-1.5 pb-2"
              : undefined
          }
        >
          <QuestionStatement
            question={question}
            sharedImageSrc={sharedImageSrc}
            onOpenImageModal={onOpenImageModal}
            graphMaxHeight={graphMaxHeight}
            graphWrapperRef={graphWrapperRef}
            textRef={statementTextRef}
            split={layout === "vertical"}
          />
        </div>
        <div className="self-stretch min-h-0">
          <ResponseOptions
            question={question}
            selectedAnswer={selectedAnswer}
            onSelect={handleSelect}
            onOpenImageModal={onOpenImageModal}
            scrollRef={optionsScrollRef}
            useGrid={optionsGrid}
            revealed={revealed}
            correctAnswer={question.correct_answer}
            flash={flashActive}
          >
            {showPanel && explanationPlacement === "options-column" && (
              <ExplanationPanel explanation={explanation} />
            )}
          </ResponseOptions>
        </div>
        {showPanel && explanationPlacement === "below" && (
          <div ref={explanationRef} className="min-h-0">
            <ExplanationPanel explanation={explanation} />
          </div>
        )}
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
