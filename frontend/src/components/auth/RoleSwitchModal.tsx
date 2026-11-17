import React, { useState } from 'react';
import {
  Shield, Key, Check, Copy, AlertTriangle, ArrowRight, X, ExternalLink,
  Lock, RefreshCw, UserCheck
} from 'lucide-react';
import { GlassCard, Button, Badge } from '../ui';
import { RoleBadge } from '../ui/RoleBadge';
import { DEMO_ROLES } from '../../config/contracts';
import type { ApprovalRoleName } from '../../types';

interface RoleSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRole: string;
  currentAccount: string | null;
  onConfirmSwitch: (role: string) => void;
}

const ROLE_METADATA: Record<string, {
  title: string;
  subtitle: string;
  primaryAddress: string;
  ganacheAddress: string;
  icon: string;
  theme: 'gold' | 'cyan' | 'emerald' | 'purple' | 'rose' | 'amber';
  powers: string[];
  restrictions: string[];
}> = {
  ADMIN: {
    title: 'System Administrator',
    subtitle: 'Sovereign contract governance & emergency circuit breaker',
    primaryAddress: DEMO_ROLES.admin,
    ganacheAddress: DEMO_ROLES.admin_ganache,
    icon: '👑',
    theme: 'gold',
    powers: [
      'Trigger Emergency Circuit Breaker (pause / unpause smart contracts)',
      'Assign & revoke on-chain roles across all institutional signers',
      'Manage Institutional Vault configuration & contract upgrades',
      'Execute settlement test simulations in Bank Simulator'
    ],
    restrictions: [
      'Cannot approve standard banking cases (Separation of Duties)',
      'Cannot modify immutable cryptographic commitments retroactively'
    ],
  },
  AUDITOR: {
    title: 'External Auditor',
    subtitle: 'Independent read-only forensic inspection & regulatory dossiers',
    primaryAddress: DEMO_ROLES.auditor,
    ganacheAddress: DEMO_ROLES.auditor_ganache,
    icon: '🔍',
    theme: 'purple',
    powers: [
      'Bit-level mathematical forensic verification in Tamper Lab',
      'Generate & export Regulatory Audit Dossiers (.json)',
      'Verify ERC-5192 Soulbound NFT audit certificate permanence',
      'Independent verification of off-chain JCS hashes against Ganache EVM'
    ],
    restrictions: [
      'Strictly Read-Only: Cannot initiate transaction cases',
      'Cannot submit multi-signature voting approvals',
      'Zero execution authority over bank treasury'
    ],
  },
  OPERATOR: {
    title: 'Bank Operations Officer',
    subtitle: 'Transaction case initiation & data commitment seeding',
    primaryAddress: DEMO_ROLES.operator,
    ganacheAddress: DEMO_ROLES.operator_ganache,
    icon: '⚡',
    theme: 'cyan',
    powers: [
      'Initiate banking transaction cases with canonical RFC 8785 JSON',
      'Seal 32-byte salted SHA-256 commitments on Ganache EVM',
      'Trigger AI fraud screening engine & SHAP TreeExplainer',
      'Escalate expired cases exceeding 48h governance SLA'
    ],
    restrictions: [
      'Cannot vote or approve initiated cases (Anti-Collusion Guard)',
      'Cannot alter commitments once registered on-chain'
    ],
  },
  COMPLIANCE: {
    title: 'Compliance Officer',
    subtitle: 'Tier 1/2 approvals & regulatory AML/KYC validation',
    primaryAddress: DEMO_ROLES.compliance,
    ganacheAddress: DEMO_ROLES.compliance_ganache,
    icon: '⚖️',
    theme: 'emerald',
    powers: [
      'Sign off on Tier 1 (<5,000 DT) and Tier 2 (<50,000 DT) cases',
      'Review sanctions screening & AML risk indicators',
      'Submit on-chain cryptographic justifications with MetaMask'
    ],
    restrictions: [
      'Cannot solo-approve Tier 3 Enterprise transfers (>50,000 DT)',
      'Cannot bypass Risk Manager AI overrides without rationale'
    ],
  },
  RISK_MANAGER: {
    title: 'Risk Manager',
    subtitle: 'Tier 2/3 approvals & consultative AI risk overlay authorization',
    primaryAddress: DEMO_ROLES.riskManager,
    ganacheAddress: DEMO_ROLES.riskManager_ganache,
    icon: '⚠️',
    theme: 'amber',
    powers: [
      'Sign off on Tier 2 & Tier 3 high-value transactions',
      'Review Scikit-Learn Random Forest model predictions & SHAP plots',
      'Authorize High Risk AI overlays (>70% risk score)',
      'Assert formal on-chain AI Override with immutable justification'
    ],
    restrictions: [
      'Requires Compliance & Director co-signatures on Tier 3 cases',
      'Cannot vote twice on the same case'
    ],
  },
  DIRECTOR: {
    title: 'Executive Director',
    subtitle: 'High-value Tier 3 quorum veto & vault release ratification',
    primaryAddress: DEMO_ROLES.director,
    ganacheAddress: DEMO_ROLES.director_ganache,
    icon: '🏛️',
    theme: 'rose',
    powers: [
      'Final quorum ratification on Tier 3 Enterprise cases (>50,000 DT)',
      'Executive veto authority over suspicious cross-border liquidity',
      'Co-authorizes minting of Soulbound NFT Audit Certificates'
    ],
    restrictions: [
      'Reserved exclusively for Tier 3 multi-signature governance',
      'Cannot approve Tier 1/2 cases without prior compliance review'
    ],
  },
};

