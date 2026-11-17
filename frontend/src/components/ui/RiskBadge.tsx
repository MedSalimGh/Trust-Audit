import React from 'react';
import { Badge } from './Badge';
import { getRiskCategory } from '../../lib/constants';
import { cn } from '../../lib/cn';

interface RiskBadgeProps {
  score: number;
  className?: string;
}

const variantMap = {
  low: 'low-risk',
  medium: 'medium-risk',
  high: 'high-risk',
} as const;

export const RiskBadge: React.FC<RiskBadgeProps> = ({ score, className }) => {
  const category = getRiskCategory(score);
  return (
    <Badge
      variant={variantMap[category]}
      dot
      pulse={category === 'high'}
      className={cn(className)}
    >
      {score}% — {category.charAt(0).toUpperCase() + category.slice(1)} Risk
    </Badge>
  );
};
