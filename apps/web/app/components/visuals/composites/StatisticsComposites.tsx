import React from 'react';
import { TextRenderer } from '../../common/TextRenderer';
import { niceTicks } from '../../../utils/ticks';
import { smoothPath } from '../../../utils/smoothPath';

export interface TableSpecProps {
  variant?: 'frequency' | 'weighted' | 'summary' | 'contingency' | 'stats' | string;
  headers?: string[];
  columns?: string[];
  rows?: (string | number)[][];
  title?: string;
  totalRow?: (string | number)[];
  total_row?: (string | number)[];
}

export const TableComponent: React.FC<TableSpecProps> = ({
  headers,
  columns,
  rows = [],
  title,
  totalRow,
  total_row,
}) => {
  const headerCells = columns || headers || [];
  const totalCells = total_row || totalRow;

  return (
    <div className="table-visual-component my-3 overflow-x-auto">
      {title && (
        <div className="text-sm font-bold text-slate-800 text-center mb-2">{title}</div>
      )}
      <table className="min-w-full border-collapse border border-slate-300 text-sm bg-white text-center shadow-sm rounded">
        {headerCells.length > 0 && (
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-300">
              {headerCells.map((h, i) => (
                <th key={i} className="px-4 py-2 border-r border-slate-300 last:border-r-0">
                  <TextRenderer content={String(h)} />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="border-b border-slate-200 hover:bg-slate-50">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-4 py-2 border-r border-slate-200 last:border-r-0">
                  <TextRenderer content={String(cell)} />
                </td>
              ))}
            </tr>
          ))}
          {totalCells && (
            <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
              {totalCells.map((cell, idx) => (
                <td key={idx} className="px-4 py-2 border-r border-slate-200 last:border-r-0">
                  <TextRenderer content={String(cell)} />
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export interface BoxPlotGroup {
  name?: string;
  label?: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

export interface BoxPlotProps {
  groups?: BoxPlotGroup[];
  min?: number;
  q1?: number;
  median?: number;
  q3?: number;
  max?: number;
  axis?: { label?: string; min?: number; max?: number };
  width?: number;
  height?: number;
}

export const BoxPlotComponent: React.FC<BoxPlotProps> = ({
  groups,
  min,
  q1,
  median,
  q3,
  max,
  axis,
  width = 460,
  height = 200,
}) => {
  const plotData: BoxPlotGroup[] = groups || [
    {
      label: 'Datos',
      min: min ?? 10,
      q1: q1 ?? 20,
      median: median ?? 30,
      q3: q3 ?? 40,
      max: max ?? 50,
    },
  ];

  const allMins = plotData.map((g) => g.min);
  const allMaxs = plotData.map((g) => g.max);
  const minVal = axis?.min ?? Math.min(...allMins) - 5;
  const maxVal = axis?.max ?? Math.max(...allMaxs) + 5;

  const plotLeft = 80;
  const plotRight = width - 30;
  const axisPy = height - 35;

  const toPx = (v: number) =>
    plotLeft + ((v - minVal) / (maxVal - minVal)) * (plotRight - plotLeft);

  const rowHeight = (height - 60) / plotData.length;
  const ticks = niceTicks(minVal, maxVal, 7);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="box-plot-component bg-white border border-slate-200 rounded"
    >
      {/* Axis line */}
      <line x1={plotLeft} y1={axisPy} x2={plotRight} y2={axisPy} stroke="#64748b" strokeWidth={1.5} />

      {/* Axis title */}
      {axis?.label && (
        <text x={(plotLeft + plotRight) / 2} y={height - 8} fontSize={11} fontWeight="bold" fill="#334155" textAnchor="middle">
          {axis.label}
        </text>
      )}

      {/* Ticks */}
      {ticks.map((v, i) => {
        const px = toPx(v);
        return (
          <g key={`tick-${i}`}>
            <line x1={px} y1={axisPy - 3} x2={px} y2={axisPy + 3} stroke="#64748b" strokeWidth={1} />
            <text x={px} y={axisPy + 14} fontSize={9} fill="#64748b" textAnchor="middle">
              {v}
            </text>
          </g>
        );
      })}

      {plotData.map((group, idx) => {
        const y = 15 + idx * rowHeight + rowHeight / 2 - 12;
        const boxH = Math.min(rowHeight - 22, 30);

        const xMin = toPx(group.min);
        const xQ1 = toPx(group.q1);
        const xMed = toPx(group.median);
        const xQ3 = toPx(group.q3);
        const xMax = toPx(group.max);
        const midY = y + boxH / 2;

        return (
          <g key={idx}>
            {/* Label */}
            <text x={10} y={midY + 4} fontSize={11} fontWeight="bold" fill="#334155">
              {group.label || group.name || `Grupo ${idx + 1}`}
            </text>

            {/* Whiskers */}
            <line x1={xMin} y1={midY} x2={xQ1} y2={midY} stroke="#0284c7" strokeWidth={2} />
            <line x1={xQ3} y1={midY} x2={xMax} y2={midY} stroke="#0284c7" strokeWidth={2} />

            {/* End caps */}
            <line x1={xMin} y1={y + 2} x2={xMin} y2={y + boxH - 2} stroke="#0284c7" strokeWidth={2} />
            <line x1={xMax} y1={y + 2} x2={xMax} y2={y + boxH - 2} stroke="#0284c7" strokeWidth={2} />

            {/* Box */}
            <rect
              x={xQ1}
              y={y}
              width={Math.max(0, xQ3 - xQ1)}
              height={boxH}
              fill="rgba(56, 189, 248, 0.2)"
              stroke="#0284c7"
              strokeWidth={2}
            />

            {/* Median */}
            <line x1={xMed} y1={y} x2={xMed} y2={y + boxH} stroke="#e11d48" strokeWidth={2.5} />
          </g>
        );
      })}
    </svg>
  );
};

export interface DistributionCurveProps {
  skew?: 'negative' | 'positive' | 'symmetric';
  markers?: Array<{ label: string; value: number; dashed?: boolean; dashed_to_axis?: string }>;
  x_axis?: { label?: string; ticks?: number[] };
  width?: number;
  height?: number;
}

export const DistributionCurveComponent: React.FC<DistributionCurveProps> = ({
  skew = 'negative',
  markers = [
    { label: 'Mediana (80)', value: 80 },
    { label: 'Moda (85)', value: 85 },
  ],
  x_axis,
  width = 420,
  height = 210,
}) => {
  const markerValues = markers.map((m) => m.value);
  const tickValues = x_axis?.ticks || [];
  const allKnown = [...markerValues, ...tickValues];
  const dataMin = allKnown.length ? Math.min(...allKnown) : 70;
  const dataMax = allKnown.length ? Math.max(...allKnown) : 95;

  const pad = Math.max((dataMax - dataMin) * 0.35, 8);
  const xMin = dataMin - pad;
  const xMax = dataMax + pad;

  const left = 40;
  const right = width - 30;
  const baseline = height - 40;
  const amplitude = baseline - 30;

  const toPx = (v: number) => left + ((v - xMin) / (xMax - xMin)) * (right - left);

  const peakValue =
    skew === 'negative' ? dataMax : skew === 'positive' ? dataMin : (dataMin + dataMax) / 2;
  const sigmaLeft = (xMax - xMin) * (skew === 'positive' ? 0.32 : 0.2);
  const sigmaRight = (xMax - xMin) * (skew === 'negative' ? 0.32 : 0.2);

  const points: [number, number][] = [];
  const steps = 80;
  for (let i = 0; i <= steps; i++) {
    const v = xMin + ((xMax - xMin) * i) / steps;
    const sigma = v < peakValue ? sigmaLeft : sigmaRight;
    const gauss = Math.exp(-0.5 * Math.pow((v - peakValue) / sigma, 2));
    points.push([v, baseline - amplitude * gauss]);
  }

  const curveD = smoothPath(points, {
    toPixel: (x, y) => ({ px: toPx(x), py: y }),
  });

  const fillD = `${curveD} L ${toPx(xMax)} ${baseline} L ${toPx(xMin)} ${baseline} Z`;

  const ticks = x_axis?.ticks || niceTicks(dataMin, dataMax, 5);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="distribution-curve bg-white border border-slate-200 rounded"
    >
      {/* Axis */}
      <line x1={left} y1={baseline} x2={right} y2={baseline} stroke="#334155" strokeWidth={1.5} />

      {x_axis?.label && (
        <text x={(left + right) / 2} y={height - 8} fontSize={11} fontWeight="bold" fill="#334155" textAnchor="middle">
          {x_axis.label}
        </text>
      )}

      {/* Ticks */}
      {ticks.map((v, i) => {
        const px = toPx(v);
        return (
          <g key={`tick-${i}`}>
            <line x1={px} y1={baseline - 3} x2={px} y2={baseline + 3} stroke="#64748b" strokeWidth={1} />
            <text x={px} y={baseline + 14} fontSize={9} fill="#64748b" textAnchor="middle">
              {v}
            </text>
          </g>
        );
      })}

      {/* Curve */}
      <path d={fillD} fill="rgba(37, 99, 235, 0.1)" stroke="none" />
      <path d={curveD} fill="none" stroke="#2563eb" strokeWidth={2.5} strokeLinejoin="round" />

      {/* Markers */}
      {markers.map((m, i) => {
        const posX = toPx(m.value);
        return (
          <g key={i}>
            <line
              x1={posX}
              y1={baseline - amplitude * 0.5}
              x2={posX}
              y2={baseline}
              stroke="#e11d48"
              strokeDasharray={m.dashed ? '4,4' : undefined}
              strokeWidth={1.5}
            />
            <text x={posX} y={baseline - amplitude * 0.5 - 6} fontSize={10} fontWeight="bold" fill="#e11d48" textAnchor="middle">
              {m.label}
            </text>
            <circle cx={posX} cy={baseline} r={3} fill="#e11d48" />
          </g>
        );
      })}
    </svg>
  );
};

export interface VennDiagramProps {
  sets?: Array<string | { label: string; color?: string }>;
  region_values?: Record<string, number | string>;
  regions?: Record<string, number | string>;
  total?: number;
  region_labels_visible?: boolean;
  width?: number;
  height?: number;
}

const VENN_COLORS = ['#2563eb', '#dc2626', '#059669'];
const VENN_FILLS = ['rgba(59, 130, 246, 0.15)', 'rgba(239, 68, 68, 0.15)', 'rgba(16, 185, 129, 0.15)'];

export const VennDiagramComponent: React.FC<VennDiagramProps> = ({
  sets = [],
  region_values,
  regions,
  total,
  region_labels_visible = true,
  width = 400,
  height = 280,
}) => {
  const setLabels = sets.map((s, i) => (typeof s === 'string' ? s : s.label || `Set ${i + 1}`));
  const values = region_values || regions || {};
  const showValues = region_labels_visible && Object.keys(values).length > 0;

  const circles = [
    { cx: 190, cy: 105, r: 80 },
    { cx: 120, cy: 185, r: 80 },
    { cx: 260, cy: 185, r: 80 },
  ];

  const setLabelPos = [
    { x: 225, y: 42 },
    { x: 52, y: 232 },
    { x: 328, y: 232 },
  ];

  const regionPos: Record<string, { x: number; y: number }> = {
    A_only: { x: 190, y: 58 },
    B_only: { x: 66, y: 205 },
    C_only: { x: 314, y: 205 },
    A_B_only: { x: 118, y: 138 },
    A_C_only: { x: 262, y: 138 },
    B_C_only: { x: 190, y: 210 },
    A_B_C: { x: 190, y: 158 },
    outside: { x: 350, y: 58 },
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="venn-diagram bg-white border border-slate-200 rounded p-2"
    >
      {circles.slice(0, sets.length || 3).map((c, i) => (
        <circle
          key={`circle-${i}`}
          cx={c.cx}
          cy={c.cy}
          r={c.r}
          fill={VENN_FILLS[i % VENN_FILLS.length]}
          stroke={VENN_COLORS[i % VENN_COLORS.length]}
          strokeWidth={2}
        />
      ))}

      {setLabels.map((label, i) => (
        <text
          key={`set-${i}`}
          x={setLabelPos[i]?.x ?? 0}
          y={setLabelPos[i]?.y ?? 0}
          fontSize={13}
          fontWeight="bold"
          fill={VENN_COLORS[i % VENN_COLORS.length]}
          textAnchor="middle"
        >
          {label}
        </text>
      ))}

      {showValues &&
        Object.keys(regionPos).map((key) => {
          const value = values[key];
          if (value === undefined || value === null || value === '') return null;
          const pos = regionPos[key];
          return (
            <text key={key} x={pos.x} y={pos.y} fontSize={11} fontWeight="bold" fill="#0f172a" textAnchor="middle">
              {value}
            </text>
          );
        })}

      {total !== undefined && (
        <text x={width - 12} y={height - 10} fontSize={10} fill="#64748b" textAnchor="end">
          Total: {total}
        </text>
      )}
    </svg>
  );
};
