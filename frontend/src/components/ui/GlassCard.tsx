import React from 'react';
import { cn } from '../../lib/cn';

type GlassVariant = 'default' | 'elevated' | 'bordered' | 'interactive';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GlassVariant;
  as?: React.ElementType;
  /** Enable hover lift + glow micro-interaction. Default: false */
  hoverEffect?: boolean;
}

const variantClasses: Record<GlassVariant, string> = {
  default: 'glass',
  elevated: 'glass-elevated',
  bordered: 'glass-bordered',
  interactive: 'glass-interactive',
};

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ variant = 'default', as: Component = 'div', hoverEffect = false, className, children, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          variantClasses[variant],
          'rounded-glass',
          hoverEffect && 'hover-lift hover-glow',
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

GlassCard.displayName = 'GlassCard';
