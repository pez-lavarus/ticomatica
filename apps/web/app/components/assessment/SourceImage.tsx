"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// Fetched SVG content is cached for the lifetime of the session so navigating
// between questions (or back to one) never re-fetches or re-flashes. URLs known
// to be missing are remembered so they fall straight through to the raster.
const svgContentCache = new Map<string, string>();
const svgMissingCache = new Set<string>();
const svgRequests = new Map<string, Promise<void>>();

export function hasSourceSvg(src: string): boolean {
  return svgContentCache.has(src) || svgMissingCache.has(src);
}

/** Share in-flight requests between preloading, measuring and rendering. Failed
 * vectors settle too, so a missing SVG never blocks the raster fallback. */
export function preloadSourceSvg(src: string): Promise<void> {
  if (hasSourceSvg(src)) return Promise.resolve();
  const pending = svgRequests.get(src);
  if (pending) return pending;
  const request = fetch(src)
    .then((res) => (res.ok ? res.text() : null))
    .then((content) => {
      if (content) svgContentCache.set(src, sanitizeSvg(content, hashString(src)));
      else svgMissingCache.add(src);
    })
    .catch(() => { svgMissingCache.add(src); })
    .finally(() => { svgRequests.delete(src); });
  svgRequests.set(src, request);
  return request;
}

function hashString(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

/**
 * Removes the parts of an SVG's inline CSS that would leak onto the page or
 * fight the class-based theme, while keeping the fill/stroke rules that make
 * shapes render correctly (as outlines instead of solid black):
 *   - `@media(prefers-color-scheme: ...) { ... }` blocks (matched by balanced
 *     braces, since they can contain several nested rules);
 *   - `:root { color: ... }` and `svg { color: ... }` rules (which would set the
 *     document's text color / every svg's color).
 * With those gone, `currentColor` inherits `.graph-svg`'s `--graph-stroke`.
 */
function sanitizeSvgStyle(css: string, uid: string): string {
  let cleaned = css;

  // Remove OS-scheme @media blocks (balanced braces, so multi-rule blocks are
  // removed whole and never leave a stray closing brace behind).
  for (let guard = 0; guard < 8; guard += 1) {
    const idx = cleaned.indexOf("@media");
    if (idx === -1) break;
    const open = cleaned.indexOf("{", idx);
    if (open === -1) break;
    if (!cleaned.slice(idx, open).includes("prefers-color-scheme")) break;
    let depth = 0;
    let close = -1;
    for (let j = open; j < cleaned.length; j += 1) {
      if (cleaned[j] === "{") depth += 1;
      else if (cleaned[j] === "}") {
        depth -= 1;
        if (depth === 0) {
          close = j;
          break;
        }
      }
    }
    if (close === -1) break;
    cleaned = cleaned.slice(0, idx) + cleaned.slice(close + 1);
  }

  cleaned = cleaned
    .replace(/:\s*root\s*\{[^}]*\}/g, "")
    .replace(/\bsvg\s*\{[^}]*\}/g, "");

  // An inline SVG's <style> is a document stylesheet, not an SVG-local one.
  // Parse with CSSOM so selector lists (including commas inside :is()) and
  // grouping rules are handled as CSS, then confine every rule to this source.
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(cleaned);
  const scope = `[data-source-svg="${uid}"]`;
  const scopeRules = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule.type === CSSRule.STYLE_RULE) {
        const styleRule = rule as CSSStyleRule;
        styleRule.selectorText = `${scope} :is(${styleRule.selectorText})`;
      } else if ("cssRules" in rule) {
        scopeRules((rule as CSSGroupingRule).cssRules);
      }
    }
  };
  scopeRules(sheet.cssRules);
  return Array.from(sheet.cssRules, (rule) => rule.cssText).join("\n");
}

/**
 * Makes a fetched SVG safe to inline alongside others. Keeps the SVG's own
 * `<style>` scoped to its source (minus color-forcing rules), and gives <title>/<desc> unique
 * ids with aria-labelledby rewired to match.
 */
function sanitizeSvg(content: string, uid: string): string {
  return content
    .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_match, css: string) => {
      const cleaned = sanitizeSvgStyle(css, uid);
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
    preloadSourceSvg(svg).then(() => {
      if (!cancelled) forceRender((n) => n + 1);
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
          data-source-svg={svg ? hashString(svg) : undefined}
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
