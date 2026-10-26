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
  /** Wraps the statement text so the layout can measure its natural height. */
  textRef?: React.RefObject<HTMLDivElement | null>;
  split?: boolean;
}

export function QuestionStatement({
  question,
  sharedImageSrc,
  onOpenImageModal,
  graphMaxHeight,
  graphWrapperRef,
  textRef,
  split,
}: QuestionStatementProps) {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const graphDimensions = getGraphDimensions(sharedImageSrc);
  const useSplit = Boolean(split && question.statement && sharedImageSrc);

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
      <div className={useSplit ? "flex flex-col md:flex-row gap-6 md:gap-10" : undefined}>
        {/* Statement */}
        {question.statement && (
          <div
            ref={textRef}
            className={`prose dark:prose-invert max-w-none text-base md:text-lg leading-[1.6] md:leading-[1.8] text-foreground font-serif ${useSplit ? "md:flex-1 min-w-0 md:self-start" : ""}`}
          >
            <KaTeXText text={question.statement} />
          </div>
        )}

        {/* Shared image */}
        {sharedImageSrc && (
          <div className={useSplit ? "md:flex-1 min-w-0 flex items-center justify-center" : ""}>
            <div
              ref={graphWrapperRef}
              className={`w-fit max-w-full rounded-sm border border-border overflow-hidden cursor-zoom-in hover:border-accent transition-colors bg-white shadow-sm ${!useSplit && question.statement ? "mt-6 md:mt-10" : ""}`}
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
                className="graph-image block w-auto h-auto max-w-full max-h-[300px] md:max-h-[450px] object-contain pointer-events-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
