"use client";

import { useEffect } from "react";
import Image from "next/image";
import { X } from "lucide-react";

interface ImageModalProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageModal({ src, alt, isOpen, onClose }: ImageModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md"
      onClick={onClose}
    >
      <div className="relative p-8 max-w-[96vw] max-h-[96vh]" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 bg-card border border-border/60 rounded-sm p-3 shadow-2xl hover:bg-muted transition-colors z-10"
        >
          <X className="w-6 h-6 text-foreground" />
        </button>

        <div className="bg-white p-4 rounded-sm shadow-2xl border border-border/40">
          <Image
            src={src}
            alt={alt}
            width={1400}
            height={900}
            className="max-w-full max-h-[84vh] object-contain"
            priority
          />
        </div>
      </div>
    </div>
  );
}