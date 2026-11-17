import React from 'react';
import { cn } from '../../lib/cn';

type StatusDotVariant = 'connected' | 'error' | 'pending' | 'inactive';

interface StatusDotProps {
  status: StatusDotVariant;
  label?: string;
  className?: string;
}

const dotColors: Record<StatusDotVariant, string> = {
  connected: 'bg-emerald-400',
  error: 'bg-red-400',
  pending: 'bg-amber-400',
  inactive: 'bg-slate-500',
};

const pulseVariants: Record<StatusDotVariant, boolean> = {
  connected: false,
  error: false,
  pending: true,
  inactive: false,
};

export const StatusDot: React.FC<StatusDotProps> = ({ status, label, className }) => (
  <span className={cn('inline-flex items-center gap-2', className)}>
    <span className="relative flex h-2.5 w-2.5">
      {pulseVariants[status] && (
        <span
          className={cn(
            'absolute inset-0 rounded-full animate-ping opacity-75',
            dotColors[status]
          )}
        />
      )}
      <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', dotColors[status])} />
    </span>
    {label && <span className="text-xs text-slate-400">{label}</span>}
  </span>
);
