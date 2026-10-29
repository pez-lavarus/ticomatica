/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { CartesianCanvas } from './CartesianPlane';
import { createTransform } from '../../../utils/coordinateTransform';
import { smoothPath } from '../../../utils/smoothPath';
import { Point } from '../primitives/Point';

const CURVE_COLOR = 'var(--foreground)';
const ANNOTATION_COLOR = 'var(--accent)';

interface QuadraticCoeffs {
  a: number;
  b: number;
  c: number;
}

function deriveQuadratic(params: any): QuadraticCoeffs {
  if (
    params?.a !== undefined ||
    params?.b !== undefined ||
    params?.c !== undefined
  ) {
    return {
      a: params?.a ?? 1,
      b: params?.b ?? 0,
      c: params?.c ?? 0,
    };
  }

  const vertex = params?.vertex as [number, number] | undefined;
  const roots = params?.roots as number[] | undefined;

  if (vertex && roots && roots.length >= 2) {
    const [r1, r2] = roots;
    const h = vertex[0];
    const k = vertex[1];
    const denom = (h - r1) * (h - r2);
    const sign = params?.opens === 'down' ? -1 : 1;
    const a = denom !== 0 ? k / denom : sign;
    return { a, b: -a * (r1 + r2), c: a * r1 * r2 };
  }

  return { a: 1, b: 0, c: -4 };
}

export interface FunctionPlotProps {
  form?: 'quadratic' | 'linear' | 'piecewise';
  params?: any;
  annotations?: any;
  domain?: { x?: [number, number]; y?: [number, number] };
  width?: number;
  height?: number;
  function_label?: string;
  x_label?: string;
  y_label?: string;
  grid?: boolean;
}

export const FunctionPlot: React.FC<FunctionPlotProps> = ({
  form = 'quadratic',
  params = {},
  annotations,
  domain,
  width = 400,
  height = 300,
  function_label,
  x_label = 'x',
  y_label = 'y',
  grid = false,
}) => {
  const xDomain = domain?.x || [-5, 5];
  const yDomain = domain?.y || [-6, 6];

  const transform = createTransform({
    xDomain,
    yDomain,
    width,
    height,
    padding: 35,
    preserveAspect: false,
  });

  const points: [number, number][] = [];
  const step = (xDomain[1] - xDomain[0]) / 160;

  if (form === 'linear') {
    const m = params?.slope ?? params?.m ?? 1;
    const b = params?.intercept ?? params?.b ?? 0;
    for (let x = xDomain[0]; x <= xDomain[1] + step; x += step) {
      points.push([x, m * x + b]);
    }
  } else if (form === 'piecewise' && Array.isArray(params?.points)) {
    points.push(...params.points);
  } else {
    const { a, b, c } = deriveQuadratic(params);
    for (let x = xDomain[0]; x <= xDomain[1] + step; x += step) {
      points.push([x, a * x * x + b * x + c]);
    }
  }

  const pathD = smoothPath(points, transform);

  const coeffs = form === 'quadratic' ? deriveQuadratic(params) : null;
  const vertexFromCoeffs: [number, number] | undefined = coeffs
    ? [-coeffs.b / (2 * coeffs.a), coeffs.c - (coeffs.b * coeffs.b) / (4 * coeffs.a)]
    : undefined;

  const vertex: [number, number] =
    (Array.isArray(params?.vertex) && (params.vertex as [number, number])) ||
    (Array.isArray(annotations?.vertex) && (annotations.vertex as [number, number])) ||
    vertexFromCoeffs ||
    [0, 0];

  const roots: number[] = Array.isArray(params?.roots)
    ? params.roots
    : Array.isArray(annotations?.roots)
    ? annotations.roots
    : [];

  const showVertex = annotations?.vertex?.show !== false;
  const showRoots = annotations?.roots?.show !== false;
  const showAxis = annotations?.axis_of_symmetry?.show === true;
  const axisX = annotations?.axis_of_symmetry?.x ?? vertex[0];

  const vertexLabel =
    annotations?.vertex?.label ||
    (vertexFromCoeffs ? `V(${vertex[0]}, ${vertex[1]})` : undefined);

  const rootLabels: string[] = annotations?.roots?.labels || roots.map((r) => String(r));

  const overlay = (
    <g>
      {/* Axis of symmetry */}
      {showAxis && (
        <line
          x1={transform.toPixelX(axisX)}
          y1={transform.offsetY}
          x2={transform.toPixelX(axisX)}
          y2={transform.offsetY + transform.plotHeight}
          stroke={ANNOTATION_COLOR}
          strokeDasharray="4,4"
          strokeWidth={1.5}
        />
      )}

      {/* Function curve */}
      <path d={pathD} fill="none" stroke={CURVE_COLOR} strokeWidth={2.5} strokeLinejoin="round" />

      {/* Function label */}
      {function_label && (
        <text
          x={transform.toPixelX(vertex[0]) + 12}
          y={transform.toPixelY(vertex[1]) - 12}
          fontSize={13}
          fontWeight="bold"
          fontStyle="italic"
          fill={CURVE_COLOR}
        >
          {function_label}
        </text>
      )}

      {/* Roots */}
      {showRoots &&
        roots.map((r, i) => (
          <Point
            key={`root-${i}`}
            coords={[r, 0]}
            label={rootLabels[i] ?? String(r)}
            color={ANNOTATION_COLOR}
            transform={transform}
          />
        ))}

      {/* Vertex */}
      {showVertex && (
        <Point
          coords={vertex}
          label={vertexLabel}
          color={ANNOTATION_COLOR}
          transform={transform}
        />
      )}

      {/* Vertex projections to axes */}
      {annotations?.vertex?.project_to?.map((axis: string, i: number) => (
        <React.Fragment key={`proj-${i}`}>
          {axis === 'x' && (
            <line
              x1={transform.toPixelX(vertex[0])}
              y1={transform.toPixelY(vertex[1])}
              x2={transform.toPixelX(vertex[0])}
              y2={transform.toPixelY(0)}
              stroke={ANNOTATION_COLOR}
              strokeDasharray="4,4"
              strokeWidth={1.2}
            />
          )}
          {axis === 'y' && (
            <line
              x1={transform.toPixelX(vertex[0])}
              y1={transform.toPixelY(vertex[1])}
              x2={transform.toPixelX(0)}
              y2={transform.toPixelY(vertex[1])}
              stroke={ANNOTATION_COLOR}
              strokeDasharray="4,4"
              strokeWidth={1.2}
            />
          )}
        </React.Fragment>
      ))}
    </g>
  );

  return (
    <CartesianCanvas
      domain={domain}
      width={width}
      height={height}
      grid={grid}
      x_label={x_label}
      y_label={y_label}
      preserveAspect={false}
      overlay={overlay}
    />
  );
};

