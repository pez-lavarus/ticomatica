"use client";

import { useState } from "react";
import Image from "next/image";
import { useIsDark } from "@/lib/theme-provider";

interface SourceImageProps {
  /** Light-mode image URL (always available). */
  light: string;
  /** Dark-mode image URL; rendered in dark mode when it loads. */
  dark?: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Renders a source graph image, preferring the dark variant in dark mode and
 * falling back to the light variant when no dark image exists (404). This keeps
 * dark variants fully optional: dropping a file into `images/<exam>/dark/` is
 * enough, no code or manifest changes required.
 */
export function SourceImage({
  light,
  dark,
  alt,
  width,
  height,
  className,
}: SourceImageProps) {
  const isDark = useIsDark();
  // Key of the image whose dark variant failed to load. Keyed (rather than a
  // bare boolean) so the fallback resets automatically when the image changes.
  const [failedDarkKey, setFailedDarkKey] = useState<string | null>(null);

  const key = `${light}\u0000${dark ?? ""}`;
  const failedDark = failedDarkKey === key;
  const src = isDark && dark && !failedDark ? dark : light;

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => {
        if (isDark && dark && !failedDark) setFailedDarkKey(key);
      }}
    />
  );
}
