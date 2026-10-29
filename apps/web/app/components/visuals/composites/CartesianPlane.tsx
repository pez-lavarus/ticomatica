/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useId } from 'react';
import { createTransform, CoordinateTransform } from '../../../utils/coordinateTransform';
import { niceTicks } from '../../../utils/ticks';
import { smoothPath } from '../../../utils/smoothPath';
import { Point } from '../primitives/Point';
import { DashedProjection } from '../primitives/DashedProjection';
import {
  Line,
  CirclePrimitive,
  PolygonPrimitive,
  PolylinePrimitive,
} from '../primitives/Primitives';

export interface CartesianCanvasProps {
  domain?: { x?: [number, number]; y?: [number, number] };
  x_range?: [number, number];
  y_range?: [number, number];
  grid?: boolean;
  axes?: { arrows?: boolean };
  x_label?: string;
  y_label?: string;
  children?: any[];
  elements?: any[];
  width?: number;
  height?: number;
  padding?: number;
  preserveAspect?: boolean;
  overlay?: React.ReactNode;
}

const AXIS_COLOR = 'var(--foreground)';
const GRID_COLOR = 'var(--visual-grid, var(--border))';
const TICK_COLOR = 'var(--visual-tick, var(--muted-foreground))';

const resolveColor = (child: any, fallback: string) =>
  child.color || child.stroke || fallback;
const resolveWidth = (child: any, fallback: number) =>
  child.strokeWidth ?? child.width ?? fallback;

export function renderPrimitive(child: any, transform: CoordinateTransform, key: number): React.ReactNode {
  if (!child) return null;
  const type = child.type;

  switch (type) {
    case 'circle':
      return (
        <React.Fragment key={key}>
          <CirclePrimitive
            center={child.center || [0, 0]}
            radius={child.radius || 1}
            color={resolveColor(child, 'var(--foreground)')}
            fill={child.fill || 'none'}
            strokeWidth={resolveWidth(child, 2)}
            dashed={child.dashed}
            transform={transform}
          />
          {child.label && child.center && (
            <Point coords={child.center} label={child.label} transform={transform} color={resolveColor(child, 'var(--foreground)')} />
          )}
        </React.Fragment>
      );

    case 'point': {
      const coords: [number, number] = child.coords || [child.x ?? 0, child.y ?? 0];
      if (child.dashed_to_axis || child.dashed) {
        return (
          <DashedProjection
            key={key}
            coords={coords}
            label={child.label}
            toAxis={child.dashed_to_axis || child.dashed}
            color={resolveColor(child, 'var(--muted-foreground)')}
            transform={transform}
          />
        );
      }
      return (
        <Point
          key={key}
          coords={coords}
          label={child.label}
          labelPosition={child.label_position}
          color={resolveColor(child, 'var(--foreground)')}
          radius={child.radius}
          transform={transform}
        />
      );
    }

    case 'dashed_projection': {
      const coords: [number, number] = child.from || child.coords || [child.x ?? 0, child.y ?? 0];
      return (
        <DashedProjection
          key={key}
          coords={coords}
          toAxis={child.to_axis || child.toAxis || 'both'}
          label={child.label}
          color={resolveColor(child, 'var(--muted-foreground)')}
          transform={transform}
        />
      );
    }

    case 'line': {
      const through: [number, number][] | undefined =
        child.through || (child.p1 && child.p2 ? [child.p1, child.p2] : undefined);
      return (
        <Line
          key={key}
          p1={child.p1}
          p2={child.p2}
          points={child.points || through}
          slope={child.slope}
          intercept={child.intercept}
          color={resolveColor(child, 'currentColor')}
          strokeWidth={resolveWidth(child, 2)}
          dashed={child.dashed}
          transform={transform}
        />
      );
    }

    case 'ray': {
      const origin: [number, number] = child.origin || [0, 0];
      const direction = child.direction || 'up-right';
      const dirMap: Record<string, [number, number]> = {
        'up-right': [1, 1],
        'down-right': [1, -1],
        'up-left': [-1, 1],
        'down-left': [-1, -1],
        'left-horizontal': [-1, 0],
        'right-horizontal': [1, 0],
        'up-vertical': [0, 1],
        'down-vertical': [0, -1],
      };
      const [dx, dy] = dirMap[direction] || [1, 1];
      const span = Math.max(
        transform.xDomain[1] - transform.xDomain[0],
        transform.yDomain[1] - transform.yDomain[0]
      );
      const end: [number, number] = [origin[0] + dx * span, origin[1] + dy * span];
      return (
        <React.Fragment key={key}>
          <Line
            p1={origin}
            p2={end}
            color={resolveColor(child, 'currentColor')}
            strokeWidth={resolveWidth(child, 2)}
            dashed={child.dashed}
            transform={transform}
          />
          {child.label && <Point coords={origin} label={child.label} transform={transform} color={resolveColor(child, 'currentColor')} />}
        </React.Fragment>
      );
    }

    case 'polyline':
      return (
        <PolylinePrimitive
          key={key}
          points={child.points || []}
          color={resolveColor(child, 'var(--foreground)')}
          strokeWidth={resolveWidth(child, 2)}
          dashed={child.dashed}
          transform={transform}
        />
      );

    case 'path': {
      const points: [number, number][] = child.points || [];
      if (points.length === 0) return null;
      const d = smoothPath(points, transform);
      return (
        <path
          key={key}
          d={d}
          fill="none"
          stroke={resolveColor(child, 'currentColor')}
          strokeWidth={resolveWidth(child, 2)}
          strokeDasharray={child.dashed ? '4,4' : undefined}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      );
    }

    case 'polygon': {
      const points: [number, number][] = child.vertices || child.points || [];
      const labels: string[] = child.labels || child.vertex_labels || [];
      return (
        <React.Fragment key={key}>
          <PolygonPrimitive
            points={points}
            color={resolveColor(child, 'var(--foreground)')}
            fill={child.fill || 'color-mix(in srgb, var(--accent) 15%, transparent)'}
            strokeWidth={resolveWidth(child, 2)}
            transform={transform}
          />
          {labels.map((label, i) =>
            points[i] ? (
              <Point
                key={`${key}-label-${i}`}
                coords={points[i]}
                label={label}
                transform={transform}
                color={resolveColor(child, 'var(--foreground)')}
              />
            ) : null
          )}
        </React.Fragment>
      );
    }

    case 'label': {
      const coords: [number, number] = child.coords || [child.x ?? 0, child.y ?? 0];
      return <Point key={key} coords={coords} label={child.text || child.label} radius={0} color="transparent" transform={transform} />;
    }

    case 'arrow': {
      const from: [number, number] = child.from || child.p1 || [0, 0];
      const to: [number, number] = child.to || child.p2 || [1, 1];
      return (
        <React.Fragment key={key}>
          <Line p1={from} p2={to} color={resolveColor(child, 'currentColor')} strokeWidth={resolveWidth(child, 2)} transform={transform} />
        </React.Fragment>
      );
    }

    default:
      return null;
  }
}

