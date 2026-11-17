import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Database, Lock, RotateCcw, Bug, FileSearch,
} from 'lucide-react';
import {
  listCases, verifyCaseIntegrity, simulateTampering, restoreOriginalData,
} from '../lib/api-client';
import {
  GlassCard, Button, Badge, PageHeader,
  EmptyState, Skeleton, useToast,
} from './ui';
import type { CaseSummary, VerifyIntegrityResponse } from '../types';

// ─── Component ───────────────────────────────────────────────────────────────

export const TamperLab: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [verificationResult, setVerificationResult] = useState<VerifyIntegrityResponse | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Load all cases for the selector
  const { data: casesResponse, isLoading: casesLoading } = useQuery({
    queryKey: ['cases'],
    queryFn: () => listCases(),
    staleTime: 30_000,
  });

  const cases = (casesResponse?.items ?? []) as CaseSummary[];

  // Auto-select first case
  useEffect(() => {
    if (cases.length > 0 && !selectedCaseId) {
      setSelectedCaseId(cases[0].case_id);
    }
  }, [cases, selectedCaseId]);

  // Run verification whenever selected case changes
  const runVerification = async (cid?: string) => {
    const target = cid || selectedCaseId;
    if (!target) return;

    try {
      setActionLoading(true);
      setActionMsg(null);
      const res = await verifyCaseIntegrity(target);
      setVerificationResult(res as VerifyIntegrityResponse);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setActionMsg(`Verification error: ${error.message || String(err)}`);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCaseId) {
      runVerification(selectedCaseId);
    }
  }, [selectedCaseId]);

  // ─── Attack handlers ─────────────────────────────────────────────────

  const handleSimulateTamperAmount = async () => {
    if (!selectedCaseId) return;
    try {
      setActionLoading(true);
      await simulateTampering(selectedCaseId, 6000.0);
      setActionMsg('⚠️ Malicious DBA update applied: Amount altered to 6,000.00 DT in private database!');
      toast({ title: 'Attack Simulated', description: 'Amount tampered in off-chain database.', variant: 'warning' });
      await runVerification(selectedCaseId);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setActionMsg(`Tampering failed: ${error.message || String(err)}`);
      setActionLoading(false);
    }
  };

  const handleSimulateTamperBeneficiary = async () => {
    if (!selectedCaseId) return;
    try {
      setActionLoading(true);
      await simulateTampering(selectedCaseId, undefined, 'Mule Offshore Intermediary LTD');
      setActionMsg('⚠️ Malicious DBA update applied: Beneficiary rewritten in database table!');
      toast({ title: 'Attack Simulated', description: 'Beneficiary name tampered.', variant: 'warning' });
      await runVerification(selectedCaseId);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setActionMsg(`Tampering failed: ${error.message || String(err)}`);
      setActionLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedCaseId) return;
    try {
      setActionLoading(true);
      await restoreOriginalData(selectedCaseId);
      setActionMsg('✅ Database restored from authentic commitment record!');
      toast({ title: 'Data Restored', description: 'Authentic evidence recovered.', variant: 'success' });
      await runVerification(selectedCaseId);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setActionMsg(`Restore failed: ${error.message || String(err)}`);
      setActionLoading(false);
    }
  };

  const isTampered = verificationResult && !verificationResult.is_valid;
  const isValid = verificationResult && verificationResult.is_valid;
  const currentCase = cases.find((c) => c.case_id === selectedCaseId);

  // Access verification data with safe fallbacks
  const vr = verificationResult as Record<string, unknown> | null;

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <PageHeader
        title="Auditor Tamper Lab & Cryptographic Verification"
        description="Interactive mathematical proof demonstrator: bit-level detection of off-chain database alterations against authoritative EVM blockchain commitments."
        icon={<ShieldAlert className="w-6 h-6 text-rose-400" />}
      >
        <div className="flex items-center gap-2">
          <select
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="bg-white dark:bg-midnight-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-800 dark:text-cyan-400 focus:outline-none focus:border-cyan-500 cursor-pointer max-w-xs truncate shadow-xs"
            aria-label="Select case to verify"
          >
            {cases.map((c) => (
              <option key={c.case_id} value={c.case_id}>
                {c.case_id.slice(0, 12)}... ({Number(c.amount).toLocaleString()} {c.currency})
              </option>
            ))}
          </select>

          <Button variant="ghost" size="sm" onClick={() => runVerification()} disabled={actionLoading}>
            <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </PageHeader>

      {/* ── Action Message ───────────────────────────────────────────────── */}
      {actionMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium border ${
            actionMsg.includes('Malicious') || actionMsg.includes('⚠️')
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
          }`}
        >
          {actionMsg}
        </div>
      )}

      {/* ── Main Integrity Comparison Stage ──────────────────────────────── */}
      {verificationResult && (
        <div
          className={`rounded-2xl border p-6 transition-all shadow-xl dark:shadow-2xl ${
            isTampered
              ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-500/50 shadow-rose-950/20'
              : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/40 shadow-emerald-950/20'
          }`}
        >
          {/* Status Verdict */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  isTampered ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {isTampered ? <XCircle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                  {isTampered ? '🚨 DATABASE TAMPERING DETECTED' : '✅ CRYPTOGRAPHIC INTEGRITY VERIFIED'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isTampered
                    ? 'Off-chain database state fails SHA-256 match with the on-chain smart contract commitment.'
                    : 'Canonical JSON hash perfectly matches the immutable root anchored on the EVM blockchain.'}
                </p>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={() => runVerification()} disabled={actionLoading}>
              <FileSearch className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Verify Now</span>
            </Button>
          </div>

          {/* Hash Comparison Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
            {/* Off-Chain */}
            <GlassCard className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  Off-Chain Recomputed Hash
                </span>
                <span className="text-[10px] text-slate-500 font-mono">From Private DB</span>
              </div>

              <div
                className={`p-3 rounded-lg font-mono text-xs break-all border ${
                  isTampered
                    ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/30'
                    : 'bg-slate-100 dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 border-slate-200 dark:border-slate-800'
                }`}
              >
                {String(vr?.calculated_hash || vr?.recomputed_hash || 'No hash calculated')}
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <div>
                  Amount in DB:{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {(vr?.current_data as Record<string, unknown>)?.amount !== undefined
                      ? `${Number((vr?.current_data as Record<string, unknown>)?.amount).toLocaleString()} DT`
                      : currentCase?.amount !== undefined
                      ? `${Number(currentCase.amount).toLocaleString()} DT`
                      : 'N/A'}
                  </strong>
                </div>
                <div>
                  Beneficiary:{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {String((vr?.current_data as Record<string, unknown>)?.beneficiary_name || currentCase?.beneficiary_name || 'N/A')}
                  </strong>
                </div>
              </div>
            </GlassCard>

            {/* On-Chain */}
            <GlassCard className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  On-Chain Registered Commitment
                </span>
                <span className="text-[10px] text-slate-500 font-mono">From TrustAuditRegistry.sol</span>
              </div>

              <div className="p-3 rounded-lg font-mono text-xs break-all bg-slate-100 dark:bg-slate-900 text-purple-700 dark:text-purple-300 border border-slate-200 dark:border-slate-800">
                {String(verificationResult.on_chain_hash || 'None')}
              </div>

              <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                <div>
                  Format Domain:{' '}
                  <span className="font-mono text-slate-800 dark:text-slate-300">TrustAudit:v1 || JCS(data) || salt</span>
                </div>
                <div>
                  Cryptographic Salt:{' '}
                  <span className="font-mono text-slate-500 text-[10px] truncate block">
                    {String(vr?.secret_salt || 'None')}
                  </span>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Differential Analysis if Tampered */}
          {isTampered && verificationResult.tampered_fields && verificationResult.tampered_fields.length > 0 && (
            <div className="mt-6 bg-rose-100 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/40 p-4 rounded-xl space-y-3">
              <div className="text-xs font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Forensic Tampering Diagnostics
              </div>
              <p className="text-xs text-rose-900 dark:text-rose-200">
                A rogue DBA or internal malicious actor altered off-chain database rows. Because the commitment on
                Ganache EVM was cryptographically sealed upon registration, this unauthorized change is immediately
                unmasked.
              </p>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
                  <thead className="text-[10px] uppercase font-mono text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-900/60">
                    <tr>
                      <th className="px-3 py-1.5 rounded-l">Tampered Field</th>
                      <th className="px-3 py-1.5">Authentic Value</th>
                      <th className="px-3 py-1.5 rounded-r text-rose-600 dark:text-rose-400">Altered DB Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                    {verificationResult.tampered_fields.map((tf, i) => {
                      const authentic = tf.expected !== undefined ? tf.expected : tf.original_value;
                      const altered = tf.actual !== undefined ? tf.actual : tf.tampered_value;

                      const formatVal = (field: string, val: unknown) => {
                        if (val === undefined || val === null) return 'N/A';
                        if (field === 'amount' && (typeof val === 'number' || (!isNaN(Number(val)) && typeof val !== 'boolean'))) {
                          return `${Number(val).toLocaleString()} DT`;
                        }
                        return String(val);
                      };

                      return (
                        <tr key={i} className="hover:bg-slate-200/50 dark:hover:bg-slate-900/40">
                          <td className="px-3 py-2 text-amber-700 dark:text-amber-300 font-semibold">{tf.field}</td>
                          <td className="px-3 py-2 text-emerald-700 dark:text-emerald-400 font-medium">
                            {formatVal(tf.field, authentic)}
                          </td>
                          <td className="px-3 py-2 text-rose-700 dark:text-rose-400 font-bold">
                            {formatVal(tf.field, altered)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tamper Simulation Command Bar ─────────────────────────────────── */}
      <GlassCard className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bug className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            Demonstration Attack Controls (Simulate Threat Vectors)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Use these controls during your demo to alter off-chain database records behind the application's back, then
            observe how the on-chain cryptographic gate prevents fraud.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleSimulateTamperAmount}
            disabled={actionLoading || !selectedCaseId}
          >
            Attack Vector 1: Alter Amount (60k → 6k DT)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSimulateTamperBeneficiary}
            disabled={actionLoading || !selectedCaseId}
            className="border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-600/10"
          >
            Attack Vector 2: Rewrite Beneficiary (Mule LLC)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRestore}
            disabled={actionLoading || !selectedCaseId}
            className="ml-auto border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600/10"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restore Authentic Evidence
          </Button>
        </div>
      </GlassCard>
    </div>
  );
};
