"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { BookOpen, Pause, Play, X } from "lucide-react";
import { EXAM_DOCUMENT_URL } from "./exam-document";
import styles from "./exam-preview.module.css";

const PdfReader = dynamic(() => import("./PdfReader"), {
  ssr: false,
  loading: () => <p role="status" className="p-6 text-sm">Preparando documento…</p>,
});

const MOBILE_QUERY = "(max-width: 1099px)";
function subscribeMobile(callback: () => void) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export default function WelcomeExamPreview({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const mobile = useSyncExternalStore(subscribeMobile, () => window.matchMedia(MOBILE_QUERY).matches, () => false);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const reader = useRef<HTMLElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
      if (event.key !== "Tab" || !mobile || !reader.current) return;
      const elements = Array.from(reader.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]',
      ));
      const first = elements[0];
      const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, mobile, close]);

  return (
    <div className={styles.stage} data-open={open}>
      <div className={styles.card} inert={open && mobile}>{children}</div>

      {!open && (
        <div className={styles.teaser} data-paused={paused}>
          <button type="button" className={styles.paperButton} onClick={() => setOpen(true)} aria-label="Abrir vista previa del documento de práctica" aria-controls="exam-document-preview" aria-expanded={false}>
            <span className={styles.paperStrip} aria-hidden="true">
              {["cover", "questions", "cover"].map((page, index) => (
                <Image key={`${page}-${index}`} src={`/exam-preview/${page}.webp`} alt="" width={773} height={1000} className={styles.paperImage} />
              ))}
            </span>
            <span className={styles.paperCaption}><BookOpen size={18} /> Explorar documento</span>
          </button>
          <button type="button" className={styles.pause} onClick={() => setPaused(!paused)} aria-label={paused ? "Reanudar animación del documento" : "Pausar animación del documento"}>
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
        </div>
      )}

      <div className={styles.invitation} inert={open && mobile}>
        <span className="text-sm text-muted-foreground">Conoce la práctica oficial del MEP</span>
        <button ref={trigger} type="button" className={styles.previewLink} onClick={() => setOpen(!open)} aria-controls="exam-document-preview" aria-expanded={open}>
          <BookOpen size={17} /> {open ? "Ocultar documento de práctica" : "Ver documento de práctica"}
        </button>
      </div>

      {open && (
        <section ref={reader} id="exam-document-preview" className={styles.reader} role={mobile ? "dialog" : "region"} aria-modal={mobile || undefined} aria-labelledby="exam-preview-title">
          <div className={styles.readerHeader}>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Documento oficial · MEP / ICER</p>
              <h2 id="exam-preview-title" className="font-serif font-bold">Práctica de Matemáticas · 02-2026</h2>
            </div>
            <button ref={closeButton} type="button" onClick={close} className={styles.iconButton} aria-label="Cerrar vista previa del documento"><X size={20} /></button>
          </div>
          <PdfReader />
          <div className={styles.readerFooter}>
            <span>Explora el documento antes de comenzar.</span>
            <a href={EXAM_DOCUMENT_URL} target="_blank" rel="noopener noreferrer">Abrir PDF original ↗</a>
          </div>
        </section>
      )}
    </div>
  );
}
