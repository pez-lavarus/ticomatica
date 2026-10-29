import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  TableComponent,
  BoxPlotComponent,
  DistributionCurveComponent,
  VennDiagramComponent,
} from './StatisticsComposites';

describe('Statistics Composite Components', () => {
  it('renders TableComponent with headers and data rows', () => {
    render(
      <TableComponent
        headers={['Distancia (km)', 'Frecuencia']}
        rows={[
          ['0 - 5', 12],
          ['5 - 10', 18],
        ]}
      />
    );

    expect(screen.getByText(/Distancia/)).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('renders BoxPlotComponent SVG and box element', () => {
    const { container } = render(
      <BoxPlotComponent
        min={10}
        q1={20}
        median={30}
        q3={40}
        max={50}
      />
    );

    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('rect')).toBeInTheDocument();
  });

  it('renders DistributionCurveComponent path', () => {
    const { container } = render(<DistributionCurveComponent skew="negative" />);
    expect(container.querySelector('path')).toBeInTheDocument();
  });

  it('renders VennDiagramComponent with set labels', () => {
    render(
      <VennDiagramComponent
        sets={[{ label: 'Música' }, { label: 'Pintura' }, { label: 'Ballet' }]}
      />
    );

    expect(screen.getByText('Música')).toBeInTheDocument();
    expect(screen.getByText('Pintura')).toBeInTheDocument();
    expect(screen.getByText('Ballet')).toBeInTheDocument();
  });

  it('renders TableComponent from content-shape columns and total_row', () => {
    render(
      <TableComponent
        columns={['Kilómetros', 'Estudiantes']}
        rows={[['0 - 10', 50], ['10 - 20', 30]]}
        total_row={['Total', 80]}
      />
    );

    expect(screen.getByText('Kilómetros')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
  });

  it('renders BoxPlotComponent from content-shape group labels', () => {
    render(
      <BoxPlotComponent
        groups={[
          { label: 'Empresa A', min: 23, q1: 30, median: 38, q3: 45, max: 52 },
          { label: 'Empresa B', min: 19, q1: 25, median: 33, q3: 40, max: 52 },
        ]}
      />
    );

    expect(screen.getByText('Empresa A')).toBeInTheDocument();
    expect(screen.getByText('Empresa B')).toBeInTheDocument();
  });

  it('renders VennDiagramComponent with string sets and region values', () => {
    const { container } = render(
      <VennDiagramComponent
        sets={['Música', 'Pintura', 'Ballet']}
        region_values={{ A_only: 8, B_only: 11, C_only: 17, A_B_C: 0 }}
      />
    );

    expect(screen.getByText('Música')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(container.querySelectorAll('circle').length).toBe(3);
  });
});
