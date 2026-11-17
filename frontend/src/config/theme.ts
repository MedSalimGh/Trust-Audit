/**
 * TrustAudit Design System — "The Vault"
 * Single source of truth for all design tokens.
 */

// ─── Color Palette ───────────────────────────────────────────────────────────
export const colors = {
  midnight: {
    950: '#030712',
    900: '#0a1128',
    800: '#111d3a',
    700: '#1a2d52',
    600: '#243d6a',
  },
  cyan: {
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',
    600: '#0891b2',
  },
  gold: {
    300: '#fde047',
    400: '#facc15',
    500: '#eab308',
  },
  red: {
    400: '#f87171',
    500: '#ef4444',
  },
  amber: {
    400: '#fbbf24',
    500: '#f59e0b',
  },
  emerald: {
    400: '#34d399',
    500: '#10b981',
  },
  slate: {
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
  },
} as const;

// ─── Elevation / Glassmorphism ───────────────────────────────────────────────
export const elevation = {
  base: {
    background: colors.midnight[950],
    description: 'Page background',
  },
  raised: {
    background: 'rgba(10, 17, 40, 0.7)',
    backdropFilter: 'blur(16px)',
    border: `1px solid rgba(34, 211, 238, 0.08)`,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    description: 'Cards, panels',
  },
  overlay: {
    background: 'rgba(17, 29, 58, 0.85)',
    backdropFilter: 'blur(24px)',
    border: `1px solid rgba(34, 211, 238, 0.12)`,
    boxShadow: '0 16px 64px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    description: 'Modals, dropdowns, tooltips',
  },
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────
export const typography = {
  fontFamily: {
    display: "'Space Grotesk', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  fontSize: {
    display: 'clamp(2.5rem, 5vw, 4.5rem)',
    h1: 'clamp(2rem, 3.5vw, 3rem)',
    h2: 'clamp(1.5rem, 2.5vw, 2rem)',
    h3: '1.25rem',
    body: '1rem',
    bodySmall: '0.875rem',
    caption: '0.75rem',
    mono: '0.8125rem',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  letterSpacing: {
    display: '-0.03em',
    heading: '-0.02em',
    h3: '-0.01em',
    body: 'normal',
    caption: '0.01em',
  },
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────
export const spacing = {
  px: '1px',
  0: '0',
  0.5: '2px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
  32: '128px',
} as const;

// ─── Border Radius ───────────────────────────────────────────────────────────
export const radius = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const;

// ─── Animation ───────────────────────────────────────────────────────────────
export const animation = {
  duration: {
    fast: 150,
    normal: 200,
    slow: 300,
    page: 400,
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;

// ─── Status Colors ───────────────────────────────────────────────────────────
export const statusColors = {
  approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
  rejected: { bg: 'bg-red-500/10', text: 'text-red-700 dark:text-red-400', border: 'border-red-500/30', dot: 'bg-red-500' },
  pending: { bg: 'bg-amber-500/10', text: 'text-amber-800 dark:text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  registered: { bg: 'bg-cyan-500/10', text: 'text-cyan-800 dark:text-cyan-400', border: 'border-cyan-500/30', dot: 'bg-cyan-500' },
  escalated: { bg: 'bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-500/30', dot: 'bg-purple-500' },
} as const;

export const riskColors = {
  low: { bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-500/30' },
  medium: { bg: 'bg-amber-500/10', text: 'text-amber-800 dark:text-amber-400', border: 'border-amber-500/30' },
  high: { bg: 'bg-red-500/10', text: 'text-red-700 dark:text-red-400', border: 'border-red-500/30' },
} as const;

export const roleColors = {
  OPERATOR: { bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-500/30' },
  COMPLIANCE: { bg: 'bg-cyan-500/10', text: 'text-cyan-800 dark:text-cyan-400', border: 'border-cyan-500/30' },
  RISK_MANAGER: { bg: 'bg-amber-500/10', text: 'text-amber-800 dark:text-amber-400', border: 'border-amber-500/30' },
  DIRECTOR: { bg: 'bg-amber-500/15', text: 'text-amber-900 dark:text-yellow-400', border: 'border-amber-500/30' },
  AUDITOR: { bg: 'bg-slate-100 dark:bg-slate-500/10', text: 'text-slate-700 dark:text-slate-400', border: 'border-slate-300 dark:border-slate-500/20' },
  ADMIN: { bg: 'bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-500/30' },
} as const;
