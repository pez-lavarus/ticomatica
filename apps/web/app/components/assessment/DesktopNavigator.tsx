"use client";

import { memo, useCallback, useLayoutEffect, useRef, useState } from "react";
import { BarChart3 } from "lucide-react";
import type { TestMode } from "@/lib/types";

const ANSWER_LETTERS = ["A", "B", "C", "D"];

interface NavigatorQuestion {
  globalIndex: number;
  section_number: number;
}

interface NavigatorSection {
  topic: string;
  questions: NavigatorQuestion[];
}

interface DesktopNavigatorProps {
  testMode: TestMode;
  sections: NavigatorSection[];
  currentTopicIndex: number;
  currentIndex: number;
  selectedAnswers: Record<number, string>;
  expiredQuestions?: Record<number, boolean>;
  correctAnswers: Record<number, string>;
  flaggedQuestions: Record<number, boolean>;
  /** Review: show correct/incorrect coloring and no "current" highlight. */
  reviewMode?: boolean;
  onResults?: () => void;
  onJumpToQuestion: (index: number) => void;
} 

export const DesktopNavigator = memo(function DesktopNavigator({
  testMode,
  sections,
  currentTopicIndex,
  currentIndex,
  selectedAnswers,
  expiredQuestions,
  correctAnswers,
  flaggedQuestions,
  reviewMode,
  onResults,
  onJumpToQuestion,
}: DesktopNavigatorProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const previousAnswers = useRef(selectedAnswers);
  const pendingNext = useRef<number | null>(null);
  const [dock, setDock] = useState<"top" | "bottom" | null>(null);
  const activeSection = sections.find((section) => section.questions.some((q) => q.globalIndex === currentIndex));
  const activeQuestion = activeSection?.questions.find((q) => q.globalIndex === currentIndex);

  const applyPendingScroll = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !scroller.clientHeight || pendingNext.current === null || reviewMode) return;
    const next = scroller.querySelector<HTMLElement>(`[data-question-index="${pendingNext.current}"]`);
    if (!next) { pendingNext.current = null; return; }
    const current = scroller.querySelector<HTMLElement>(`[data-question-index="${currentIndex}"]`);
    const header = current?.closest("[data-section]")?.querySelector<HTMLElement>("[data-section-header]");
    const reserved = (header?.offsetHeight ?? 0) + (current?.offsetHeight ?? 0) + 8;
    const top = Math.max(0, scroller.scrollTop + next.getBoundingClientRect().top
      - scroller.getBoundingClientRect().top - reserved);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    scroller.scrollTo?.({ top, behavior: reducedMotion ? "auto" : "smooth" });
    pendingNext.current = null;
  }, [currentIndex, reviewMode]);

  useLayoutEffect(() => {
    const before = previousAnswers.current;
    previousAnswers.current = selectedAnswers;
    if (reviewMode || Object.keys(selectedAnswers).length < Object.keys(before).length) {
      pendingNext.current = null;
      return;
    }
    const changed = Object.keys(selectedAnswers).find((key) => selectedAnswers[Number(key)] !== before[Number(key)])
      ?? (before !== selectedAnswers && selectedAnswers[currentIndex] ? String(currentIndex) : undefined);
    if (changed === undefined) return;
    const questions = sections.flatMap((section) => section.questions);
    const answered = questions.findIndex((q) => q.globalIndex === Number(changed));
    pendingNext.current = answered >= 0 ? questions[answered + 1]?.globalIndex ?? null : null;
    applyPendingScroll();
  }, [selectedAnswers, currentIndex, sections, reviewMode, applyPendingScroll]);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let frame = 0;
    const measure = () => {
      applyPendingScroll();
      const row = scroller.querySelector<HTMLElement>(`[data-question-index="${currentIndex}"]`);
      if (!row || !scroller.clientHeight) { setDock(null); return; }
      const viewport = scroller.getBoundingClientRect();
      const bounds = row.getBoundingClientRect();
      const header = row.closest("[data-section]")?.querySelector<HTMLElement>("[data-section-header]");
      const edge = bounds.top < viewport.top + (header?.offsetHeight ?? 0) ? "top"
        : bounds.bottom > viewport.bottom ? "bottom" : null;
      setDock((current) => current === edge ? current : edge);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    scroller.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    observer?.observe(scroller);
    const row = scroller.querySelector<HTMLElement>(`[data-question-index="${currentIndex}"]`);
    if (row) observer?.observe(row);
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer?.disconnect();
    };
  }, [currentIndex, sections, applyPendingScroll]);

  const renderQuestion = (q: NavigatorQuestion, docked = false) => {
    const isCurrent = q.globalIndex === currentIndex;
    const isFlaggedQ = flaggedQuestions[q.globalIndex];
    const isExpired = Boolean(expiredQuestions?.[q.globalIndex]);
    const isAnswered = Boolean(selectedAnswers[q.globalIndex]) || isExpired;
    const showCorrectness = testMode !== "full" || reviewMode;
    const selectedLetter = selectedAnswers[q.globalIndex];
    const isCorrect = isAnswered && !isExpired && selectedLetter === correctAnswers[q.globalIndex];
    return (
      <button
        key={q.globalIndex}
        data-question-index={docked ? undefined : q.globalIndex}
        aria-current={isCurrent ? "step" : undefined}
        title={isExpired ? "Tiempo agotado: incorrecta y bloqueada" : undefined}
        aria-hidden={isCurrent && dock && !docked ? true : undefined}
        tabIndex={isCurrent && dock && !docked ? -1 : undefined}
        onClick={() => onJumpToQuestion(q.globalIndex)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-3 rounded-sm border transition-colors ${isCurrent
          ? "border-primary bg-primary/10"
          : "border-transparent hover:border-accent"
          }`}
      >
        <span className={`text-base font-bold tabular-nums ${isCurrent ? "text-primary" : "text-foreground"}`}>
          {q.section_number}
          {isExpired && <span className="sr-only"> Tiempo agotado: incorrecta y bloqueada</span>}
        </span>

        <span className="flex items-center gap-5">
          {ANSWER_LETTERS.map((letter) => {
            const isSelected = selectedLetter === letter;
            const showLetter = isSelected || (reviewMode && isAnswered) || isCurrent;
            const circleClasses = isSelected
              ? (showCorrectness
                ? (isCorrect
                  ? "bg-success text-success-foreground border-success"
                  : "bg-wrong text-wrong-foreground border-wrong")
                : "bg-primary text-primary-foreground border-primary")
              : (reviewMode && !isAnswered
                ? "bg-wrong text-wrong-foreground border-wrong"
                : (isExpired ? "bg-wrong/10 text-wrong border-wrong" : "bg-transparent border-white"));
            return (
              <span
                key={letter}
                className={`w-7 h-7 rounded-full border flex items-center justify-center text-sm font-bold transition-colors opacity-60 ${circleClasses}`}
              >
                {showLetter ? letter : null}
              </span>
            );
          })}
        </span>

        {isFlaggedQ && (
          <span className="w-2 h-2 rounded-full bg-destructive shrink-0" />
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="relative flex-1 min-h-0">
        <div ref={scrollerRef} className="h-full overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden px-4">
          {sections.map((section, sectionIdx) => (
            <div key={section.topic} data-section={section.topic}>
              <div data-section-header className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-card flex items-center gap-2 border-b border-border/50">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${sectionIdx === currentTopicIndex ? "bg-primary" : "bg-muted"}`}
                />
                <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-muted-foreground truncate">
                  {section.topic}
                </h3>
              </div>

              <div className="flex flex-col gap-2 pt-2 pb-5">
                {section.questions.map((q) => renderQuestion(q))}
              </div>
            </div>
          ))}
        </div>

        {dock && activeSection && activeQuestion && (
          <div data-current-dock={dock} aria-label="Pregunta actual" className={`absolute inset-x-0 z-20 px-4 bg-card shadow-md ${dock === "top" ? "top-0 border-b" : "bottom-0 border-t"} border-border`}>
            <div className="py-2 text-sm font-bold uppercase tracking-[0.15em] text-muted-foreground truncate">
              {activeSection.topic}
            </div>
            <div className="pb-2">{renderQuestion(activeQuestion, true)}</div>
          </div>
        )}
      </div>

      {onResults && reviewMode && (
        <div className="shrink-0 p-4 border-t border-border/60 bg-card">
          <button
            onClick={onResults}
            className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-sm border border-border/60 hover:border-accent transition-colors"
          >
            <BarChart3 className="w-4 h-4 text-secondary" />
            <span className="text-base font-bold text-foreground">Resultado</span>
          </button>
        </div>
      )}
    </div>
  );
});
