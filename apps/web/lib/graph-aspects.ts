"use client";

const aspectCache = new Map<string, number | null>();

export function getGraphAspect(src: string | undefined): number | null {
  if (!src) return null;
  const cached = aspectCache.get(src);
  return cached === undefined ? null : cached;
}

export function preloadGraphAspect(src: string): Promise<number | null> {
  const cached = aspectCache.get(src);
  if (cached !== undefined) return Promise.resolve(cached);
  return new Promise((resolve) => {
    const image = new window.Image();
    image.onload = () => {
      const ratio = image.naturalWidth / image.naturalHeight;
      const value = Number.isFinite(ratio) && ratio > 0 ? ratio : null;
      aspectCache.set(src, value);
      resolve(value);
    };
    image.onerror = () => {
      aspectCache.set(src, null);
      resolve(null);
    };
    image.src = src;
  });
}

export function preloadGraphAspects(sources: string[]): Promise<(number | null)[]> {
  return Promise.all(sources.map(preloadGraphAspect));
}
