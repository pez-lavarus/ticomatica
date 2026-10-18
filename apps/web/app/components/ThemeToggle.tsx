"use client";

import { useTheme } from "@/lib/theme-provider";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-10 h-10" />;

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-1 rounded-full transition-all bg-muted/50 border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/80 shadow-sm"
      title={theme === "dark" ? "Modo Claro" : "Modo Oscuro"}
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
}
