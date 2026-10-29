import React from 'react';
import { CoordinateTransform } from '../../../utils/coordinateTransform';
import { Point } from './Point';

export interface DashedProjectionProps {
  coords?: [number, number];
  x?: number;
  y?: number;
  toAxis?: 'x' | 'y' | 'both';
  label?: string;
  color?: string;
  transform: CoordinateTransform;
}

export const DashedProjection: React.FC<DashedProjectionProps> = ({
  coords,
  x,
  y,
  toAxis = 'both',
  label,
  color = '#64748b',
  transform,
}) => {
  const ptX = coords ? coords[0] : x ?? 0;
  const ptY = coords ? coords[1] : y ?? 0;
  const { px, py } = transform.toPixel(ptX, ptY);
  const originPx = transform.toPixelX(0);
  const originPy = transform.toPixelY(0);

  return (
    <g className="primitive-dashed-projection">
      {(toAxis === 'x' || toAxis === 'both') && (
        <line
          x1={px}
          y1={py}
          x2={px}
          y2={originPy}
          stroke={color}
          strokeDasharray="4,4"
          strokeWidth={1.2}
        />
      )}
      {(toAxis === 'y' || toAxis === 'both') && (
        <line
          x1={px}
          y1={py}
          x2={originPx}
          y2={py}
          stroke={color}
          strokeDasharray="4,4"
          strokeWidth={1.2}
        />
      )}
      <Point coords={[ptX, ptY]} label={label} transform={transform} color={color} />
    </g>
  );
};
