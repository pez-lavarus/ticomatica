/* eslint-disable @typescript-eslint/no-explicit-any */
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { VisualRenderer } from './VisualRenderer';
import { GroupVisual } from './GroupVisual';
import questionsJson from '../../../data/2026_2/questions.json';
import groupsJson from '../../../data/2026_2/groups.json';
import type { Group } from '../../types';

describe('Content visual spec integration', () => {
  it('renders every per-item visual_spec without falling back', () => {
    const items = (questionsJson as any).items || [];
    const withVisuals = items.filter((item: any) => item.visual_spec);

    expect(withVisuals.length).toBeGreaterThan(0);

    for (const item of withVisuals) {
      const { container } = render(
        <VisualRenderer spec={item.visual_spec} itemId={item.id} />
      );

      const hasGraphic =
        container.querySelector('svg') !== null ||
        container.querySelector('table') !== null;

      expect(
        hasGraphic,
        `item ${item.id} (${item.topic}) should render a graphic`
      ).toBe(true);
    }
  });

  it('renders every group visual_spec without falling back', () => {
    const groups: Group[] = (groupsJson as any).groups || [];
    const withVisuals = groups.filter((g) => g.visual_spec);

    expect(withVisuals.length).toBeGreaterThan(0);

    for (const group of withVisuals) {
      const { container } = render(<GroupVisual group={group} />);

      const hasGraphic =
        container.querySelector('svg') !== null ||
        container.querySelector('table') !== null;

      expect(
        hasGraphic,
        `group ${group.group_id} should render a graphic`
      ).toBe(true);
    }
  });
});
