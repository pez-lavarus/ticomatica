"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface SourceImageProps {
  /** Preferred vector URL; rendered inline so `currentColor` adapts to theme. */
  svg?: string;
  /** Raster fallback URL. */
  png: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Renders a source graph, preferring the inline SVG (theme-adaptive `currentColor`
 * strokes) and falling back to the raster PNG when the SVG is missing or fails
 * to load.
 */
export function SourceImage({
  svg,
  png,
  alt,
  width,
  height,
  className,
}: SourceImageProps) {
  // Keyed by the SVG URL so a previously loaded SVG resets automatically when
  // the image changes (avoids setState-in-effect and a stale content flash).
  const [loaded, setLoaded] = useState<{ key: string; content: string } | null>(null);

  useEffect(() => {
    if (!svg) return;
    let cancelled = false;
    fetch(svg)
      .then((res) => (res.ok ? res.text() : null))
      .then((text) => {
        if (!cancelled && text) setLoaded({ key: svg, content: text });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [svg, png]);

  const svgContent = loaded && loaded.key === svg ? loaded.content : null;

  if (svgContent) {
    return (
      <div
        className="graph-svg"
        style={{ width: width ? `${width}px` : "100%" }}
        // The SVG is authored by the exam data and carries its own <title>/<desc>.
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    );
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
