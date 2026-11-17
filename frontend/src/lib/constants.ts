import type { ApprovalRoleName } from '../types';

/**
 * Human-readable labels and constants used across the UI.
 */

export const ROLE_LABELS: Record<ApprovalRoleName, string> = {
  OPERATOR: 'Operator',
  AI_ORACLE: 'AI Oracle',
  COMPLIANCE: 'Compliance Officer',
  RISK_MANAGER: 'Risk Manager',
  DIRECTOR: 'Director',
  AUDITOR: 'Auditor',
  ADMIN: 'Administrator',
};

export const STATUS_LABELS: Record<string, string> = {
  NONE: 'None',
  REGISTERED: 'Registered',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ESCALATED: 'Escalated',
};

export const RISK_LABELS: Record<string, string> = {
  LOW: 'Low Risk',
  MEDIUM: 'Medium Risk',
  HIGH: 'High Risk',
};

export const VALUE_TIER_LABELS: Record<number, string> = {
  0: 'Tier 1 (≤10,000 DT)',
  1: 'Tier 2 (10,001–50,000 DT)',
  2: 'Tier 3 (>50,000 DT)',
};

export const APPROVAL_REQUIREMENTS: Record<number, number> = {
  0: 1, // Tier 1: 1 approval
  1: 2, // Tier 2: 2 approvals
  2: 3, // Tier 3: 3 approvals
};

/**
 * Risk score thresholds for color coding.
 */
export function getRiskCategory(score: number): 'low' | 'medium' | 'high' {
  if (score <= 30) return 'low';
  if (score <= 70) return 'medium';
  return 'high';
}

/**
 * Truncate a hex string (address or hash) for display.
 */
export function truncateHex(hex: string, startChars = 6, endChars = 4): string {
  if (!hex || hex.length <= startChars + endChars + 2) return hex;
  return `${hex.slice(0, startChars)}...${hex.slice(-endChars)}`;
}
