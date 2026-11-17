/**
 * Auth guard components for route and UI protection.
 *
 * WalletGate — Requires wallet connection + SIWE/JWT authentication
 * RoleGuard  — Enforces on-chain role permission access
 * ChainBanner — Displays notification when on wrong chain ID
 * SessionLock — Interactive modal when JWT expires during session
 */
import React from 'react';
import { useWallet } from '../../context/WalletContext';
import { useRole } from '../../hooks/useRole';
import type { ApprovalRoleName } from '../../types';
import { Button } from '../ui/Button';
import { GlassCard } from '../ui/GlassCard';
import { RoleBadge } from '../ui/RoleBadge';
import {
  Shield, Wallet, AlertTriangle, Lock, KeyRound,
  CheckCircle2, AlertCircle, Sparkles, RefreshCw
} from 'lucide-react';
import { CHAIN_ID } from '../../config/contracts';
import { cn } from '../../lib/cn';

// ─── WalletGate ──────────────────────────────────────────────────────────────

interface WalletGateProps {
  children: React.ReactNode;
  /** Require both wallet connection and valid JWT session. Default: true */
  requireAuth?: boolean;
}

export const WalletGate: React.FC<WalletGateProps> = ({
  children,
  requireAuth = true,
}) => {
  const {
    account,
    balance,
    isConnecting,
    connectWallet,
    isAuthenticated,
    isAuthenticating,
    loginWithSignature,
    authError,
    openAuthModal,
    isCorrectNetwork,
    switchNetwork,
    assignedRoles,
    activeRole,
  } = useWallet();

  // 1. Not connected to MetaMask
  if (!account) {
    return (
      <div className="flex items-center justify-center min-h-[65vh] px-4">
        <GlassCard variant="elevated" className="max-w-lg w-full p-8 text-center border-cyan-500/20 shadow-[0_20px_80px_rgba(0,0,0,0.8),0_0_40px_rgba(6,182,212,0.15)] relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 via-cyan-400 to-gold-400" />
          
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/30 flex items-center justify-center mx-auto mb-6 shadow-glow-cyan">
            <Wallet className="w-8 h-8 text-cyan-400" />
          </div>

          <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
            Institutional Wallet Required
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-sm mx-auto mb-6 leading-relaxed">
            TrustAudit uses hardware/software wallet verification to establish zero-trust banking audit authority.
          </p>

          <div className="space-y-3">
            <Button
              onClick={openAuthModal}
              isLoading={isConnecting}
              size="lg"
              className="w-full shadow-glow-cyan text-sm font-semibold py-3"
            >
              <Shield className="w-4 h-4 mr-2" />
              Open Vault Authentication Gate
            </Button>

            <button
              onClick={connectWallet}
              className="text-xs text-slate-400 hover:text-cyan-300 transition-colors font-mono underline"
            >
              Or connect directly with MetaMask
            </button>
          </div>

          <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-center gap-6 text-[11px] font-mono text-slate-400">
            <span>NETWORK: GANACHE 1337</span>
            <span>•</span>
            <span>NON-CUSTODIAL</span>
            <span>•</span>
            <span>EIP-4361</span>
          </div>
        </GlassCard>
      </div>
    );
  }

  // 2. Connected but unauthenticated (needs SIWE signature)
  if (requireAuth && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[65vh] px-4">
        <GlassCard variant="elevated" className="max-w-lg w-full p-8 text-center border-amber-500/20 shadow-[0_20px_80px_rgba(0,0,0,0.8),0_0_40px_rgba(245,158,11,0.12)] relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-cyan-400" />

          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(245,158,11,0.25)]">
            <KeyRound className="w-8 h-8 text-amber-400 animate-spin-slow" />
          </div>

          <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
            Sign Vault Authorization
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-sm mx-auto mb-5 leading-relaxed">
            Your wallet is connected, but a signed cryptographic session token is required to query private audit cases.
          </p>

          {/* Account Details Pill */}
          <div className="glass p-3 rounded-xl border border-slate-200 dark:border-white/5 mb-6 text-left space-y-1.5 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>CONNECTED WALLET</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{balance} ETH</span>
            </div>
            <div className="text-slate-900 dark:text-white font-semibold truncate bg-slate-100 dark:bg-midnight-950/70 p-1.5 rounded border border-slate-200/80 dark:border-transparent">
              {account}
            </div>
            <div className="flex items-center justify-between pt-1 text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">DETECTED ROLES:</span>
              <div className="flex gap-1">
                {assignedRoles.map((r) => (
                  <RoleBadge key={r} role={r as ApprovalRoleName} className="text-[9px] px-1.5 py-0" />
                ))}
              </div>
            </div>
          </div>

          {!isCorrectNetwork ? (
            <div className="mb-4 space-y-2">
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2 text-left">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Wrong network detected. Please switch to Ganache Local (Chain ID: {CHAIN_ID}).</span>
              </div>
              <Button onClick={switchNetwork} className="w-full text-xs">
                Switch Network
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {authError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{authError}</span>
                </div>
              )}

              <Button
                onClick={loginWithSignature}
                isLoading={isAuthenticating}
                size="lg"
                className="w-full py-3.5 shadow-glow-cyan text-sm font-semibold bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 text-midnight-950"
              >
                <Shield className="w-4 h-4 mr-2" />
                {isAuthenticating ? 'Requesting MetaMask Signature...' : 'Sign Verification in MetaMask'}
              </Button>

              <button
                onClick={openAuthModal}
                className="text-xs text-slate-400 hover:text-cyan-300 transition-colors font-mono underline"
              >
                View signature details & demo roles
              </button>
            </div>
          )}
        </GlassCard>
      </div>
    );
  }

  return <>{children}</>;
};

