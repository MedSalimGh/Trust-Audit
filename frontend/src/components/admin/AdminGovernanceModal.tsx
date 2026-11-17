import React, { useState, useEffect } from 'react';
import {
  Shield, Key, Lock, AlertTriangle, Play, Pause, RefreshCw, X,
  CheckCircle2, AlertOctagon, UserCheck, ExternalLink, Activity
} from 'lucide-react';
import { ethers } from 'ethers';
import { GlassCard, Button, Badge, useToast } from '../ui';
import { useWallet } from '../../context/WalletContext';
import { REGISTRY_ADDRESS, REGISTRY_ABI, DEMO_ROLES } from '../../config/contracts';

interface AdminGovernanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminGovernanceModal: React.FC<AdminGovernanceModalProps> = ({ isOpen, onClose }) => {
  const { account } = useWallet();
  const { toast } = useToast();
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchContractStatus = async () => {
    try {
      setLoading(true);
      const directRpc = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
      const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, directRpc);
      const paused = await registry.paused();
      setIsPaused(paused);
    } catch (e) {
      console.warn('Failed to fetch registry paused status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchContractStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTogglePause = async () => {
    if (!account) {
      toast({ title: 'Wallet Required', description: 'Connect MetaMask as Admin.', variant: 'error' });
      return;
    }

    try {
      setActionLoading(true);
      const ethereum = (window as unknown as Record<string, unknown>).ethereum as ethers.Eip1193Provider;
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);

      if (isPaused) {
        toast({ title: 'Broadcasting Transaction', description: 'Executing unpause() on Ganache EVM...', variant: 'info' });
        const tx = await registry.unpause();
        await tx.wait();
        setIsPaused(false);
        toast({ title: 'Registry Resumed', description: 'Smart contract workflows are fully active.', variant: 'success' });
      } else {
        toast({ title: 'Broadcasting Transaction', description: 'Executing emergency pause() on Ganache EVM...', variant: 'warning' });
        const tx = await registry.pause();
        await tx.wait();
        setIsPaused(true);
        toast({ title: 'Registry Paused', description: 'Emergency circuit breaker active. Transactions halted.', variant: 'error' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Admin Action Reverted', description: msg.includes('AccessControl') ? 'Wallet does not hold DEFAULT_ADMIN_ROLE' : msg, variant: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-2xl z-10 animate-scale-in">
        <GlassCard className="p-0 overflow-hidden border border-amber-500/40 bg-white dark:bg-[#0a0d18] shadow-2xl rounded-2xl">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-amber-500/5 dark:bg-amber-500/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-500/30 text-xl">
                👑
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-mono flex items-center gap-2">
                  System Admin Governance Console
                  <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/40">
                    Sovereign Controls
                  </Badge>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  TrustAuditRegistry.sol • On-chain parameter governance &amp; emergency controls
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Live Circuit Breaker Status */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-slate-500 block">
                  Registry Emergency Circuit Breaker
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-3 h-3 rounded-full ${isPaused ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'}`} />
                  <span className={`text-sm font-bold font-mono ${isPaused ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {isPaused ? 'CONTRACT PAUSED (EMERGENCY HALT)' : 'OPERATIONAL (WORKFLOWS ACTIVE)'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {isPaused
                    ? 'All new transaction registrations, approvals, and settlements are strictly blocked on Ganache EVM.'
                    : 'Transaction pipelines, Scikit-Learn AI screening, and multi-signature voting operate normally.'}
                </p>
              </div>

              <Button
                variant={isPaused ? 'primary' : 'outline'}
                size="sm"
                onClick={handleTogglePause}
                disabled={actionLoading || loading}
                className={isPaused
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold'
                  : 'border-rose-500/40 text-rose-500 hover:bg-rose-500/10 font-mono text-xs font-bold'}
              >
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-1.5" />
                ) : isPaused ? (
                  <Play className="w-4 h-4 mr-1.5" />
                ) : (
                  <Pause className="w-4 h-4 mr-1.5" />
                )}
                <span>{isPaused ? 'Resume Smart Contract' : 'Emergency Pause'}</span>
              </Button>
            </div>

            {/* Institutional Roles On-Chain Registry */}
            <div className="space-y-3">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Authorized Institutional Signers (On-Chain Role Bindings)</span>
                <span className="text-[10px] text-cyan-400">Ganache EVM 1337</span>
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                {[
                  { role: 'System Admin', addr: DEMO_ROLES.admin, icon: '👑' },
                  { role: 'Operations Officer', addr: DEMO_ROLES.operator, icon: '⚡' },
                  { role: 'Compliance Officer', addr: DEMO_ROLES.compliance, icon: '⚖️' },
                  { role: 'Risk Manager', addr: DEMO_ROLES.riskManager, icon: '⚠️' },
                  { role: 'Executive Director', addr: DEMO_ROLES.director, icon: '🏛️' },
                  { role: 'External Auditor', addr: DEMO_ROLES.auditor, icon: '🔍' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span>{item.icon}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{item.role}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 truncate max-w-[120px] select-all">
                      {item.addr.slice(0, 6)}...{item.addr.slice(-4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-800 dark:text-cyan-300 flex items-center justify-between">
              <div>
                <strong>Bank Settlement Simulator:</strong> Test core banking wire executions and event indexer webhooks.
              </div>
              <a
                href="/simulator"
                onClick={onClose}
                className="px-3 py-1 rounded bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition text-[11px] font-mono shrink-0 ml-3"
              >
                Go to Simulator →
              </a>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Close Console
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
