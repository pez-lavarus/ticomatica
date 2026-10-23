"use client";

import { useRef } from "react";
import { Bookmark } from "lucide-react";
import Image from "next/image";
import { KaTeXText } from "@/lib/katex-utils";
import type { Question } from "@/lib/types";

interface QuestionStatementProps {
  question: Question;
  isFlagged: boolean;
  onToggleFlag: (e: React.MouseEvent) => void;
  sharedImageSrc?: string;
  onOpenImageModal: (src: string, alt: string) => void;
}

export function QuestionStatement({
  question,
  isFlagged,
  onToggleFlag,
  sharedImageSrc,
  onOpenImageModal,
}: QuestionStatementProps) {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = (src: string, alt: string) => {
    longPressTimer.current = setTimeout(() => {
      if (window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
      onOpenImageModal(src, alt);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <div className="bg-card text-card-foreground border border-border rounded-sm shadow-md p-5 md:p-8">
      {/* Question Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto justify-between sm:justify-start">
          <span className="inline-flex items-center px-3 md:px-5 py-1.5 md:py-2 bg-muted text-foreground font-bold rounded-sm text-[9px] md:text-[10px] uppercase tracking-[0.2em] border border-border/50">
            Pregunta {question.section_number}
          </span>
          <button
            onClick={onToggleFlag}
            className={`flex items-center gap-2 px-3 md:px-5 py-1.5 md:py-2 rounded-sm text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] transition-all border active:scale-95 ${isFlagged
              ? "bg-destructive text-destructive-foreground border-destructive shadow-sm"
              : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/30"
              }`}
          >
            <Bookmark className={`w-3 md:w-3.5 h-3 md:h-3.5 ${isFlagged ? "fill-current" : ""}`} />
            {isFlagged ? "Marcada" : "Marcar"}
          </button>
        </div>
      </div>

      {/* Statement */}
      {question.statement && (
        <div className="prose dark:prose-invert max-w-none text-lg md:text-2xl leading-[1.6] md:leading-[1.8] text-foreground font-serif">
          <KaTeXText text={question.statement} />
        </div>
      )}

      {/* Shared image */}
      {sharedImageSrc && (
        <div
          className={`rounded-sm border border-border overflow-hidden cursor-zoom-in hover:border-accent transition-colors bg-white shadow-sm ${question.statement ? "mt-6 md:mt-10" : ""}`}
          onDoubleClick={() => onOpenImageModal(sharedImageSrc, "Imagen de apoyo")}
          onTouchStart={() => handleTouchStart(sharedImageSrc, "Imagen de apoyo")}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchEnd}
        >
          <Image
            src={sharedImageSrc}
            alt="Imagen de apoyo"
            width={900}
            height={500}
            className="w-full max-h-[300px] md:max-h-[450px] object-contain pointer-events-none"
          />
        </div>
      )}
    </div>
  );
}
