import React from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { ANIMATION_CONFIG } from '../../lib/animations';
import { cn } from '../../lib/cn';

export interface ScrollRevealProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  delay?: number; // ms
  className?: string;
  as?: React.ElementType;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  delay = 0,
  className,
  as: Component = 'div',
  style,
  ...props
}) => {
  const { ref, isRevealed, hasReducedMotion } = useScrollReveal<HTMLDivElement>();

  // If user prefers reduced motion, render immediately without transform
  if (hasReducedMotion) {
    return (
      <Component ref={ref} className={className} style={style} {...props}>
        {children}
      </Component>
    );
  }

  const revealStyle: React.CSSProperties = {
    opacity: isRevealed ? 1 : 0,
    transform: isRevealed ? 'translateY(0)' : `translateY(${ANIMATION_CONFIG.initialTranslateY})`,
    transition: `opacity ${ANIMATION_CONFIG.durationMs}ms ${ANIMATION_CONFIG.easing} ${delay}ms, transform ${ANIMATION_CONFIG.durationMs}ms ${ANIMATION_CONFIG.easing} ${delay}ms`,
    willChange: isRevealed ? 'auto' : 'opacity, transform',
    ...style,
  };

  return (
    <Component
      ref={ref}
      className={cn('scroll-reveal-item', className)}
      style={revealStyle}
      {...props}
    >
      {children}
    </Component>
  );
};

export default ScrollReveal;
