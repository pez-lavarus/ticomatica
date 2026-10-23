"use client";

import { useRef } from "react";
import Image from "next/image";
import { KaTeXText } from "@/lib/katex-utils";
import { getGraphDimensions } from "@/lib/graph-aspects";
import type { Question } from "@/lib/types";

interface QuestionStatementProps {
  question: Question;
  sharedImageSrc?: string;
  onOpenImageModal: (src: string, alt: string) => void;
  graphMaxHeight?: number;
  graphWrapperRef?: React.RefObject<HTMLDivElement | null>;
}

export function QuestionStatement({
  question,
  sharedImageSrc,
  onOpenImageModal,
  graphMaxHeight,
  graphWrapperRef,
}: QuestionStatementProps) {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const graphDimensions = getGraphDimensions(sharedImageSrc);

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
      {/* Statement */}
      {question.statement && (
        <div className="prose dark:prose-invert max-w-none text-lg md:text-2xl leading-[1.6] md:leading-[1.8] text-foreground font-serif">
          <KaTeXText text={question.statement} />
        </div>
      )}

      {/* Shared image */}
      {sharedImageSrc && (
        <div
          ref={graphWrapperRef}
          className={`w-fit max-w-full mx-auto rounded-sm border border-border overflow-hidden cursor-zoom-in hover:border-accent transition-colors bg-white shadow-sm ${question.statement ? "mt-6 md:mt-10" : ""}`}
          onDoubleClick={() => onOpenImageModal(sharedImageSrc, "Imagen de apoyo")}
          onTouchStart={() => handleTouchStart(sharedImageSrc, "Imagen de apoyo")}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchEnd}
        >
          <Image
            src={sharedImageSrc}
            alt="Imagen de apoyo"
            width={graphDimensions?.width ?? 900}
            height={graphDimensions?.height ?? 500}
            style={graphMaxHeight ? { maxHeight: graphMaxHeight } : undefined}
            className="block w-auto h-auto max-w-full max-h-[300px] md:max-h-[450px] object-contain pointer-events-none"
          />
        </div>
      )}
    </div>
  );
}
