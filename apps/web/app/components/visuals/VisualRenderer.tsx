/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useEffect } from 'react';
import JXG from 'jsxgraph';
import type { VisualSpec } from '@/app/types';

// ---------------------------------------------------------------------------
// Types (unchanged)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Helper: resolve CSS custom properties to actual colors
// ---------------------------------------------------------------------------
function resolveColor(color: string): string {
  if (color.startsWith('var(')) {
    const varName = color.match(/var\((--[^,)]+)/)?.[1];
    if (varName) {
      const computed = getComputedStyle(document.documentElement)
        .getPropertyValue(varName)
        .trim();
      return computed || '#000000';
    }
  }
  return color;
}

// ---------------------------------------------------------------------------
// Helper: map a primitive object to a JSXGraph element
// ---------------------------------------------------------------------------
function createJSXGraphElement(
  board: JXG.Board,
  child: any,
  xDomain: [number, number],
  yDomain: [number, number],
): void {
  if (!child) return;
  const type = child.type;

  switch (type) {
    case 'point': {
      const coords: [number, number] = child.coords ?? [child.x ?? 0, child.y ?? 0];
      const color = resolveColor(child.color || 'var(--foreground)');
      board.create('point', coords, {
        name: child.label ?? '',
        withLabel: !!child.label,
        size: child.radius ?? 3,
        fillColor: color,
        strokeColor: color,
        fixed: true,
        label: { offset: [10, 10] },
      });
      break;
    }

    case 'circle': {
      const center = child.center ?? [0, 0];
      const radius = child.radius ?? 1;
      board.create('circle', [center, radius], {
        strokeColor: resolveColor(child.color || 'var(--foreground)'),
        strokeWidth: child.strokeWidth ?? 2,
        fillColor: child.fill || 'none',
        fillOpacity: child.fill ? 0.3 : 0,
        dash: child.dashed ? 2 : 0,
      });
      break;
    }

    case 'line': {
      let p1: [number, number] | undefined;
      let p2: [number, number] | undefined;

      if (child.through?.length >= 2) {
        [p1, p2] = child.through;
      } else if (child.p1 && child.p2) {
        p1 = child.p1;
        p2 = child.p2;
      } else if (child.points?.length >= 2) {
        [p1, p2] = child.points;
      } else if (child.slope !== undefined && child.intercept !== undefined) {
        p1 = [0, child.intercept];
        p2 = [1, child.slope + child.intercept];
      }

      if (p1 && p2) {
        board.create('line', [p1, p2], {
          strokeColor: resolveColor(child.color || '#000000'),
          strokeWidth: child.strokeWidth ?? 2,
          dash: child.dashed ? 2 : 0,
          straightFirst: false,
          straightLast: false,
        });
      }
      break;
    }

    case 'polygon': {
      const points: [number, number][] = child.vertices || child.points || [];
      if (points.length >= 3) {
        board.create('polygon', points, {
          strokeColor: resolveColor(child.color || 'var(--foreground)'),
          strokeWidth: child.strokeWidth ?? 2,
          fillColor: child.fill || 'var(--accent)',
          fillOpacity: 0.15,
          withLines: true,
          vertices: { visible: false },
        });
      }
      break;
    }

    case 'polyline': {
      const points: [number, number][] = child.points || [];
      if (points.length >= 2) {
        board.create('curve', points, {
          strokeColor: resolveColor(child.color || '#000000'),
          strokeWidth: child.strokeWidth ?? 2,
          dash: child.dashed ? 2 : 0,
          straight: true,
        });
      }
      break;
    }

    case 'path': {
      const points: [number, number][] = child.points || [];
      if (points.length >= 2) {
        board.create('curve', points, {
          strokeColor: resolveColor(child.color || '#000000'),
          strokeWidth: child.strokeWidth ?? 2,
          dash: child.dashed ? 2 : 0,
          straight: false,
        });
      }
      break;
    }

    case 'arrow': {
      const from = child.from || child.p1 || [0, 0];
      const to = child.to || child.p2 || [1, 1];
      board.create('arrow', [from, to], {
        strokeColor: resolveColor(child.color || '#000000'),
        strokeWidth: child.strokeWidth ?? 2,
        dash: child.dashed ? 2 : 0,
      });
      break;
    }

    case 'label': {
      const coords: [number, number] = child.coords ?? [child.x ?? 0, child.y ?? 0];
      const text = child.text || child.label || '';
      board.create('text', [coords[0], coords[1], text], {
        strokeColor: resolveColor(child.color || '#000000'),
        fontSize: 12,
      });
      break;
    }

    case 'ray': {
      const origin: [number, number] = child.origin ?? [0, 0];
      const direction = child.direction || 'up-right';
      const span = Math.max(
        xDomain[1] - xDomain[0],
        yDomain[1] - yDomain[0],
      );
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
      const end: [number, number] = [
        origin[0] + dx * span,
        origin[1] + dy * span,
      ];
      board.create('line', [origin, end], {
        strokeColor: resolveColor(child.color || '#000000'),
        strokeWidth: child.strokeWidth ?? 2,
        dash: child.dashed ? 2 : 0,
        straightFirst: false,
        straightLast: true,
      });
      break;
    }

    // default: ignore unknown types
  }
}

