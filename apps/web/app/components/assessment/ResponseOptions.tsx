"use client";

import { KaTeXText } from "@/lib/katex-utils";
import { getGraphDimensions } from "@/lib/graph-aspects";
import type { Question } from "@/lib/types";
import { SourceImage } from "./SourceImage";
import { QuestionPanel } from "./QuestionPanel";
import type { PanelSlot } from "./QuestionPanel";

interface ResponseOptionsProps {
  question: Question;
  selectedAnswer?: string;
  onSelect: (option: string) => void;
  onOpenImageModal: (src: string, alt: string, svg?: string) => void;
  /** Placement and measuring hooks from `useQuestionLayout`. */
  slot: PanelSlot;
  /** Number of option columns chosen by the layout. */
  columns?: 1 | 2;
  revealed?: boolean;
  correctAnswer?: string;
  flash?: boolean;
  /** Review mode: options are shown but not selectable. */
  readOnly?: boolean;
}

export function ResponseOptions({
  question,
  selectedAnswer,
  onSelect,
  onOpenImageModal,
  slot,
  columns,
  revealed,
  correctAnswer,
  flash,
  readOnly,
}: ResponseOptionsProps) {
  const isCorrect = selectedAnswer === correctAnswer;

  return (
    <QuestionPanel
      id="options"
      slot={slot}
      contentKey={question.original_number}
      columns={columns}
    >
      <div className="p-5 md:p-6">
        {question.problem && (
          <div className="prose dark:prose-invert max-w-none text-base md:text-lg leading-[1.6] md:leading-[1.8] text-foreground font-serif mb-5 md:mb-6">
            <KaTeXText text={question.problem} />
          </div>
        )}

        {/* `group-data-[columns=2]` reads the data-columns attribute on the
            panel content, which is how the layout switches the column count. */}
        <div className="grid grid-cols-1 group-data-[columns=2]:grid-cols-2 gap-3 md:gap-4">
          {question.options.map((option) => {
            const isSelected = selectedAnswer === option.label;
            const isCorrectOption = option.label === correctAnswer;
            const optionImageDimensions = option.image ? getGraphDimensions(option.image) : null;
            const buttonClasses = revealed
              ? (isCorrectOption
                ? "border-success bg-success/10"
                : isSelected
                  ? "border-wrong bg-wrong/10"
                  : "border-border/60 bg-card")
              : isSelected
                ? "border-primary bg-muted/40 shadow-sm"
                : "border-border/60 hover:border-accent bg-card";
            const letterClasses = revealed
              ? (isCorrectOption
                ? "bg-success text-success-foreground border-success"
                : isSelected
                  ? "bg-wrong text-wrong-foreground border-wrong"
                  : "bg-card text-foreground border-border/60")
              : isSelected
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border/60 group-hover:border-accent";
            const flashClasses = flash && isSelected
              ? (isCorrect ? "answer-flash-correct" : "answer-flash-incorrect")
              : "";
            const letter = (
              <span className={`w-7 h-7 md:w-9 md:h-9 flex-shrink-0 flex items-center justify-center rounded-sm font-bold text-base md:text-lg border-2 transition-colors ${letterClasses}`}>
                {option.label}
              </span>
            );
            const cardClasses = `response-option-button w-full flex gap-3 md:gap-5 p-3 md:p-4 rounded-sm border-2 text-left transition-all group active:scale-[0.98] disabled:cursor-default disabled:active:scale-100 ${buttonClasses} ${flashClasses}`;
            return option.image ? (
              <div key={option.label} className={cardClasses}>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => onSelect(option.label)}
                  aria-label={`Seleccionar opción ${option.label}`}
                  title={`Seleccionar opción ${option.label}`}
                  className="self-start shrink-0 rounded-sm disabled:cursor-default"
                >
                  {letter}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenImageModal(option.image!, `Opción ${option.label}`, option.svg)}
                  aria-label={`Ampliar gráfica de opción ${option.label}`}
                  className="flex flex-1 items-center justify-center min-w-0 [--graph-max:240px] cursor-zoom-in rounded-sm"
                >
                  <SourceImage
                    svg={option.svg}
                    png={option.image}
                    alt={`Opción ${option.label}`}
                    width={optionImageDimensions?.width ?? 340}
                    height={optionImageDimensions?.height ?? 200}
                    className="block w-auto h-auto max-w-full max-h-[240px] mx-auto rounded-sm border border-border object-contain bg-white pointer-events-none"
                  />
                </button>
              </div>
            ) : (
              <button
                key={option.label}
                type="button"
                disabled={readOnly}
                onClick={() => onSelect(option.label)}
                className={cardClasses}
              >
                {letter}
                <div className="flex-1 min-w-0 pt-0.5 md:pt-1 option-math text-base md:text-lg text-foreground font-serif">
                  <KaTeXText text={option.text || ""} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </QuestionPanel>
  );
}
