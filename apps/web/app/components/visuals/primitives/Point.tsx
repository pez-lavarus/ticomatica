import React from 'react';
import { CoordinateTransform } from '../../../utils/coordinateTransform';
import { TextRenderer } from '../../common/TextRenderer';

export interface PointProps {
  coords?: [number, number];
  x?: number;
  y?: number;
  label?: string;
  labelPosition?: 'top' | 'bottom' | 'left' | 'right' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  color?: string;
  radius?: number;
  transform: CoordinateTransform;
}

export const Point: React.FC<PointProps> = ({
  coords,
  x,
  y,
  label,
  labelPosition = 'top-right',
  color = '#2563eb',
  radius = 4,
  transform,
}) => {
  const ptX = coords ? coords[0] : x ?? 0;
  const ptY = coords ? coords[1] : y ?? 0;
  const { px, py } = transform.toPixel(ptX, ptY);

  let dx = 8;
  let dy = -8;

  switch (labelPosition) {
    case 'top':
      dx = -4;
      dy = -12;
      break;
    case 'bottom':
      dx = -4;
      dy = 12;
      break;
    case 'left':
      dx = -16;
      dy = 4;
      break;
    case 'right':
      dx = 8;
      dy = 4;
      break;
    case 'top-left':
      dx = -16;
      dy = -8;
      break;
    case 'bottom-left':
      dx = -16;
      dy = 12;
      break;
    case 'bottom-right':
      dx = 8;
      dy = 12;
      break;
    case 'top-right':
    default:
      dx = 8;
      dy = -8;
      break;
  }

  return (
    <g className="primitive-point">
      <circle cx={px} cy={py} r={radius} fill={color} stroke="#ffffff" strokeWidth={1.5} />
      {label && (
        <foreignObject x={px + dx} y={py + dy} width={80} height={30} className="overflow-visible pointer-events-none">
          <div className="text-xs font-semibold text-slate-800 flex items-center">
            <TextRenderer content={label} />
          </div>
        </foreignObject>
      )}
    </g>
  );
};
