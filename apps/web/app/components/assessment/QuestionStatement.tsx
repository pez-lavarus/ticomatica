"use client";

import { useRef } from "react";
import Image from "next/image";
import { KaTeXText } from "@/lib/katex-utils";
import { getGraphDimensions } from "@/lib/graph-aspects";
import type { Question } from "@/lib/types";
import { QuestionPanel } from "./QuestionPanel";
import type { PanelSlot } from "./QuestionPanel";

interface QuestionStatementProps {
  question: Question;
  sharedImageSrc?: string;
  onOpenImageModal: (src: string, alt: string) => void;
  /** Placement and measuring hooks from `useQuestionLayout`. */
  slot: PanelSlot;
  /** Text beside the graph instead of above it. */
  split?: boolean;
  /** Max graph height chosen by the layout (px); null keeps the CSS default. */
  graphMax?: number | null;
}

export function QuestionStatement({
  question,
  sharedImageSrc,
  onOpenImageModal,
  slot,
  split,
  graphMax,
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
    <QuestionPanel
      id="statement"
      slot={slot}
      contentKey={question.original_number}
      split={split}
      graphMax={graphMax}
      className="panel-enter"
    >
      {/* `group-data-[split=true]` reads the data-split attribute on the panel
          content, which is how the layout switches this arrangement. */}
      <div className="p-5 md:p-6 flex flex-col gap-5 md:gap-6 group-data-[split=true]:flex-row group-data-[split=true]:items-center">
        {/* The text keeps a readable measure however wide the panel gets, so
            a wide graph can use the extra width without stretching the lines. */}
        {question.statement && (
          <div className="prose dark:prose-invert w-full max-w-[72ch] mx-auto text-base md:text-lg leading-[1.6] md:leading-[1.8] text-foreground font-serif min-w-0 group-data-[split=true]:flex-1 group-data-[split=true]:max-w-none group-data-[split=true]:mx-0">
            <KaTeXText text={question.statement} />
          </div>
        )}

        {/* Shared image */}
        {sharedImageSrc && (
          <div className="min-w-0 flex justify-center group-data-[split=true]:flex-1">
            <div
              className="w-fit max-w-full rounded-sm border border-border overflow-hidden cursor-zoom-in hover:border-accent transition-colors bg-white shadow-sm"
              onDoubleClick={() => onOpenImageModal(sharedImageSrc, "Imagen de apoyo")}
              onTouchStart={() => handleTouchStart(sharedImageSrc, "Imagen de apoyo")}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchEnd}
            >
              <Image
                src={sharedImageSrc}
                alt="Imagen de apoyo"
                width={graphDimensions?.width ?? 800}
                height={graphDimensions?.height ?? 600}
                className="graph-image block w-auto h-auto max-w-full max-h-[var(--graph-max,450px)] object-contain pointer-events-none"
              />
            </div>
          </div>
        )}
      </div>
    </QuestionPanel>
  );
}
