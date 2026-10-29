import React from 'react';
import { CoordinateTransform } from '../../../utils/coordinateTransform';

export interface LineProps {
  p1?: [number, number];
  p2?: [number, number];
  points?: [[number, number], [number, number]];
  slope?: number;
  intercept?: number;
  color?: string;
  strokeWidth?: number;
  dashed?: boolean;
  transform: CoordinateTransform;
}

export const Line: React.FC<LineProps> = ({
  p1,
  p2,
  points,
  slope,
  intercept,
  color = '#1e293b',
  strokeWidth = 2,
  dashed = false,
  transform,
}) => {
  let startX = p1 ? p1[0] : points ? points[0][0] : transform.xDomain[0];
  let startY = p1 ? p1[1] : points ? points[0][1] : 0;
  let endX = p2 ? p2[0] : points ? points[1][0] : transform.xDomain[1];
  let endY = p2 ? p2[1] : points ? points[1][1] : 0;

  if (slope !== undefined && intercept !== undefined) {
    startX = transform.xDomain[0];
    startY = slope * startX + intercept;
    endX = transform.xDomain[1];
    endY = slope * endX + intercept;
  }

  const pt1 = transform.toPixel(startX, startY);
  const pt2 = transform.toPixel(endX, endY);

  return (
    <line
      x1={pt1.px}
      y1={pt1.py}
      x2={pt2.px}
      y2={pt2.py}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeDasharray={dashed ? '4,4' : undefined}
    />
  );
};

export interface CirclePrimitiveProps {
  center: [number, number];
  radius: number;
  color?: string;
  fill?: string;
  strokeWidth?: number;
  dashed?: boolean;
  transform: CoordinateTransform;
}

export const CirclePrimitive: React.FC<CirclePrimitiveProps> = ({
  center,
  radius,
  color = '#2563eb',
  fill = 'none',
  strokeWidth = 2,
  dashed = false,
  transform,
}) => {
  const { px, py } = transform.toPixel(center[0], center[1]);
  const edgePx = transform.toPixelX(center[0] + radius);
  const radiusPx = Math.abs(edgePx - px);

  return (
    <circle
      cx={px}
      cy={py}
      r={radiusPx}
      stroke={color}
      fill={fill}
      strokeWidth={strokeWidth}
      strokeDasharray={dashed ? '4,4' : undefined}
    />
  );
};

export interface PolygonPrimitiveProps {
  points: [number, number][];
  color?: string;
  fill?: string;
  strokeWidth?: number;
  transform: CoordinateTransform;
}

export const PolygonPrimitive: React.FC<PolygonPrimitiveProps> = ({
  points,
  color = '#2563eb',
  fill = 'rgba(37, 99, 235, 0.1)',
  strokeWidth = 2,
  transform,
}) => {
  const pointsString = points
    .map((pt) => {
      const { px, py } = transform.toPixel(pt[0], pt[1]);
      return `${px},${py}`;
    })
    .join(' ');

  return (
    <polygon
      points={pointsString}
      stroke={color}
      fill={fill}
      strokeWidth={strokeWidth}
    />
  );
};

export interface PolylinePrimitiveProps {
  points: [number, number][];
  color?: string;
  strokeWidth?: number;
  dashed?: boolean;
  transform: CoordinateTransform;
}

export const PolylinePrimitive: React.FC<PolylinePrimitiveProps> = ({
  points,
  color = '#2563eb',
  strokeWidth = 2,
  dashed = false,
  transform,
}) => {
  const pointsString = points
    .map((pt) => {
      const { px, py } = transform.toPixel(pt[0], pt[1]);
      return `${px},${py}`;
    })
    .join(' ');

  return (
    <polyline
      points={pointsString}
      stroke={color}
      fill="none"
      strokeWidth={strokeWidth}
      strokeDasharray={dashed ? '4,4' : undefined}
    />
  );
};