export const CartesianCanvas: React.FC<CartesianCanvasProps> = ({
  domain,
  x_range,
  y_range,
  grid = false,
  axes = { arrows: true },
  x_label = 'x',
  y_label = 'y',
  children,
  elements,
  width = 400,
  height = 300,
  padding = 24,
  preserveAspect,
  overlay,
}) => {
  const clipId = useId().replace(/:/g, '');
  const xDomain = domain?.x || x_range || [-6, 6];
  const yDomain = domain?.y || y_range || [-6, 6];

  const childList = children || elements || [];
  const effectivePreserveAspect =
    preserveAspect ??
    childList.some((c) => c?.type === 'circle' || c?.type === 'polygon');

  const transform = createTransform({
    xDomain,
    yDomain,
    width,
    height,
    padding,
    preserveAspect: effectivePreserveAspect,
  });

  const [xMin, xMax] = xDomain;
  const [yMin, yMax] = yDomain;

  const plotLeft = transform.offsetX;
  const plotRight = transform.offsetX + transform.plotWidth;
  const plotTop = transform.offsetY;
  const plotBottom = transform.offsetY + transform.plotHeight;

  const xInDomain = xMin <= 0 && xMax >= 0;
  const yInDomain = yMin <= 0 && yMax >= 0;

  const originPx = transform.toPixelX(0);
  const originPy = transform.toPixelY(0);

  const xAxisPy = yInDomain ? originPy : plotBottom;
  const yAxisPx = xInDomain ? originPx : plotLeft;

  const xTicks = niceTicks(xMin, xMax, width < 300 ? 6 : 8);
  const yTicks = niceTicks(yMin, yMax, height < 240 ? 5 : 7);

  const showTickLabels = width >= 220;

  return (
    <div className="w-full flex justify-center items-center my-3 max-w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', maxWidth: `${width}px` }}
        className="cartesian-plane bg-transparent text-foreground transition-colors"
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={plotLeft} y={plotTop} width={transform.plotWidth} height={transform.plotHeight} />
          </clipPath>
        </defs>

        {/* Grid Lines */}
        {grid && (
          <g stroke={GRID_COLOR} strokeWidth={1} strokeDasharray="2,2">
            {xTicks.map((val, i) => {
              const px = transform.toPixelX(val);
              return <line key={`gx-${i}`} x1={px} y1={plotTop} x2={px} y2={plotBottom} />;
            })}
            {yTicks.map((val, i) => {
              const py = transform.toPixelY(val);
              return <line key={`gy-${i}`} x1={plotLeft} y1={py} x2={plotRight} y2={py} />;
            })}
          </g>
        )}

        {/* Plot border (only visible when axes fall outside the domain) */}
        {(!xInDomain || !yInDomain) && (
          <rect
            x={plotLeft}
            y={plotTop}
            width={transform.plotWidth}
            height={transform.plotHeight}
            fill="none"
            stroke={AXIS_COLOR}
            strokeWidth={1.5}
          />
        )}

        {/* Axes */}
        {yInDomain && (
          <line x1={plotLeft} y1={originPy} x2={plotRight} y2={originPy} stroke={AXIS_COLOR} strokeWidth={2} />
        )}
        {xInDomain && (
          <line x1={originPx} y1={plotTop} x2={originPx} y2={plotBottom} stroke={AXIS_COLOR} strokeWidth={2} />
        )}

        {/* Arrowheads */}
        {axes?.arrows && yInDomain && (
          <polygon
            points={`${plotRight},${originPy} ${plotRight - 8},${originPy - 4} ${plotRight - 8},${originPy + 4}`}
            fill={AXIS_COLOR}
          />
        )}
        {axes?.arrows && xInDomain && (
          <polygon
            points={`${originPx},${plotTop} ${originPx - 4},${plotTop + 8} ${originPx + 4},${plotTop + 8}`}
            fill={AXIS_COLOR}
          />
        )}

        {/* Tick marks and labels */}
        <g stroke={TICK_COLOR} strokeWidth={1.25}>
          {xTicks.map((val, i) => {
            const px = transform.toPixelX(val);
            return (
              <React.Fragment key={`xt-${i}`}>
                <line x1={px} y1={xAxisPy - 4} x2={px} y2={xAxisPy + 4} />
                {showTickLabels && Math.abs(val) > 1e-9 && (
                  <text x={px} y={xAxisPy + 14} fontSize={10} fontWeight="bold" fill="currentColor" textAnchor="middle">
                    {val}
                  </text>
                )}
              </React.Fragment>
            );
          })}
          {yTicks.map((val, i) => {
            const py = transform.toPixelY(val);
            return (
              <React.Fragment key={`yt-${i}`}>
                <line x1={yAxisPx - 4} y1={py} x2={yAxisPx + 4} y2={py} />
                {showTickLabels && Math.abs(val) > 1e-9 && (
                  <text x={yAxisPx - 7} y={py + 3.5} fontSize={10} fontWeight="bold" fill="currentColor" textAnchor="end">
                    {val}
                  </text>
                )}
              </React.Fragment>
            );
          })}
        </g>

        {/* Axis Labels */}
        <text x={plotRight - 4} y={xAxisPy - 8} fontSize={12} fontWeight="900" fill="currentColor" textAnchor="end">
          {x_label}
        </text>
        <text x={yAxisPx + 8} y={plotTop + 12} fontSize={12} fontWeight="900" fill="currentColor" textAnchor="start">
          {y_label}
        </text>

        {/* Primitive Children (clipped to plot area) */}
        <g clipPath={`url(#${clipId})`}>
          {childList.map((child, idx) => renderPrimitive(child, transform, idx))}
          {overlay}
        </g>
      </svg>
    </div>
  );
};

export interface CartesianPlaneProps {
  domain?: { x?: [number, number]; y?: [number, number] };
  x_range?: [number, number];
  y_range?: [number, number];
  grid?: boolean;
  axes?: { arrows?: boolean };
  x_label?: string;
  y_label?: string;
  children?: any[];
  elements?: any[];
  width?: number;
  height?: number;
  padding?: number;
  preserveAspect?: boolean;
}

export const CartesianPlane: React.FC<CartesianPlaneProps> = (props) => {
  return <CartesianCanvas {...props} />;
};
