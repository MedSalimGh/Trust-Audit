import React from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from './Tooltip';
import { cn } from '../../lib/cn';

interface TimestampDisplayProps {
  timestamp: string | number;
  className?: string;
}

function timeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

function formatFull(date: Date): string {
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export const TimestampDisplay: React.FC<TimestampDisplayProps> = ({ timestamp, className }) => {
  const date = new Date(typeof timestamp === 'number' ? timestamp * 1000 : timestamp);
  const isValid = !isNaN(date.getTime());

  if (!isValid) return <span className="text-xs text-slate-500">—</span>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time
          dateTime={date.toISOString()}
          className={cn('text-xs text-slate-400 tabular-nums cursor-default', className)}
        >
          {timeAgo(date)}
        </time>
      </TooltipTrigger>
      <TooltipContent>{formatFull(date)}</TooltipContent>
    </Tooltip>
  );
};
