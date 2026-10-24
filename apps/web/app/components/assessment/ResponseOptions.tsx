"use client";

import { useRef } from "react";
import Image from "next/image";
import { KaTeXText } from "@/lib/katex-utils";
import { getGraphDimensions } from "@/lib/graph-aspects";
import type { Question } from "@/lib/types";

interface ResponseOptionsProps {
  question: Question;
  selectedAnswer?: string;
  onSelect: (option: string) => void;
  onOpenImageModal: (src: string, alt: string) => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  useGrid?: boolean;
}

export function ResponseOptions({
  question,
  selectedAnswer,
  onSelect,
  onOpenImageModal,
  scrollRef,
  useGrid,
}: ResponseOptionsProps) {
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
    <div className="bg-card text-card-foreground border border-border rounded-sm shadow-md p-5 md:p-8 flex flex-col h-full">
      {/* Statement container */}
      {question.problem && (
        <div className="prose dark:prose-invert max-w-none text-lg md:text-2xl leading-[1.6] md:leading-[1.8] text-foreground font-serif mb-6 md:mb-10 shrink-0">
          <KaTeXText text={question.problem} />
        </div>
      )}

      {/* Options container */}
      <div
        ref={scrollRef}
        className={`flex-1 min-h-0 overflow-y-auto hide-scrollbar ${useGrid ? "grid grid-cols-2 gap-3 md:gap-6 content-start" : "space-y-3 md:space-y-6"}`}
      >
        {question.options.map((option) => {
          const isSelected = selectedAnswer === option.label;
          const optionImageDimensions = option.image ? getGraphDimensions(option.image) : null;
          return (
            <button
              key={option.label}
              onClick={() => onSelect(option.label)}
              className={`w-full flex gap-4 md:gap-9 p-3 md:p-5 rounded-sm border-2 text-left transition-all group active:scale-[0.98] ${isSelected
                ? "border-primary bg-muted/40 shadow-sm"
                : "border-border/60 hover:border-accent bg-card"
                }`}
            >
              <div
                className={`w-7 h-7 md:w-9 md:h-9 flex-shrink-0 flex items-center justify-center rounded-sm font-bold text-base md:text-lg border-2 transition-colors ${isSelected
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border/60 group-hover:border-accent"
                  }`}
              >
                {option.label}
              </div>

              <div className="flex-1 min-w-0 pt-0.5 md:pt-1">
                {option.image ? (
                  <div
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      onOpenImageModal(option.image!, `Opción ${option.label}`);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      handleTouchStart(option.image!, `Opción ${option.label}`);
                    }}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchEnd}
                  >
                    <Image
                      src={option.image}
                      alt={`Opción ${option.label}`}
                      width={optionImageDimensions?.width ?? 340}
                      height={optionImageDimensions?.height ?? 200}
                      className="block w-auto h-auto max-w-full max-h-[360px] mx-auto rounded-sm border border-border cursor-zoom-in hover:opacity-90 transition-opacity object-contain bg-white pointer-events-none"
                    />
                  </div>
                ) : (
                  <div className="option-math text-xl md:text-2xl text-foreground font-serif">
                    <KaTeXText text={option.text || ""} />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
