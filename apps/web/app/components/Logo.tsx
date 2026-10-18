"use client";

import { useTheme, getThemeByHour } from "@/lib/theme-provider";
import { useEffect, useState } from "react";

interface LogoProps {
  className?: string;
}

export function Logo({ className = "w-8 h-8 md:w-10 md:h-10" }: LogoProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={className} />;
  }

  // Determine actual theme if set to 'system'
  const resolvedTheme = theme === "system" ? getThemeByHour() : theme;

  if (resolvedTheme === "dark") {
    return (
      <svg className={className} viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGradientDark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f1726"/>
            <stop offset="100%" stopColor="#050b16"/>
          </linearGradient>
          <linearGradient id="cardGradientDark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8f5ef"/>
            <stop offset="100%" stopColor="#ebe7df"/>
          </linearGradient>
          <linearGradient id="textGradientDark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#11284d"/>
            <stop offset="100%" stopColor="#020b1d"/>
          </linearGradient>
          <pattern id="bgHexDark" width="140" height="161.24" patternUnits="userSpaceOnUse">
            <path d="M70 0 L140 40.31 V120.93 L70 161.24 L0 120.93 V40.31 Z" fill="none" stroke="#2a3954" strokeWidth="3"/>
          </pattern>
          <pattern id="cardHexDark" width="140" height="161.24" patternUnits="userSpaceOnUse">
            <path d="M70 0 L140 40.31 V120.93 L70 161.24 L0 120.93 V40.31 Z" fill="none" stroke="#ffffff" strokeOpacity="0.42" strokeWidth="2"/>
          </pattern>
          <filter id="cardShadowDark" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="20" stdDeviation="22" floodColor="#000000" floodOpacity="0.45"/>
          </filter>
          <filter id="textShadowDark" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#000000" floodOpacity="0.28"/>
          </filter>
        </defs>
        <rect width="1024" height="1024" fill="url(#bgGradientDark)"/>
        <rect width="1024" height="1024" fill="url(#bgHexDark)"/>
        <g filter="url(#cardShadowDark)">
          <rect x="72" y="232" width="880" height="560" rx="84" fill="url(#cardGradientDark)"/>
          <rect x="72" y="232" width="880" height="560" rx="84" fill="url(#cardHexDark)" opacity="0.9"/>
        </g>
        <text x="512" y="548" fontFamily="Arial, Helvetica, sans-serif" fontSize="340" fontWeight="900" letterSpacing="-14" textAnchor="middle" dominantBaseline="middle" fill="url(#textGradientDark)" filter="url(#textShadowDark)">
          BXM
        </text>
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="bgHexLight" width="140" height="161.24" patternUnits="userSpaceOnUse">
          <path d="M70 0 L140 40.31 V120.93 L70 161.24 L0 120.93 V40.31 Z" fill="none" stroke="#d8dde8" strokeWidth="3"/>
        </pattern>
        <pattern id="cardHexLight" width="140" height="161.24" patternUnits="userSpaceOnUse">
          <path d="M70 0 L140 40.31 V120.93 L70 161.24 L0 120.93 V40.31 Z" fill="none" stroke="#e4e1da" strokeWidth="2"/>
        </pattern>
        <filter id="shadowLight" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="18" floodColor="#000000" floodOpacity="0.18"/>
        </filter>
        <filter id="textShadowLight" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#000000" floodOpacity="0.22"/>
        </filter>
        <linearGradient id="navyGradientLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e3158"/>
          <stop offset="100%" stopColor="#07162d"/>
        </linearGradient>
        <linearGradient id="bgGradientLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#eef1f7"/>
          <stop offset="100%" stopColor="#dfe4ee"/>
        </linearGradient>
        <linearGradient id="cardGradientLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f7f5f0"/>
          <stop offset="100%" stopColor="#ece8e0"/>
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" fill="url(#bgGradientLight)"/>
      <rect width="1024" height="1024" fill="url(#bgHexLight)"/>
      <g filter="url(#shadowLight)">
        <rect x="72" y="232" width="880" height="560" rx="84" fill="url(#cardGradientLight)"/>
        <rect x="72" y="232" width="880" height="560" rx="84" fill="url(#cardHexLight)" opacity="0.85"/>
      </g>
      <text x="512" y="548" fontFamily="Arial, Helvetica, sans-serif" fontSize="340" fontWeight="900" letterSpacing="-14" textAnchor="middle" dominantBaseline="middle" fill="url(#navyGradientLight)" filter="url(#textShadowLight)">
        BXM
      </text>
    </svg>
  );
}
