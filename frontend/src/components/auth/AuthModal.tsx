import React, { useState } from 'react';
import {
  Shield, Key, Lock, CheckCircle2, AlertCircle, Copy, Check,
  ExternalLink, ArrowRight, UserCheck, RefreshCw, X, AlertTriangle
} from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { RoleBadge } from '../ui/RoleBadge';
import { useToast } from '../ui';
import { DEMO_ROLES, CHAIN_ID } from '../../config/contracts';
import { cn } from '../../lib/cn';
import type { ApprovalRoleName } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROLE_INFO: Record<string, { label: string; desc: string; icon: string }> = {
  OPERATOR: { label: 'Operator', desc: 'Registers transactions, initiates case workflows & tests tampering', icon: '⚡' },
  COMPLIANCE: { label: 'Compliance Officer', desc: 'Tier 1/2 approvals, regulatory validation & sanctions screening', icon: '⚖️' },
  RISK_MANAGER: { label: 'Risk Manager', desc: 'Tier 2/3 approvals, AI risk evaluation overrides & limit checks', icon: '⚠️' },
  DIRECTOR: { label: 'Executive Director', desc: 'Tier 3 final quorum veto, high-value release authorization', icon: '🏛️' },
  AUDITOR: { label: 'External Auditor', desc: 'Read-only immutable forensic verification & NFT certificate validation', icon: '🔍' },
  ADMIN: { label: 'System Admin', desc: 'On-chain role management, pause/unpause & contract parameters', icon: '👑' },
};

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    account,
    balance,
    chainId,
    isCorrectNetwork,
    switchNetwork,
    connectWallet,
    loginWithSignature,
    disconnectWallet,
    isAuthenticated,
    isAuthenticating,
    authError,
    assignedRoles,
    activeRole,
    setActiveRole,
    isConnecting,
  } = useWallet();

  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [copiedExpected, setCopiedExpected] = useState(false);

  if (!isOpen) return null;

  const getRoleExpectedAddresses = (role: string) => {
    const map: Record<string, { primary: string; ganache: string }> = {
      ADMIN: { primary: DEMO_ROLES.admin, ganache: DEMO_ROLES.admin_ganache },
      AUDITOR: { primary: DEMO_ROLES.auditor, ganache: DEMO_ROLES.auditor_ganache },
      OPERATOR: { primary: DEMO_ROLES.operator, ganache: DEMO_ROLES.operator_ganache },
      COMPLIANCE: { primary: DEMO_ROLES.compliance, ganache: DEMO_ROLES.compliance_ganache },
      RISK_MANAGER: { primary: DEMO_ROLES.riskManager, ganache: DEMO_ROLES.riskManager_ganache },
      DIRECTOR: { primary: DEMO_ROLES.director, ganache: DEMO_ROLES.director_ganache },
    };
    return map[role] || { primary: '', ganache: '' };
  };

  const expectedAddresses = getRoleExpectedAddresses(activeRole);
  const isWalletAligned = account && (
    account.toLowerCase() === expectedAddresses.primary?.toLowerCase() ||
    account.toLowerCase() === expectedAddresses.ganache?.toLowerCase()
  );

  const handlePromptMetaMaskSwitch = async () => {
    try {
      const eth = (window as unknown as { ethereum?: { request: (args: unknown) => Promise<unknown> } }).ethereum;
      if (eth) {
        await eth.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }],
        });
      }
    } catch (e) {
      console.log('User dismissed MetaMask switch:', e);
    }
  };

  const handleRoleSelect = (roleName: string) => {
    setActiveRole(roleName);
    const info = ROLE_INFO[roleName];
    if (roleName === 'ADMIN') {
      toast({
        title: '👑 System Administrator Mode Active',
        description: 'Sovereign governance mode active. To execute emergency pause or role bindings on Ganache, ensure MetaMask is set to 0x7E2D... or Ganache #0.',
        variant: 'info',
      });
    } else if (roleName === 'AUDITOR') {
      toast({
        title: '🔍 External Auditor Forensic Mode Active',
        description: 'Independent read-only oversight active. Audit dossiers & Tamper Lab enabled. To verify on-chain status, connect 0xEBDc... or Ganache #6.',
        variant: 'info',
      });
    } else {
      toast({
        title: `Switched to ${info?.label || roleName}`,
        description: `${info?.desc || 'Persona active.'} Ensure your MetaMask account matches this role to sign.`,
        variant: 'info',
      });
    }
  };

  const handleCopy = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedExpected(true);
    setTimeout(() => setCopiedExpected(false), 2000);
  };

  const handleSign = async () => {
    const success = await loginWithSignature();
    if (success) {
      setTimeout(() => {
        onClose();
      }, 600);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 dark:bg-midnight-950/85 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="relative w-full max-w-lg z-10 animate-scale-in"
      >
        <GlassCard variant="elevated" className="border border-slate-200 dark:border-cyan-500/20 shadow-2xl overflow-hidden bg-white dark:bg-midnight-950">
          {/* Header Banner */}
          <div className="relative p-6 pb-4 border-b border-slate-200 dark:border-cyan-500/10 bg-slate-50 dark:bg-midnight-900/90">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                <img
                  src="/trustaudit-logo.png"
                  alt="TrustAudit"
                  className="w-10 h-10 object-contain drop-shadow-[0_2px_10px_rgba(6,182,212,0.5)]"
                />
              </div>
              <div>
                <h2 id="auth-modal-title" className="text-lg font-display font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  Vault Authentication Gate
                  <Badge variant="outline" className="text-[10px] bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30">
                    SIWE EIP-4361
                  </Badge>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Zero-knowledge cryptographic session verification for banking audit governance
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Step 1: Wallet Connection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-slate-400">
                <span className="flex items-center gap-2">
                  <span className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                    account ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  )}>
                    1
                  </span>
                  MetaMask Gateway
                </span>
                {account && (
                  <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Connected
                  </span>
                )}
              </div>

              {account ? (
                <div className="glass p-3.5 rounded-xl border border-cyan-500/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-mono text-xs text-slate-200">
                        {account.slice(0, 10)}...{account.slice(-8)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleCopy}
                        className="p-1 rounded text-slate-400 hover:text-cyan-400 transition-colors"
                        title="Copy address"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={disconnectWallet}
                        className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors ml-1 font-mono"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-white/5 pt-2">
                    <span>Balance: <strong className="text-slate-900 dark:text-white font-mono">{balance} ETH</strong></span>
                    <span>Chain: <strong className={isCorrectNetwork ? "text-cyan-700 dark:text-cyan-400 font-mono" : "text-amber-600 dark:text-amber-400 font-mono"}>{isCorrectNetwork ? `Ganache (${chainId})` : `Wrong Chain (${chainId})`}</strong></span>
                  </div>

                  {!isCorrectNetwork && (
                    <Button variant="outline" size="sm" onClick={switchNetwork} className="w-full text-xs text-amber-300 border-amber-500/30">
                      Switch to Ganache Local (Chain ID: {CHAIN_ID})
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  onClick={connectWallet}
                  isLoading={isConnecting}
                  className="w-full shadow-glow-cyan py-3"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Connect MetaMask Wallet
                </Button>
              )}
            </div>

            {/* Step 2: Cryptographic Signature Verification */}
            {account && (
              <div className="space-y-3 border-t border-white/5 pt-5">
                <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-slate-400">
                  <span className="flex items-center gap-2">
                    <span className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                      isAuthenticated
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    )}>
                      2
                    </span>
                    Cryptographic Signature Challenge
                  </span>
                  {isAuthenticated && (
                    <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Session Verified
                    </span>
                  )}
                </div>

                {isAuthenticated ? (
                  <div className="glass p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                          Institutional Session Active
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Bearer JWT verified. Your actions on-chain are cryptographically signed and authorized.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      To prevent unauthorized banking audits, please sign an Ethereum personal verification message.
                      <strong className="text-slate-300 block mt-1">
                        🔒 Free & Non-Custodial: This signature does not cost gas and never reveals private keys.
                      </strong>
                    </p>

                    {authError && (
                      <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                        <span>{authError}</span>
                      </div>
                    )}

                    <Button
                      onClick={handleSign}
                      isLoading={isAuthenticating}
                      disabled={!isCorrectNetwork}
                      className="w-full py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-midnight-950 font-semibold shadow-glow-cyan"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      {isAuthenticating ? 'Waiting for MetaMask Signature...' : 'Sign Verification Message'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Assigned On-Chain Roles */}
            {account && (
              <div className="space-y-3 border-t border-white/5 pt-5">
                <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-slate-400">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center text-[10px] font-bold">
                      3
                    </span>
                    Institutional Clearance
                  </span>
                  <span className="text-xs text-cyan-400 font-mono">
                    Active: {activeRole}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {assignedRoles.map((r) => (
                    <button
                      key={r}
                      onClick={() => handleRoleSelect(r)}
                      className={cn(
                        "transition-all duration-200 focus:outline-none rounded-lg",
                        activeRole === r ? "ring-2 ring-cyan-400 ring-offset-1 ring-offset-midnight-950 scale-105" : "opacity-70 hover:opacity-100"
                      )}
                      title={`Switch active view to ${r}`}
                    >
                      <RoleBadge role={r as ApprovalRoleName} />
                    </button>
                  ))}
                </div>

                {ROLE_INFO[activeRole] && (
                  <div className="text-[11px] text-slate-400 glass p-2.5 rounded-lg border border-white/5 flex items-start gap-2">
                    <span className="text-base">{ROLE_INFO[activeRole].icon}</span>
                    <div>
                      <strong className="text-slate-200">{ROLE_INFO[activeRole].label}: </strong>
                      {ROLE_INFO[activeRole].desc}
                    </div>
                  </div>
                )}

                {/* Live MetaMask Alignment Status */}
                {isWalletAligned ? (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-mono flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      MetaMask Aligned ({ROLE_INFO[activeRole]?.label || activeRole})
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-500/20">
                      READY TO SIGN
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-mono space-y-2">
                    <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        MetaMask Account Not Aligned
                      </span>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-500/20">
                        MISMATCH
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Connected: <strong className="text-slate-900 dark:text-slate-200">{account.slice(0, 8)}...{account.slice(-6)}</strong>.
                      To sign {ROLE_INFO[activeRole]?.label || activeRole} on-chain actions, switch MetaMask to:
                    </p>
                    <div className="flex items-center justify-between bg-black/40 p-2 rounded-lg text-[11px] text-cyan-300 border border-cyan-500/20">
                      <span className="truncate mr-2 font-mono">
                        {expectedAddresses.primary || expectedAddresses.ganache}
                      </span>
                      <button
                        onClick={() => handleCopyAddress(expectedAddresses.primary || expectedAddresses.ganache)}
                        className="text-cyan-400 hover:text-cyan-200 shrink-0 p-1"
                        title="Copy expected address"
                      >
                        {copiedExpected ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <button
                      onClick={handlePromptMetaMaskSwitch}
                      className="w-full py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Switch Account in MetaMask</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Demo Quick Account Switcher Helper */}
            <div className="border-t border-white/5 pt-4">
              <details className="text-xs group">
                <summary className="cursor-pointer text-slate-500 hover:text-cyan-400 transition-colors flex items-center justify-between font-mono">
                  <span>Demo Governance Accounts (Ganache Presets)</span>
                  <span className="group-open:rotate-90 transition-transform">▸</span>
                </summary>
                <div className="mt-3 space-y-1.5 bg-slate-100 dark:bg-midnight-950/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2">
                    Switch to any pre-funded demo account in MetaMask to test multi-signature quorum roles:
                  </p>
                  {Object.entries(DEMO_ROLES).map(([key, addr]) => {
                    const cleanKey = key.toUpperCase().replace('MANAGER', '_MANAGER');
                    const isCurrent = account?.toLowerCase() === (addr as string).toLowerCase();
                    return (
                      <div
                        key={key}
                        className={cn(
                          "flex items-center justify-between text-[11px] p-1.5 rounded transition",
                          isCurrent
                            ? "bg-cyan-500/15 border border-cyan-500/40 text-cyan-800 dark:text-cyan-300 font-semibold"
                            : "hover:bg-slate-200/60 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{cleanKey}</span>
                          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                            {(addr as string).slice(0, 8)}...{(addr as string).slice(-6)}
                          </span>
                        </div>
                        {isCurrent ? (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">Active</span>
                        ) : (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(addr as string);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            className="text-[10px] text-cyan-700 dark:text-cyan-400 hover:underline font-mono"
                          >
                            Copy Addr
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </details>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 dark:bg-midnight-950/90 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Network: Ganache EVM (Chain 1337)</span>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors font-medium"
            >
              Done
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
