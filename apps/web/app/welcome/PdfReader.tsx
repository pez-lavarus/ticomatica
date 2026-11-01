"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { version } from "pdfjs-dist/package.json";
import { EXAM_DOCUMENT_URL } from "./exam-document";
import styles from "./exam-preview.module.css";

function PdfPage({ document: pdf, number, width, revision, active, onReady, scrollRoot }: {
  document: PDFDocumentProxy;
  number: number;
  width: number;
  revision: number;
  active: boolean;
  onReady?: () => void;
  scrollRoot: HTMLDivElement | null;
}) {
  const host = useRef<HTMLElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const [nearby, setNearby] = useState(number === 1);
  const [error, setError] = useState(false);
  const [text, setText] = useState("");
  const [ratio, setRatio] = useState(612 / 792);

  useEffect(() => {
    if (!host.current || !scrollRoot) return;
    const observer = new IntersectionObserver(([entry]) => setNearby(entry.isIntersecting), {
      root: scrollRoot, rootMargin: "900px 0px",
    });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, [scrollRoot]);

  useEffect(() => {
    if (!active || !surface.current) return;
    if (!nearby) {
      for (const canvas of surface.current.querySelectorAll("canvas")) {
        canvas.remove();
        canvas.width = canvas.height = 0;
      }
      return;
    }
    if (!width) return;
    let cancelled = false;
    let task: RenderTask | undefined;
    function signalReady() {
      const page = host.current?.getBoundingClientRect();
      const root = scrollRoot?.getBoundingClientRect();
      if ((number === 1 && !scrollRoot?.scrollTop) || (page && root && page.bottom > root.top && page.top < root.bottom)) onReady?.();
    }
    const canvas = window.document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    async function render() {
      try {
        const page = await pdf.getPage(number);
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        setRatio(base.width / base.height);
        // Bound backing-store memory, including on high-DPI mobile devices.
        const density = Math.min(window.devicePixelRatio || 1, 2, 1800 / width);
        const viewport = page.getViewport({ scale: width / base.width * density });
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        task = page.render({ canvas, viewport });
        await task.promise;
        if (cancelled) return;
        // Swap only a completed canvas: resizing must never expose a blank page.
        const previous = surface.current?.querySelector("canvas");
        surface.current?.replaceChildren(canvas);
        if (previous) previous.width = previous.height = 0;
        setError(false);
        signalReady();
        const content = await page.getTextContent();
        if (!cancelled) setText(content.items.map(item => "str" in item ? item.str : "").join(" "));
      } catch (cause) {
        if (!cancelled && !(cause instanceof Error && cause.name === "RenderingCancelledException")) {
          setError(true);
          signalReady();
        }
      }
    }
    void render();
    return () => {
      cancelled = true;
      task?.cancel();
      if (!canvas.isConnected) canvas.width = canvas.height = 0;
    };
  }, [pdf, number, nearby, width, revision, active, onReady, scrollRoot]);

  return (
    <figure ref={host} data-pdf-page={number} className={styles.pdfPage} style={{ width: width || "100%", aspectRatio: ratio }} aria-label={`Página ${number}`}>
      <div ref={surface} className={styles.canvasSurface} />
      {error && <p className={styles.pageError}>No se pudo mostrar esta página. <a href={EXAM_DOCUMENT_URL} target="_blank" rel="noopener noreferrer" className="underline">Abrir PDF original ↗</a></p>}
      <figcaption className="sr-only">Página {number}. {text}</figcaption>
    </figure>
  );
}

export default function PdfReader({ active = true, openCycle = 0, onReady }: { active?: boolean; openCycle?: number; onReady?: () => void }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [viewport, setViewport] = useState({ width: 0, revision: 0, cycle: -1 });
  const [visiblePages, setVisiblePages] = useState(5);
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loading: PDFDocumentLoadingTask | undefined;
    async function load() {
      try {
        const pdfjs = await import("pdfjs-dist");
        if (cancelled) return;
        const assets = `/pdfjs/${version}`;
        pdfjs.GlobalWorkerOptions.workerSrc = `${assets}/pdf.worker.min.mjs`;
        loading = pdfjs.getDocument({
          url: EXAM_DOCUMENT_URL,
          cMapUrl: `${assets}/cmaps/`, cMapPacked: true,
          standardFontDataUrl: `${assets}/standard_fonts/`, wasmUrl: `${assets}/wasm/`,
        });
        const document = await loading.promise;
        if (!cancelled) setPdf(document);
      } catch {
        if (!cancelled) {
          setError(true);
          onReady?.();
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
      void loading?.destroy();
    };
  }, [attempt, onReady]);

  useEffect(() => {
    if (!scrollRoot || !active) return;
    let timer: ReturnType<typeof setTimeout>;
    function measure(width: number) {
      clearTimeout(timer);
      if (width <= 0) return;
      // The opening layout animates. Render at its settled width, not every frame.
      timer = setTimeout(() => setViewport(previous => ({ width, revision: previous.revision + 1, cycle: openCycle })), 160);
    }
    measure(scrollRoot.clientWidth);
    const observer = new ResizeObserver(([entry]) => measure(entry.contentRect.width));
    observer.observe(scrollRoot);
    return () => { observer.disconnect(); clearTimeout(timer); };
  }, [scrollRoot, active, openCycle]);

  useEffect(() => {
    if (active && error) onReady?.();
  }, [active, error, onReady]);

  if (error) return (
    <div role="alert" className="p-6 space-y-4 text-sm">
      <p>No pudimos cargar la vista previa. Puedes reintentarlo o abrir el PDF original.</p>
      <button type="button" className={styles.previewLink} onClick={() => { setError(false); setAttempt(value => value + 1); }}>Reintentar</button>
      <a className={styles.previewLink} href={EXAM_DOCUMENT_URL} target="_blank" rel="noopener noreferrer">Abrir PDF original ↗</a>
    </div>
  );
  if (!pdf) return <p role="status" className="p-6 text-sm">Cargando documento de práctica…</p>;

  const pageCount = Math.min(visiblePages, pdf.numPages);

  return (
    <div ref={setScrollRoot} className={styles.pdfScroll} tabIndex={0} aria-label="Páginas del documento de práctica">
      <div className={styles.pdfPages}>
        {Array.from({ length: pageCount }, (_, index) => <PdfPage key={index + 1} document={pdf} number={index + 1} width={viewport.width} revision={viewport.revision} active={active && viewport.cycle === openCycle} onReady={onReady} scrollRoot={scrollRoot} />)}
        {pageCount < pdf.numPages && (
          <div className={styles.loadMore}>
            <span className="text-xs text-muted-foreground" aria-live="polite">{pageCount} de {pdf.numPages} páginas</span>
            <button type="button" className={styles.previewLink} onClick={() => setVisiblePages(count => Math.min(count + 5, pdf.numPages))}>Ver más</button>
          </div>
        )}
      </div>
    </div>
  );
}
