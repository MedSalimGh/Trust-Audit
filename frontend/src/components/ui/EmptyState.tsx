import React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '../../lib/cn';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => (
  <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
    <div className="mb-4 text-slate-600">
      {icon || <Inbox className="h-12 w-12" />}
    </div>
    <h3 className="text-lg font-display font-semibold text-slate-800 dark:text-slate-200 mb-1">{title}</h3>
    {description && <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mb-4">{description}</p>}
    {action && <div>{action}</div>}
  </div>
);
