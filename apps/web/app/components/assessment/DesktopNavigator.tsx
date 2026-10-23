"use client";

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
  isFlagged: boolean;
  selectedAnswers: Record<number, string>;
  flaggedQuestions: Record<number, boolean>;
  onToggleFlag: (e: React.MouseEvent) => void;
  onJumpToQuestion: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  isLastQuestionInSection: boolean;
  hasMoreSections: boolean;
}

export function DesktopNavigator({
  sections,
  currentTopicIndex,
  currentIndex,
  selectedAnswers,
  flaggedQuestions,
  onJumpToQuestion,
}: DesktopNavigatorProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-6">
        {sections.map((section, sectionIdx) => (
          <div key={section.topic}>
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`w-2 h-2 rounded-full ${sectionIdx === currentTopicIndex ? "bg-primary" : "bg-muted"}`}
              />
              <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-muted-foreground truncate">
                {section.topic}
              </h3>
            </div>

            <div className="flex flex-col gap-2">
              {section.questions.map((q) => {
                const isCurrent = q.globalIndex === currentIndex;
                const isFlaggedQ = flaggedQuestions[q.globalIndex];
                return (
                  <button
                    key={q.globalIndex}
                    onClick={() => onJumpToQuestion(q.globalIndex)}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-sm border transition-colors ${isCurrent
                      ? "border-primary bg-primary/10"
                      : "border-transparent hover:border-accent"
                      }`}
                  >
                    <span className={`text-base font-bold tabular-nums ${isCurrent ? "text-primary" : "text-foreground"}`}>
                      {q.section_number}
                    </span>

                    <span className="flex items-center gap-1.5">
                      {ANSWER_LETTERS.map((letter) => {
                        const isSelected = selectedAnswers[q.globalIndex] === letter;
                        return (
                          <span
                            key={letter}
                            className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold transition-colors ${isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card text-muted-foreground border-border/60"
                              }`}
                          >
                            {letter}
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
    </div>
  );
}
