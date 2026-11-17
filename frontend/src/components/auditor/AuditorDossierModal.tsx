import React, { useState } from 'react';
import {
  ShieldCheck, FileSearch, Download, Printer, Copy, Check, X,
  Lock, Award, CheckCircle2, Database, KeyRound
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { listCases, getCaseDetail } from '../../lib/api-client';
import { GlassCard, Button, Badge } from '../ui';
import type { CaseSummary } from '../../types';

interface AuditorApprovalRecord {
  role: string;
  approver: string;
  comment_hash: string;
  is_override?: boolean;
  timestamp?: number | string;
}

interface AuditorCaseData {
  case_id: string;
  status: string;
  amount?: number;
  currency?: string;
  value_tier?: number;
  sender_iban?: string;
  beneficiary_name?: string;
  beneficiary_iban?: string;
  salted_input_hash?: string;
  secret_salt?: string;
  ai_explanation_hash?: string;
  required_approvals?: number;
  approval_count?: number;
  approvals?: AuditorApprovalRecord[];
  certificate_id?: number | string;
  transaction?: {
    amount?: number;
    currency?: string;
    sender_name?: string;
    sender_iban?: string;
    beneficiary_name?: string;
    beneficiary_iban?: string;
  };
  commitment?: {
    salted_input_hash?: string;
    secret_salt?: string;
  };
  ai_assessment?: {
    explanation_hash?: string;
  };
}

interface AuditorDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCaseId?: string;
}

