export interface TransformConfig {
  xDomain: [number, number];
  yDomain: [number, number];
  width: number;
  height: number;
  padding?: number;
  preserveAspect?: boolean;
}

export interface CoordinateTransform {
  toPixelX: (x: number) => number;
  toPixelY: (y: number) => number;
  toPixel: (x: number, y: number) => { px: number; py: number };
  toDataX: (px: number) => number;
  toDataY: (py: number) => number;
  toData: (px: number, py: number) => { x: number; y: number };
  width: number;
  height: number;
  padding: number;
  xDomain: [number, number];
  yDomain: [number, number];
  offsetX: number;
  offsetY: number;
  scale: number;
  plotWidth: number;
  plotHeight: number;
}

export function createTransform(config: TransformConfig): CoordinateTransform {
  const {
    xDomain,
    yDomain,
    width,
    height,
    padding = 40,
    preserveAspect = false,
  } = config;

  const [xMin, xMax] = xDomain;
  const [yMin, yMax] = yDomain;

  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const xRange = xMax - xMin;
  const yRange = yMax - yMin;

  let scale: number;
  let plotWidth: number;
  let plotHeight: number;
  let offsetX: number;
  let offsetY: number;

  if (preserveAspect) {
    const scaleX = xRange !== 0 ? innerWidth / Math.abs(xRange) : Infinity;
    const scaleY = yRange !== 0 ? innerHeight / Math.abs(yRange) : Infinity;
    scale = Math.min(scaleX, scaleY);
    if (!Number.isFinite(scale) || scale <= 0) scale = 1;
    plotWidth = scale * Math.abs(xRange);
    plotHeight = scale * Math.abs(yRange);
    offsetX = padding + (innerWidth - plotWidth) / 2;
    offsetY = padding + (innerHeight - plotHeight) / 2;
  } else {
    scale = 1;
    plotWidth = innerWidth;
    plotHeight = innerHeight;
    offsetX = padding;
    offsetY = padding;
  }

  const toPixelX = (x: number) => {
    if (xRange === 0) return offsetX + plotWidth / 2;
    if (!preserveAspect) return padding + ((x - xMin) / xRange) * innerWidth;
    return offsetX + (x - xMin) * scale;
  };

  const toPixelY = (y: number) => {
    if (yRange === 0) return offsetY + plotHeight / 2;
    if (!preserveAspect) return height - padding - ((y - yMin) / yRange) * innerHeight;
    return offsetY + (yMax - y) * scale;
  };

  const toPixel = (x: number, y: number) => ({
    px: toPixelX(x),
    py: toPixelY(y),
  });

  const toDataX = (px: number) => {
    if (xRange === 0) return xMin;
    if (!preserveAspect) return xMin + ((px - padding) / innerWidth) * xRange;
    return xMin + (px - offsetX) / scale;
  };

  const toDataY = (py: number) => {
    if (yRange === 0) return yMin;
    if (!preserveAspect) return yMin + ((height - padding - py) / innerHeight) * yRange;
    return yMax - (py - offsetY) / scale;
  };

  const toData = (px: number, py: number) => ({
    x: toDataX(px),
    y: toDataY(py),
  });

  return {
    toPixelX,
    toPixelY,
    toPixel,
    toDataX,
    toDataY,
    toData,
    width,
    height,
    padding,
    xDomain,
    yDomain,
    offsetX,
    offsetY,
    scale,
    plotWidth,
    plotHeight,
  };
}