"use client";

interface GraphDimensions {
  width: number;
  height: number;
}

const dimensionsCache = new Map<string, GraphDimensions | null>();

export function getGraphDimensions(src: string | undefined): GraphDimensions | null {
  if (!src) return null;
  const cached = dimensionsCache.get(src);
  return cached === undefined ? null : cached;
}

export function getGraphAspect(src: string | undefined): number | null {
  const dimensions = getGraphDimensions(src);
  if (!dimensions || dimensions.height === 0) return null;
  return dimensions.width / dimensions.height;
}

export function preloadGraphAspect(src: string): Promise<number | null> {
  const cached = dimensionsCache.get(src);
  if (cached !== undefined) {
    return Promise.resolve(cached ? cached.width / cached.height : null);
  }
  return new Promise((resolve) => {
    const image = new window.Image();
    image.onload = () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      const valid = width > 0 && height > 0;
      dimensionsCache.set(src, valid ? { width, height } : null);
      resolve(valid ? width / height : null);
    };
    image.onerror = () => {
      dimensionsCache.set(src, null);
      resolve(null);
    };
    image.src = src;
  });
}

export function preloadGraphAspects(sources: string[]): Promise<(number | null)[]> {
  return Promise.all(sources.map(preloadGraphAspect));
}
