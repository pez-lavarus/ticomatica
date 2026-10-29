"use client";

import type { CSSProperties, ReactNode } from "react";
import type { PanelId, Rect } from "@/lib/question-layout-plan";

/** What `useQuestionLayout` hands each panel: where to put it and how. */
export interface PanelSlot {
  /** Registers the panel's content element so the layout can measure it. */
  register: (el: HTMLElement | null) => void;
  /** Placement decided by the layout engine; null until the first plan. */
  rect: Rect | null;
  /** Animate to `rect`. False while the panel is being placed for the first time. */
  animate: boolean;
}

interface QuestionPanelProps {
  id: PanelId;
  slot: PanelSlot;
  /** Remounting the content when this changes replays the fade-in. */
  contentKey?: string | number;
  /** Statement panel: text beside the graph. */
  split?: boolean;
  /** Options panel: number of columns. */
  columns?: 1 | 2;
  /** Statement panel: max graph height chosen by the layout (px). */
  graphMax?: number | null;
  className?: string;
  children: ReactNode;
}

/**
 * The card that every question panel renders in.
 *
 * Two elements, on purpose:
 *  - the frame (`section`) is the card. Its position and size come from the
 *    layout plan and are animated with CSS transitions.
 *  - the content hangs from the frame's top-left corner at its natural height
 *    and is clipped by the frame. Because it is out of flow, the layout can
 *    measure it at any width without disturbing the animation in progress.
 *
 * `data-split`, `data-columns` and `--graph-max` are how a panel's internal
 * arrangement is switched; the layout probes candidates by setting the same
 * attributes on the content element (see `useQuestionLayout`).
 */
export function QuestionPanel({
  id,
  slot,
  contentKey,
  split,
  columns,
  graphMax,
  className = "",
  children,
}: QuestionPanelProps) {
  const { rect, animate, register } = slot;

  const frameStyle: CSSProperties | undefined = rect
    ? {
        position: "absolute",
        left: 0,
        top: 0,
        width: rect.width,
        height: rect.height,
        transform: `translate3d(${rect.x}px, ${rect.y}px, 0)`,
      }
    : undefined;

  const contentStyle = (
    graphMax ? { "--graph-max": `${graphMax}px` } : undefined
  ) as CSSProperties | undefined;

  return (
    <section
      data-panel={id}
      data-animate={animate ? "true" : "false"}
      className={`question-panel ${rect ? "" : "relative"} bg-card text-card-foreground border border-border rounded-sm shadow-md overflow-hidden`}
      style={frameStyle}
    >
      <div
        key={contentKey}
        ref={register}
        data-split={split === undefined ? undefined : split ? "true" : "false"}
        data-columns={columns}
        style={contentStyle}
        className={`group question-panel-content ${rect ? "absolute left-0 top-0 w-full" : ""} ${className}`}
      >
        {children}
      </div>
    </section>
  );
}
