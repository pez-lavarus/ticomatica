"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TestMode } from "@/lib/types";
import { FULL_TEST_TOPICS } from "@/lib/constants";

interface DesktopNavigatorProps {
  testMode: TestMode;
  currentTopicIndex: number;
  sectionQuestions: { globalIndex: number; section_number: number }[];
  currentIndex: number;
  selectedAnswers: Record<number, string>;
  flaggedQuestions: Record<number, boolean>;
  onJumpToQuestion: (index: number) => void;
  onJumpToSection: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  isLastQuestionInSection: boolean;
  hasMoreSections: boolean;
}

export function DesktopNavigator({
  testMode,
  currentTopicIndex,
  sectionQuestions,
  currentIndex,
  selectedAnswers,
  flaggedQuestions,
  onJumpToQuestion,
  onJumpToSection,
  onPrev,
  onNext,
  isLastQuestionInSection,
  hasMoreSections,
}: DesktopNavigatorProps) {
  return (
    <div className="bg-card text-card-foreground border border-border rounded-sm shadow-md p-8 lg:sticky lg:top-32">
      {testMode === "full" && (
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 hide-scrollbar">
          {FULL_TEST_TOPICS.map((topic, idx) => (
            <button
              key={topic}
              onClick={() => onJumpToSection(idx)}
              className={`flex-1 min-w-[70px] transition-opacity ${idx !== currentTopicIndex ? "opacity-30 hover:opacity-100" : ""}`}
            >
              <div
                className={`h-1 transition-colors ${idx === currentTopicIndex
                  ? "bg-primary"
                  : idx < currentTopicIndex
                    ? "bg-success"
                    : "bg-muted"
                  }`}
              />
              <p className={`text-[8px] font-bold text-center mt-2 tracking-[0.1em] uppercase ${idx === currentTopicIndex ? "text-foreground" : "text-muted-foreground"
                }`}>
                {topic.split(" ")[0]}
              </p>
            </button>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-2 mb-10">
        {sectionQuestions.map((q) => (
          <button
            key={q.globalIndex}
            onClick={() => onJumpToQuestion(q.globalIndex)}
            className={`relative aspect-square flex items-center justify-center text-xs font-bold rounded-sm border transition-colors ${q.globalIndex === currentIndex
              ? "bg-primary text-primary-foreground border-primary shadow-sm z-10 scale-105"
              : selectedAnswers[q.globalIndex]
                ? "bg-success/15 border-success/40 text-foreground"
                : "bg-card border-border/60 hover:border-accent text-foreground"
              }`}
          >
            {q.section_number}
            {flaggedQuestions[q.globalIndex] && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full border border-card" />
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <button
            onClick={onPrev}
            disabled={currentIndex === sectionQuestions[0]?.globalIndex}
            className="flex-1 flex items-center justify-center gap-2 py-4 border border-border bg-card rounded-sm font-bold text-[10px] uppercase tracking-[0.15em] disabled:opacity-30 hover:bg-muted/30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>

          <button
            onClick={onNext}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground rounded-sm font-bold text-[10px] uppercase tracking-[0.15em] transition-colors hover:brightness-90 shadow-sm"
          >
            {isLastQuestionInSection ? (
              testMode === "full" && hasMoreSections ? (
                <>Sección <ChevronRight className="w-4 h-4" /></>
              ) : (
                <>Finalizar</>
              )
            ) : (
              <>Siguiente <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
