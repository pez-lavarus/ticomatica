"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { BookOpen, Pause, Play, X } from "lucide-react";
import styles from "./exam-preview.module.css";

const PdfReader = dynamic(() => import("./PdfReader"), {
  ssr: false,
  loading: () => null,
});

const MOBILE_QUERY = "(max-width: 1099px)";
function subscribeMobile(callback: () => void) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export default function WelcomeExamPreview({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [ready, setReady] = useState(false);
  const [openCycle, setOpenCycle] = useState(0);
  const onReady = useCallback(() => setReady(true), []);
  const openPreview = () => {
    setReady(false);
    setOpenCycle(cycle => cycle + 1);
    setHasOpened(true);
    setOpen(true);
  };
  const [paused, setPaused] = useState(false);
  const mobile = useSyncExternalStore(subscribeMobile, () => window.matchMedia(MOBILE_QUERY).matches, () => false);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const reader = useRef<HTMLElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true }));
  }, []);

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus({ preventScroll: true });
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
    <div className={styles.stage} data-open={open} data-ready={ready}>
      <div className={styles.card} inert={open && mobile}>{children}</div>

        <div className={styles.teaser} data-paused={paused || open} inert={open}>
          <button ref={trigger} type="button" className={styles.paperButton} onClick={openPreview} aria-label="Abrir vista previa del documento de práctica" aria-controls="exam-document-preview" aria-expanded={open}>
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

      {hasOpened && (
        <section ref={reader} id="exam-document-preview" className={styles.reader} role={mobile ? "dialog" : "region"} aria-modal={open && mobile || undefined} aria-hidden={!open} inert={!open} aria-label="Práctica de Matemáticas · 02-2026">
          <button ref={closeButton} type="button" onClick={close} className={styles.closeButton} aria-label="Cerrar vista previa del documento"><X size={20} /></button>
          <div className={styles.loadingCover} aria-hidden="true">
            <Image src="/exam-preview/cover.webp" alt="" width={773} height={1000} className={styles.paperImage} />
          </div>
          <div className={styles.readerContent}><PdfReader active={open} openCycle={openCycle} onReady={onReady} /></div>
        </section>
      )}
    </div>
  );
}
