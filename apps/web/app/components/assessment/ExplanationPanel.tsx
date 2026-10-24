"use client";

import Image from "next/image";
import { CheckCircle, XCircle } from "lucide-react";
import { KaTeXText, ExplanationText } from "@/lib/katex-utils";
import type { Explanation, Question, QuestionOption } from "@/lib/types";

interface ExplanationPanelProps {
  question: Question;
  selectedAnswer?: string;
  explanation?: Explanation;
  onOpenImageModal: (src: string, alt: string) => void;
}

function OptionContent({
  option,
  onOpenImageModal,
}: {
  option?: QuestionOption;
  onOpenImageModal: (src: string, alt: string) => void;
}) {
  if (!option) return null;
  if (option.text) {
    return (
      <div className="flex-1 text-foreground font-serif text-sm sm:text-base break-words">
        <KaTeXText text={option.text} />
      </div>
    );
  }
  if (option.image) {
    return (
      <button
        type="button"
        onClick={() => onOpenImageModal(option.image!, `Opción ${option.label}`)}
        className="rounded-sm border border-border/60 mt-2 bg-white p-2 w-full max-w-[280px] cursor-zoom-in"
      >
        <Image
          src={option.image}
          alt={`Opción ${option.label}`}
          width={280}
          height={180}
          className="w-full h-auto object-contain"
        />
      </button>
    );
  }
  return null;
}

export function ExplanationPanel({
  question,
  selectedAnswer,
  explanation,
  onOpenImageModal,
}: ExplanationPanelProps) {
  const correct = question.correct_answer;
  const isCorrect = selectedAnswer === correct;
  const selectedOption = question.options.find((o) => o.label === selectedAnswer);
  const correctOption = question.options.find((o) => o.label === correct);

  return (
    <div className="bg-card text-card-foreground border border-border rounded-sm shadow-md p-5 md:p-6 space-y-6">
      {isCorrect ? (
        <div className="p-4 sm:p-6 rounded-sm border border-success/30 bg-success/5">
          <div className="uppercase text-xs sm:text-xs font-bold tracking-[0.2em] sm:tracking-[0.3em] text-success mb-4 sm:mb-6 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Correcta
          </div>
          <div className="flex items-start gap-4 sm:gap-6">
            <span className="font-mono text-3xl sm:text-4xl font-bold text-success">{correct}</span>
            <OptionContent option={correctOption} onOpenImageModal={onOpenImageModal} />
          </div>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          <div className="p-4 sm:p-6 rounded-sm border border-destructive/30 bg-destructive/5">
            <div className="uppercase text-xs sm:text-xs font-bold tracking-[0.2em] sm:tracking-[0.3em] text-destructive mb-4 sm:mb-6 flex items-center gap-2">
              <XCircle className="w-4 h-4" /> Tu respuesta
            </div>
            <div className="flex items-start gap-4 sm:gap-6">
              <span className="font-mono text-3xl sm:text-4xl font-bold text-destructive">{selectedAnswer || "—"}</span>
              <OptionContent option={selectedOption} onOpenImageModal={onOpenImageModal} />
            </div>
          </div>
          <div className="p-4 sm:p-6 rounded-sm border border-success/30 bg-success/5">
            <div className="uppercase text-xs sm:text-xs font-bold tracking-[0.2em] sm:tracking-[0.3em] text-success mb-4 sm:mb-6 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Respuesta correcta
            </div>
            <div className="flex items-start gap-4 sm:gap-6">
              <span className="font-mono text-3xl sm:text-4xl font-bold text-success">{correct}</span>
              <OptionContent option={correctOption} onOpenImageModal={onOpenImageModal} />
            </div>
          </div>
        </div>
      )}

      {explanation && (
        <div className="pt-6 border-t border-border/60">
          <h4 className="text-xs sm:text-xs font-bold text-secondary uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-6 sm:mb-8 flex items-center gap-3 sm:gap-4">
            <span className="w-8 sm:w-10 h-px bg-secondary/40"></span>
            Análisis Técnico de la Solución
          </h4>

          {explanation.image && (
            <div className="mb-6 sm:mb-8 rounded-sm border border-border/60 overflow-hidden inline-flex shadow-md bg-white w-full sm:w-auto justify-center">
              <Image
                src={explanation.image}
                alt="Explicación"
                width={500}
                height={280}
                className="object-contain p-2 sm:p-4 max-w-full"
              />
            </div>
          )}

          <div className="space-y-6 sm:space-y-8 text-sm sm:text-base leading-relaxed text-foreground font-serif">
            {explanation.explanation_steps.map((step, idx) => (
              <div key={idx} className="flex gap-4 sm:gap-6">
                <span className="font-mono text-xs sm:text-xs font-bold bg-primary text-primary-foreground px-2 py-1 sm:px-2.5 sm:py-1.5 h-fit rounded-sm shadow-sm shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <div className="flex-1 break-words whitespace-normal">
                  <ExplanationText text={step} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
