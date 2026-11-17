import React from 'react';
import { cn } from '../../lib/cn';

type BadgeVariant =
  | 'approved' | 'rejected' | 'pending' | 'registered' | 'escalated'
  | 'high-risk' | 'medium-risk' | 'low-risk'
  | 'outline' | 'default';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
  pulse?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  approved: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  rejected: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
  pending: 'bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/30',
  registered: 'bg-cyan-500/10 text-cyan-800 dark:text-cyan-400 border-cyan-500/30',
  escalated: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
  'high-risk': 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
  'medium-risk': 'bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/30',
  'low-risk': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  outline: 'bg-slate-50 dark:bg-transparent text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600',
  default: 'bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-500/20',
};

const dotColors: Record<BadgeVariant, string> = {
  approved: 'bg-emerald-500 dark:bg-emerald-400', rejected: 'bg-red-500 dark:bg-red-400', pending: 'bg-amber-500 dark:bg-amber-400',
  registered: 'bg-cyan-500 dark:bg-cyan-400', escalated: 'bg-purple-500 dark:bg-purple-400',
  'high-risk': 'bg-red-500 dark:bg-red-400', 'medium-risk': 'bg-amber-500 dark:bg-amber-400', 'low-risk': 'bg-emerald-500 dark:bg-emerald-400',
  outline: 'bg-slate-500 dark:bg-slate-400', default: 'bg-slate-500 dark:bg-slate-400',
};

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', dot = false, pulse = false, className, children, ...props }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant], pulse && 'animate-pulse')} />
      )}
      {children}
    </span>
  );
};
