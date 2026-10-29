/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import type { VisualSpec } from '../../types';
import { CartesianPlane } from './composites/CartesianPlane';
import { FunctionPlot, MultiViewGrid, CurveRegion, TransformationOverlay } from './composites/FunctionsComposites';
import {
  TableComponent,
  BoxPlotComponent,
  DistributionCurveComponent,
  VennDiagramComponent,
} from './composites/StatisticsComposites';

interface VisualRendererProps {
  spec?: VisualSpec | null;
  alt?: string;
  itemId?: number;
  className?: string;
}

interface ErrorBoundaryProps {
  alt?: string;
  itemId?: number;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class VisualErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`VisualRenderer Error on item ${this.props.itemId}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="visual-error-fallback p-3 border border-border bg-muted rounded-sm text-foreground text-xs my-2">
          <p className="font-bold">Representación gráfica no disponible</p>
          {this.props.alt && <p className="text-[11px] text-muted-foreground italic mt-1">{this.props.alt}</p>}
        </div>
      );
    }
    return this.props.children;
  }
}

export const VisualRenderer: React.FC<VisualRendererProps> = ({
  spec,
  alt,
  itemId,
  className = '',
}) => {
  if (!spec) return null;

  // Unpack nested visual if present
  const activeSpec = spec.visual || spec;
  const type = activeSpec.type || 'cartesian_2d';
  const accessibleAlt = alt || activeSpec.alt || 'Representación matemática';

  const renderComponent = () => {
    switch (type) {
      case 'cartesian_2d':
      case 'cartesian_plane':
        return <CartesianPlane {...(activeSpec as any)} />;

      case 'multi_view_grid':
      case 'multi_view':
        return (
          <MultiViewGrid
            {...(activeSpec as any)}
            renderVisual={(nestedSpec) => <VisualRenderer spec={nestedSpec} />}
          />
        );

      case 'function_plot':
        return <FunctionPlot {...(activeSpec as any)} />;

      case 'curve_region':
        return <CurveRegion {...(activeSpec as any)} />;

      case 'transformation_overlay':
        return <TransformationOverlay {...(activeSpec as any)} />;

      case 'table':
      case 'frequency_table':
      case 'weighted_table':
      case 'summary_table':
      case 'contingency_table':
      case 'stats_table':
        return <TableComponent {...(activeSpec as any)} />;

      case 'box_plot':
      case 'box_plot_group':
        return <BoxPlotComponent {...(activeSpec as any)} />;

      case 'distribution_curve':
        return <DistributionCurveComponent {...(activeSpec as any)} />;

      case 'venn_diagram':
      case 'venn_3set':
        return <VennDiagramComponent {...(activeSpec as any)} />;

      default:
        // Default fallback to CartesianPlane
        return <CartesianPlane {...(activeSpec as any)} />;
    }
  };

  return (
    <VisualErrorBoundary alt={accessibleAlt} itemId={itemId}>
      <figure
        role="img"
        aria-label={accessibleAlt}
        className={`visual-renderer my-4 w-full flex flex-col items-center justify-center overflow-x-auto ${className}`}
      >
        <div className="w-full max-w-full flex justify-center overflow-x-auto py-1">
          {renderComponent()}
        </div>
        {accessibleAlt && (
          <figcaption className="sr-only">{accessibleAlt}</figcaption>
        )}
      </figure>
    </VisualErrorBoundary>
  );
};
