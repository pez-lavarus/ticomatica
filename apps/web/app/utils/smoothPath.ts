export function smoothPath(points: [number, number][], transform: {
  toPixel: (x: number, y: number) => { px: number; py: number };
}): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const { px, py } = transform.toPixel(points[0][0], points[0][1]);
    return `M ${px} ${py}`;
  }

  const pixels = points.map((pt) => {
    const { px, py } = transform.toPixel(pt[0], pt[1]);
    return [px, py] as [number, number];
  });

  if (points.length === 2) {
    return `M ${pixels[0][0]} ${pixels[0][1]} L ${pixels[1][0]} ${pixels[1][1]}`;
  }

  // Catmull-Rom to cubic Bezier for smooth interpolation.
  let d = `M ${pixels[0][0]} ${pixels[0][1]}`;
  for (let i = 0; i < pixels.length - 1; i++) {
    const p0 = pixels[Math.max(0, i - 1)];
    const p1 = pixels[i];
    const p2 = pixels[i + 1];
    const p3 = pixels[Math.min(pixels.length - 1, i + 2)];

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}