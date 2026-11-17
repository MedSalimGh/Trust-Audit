/**
 * AnimatedSection — Framer Motion wrapper that reveals children
 * when they scroll into the viewport.
 *
 * Respects prefers-reduced-motion: renders children immediately
 * without animation when the user prefers reduced motion.
 *
 * Usage:
 *   <AnimatedSection>
 *     <GlassCard>…</GlassCard>
 *   </AnimatedSection>
 *
 *   <AnimatedSection variant="slideLeft" delay={0.2}>…</AnimatedSection>
 */
import React from 'react';
import { motion, useReducedMotion, type Variant } from 'framer-motion';

type AnimationVariant = 'fadeUp' | 'fadeIn' | 'scaleIn' | 'slideLeft' | 'slideRight';

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  /** Animation style. Default: 'fadeUp' */
  variant?: AnimationVariant;
  /** Delay in seconds before animation starts. Default: 0 */
  delay?: number;
  /** Duration in seconds. Default: 0.5 */
  duration?: number;
  /** How much of the element must be visible before triggering. Default: 0.15 */
  threshold?: number;
  /** Whether to animate only once. Default: true */
  once?: boolean;
}

const variantMap: Record<AnimationVariant, { hidden: Variant; visible: Variant }> = {
  fadeUp: {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0 },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.92 },
    visible: { opacity: 1, scale: 1 },
  },
  slideLeft: {
    hidden: { opacity: 0, x: 40 },
    visible: { opacity: 1, x: 0 },
  },
  slideRight: {
    hidden: { opacity: 0, x: -40 },
    visible: { opacity: 1, x: 0 },
  },
};

export const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  children,
  className,
  variant = 'fadeUp',
  delay = 0,
  duration = 0.5,
  threshold = 0.15,
  once = true,
}) => {
  const reducedMotion = useReducedMotion();

  // Skip animation for reduced motion users
  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const { hidden, visible } = variantMap[variant];

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: threshold }}
      variants={{
        hidden,
        visible: {
          ...visible,
          transition: {
            duration,
            delay,
            ease: [0.22, 1, 0.36, 1], // custom ease-out
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * StaggerContainer — Parent wrapper that staggers children animations.
 *
 * Usage:
 *   <StaggerContainer>
 *     <StaggerItem><Card /></StaggerItem>
 *     <StaggerItem><Card /></StaggerItem>
 *   </StaggerContainer>
 */
interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  /** Delay between each child. Default: 0.08 */
  staggerDelay?: number;
  /** How much of the container must be visible. Default: 0.1 */
  threshold?: number;
}

export const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  className,
  staggerDelay = 0.08,
  threshold = 0.1,
}) => {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: threshold }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
};

export const StaggerItem: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
        },
      }}
    >
      {children}
    </motion.div>
  );
};
