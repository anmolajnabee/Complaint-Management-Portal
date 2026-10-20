import React from 'react';
import { SlaStatus } from '../../types/index.ts';
import { Clock, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

interface SlaBadgeProps {
  status: SlaStatus;
  size?: 'sm' | 'md';
}

export const SlaBadge: React.FC<SlaBadgeProps> = ({ status, size = 'md' }) => {
  let style = 'bg-slate-100 text-slate-700 border-slate-200';
  let Icon = Clock;

  switch (status) {
    case 'On Track':
      style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      Icon = Clock;
      break;
    case 'Due Soon':
      style = 'bg-amber-50 text-amber-800 border-amber-300 font-medium animate-pulse';
      Icon = AlertTriangle;
      break;
    case 'Overdue':
      style = 'bg-red-50 text-red-700 border-red-300 font-semibold';
      Icon = AlertCircle;
      break;
    case 'Resolved Within SLA':
      style = 'bg-teal-50 text-teal-800 border-teal-200';
      Icon = CheckCircle;
      break;
    case 'Resolved After SLA':
      style = 'bg-purple-50 text-purple-800 border-purple-200';
      Icon = Clock;
      break;
  }

  const iconSize = size === 'sm' ? 12 : 14;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${style} ${padding}`}>
      <Icon size={iconSize} aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
};
