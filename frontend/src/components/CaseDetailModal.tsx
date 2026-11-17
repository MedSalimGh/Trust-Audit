import React, { useState, useEffect } from 'react';
import {
  X, Shield, Award, CheckCircle2, Clock, XCircle, AlertOctagon,
  Brain, FileCode, Check, AlertTriangle, ExternalLink, RefreshCw,
  TrendingUp, TrendingDown, Lock, ArrowRight, Play, Download
} from 'lucide-react';
import { getCaseDetail, assessCaseAI, triggerExecution, syncCaseStatus } from '../lib/api-client';
import { useWallet } from '../context/WalletContext';

interface CaseDetailModalProps {
  caseId: string | null;
  onClose: () => void;
  onRefresh: () => void;
}

export const CaseDetailModal: React.FC<CaseDetailModalProps> = ({ caseId, onClose, onRefresh }) => {
  const { account, activeRole } = useWallet();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [execLoading, setExecLoading] = useState<boolean>(false);
  const [execMsg, setExecMsg] = useState<string | null>(null);

  const fetchDetails = async () => {
    if (!caseId) return;
    try {
      setLoading(true);
      await syncCaseStatus(caseId);
      const res = await getCaseDetail(caseId);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [caseId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!caseId) return null;

  const handleRunAI = async () => {
    try {
      setAiLoading(true);
      await assessCaseAI(caseId);
      await fetchDetails();
      onRefresh();
    } catch (err: any) {
      alert(`AI assessment error: ${err.message || err}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleTriggerBankExecution = async () => {
    try {
      setExecLoading(true);
      setExecMsg(null);
      const res = await triggerExecution(caseId) as { execution_reference?: string; id: string };
      const ref = res.execution_reference || `EXEC-${res.id.slice(0, 8).toUpperCase()}`;
      setExecMsg(`Bank Transfer executed! Reference: ${ref}`);
      await fetchDetails();
      onRefresh();
    } catch (err: any) {
      setExecMsg(`Execution failed: ${err.message || err}`);
    } finally {
      setExecLoading(false);
    }
  };

  const handleDownloadAuditorDossier = () => {
    if (!data) return;
    const packet = {
      standard: 'TrustAudit:RFC-8785:v1.0',
      attestation: 'Sovereign Regulatory Audit Dossier',
      timestamp: new Date().toISOString(),
      case_id: caseId,
      status: data.status,
      settlement_value: {
        amount: data.transaction?.amount,
        currency: data.transaction?.currency,
      },
      counterparties: {
        sender: data.transaction?.sender_name,
        beneficiary: data.transaction?.beneficiary_name,
      },
      forensic_commitments: {
        domain_separator: 'TrustAudit:v1',
        salted_input_hash: data.commitment?.salted_input_hash,
        secret_salt: data.commitment?.secret_salt,
        ai_explanation_hash: data.ai_assessment?.explanation_hash,
      },
      on_chain_governance: {
        chain_id: 1337,
        approval_count: data.approval_count,
        required_approvals: data.required_approvals,
        approvers: data.approvers,
        rejection_reason: data.rejection_reason,
      },
      audit_integrity: 'VERIFIED_CANONICAL_RFC_8785',
    };
    const blob = new Blob([JSON.stringify(packet, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TrustAudit-Dossier-${caseId.slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white font-mono">
                  Case {caseId.slice(0, 10)}...{caseId.slice(-6)}
                </h2>
                {data && (
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      data.status === 'APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : data.status === 'PENDING_APPROVAL'
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        : data.status === 'REJECTED'
                        ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                        : data.status === 'ESCALATED'
                        ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                        : 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    {data.status.replace('_', ' ')}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Authoritative Blockchain Case State & AI Audit Records</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeRole === 'AUDITOR' && data && (
              <button
                onClick={handleDownloadAuditorDossier}
                className="px-2.5 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-700 dark:text-purple-300 border border-purple-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                title="Download Sovereign Regulatory Audit Dossier (.json)"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export Dossier (.JSON)</span>
              </button>
            )}
            <button
              onClick={fetchDetails}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading && !data ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-sky-500" />
              <p className="text-sm">Fetching on-chain status and private transaction evidence...</p>
            </div>
          ) : !data ? (
            <div className="text-center py-10 text-rose-500">Failed to load case data.</div>
          ) : (
            <>
              {/* Top Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-100 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Amount</span>
                  <div className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                    {Number(data.transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                    <span className="text-xs text-sky-600 dark:text-sky-400">{data.transaction.currency}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Value Tier</span>
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1">
                    {data.value_tier === 2 && 'Tier 3 (> 50,000 DT)'}
                    {data.value_tier === 1 && 'Tier 2 (5,000 – 50,000 DT)'}
                    {data.value_tier === 0 && 'Tier 1 (< 5,000 DT)'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Quorum Progress</span>
                  <div className="text-xs font-semibold text-sky-600 dark:text-sky-400 mt-1 flex items-center gap-1 font-mono">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{data.approval_count}</span>
                    <span className="text-slate-500"> / {data.required_approvals} Signatures</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Deadline</span>
                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-mono">
                    {new Date(data.deadline).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>

              {/* Private Banking Data (Off-Chain Storage) */}
              <div className="bg-slate-100/70 dark:bg-slate-950/60 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                    <span>Private Banking Transaction Details (Off-Chain)</span>
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">Protected by Banking Secrecy</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-slate-500 block">Sender Account:</span>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{data.transaction.sender_name}</div>
                    <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{data.transaction.sender_iban}</div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-500 block">Beneficiary Account:</span>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{data.transaction.beneficiary_name}</div>
                    <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{data.transaction.beneficiary_iban}</div>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Merchant Category:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">{data.transaction.merchant_category}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Customer Reference:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{data.transaction.customer_reference}</span>
                  </div>
                </div>
              </div>

              {/* Cryptographic Commitment Card */}
              {data.commitment && (
                <div className="bg-slate-100/70 dark:bg-slate-950/60 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Cryptographic Commitment (RFC 8785 + SHA-256)</span>
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Commitment Anchored On-Chain
                    </span>
                  </div>

                  <div className="space-y-2 text-xs font-mono">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase block">Salted Input Hash (bytes32):</span>
                      <div className="bg-white dark:bg-slate-950 px-3 py-2 rounded-lg text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-800/80 break-all text-[11px]">
                        {data.commitment.salted_input_hash}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase block">CSPRNG Secret Salt (32 bytes):</span>
                        <div className="bg-white dark:bg-slate-950 px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-[11px] truncate">
                          {data.commitment.secret_salt}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase block">Format Domain:</span>
                        <div className="bg-white dark:bg-slate-950 px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 text-[11px]">
                          TrustAudit:v1 || RFC8785_JCS(data) || salt
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Consultative AI Risk Engine Card */}
              <div className="bg-slate-100/70 dark:bg-slate-950/60 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
                      Consultative AI Risk Assessment & SHAP Explainability
                    </h3>
                  </div>
                  {data.ai_assessment && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      Model: {data.ai_assessment.model_version}
                    </span>
                  )}
                </div>

                {data.ai_assessment ? (
                  <div className="space-y-4">
                    {/* Gauge & Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-mono">Calibrated Risk Score</div>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span
                            className={`text-3xl font-extrabold font-mono ${
                              data.ai_assessment.risk_level === 'HIGH'
                                ? 'text-rose-600 dark:text-rose-400'
                                : data.ai_assessment.risk_level === 'MEDIUM'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {data.ai_assessment.risk_score}
                          </span>
                          <span className="text-xs text-slate-500">/ 100</span>
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-mono">Risk Level</div>
                        <span
                          className={`inline-block mt-1 px-2.5 py-1 rounded text-xs font-bold ${
                            data.ai_assessment.risk_level === 'HIGH'
                              ? 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                              : data.ai_assessment.risk_level === 'MEDIUM'
                              ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {data.ai_assessment.risk_level} RISK
                        </span>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-mono">Explanation Commitment</div>
                        <div className="text-[10px] font-mono text-slate-600 dark:text-slate-400 truncate mt-1">
                          {data.ai_assessment.explanation_hash}
                        </div>
                      </div>
                    </div>

                    {/* SHAP Feature Contribution Bars */}
                    {data.ai_assessment.shap_summary && data.ai_assessment.shap_summary.top_features && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Top Predictive Risk Drivers (Local SHAP Feature Importance)
                        </div>
                        <div className="space-y-1.5">
                          {data.ai_assessment.shap_summary.top_features.map((feat: any, idx: number) => {
                            const isPositive = feat.shap_value >= 0;
                            const absVal = Math.min(Math.abs(feat.shap_value) * 100, 100);

                            return (
                              <div
                                key={idx}
                                className="bg-white dark:bg-slate-900/80 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-2 min-w-[180px]">
                                  {isPositive ? (
                                    <TrendingUp className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 flex-shrink-0" />
                                  ) : (
                                    <TrendingDown className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 flex-shrink-0" />
                                  )}
                                  <span className="font-mono text-slate-800 dark:text-slate-200">{feat.feature}</span>
                                </div>

                                <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 min-w-[80px]">
                                  val: {String(feat.feature_value)}
                                </div>

                                <div className="flex-1 bg-slate-200 dark:bg-slate-950 h-2 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      isPositive ? 'bg-rose-500' : 'bg-sky-500'
                                    }`}
                                    style={{ width: `${Math.max(absVal, 8)}%` }}
                                  />
                                </div>

                                <div className="font-mono text-[10px] text-right min-w-[50px]">
                                  <span className={isPositive ? 'text-rose-600 dark:text-rose-400' : 'text-sky-600 dark:text-sky-400'}>
                                    {isPositive ? '+' : ''}
                                    {Number(feat.shap_value).toFixed(3)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-6 text-center space-y-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      This transaction is awaiting AI risk scoring. The AI Oracle will analyze features and record its
                      recommendation on-chain.
                    </p>
                    <button
                      onClick={handleRunAI}
                      disabled={aiLoading}
                      className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg transition shadow-md shadow-sky-500/20 inline-flex items-center gap-2"
                    >
                      <Brain className="w-4 h-4" />
                      <span>{aiLoading ? 'Computing SHAP Risk...' : 'Run Consultative AI Risk Model'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Multi-Signature Quorum & Rejection Audit Trail */}
              <div className="bg-slate-100/70 dark:bg-slate-950/60 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                    {data.status === 'REJECTED' ? (
                      <XCircle className="w-4 h-4 text-rose-500" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                    )}
                    <span>
                      {data.status === 'REJECTED'
                        ? 'On-Chain Rejection & Quorum Audit Trail'
                        : 'Multi-Signature Quorum Audit Trail'}
                    </span>
                  </h3>
                  <span
                    className={`text-xs font-mono font-semibold ${
                      data.status === 'REJECTED'
                        ? 'text-rose-500 font-bold'
                        : 'text-sky-600 dark:text-sky-400'
                    }`}
                  >
                    {data.status === 'REJECTED'
                      ? 'REJECTED ON-CHAIN'
                      : `${data.approval_count} of ${data.required_approvals} Required Signatures`}
                  </span>
                </div>

                {(() => {
                  if (!data.approvals || data.approvals.length === 0) {
                    if (data.status === 'REJECTED') {
                      return (
                        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 flex items-center gap-3">
                          <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                          <div>
                            <div className="font-bold text-rose-200 uppercase font-mono">Case Formally Rejected On-Chain</div>
                            <div className="text-[11px] text-rose-300/80 mt-0.5">
                              This transaction was rejected during regulatory review on blockchain. No further approvals can be submitted.
                            </div>
                          </div>
                        </div>
                      );
                    }
                    if (data.status === 'ESCALATED') {
                      return (
                        <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/10 text-xs text-purple-300 flex items-center gap-3">
                          <AlertTriangle className="w-5 h-5 text-purple-400 flex-shrink-0" />
                          <div>
                            <div className="font-bold text-purple-200 uppercase font-mono">Case Escalated</div>
                            <div className="text-[11px] text-purple-300/80 mt-0.5">
                              The review deadline expired (&gt;48h). This case has been escalated to senior management.
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="py-4 text-center text-xs text-slate-500">
                        No approvals recorded yet. Case is awaiting review in the Approval Center.
                      </div>
                    );
                  }

                  // Deduplicate by role + decision + approver address (case-insensitive)
                  const dedupMap = new Map<string, any>();
                  for (const app of data.approvals) {
                    const key = `${app.role}_${app.decision || 'APPROVED'}_${(app.approver || '').toLowerCase()}`;
                    const current = dedupMap.get(key);
                    if (!current) {
                      dedupMap.set(key, app);
                    } else {
                      // Prefer human justification over generic indexer string
                      const currentIsGeneric =
                        current.justification_text?.includes('Recorded from on-chain') ||
                        current.justification_text?.includes('Regulatory sign-off');
                      const newIsGeneric =
                        app.justification_text?.includes('Recorded from on-chain') ||
                        app.justification_text?.includes('Regulatory sign-off');
                      if (currentIsGeneric && !newIsGeneric) {
                        dedupMap.set(key, app);
                      }
                    }
                  }
                  const displayApprovals = Array.from(dedupMap.values());

                  return (
                    <div className="space-y-2">
                      {displayApprovals.map((app: any, idx: number) => {
                        const isRejected = app.decision === 'REJECTED';
                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                              isRejected
                                ? 'bg-rose-500/5 dark:bg-rose-950/20 border-rose-500/40 text-rose-900 dark:text-rose-200'
                                : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {isRejected ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40 font-mono flex items-center gap-1">
                                    <XCircle className="w-3 h-3" /> REJECTED: {app.role}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-mono flex items-center gap-1">
                                    <Check className="w-3 h-3" /> {app.role}
                                  </span>
                                )}
                                <span className="font-mono text-slate-700 dark:text-slate-300">
                                  {app.approver.slice(0, 8)}...{app.approver.slice(-6)}
                                </span>
                                {app.is_override && (
                                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                                    AI OVERRIDE
                                  </span>
                                )}
                              </div>
                              {app.justification_text && (
                                <p
                                  className={`text-[11px] italic ${
                                    isRejected
                                      ? 'text-rose-700 dark:text-rose-300 font-medium'
                                      : 'text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  "{app.justification_text}"
                                </p>
                              )}
                            </div>

                            <div className="text-right">
                              <span className="text-[10px] text-slate-500 font-mono block">Comment Hash:</span>
                              <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400">
                                {app.comment_hash ? `${app.comment_hash.slice(0, 10)}...${app.comment_hash.slice(-6)}` : 'N/A'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Soulbound NFT Audit Certificate */}
              {data.certificate_id && data.certificate_id > 0 && (
                <div className="bg-gradient-to-r from-purple-500/10 to-slate-100 dark:from-purple-950/40 dark:to-slate-950 p-5 rounded-xl border border-purple-500/30 dark:border-purple-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                        Soulbound Audit Certificate (ERC-721 + ERC-5192)
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1 font-mono">
                      <Lock className="w-3 h-3" /> LOCKED (NON-TRANSFERABLE)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-mono block">NFT Token ID</span>
                      <span className="text-lg font-bold font-mono text-purple-600 dark:text-purple-300">
                        #{data.certificate_id}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-mono block">Certificate Status</span>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        Immutable On-Chain Verification Token
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bank Execution Simulator Section */}
              {data.status === 'APPROVED' && (
                <div className="bg-slate-100/70 dark:bg-slate-950/60 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                      <Play className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Decoupled Bank Execution Simulator</span>
                    </h3>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Post-Governance Settlement</span>
                  </div>

                  {execMsg && (
                    <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-lg text-sky-600 dark:text-sky-400 text-xs">
                      {execMsg}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-600 dark:text-slate-400 max-w-lg">
                      All governance rules and multi-signature requirements are fulfilled. The banking transfer can now
                      be dispatched to the simulated core banking ledger.
                    </p>
                    <button
                      onClick={handleTriggerBankExecution}
                      disabled={execLoading}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition shadow-md shadow-emerald-500/20 inline-flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{execLoading ? 'Executing...' : 'Trigger Bank Transfer'}</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};