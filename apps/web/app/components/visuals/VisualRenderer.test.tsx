import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { VisualRenderer } from './VisualRenderer';
import { GroupVisual } from './GroupVisual';
import { Group } from '../../types';

describe('VisualRenderer & GroupVisual', () => {
  it('renders Cartesian plane visual spec via registry', () => {
    const { container } = render(
      <VisualRenderer
        spec={{
          type: 'cartesian_2d',
          alt: 'Circulo de prueba',
          children: [{ type: 'circle', center: [0, 0], radius: 2 }],
        }}
      />
    );

    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders shared GroupVisual context and graphic', () => {
    const mockGroup: Group = {
      group_id: 'g_test',
      items: [26, 27],
      title: 'Precio del combustible',
      context_text: 'Contexto de prueba para combustible',
      visual_spec: {
        type: 'cartesian_2d',
        alt: 'Grafico de precios',
      },
    };

    render(<GroupVisual group={mockGroup} />);

    expect(screen.getByText('Precio del combustible')).toBeInTheDocument();
    expect(screen.getByText(/Contexto de prueba para combustible/)).toBeInTheDocument();
  });
});
