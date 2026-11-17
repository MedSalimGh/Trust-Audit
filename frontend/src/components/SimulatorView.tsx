import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Play, CheckCircle2, RefreshCw, Server, ShieldCheck, Zap,
} from 'lucide-react';
import { listExecutions, listCases, triggerExecution } from '../lib/api-client';
import {
  GlassCard, Button, Badge, PageHeader,
  EmptyState, SkeletonRow, TimestampDisplay, useToast,
} from './ui';
import type { CaseSummary, ExecutionRecord } from '../types';

// ─── Component ───────────────────────────────────────────────────────────────

export const SimulatorView: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [executingCaseId, setExecutingCaseId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Fetch executions and approved cases in parallel
  const {
    data: executions,
    isLoading: execLoading,
  } = useQuery({
    queryKey: ['executions'],
    queryFn: () => listExecutions(),
    staleTime: 15_000,
  });

  const {
    data: casesResponse,
    isLoading: casesLoading,
  } = useQuery({
    queryKey: ['cases', 'APPROVED'],
    queryFn: () => listCases('APPROVED'),
    staleTime: 15_000,
  });

  const isLoading = execLoading || casesLoading;
  const execList = (executions ?? []) as ExecutionRecord[];
  const approvedCases = (casesResponse?.items ?? []) as CaseSummary[];

  // Find cases not yet executed
  const executedCaseIds = new Set(execList.map((e) => e.case_id));
  const pendingExecutionCases = approvedCases.filter((c) => !executedCaseIds.has(c.case_id));

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['executions'] });
    queryClient.invalidateQueries({ queryKey: ['cases', 'APPROVED'] });
  };

  const handleExecute = async (caseId: string) => {
    try {
      setExecutingCaseId(caseId);
      setMsg(null);
      const res = await triggerExecution(caseId) as ExecutionRecord & { execution_reference?: string };
      const ref = res.execution_reference || `EXEC-${res.id.slice(0, 8).toUpperCase()}`;
      setMsg(`✅ Core Banking Wire Executed! Ref: ${ref}`);
      toast({ title: 'Wire Transfer Executed', description: `Reference: ${ref}`, variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['executions'] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    } catch (err: unknown) {
      const error = err as { message?: string };
      setMsg(`Execution error: ${error.message || String(err)}`);
    } finally {
      setExecutingCaseId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <PageHeader
        title="Bank Transfer Execution Simulator"
        description="Decoupled core banking settlement engine: executes real or simulated bank transfers ONLY after authoritative on-chain multi-signature approval."
        icon={<Server className="w-6 h-6 text-emerald-400" />}
      >
        <Button variant="ghost" size="sm" onClick={handleRefresh}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Ledger</span>
        </Button>
      </PageHeader>

      {/* ── Status Message ────────────────────────────────────────────────── */}
      {msg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-mono text-emerald-400">
          {msg}
        </div>
      )}

      {/* ── Pending Settlement Queue ──────────────────────────────────────── */}
      {pendingExecutionCases.length > 0 && (
        <GlassCard className="!border-amber-500/40 bg-amber-50/40 dark:bg-transparent space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Cleared by Blockchain — Ready for Settlement ({pendingExecutionCases.length})
            </h2>
          </div>

          <div className="space-y-3">
            {pendingExecutionCases.map((c) => (
              <div
                key={c.case_id}
                className="bg-white dark:bg-midnight-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs"
              >
                <div>
                  <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                    {c.case_id.slice(0, 10)}...{c.case_id.slice(-6)}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Beneficiary: <strong className="text-slate-800 dark:text-slate-200">{c.beneficiary_name}</strong> • Amount:{' '}
                    <strong className="text-slate-900 dark:text-white font-mono">
                      {Number(c.amount).toLocaleString()} {c.currency}
                    </strong>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleExecute(c.case_id)}
                  disabled={executingCaseId === c.case_id}
                  className="bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-midnight-950 self-start sm:self-auto font-medium"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{executingCaseId === c.case_id ? 'Settling...' : 'Dispatch Wire Transfer'}</span>
                </Button>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* ── Settled Executions History ─────────────────────────────────────── */}
      <GlassCard className="!p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            Settled Execution Ledger
          </h3>
          <span className="text-xs text-slate-500 font-mono">Total Executions: {execList.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-midnight-950/80 text-slate-600 dark:text-slate-400 uppercase font-mono tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Execution Reference</th>
                <th className="py-3 px-4">Case ID</th>
                <th className="py-3 px-4">Idempotency Key</th>
                <th className="py-3 px-4">Settlement Status</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300 font-mono">
              {isLoading && execList.length === 0 ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="py-2 px-4">
                      <SkeletonRow />
                    </td>
                  </tr>
                ))
              ) : execList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10">
                    <EmptyState
                      title="No Settled Executions"
                      description="No executed bank settlements recorded yet. Approve a case and dispatch it above."
                    />
                  </td>
                </tr>
              ) : (
                execList.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-100/70 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                      {e.execution_reference || `EXEC-${e.id.slice(0, 8).toUpperCase()}`}
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 dark:text-slate-300">
                      {e.case_id.slice(0, 10)}...{e.case_id.slice(-6)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px] truncate max-w-xs">{e.idempotency_key}</td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 flex items-center gap-1 w-max text-[10px]"
                      >
                        <CheckCircle2 className="w-3 h-3" /> {e.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      <TimestampDisplay timestamp={e.executed_at} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};
