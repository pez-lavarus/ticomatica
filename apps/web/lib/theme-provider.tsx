"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "bxm-pilot-theme";

/** The "system" theme is time-based, not `prefers-color-scheme`. Keep the
 *  init script below in step with this function. */
export function getThemeByHour(): "light" | "dark" {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? "light" : "dark";
}

/** Resolves a stored theme to the concrete `light`/`dark` class to apply. */
export function resolveTheme(theme: Theme | null | undefined): "light" | "dark" {
  if (theme === "light" || theme === "dark") return theme;
  return getThemeByHour();
}

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

/** Runs in <head> before first paint so a saved theme never flashes the wrong
 *  scheme; mirrors `FONT_SCALE_INIT_SCRIPT` in lib/font-scale.tsx. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var h=new Date().getHours();var c=(t==="light"||t==="dark")?t:(h>=6&&h<18?"light":"dark");document.documentElement.classList.add(c)}catch(e){document.documentElement.classList.add("light")}`;

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = THEME_STORAGE_KEY,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  // The concrete class is applied before paint by THEME_INIT_SCRIPT; this only
  // syncs React state (for the toggle UI) with what was already applied, so it
  // never causes a flash.
  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    // The concrete class is already applied by THEME_INIT_SCRIPT; this only
    // syncs React state for the toggle UI, so the set-state here cannot flash.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isTheme(saved)) setTheme(saved);
  }, [storageKey]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolveTheme(theme));
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      window.localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