export interface MultiViewGridProps {
  layout?: {
    rows: number;
    cols: number;
    original?: boolean;
  };
  views?: Array<{
    id?: string;
    label?: string;
    visual?: any;
  }>;
  original?: {
    label?: string;
    visual?: any;
  };
  width?: number;
  height?: number;
  renderVisual?: (visualSpec: any) => React.ReactNode;
}

export const MultiViewGrid: React.FC<MultiViewGridProps> = ({
  layout = { rows: 2, cols: 2 },
  views = [],
  original,
  renderVisual,
}) => {
  const cols = layout.cols || 2;

  const renderView = (view: any) => {
    const content = renderVisual ? renderVisual(view.visual) : null;
    return (
      <div className="view-item flex flex-col items-center bg-card p-2 rounded-sm shadow-sm border border-border">
        {view.label && (
          <div className="text-sm font-bold text-foreground mb-1">{view.label}</div>
        )}
        {content}
      </div>
    );
  };

  return (
    <div className="multi-view-grid space-y-3 p-2 bg-muted/50 border border-border rounded-sm">
      {original && (
        <div className="view-item flex flex-col items-center bg-card p-2 rounded-sm shadow-sm border border-border">
          {original.label && (
            <div className="text-sm font-bold text-foreground mb-1">{original.label}</div>
          )}
          {renderVisual ? renderVisual(original.visual) : null}
        </div>
      )}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {views.map((view, idx) => (
          <div key={view.id || idx}>{renderView(view)}</div>
        ))}
      </div>
    </div>
  );
};

export interface CurveRegionProps {
  path?: {
    points?: [number, number][];
    label?: string;
  };
  curvePoints?: [number, number][];
  straight_segments?: Array<{ from: [number, number]; to: [number, number] }>;
  base?: { from: [number, number]; to: [number, number] };
  width?: number;
  height?: number;
  domain?: { x?: [number, number]; y?: [number, number] };
  grid?: boolean;
}

export const CurveRegion: React.FC<CurveRegionProps> = ({
  path,
  curvePoints,
  straight_segments = [],
  base,
  width = 400,
  height = 260,
  domain = { x: [-1, 5], y: [-1, 5] },
  grid = true,
}) => {
  const pathPoints = path?.points || curvePoints || [];

  const children: any[] = [];
  if (pathPoints.length > 0) {
    children.push({ type: 'path', points: pathPoints, color: 'var(--foreground)', strokeWidth: 2.5 });
  }
  straight_segments.forEach((seg) => {
    children.push({ type: 'line', p1: seg.from, p2: seg.to, color: 'var(--foreground)', strokeWidth: 2 });
  });
  if (base) {
    children.push({ type: 'line', p1: base.from, p2: base.to, color: 'var(--foreground)', strokeWidth: 2 });
  }

  return (
    <CartesianCanvas domain={domain} width={width} height={height} grid={grid}>
      {children}
    </CartesianCanvas>
  );
};

export interface TransformationOverlayProps {
  figures?: Array<{
    type?: string;
    vertices?: [number, number][];
    points?: [number, number][];
    label?: string;
    color?: string;
  }>;
  polygons?: { points: [number, number][]; label?: string; color?: string }[];
  transformations?: { type: string; fromLabel?: string; toLabel?: string }[];
  domain?: { x?: [number, number]; y?: [number, number] };
  width?: number;
  height?: number;
  grid?: boolean;
}

export const TransformationOverlay: React.FC<TransformationOverlayProps> = ({
  figures,
  polygons = [],
  domain = { x: [-6, 6], y: [-6, 6] },
  width = 400,
  height = 300,
  grid = true,
}) => {
  const children: any[] = [];

  const figureList: Array<{
    vertices?: [number, number][];
    points?: [number, number][];
    label?: string;
    color?: string;
  }> = figures
    ? figures
    : polygons.map((poly) => ({
        vertices: poly.points,
        label: poly.label,
        color: poly.color,
      }));

  figureList.forEach((fig) => {
    const points = fig.vertices || fig.points || [];
    if (points.length === 0) return;
    const labels = fig.label ? [fig.label] : undefined;
    children.push({
      type: 'polygon',
      vertices: points,
      color: fig.color || 'var(--foreground)',
      fill: fig.color ? `${fig.color}22` : 'color-mix(in srgb, var(--accent) 15%, transparent)',
      labels,
    });
  });

  return (
    <CartesianCanvas domain={domain} width={width} height={height} grid={grid}>
      {children}
    </CartesianCanvas>
  );
};
