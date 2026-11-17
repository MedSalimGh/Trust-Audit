import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle, XCircle, AlertTriangle, ShieldCheck, Clock,
  FileText, Send, RefreshCw, Lock, Loader2, Shield, Search,
  ArrowUpDown, Copy, Check, Eye, Zap, Globe, Sparkles,
  UserCheck, Users, Fingerprint, ShieldAlert, AlertCircle,
  FileSearch, Crown, Activity, Download
} from 'lucide-react';
import { ethers } from 'ethers';
import { listCases, computeCommentHash, syncCaseStatus } from '../lib/api-client';
import { useWallet } from '../context/WalletContext';
import { REGISTRY_ADDRESS, REGISTRY_ABI, CHAIN_ID, CHAIN_ID_HEX } from '../config/contracts';
import { AdminGovernanceModal } from './admin/AdminGovernanceModal';
import { AuditorDossierModal } from './auditor/AuditorDossierModal';
import {
  GlassCard, Button, PageHeader, RiskBadge,
  EmptyState, SkeletonCard, Textarea,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  TransactionStatus, useToast,
} from './ui';
import type { CaseSummary, TxStatus } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ApprovalCenterProps {
  onSelectCase: (caseId: string) => void;
}

type SortOption = 'newest' | 'oldest' | 'amount_desc' | 'amount_asc' | 'risk_desc' | 'quorum_progress';
type FilterOption = 'ALL' | 'HIGH_RISK' | 'TIER_3' | 'MY_ACTION';

const ROLE_ENUM_MAP: Record<string, number> = {
  COMPLIANCE: 0,
  RISK_MANAGER: 1,
  DIRECTOR: 2,
  ADMIN: 0,
};

export function isRolePermittedForTier(
  role: string,
  valueTier: number,
  requiresOverlay: boolean
): { permitted: boolean; reason?: string } {
  if (role === 'OPERATOR') {
    return { permitted: false, reason: 'Separation of Duties: Operators cannot approve transactions.' };
  }
  if (role === 'AUDITOR') {
    return { permitted: false, reason: 'Auditor mode is read-only (evidence verification).' };
  }
  if (valueTier === 2) {
    if (['COMPLIANCE', 'RISK_MANAGER', 'DIRECTOR', 'ADMIN'].includes(role)) {
      return { permitted: true };
    }
    return { permitted: false, reason: 'Only Compliance, Risk Manager, and Executive Director can approve Tier 3 transactions.' };
  }
  if (valueTier === 1) {
    if (requiresOverlay) {
      if (['COMPLIANCE', 'RISK_MANAGER', 'ADMIN'].includes(role)) {
        return { permitted: true };
      }
      return { permitted: false, reason: 'Tier 2 with elevated AI Risk Overlay permits only Compliance and Risk Manager. Director sign-off is not permitted.' };
    }
    if (['COMPLIANCE', 'ADMIN'].includes(role)) {
      return { permitted: true };
    }
    return { permitted: false, reason: 'Standard Tier 2 transactions only permit Compliance approval. Executive Director and Risk Manager approvals are not permitted.' };
  }
  if (['COMPLIANCE', 'ADMIN'].includes(role)) {
    return { permitted: true };
  }
  return { permitted: false, reason: 'Tier 1 transactions (<5,000 DT) only permit Compliance approval. Executive Director and Risk Manager approvals are not permitted.' };
}

// ─── Chain switch helper (shared by approve + reject) ────────────────────────

async function ensureCorrectChain(): Promise<ethers.BrowserProvider> {
  const ethereum = (window as unknown as Record<string, unknown>).ethereum as ethers.Eip1193Provider & {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  };
  const provider = new ethers.BrowserProvider(ethereum);
  const network = await provider.getNetwork();

  if (Number(network.chainId) !== CHAIN_ID) {
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CHAIN_ID_HEX }],
      });
    } catch (switchErr: unknown) {
      const err = switchErr as { code?: number };
      if (err.code === 4902) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: CHAIN_ID_HEX,
              chainName: 'Ganache Local EVM',
              rpcUrls: ['http://127.0.0.1:8545'],
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            },
          ],
        });
      } else {
        throw new Error(`Please switch MetaMask to Ganache Local EVM (Chain ID: ${CHAIN_ID}).`);
      }
    }
  }

  const activeProvider = new ethers.BrowserProvider(ethereum);
  const activeNetwork = await activeProvider.getNetwork();
  if (Number(activeNetwork.chainId) !== CHAIN_ID) {
    throw new Error(
      `Safety Block: MetaMask is on ${activeNetwork.name} (Chain ID ${activeNetwork.chainId}). Switch to Ganache Local EVM (Chain ID: ${CHAIN_ID}).`
    );
  }

  return activeProvider;
}

// ─── Direct RPC helper ───────────────────────────────────────────────────────

function getDirectRpcProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider('http://127.0.0.1:8545');
}

