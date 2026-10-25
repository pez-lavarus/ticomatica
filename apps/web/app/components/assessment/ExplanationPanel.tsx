"use client";

import Image from "next/image";
import { ExplanationText } from "@/lib/katex-utils";
import type { Explanation } from "@/lib/types";

interface ExplanationPanelProps {
  explanation?: Explanation;
}

export function ExplanationPanel({ explanation }: ExplanationPanelProps) {
  if (!explanation) return null;

  return (
    <div className="bg-card text-card-foreground border border-border rounded-sm shadow-md p-5 md:p-6">
      <h4 className="text-xs sm:text-xs font-bold text-secondary uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-6 sm:mb-8 flex items-center gap-3 sm:gap-4">
        <span className="w-8 sm:w-10 h-px bg-secondary/40"></span>
        Solución
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
  );
}
