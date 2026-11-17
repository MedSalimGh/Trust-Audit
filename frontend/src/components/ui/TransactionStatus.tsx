import React from 'react';
import { Loader2, CheckCircle2, XCircle, Send, Clock } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { TxState } from '../../types';
import { HashDisplay } from './HashDisplay';
import { Button } from './Button';

interface TransactionStatusProps {
  txState: TxState;
  onRetry?: () => void;
  className?: string;
}

const statusConfig = {
  idle: { icon: Clock, text: 'Ready', color: 'text-slate-400' },
  submitting: { icon: Send, text: 'Submitting to wallet...', color: 'text-cyan-400' },
  confirming: { icon: Loader2, text: 'Confirming on-chain...', color: 'text-amber-400' },
  confirmed: { icon: CheckCircle2, text: 'Confirmed', color: 'text-emerald-400' },
  error: { icon: XCircle, text: 'Transaction failed', color: 'text-red-400' },
} as const;

export const TransactionStatus: React.FC<TransactionStatusProps> = ({ txState, onRetry, className }) => {
  const config = statusConfig[txState.status];
  const Icon = config.icon;
  const isAnimating = txState.status === 'submitting' || txState.status === 'confirming';

  if (txState.status === 'idle') return null;

  return (
    <div className={cn('glass rounded-lg p-3 space-y-2', className)}>
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', config.color, isAnimating && 'animate-spin')} />
        <span className={cn('text-sm font-medium', config.color)}>{config.text}</span>
      </div>

      {txState.hash && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Tx:</span>
          <HashDisplay hash={txState.hash} />
        </div>
      )}

      {txState.error && (
        <div className="space-y-2">
          <p className="text-xs text-red-400/80">{txState.error}</p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
