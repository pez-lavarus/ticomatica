"use client";

import { useEffect, useRef } from "react";
import { SourceImage } from "./assessment/SourceImage";
import { X } from "lucide-react";

interface ImageModalProps {
  src: string;
  svg?: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageModal({ src, svg, alt, isOpen, onClose }: ImageModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        e.preventDefault();
        closeRef.current?.focus();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md"
      onClick={onClose}
    >
      <div className="relative p-4 sm:p-8 max-w-[96vw] max-h-[96dvh]" onClick={e => e.stopPropagation()}>
        <button
          ref={closeRef}
          type="button"
          aria-label="Cerrar imagen ampliada"
          onClick={onClose}
          className="absolute top-0 right-0 bg-card border border-border/60 rounded-sm p-3 shadow-2xl hover:bg-muted transition-colors z-10"
        >
          <X className="w-6 h-6 text-foreground" />
        </button>

        <div className="flex items-center justify-center">
          <SourceImage
            svg={svg}
            png={src}
            expanded
            alt={alt}
            width={1400}
            height={900}
            className="block w-auto h-auto max-w-full max-h-[84dvh] object-contain"
          />
        </div>
      </div>
    </div>
  );
}