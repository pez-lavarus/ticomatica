"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { version } from "pdfjs-dist/package.json";
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
      {error && <p className={styles.pageError}>No se pudo mostrar esta página. <a href={EXAM_DOCUMENT_URL} target="_blank" rel="noopener noreferrer" className="underline">Abrir PDF original ↗</a></p>}
      <figcaption className="sr-only">Página {number}. {text}</figcaption>
    </figure>
  );
}

export default function PdfReader() {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [width, setWidth] = useState(560);
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

  if (error) return (
    <div role="alert" className="p-6 space-y-4 text-sm">
      <p>No pudimos cargar la vista previa. Puedes reintentarlo o abrir el PDF original.</p>
      <button type="button" className={styles.previewLink} onClick={() => { setError(false); setAttempt(value => value + 1); }}>Reintentar</button>
      <a className={styles.previewLink} href={EXAM_DOCUMENT_URL} target="_blank" rel="noopener noreferrer">Abrir PDF original ↗</a>
    </div>
  );
  if (!pdf) return <p role="status" className="p-6 text-sm">Cargando documento de práctica…</p>;

  const pageWidth = Math.max(1, width);

  return (
    <div ref={setScrollRoot} className={styles.pdfScroll} tabIndex={0} aria-label="Páginas del documento de práctica">
      <div className={styles.pdfPages}>
        {Array.from({ length: pdf.numPages }, (_, index) => <PdfPage key={index + 1} document={pdf} number={index + 1} width={pageWidth} scrollRoot={scrollRoot} />)}
      </div>
    </div>
  );
}
