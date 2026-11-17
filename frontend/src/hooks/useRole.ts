/**
 * useRole — Derives role-based access from the wallet context.
 *
 * Provides helpers for checking permissions without
 * directly coupling components to WalletContext internals.
 */
import { useMemo } from 'react';
import { useWallet } from '../context/WalletContext';
import type { ApprovalRoleName } from '../types';
import { canAccessRoute } from '../config/routes';
import type { RouteConfig } from '../config/routes';

export function useRole() {
  const { assignedRoles, activeRole, account } = useWallet();

  const normalizedRoles = useMemo<ApprovalRoleName[]>(() => {
    return assignedRoles
      .map((r) => r.replace('_ROLE', ''))
      .filter((r): r is ApprovalRoleName => r !== 'GUEST' && r !== '') as ApprovalRoleName[];
  }, [assignedRoles]);

  const hasRole = (role: ApprovalRoleName): boolean => {
    if (normalizedRoles.includes('ADMIN')) return true;
    return normalizedRoles.includes(role);
  };

  const hasAnyRole = (...roles: ApprovalRoleName[]): boolean => {
    if (normalizedRoles.includes('ADMIN')) return true;
    return roles.some((r) => normalizedRoles.includes(r));
  };

  const canAccess = (route: RouteConfig): boolean => {
    return canAccessRoute(route, normalizedRoles);
  };

  const primaryRole = useMemo<ApprovalRoleName | null>(() => {
    const normalized = activeRole.replace('_ROLE', '') as ApprovalRoleName;
    return normalizedRoles.includes(normalized) ? normalized : normalizedRoles[0] ?? null;
  }, [activeRole, normalizedRoles]);

  return {
    roles: normalizedRoles,
    primaryRole,
    isConnected: !!account,
    hasRole,
    hasAnyRole,
    canAccess,
  };
}
