import React from 'react';
import { ComplaintPriority } from '../../types/index.ts';

interface PriorityBadgeProps {
  priority: ComplaintPriority | string;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'md' }) => {
  let style = 'bg-slate-100 text-slate-700 border-slate-200';
  let indicator = '●';

  switch (priority) {
    case 'High':
      style = 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
      indicator = '▲';
      break;
    case 'Medium':
      style = 'bg-sky-50 text-sky-700 border-sky-200 font-medium';
      indicator = '■';
      break;
    case 'Low':
      style = 'bg-slate-50 text-slate-600 border-slate-200';
      indicator = '▼';
      break;
  }

  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-0.5';

  return (
    <span className={`inline-flex items-center gap-1 rounded border ${style} ${sizeClasses}`}>
      <span className="text-[10px] opacity-75">{indicator}</span>
      <span>{priority}</span>
    </span>
  );
};
