/* eslint-disable react/no-children-prop */
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CartesianPlane } from './CartesianPlane';
import { FunctionPlot, MultiViewGrid } from './FunctionsComposites';

describe('Geometry and Functions Composites', () => {
  it('renders CartesianPlane with circle child', () => {
    const { container } = render(
      <CartesianPlane
        domain={{ x: [-5, 5], y: [-5, 5] }}
        children={[{ type: 'circle', center: [0, 0], radius: 3, label: 'c' }]}
      />
    );

    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('circle')).toBeInTheDocument();
  });

  it('renders FunctionPlot quadratic curve', () => {
    const { container } = render(
      <FunctionPlot form="quadratic" params={{ a: 1, b: 0, c: -4 }} />
    );

    expect(container.querySelector('path')).toBeInTheDocument();
  });

  it('renders MultiViewGrid with view labels', () => {
    render(
      <MultiViewGrid
        layout={{ rows: 1, cols: 2 }}
        views={[
          { label: 'Opción A', visual: {} },
          { label: 'Opción B', visual: {} },
        ]}
      />
    );

    expect(screen.getByText('Opción A')).toBeInTheDocument();
    expect(screen.getByText('Opción B')).toBeInTheDocument();
  });

  it('renders polygon from content-shape vertices', () => {
    const { container } = render(
      <CartesianPlane
        domain={{ x: [0, 6], y: [0, 8] }}
        grid
        children={[
          {
            type: 'polygon',
            vertices: [[3, 7], [1, 4], [3, 1], [5, 4]],
            labels: ['Q', 'R', 'P', 'S'],
          },
        ]}
      />
    );

    expect(container.querySelector('polygon')).toBeInTheDocument();
    expect(screen.getByText('Q')).toBeInTheDocument();
  });

  it('renders line from through points and dashed projections', () => {
    const { container } = render(
      <CartesianPlane
        domain={{ x: [-4, 8], y: [-4, 7] }}
        children={[
          { type: 'line', through: [[0, -3], [6, 0]] },
          { type: 'dashed_projection', from: [6, 0], to_axis: 'x' },
        ]}
      />
    );

    expect(container.querySelector('line')).toBeInTheDocument();
    expect(container.querySelectorAll('line[stroke-dasharray]').length).toBeGreaterThan(0);
  });

  it('renders FunctionPlot from vertex/roots params', () => {
    const { container } = render(
      <FunctionPlot
        form="quadratic"
        params={{ vertex: [-1, 5], roots: [-4, 2], opens: 'down' }}
      />
    );

    expect(container.querySelector('path')).toBeInTheDocument();
  });
});
