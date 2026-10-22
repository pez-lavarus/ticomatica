"use client";

import { memo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import type { Question, TestMode } from "@/lib/types";
import { QuestionStatement } from "./QuestionStatement";
import { ResponseOptions } from "./ResponseOptions";

interface QuestionExperienceProps {
  // Data
  question: Question;
  currentIndex: number;
  sectionQuestions: { globalIndex: number; section_number: number }[];
  testMode: TestMode;

  // State
  selectedAnswer?: string;
  isFlagged: boolean;
  selectedAnswers: Record<number, string>;
  flaggedQuestions: Record<number, boolean>;

  // Actions
  onSelect: (option: string) => void;
  onToggleFlag: (e: React.MouseEvent) => void;
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
  selectedAnswer,
  isFlagged,
  selectedAnswers,
  flaggedQuestions,
  onSelect,
  onToggleFlag,
  onNext,
  onPrev,
  onJumpToQuestion,
  onOpenImageModal,
  isLastQuestionInSection,
  hasMoreSections,
  sharedImageSrc,
}: QuestionExperienceProps) {
  const [isNavigatorExpanded, setIsNavigatorExpanded] = useState(false);
  const autoNextTimer = useRef<NodeJS.Timeout | null>(null);

  const handleSelect = (label: string) => {
    onSelect(label);
    if (autoNextTimer.current) {
      clearTimeout(autoNextTimer.current);
    }
    autoNextTimer.current = setTimeout(() => {
      onNext();
      autoNextTimer.current = null;
    }, 300);
  };

  const sectionIndex = sectionQuestions.findIndex(q => q.globalIndex === currentIndex);
  const currentSectionNumber = sectionIndex + 1;
  const totalInSection = sectionQuestions.length;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Statement + Options: horizontal on desktop, vertical on shrink */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <QuestionStatement
          question={question}
          isFlagged={isFlagged}
          onToggleFlag={onToggleFlag}
          sharedImageSrc={sharedImageSrc}
          onOpenImageModal={onOpenImageModal}
        />
        <ResponseOptions
          question={question}
          selectedAnswer={selectedAnswer}
          onSelect={handleSelect}
          onOpenImageModal={onOpenImageModal}
        />
      </div>

      {/* Quick Nav for Mobile / Desktop Bottom */}
      <div className="lg:hidden">
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
                <span className="text-[10px] font-bold uppercase tracking-wider">
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
                <h3 className="uppercase tracking-[0.2em] text-[10px] font-bold text-muted-foreground">
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
                className="w-full py-4 bg-muted text-foreground text-[10px] font-bold uppercase tracking-widest rounded-sm border border-border active:bg-muted/80 transition-colors"
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
