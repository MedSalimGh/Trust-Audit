import type { ApprovalRoleName } from '../types';

/**
 * TrustAudit Route Definitions
 * Central configuration for all routes with role-based access control.
 */

export interface RouteConfig {
  path: string;
  label: string;
  /** Roles allowed to access this route. Empty = public. null = any authenticated user. */
  allowedRoles: ApprovalRoleName[] | null;
  /** Whether to show in the main navigation */
  showInNav: boolean;
  /** Icon name from lucide-react */
  icon: string;
}

export const routes: Record<string, RouteConfig> = {
  landing: {
    path: '/',
    label: 'Home',
    allowedRoles: null, // public
    showInNav: false,
    icon: 'Home',
  },
  dashboard: {
    path: '/dashboard',
    label: 'Dashboard',
    allowedRoles: [], // any authenticated role
    showInNav: true,
    icon: 'LayoutDashboard',
  },
  approvals: {
    path: '/approvals',
    label: 'Approval Center',
    allowedRoles: ['COMPLIANCE', 'RISK_MANAGER', 'DIRECTOR', 'AUDITOR', 'ADMIN'],
    showInNav: true,
    icon: 'ShieldCheck',
  },
  tamperLab: {
    path: '/tamper-lab',
    label: 'Tamper Lab',
    allowedRoles: ['COMPLIANCE', 'RISK_MANAGER', 'DIRECTOR', 'AUDITOR', 'ADMIN'],
    showInNav: true,
    icon: 'FlaskConical',
  },
  certificates: {
    path: '/certificates',
    label: 'Certificates',
    allowedRoles: ['COMPLIANCE', 'RISK_MANAGER', 'DIRECTOR', 'AUDITOR', 'ADMIN'],
    showInNav: true,
    icon: 'Award',
  },
  simulator: {
    path: '/simulator',
    label: 'Bank Simulator',
    allowedRoles: ['OPERATOR', 'ADMIN'],
    showInNav: true,
    icon: 'Server',
  },
} as const;

/**
 * Check if a set of roles can access a route.
 */
export function canAccessRoute(
  route: RouteConfig,
  userRoles: ApprovalRoleName[]
): boolean {
  // Public route
  if (route.allowedRoles === null) return true;
  // Any authenticated user
  if (route.allowedRoles.length === 0) return userRoles.length > 0;
  // ADMIN can access everything
  if (userRoles.includes('ADMIN')) return true;
  // Check role intersection
  return route.allowedRoles.some((r) => userRoles.includes(r));
}

/**
 * Get navigation items visible to the current user's roles.
 */
export function getNavItems(userRoles: ApprovalRoleName[]): RouteConfig[] {
  return Object.values(routes).filter(
    (r) => r.showInNav && canAccessRoute(r, userRoles)
  );
}
