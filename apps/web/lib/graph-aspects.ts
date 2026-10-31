"use client";

interface GraphDimensions {
  width: number;
  height: number;
}

const dimensionsCache = new Map<string, GraphDimensions | null>();
const pendingAspects = new Map<string, Promise<number | null>>();

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

/** True once a source's aspect has been resolved (loaded or known to be
 *  missing), so callers can tell "still loading" apart from "done". */
export function hasGraphAspect(src: string | undefined): boolean {
  if (!src) return true;
  return dimensionsCache.has(src);
}

export function preloadGraphAspect(src: string): Promise<number | null> {
  const cached = dimensionsCache.get(src);
  if (cached !== undefined) {
    return Promise.resolve(cached ? cached.width / cached.height : null);
  }
  const pending = pendingAspects.get(src);
  if (pending) return pending;
  const request = new Promise<number | null>((resolve) => {
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
  }).finally(() => { pendingAspects.delete(src); });
  pendingAspects.set(src, request);
  return request;
}

export function preloadGraphAspects(sources: string[]): Promise<(number | null)[]> {
  return Promise.all(sources.map(preloadGraphAspect));
}
