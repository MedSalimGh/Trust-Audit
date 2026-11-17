import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText, CheckCircle2, Clock, XCircle, AlertOctagon,
  ShieldAlert, Eye, RefreshCw, Search, AlertCircle, Plus, Sparkles
} from 'lucide-react';
import { listCases } from '../lib/api-client';
import {
  GlassCard, Button, Badge, PageHeader, RiskBadge,
  EmptyState, SkeletonRow, Input,
} from './ui';
import type { CaseSummary, CaseStatus } from '../types';

// ─── Props ───────────────────────────────────────────────────────────────────

interface DashboardProps {
  onSelectCase: (caseId: string) => void;
  openCreateModal: () => void;
}

// ─── Status filter tabs ──────────────────────────────────────────────────────

const FILTERS: Array<{ label: string; value: string }> = [
  { label: 'All Cases', value: 'ALL' },
  { label: 'Registered', value: 'REGISTERED' },
  { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Escalated', value: 'ESCALATED' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tierBadge(tier: number) {
  if (tier === 2) {
    return (
      <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30 font-mono text-[10px]">
        Tier 3 (&gt;50k DT)
      </Badge>
    );
  }
  if (tier === 1) {
    return (
      <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 font-mono text-[10px]">
        Tier 2 (5k–50k DT)
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 font-mono text-[10px]">
      Tier 1 (&lt;5k DT)
    </Badge>
  );
}

function statusBadge(status: CaseStatus) {
  const map: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
    APPROVED: {
      icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
      label: 'Approved',
      className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    },
    PENDING_APPROVAL: {
      icon: <Clock className="w-3 h-3 text-amber-400 animate-pulse" />,
      label: 'In Review',
      className: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    },
    REGISTERED: {
      icon: <Sparkles className="w-3 h-3 text-cyan-400" />,
      label: 'Registered',
      className: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    },
    REJECTED: {
      icon: <XCircle className="w-3 h-3 text-rose-400" />,
      label: 'Rejected',
      className: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
    },
    ESCALATED: {
      icon: <AlertOctagon className="w-3 h-3 text-purple-400" />,
      label: 'Escalated',
      className: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    },
  };

  const cfg = map[status];
  if (!cfg) return null;

  return (
    <Badge variant="outline" className={`${cfg.className} flex items-center gap-1.5 w-max text-[11px] font-semibold py-0.5 px-2`}>
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export const Dashboard: React.FC<DashboardProps> = ({ onSelectCase, openCreateModal }) => {
  const [filter, setFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const {
    data: casesResponse,
    isLoading,
    refetch,
    isFetching,
    error,
    isError,
  } = useQuery({
    queryKey: ['cases', filter],
    queryFn: () => listCases(filter === 'ALL' ? undefined : filter),
    staleTime: 2000,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });

  const rawCases = (casesResponse?.items ?? []) as CaseSummary[];

  // Filter by search query
  const cases = useMemo(() => {
    if (!searchQuery.trim()) return rawCases;
    const q = searchQuery.toLowerCase();
    return rawCases.filter(
      (c) =>
        c.case_id.toLowerCase().includes(q) ||
        c.beneficiary_name.toLowerCase().includes(q) ||
        (c.transaction_type && c.transaction_type.toLowerCase().includes(q)) ||
        c.currency.toLowerCase().includes(q)
    );
  }, [rawCases, searchQuery]);

  // Compute KPI metrics from all fetched cases
  const total = rawCases.length;
  const pending = rawCases.filter((c) => c.status === 'PENDING_APPROVAL').length;
  const approved = rawCases.filter((c) => c.status === 'APPROVED').length;
  const highRisk = rawCases.filter((c) => {
    const s = c.risk_score ?? c.ai_risk_score;
    return (c.risk_level as string) === 'HIGH' || (s !== null && s !== undefined && s >= 70);
  }).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <PageHeader
        title="Banking Audit & Execution Dashboard"
        description="Real-time multi-signature governance gate, AI risk screening, and immutable compliance records."
      >
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            aria-label="Refresh cases"
            title="Refresh cases from blockchain & backend"
            className="hover:bg-slate-800/60"
          >
            <RefreshCw className={`w-4 h-4 text-cyan-400 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            size="sm"
            onClick={openCreateModal}
            className="shadow-glow-cyan flex items-center gap-1.5 font-semibold"
          >
            <Plus className="w-4 h-4 text-midnight-950 font-bold" />
            <span>Initiate Transaction Case</span>
          </Button>
        </div>
      </PageHeader>

      {/* ── KPI Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <GlassCard hoverEffect className="flex items-center justify-between p-4 sm:p-5 border-cyan-500/10 min-w-0">
          <div className="min-w-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5 truncate">
              <span>Total Cases</span>
            </div>
            <div className="text-3xl font-display font-bold text-slate-900 dark:text-white mt-1.5">
              {isLoading ? '—' : total}
            </div>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 flex items-center justify-center text-slate-700 dark:text-slate-300 shadow-sm shrink-0 ml-2">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600 dark:text-cyan-400" />
          </div>
        </GlassCard>

        <GlassCard hoverEffect className="flex items-center justify-between p-4 sm:p-5 border-amber-500/20 min-w-0">
          <div className="min-w-0">
            <div className="text-xs text-amber-600 dark:text-amber-300/80 uppercase tracking-wider font-mono flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse shrink-0" />
              <span>Pending Quorum</span>
            </div>
            <div className="text-3xl font-display font-bold text-amber-600 dark:text-amber-400 mt-1.5">
              {isLoading ? '—' : pending}
            </div>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)] shrink-0 ml-2">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </GlassCard>

        <GlassCard hoverEffect className="flex items-center justify-between p-4 sm:p-5 border-emerald-500/20 min-w-0">
          <div className="min-w-0">
            <div className="text-xs text-emerald-600 dark:text-emerald-300/80 uppercase tracking-wider font-mono flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" />
              <span>Approved & Certified</span>
            </div>
            <div className="text-3xl font-display font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">
              {isLoading ? '—' : approved}
            </div>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)] shrink-0 ml-2">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </GlassCard>

        <GlassCard hoverEffect className="flex items-center justify-between p-4 sm:p-5 border-rose-500/20 min-w-0">
          <div className="min-w-0">
            <div className="text-xs text-rose-600 dark:text-rose-300/80 uppercase tracking-wider font-mono flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-rose-500 dark:bg-rose-400 shrink-0" />
              <span>AI High Risk Flags</span>
            </div>
            <div className="text-3xl font-display font-bold text-rose-600 dark:text-rose-400 mt-1.5">
              {isLoading ? '—' : highRisk}
            </div>
          </div>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.2)] shrink-0 ml-2">
            <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </GlassCard>
      </div>

      {/* ── Filters & Search Controls ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-slate-100/80 dark:glass p-1.5 rounded-xl border border-slate-200 dark:border-white/5" role="tablist" aria-label="Case status filter">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                filter === f.value
                  ? 'bg-white dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-slate-200 dark:border-cyan-500/40 shadow-xs dark:shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/70 dark:hover:bg-slate-800/50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cases, beneficiaries..."
            className="w-full pl-9 pr-7 py-2 rounded-xl bg-white dark:glass border border-slate-300 dark:border-white/10 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── Error Banner (if any) ────────────────────────────────────────────── */}
      {isError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-rose-700 dark:text-rose-300 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
            <span>
              {error instanceof Error ? error.message : 'Unable to query backend cases. Please check network connection.'}
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/20">
            Retry Query
          </Button>
        </div>
      )}

      {/* ── Cases Table ────────────────────────────────────────────────────── */}
      <GlassCard className="!p-0 overflow-hidden border-slate-200 dark:border-cyan-500/10 shadow-lg dark:shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-midnight-950/90 text-slate-700 dark:text-slate-400 uppercase font-mono tracking-wider border-b border-slate-200 dark:border-slate-800 font-semibold">
              <tr>
                <th className="py-3 px-4">Case Reference</th>
                <th className="py-3 px-4">Beneficiary / Category</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Value Tier</th>
                <th className="py-3 px-4">AI Risk Score</th>
                <th className="py-3 px-4">Quorum</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="py-3 px-4">
                      <SkeletonRow />
                    </td>
                  </tr>
                ))
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12">
                    <EmptyState
                      title={searchQuery ? "No Matching Cases" : "No Transaction Cases Found"}
                      description={
                        searchQuery
                          ? `No audit cases matched "${searchQuery}". Clear your search query to see all cases.`
                          : "No cases match the selected status filter. Initiate a new transaction case to begin."
                      }
                    />
                  </td>
                </tr>
              ) : (
                cases.map((c) => {
                  return (
                    <tr
                      key={c.case_id}
                      className="hover:bg-slate-100/70 dark:hover:bg-slate-800/40 transition group cursor-pointer"
                      onClick={() => onSelectCase(c.case_id)}
                    >
                      <td className="py-3.5 px-4 font-mono font-medium text-cyan-700 dark:text-cyan-300 group-hover:text-cyan-900 dark:group-hover:text-cyan-200 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 opacity-60 group-hover:opacity-100" />
                        {c.case_id.slice(0, 10)}...{c.case_id.slice(-6)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white group-hover:text-cyan-700 dark:group-hover:text-cyan-100 transition-colors">
                          {c.beneficiary_name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          {c.transaction_type}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {Number(c.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">{c.currency}</span>
                      </td>
                      <td className="py-3.5 px-4">{tierBadge(c.value_tier)}</td>
                      <td className="py-3.5 px-4">
                        {(() => {
                          const s = c.risk_score ?? c.ai_risk_score;
                          return s !== null && s !== undefined ? (
                            <RiskBadge score={s} />
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">Pending AI</span>
                          );
                        })()}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span className="font-semibold text-cyan-700 dark:text-cyan-400">{c.approval_count}</span>
                        <span className="text-slate-500 dark:text-slate-400"> / {c.required_approvals}</span>
                      </td>
                      <td className="py-3.5 px-4">{statusBadge(c.status)}</td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectCase(c.case_id)}
                          className="hover:bg-cyan-500/10 hover:text-cyan-800 dark:hover:text-cyan-300 text-xs py-1 px-2.5 text-cyan-700 dark:text-cyan-400"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 mr-1" />
                          <span>Audit</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};