export const RoleSwitchModal: React.FC<RoleSwitchModalProps> = ({
  isOpen,
  onClose,
  targetRole,
  currentAccount,
  onConfirmSwitch,
}) => {
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const [promptingMetaMask, setPromptingMetaMask] = useState(false);

  if (!isOpen) return null;

  const roleMeta = ROLE_METADATA[targetRole] || {
    title: targetRole,
    subtitle: 'Institutional Quorum Persona',
    primaryAddress: '',
    ganacheAddress: '',
    icon: '🛡️',
    theme: 'cyan',
    powers: ['Institutional system access'],
    restrictions: [],
  };

  const isCurrentWallet = currentAccount && (
    currentAccount.toLowerCase() === roleMeta.primaryAddress.toLowerCase() ||
    currentAccount.toLowerCase() === roleMeta.ganacheAddress.toLowerCase()
  );

  const handleCopy = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 2500);
  };

  const handlePromptMetaMaskSwitch = async () => {
    try {
      setPromptingMetaMask(true);
      const eth = (window as unknown as { ethereum?: { request: (args: unknown) => Promise<unknown> } }).ethereum;
      if (eth) {
        // Request MetaMask account picker permissions
        await eth.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }],
        });
      }
    } catch (e) {
      console.log('User dismissed or wallet does not support permissions request:', e);
    } finally {
      setPromptingMetaMask(false);
    }
  };

  const handleApplyRole = () => {
    onConfirmSwitch(targetRole);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg z-10 animate-scale-in">
        <GlassCard className="p-0 overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a0e1a] shadow-2xl rounded-2xl">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md">
                {roleMeta.icon}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white font-mono">
                    {roleMeta.title}
                  </h3>
                  <RoleBadge role={targetRole as ApprovalRoleName} />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {roleMeta.subtitle}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Wallet Alignment Status */}
            <div className={`p-4 rounded-xl border text-xs font-mono space-y-3 ${
              isCurrentWallet
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                  {isCurrentWallet ? (
                    <>
                      <UserCheck className="w-4 h-4 text-emerald-500" />
                      MetaMask Wallet Aligned &amp; Verified
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      MetaMask Account Switch Required for On-Chain Signing
                    </>
                  )}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/20">
                  {isCurrentWallet ? 'ALIGNED' : 'ACTION NEEDED'}
                </span>
              </div>

              {!isCurrentWallet ? (
                <div className="space-y-2 text-[11px] leading-relaxed">
                  <p>
                    Your current MetaMask address is{' '}
                    <strong className="text-slate-900 dark:text-white font-mono">
                      {currentAccount ? `${currentAccount.slice(0, 10)}...${currentAccount.slice(-6)}` : 'Disconnected'}
                    </strong>.
                    To sign governance approvals or execute actions on-chain as <strong>{targetRole}</strong>, open MetaMask and switch to this role's authorized account:
                  </p>

                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/10 flex items-center justify-between font-mono">
                    <span className="text-white text-xs truncate mr-2 select-all">
                      {roleMeta.primaryAddress}
                    </span>
                    <button
                      onClick={() => handleCopy(roleMeta.primaryAddress)}
                      className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition text-[10px] flex items-center gap-1 shrink-0"
                    >
                      {copiedAddr === roleMeta.primaryAddress ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedAddr === roleMeta.primaryAddress ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  Connected wallet holds authoritative on-chain credentials for <strong>{targetRole}</strong>. All on-chain transactions will be accepted by Ganache smart contracts.
                </p>
              )}
            </div>

            {/* Powers & Separation of Duties */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-[11px] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-cyan-500" />
                  Role Capabilities
                </span>
                <ul className="space-y-1.5 text-slate-600 dark:text-slate-400 text-[11px]">
                  {roleMeta.powers.map((p, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-cyan-500 shrink-0 mt-0.5">✓</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-[11px] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-rose-500" />
                  Governance Guardrails
                </span>
                <ul className="space-y-1.5 text-slate-600 dark:text-slate-400 text-[11px]">
                  {roleMeta.restrictions.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-rose-500 shrink-0 mt-0.5">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            {!isCurrentWallet ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePromptMetaMaskSwitch}
                disabled={promptingMetaMask}
                className="text-xs font-mono border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${promptingMetaMask ? 'animate-spin' : ''}`} />
                <span>Open MetaMask Switcher</span>
              </Button>
            ) : (
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Ready for governance
              </span>
            )}

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApplyRole}
                className="text-xs font-bold font-mono bg-cyan-500 hover:bg-cyan-400 text-slate-950"
              >
                <span>Switch to {targetRole}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
