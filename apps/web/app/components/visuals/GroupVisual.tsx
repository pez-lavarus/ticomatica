import React from 'react';
import type { Group } from '../../types';
import { TextRenderer } from '../common/TextRenderer';
import { VisualRenderer } from './VisualRenderer';

interface GroupVisualProps {
  group?: Group | null;
  className?: string;
}

export const GroupVisual: React.FC<GroupVisualProps> = ({ group, className = '' }) => {
  if (!group) return null;

  return (
    <div className={`group-visual-card p-4 sm:p-5 my-4 bg-zinc-50 border-2 border-zinc-900 rounded-xl shadow-xs overflow-hidden ${className}`}>
      {group.title && (
        <h3 className="text-sm sm:text-base font-bold text-zinc-900 mb-2 border-b-2 border-zinc-900 pb-1.5 uppercase tracking-wide">
          {group.title}
        </h3>
      )}
      {group.context_text && (
        <div className="text-xs sm:text-sm text-zinc-800 leading-relaxed mb-3">
          <TextRenderer content={group.context_text} />
        </div>
      )}
      {group.visual_spec && (
        <div className="flex justify-center mt-2 w-full overflow-x-auto">
          <VisualRenderer spec={group.visual_spec} alt={group.visual_spec.alt} />
        </div>
      )}
    </div>
  );
};
