import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '../../lib/cn';

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, children, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 rounded-lg px-3 py-1.5 text-xs font-medium',
        'glass-elevated text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10',
        'data-[state=delayed-open]:animate-fade-in data-[state=closed]:animate-fade-out',
        className
      )}
      {...props}
    >
      {children}
      <TooltipPrimitive.Arrow className="fill-slate-200 dark:fill-midnight-700" />
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = 'TooltipContent';
