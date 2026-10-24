"use client";

import { createContext, useContext, useEffect, useState } from "react";

// Available font scale steps. The active step is applied to the `--font-scale`
// custom property, which scales the root font size. Because Tailwind text
// utilities use rem units, every rem-based size scales system-wide at once.
// The current size is the smallest step; two larger steps are provided, and the
// default is the middle step.
const FONT_SCALE_STEPS = [1, 1.125, 1.25] as const;

const DEFAULT_SCALE_INDEX = 1;
const STORAGE_KEY = "bxm-pilot-font-scale";

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
  const [scaleIndex, setScaleIndex] = useState(DEFAULT_SCALE_INDEX);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = Number.parseInt(saved, 10);
      if (Number.isInteger(parsed) && parsed >= 0 && parsed < FONT_SCALE_STEPS.length) {
        setTimeout(() => setScaleIndex(parsed), 0);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, scaleIndex.toString());
    document.documentElement.style.setProperty("--font-scale", String(FONT_SCALE_STEPS[scaleIndex]));
  }, [scaleIndex]);

  const increase = () => setScaleIndex((i) => Math.min(i + 1, FONT_SCALE_STEPS.length - 1));
  const decrease = () => setScaleIndex((i) => Math.max(i - 1, 0));
  const reset = () => setScaleIndex(DEFAULT_SCALE_INDEX);

  return (
    <FontScaleContext.Provider
      value={{
        scale: FONT_SCALE_STEPS[scaleIndex],
        scaleIndex,
        steps: FONT_SCALE_STEPS,
        setScaleIndex,
        increase,
        decrease,
        reset,
      }}
    >
      {children}
    </FontScaleContext.Provider>
  );
}

export function useFontScale() {
  const context = useContext(FontScaleContext);
  if (context === undefined) {
    throw new Error("useFontScale must be used within a FontScaleProvider");
  }
  return context;
}
