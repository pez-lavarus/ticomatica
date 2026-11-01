"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { version } from "pdfjs-dist/package.json";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { EXAM_DOCUMENT_URL } from "./exam-document";
import styles from "./exam-preview.module.css";

function PdfPage({ document: pdf, number, width, scrollRoot }: {
  document: PDFDocumentProxy;
  number: number;
  width: number;
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
    if (!nearby || !surface.current) return;
    let cancelled = false;
    let task: RenderTask | undefined;
    const canvas = window.document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    surface.current.append(canvas);
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
        setError(false);
        const content = await page.getTextContent();
        if (!cancelled) setText(content.items.map(item => "str" in item ? item.str : "").join(" "));
      } catch (cause) {
        if (!cancelled && !(cause instanceof Error && cause.name === "RenderingCancelledException")) setError(true);
      }
    }
    void render();
    return () => {
      cancelled = true;
      task?.cancel();
      canvas.remove();
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [pdf, number, nearby, width]);

  return (
    <figure ref={host} data-pdf-page={number} className={styles.pdfPage} style={{ width, aspectRatio: ratio }} aria-label={`Página ${number}`}>
      <div ref={surface} className={styles.canvasSurface} />
      {error && <p className={styles.pageError}>No se pudo mostrar esta página. Puedes abrir el PDF original.</p>}
      <figcaption className="sr-only">Página {number}. {text}</figcaption>
    </figure>
  );
}

export default function PdfReader() {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageDraft, setPageDraft] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(560);
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);
  const scrollFrame = useRef<number | null>(null);
  const zoomAnchor = useRef(1);

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
        if (!cancelled) setError(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
      void loading?.destroy();
    };
  }, [attempt]);

  useEffect(() => {
    if (!scrollRoot) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(scrollRoot);
    return () => observer.disconnect();
  }, [scrollRoot]);

  useEffect(() => () => {
    if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
  }, []);

  function jumpTo(page: number) {
    if (!pdf || !scrollRoot) return;
    const next = Math.max(1, Math.min(pdf.numPages, Math.trunc(page)));
    const target = scrollRoot.querySelector<HTMLElement>(`[data-pdf-page="${next}"]`);
    if (!target) return;
    scrollRoot.scrollTo({ top: target.getBoundingClientRect().top - scrollRoot.getBoundingClientRect().top + scrollRoot.scrollTop - 16, behavior: "instant" });
    setCurrentPage(next);
    setPageDraft(null);
  }

  useLayoutEffect(() => {
    if (!scrollRoot) return;
    const target = scrollRoot.querySelector<HTMLElement>(`[data-pdf-page="${zoomAnchor.current}"]`);
    if (target) scrollRoot.scrollTop += target.getBoundingClientRect().top - scrollRoot.getBoundingClientRect().top - 16;
  }, [zoom, scrollRoot]);

  function changeZoom(value: number) {
    zoomAnchor.current = currentPage;
    setZoom(Math.max(0.75, Math.min(2, value)));
  }

  function onScroll() {
    if (!scrollRoot || scrollFrame.current !== null) return;
    scrollFrame.current = requestAnimationFrame(() => {
      scrollFrame.current = null;
      const top = scrollRoot.getBoundingClientRect().top + 24;
      const pages = Array.from(scrollRoot.querySelectorAll<HTMLElement>("[data-pdf-page]"));
      const active = pages.find(page => page.getBoundingClientRect().bottom > top);
      if (active) setCurrentPage(Number(active.dataset.pdfPage));
    });
  }

  if (error) return (
    <div role="alert" className="p-6 space-y-4 text-sm">
      <p>No pudimos cargar la vista previa. Puedes reintentarlo o abrir el PDF original.</p>
      <button type="button" className={styles.previewLink} onClick={() => { setError(false); setAttempt(value => value + 1); }}>Reintentar</button>
      <a className={styles.previewLink} href={EXAM_DOCUMENT_URL} target="_blank" rel="noopener noreferrer">Abrir PDF original ↗</a>
    </div>
  );
  if (!pdf) return <p role="status" className="p-6 text-sm">Cargando documento de práctica…</p>;

  const pageWidth = Math.min(760, Math.max(240, width - 32)) * zoom;
  const commitPage = () => {
    const requested = Number(pageDraft);
    if (pageDraft !== null && pageDraft.trim() && Number.isFinite(requested)) jumpTo(requested);
    else setPageDraft(null);
  };

  return (
    <>
      <div className={styles.toolbar} role="group" aria-label="Controles del documento">
        <div className={styles.controlGroup}>
          <button type="button" className={styles.iconButton} aria-label="Página anterior" disabled={currentPage === 1} onClick={() => jumpTo(currentPage - 1)}><ChevronLeft size={18} /></button>
          <label className={styles.pageLabel}>Página <input aria-label="Número de página" inputMode="numeric" type="text" value={pageDraft ?? currentPage} onChange={event => setPageDraft(event.target.value)} onBlur={commitPage} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); commitPage(); } }} /> <span aria-live="polite">de {pdf.numPages}</span></label>
          <button type="button" className={styles.iconButton} aria-label="Página siguiente" disabled={currentPage === pdf.numPages} onClick={() => jumpTo(currentPage + 1)}><ChevronRight size={18} /></button>
        </div>
        <div className={styles.controlGroup}>
          <button type="button" className={styles.iconButton} aria-label="Reducir zoom" disabled={zoom <= 0.75} onClick={() => changeZoom(zoom - 0.25)}><Minus size={16} /></button>
          <button type="button" className={styles.fitButton} onClick={() => changeZoom(1)} aria-label="Ajustar página al ancho">{Math.round(zoom * 100)}%</button>
          <button type="button" className={styles.iconButton} aria-label="Aumentar zoom" disabled={zoom >= 2} onClick={() => changeZoom(zoom + 0.25)}><Plus size={16} /></button>
        </div>
      </div>
      <div ref={setScrollRoot} onScroll={onScroll} className={styles.pdfScroll} tabIndex={0} aria-label="Páginas del documento de práctica">
        <div className={styles.pdfPages}>
          {Array.from({ length: pdf.numPages }, (_, index) => <PdfPage key={index + 1} document={pdf} number={index + 1} width={pageWidth} scrollRoot={scrollRoot} />)}
        </div>
      </div>
    </>
  );
}
