"use client";

import { X } from "lucide-react";
import { ExplanationText } from "@/lib/katex-utils";
import type { Explanation } from "@/lib/types";
import { QuestionPanel } from "./QuestionPanel";
import type { PanelSlot } from "./QuestionPanel";

interface ExplanationPanelProps {
  explanation?: Explanation;
  questionKey: number;
  /** Placement and measuring hooks from `useQuestionLayout`. */
  slot: PanelSlot;
  /** Close the panel (dismiss the explanation). */
  onClose?: () => void;
}

export function ExplanationPanel({ explanation, questionKey, slot, onClose }: ExplanationPanelProps) {
  if (!explanation) return null;

  return (
    <QuestionPanel id="explanation" slot={slot} contentKey={questionKey} className="panel-enter">
      <div className="relative p-5 md:p-6">
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Cerrar solución"
            title="Cerrar"
            className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground hover:text-foreground hover:border-accent transition-colors"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        )}

        <h4 className="text-xs sm:text-xs font-bold text-secondary uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-6 sm:mb-8 flex items-center gap-3 sm:gap-4">
          <span className="w-8 sm:w-10 h-px bg-secondary/40"></span>
          Solución
        </h4>

        <div className="space-y-6 sm:space-y-8 text-sm sm:text-base leading-relaxed text-foreground font-serif">
          {explanation.explanation_steps.map((step, idx) => (
            <div key={idx} className="flex gap-4 sm:gap-6">
              <span className="font-mono text-xs sm:text-xs font-bold bg-primary text-primary-foreground px-2 py-1 sm:px-2.5 sm:py-1.5 h-fit rounded-sm shadow-sm shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0 break-words whitespace-normal">
                <ExplanationText text={step} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </QuestionPanel>
  );
}
