import React from 'react';
import { cn } from '../../lib/cn';

interface PageHeaderProps {
  title: string;
  /** Short subtitle text (alias: description) */
  subtitle?: string;
  /** Alias for subtitle — used by redesigned pages */
  description?: string;
  /** Icon rendered before the title */
  icon?: React.ReactNode;
  /** Legacy single action slot */
  action?: React.ReactNode;
  /** Children rendered in the action area (preferred over `action`) */
  children?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  description,
  icon,
  action,
  children,
  className,
}) => {
  const subText = subtitle || description;
  const actionSlot = children || action;

  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8', className)}>
      <div>
        <h2 className="text-2xl font-display font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          {icon}
          {title}
        </h2>
        {subText && (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{subText}</p>
        )}
      </div>
      {actionSlot && <div className="shrink-0">{actionSlot}</div>}
    </div>
  );
};
