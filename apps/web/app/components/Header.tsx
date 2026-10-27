"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ConfirmModal from "./ConfirmModal";
import { clearTestSession, hasTestProgress } from "@/lib/test-session";

export function Header() {
  const router = useRouter();
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);

  const handleLogoClick = () => {
    if (hasTestProgress()) {
      setIsExitConfirmOpen(true);
    } else {
      router.push("/welcome");
    }
  };

  const handleConfirmExit = () => {
    clearTestSession();
    setIsExitConfirmOpen(false);
    router.push("/welcome");
  };

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
      <div className="mx-auto px-4 md:px-8 py-2 md:py-2 flex items-center justify-between gap-2 md:gap-4">
        <button
          type="button"
          onClick={handleLogoClick}
          className="flex items-center gap-2 md:gap-3 group shrink-0 cursor-pointer"
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

      <ConfirmModal
        isOpen={isExitConfirmOpen}
        onClose={() => setIsExitConfirmOpen(false)}
        onConfirm={handleConfirmExit}
        title="¿Salir de la prueba?"
        message="Se perderá el avance actual. ¿Deseas volver al inicio?"
        confirmText="Sí, salir"
        cancelText="Continuar"
        variant="danger"
      />
    </header>
  );
}
