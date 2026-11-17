/**
 * TrustAudit Animation System Configuration
 *
 * Centralized motion specifications:
 * - Scroll-triggered reveal: 900ms duration, cubic-bezier(0.16, 1, 0.3, 1), threshold 0.16, rootMargin -8%
 * - Staggered text reveal: 42ms per character, translateY(0.32em) -> translateY(0)
 * - Micro-interactions: cubic-bezier(0.16, 1, 0.3, 1) easing on active/hover states
 */

export const ANIMATION_CONFIG = {
  // Scroll reveal constants
  durationMs: 900,
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easingCubic: [0.16, 1, 0.3, 1] as const,
  threshold: 0.16,
  rootMargin: '0px 0px -8% 0px',
  initialTranslateY: '20px',

  // Staggered text constants
  staggerCharDelayMs: 42,
  initialCharTranslateY: '0.32em',

  // Sequential section item delays (ms)
  delays: {
    badge: 0,
    heading: 100,
    description: 200,
    content: 280,
    actions: 360,
  },
} as const;
