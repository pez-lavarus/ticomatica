"use client";

import { memo } from "react";
import { BarChart3 } from "lucide-react";
import type { TestMode } from "@/lib/types";

const ANSWER_LETTERS = ["A", "B", "C", "D"];

interface NavigatorQuestion {
  globalIndex: number;
  section_number: number;
}

interface NavigatorSection {
  topic: string;
  questions: NavigatorQuestion[];
}

interface DesktopNavigatorProps {
  testMode: TestMode;
  sections: NavigatorSection[];
  currentTopicIndex: number;
  currentIndex: number;
  selectedAnswers: Record<number, string>;
  correctAnswers: Record<number, string>;
  flaggedQuestions: Record<number, boolean>;
  /** Review: show correct/incorrect coloring and no "current" highlight. */
  reviewMode?: boolean;
  onResults?: () => void;
  onJumpToQuestion: (index: number) => void;
} 

export const DesktopNavigator = memo(function DesktopNavigator({
  testMode,
  sections,
  currentTopicIndex,
  currentIndex,
  selectedAnswers,
  correctAnswers,
  flaggedQuestions,
  reviewMode,
  onResults,
  onJumpToQuestion,
}: DesktopNavigatorProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden px-4">
        {sections.map((section, sectionIdx) => (
          <div key={section.topic}>
            <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-card flex items-center gap-2 border-b border-border/50">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${sectionIdx === currentTopicIndex ? "bg-primary" : "bg-muted"}`}
              />
              <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-muted-foreground truncate">
                {section.topic}
              </h3>
            </div>

            <div className="flex flex-col gap-2 pt-2 pb-5">
              {section.questions.map((q) => {
                const isCurrent = q.globalIndex === currentIndex;
                const isFlaggedQ = flaggedQuestions[q.globalIndex];
                const isAnswered = Boolean(selectedAnswers[q.globalIndex]);
                const showCorrectness = testMode !== "full" || reviewMode;
                const selectedLetter = selectedAnswers[q.globalIndex];
                const isCorrect = isAnswered && selectedLetter === correctAnswers[q.globalIndex];
                return (
                  <button
                    key={q.globalIndex}
                    onClick={() => onJumpToQuestion(q.globalIndex)}
                    className={`flex items-center justify-between gap-2 px-3 py-3 rounded-sm border transition-colors ${isCurrent
                      ? "border-primary bg-primary/10"
                      : "border-transparent hover:border-accent"
                      }`}
                  >
                    <span className={`text-base font-bold tabular-nums ${isCurrent ? "text-primary" : "text-foreground"}`}>
                      {q.section_number}
                    </span>

                    <span className="flex items-center gap-5">
                      {ANSWER_LETTERS.map((letter) => {
                        const isSelected = selectedLetter === letter;
                        const showLetter = isSelected || (reviewMode && isAnswered) || isCurrent;
                        const circleClasses = isSelected
                          ? (showCorrectness
                            ? (isCorrect
                              ? "bg-success text-success-foreground border-success"
                              : "bg-wrong text-wrong-foreground border-wrong")
                            : "bg-primary text-primary-foreground border-primary")
                          : (reviewMode && !isAnswered
                            ? "bg-wrong text-wrong-foreground border-wrong"
                            : "bg-transparent border-white");
                        return (
                          <span
                            key={letter}
                            className={`w-7 h-7 rounded-full border flex items-center justify-center text-sm font-bold transition-colors opacity-60 ${circleClasses}`}
                          >
                            {showLetter ? letter : null}
                          </span>
                        );
                      })}
                    </span>

                    {isFlaggedQ && (
                      <span className="w-2 h-2 rounded-full bg-destructive shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {onResults && reviewMode && (
        <div className="shrink-0 p-4 border-t border-border/60 bg-card">
          <button
            onClick={onResults}
            className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-sm border border-border/60 hover:border-accent transition-colors"
          >
            <BarChart3 className="w-4 h-4 text-secondary" />
            <span className="text-base font-bold text-foreground">Resultado</span>
          </button>
        </div>
      )}
    </div>
  );
});
