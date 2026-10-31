"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// Fetched SVG content is cached for the lifetime of the session so navigating
// between questions (or back to one) never re-fetches or re-flashes. URLs known
// to be missing are remembered so they fall straight through to the raster.
const svgContentCache = new Map<string, string>();
const svgMissingCache = new Set<string>();

function hashString(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

/**
 * Makes a fetched SVG safe to inline alongside others. Keeps the SVG's own
 * `<style>` (it carries the fill/stroke rules that make shapes render as
 * outlines rather than solid black), but removes the color-forcing rules that
 * would leak onto the page or fight the theme:
 *   - `:root { color: ... }` and `svg { color: ... }` (would set document text
 *     color / every svg's color);
 *   - `@media(prefers-color-scheme: ...) { ... }` blocks (the app's theme is
 *     class-based, not OS-scheme-based).
 * With those gone, `currentColor` inherits `.graph-svg`'s `--graph-stroke`.
 * Also gives <title>/<desc> unique ids and rewrites aria-labelledby to match.
 */
function sanitizeSvg(content: string, uid: string): string {
  return content
    .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_match, css: string) => {
      const cleaned = css
        .replace(/:\s*root\s*\{[^}]*\}/g, "")
        .replace(/\bsvg\s*\{[^}]*\}/g, "")
        .replace(/@media[^{]*prefers-color-scheme[^{]*\{[^}]*\}/g, "");
      return cleaned.trim() ? `<style>${cleaned}</style>` : "";
    })
    .replace(/id="title"/g, `id="title-${uid}"`)
    .replace(/id="desc"/g, `id="desc-${uid}"`)
    .replace(/aria-labelledby="title desc"/g, `aria-labelledby="title-${uid} desc-${uid}"`);
}

interface SvgViewBox {
  w: number;
  h: number;
}

function parseViewBox(content: string): SvgViewBox | null {
  const match = content.match(/viewBox=["']\s*[-+.\d]+\s+[-+.\d]+\s+([-+.\d]+)\s+([-+.\d]+)/);
  if (!match) return null;
  const w = Number.parseFloat(match[1]);
  const h = Number.parseFloat(match[2]);
  return w > 0 && h > 0 ? { w, h } : null;
}

interface SourceImageProps {
  /** Preferred vector URL; rendered inline so `currentColor` adapts to theme. */
  svg?: string;
  /** Raster fallback URL (also supplies the display width when the SVG loads). */
  png: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Renders a source graph, preferring the inline SVG (theme-adaptive `currentColor`
 * strokes). While the SVG loads a same-sized placeholder is reserved (no raster
 * flash); the PNG is used only when the SVG is missing or fails to load.
 */
export function SourceImage({
  svg,
  png,
  alt,
  width,
  height,
  className,
}: SourceImageProps) {
  // Bumped when a fetch resolves; the module-level cache is the source of truth.
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!svg || svgContentCache.has(svg) || svgMissingCache.has(svg)) return;
    let cancelled = false;
    fetch(svg)
      .then((res) => (res.ok ? res.text() : null))
      .then((text) => {
        if (cancelled) return;
        if (text) svgContentCache.set(svg, sanitizeSvg(text, hashString(svg)));
        else svgMissingCache.add(svg);
        forceRender((n) => n + 1);
      })
      .catch(() => {
        if (!cancelled) {
          svgMissingCache.add(svg);
          forceRender((n) => n + 1);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [svg]);

  const content = svg ? svgContentCache.get(svg) : undefined;
  const missing = svg ? svgMissingCache.has(svg) : false;

  if (svg && !missing) {
    const viewBox = content ? parseViewBox(content) : null;
    // Width comes from the raster (the intended display size); the height follows
    // the SVG's own viewBox aspect so the graph renders undistorted.
    const aspectRatio =
      viewBox
        ? `${viewBox.w} / ${viewBox.h}`
        : width && height
          ? `${width} / ${height}`
          : undefined;
    const style: React.CSSProperties = {
      width: width ? `${width}px` : "100%",
      aspectRatio,
    };

    if (content) {
      return (
        <div
          className="graph-svg"
          style={style}
          // The SVG is authored by the exam data and carries its own <title>/<desc>.
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    }

    // Loading placeholder: reserves the raster's footprint so the layout does
    // not jump when the SVG arrives.
    return <div className="graph-svg" style={style} aria-hidden="true" />;
  }

  return (
    <Image
      src={png}
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  );
}