function parseWeb3Error(err: unknown): string {
  const e = err as {
    reason?: string;
    message?: string;
    shortMessage?: string;
    info?: { error?: { message?: string } };
  };
  const rawMsg =
    e.reason ||
    e.shortMessage ||
    e.info?.error?.message ||
    e.message ||
    'Transaction execution failed.';

  const lower = rawMsg.toLowerCase();
  if (
    lower.includes('previous transaction is still being signed') ||
    lower.includes('still being signed') ||
    lower.includes('already pending') ||
    lower.includes('nonce too high') ||
    lower.includes('nonce too low')
  ) {
    return 'METAMASK_LOCKED: A previous transaction is still pending in MetaMask or your nonce queue is locked.';
  }

  if (
    lower.includes('user rejected') ||
    lower.includes('action_rejected')
  ) {
    return 'Transaction signing was cancelled by the user in MetaMask.';
  }

  return rawMsg;
}

// ─── Justification Presets ───────────────────────────────────────────────────

const JUSTIFICATION_PRESETS = [
  { label: '🛡️ Sanctions & KYC Cleared', text: 'Verified source of funds, beneficiary identity, and international sanctions list check.' },
  { label: '🤝 Corporate Guarantee on File', text: 'Risk assessment reviewed. Elevated risk mitigated by verified corporate guarantee and collateral.' },
  { label: '📄 Commercial Invoice Authenticated', text: 'Commercial trade documentation, import declaration, and supplier contract fully authenticated.' },
  { label: '🏛️ Executive Threshold Verified', text: 'Approved by Executive Director in accordance with institutional high-value governance limits.' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export const ApprovalCenter: React.FC<ApprovalCenterProps> = ({ onSelectCase }) => {
  const navigate = useNavigate();
  const { account, activeRole } = useWallet();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [auditorDossierCaseId, setAuditorDossierCaseId] = useState<string | null>(null);
  const [adminGovOpen, setAdminGovOpen] = useState(false);

  // Filter & Search Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('ALL');
  const [copiedCaseId, setCopiedCaseId] = useState<string | null>(null);

  // Review modal state
  const [selectedCase, setSelectedCase] = useState<CaseSummary | null>(null);
  const [justification, setJustification] = useState('');
  const [isOverride, setIsOverride] = useState(false);
  const [txStatus, setTxStatus] = useState<TxStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [liveHashPreview, setLiveHashPreview] = useState<string>('');

  const [onChainChecks, setOnChainChecks] = useState<{
    alreadyVoted: boolean;
    roleVoted: boolean;
    isOperator: boolean;
    isPermittedForTier: boolean;
    tierReason?: string;
    isChecking: boolean;
  }>({
    alreadyVoted: false,
    roleVoted: false,
    isOperator: false,
    isPermittedForTier: true,
    isChecking: false,
  });

  // TanStack Query for pending cases
  const {
    data: casesResponse,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['cases', 'PENDING_APPROVAL'],
    queryFn: () => listCases('PENDING_APPROVAL'),
    staleTime: 2000,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });

  const rawCases = (casesResponse?.items ?? []) as CaseSummary[];

  // Dynamic live SHA-256 preview calculation
  useEffect(() => {
    if (!justification.trim()) {
      setLiveHashPreview('');
      return;
    }
    try {
      const hash = ethers.sha256(ethers.toUtf8Bytes(justification.trim()));
      setLiveHashPreview(hash);
    } catch {
      setLiveHashPreview('');
    }
  }, [justification]);

  // Copy helper
  const handleCopy = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedCaseId(id);
    setTimeout(() => setCopiedCaseId(null), 2000);
  }, []);

  // Filter and sort cases
  const processedCases = useMemo(() => {
    let result = [...rawCases];

    // 1. Text Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.case_id.toLowerCase().includes(q) ||
          c.beneficiary_name.toLowerCase().includes(q) ||
          (c.transaction_type && c.transaction_type.toLowerCase().includes(q)) ||
          String(c.amount).includes(q)
      );
    }

    // 2. Quick Category Filter
    if (activeFilter === 'HIGH_RISK') {
      result = result.filter((c) => {
        const s = c.risk_score ?? c.ai_risk_score;
        return (c.risk_level as string) === 'HIGH' || (s !== null && s !== undefined && s >= 70);
      });
    } else if (activeFilter === 'TIER_3') {
      result = result.filter((c) => c.value_tier === 2);
    } else if (activeFilter === 'MY_ACTION') {
      result = result.filter((c) => {
        const isHigh = (c.risk_level as string) === 'HIGH';
        return isRolePermittedForTier(activeRole, c.value_tier, isHigh).permitted;
      });
    }

    // 3. Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'amount_desc':
          return Number(b.amount) - Number(a.amount);
        case 'amount_asc':
          return Number(a.amount) - Number(b.amount);
        case 'risk_desc': {
          const sA = a.risk_score ?? a.ai_risk_score ?? 0;
          const sB = b.risk_score ?? b.ai_risk_score ?? 0;
          return sB - sA;
        }
        case 'quorum_progress': {
          const progA = a.approval_count / (a.required_approvals || 1);
          const progB = b.approval_count / (b.required_approvals || 1);
          return progB - progA;
        }
        default:
          return 0;
      }
    });

    return result;
  }, [rawCases, searchQuery, activeFilter, sortBy, activeRole]);

  // Open review modal & check on-chain conditions via fast direct RPC
  const openReviewModal = async (c: CaseSummary) => {
    setSelectedCase(c);
    setJustification(
      activeRole === 'COMPLIANCE'
        ? 'Verified source of funds, beneficiary identity, and sanctions list check.'
        : activeRole === 'RISK_MANAGER'
        ? 'Risk assessment reviewed. Elevated risk mitigated by corporate guarantee.'
        : activeRole === 'DIRECTOR'
        ? 'Approved by Executive Director in accordance with high-value governance limits.'
        : 'Approved under institutional governance audit policy.'
    );
    setIsOverride((c.risk_level as string) === 'HIGH');
    setErrorMessage(null);
    setStatusMsg(null);
    setTxStatus('idle');
    setTxHash(null);

    const isHigh = (c.risk_level as string) === 'HIGH';
    const tierPerm = isRolePermittedForTier(activeRole, c.value_tier, isHigh);

    setOnChainChecks({
      alreadyVoted: false,
      roleVoted: false,
      isOperator: false,
      isPermittedForTier: tierPerm.permitted,
      tierReason: tierPerm.reason,
      isChecking: true,
    });

    try {
      const rpcProvider = getDirectRpcProvider();
      const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, rpcProvider);
      const roleIndex = ROLE_ENUM_MAP[activeRole] ?? 0;

      const [voted, roleSubmitted, caseDetails] = await Promise.all([
        account ? registry.hasApproved(c.case_id, account) : Promise.resolve(false),
        registry.hasRoleApproved(c.case_id, roleIndex),
        registry.getCase(c.case_id).catch(() => null),
      ]);

      setOnChainChecks({
        alreadyVoted: Boolean(voted),
        roleVoted: Boolean(roleSubmitted),
        isOperator: caseDetails && account ? caseDetails.operator.toLowerCase() === account.toLowerCase() : false,
        isPermittedForTier: tierPerm.permitted,
        tierReason: tierPerm.reason,
        isChecking: false,
      });
    } catch (checkErr) {
      console.warn('Direct on-chain check error:', checkErr);
      setOnChainChecks((prev) => ({ ...prev, isChecking: false }));
    }
  };

  const closeModal = () => {
    setSelectedCase(null);
    setJustification('');
    setErrorMessage(null);
    setStatusMsg(null);
    setTxStatus('idle');
    setTxHash(null);
  };

  // ─── Approve handler ─────────────────────────────────────────────────

  const handleApprove = async () => {
    if (!selectedCase || !account) return;
    if (!justification.trim()) {
      setErrorMessage('A written justification is required for regulatory audit trails.');
      return;
    }

    const roleIndex = ROLE_ENUM_MAP[activeRole] ?? 0;

    try {
      setErrorMessage(null);
      setTxStatus('submitting');
      setStatusMsg('Computing canonical justification hash...');

      const hashRes = await computeCommentHash(selectedCase.case_id, justification.trim());
      const commentHash = hashRes.comment_hash;

      setStatusMsg('Verifying network connection...');
      const provider = await ensureCorrectChain();

      setStatusMsg('Validating on-chain invariants before signing...');
      const signer = await provider.getSigner();
      const signerAddress = (await signer.getAddress()).toLowerCase();
      const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);

      // Verify role
      const targetRoleHash = await (
        roleIndex === 0
          ? registry.COMPLIANCE_ROLE()
          : roleIndex === 1
          ? registry.RISK_MANAGER_ROLE()
          : registry.DIRECTOR_ROLE()
      );

      const [hasRole, isSysAdmin] = await Promise.all([
        registry.hasRole(targetRoleHash, signerAddress),
        registry.hasRole(await registry.DEFAULT_ADMIN_ROLE(), signerAddress),
      ]);

      if (!hasRole && !isSysAdmin) {
        throw new Error(
          `Connected wallet (${signerAddress.slice(0, 10)}...) does NOT hold the ${activeRole} role on-chain. Switch MetaMask to the authorized ${activeRole.replace('_', ' ')} account.`
        );
      }

      // Pre-flight checks on-chain via direct RPC
      const rpcProvider = getDirectRpcProvider();
      const readRegistry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, rpcProvider);

      const [alreadyVoted, roleAlreadyVoted, onChainCase] = await Promise.all([
        readRegistry.hasApproved(selectedCase.case_id, signerAddress),
        readRegistry.hasRoleApproved(selectedCase.case_id, roleIndex),
        readRegistry.getCase(selectedCase.case_id),
      ]);

      if (alreadyVoted) {
        throw new Error(
          `Anti-double voting: Your connected wallet (${signerAddress.slice(0, 10)}...) has already recorded an approval for this case.`
        );
      }

      if (roleAlreadyVoted) {
        throw new Error(
          `The ${activeRole.replace('_', ' ')} approval has already been submitted for this case. Switch your MetaMask account to the next required role (e.g., Risk Manager or Director).`
        );
      }

      if (onChainCase.operator.toLowerCase() === signerAddress) {
        throw new Error(
          'Separation of duties: The operator who registered this case cannot approve it.'
        );
      }

      if (Number(onChainCase.status) !== 2) {
        const statusNames = ['NONE', 'REGISTERED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ESCALATED'];
        const currentStatus = statusNames[Number(onChainCase.status)] || String(onChainCase.status);
        throw new Error(
          `This case cannot be approved because on-chain status is ${currentStatus} (expected PENDING_APPROVAL).`
        );
      }

      // Submit on-chain via MetaMask signer
      setStatusMsg('Please confirm the approval in your MetaMask wallet...');
      const tx = await registry.submitApproval(selectedCase.case_id, roleIndex, commentHash, isOverride);
      setTxStatus('confirming');
      setTxHash(tx.hash);
      setStatusMsg(`Transaction broadcast: ${tx.hash.slice(0, 10)}... Waiting for confirmation...`);
      await tx.wait();

      // Sync off-chain database with fresh on-chain status and recorded vote
      await syncCaseStatus(selectedCase.case_id, {
        justification: justification.trim(),
        decision: 'APPROVED',
        role: activeRole,
        approver: account,
        comment_hash: commentHash,
      });

      // Verify final status
      const updatedCase = await registry.getCase(selectedCase.case_id);
      const statusNames = ['NONE', 'REGISTERED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ESCALATED'];
      const statusStr = statusNames[Number(updatedCase.status)] || 'UNKNOWN';

      if (statusStr === 'APPROVED') {
        const certId = Number(updatedCase.certificateId);
        toast({
          title: 'Case Fully Approved & Executed!',
          description: `Consensus quorum reached. Soulbound Certificate NFT #${certId} minted.`,
          variant: 'success',
        });
      }

      setTxStatus('confirmed');
      setStatusMsg('Approval successfully recorded on-chain!');
      toast({ title: 'Approval Confirmed', description: 'On-chain signature recorded.', variant: 'success' });

      // Refresh and close
      setTimeout(() => {
        setSelectedCase(null);
        queryClient.invalidateQueries({ queryKey: ['cases'] });
      }, 1500);
    } catch (err: unknown) {
      console.error('Approval submission error:', err);
      setTxStatus('error');
      setErrorMessage(parseWeb3Error(err));
    }
  };

  // ─── Reject handler ──────────────────────────────────────────────────

  const handleReject = async () => {
    if (!selectedCase || !account) return;
    if (!justification.trim()) {
      setErrorMessage('A written rejection justification is required.');
      return;
    }

    try {
      setErrorMessage(null);
      setTxStatus('submitting');
      setStatusMsg('Computing canonical justification hash...');

      const hashRes = await computeCommentHash(selectedCase.case_id, justification.trim());
      const commentHash = hashRes.comment_hash;

      setStatusMsg('Verifying network connection...');
      const provider = await ensureCorrectChain();

      setStatusMsg('Please confirm rejection in your MetaMask wallet...');
      const signer = await provider.getSigner();
      const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);

      const tx = await registry.rejectCase(selectedCase.case_id, commentHash);
      setTxStatus('confirming');
      setTxHash(tx.hash);
      setStatusMsg(`Rejection broadcast: ${tx.hash.slice(0, 10)}...`);
      await tx.wait();

      await syncCaseStatus(selectedCase.case_id, {
        justification: justification.trim(),
        decision: 'REJECTED',
        role: activeRole,
        approver: account,
        comment_hash: commentHash,
      });

      setTxStatus('confirmed');
      setStatusMsg('Case formally rejected on blockchain!');
      toast({ title: 'Case Rejected', description: 'Rejection recorded on-chain.', variant: 'info' });

      setTimeout(() => {
        setSelectedCase(null);
        queryClient.invalidateQueries({ queryKey: ['cases'] });
      }, 1500);
    } catch (err: unknown) {
      console.error('Reject submission error:', err);
      setTxStatus('error');
      setErrorMessage(parseWeb3Error(err));
    }
  };

  const isOperator = activeRole === 'OPERATOR';
  const isAuditor = activeRole === 'AUDITOR';
  const isAdmin = activeRole === 'ADMIN';
  const isDirector = activeRole === 'DIRECTOR';
  const isRiskManager = activeRole === 'RISK_MANAGER';
  const isSubmitting = txStatus === 'submitting' || txStatus === 'confirming';

  // Quorum Progress Visualizer
  const renderQuorumProgress = (c: CaseSummary) => {
    const req = c.required_approvals || 1;
    const count = c.approval_count || 0;
    const pct = Math.min(100, Math.round((count / req) * 100));

    const roleLabels =
      c.value_tier === 2
        ? ['Compliance', 'Risk Manager', 'Director']
        : req === 2
        ? ['Compliance', 'Risk Manager']
        : ['Compliance Officer'];

    return (
      <div className="space-y-1.5 min-w-[150px] sm:min-w-[190px]">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Quorum Gate</span>
          </span>
          <span className="font-semibold text-slate-900 dark:text-white">
            <span className="text-cyan-700 dark:text-cyan-400 font-bold">{count}</span> / {req} Signed
          </span>
        </div>
        <div className="flex gap-1.5 h-2 w-full">
          {roleLabels.map((r, idx) => {
            const isDone = idx < count;
            const isCurrent = idx === count;
            return (
              <div
                key={r}
                title={`${r}: ${isDone ? 'Signed' : isCurrent ? 'Next Signer Required' : 'Awaiting Previous'}`}
                className={`flex-1 rounded-full transition-all duration-300 ${
                  isDone
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                    : isCurrent
                    ? 'bg-amber-400/90 animate-pulse'
                    : 'bg-slate-200 dark:bg-slate-800'
                }`}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
          <span>{pct}% complete</span>
          {count >= req ? (
            <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-0.5">
              <Check className="w-2.5 h-2.5" /> Quorum Met
            </span>
          ) : (
            <span>{req - count} needed</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <PageHeader
        title="Multi-Signature Approval Center"
        description="Cryptographic voting console for authorized Compliance, Risk Manager, and Executive Director signers."
        icon={<ShieldCheck className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />}
      >
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="hover:bg-cyan-500/10">
            <RefreshCw className={`w-4 h-4 text-cyan-600 dark:text-cyan-400 ${isFetching ? 'animate-spin' : ''}`} />
            <span className="text-slate-700 dark:text-slate-200 font-medium">Refresh Queue</span>
          </Button>
        </div>
      </PageHeader>

      {/* ── Active Role Persona Banner ───────────────────────────────────── */}
      {isOperator ? (
        <GlassCard className="!border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-300 text-xs flex items-center gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <strong className="block font-semibold">Separation of Duties Enforced by Smart Contract:</strong>
            You are connected as an <strong>OPERATOR</strong>. Operators initiate transactions but are prohibited
            by on-chain rules from approving or rejecting cases. Switch persona in the top navbar to cast votes.
          </div>
        </GlassCard>
      ) : isAuditor ? (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/15 via-purple-500/5 to-transparent border border-purple-500/30 text-purple-950 dark:text-purple-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 shadow-sm shadow-purple-500/20">
              <FileSearch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase font-mono">External Auditor Forensic Review Mode</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-900 dark:text-purple-200 border border-purple-500/40">
                  Read-Only Oversight
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                Separation of Duties enforced: Voting buttons are disabled for Auditors. You can inspect bit-level evidence, examine canonical JCS commitments, and export regulatory dossiers.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => setAuditorDossierCaseId(rawCases[0]?.case_id || '')}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Dossier (.JSON)</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/tamper-lab')}
              className="border-purple-500/40 text-purple-900 dark:text-purple-300 hover:bg-purple-500/10 text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <span>Tamper Lab</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/80 dark:bg-[#070d1e]/80 border border-slate-200 dark:border-cyan-500/25 backdrop-blur-md shadow-xs">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-cyan-600 dark:bg-cyan-400" />
              <div className="w-3 h-3 rounded-full bg-cyan-600 dark:bg-cyan-400 animate-ping absolute opacity-75" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Active Signer Persona:</span>
                <span className="text-xs font-bold uppercase font-mono px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30">
                  {isAdmin ? 'ADMINISTRATOR (Multi-Role)' : activeRole.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                {isDirector
                  ? 'Authorized for Tier 3 (>50k DT) executive high-value transactions.'
                  : isRiskManager
                  ? 'Authorized for Tier 3 (>50k DT) and automated AI Risk Overlays.'
                  : 'Authorized for Tier 1, 2, and 3 standard institutional review.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-right">
            {isAdmin && (
              <Button
                size="sm"
                onClick={() => setAdminGovOpen(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-1 px-3 shadow-md shadow-amber-500/20 flex items-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Emergency Governance Console</span>
              </Button>
            )}
            <div className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-[11px] font-mono text-slate-600 dark:text-slate-400">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold mr-1.5">●</span>
              MetaMask EVM (Chain 1337)
            </div>
          </div>
        </div>
      )}

      {/* ── Enhanced Filter & Sort Tool Bar ──────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-white/70 dark:bg-[#080e1e]/70 border border-slate-200 dark:border-white/5 backdrop-blur-md space-y-3 shadow-xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by beneficiary, case hash, amount, or transfer type..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-[#060a14] border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition shadow-inner"
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

          {/* Sort By Tool */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <ArrowUpDown className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Sort By:</span>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#060a14] border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:border-cyan-500 transition shadow-xs cursor-pointer"
            >
              <option value="newest">🕒 Newest First</option>
              <option value="oldest">⏳ Oldest First</option>
              <option value="amount_desc">💰 Highest Value (DT ↓)</option>
              <option value="amount_asc">💵 Lowest Value (DT ↑)</option>
              <option value="risk_desc">🚨 Highest AI Risk Score (↓)</option>
              <option value="quorum_progress">👥 Quorum Progress (Most Signed)</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-200/60 dark:border-white/5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1" role="tablist">
            {(
              [
                { label: 'All Pending', value: 'ALL' },
                { label: '🚨 High Risk Flags', value: 'HIGH_RISK' },
                { label: 'Tier 3 (>50k DT)', value: 'TIER_3' },
                { label: '✍️ My Action Eligible', value: 'MY_ACTION' },
              ] as const
            ).map((f) => (
              <button
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeFilter === f.value
                    ? 'bg-cyan-700 dark:bg-cyan-500/20 text-white dark:text-cyan-300 border border-cyan-800 dark:border-cyan-500/40 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            Showing <strong className="text-cyan-700 dark:text-cyan-400">{processedCases.length}</strong> of {rawCases.length} pending
          </span>
        </div>
      </div>

      {/* ── Cases Awaiting Review Grid ──────────────────────────────────── */}
      <div className="space-y-3.5">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
        ) : processedCases.length === 0 ? (
          <EmptyState
            icon={<CheckCircle className="w-10 h-10 text-emerald-500" />}
            title="All Clear! No Approvals Matching Filters"
            description={
              searchQuery || activeFilter !== 'ALL'
                ? 'No transactions matched your search or filter criteria. Try clearing filters.'
                : 'There are currently no transaction cases in PENDING_APPROVAL status.'
            }
          />
        ) : (
          processedCases.map((c) => {
            const isHigh = (c.risk_level as string) === 'HIGH';
            const permCheck = isRolePermittedForTier(activeRole, c.value_tier, isHigh);
            const score = c.risk_score ?? c.ai_risk_score;
            const isCopied = copiedCaseId === c.case_id;

            return (
              <div
                key={c.case_id}
                className={`rounded-2xl border transition-all duration-300 relative overflow-hidden group shadow-xs ${
                  isHigh
                    ? 'bg-gradient-to-r from-rose-500/5 via-white dark:via-[#080d1d] to-white dark:to-[#070b16] border-rose-500/30 dark:border-rose-500/25 hover:border-rose-500/60 hover:shadow-[0_10px_35px_-8px_rgba(244,63,94,0.18)]'
                    : 'bg-white dark:bg-gradient-to-r dark:from-[#091024] dark:via-[#070c1a] dark:to-[#060a14] border-slate-200 dark:border-cyan-500/20 hover:border-cyan-500/50 hover:shadow-[0_12px_35px_-10px_rgba(6,182,212,0.18)]'
                }`}
              >
                {/* Glowing edge indicator */}
                <div
                  className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                    isHigh
                      ? 'bg-rose-500'
                      : c.value_tier === 2
                      ? 'bg-purple-500'
                      : c.value_tier === 1
                      ? 'bg-blue-500'
                      : 'bg-cyan-500'
                  }`}
                />

                <div className="p-4 sm:p-5 pl-5 sm:pl-6 space-y-4">
                  {/* Top Row: Identification, Tier, and Amount */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Status Pulse */}
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-[10px] font-mono">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isHigh ? 'bg-rose-500 animate-ping' : 'bg-amber-400 animate-pulse'
                            }`}
                          />
                          <span className={isHigh ? 'text-rose-500 font-bold' : 'text-amber-500 font-semibold'}>
                            {isHigh ? 'HIGH RISK OVERLAY' : 'AWAITING QUORUM'}
                          </span>
                        </div>

                        {/* Monospace Hash with Copy */}
                        <button
                          onClick={(e) => handleCopy(c.case_id, e)}
                          title="Click to copy full 66-character Case Hash"
                          className="font-mono text-xs font-bold text-slate-800 dark:text-cyan-200 hover:text-cyan-500 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-cyan-950/40 border border-slate-200 dark:border-cyan-500/30 transition"
                        >
                          <span>
                            {c.case_id.slice(0, 10)}...{c.case_id.slice(-6)}
                          </span>
                          {isCopied ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-400 hover:text-cyan-400" />
                          )}
                        </button>

                        {/* Value Tier Badge */}
                        {c.value_tier === 2 && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1">
                            <Shield className="w-3 h-3 text-purple-400" />
                            Tier 3 (&gt;50k DT)
                          </span>
                        )}
                        {c.value_tier === 1 && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                            Tier 2 (5k–50k DT)
                          </span>
                        )}
                        {c.value_tier === 0 && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                            Tier 1 (&lt;5k DT)
                          </span>
                        )}
                      </div>

                      {/* Beneficiary & Transaction Type */}
                      <div className="flex items-center gap-2 text-sm text-slate-900 dark:text-slate-100 flex-wrap">
                        <span className="font-semibold">{c.beneficiary_name}</span>
                        <span className="text-slate-400 dark:text-slate-500">•</span>
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/5 flex items-center gap-1">
                          {c.transaction_type?.includes('CROSS') ? (
                            <Globe className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                          ) : (
                            <Zap className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                          )}
                          {c.transaction_type || 'Transfer'}
                        </span>
                      </div>
                    </div>

                    {/* Settlement Amount */}
                    <div className="text-left sm:text-right">
                      <div className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white group-hover:text-cyan-700 dark:group-hover:text-cyan-200 transition-colors">
                        {Number(c.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30">
                          {c.currency}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 flex items-center sm:justify-end gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Created: {new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Row: AI Risk Score & Visual Quorum Progress */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-200/80 dark:border-white/10 items-center">
                    {/* Left: AI Risk Telemetry */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">AI Risk Telemetry:</span>
                      {score !== null && score !== undefined ? (
                        <div className="flex items-center gap-2">
                          <RiskBadge score={score} />
                          {isHigh && (
                            <span className="text-[11px] font-semibold text-rose-500 dark:text-rose-400 flex items-center gap-1">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              Requires Risk Manager Overlay
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Pending AI Screening</span>
                      )}
                    </div>

                    {/* Right: Quorum Gate Progress */}
                    <div className="md:justify-self-end w-full md:w-auto">
                      {renderQuorumProgress(c)}
                    </div>
                  </div>

                  {/* Bottom Row: Actions */}
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectCase(c.case_id)}
                      className="text-xs text-slate-600 dark:text-slate-400 hover:text-cyan-800 dark:hover:text-cyan-300 hover:bg-cyan-500/10 flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span>Inspect Evidence & Hashes</span>
                    </Button>

                    <div className="flex items-center gap-2">
                      {isAuditor && (
                        <Button
                          size="sm"
                          onClick={() => setAuditorDossierCaseId(c.case_id)}
                          className="bg-purple-600/15 hover:bg-purple-600/25 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
                          title="Generate and inspect regulatory audit dossier for this case"
                        >
                          <FileSearch className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          <span>Audit Dossier</span>
                        </Button>
                      )}

                      {!isOperator && !isAuditor && (
                        permCheck.permitted ? (
                          <Button
                            size="sm"
                            onClick={() => openReviewModal(c)}
                            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-all active:scale-95"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            <span>Review & Sign</span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled
                            className="opacity-60 cursor-not-allowed text-xs text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-800"
                            title={permCheck.reason}
                          >
                            <Lock className="w-3.5 h-3.5 mr-1" />
                            <span>
                              {activeRole === 'DIRECTOR'
                                ? 'Tier 3 Only (Director)'
                                : activeRole === 'RISK_MANAGER'
                                ? 'Tier 3 / Overlay Only'
                                : 'Role Ineligible'}
                            </span>
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── High-Fidelity Review & Signing Modal (Light & Dark Mode) ──────── */}
      <Dialog open={!!selectedCase} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="max-w-2xl bg-white dark:bg-[#070b16] border border-slate-200 dark:border-cyan-500/30 text-slate-900 dark:text-slate-100 p-6 rounded-2xl shadow-2xl">
          <DialogHeader className="border-b border-slate-200 dark:border-cyan-500/20 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Sign Governance Decision
                  </DialogTitle>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 uppercase font-semibold">
                    EVM Quorum (1337)
                  </span>
                </div>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  Cryptographically anchor your institutional approval or rejection on Ganache EVM.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedCase && (
            <div className="space-y-4 py-2">
              {/* Financial & Governance Summary Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0c1322] border border-slate-200 dark:border-cyan-500/25 space-y-3 shadow-inner">
                {/* Case Reference with Copy */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-white/5">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Fingerprint className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span>Case Reference:</span>
                  </div>
                  <button
                    onClick={() => handleCopy(selectedCase.case_id)}
                    className="font-mono text-xs font-semibold text-slate-800 dark:text-cyan-300 hover:text-cyan-500 flex items-center gap-1.5 px-2 py-0.5 rounded bg-white dark:bg-[#060a14] border border-slate-200 dark:border-slate-800 transition"
                  >
                    <span>
                      {selectedCase.case_id.slice(0, 14)}...{selectedCase.case_id.slice(-8)}
                    </span>
                    {copiedCaseId === selectedCase.case_id ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400" />
                    )}
                  </button>
                </div>

                {/* 3-Column Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Settlement Value</span>
                    <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
                      {Number(selectedCase.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                      <span className="text-xs text-cyan-700 dark:text-cyan-400">{selectedCase.currency}</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Beneficiary Entity</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate block">
                      {selectedCase.beneficiary_name}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">AI Risk Assessment</span>
                    <div className="mt-0.5">
                      {(() => {
                        const s = selectedCase.risk_score ?? selectedCase.ai_risk_score;
                        return s !== null && s !== undefined ? (
                          <RiskBadge score={s} />
                        ) : (
                          <span className="text-slate-500 italic">Pending AI</span>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Active Signer Identity Strip */}
                <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span className="text-slate-500 dark:text-slate-400">Signing As:</span>
                    <span className="font-bold font-mono text-cyan-800 dark:text-cyan-300 uppercase">
                      {activeRole.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Disconnected'}
                  </div>
                </div>
              </div>

              {/* Pre-flight on-chain condition warnings */}
              {!onChainChecks.isPermittedForTier && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <div>
                    <strong>Governance Limitation:</strong> {onChainChecks.tierReason}
                  </div>
                </div>
              )}

              {onChainChecks.alreadyVoted && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <div>
                    <strong>Duplicate Vote Protected:</strong> Your connected wallet account has already approved this case on-chain. Anti-double signature enforcement prevents submitting multiple votes from the same account.
                  </div>
                </div>
              )}

              {onChainChecks.roleVoted && !onChainChecks.alreadyVoted && (
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-800 dark:text-cyan-300 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                  <div>
                    <strong>Role Quorum Already Met:</strong> The <strong>{activeRole.replace('_', ' ')}</strong> approval is already anchored on-chain. To complete the quorum, switch your wallet to the next required role.
                  </div>
                </div>
              )}

              {onChainChecks.isOperator && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <div>
                    <strong>Separation of Duties Restriction:</strong> This wallet initiated the case. Smart contract rules strictly prohibit operators from signing approvals for their own initiated transactions.
                  </div>
                </div>
              )}

              {/* Error Display */}
              {errorMessage && errorMessage.startsWith('METAMASK_LOCKED:') ? (
                <div className="p-3.5 bg-amber-500/15 border border-amber-500/40 rounded-xl text-amber-900 dark:text-amber-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span>MetaMask Locked: Transaction Queue Pending</span>
                  </div>
                  <p>
                    A previous transaction prompt is still waiting in your MetaMask extension, or the account nonce queue is locked.
                  </p>
                  <div className="p-2.5 bg-black/10 dark:bg-black/30 rounded-lg text-[11px] font-mono space-y-1 text-slate-800 dark:text-slate-300">
                    <div>1. Open your <strong>MetaMask</strong> browser extension.</div>
                    <div>2. If an unconfirmed approval prompt appears, click <strong>Reject</strong>.</div>
                    <div>3. If no prompt appears: Click your account icon &gt; <strong>Settings</strong> &gt; <strong>Advanced</strong> &gt; <strong>Clear activity and nonce data</strong>.</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 mt-1"
                    onClick={() => {
                      setTxStatus('idle');
                      setErrorMessage(null);
                    }}
                  >
                    Dismiss & Retry
                  </Button>
                </div>
              ) : errorMessage ? (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <XCircle className="w-4 h-4 text-rose-500" />
                    <span>{errorMessage}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[11px] h-6 self-start text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    onClick={() => {
                      setTxStatus('idle');
                      setErrorMessage(null);
                    }}
                  >
                    Reset & Try Again
                  </Button>
                </div>
              ) : null}

              {/* Submitting state feedback */}
              {txStatus === 'submitting' && (
                <div className="p-3.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-900 dark:text-cyan-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-500 flex-shrink-0" />
                    <span>{statusMsg || 'Waiting for signature in MetaMask...'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Please review and confirm the transaction prompt inside your MetaMask wallet window.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 mt-1 text-slate-700 dark:text-slate-300"
                    onClick={() => {
                      setTxStatus('idle');
                      setStatusMsg(null);
                      setErrorMessage(null);
                    }}
                  >
                    Cancel Waiting
                  </Button>
                </div>
              )}

              {/* Transaction confirming status */}
              {txStatus === 'confirming' && (
                <TransactionStatus
                  txState={{ status: txStatus, hash: txHash, error: errorMessage ?? null }}
                />
              )}

              {txStatus === 'confirmed' && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="font-semibold">{statusMsg}</span>
                </div>
              )}

              {/* Written Justification Field with Quick Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-900 dark:text-slate-200">
                    Auditable Written Justification <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">Immutable On-Chain Anchor</span>
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-600 dark:text-cyan-400" /> Quick:
                  </span>
                  {JUSTIFICATION_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setJustification(p.text)}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-cyan-950/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5 hover:border-cyan-500/40 transition"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <Textarea
                  rows={3}
                  required
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="State regulatory, compliance, or executive rationale for this decision..."
                  className="w-full text-xs font-sans rounded-xl bg-slate-50 dark:bg-[#060a14] border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />

                {/* Live SHA-256 Hash Preview */}
                {liveHashPreview && (
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-cyan-500/5 dark:bg-cyan-950/20 border border-cyan-500/20 text-[10px] font-mono text-cyan-800 dark:text-cyan-300">
                    <Lock className="w-3 h-3 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                    <span className="text-slate-500 dark:text-slate-400">Live SHA-256 Anchor:</span>
                    <span className="font-bold truncate">{liveHashPreview}</span>
                  </div>
                )}
              </div>

              {/* AI Override Notice Banner */}
              <div
                className={`p-3 rounded-xl border transition-all ${
                  isOverride
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200'
                    : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300'
                }`}
              >
                <label className="flex items-start gap-2.5 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isOverride}
                    onChange={(e) => setIsOverride(e.target.checked)}
                    className="mt-0.5 rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-cyan-600 focus:ring-cyan-500"
                  />
                  <div>
                    <span className="font-semibold block">Explicitly assert AI Override (Contradicts Risk Engine)</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 leading-relaxed">
                      Checking this records an on-chain flag noting that human executive authority superseded the machine learning model risk score.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-cyan-500/20">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleReject}
              disabled={isSubmitting || onChainChecks.alreadyVoted || onChainChecks.isOperator}
              className="bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 border border-rose-500/30 transition shadow-xs flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject Case</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={closeModal}
                disabled={txStatus === 'confirming'}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={
                  isSubmitting ||
                  onChainChecks.isChecking ||
                  !onChainChecks.isPermittedForTier ||
                  onChainChecks.alreadyVoted ||
                  onChainChecks.roleVoted ||
                  onChainChecks.isOperator
                }
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all flex items-center gap-1.5 px-4"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {onChainChecks.isChecking
                    ? 'Verifying On-Chain...'
                    : !onChainChecks.isPermittedForTier
                    ? (activeRole === 'DIRECTOR' ? 'Tier 3 Only (Director)' : 'Tier Ineligible')
                    : onChainChecks.alreadyVoted
                    ? 'Already Signed'
                    : onChainChecks.roleVoted
                    ? 'Role Completed'
                    : onChainChecks.isOperator
                    ? 'Operator Restricted'
                    : 'Sign with MetaMask'}
                </span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Global Modals for Admin Governance & Auditor Dossier */}
      <AdminGovernanceModal isOpen={adminGovOpen} onClose={() => setAdminGovOpen(false)} />
      <AuditorDossierModal
        isOpen={!!auditorDossierCaseId}
        onClose={() => setAuditorDossierCaseId(null)}
        initialCaseId={auditorDossierCaseId || undefined}
      />
    </div>
  );
};