// ---------------------------------------------------------------------------
// CartesianCanvas – main component
// ---------------------------------------------------------------------------
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
  const boardRef = useRef<HTMLDivElement>(null);
  const boardInstance = useRef<JXG.Board | null>(null);

  const xDomain: [number, number] = domain?.x ?? x_range ?? [-6, 6];
  const yDomain: [number, number] = domain?.y ?? y_range ?? [-6, 6];
  const childList = children ?? elements ?? [];

  const effectivePreserveAspect =
    preserveAspect ??
    childList.some((c) => c?.type === 'circle' || c?.type === 'polygon');

  useEffect(() => {
    if (!boardRef.current) return;

    // Initialise board. The upstream JSXGraph typings are narrower than the
    // runtime API, so the board config is intentionally cast to `any`.
    const board = JXG.JSXGraph.initBoard(boardRef.current, {
      boundingbox: [xDomain[0], yDomain[1], xDomain[1], yDomain[0]],
      axis: true,
      grid,
      showCopyright: false,
      showNavigation: false,
      keepaspectratio: effectivePreserveAspect,
      pan: { enabled: false },
      zoom: { enabled: false },
    } as any);

    // Axis labels & arrows. The `defaultAxes` objects are optional at runtime
    // depending on the board configuration, so guard before mutating them.
    const xAxis = (board.defaultAxes as any)?.x;
    const yAxis = (board.defaultAxes as any)?.y;
    xAxis?.setAttribute?.({ name: x_label, withLabel: true, visible: true });
    yAxis?.setAttribute?.({ name: y_label, withLabel: true, visible: true });

    if (axes?.arrows) {
      xAxis?.setAttribute?.({ ticks: { visible: true }, label: { visible: true } });
      yAxis?.setAttribute?.({ ticks: { visible: true }, label: { visible: true } });
    }

    // Create all primitives
    childList.forEach((child) =>
      createJSXGraphElement(board, child, xDomain, yDomain),
    );

    boardInstance.current = board;

    // Cleanup on unmount or dependency change
    return () => {
      if (boardInstance.current) {
        JXG.JSXGraph.freeBoard(boardInstance.current);
        boardInstance.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    xDomain[0],
    xDomain[1],
    yDomain[0],
    yDomain[1],
    grid,
    x_label,
    y_label,
    childList,
    effectivePreserveAspect,
    width,
    height,
    padding,
    axes,
  ]);

  return (
    <div className="relative w-full flex justify-center items-center my-3 max-w-full overflow-hidden">
      <div
        ref={boardRef}
        className="jxgbox cartesian-plane bg-transparent text-foreground transition-colors"
        style={{
          width: '100%',
          maxWidth: `${width}px`,
          aspectRatio: `${width} / ${height}`,
        }}
      />
      {overlay && (
        <div className="absolute inset-0 pointer-events-none">{overlay}</div>
      )}
    </div>
  );
};

export interface VisualRendererProps {
  spec?: VisualSpec | null;
  itemId?: number | string;
  alt?: string;
  className?: string;
}

export function VisualRenderer({
  spec,
  itemId,
  alt,
  className = '',
}: VisualRendererProps) {
  const activeSpec = (spec as any)?.visual ?? (spec as any);

  if (!activeSpec) {
    return null;
  }

  const ariaLabel = alt ?? activeSpec.alt ?? `Visual ${itemId ?? ''}`.trim();

  switch (activeSpec.type) {
    case 'cartesian_2d':
    case 'transformation_overlay': {
      const elements = activeSpec.children ?? activeSpec.figures ?? activeSpec.elements ?? [];
      return (
        <figure
          role="img"
          aria-label={ariaLabel}
          className={className}
          data-visual-type={activeSpec.type}
        >
          <CartesianCanvas
            domain={activeSpec.domain}
            grid={activeSpec.grid}
            axes={activeSpec.axes}
            x_label={activeSpec.x_label}
            y_label={activeSpec.y_label}
            width={activeSpec.width ?? 420}
            height={activeSpec.height ?? 300}
            elements={elements}
            preserveAspect={activeSpec.preserveAspect}
          />
        </figure>
      );
    }

    case 'multi_view_grid': {
      const views = Array.isArray(activeSpec.views)
        ? activeSpec.views
        : activeSpec.original
          ? [{ label: activeSpec.original.label ?? 'Original', visual: activeSpec.original.visual ?? activeSpec.original }]
          : [];
      const rows = Math.max(1, Number(activeSpec.layout?.rows ?? 1));
      const cols = Math.max(1, Number(activeSpec.layout?.cols ?? Math.max(1, views.length)));

      return (
        <div role="img" aria-label={ariaLabel} className={className}>
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rows}, minmax(0, auto))`,
            }}
          >
            {views.map((view: any, index: number) => (
              <div key={`${view?.label ?? 'view'}-${index}`} className="min-w-0">
                <div className="text-center text-xs font-medium mb-1 text-muted-foreground">
                  {view?.label ?? `Vista ${index + 1}`}
                </div>
                <VisualRenderer spec={view?.visual ?? view ?? null} className="w-full" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'table': {
      const columns: unknown[] = Array.isArray(activeSpec.columns) ? activeSpec.columns : [];
      const rows: unknown[] = Array.isArray(activeSpec.rows) ? activeSpec.rows : [];

      return (
        <div role="img" aria-label={ariaLabel} className={className}>
          <table className="border-collapse text-sm">
            <thead>
              <tr>
                {columns.map((column: unknown, index: number) => (
                  <th key={`${String(column)}-${index}`} className="border border-border px-2 py-1 text-left">
                    {String(column)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row: unknown, rowIndex: number) => (
                <tr key={`row-${rowIndex}`}>
                  {(Array.isArray(row) ? row : []).map((value: unknown, valueIndex: number) => (
                    <td key={`${rowIndex}-${valueIndex}`} className="border border-border px-2 py-1 text-center">
                      {String(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'venn_diagram': {
      const sets: string[] = Array.isArray(activeSpec.sets) ? activeSpec.sets.map(String) : [];
      const regionValues = (activeSpec.region_values ?? {}) as Record<string, number | undefined>;

      return (
        <svg role="img" aria-label={ariaLabel} className={className} viewBox="0 0 260 200" preserveAspectRatio="xMidYMid meet">
          <g fill="rgba(59,130,246,0.08)" stroke="currentColor" strokeWidth="1.5">
            {sets.map((setName: string, index: number) => {
              const cx = 110 + (index - 1) * 42;
              const cy = 100 + (index === 1 ? 10 : 0);
              return (
                <circle key={setName} cx={cx} cy={cy} r={60} />
              );
            })}
          </g>
          {sets.map((setName: string, index: number) => (
            <text key={`label-${setName}`} x={70 + index * 70} y={30 + index * 15} fontSize="12" textAnchor="middle">
              {setName}
            </text>
          ))}
          <text x="130" y="110" fontSize="12" textAnchor="middle">
            {regionValues.A_B_C ?? 0}
          </text>
        </svg>
      );
    }

    case 'box_plot': {
      const groups = Array.isArray(activeSpec.groups) ? activeSpec.groups : [];
      return (
        <svg role="img" aria-label={ariaLabel} className={className} viewBox="0 0 240 180" preserveAspectRatio="xMidYMid meet">
          {groups.map((group: any, index: number) => {
            const values = group?.values ?? [];
            const q1 = Number(values[1] ?? 0);
            const med = Number(values[2] ?? 0);
            const q3 = Number(values[3] ?? 0);
            const min = Number(values[0] ?? 0);
            const max = Number(values[4] ?? 0);
            const x = 40 + index * 70;
            const yBase = 140;
            const yMin = 30;
            return (
              <g key={group?.label ?? `group-${index}`}>
                <line x1={x} y1={yBase - (min / 10) * 90} x2={x} y2={yBase - (max / 10) * 90} stroke="currentColor" strokeWidth="1.5" />
                <rect x={x - 16} y={yBase - (q3 / 10) * 90} width={32} height={Math.max(12, (q3 - q1) / 10 * 90)} fill="rgba(59,130,246,0.2)" stroke="currentColor" />
                <line x1={x - 16} y1={yBase - (med / 10) * 90} x2={x + 16} y2={yBase - (med / 10) * 90} stroke="currentColor" strokeWidth="2" />
                <line x1={x - 16} y1={yBase - (yMin)} x2={x + 16} y2={yBase - (yMin)} stroke="currentColor" opacity="0.4" />
                <text x={x} y={160} textAnchor="middle" fontSize="11">{group?.label ?? `G${index + 1}`}</text>
              </g>
            );
          })}
        </svg>
      );
    }

    case 'distribution_curve': {
      const skew = activeSpec.skew ?? 'symmetric';
      const mid = 120;
      const curve = (x: number) => {
        if (skew === 'negative') return 100 - (x - 90) * (x - 90) / 360;
        if (skew === 'positive') return 100 - (x - 150) * (x - 150) / 360;
        return 100 - ((x - 120) ** 2) / 420;
      };
      const path = Array.from({ length: 50 }, (_, i) => {
        const x = 35 + i * 3.5;
        const y = curve(x);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ');
      return (
        <svg role="img" aria-label={ariaLabel} className={className} viewBox="0 0 240 160" preserveAspectRatio="xMidYMid meet">
          <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1={mid} y1={20} x2={mid} y2={140} stroke="currentColor" opacity="0.3" />
        </svg>
      );
    }

    case 'function_plot': {
      const form = activeSpec.form ?? 'linear';
      const path = Array.from({ length: 80 }, (_, i) => {
        const x = -4 + (i / 79) * 8;
        let y = 0;
        if (form === 'linear') y = x;
        else if (form === 'quadratic') y = x * x;
        else if (form === 'sqrt') y = Math.sqrt(Math.max(0, x + 4));
        else if (form === 'exponential') y = Math.pow(2, x);
        else if (form === 'logarithmic') y = Math.log(Math.max(1, x + 4));
        else y = x;
        const px = 20 + ((x + 4) / 8) * 160;
        const py = 120 - ((y + 4) / 8) * 90;
        return `${i === 0 ? 'M' : 'L'} ${px} ${py}`;
      }).join(' ');
      return (
        <svg role="img" aria-label={ariaLabel} className={className} viewBox="0 0 200 140" preserveAspectRatio="xMidYMid meet">
          <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    }

    case 'curve_region': {
      const pathPoints = Array.isArray(activeSpec.path?.points) ? activeSpec.path.points : [];
      const areaPath = pathPoints.length > 0
        ? pathPoints.map(([x, y]: [number, number], index: number) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ') + ' Z'
        : 'M 20 100 L 80 50 L 160 50 L 180 100 Z';
      return (
        <svg role="img" aria-label={ariaLabel} className={className} viewBox="0 0 200 140" preserveAspectRatio="xMidYMid meet">
          <path d={areaPath} fill="rgba(59,130,246,0.15)" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    }

    default:
      return (
        <div role="img" aria-label={ariaLabel} className={className}>
          <svg viewBox="0 0 200 120" aria-hidden="true" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
            <rect x="10" y="10" width="180" height="100" fill="transparent" stroke="currentColor" strokeWidth="1" rx="4" />
            <text x="100" y="62" textAnchor="middle" fontSize="12">
              {activeSpec.type ?? 'Visual'}
            </text>
          </svg>
        </div>
      );
  }
}

export default VisualRenderer;

// ---------------------------------------------------------------------------
// CartesianPlane alias (unchanged)
// ---------------------------------------------------------------------------
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

export const CartesianPlane: React.FC<CartesianPlaneProps> = (props) => (
  <CartesianCanvas {...props} />
);