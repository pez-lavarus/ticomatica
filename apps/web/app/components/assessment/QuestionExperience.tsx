"use client";

import { memo, useRef, useState, useEffect } from "react";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import Image from "next/image";
import { KaTeXText } from "@/lib/katex-utils";
import type { Question, TestMode } from "@/lib/types";
import { FULL_TEST_TOPICS } from "@/lib/constants";

interface QuestionExperienceProps {
  // Data
  question: Question;
  currentIndex: number;
  sectionQuestions: { globalIndex: number; section_number: number }[];
  testMode: TestMode;
  currentTopicIndex: number;

  // State
  selectedAnswer?: string;
  isFlagged: boolean;
  selectedAnswers: Record<number, string>;
  flaggedQuestions: Record<number, boolean>;

  // Actions
  onSelect: (option: string) => void;
  onToggleFlag: (e: React.MouseEvent) => void;
  onNext: () => void;
  onPrev: () => void;
  onJumpToQuestion: (index: number) => void;
  onJumpToSection: (index: number) => void;
  onOpenImageModal: (src: string, alt: string) => void;

  // Navigation State
  isLastQuestionInSection: boolean;
  hasMoreSections: boolean;
  sharedImageSrc?: string;
}

export const QuestionExperience = memo(function QuestionExperience({
  question,
  currentIndex,
  sectionQuestions,
  testMode,
  currentTopicIndex,
  selectedAnswer,
  isFlagged,
  selectedAnswers,
  flaggedQuestions,
  onSelect,
  onToggleFlag,
  onNext,
  onPrev,
  onJumpToQuestion,
  onJumpToSection,
  onOpenImageModal,
  isLastQuestionInSection,
  hasMoreSections,
  sharedImageSrc,
}: QuestionExperienceProps) {
  const [isNavigatorExpanded, setIsNavigatorExpanded] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const autoNextTimer = useRef<NodeJS.Timeout | null>(null);
  const [imageAspect, setImageAspect] = useState<"horizontal" | "vertical" | null>(null);

  // Detectar orientación de la imagen compartida
  useEffect(() => {
    if (!sharedImageSrc) {
      setImageAspect(null);
      return;
    }
    const img = new window.Image();
    img.onload = () => {
      const isHorizontal = img.naturalWidth > img.naturalHeight;
      setImageAspect(isHorizontal ? "horizontal" : "vertical");
    };
    img.src = sharedImageSrc;
  }, [sharedImageSrc]);

  const handleSelect = (label: string) => {
    onSelect(label);
    if (autoNextTimer.current) {
      clearTimeout(autoNextTimer.current);
    }
    autoNextTimer.current = setTimeout(() => {
      onNext();
      autoNextTimer.current = null;
    }, 300);
  };

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

  const sectionIndex = sectionQuestions.findIndex(q => q.globalIndex === currentIndex);
  const currentSectionNumber = sectionIndex + 1;
  const totalInSection = sectionQuestions.length;

  const hasImageOptions = question.options.some((opt) => opt.image);
  const isShortTextOptions = !hasImageOptions && question.options.every(
    (opt) => opt.text && opt.text.length < 50
  );
  const useGridLayout = hasImageOptions || isShortTextOptions;

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
    <div className="flex flex-col gap-6 lg:gap-10">
      {/* Main Container */}
      <div className="grid grid-cols-12 gap-6 lg:gap-10">

        {/* Left/Main Column: Question Content */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4 md:gap-6">
          <div className="bg-card text-card-foreground border border-border rounded-sm shadow-md p-5 md:p-14">

            {/* Question Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-14">
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
                    <div className="flex-shrink-0 sm:w-1/2 lg:w-2/5">
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

            {/* Options (sin cambios) */}
            <div className={`mt-8 md:mt-16 ${useGridLayout ? "grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6" : "space-y-3 md:space-y-6"}`}>
              {question.options.map((option) => {
                const isSelected = selectedAnswer === option.label;
                return (
                  <button
                    key={option.label}
                    onClick={() => handleSelect(option.label)}
                    className={`w-full flex gap-4 md:gap-8 ${useGridLayout ? "p-4 md:p-8" : "p-4 md:p-10"} rounded-sm border-2 text-left transition-all group active:scale-[0.98] ${isSelected
                      ? "border-primary bg-muted/40 shadow-sm"
                      : "border-border/60 hover:border-accent bg-card"
                      }`}
                  >
                    <div
                      className={`w-8 h-8 md:w-12 md:h-12 flex-shrink-0 flex items-center justify-center rounded-sm font-bold text-lg md:text-2xl border-2 transition-colors ${isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border/60 group-hover:border-accent"
                        }`}
                    >
                      {option.label}
                    </div>

                    <div className="flex-1 pt-0.5 md:pt-1">
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
                            width={340}
                            height={200}
                            className="rounded-sm border border-border cursor-zoom-in hover:opacity-90 transition-opacity max-h-[180px] w-full object-contain bg-white pointer-events-none"
                          />
                        </div>
                      ) : (
                        <div className="text-lg text-foreground font-serif">
                          <KaTeXText text={option.text || ""} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Nav for Mobile / Desktop Bottom (sin cambios) */}
          <div className="lg:hidden">
            <div className="bg-card border border-border rounded-sm shadow-lg p-4">
              {!isNavigatorExpanded ? (
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={onPrev}
                    disabled={currentIndex === sectionQuestions[0]?.globalIndex}
                    className="w-12 h-12 flex items-center justify-center border border-border rounded-sm disabled:opacity-30 hover:bg-muted/30 transition-colors active:bg-muted"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <button
                    onClick={() => setIsNavigatorExpanded(true)}
                    className="flex-1 h-12 flex items-center justify-center gap-2 bg-muted/50 border border-border rounded-sm active:bg-muted transition-colors"
                  >
                    <LayoutGrid className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      ({currentSectionNumber}/{totalInSection})
                    </span>
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  </button>

                  <button
                    onClick={onNext}
                    className={`w-12 h-12 flex items-center justify-center rounded-sm transition-all active:scale-95 ${isLastQuestionInSection && (!hasMoreSections || testMode !== "full")
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "border border-border active:bg-muted"
                      }`}
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              ) : (
                <div className="space-y-6 py-2">
                  <div className="flex items-center justify-between">
                    <h3 className="uppercase tracking-[0.2em] text-[10px] font-bold text-muted-foreground">
                      Navegador de Ítems
                    </h3>
                    <button
                      onClick={() => setIsNavigatorExpanded(false)}
                      className="p-2 hover:bg-muted rounded-sm transition-colors"
                    >
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="grid grid-cols-6 xs:grid-cols-8 gap-2">
                    {sectionQuestions.map((q) => (
                      <button
                        key={q.globalIndex}
                        onClick={() => {
                          onJumpToQuestion(q.globalIndex);
                          setIsNavigatorExpanded(false);
                        }}
                        className={`relative aspect-square flex items-center justify-center text-xs font-bold rounded-sm border transition-all active:scale-90 ${q.globalIndex === currentIndex
                          ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20"
                          : selectedAnswers[q.globalIndex]
                            ? "bg-success/15 border-success/40 text-foreground"
                            : "bg-card border-border/60 text-foreground"
                          }`}
                      >
                        {q.section_number}
                        {flaggedQuestions[q.globalIndex] && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full border border-card" />
                        )}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setIsNavigatorExpanded(false)}
                    className="w-full py-4 bg-muted text-foreground text-[10px] font-bold uppercase tracking-widest rounded-sm border border-border active:bg-muted/80 transition-colors"
                  >
                    Cerrar Panel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Desktop Navigator (sin cambios) */}
        <div className="hidden lg:block lg:col-span-4">
          <div className="bg-card text-card-foreground border border-border rounded-sm shadow-md p-8 lg:sticky lg:top-32">
            {testMode === "full" && (
              <div className="flex gap-2 mb-8 overflow-x-auto pb-2 hide-scrollbar">
                {FULL_TEST_TOPICS.map((topic, idx) => (
                  <button
                    key={topic}
                    onClick={() => onJumpToSection(idx)}
                    className={`flex-1 min-w-[70px] transition-opacity ${idx !== currentTopicIndex ? "opacity-30 hover:opacity-100" : ""}`}
                  >
                    <div
                      className={`h-1 transition-colors ${idx === currentTopicIndex
                        ? "bg-primary"
                        : idx < currentTopicIndex
                          ? "bg-success"
                          : "bg-muted"
                        }`}
                    />
                    <p className={`text-[8px] font-bold text-center mt-2 tracking-[0.1em] uppercase ${idx === currentTopicIndex ? "text-foreground" : "text-muted-foreground"
                      }`}>
                      {topic.split(" ")[0]}
                    </p>
                  </button>
                ))}
              </div>
            )}

            <div className="grid lg:grid-cols-5 gap-2 mb-10">
              {sectionQuestions.map((q) => (
                <button
                  key={q.globalIndex}
                  onClick={() => onJumpToQuestion(q.globalIndex)}
                  className={`relative aspect-square flex items-center justify-center text-xs font-bold rounded-sm border transition-colors ${q.globalIndex === currentIndex
                    ? "bg-primary text-primary-foreground border-primary shadow-sm z-10 scale-105"
                    : selectedAnswers[q.globalIndex]
                      ? "bg-success/15 border-success/40 text-foreground"
                      : "bg-card border-border/60 hover:border-accent text-foreground"
                    }`}
                >
                  {q.section_number}
                  {flaggedQuestions[q.globalIndex] && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full border border-card" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <button
                  onClick={onPrev}
                  disabled={currentIndex === sectionQuestions[0]?.globalIndex}
                  className="flex-1 flex items-center justify-center gap-2 py-4 border border-border bg-card rounded-sm font-bold text-[10px] uppercase tracking-[0.15em] disabled:opacity-30 hover:bg-muted/30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>

                <button
                  onClick={onNext}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground rounded-sm font-bold text-[10px] uppercase tracking-[0.15em] transition-colors hover:brightness-90 shadow-sm"
                >
                  {isLastQuestionInSection ? (
                    testMode === "full" && hasMoreSections ? (
                      <>Sección <ChevronRight className="w-4 h-4" /></>
                    ) : (
                      <>Finalizar</>
                    )
                  ) : (
                    <>Siguiente <ChevronRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});