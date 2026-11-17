/**
 * CanvasErrorBoundary — Catches WebGL context loss or R3F render errors
 * and falls back to a CSS-only animated background.
 */
import React, { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** CSS fallback shown when WebGL fails */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Default CSS-only fallback: animated gradient with floating particles.
 * Used when WebGL is unavailable or R3F crashes.
 */
function CSSFallbackHero() {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Animated gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(6,182,212,0.15) 0%, rgba(10,17,40,0) 70%), ' +
            'radial-gradient(ellipse 60% 50% at 70% 60%, rgba(234,179,8,0.08) 0%, rgba(10,17,40,0) 70%), ' +
            'linear-gradient(180deg, #030712 0%, #0a1128 50%, #030712 100%)',
        }}
      />

      {/* CSS grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(34,211,238,0.5) 1px, transparent 1px), ' +
            'linear-gradient(90deg, rgba(34,211,238,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Floating CSS particles */}
      {Array.from({ length: 12 }).map((_, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${3 + (i % 4) * 2}px`,
            height: `${3 + (i % 4) * 2}px`,
            left: `${8 + (i * 7.5) % 85}%`,
            top: `${15 + (i * 11) % 70}%`,
            background: i % 3 === 0 ? '#22d3ee' : i % 3 === 1 ? '#facc15' : '#67e8f9',
            opacity: 0.25 + (i % 5) * 0.08,
            animation: `float-particle ${4 + (i % 3) * 2}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.4}s`,
          }}
        />
      ))}

      <style>{`
        @keyframes float-particle {
          0%   { transform: translateY(0) scale(1); opacity: 0.2; }
          100% { transform: translateY(-30px) scale(1.3); opacity: 0.45; }
        }
      `}</style>
    </div>
  );
}

export class CanvasErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn('[TrustAudit] WebGL/R3F error — falling back to CSS hero:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <CSSFallbackHero />;
    }
    return this.props.children;
  }
}

export { CSSFallbackHero };
