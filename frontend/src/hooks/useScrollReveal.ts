import { useState, useEffect, useRef } from 'react';
import { ANIMATION_CONFIG } from '../lib/animations';

interface UseScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  disabled?: boolean;
}

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollRevealOptions = {}
) {
  const {
    threshold = ANIMATION_CONFIG.threshold,
    rootMargin = ANIMATION_CONFIG.rootMargin,
    disabled = false,
  } = options;

  const elementRef = useRef<T | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [hasReducedMotion, setHasReducedMotion] = useState(false);

  useEffect(() => {
    // 1. Check prefers-reduced-motion
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mediaQuery.matches) {
        setHasReducedMotion(true);
        setIsRevealed(true);
        return;
      }

      const handleChange = (e: MediaQueryListEvent) => {
        setHasReducedMotion(e.matches);
        if (e.matches) setIsRevealed(true);
      };

      mediaQuery.addEventListener('change', handleChange);

      // If disabled, immediately reveal
      if (disabled) {
        setIsRevealed(true);
        return () => mediaQuery.removeEventListener('change', handleChange);
      }

      // Check IntersectionObserver support
      if (!('IntersectionObserver' in window)) {
        setIsRevealed(true);
        return () => mediaQuery.removeEventListener('change', handleChange);
      }

      const element = elementRef.current;
      if (!element) {
        return () => mediaQuery.removeEventListener('change', handleChange);
      }

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setIsRevealed(true);
              // Trigger only once per element
              observer.unobserve(entry.target);
            }
          }
        },
        { threshold, rootMargin }
      );

      observer.observe(element);

      return () => {
        observer.disconnect();
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
  }, [threshold, rootMargin, disabled]);

  return {
    ref: elementRef,
    isRevealed,
    hasReducedMotion,
  };
}
