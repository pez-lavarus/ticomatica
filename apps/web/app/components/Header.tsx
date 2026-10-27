"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

const TEST_STATE_KEYS = [
  "bxm-pilot-answers",
  "bxm-pilot-flags",
  "bxm-pilot-time-left",
  "bxm-pilot-index",
  "bxm-pilot-topic-index",
  "bxm-pilot-mode",
  "bxm-pilot-review",
];

export function Header() {
  const router = useRouter();

  const handleLogoClick = () => {
    const hasProgress = TEST_STATE_KEYS.some((key) => {
      const value = localStorage.getItem(key);
      return value !== null && value !== "";
    });

    if (hasProgress && !window.confirm("Se perderá el avance actual. ¿Deseas salir?")) {
      return;
    }

    TEST_STATE_KEYS.forEach((key) => localStorage.removeItem(key));
    router.push("/welcome");
  };

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
      <div className="mx-auto px-4 md:px-8 py-2 md:py-2 flex items-center justify-between gap-2 md:gap-4">
        <button
          type="button"
          onClick={handleLogoClick}
          className="flex items-center gap-2 md:gap-3 group shrink-0"
          aria-label="Volver al inicio"
        >
          <Image
            src="/ticomatica-logo-title.svg"
            alt="Ticomatica"
            width={2048}
            height={682}
            className="ticomatica-logo-title h-6 md:h-20 w-auto hidden sm:block"
          />
        </button>

        <div id="test-header-controls" className="flex items-center gap-2 md:gap-6" />
      </div>
    </header>
  );
}
