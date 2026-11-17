import React, { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '../../lib/cn';
import { truncateHex } from '../../lib/constants';
import { Tooltip, TooltipTrigger, TooltipContent } from './Tooltip';

interface HashDisplayProps {
  hash: string;
  startChars?: number;
  endChars?: number;
  className?: string;
  label?: string;
}

export const HashDisplay: React.FC<HashDisplayProps> = ({
  hash,
  startChars = 6,
  endChars = 4,
  className,
  label,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available in all contexts
    }
  }, [hash]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            'inline-flex items-center gap-1.5 font-mono text-xs text-slate-600 dark:text-slate-400',
            'hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded',
            className
          )}
          aria-label={label || `Copy hash ${hash}`}
        >
          <span>{truncateHex(hash, startChars, endChars)}</span>
          {copied ? (
            <Check className="h-3 w-3 text-emerald-400" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <span className="font-mono text-[10px] break-all">{hash}</span>
      </TooltipContent>
    </Tooltip>
  );
};