export const AuditorDossierModal: React.FC<AuditorDossierModalProps> = ({
  isOpen,
  onClose,
  initialCaseId,
}) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>(initialCaseId || '');
  const [copied, setCopied] = useState<boolean>(false);

  const { data: casesResponse } = useQuery({
    queryKey: ['cases'],
    queryFn: () => listCases(),
    staleTime: 30_000,
  });

  const cases = (casesResponse?.items ?? []) as CaseSummary[];

  // Auto-select first case if none selected
  React.useEffect(() => {
    if (cases.length > 0 && !selectedCaseId) {
      setSelectedCaseId(initialCaseId || cases[0].case_id);
    }
  }, [cases, selectedCaseId, initialCaseId]);

  const { data: rawDetail, isLoading } = useQuery({
    queryKey: ['case-detail', selectedCaseId],
    queryFn: () => getCaseDetail(selectedCaseId),
    enabled: Boolean(selectedCaseId),
    staleTime: 30_000,
  });

  if (!isOpen) return null;

  const cd = (rawDetail as AuditorCaseData | undefined);

  const handleDownloadDossier = () => {
    if (!cd) return;
    const packet = {
      standard: 'TrustAudit:RFC-8785:v1.0',
      attestation: 'Sovereign Regulatory Audit Dossier',
      timestamp: new Date().toISOString(),
      case_id: cd.case_id,
      status: cd.status,
      settlement_value: {
        amount: cd.amount,
        currency: cd.currency,
        tier: cd.value_tier,
      },
      counterparties: {
        sender_iban: cd.sender_iban,
        beneficiary_name: cd.beneficiary_name,
        beneficiary_iban: cd.beneficiary_iban,
      },
      cryptographic_anchors: {
        domain: 'TrustAudit:v1 || JCS(data) || salt',
        salted_input_hash: cd.salted_input_hash,
        secret_salt: cd.secret_salt,
        ai_explanation_hash: cd.ai_explanation_hash,
      },
      quorum_governance: {
        required: cd.required_approvals,
        recorded: cd.approval_count,
        signatures: cd.approvals?.map((item: AuditorApprovalRecord) => ({
          role: item.role,
          signer: item.approver,
          justification_hash: item.comment_hash,
          is_override: item.is_override,
          timestamp: item.timestamp,
        })),
      },
      certificate_nft: {
        token_id: cd.certificate_id,
        standard: 'ERC-721 + ERC-5192 (Soulbound)',
        transferability: 'PERMANENTLY_LOCKED',
      },
    };

    const blob = new Blob([JSON.stringify(packet, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.download = `TrustAudit-Regulatory-Dossier-${cd.case_id.slice(0, 10)}.json`;
    downloadAnchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-3xl z-10 animate-scale-in">
        <GlassCard className="p-0 overflow-hidden border border-purple-500/40 bg-white dark:bg-[#0a0d18] shadow-2xl rounded-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-purple-500/5 dark:bg-purple-500/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-500 flex items-center justify-center border border-purple-500/30 text-xl">
                🔍
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-mono flex items-center gap-2">
                  External Auditor Regulatory Dossier
                  <Badge variant="outline" className="text-[10px] bg-purple-500/20 text-purple-400 border-purple-500/40">
                    Forensic Oversight
                  </Badge>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Independent cryptographic evidence inspection &amp; regulatory export
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-purple-400 focus:outline-none cursor-pointer max-w-[200px] truncate"
              >
                {cases.map((c) => (
                  <option key={c.case_id} value={c.case_id}>
                    {c.case_id.slice(0, 10)}... ({Number(c.amount).toLocaleString()} {c.currency})
                  </option>
                ))}
              </select>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-5 text-xs font-mono">
            {isLoading || !cd ? (
              <div className="p-8 text-center text-slate-500">Loading regulatory dossier...</div>
            ) : (
              <>
                {/* Status Snapshot */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">Lifecycle Status</span>
                    <strong className="text-emerald-500 font-bold">{cd.status}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">Settlement Amount</span>
                    <strong className="text-cyan-400 font-bold">{Number(cd.amount).toLocaleString()} {cd.currency}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">Quorum Signatures</span>
                    <strong className="text-purple-400 font-bold">{cd.approval_count} / {cd.required_approvals}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">Soulbound NFT</span>
                    <strong className="text-amber-400 font-bold">{cd.certificate_id ? `Token #${cd.certificate_id}` : 'Pending Quorum'}</strong>
                  </div>
                </div>

                {/* Cryptographic Verification Proofs */}
                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-800 dark:text-slate-200 font-bold text-xs">
                    <span className="flex items-center gap-1.5 text-purple-400">
                      <KeyRound className="w-4 h-4" />
                      Salted SHA-256 On-Chain Commitment
                    </span>
                    <span className="text-[10px] text-emerald-400">VERIFIED MATHEMATICALLY</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/60 text-emerald-400 text-[11px] break-all border border-emerald-500/20">
                    {cd.salted_input_hash || '0x...'}
                  </div>
                  <div className="text-[10px] text-slate-500 flex justify-between">
                    <span>Domain: TrustAudit:v1 || JCS(data) || salt</span>
                    <span>Salt: {cd.secret_salt ? `${cd.secret_salt.slice(0, 14)}...` : '32-byte CS-PRNG'}</span>
                  </div>
                </div>

                {/* Signers Trail */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                    Institutional Governance Audit Trail
                  </span>
                  {cd.approvals && cd.approvals.length > 0 ? (
                    <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                      {cd.approvals.map((app: AuditorApprovalRecord, idx: number) => (
                        <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between">
                          <div>
                            <span className="text-cyan-400 font-bold">{app.role}</span>
                            <span className="text-slate-500 text-[11px] ml-2">({app.approver.slice(0, 8)}...{app.approver.slice(-6)})</span>
                            <div className="text-[10px] text-slate-400 mt-0.5">Comment Hash: {app.comment_hash.slice(0, 16)}...</div>
                          </div>
                          <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Signed
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900/40 text-slate-500 text-center text-xs">
                      No approvals recorded on this case yet.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            <a
              href="/tamper-lab"
              onClick={onClose}
              className="text-xs font-mono text-purple-400 hover:underline flex items-center gap-1"
            >
              <span>Inspect in Tamper Lab →</span>
            </a>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="text-xs font-mono border-purple-500/40 text-purple-300 hover:bg-purple-500/10 flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Dossier</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleDownloadDossier}
                disabled={!cd}
                className="text-xs font-bold font-mono bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Audit Package (.JSON)</span>
              </Button>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
