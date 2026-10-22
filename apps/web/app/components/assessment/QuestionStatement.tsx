"use client";

import { useEffect, useRef, useState } from "react";
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
  const [imageAspect, setImageAspect] = useState<"horizontal" | "vertical" | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Detectar orientación de la imagen compartida
  useEffect(() => {
    if (!sharedImageSrc) {
      return;
    }
    const img = new window.Image();
    img.onload = () => {
      const isHorizontal = img.naturalWidth > img.naturalHeight;
      setImageAspect(isHorizontal ? "horizontal" : "vertical");
    };
    img.src = sharedImageSrc;
  }, [sharedImageSrc]);

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

  // Dividir el texto de la pregunta por el primer ":"
  const hasColon = question.text.includes(":");
  let firstPart: string | null = null;
  let secondPart: string | null = null;
  if (hasColon) {
    const colonIndex = question.text.indexOf(":");
    firstPart = question.text.substring(0, colonIndex + 1); // incluye ":"
    secondPart = question.text.substring(colonIndex + 1);
  }

  // Determinar si debemos usar el layout especial (con ":" y con imagen)
  const useSplitLayout = hasColon && !!sharedImageSrc;

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

      {/* Contenido de la pregunta con layout dinámico */}
      {useSplitLayout ? (
        // Layout especial: dividido por ":" + imagen según orientación
        <div className="space-y-6 md:space-y-10">
          {/* Primera parte (antes del ":") */}
          <div className="prose dark:prose-invert max-w-none text-lg md:text-2xl leading-[1.6] md:leading-[1.8] text-foreground font-serif">
            <KaTeXText text={firstPart!} />
          </div>

          {/* Contenedor para imagen + posible primera parte (si la imagen es vertical) */}
          {imageAspect === "vertical" && (
            <div className="flex flex-col sm:flex-row gap-6 md:gap-10 items-start">
              <div className="flex-1" /> {/* Espacio para mantener flujo, opcional */}
              <div className="flex-shrink-0 sm:w-1/2">
                <div
                  className="rounded-sm border border-border overflow-hidden cursor-zoom-in hover:border-accent transition-colors bg-white shadow-sm"
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
              </div>
            </div>
          )}

          {imageAspect === "horizontal" && (
            <div
              className="rounded-sm border border-border overflow-hidden cursor-zoom-in hover:border-accent transition-colors bg-white shadow-sm"
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

          {/* Segunda parte (después del ":") */}
          <div className="prose dark:prose-invert max-w-none text-lg md:text-2xl leading-[1.6] md:leading-[1.8] text-foreground font-serif">
            <KaTeXText text={secondPart!} />
          </div>
        </div>
      ) : (
        // Layout original (sin ":" o sin imagen)
        <div className={question.shared_image ? "grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-14 mb-6 md:mb-10" : ""}>
          {/* Imagen compartida (layout original) */}
          {question.shared_image && sharedImageSrc && (
            <div
              className="rounded-sm border border-border overflow-hidden cursor-zoom-in hover:border-accent transition-colors bg-white flex items-center justify-center lg:sticky lg:top-4 shadow-sm"
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

          {/* Texto de la pregunta (original) */}
          <div className="prose dark:prose-invert max-w-none text-lg md:text-2xl leading-[1.6] md:leading-[1.8] text-foreground font-serif">
            <KaTeXText text={question.text} />
          </div>
        </div>
      )}
    </div>
  );
}
