"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

// Font size has one mechanism. The active step is written to the `--font-scale`
// custom property on <html>, and every scalable area opts in with the
// `.font-scaled` class (see globals.css), which applies it as a CSS `zoom`.
// Text, spacing, icons and images therefore grow together, and the question
// layout engine (measured in the zoomed element's own pixels) re-plans for the
// smaller container without knowing anything about the scale itself.
//
// The current size is the smallest step; two larger steps are provided, and the
// default is the middle step.
export const FONT_SCALE_STEPS = [1, 1.125, 1.25] as const;

export const DEFAULT_SCALE_INDEX = 1;
export const FONT_SCALE_STORAGE_KEY = "bxm-pilot-font-scale";

/** Runs in <head> before first paint so a saved size never flashes the default
 *  and the layout is planned once, at the right size. */
export const FONT_SCALE_INIT_SCRIPT = `try{var i=parseInt(localStorage.getItem(${JSON.stringify(
  FONT_SCALE_STORAGE_KEY,
)}),10),s=${JSON.stringify(FONT_SCALE_STEPS)};if(i>=0&&i<s.length)document.documentElement.style.setProperty("--font-scale",String(s[i]))}catch(e){}`;

function parseIndex(raw: string | null): number | null {
  if (raw === null) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed >= 0 && parsed < FONT_SCALE_STEPS.length ? parsed : null;
}

// localStorage as an external store: the server and the first client render use
// the default step, then React switches to the saved one without an effect that
// sets state (and without writing the default over the saved value first).
const listeners = new Set<() => void>();

function readIndex(): number {
  try {
    return parseIndex(window.localStorage.getItem(FONT_SCALE_STORAGE_KEY)) ?? DEFAULT_SCALE_INDEX;
  } catch {
    return DEFAULT_SCALE_INDEX;
  }
}

function applyScale(index: number) {
  document.documentElement.style.setProperty("--font-scale", String(FONT_SCALE_STEPS[index]));
}

function writeIndex(index: number) {
  // Applied synchronously so the zoom changes in the same frame as the click.
  applyScale(index);
  try {
    window.localStorage.setItem(FONT_SCALE_STORAGE_KEY, String(index));
  } catch {
    // Private mode or storage disabled: the size just does not persist.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

interface FontScaleContextValue {
  scale: number;
  scaleIndex: number;
  steps: readonly number[];
  setScaleIndex: (index: number) => void;
  increase: () => void;
  decrease: () => void;
  reset: () => void;
}

const FontScaleContext = createContext<FontScaleContextValue | undefined>(undefined);

export function FontScaleProvider({ children }: { children: React.ReactNode }) {
  const scaleIndex = useSyncExternalStore(subscribe, readIndex, () => DEFAULT_SCALE_INDEX);

  useEffect(() => {
    applyScale(scaleIndex);
  }, [scaleIndex]);

  const setScaleIndex = useCallback((index: number) => {
    writeIndex(Math.min(Math.max(index, 0), FONT_SCALE_STEPS.length - 1));
  }, []);
  const increase = useCallback(() => writeIndex(Math.min(readIndex() + 1, FONT_SCALE_STEPS.length - 1)), []);
  const decrease = useCallback(() => writeIndex(Math.max(readIndex() - 1, 0)), []);
  const reset = useCallback(() => writeIndex(DEFAULT_SCALE_INDEX), []);

  const value = useMemo<FontScaleContextValue>(
    () => ({
      scale: FONT_SCALE_STEPS[scaleIndex],
      scaleIndex,
      steps: FONT_SCALE_STEPS,
      setScaleIndex,
      increase,
      decrease,
      reset,
    }),
    [scaleIndex, setScaleIndex, increase, decrease, reset],
  );

  return <FontScaleContext.Provider value={value}>{children}</FontScaleContext.Provider>;
}

export function useFontScale() {
  const context = useContext(FontScaleContext);
  if (context === undefined) {
    throw new Error("useFontScale must be used within a FontScaleProvider");
  }
  return context;
}
