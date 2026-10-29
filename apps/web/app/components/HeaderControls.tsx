"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFontScale } from "@/lib/font-scale";

// Every control that the test screen puts in the header is built from the
// pieces in this file, so they share one height, one surface and one icon size
// at each breakpoint. Change the sizes here and the whole bar follows.

/** One height for every control, text or icon. Compact below `md`. */
const CONTROL_HEIGHT = "h-8 md:h-14";
const CONTROL_SQUARE = `${CONTROL_HEIGHT} w-8 md:w-14`;
const CONTROL_SURFACE = "bg-card rounded-sm border border-border shadow-sm";
const CONTROL_LABEL = "text-xs font-bold uppercase tracking-[0.15em] md:tracking-[0.2em]";

const ICON_SIZES = {
  md: "[&_svg]:w-4 [&_svg]:h-4 md:[&_svg]:w-5 md:[&_svg]:h-5",
  lg: "[&_svg]:w-4 [&_svg]:h-4 md:[&_svg]:w-7 md:[&_svg]:h-7",
} as const;

interface HeaderIconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
  /** Accessible name and tooltip. */
  label: string;
  /** Extra tooltip text that does not belong in the accessible name. */
  hint?: string;
  /** `lg` is for the status icon (current section); everything else is `md`. */
  iconSize?: keyof typeof ICON_SIZES;
  children: ReactNode;
}

export function HeaderIconButton({
  label,
  hint,
  iconSize = "md",
  className = "",
  children,
  ...props
}: HeaderIconButtonProps) {
  return (
    <button
      type="button"
      title={hint ? `${label} (${hint})` : label}
      aria-label={label}
      className={`flex items-center justify-center shrink-0 ${CONTROL_SQUARE} ${CONTROL_SURFACE} ${ICON_SIZES[iconSize]} hover:bg-muted transition-colors disabled:opacity-30 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

interface HeaderTextButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
  label: string;
  icon: ReactNode;
  /** `primary` is the call to action; `muted` is a secondary tool. */
  tone?: "primary" | "muted";
}

export function HeaderTextButton({ label, icon, tone = "muted", className = "", ...props }: HeaderTextButtonProps) {
  const tones =
    tone === "primary"
      ? "bg-primary text-primary-foreground shadow-md hover:brightness-90"
      : "bg-muted text-foreground border border-border hover:border-accent";
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`group flex items-center justify-center gap-2 md:gap-3 shrink-0 ${CONTROL_HEIGHT} px-2.5 md:px-8 rounded-sm transition-colors ${CONTROL_LABEL} ${ICON_SIZES.md} [&_svg]:shrink-0 ${tones} ${className}`}
      {...props}
    >
      {icon}
      {/* Both labelled buttons switch to icon-only at the same breakpoint. */}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

/** A read-only value (the timer) with the same height as the buttons. */
export function HeaderReadout({ children }: { children: ReactNode }) {
  return (
    <div className={`flex items-center justify-center shrink-0 px-2 md:px-8 ${CONTROL_HEIGHT} ${CONTROL_SURFACE}`}>
      {children}
    </div>
  );
}

/**
 * Text size: two identical square buttons, one "A" glyph at the same size in
 * both with only the sign changing, so neither looks more important than the
 * other. The tooltip reports the current size.
 */
export function FontScaleControl() {
  const { increase, decrease, scale, scaleIndex, steps } = useFontScale();
  const percent = `${Math.round(scale * 100)}%`;

  const glyph = (sign: string) => (
    <span aria-hidden className="flex items-start font-bold leading-none text-foreground text-sm md:text-xl">
      A<span className="text-[0.6em] leading-none mt-px md:mt-0.5">{sign}</span>
    </span>
  );

  return (
    <div role="group" aria-label="Tamaño de texto" className="flex items-center gap-1 md:gap-2">
      <HeaderIconButton
        label="Reducir tamaño de texto"
        hint={percent}
        onClick={decrease}
        disabled={scaleIndex === 0}
      >
        {glyph("−")}
      </HeaderIconButton>
      <HeaderIconButton
        label="Aumentar tamaño de texto"
        hint={percent}
        onClick={increase}
        disabled={scaleIndex === steps.length - 1}
      >
        {glyph("+")}
      </HeaderIconButton>
    </div>
  );
}
