/**
 * Design Tokens for the BXM Question Pilot Design System
 * Based on the "Academic Prestige" aesthetic.
 */

export const tokens = {
  colors: {
    primary: "#002147", // Oxford Blue
    secondary: "#D4AF37", // Academic Gold
    success: "#A3C1AD", // Cambridge Blue
    destructive: "#B8860B", // Deep Ochre
    background: "#FDFCF0", // Parchment
  },
  spacing: {
    unit: 8,
    xs: "0.5rem",   // 8px
    sm: "1rem",     // 16px
    md: "1.5rem",   // 24px
    lg: "2rem",     // 32px
    xl: "3rem",     // 48px
    xxl: "4rem",    // 64px
  },
  typography: {
    fonts: {
      sans: "Public Sans",
      serif: "Source Serif 4",
    },
    scale: {
      base: "1rem",
      ratio: 1.25, // Major Third
    }
  },
  rounding: {
    sm: "2px",
    md: "4px",
    lg: "8px",
    xl: "12px",
  }
} as const;