// ─── RoleGuard ───────────────────────────────────────────────────────────────

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: ApprovalRoleName[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
}) => {
  const { hasAnyRole, primaryRole } = useRole();
  const { openAuthModal, assignedRoles, setActiveRole } = useWallet();

  if (allowedRoles.length > 0 && !hasAnyRole(...allowedRoles)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <GlassCard variant="elevated" className="max-w-md w-full p-8 text-center border-rose-500/20 shadow-[0_20px_80px_rgba(0,0,0,0.8),0_0_40px_rgba(239,68,68,0.12)]">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-rose-400" />
          </div>
          <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white mb-2">
            Institutional Clearance Required
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            Your current active role ({primaryRole || 'None'}) does not have permission
            to access this section.
          </p>

          <div className="glass p-3 rounded-xl border border-white/5 text-xs text-left mb-6 space-y-1">
            <div className="text-slate-400 font-mono text-[10px] uppercase">Required Clearance:</div>
            <div className="flex flex-wrap gap-1">
              {allowedRoles.map((r) => (
                <RoleBadge key={r} role={r} />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Button onClick={openAuthModal} className="w-full">
              <Sparkles className="w-4 h-4 mr-2" />
              Switch Account in Vault Gate
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  return <>{children}</>;
};

// ─── ChainBanner ─────────────────────────────────────────────────────────────

export const ChainBanner: React.FC = () => {
  const { isCorrectNetwork, chainId, switchNetwork } = useWallet();

  if (isCorrectNetwork) return null;

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-xs sm:text-sm text-amber-200 font-mono">
            Wrong network detected (Chain ID: {chainId || 'Unknown'}). TrustAudit requires Ganache Local EVM (Chain ID: {CHAIN_ID}).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={switchNetwork} className="shrink-0 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/20">
          Switch to Ganache (1337)
        </Button>
      </div>
    </div>
  );
};

// ─── SessionLock ─────────────────────────────────────────────────────────────

interface SessionLockProps {
  children: React.ReactNode;
}

export const SessionLock: React.FC<SessionLockProps> = ({ children }) => {
  const { account, tokenExpiresAt, loginWithSignature, isAuthenticating } = useWallet();

  const isExpired = React.useMemo(() => {
    if (!tokenExpiresAt) return false;
    return tokenExpiresAt <= Date.now();
  }, [tokenExpiresAt]);

  if (account && isExpired) {
    return (
      <>
        {children}
        <div className="fixed inset-0 z-[200] bg-slate-900/60 dark:bg-midnight-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <GlassCard variant="elevated" className="max-w-md w-full p-8 text-center border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.2)]">
            <Lock className="w-10 h-10 text-amber-500 dark:text-amber-400 mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white mb-2">
              Vault Session Expired
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
              Your cryptographic session has timed out.
              Please re-sign the authentication challenge with MetaMask to resume.
            </p>
            <Button
              onClick={loginWithSignature}
              isLoading={isAuthenticating}
              className="w-full shadow-glow-cyan"
            >
              <KeyRound className="w-4 h-4 mr-2" />
              Re-authenticate Session
            </Button>
          </GlassCard>
        </div>
      </>
    );
  }

  return <>{children}</>;
};
