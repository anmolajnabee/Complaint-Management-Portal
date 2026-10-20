import React from 'react';
import { ComplaintStatus } from '../../types/index.ts';

interface StatusBadgeProps {
  status: ComplaintStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  let bg = 'bg-slate-100 text-slate-800 border-slate-300';
  let dot = 'bg-slate-500';

  switch (status) {
    case 'Pending':
      bg = 'bg-amber-50 text-amber-800 border-amber-200';
      dot = 'bg-amber-500';
      break;
    case 'In Progress':
      bg = 'bg-blue-50 text-blue-800 border-blue-200';
      dot = 'bg-blue-600 animate-pulse';
      break;
    case 'Resolved':
      bg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      dot = 'bg-emerald-600';
      break;
    case 'Rejected':
      bg = 'bg-rose-50 text-rose-800 border-rose-200';
      dot = 'bg-rose-600';
      break;
    case 'Reopened':
      bg = 'bg-purple-50 text-purple-800 border-purple-200';
      dot = 'bg-purple-600 animate-pulse';
      break;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs font-medium px-2.5 py-1',
    lg: 'text-sm font-semibold px-3 py-1.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${bg} ${sizeClasses} tracking-tight font-sans`}
      role="status"
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
};
