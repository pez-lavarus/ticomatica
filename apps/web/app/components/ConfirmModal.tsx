"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary";
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "primary",
}: ConfirmModalProps) {
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-card text-card-foreground w-full max-w-[480px] rounded-sm border border-border/60 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-10">
          <div className="flex items-center gap-5 mb-8">
            <div className={`w-14 h-14 rounded-sm flex items-center justify-center ${variant === "danger" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-foreground uppercase tracking-[0.15em]">{title}</h3>
          </div>

          <p className="text-foreground/80 leading-[1.8] mb-10 font-serif text-lg">
            {message}
          </p>

          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-5 bg-muted hover:bg-border text-foreground font-bold text-[11px] uppercase tracking-[0.2em] rounded-sm transition-colors border border-border/50"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-5 text-primary-foreground font-bold text-[11px] uppercase tracking-[0.2em] rounded-sm transition-colors shadow-md ${variant === "danger" ? "bg-destructive hover:brightness-90" : "bg-primary hover:brightness-90"}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
