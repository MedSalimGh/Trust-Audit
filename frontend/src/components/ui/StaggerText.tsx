import React from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { ANIMATION_CONFIG } from '../../lib/animations';
import { cn } from '../../lib/cn';

export interface StaggerTextProps extends React.HTMLAttributes<HTMLElement> {
  text: string;
  as?: React.ElementType;
  className?: string;
  delay?: number; // Base delay in ms
  charDelay?: number; // Delay per char in ms (default 42ms)
}

export const StaggerText: React.FC<StaggerTextProps> = ({
  text,
  as: Component = 'span',
  className,
  delay = 0,
  charDelay = ANIMATION_CONFIG.staggerCharDelayMs,
  style,
  ...props
}) => {
  const { ref, isRevealed, hasReducedMotion } = useScrollReveal<HTMLElement>();

  // If user prefers reduced motion, render original text immediately for accessibility
  if (hasReducedMotion) {
    return (
      <Component ref={ref} className={className} style={style} {...props}>
        {text}
      </Component>
    );
  }

  // Split into words while keeping whitespace tokens so words don't break across lines
  const tokens = text.split(/(\s+)/);
  let globalCharIndex = 0;

  return (
    <Component
      ref={ref}
      aria-label={text}
      className={cn('inline-block select-text', className)}
      style={style}
      {...props}
    >
      <span aria-hidden="true" className="inline">
        {tokens.map((token, tokenIdx) => {
          // If token is whitespace, render as-is
          if (/^\s+$/.test(token)) {
            // Count characters in whitespace for natural timing cadence
            globalCharIndex += token.length;
            return (
              <span key={`space-${tokenIdx}`} className="inline">
                {token}
              </span>
            );
          }

          // Otherwise, word token: wrap in nowrap container to avoid mid-word line breaking
          const chars = Array.from(token);
          const wordElements = (
            <span key={`word-${tokenIdx}`} className="inline-block whitespace-nowrap">
              {chars.map((char, charIdx) => {
                const charDelayMs = delay + globalCharIndex * charDelay;
                globalCharIndex++;

                return (
                  <span
                    key={`char-${tokenIdx}-${charIdx}`}
                    className="inline-block"
                    style={{
                      opacity: isRevealed ? 1 : 0,
                      transform: isRevealed
                        ? 'translateY(0)'
                        : `translateY(${ANIMATION_CONFIG.initialCharTranslateY})`,
                      transition: `opacity ${ANIMATION_CONFIG.durationMs}ms ${ANIMATION_CONFIG.easing} ${charDelayMs}ms, transform ${ANIMATION_CONFIG.durationMs}ms ${ANIMATION_CONFIG.easing} ${charDelayMs}ms`,
                      willChange: isRevealed ? 'auto' : 'opacity, transform',
                    }}
                  >
                    {char}
                  </span>
                );
              })}
            </span>
          );

          return wordElements;
        })}
      </span>
    </Component>
  );
};

export default StaggerText;
