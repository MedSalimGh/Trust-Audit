import React from 'react';
import { cn } from '../../lib/cn';
import { roleColors } from '../../config/theme';
import { ROLE_LABELS } from '../../lib/constants';
import type { ApprovalRoleName } from '../../types';

interface RoleBadgeProps {
  role: ApprovalRoleName;
  className?: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, className }) => {
  const colors = roleColors[role as keyof typeof roleColors] || roleColors.AUDITOR;
  const label = ROLE_LABELS[role] || role;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
        colors.bg,
        colors.text,
        colors.border,
        className
      )}
    >
      {label}
    </span>
  );
};
