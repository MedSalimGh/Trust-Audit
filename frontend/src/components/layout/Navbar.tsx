/**
 * TrustAudit — High-Craft Institutional Navbar ("The Vault")
 *
 * Cybernetic financial audit header with live chain telemetry,
 * role-based navigation, "+ New Case" quick action, Research & About modal triggers,
 * Theme switcher (Light / Dark), and interactive cryptographic authentication control center.
 */
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Shield, Wallet, Menu, X, LogOut, ChevronDown, Plus,
  LayoutDashboard, ShieldCheck, FlaskConical, Award, Server,
  Lock, Copy, Check, CheckCircle2, KeyRound, Sparkles,
  Sun, Moon, BookOpen, Users, ExternalLink, Layers, Database, ShieldAlert,
  Crown, FileSearch, Activity, Download, AlertTriangle
} from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { useRole } from '../../hooks/useRole';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/cn';
import { StatusDot } from '../ui/StatusDot';
import { RoleBadge } from '../ui/RoleBadge';
import { Button, useToast } from '../ui';
import { AuthModal } from '../auth/AuthModal';
import { RoleSwitchModal } from '../auth/RoleSwitchModal';
import { AdminGovernanceModal } from '../admin/AdminGovernanceModal';
import { AuditorDossierModal } from '../auditor/AuditorDossierModal';
import { AboutModal } from '../landing/AboutModal';
import { BlogModal } from '../landing/BlogModal';
import { DEMO_ROLES, CHAIN_ID } from '../../config/contracts';
import type { ApprovalRoleName } from '../../types';

interface NavItem {
  path: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  allowedRoles: ApprovalRoleName[] | null;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, allowedRoles: [] },
  { path: '/approvals', label: 'Approvals', icon: ShieldCheck, allowedRoles: ['COMPLIANCE', 'RISK_MANAGER', 'DIRECTOR', 'AUDITOR', 'ADMIN'] },
  { path: '/tamper-lab', label: 'Tamper Lab', icon: FlaskConical, allowedRoles: ['COMPLIANCE', 'RISK_MANAGER', 'DIRECTOR', 'AUDITOR', 'ADMIN'] },
  { path: '/certificates', label: 'Certificates', icon: Award, allowedRoles: ['COMPLIANCE', 'RISK_MANAGER', 'DIRECTOR', 'AUDITOR', 'ADMIN'] },
  { path: '/simulator', label: 'Simulator', icon: Server, allowedRoles: ['OPERATOR', 'ADMIN'] },
];

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [blogOpen, setBlogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  const [roleSwitchTarget, setRoleSwitchTarget] = useState<string | null>(null);
  const [adminGovOpen, setAdminGovOpen] = useState(false);
  const [auditorDossierOpen, setAuditorDossierOpen] = useState(false);

  const {
    account,
    balance,
    chainId,
    isCorrectNetwork,
    activeRole,
    assignedRoles,
    setActiveRole,
    connectWallet,
    disconnectWallet,
    isAuthenticated,
    isAuthenticating,
    loginWithSignature,
    tokenExpiresAt,
    isAuthModalOpen,
    openAuthModal,
    closeAuthModal,
    isConnecting,
  } = useWallet();

  const { roles } = useRole();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.allowedRoles === null) return true;
    if (item.allowedRoles.length === 0) return true;
    if (roles.includes('ADMIN' as ApprovalRoleName)) return true;
    return item.allowedRoles.some((r) => roles.includes(r));
  });

  const isActive = (path: string) => location.pathname === path;

  const handleCopy = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openCreateModal = () => {
    window.dispatchEvent(new CustomEvent('trustaudit:open-create-modal'));
  };

  const canCreateCase = roles.includes('OPERATOR' as ApprovalRoleName) || roles.includes('ADMIN' as ApprovalRoleName) || !account;

  const isAdminWallet = account && (
    account.toLowerCase() === DEMO_ROLES.admin.toLowerCase() ||
    account.toLowerCase() === DEMO_ROLES.admin_ganache.toLowerCase()
  );

  const isAuditorWallet = account && (
    account.toLowerCase() === DEMO_ROLES.auditor.toLowerCase() ||
    account.toLowerCase() === DEMO_ROLES.auditor_ganache.toLowerCase()
  );

  const handleConfirmRoleSwitch = (newRole: string) => {
    setActiveRole(newRole);
    setRoleSwitchTarget(null);

    // Fire institutional role notification with MetaMask guidance
    if (newRole === 'ADMIN') {
      toast({
        title: '👑 Switched to System Administrator',
        description: 'Sovereign governance mode active. Smart contract pause/unpause & role authority enabled. Ensure MetaMask is connected to Admin account (0x7E2D... or Ganache #0).',
        variant: 'info',
      });
    } else if (newRole === 'AUDITOR') {
      toast({
        title: '🔍 Switched to External Auditor',
        description: 'Independent read-only oversight active. You can inspect bit-level cryptographic hashes, export regulatory dossiers, and verify Soulbound NFTs.',
        variant: 'info',
      });
    } else if (newRole === 'COMPLIANCE') {
      toast({
        title: '⚖️ Switched to Compliance Officer',
        description: 'Authorized for Tier 1 & 2 multi-signature approvals and AML/sanctions screening. Connect 0xFc14... (Ganache #3).',
        variant: 'info',
      });
    } else if (newRole === 'RISK_MANAGER') {
      toast({
        title: '⚠️ Switched to Risk Manager',
        description: 'Authorized for Tier 2/3 approvals, machine learning risk review, and formal AI Overrides. Connect 0x807e... (Ganache #4).',
        variant: 'info',
      });
    } else if (newRole === 'DIRECTOR') {
      toast({
        title: '🏛️ Switched to Executive Director',
        description: 'Authorized for Tier 3 high-value transactions (>50,000 DT) and executive quorum veto. Connect 0xE87e... (Ganache #5).',
        variant: 'info',
      });
    } else if (newRole === 'OPERATOR') {
      toast({
        title: '⚡ Switched to Bank Operator',
        description: 'Authorized to register new transaction cases and seal cryptographic RFC 8785 commitments on-chain. Connect 0x52E0... (Ganache #1).',
        variant: 'info',
      });
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-midnight-950/90 border-b border-slate-200 dark:border-cyan-500/10 shadow-xs backdrop-blur-2xl transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">

            {/* ── Brand / Logo ── */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/70 rounded-xl transition"
              >
                <div className="relative w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                  <img
                    src="/trustaudit-logo.png"
                    alt="TrustAudit Institutional Emblem"
                    className="w-10 h-10 object-contain drop-shadow-[0_2px_8px_rgba(2,132,199,0.35)]"
                  />
                </div>
                <div className="text-left hidden sm:block">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-display font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-colors">
                      TRUSTAUDIT
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 uppercase">
                      v1.0
                    </span>
                  </div>
                  <span className="block text-[9px] tracking-wider text-slate-500 dark:text-slate-400 font-mono uppercase">
                    Institutional Audit Gate
                  </span>
                </div>
              </button>

              {/* Live Chain Telemetry Pill */}
              <div className="hidden xl:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 dark:bg-black/60 border border-cyan-500/20 text-xs font-mono shadow-[0_0_15px_rgba(6,182,212,0.08)]">
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  isCorrectNetwork ? "bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse" : "bg-amber-400 shadow-[0_0_8px_#f59e0b]"
                )} />
                <span className="text-white font-semibold tracking-tight">
                  {isCorrectNetwork ? "Ganache EVM" : "Wrong Network"}
                </span>
                <span className="text-cyan-400 font-bold bg-cyan-500/15 px-1.5 py-0.5 rounded border border-cyan-500/30 text-[11px]">
                  {isCorrectNetwork ? CHAIN_ID : (chainId || 'OFFLINE')}
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-emerald-400 font-medium text-[11px] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Audit Gate Active
                </span>
              </div>
            </div>

            {/* ── Navigation Items (Capsule layout) ── */}
            <nav className="hidden lg:flex items-center gap-1 bg-slate-900/80 dark:bg-black/50 px-2 py-1.5 rounded-xl border border-slate-700/60 dark:border-white/10 shadow-sm" role="navigation" aria-label="Main navigation">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500',
                      active
                        ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    )}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className={cn("w-3.5 h-3.5", active ? "text-cyan-400" : "text-slate-400")} />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <div className="h-4 w-px bg-slate-700 dark:bg-white/10 mx-1" />

              {/* Research Link */}
              <button
                onClick={() => setBlogOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-cyan-300 hover:bg-white/10 transition"
                title="Research papers & cryptographic specifications"
              >
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span>Blogs</span>
              </button>

              {/* About Link */}
              <button
                onClick={() => setAboutOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-purple-300 hover:bg-white/10 transition"
                title="About the engineering creators: Med Salim, Nour, Malek"
              >
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span>About</span>
              </button>
            </nav>

            {/* ── Right Section: Actions + Theme + Identity Hub ── */}
            <div className="flex items-center gap-2.5">
              {/* Quick Case Initiation Button */}
              {canCreateCase && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={openCreateModal}
                  className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold py-1.5 px-3.5 shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                  title="Initiate new banking audit case"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Case</span>
                </Button>
              )}

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 transition"
                title={`Switch to ${theme === 'light' ? 'Dark Vault' : 'Light Professional'} theme`}
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <Moon className="w-4 h-4 text-slate-800" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-400" />
                )}
              </button>

              {/* ── Auth State Router ── */}
              {!account ? (
                // 1. DISCONNECTED
                <Button
                  onClick={openAuthModal}
                  isLoading={isConnecting}
                  className="shadow-sm text-xs font-semibold py-1.5 px-3 flex items-center gap-1.5"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Connect Vault</span>
                </Button>
              ) : !isAuthenticated ? (
                // 2. CONNECTED BUT UNAUTHENTICATED
                <button
                  onClick={openAuthModal}
                  className="relative group flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 transition-all animate-pulse-subtle"
                  title="Click to sign SIWE authentication challenge"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
                  <span>SIGN IN</span>
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                </button>
              ) : (
                // 3. AUTHENTICATED (PROFILE DROPDOWN)
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2.5 bg-slate-900/90 dark:bg-black/60 px-3.5 py-1.5 rounded-xl border border-cyan-500/30 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all text-left group focus-visible:ring-2 focus-visible:ring-cyan-500"
                    aria-expanded={dropdownOpen}
                    aria-label="Account options"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
                    <div className="hidden sm:block text-left">
                      <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5 leading-tight">
                        {account.slice(0, 6)}...{account.slice(-4)}
                        <RoleBadge role={activeRole as ApprovalRoleName} className="text-[10px] px-1.5 py-0 scale-95" />
                      </div>
                      <div className="text-[10px] text-cyan-400 font-mono font-semibold leading-tight">
                        {Number(balance).toFixed(4)} ETH
                      </div>
                    </div>
                    <ChevronDown className={cn(
                      "w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-transform duration-200",
                      dropdownOpen && "rotate-180"
                    )} />
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2.5 w-84 rounded-2xl bg-[#090d1a] border border-cyan-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-4 space-y-4 z-50 animate-scale-in">
                      {/* Identity Card */}
                      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 space-y-2.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 uppercase font-mono tracking-wider">
                          <span>Institutional Identity</span>
                          <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Session Active
                          </span>
                        </div>

                        <div className="flex items-center justify-between bg-black/60 p-2.5 rounded-lg font-mono text-xs text-white border border-white/10">
                          <span className="truncate mr-2 font-semibold">{account}</span>
                          <button
                            onClick={handleCopy}
                            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-cyan-300 transition"
                            title="Copy full address"
                          >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                          <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Available Balance</span>
                            <span className="text-white font-bold">{Number(balance).toFixed(4)} <span className="text-cyan-400 text-[10px]">ETH</span></span>
                          </div>
                          <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Chain Network</span>
                            <span className="text-cyan-300 font-bold">1337 <span className="text-slate-400 text-[10px]">(Ganache)</span></span>
                          </div>
                        </div>
                      </div>

                      {/* On-Chain Roles Switcher */}
                      <div className="space-y-2">
                        <div className="text-[11px] text-slate-300 font-mono uppercase tracking-wider flex items-center justify-between">
                          <span>Assigned Quorum Roles</span>
                          <span className="text-cyan-400 text-[10px] font-semibold">Select View</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {assignedRoles.map((r) => (
                            <button
                              key={r}
                              onClick={() => {
                                setRoleSwitchTarget(r);
                                setDropdownOpen(false);
                              }}
                              className={cn(
                                "transition-all rounded-lg p-0.5",
                                activeRole === r ? "ring-2 ring-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)] scale-105" : "opacity-70 hover:opacity-100"
                              )}
                              title={`Switch to ${r} persona & verify wallet`}
                            >
                              <RoleBadge role={r as ApprovalRoleName} />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Demo Quick Switcher */}
                      <div className="border-t border-white/10 pt-3">
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            openAuthModal();
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-mono text-slate-300 hover:bg-white/5 hover:text-cyan-300 transition"
                        >
                          <span className="flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                            Open Vault Gate / Switch Role
                          </span>
                          <span>→</span>
                        </button>
                      </div>

                      {/* Logout Action */}
                      <div className="border-t border-white/10 pt-2">
                        <button
                          onClick={() => {
                            disconnectWallet();
                            setDropdownOpen(false);
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Lock Vault & Disconnect</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mobile Hamburger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                aria-label="Toggle navigation menu"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* ── System Administrator Persona Sub-Banner ── */}
      {activeRole === 'ADMIN' && (
        <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-amber-500/10 dark:from-amber-950/70 dark:via-amber-900/30 dark:to-amber-950/50 border-b border-amber-500/30 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-2.5 transition-all animate-fade-in shadow-xs">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/20">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold font-mono tracking-tight text-amber-950 dark:text-amber-100 uppercase">
                    System Admin Governance Active
                  </span>
                  <span className="px-2 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/40">
                    Sovereign EVM Authority
                  </span>
                </div>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/70 font-mono">
                  Circuit breaker controls · Role bindings · Ganache Chain ID: {CHAIN_ID}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Account alignment badge */}
              {account && (
                isAdminWallet ? (
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Admin Signer Aligned ({account.slice(0, 6)}...{account.slice(-4)})
                  </span>
                ) : (
                  <button
                    onClick={() => setRoleSwitchTarget('ADMIN')}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-amber-200 border border-amber-500/40 flex items-center gap-1.5 transition shadow-xs animate-pulse-subtle"
                    title="Current MetaMask account does not match on-chain Admin. Click to align."
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Align MetaMask (0x7E2D... / Ganache #0)</span>
                  </button>
                )
              )}

              <Button
                size="sm"
                onClick={() => setAdminGovOpen(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-1 px-3 shadow-md shadow-amber-500/20 flex items-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Emergency Governance Console</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/simulator')}
                className="border-amber-500/40 text-amber-900 dark:text-amber-300 hover:bg-amber-500/10 text-xs py-1 px-3 flex items-center gap-1.5"
              >
                <Server className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Bank Simulator</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── External Auditor Persona Sub-Banner ── */}
      {activeRole === 'AUDITOR' && (
        <div className="bg-gradient-to-r from-purple-500/15 via-purple-500/5 to-purple-500/10 dark:from-purple-950/70 dark:via-purple-900/30 dark:to-purple-950/50 border-b border-purple-500/30 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-2.5 transition-all animate-fade-in shadow-xs">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 shadow-sm shadow-purple-500/20">
                <FileSearch className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold font-mono tracking-tight text-purple-950 dark:text-purple-100 uppercase">
                    External Auditor Forensic View
                  </span>
                  <span className="px-2 py-0.2 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-900 dark:text-purple-200 border border-purple-500/40">
                    Read-Only Oversight
                  </span>
                </div>
                <p className="text-[11px] text-purple-800/80 dark:text-purple-300/70 font-mono">
                  Bit-level JCS verification · Separation of Duties · Regulatory Dossiers
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Account alignment badge */}
              {account && (
                isAuditorWallet ? (
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Auditor Signer Aligned ({account.slice(0, 6)}...{account.slice(-4)})
                  </span>
                ) : (
                  <button
                    onClick={() => setRoleSwitchTarget('AUDITOR')}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-purple-500/20 hover:bg-purple-500/30 text-purple-950 dark:text-purple-200 border border-purple-500/40 flex items-center gap-1.5 transition shadow-xs animate-pulse-subtle"
                    title="Current MetaMask account does not match on-chain Auditor. Click to align."
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Align MetaMask (0xEBDc... / Ganache #6)</span>
                  </button>
                )
              )}

              <Button
                size="sm"
                onClick={() => setAuditorDossierOpen(true)}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-1 px-3 shadow-md shadow-purple-500/20 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Regulatory Dossier</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/tamper-lab')}
                className="border-purple-500/40 text-purple-900 dark:text-purple-300 hover:bg-purple-500/10 text-xs py-1 px-3 flex items-center gap-1.5"
              >
                <FlaskConical className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Tamper Lab</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/certificates')}
                className="border-purple-500/40 text-purple-900 dark:text-purple-300 hover:bg-purple-500/10 text-xs py-1 px-3 flex items-center gap-1.5"
              >
                <Award className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Soulbound NFTs</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 dark:bg-midnight-950/80 backdrop-blur-md"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="relative z-50 w-72 max-w-[85vw] glass-elevated h-full p-6 flex flex-col gap-3 animate-slide-in-right">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/5">
              <span className="text-base font-display font-bold text-cyan-600 dark:text-cyan-400">Navigation</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {account && (
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-midnight-950/60 border border-slate-200 dark:border-white/5 space-y-1">
                <div className="text-[10px] text-slate-500 font-mono">CONNECTED WALLET</div>
                <div className="text-xs font-mono text-slate-800 dark:text-slate-200 truncate">{account}</div>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <RoleBadge role={activeRole as ApprovalRoleName} />
                  <span className="text-xs text-slate-900 dark:text-white font-mono">{balance} ETH</span>
                </div>
              </div>
            )}

            <div className="space-y-1 pt-2">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setMobileOpen(false);
                    }}
                    className={cn(
                      'flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all',
                      active
                        ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                    )}
                  >
                    <Icon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <button
                onClick={() => {
                  setMobileOpen(false);
                  setBlogOpen(true);
                }}
                className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40"
              >
                <BookOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>Research & Blogs</span>
              </button>

              <button
                onClick={() => {
                  setMobileOpen(false);
                  setAboutOpen(true);
                }}
                className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40"
              >
                <Users className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>About Creators</span>
              </button>
            </div>

            {canCreateCase && (
              <Button
                variant="secondary"
                onClick={() => {
                  setMobileOpen(false);
                  openCreateModal();
                }}
                className="w-full text-xs font-semibold py-2.5 mt-2"
              >
                <Plus className="w-4 h-4 mr-1.5 text-cyan-600 dark:text-cyan-400" />
                Initiate New Case
              </Button>
            )}

            <div className="mt-auto pt-4 border-t border-slate-200 dark:border-white/5">
              {account ? (
                <button
                  onClick={() => {
                    disconnectWallet();
                    setMobileOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition"
                >
                  <LogOut className="w-4 h-4" />
                  Disconnect Wallet
                </button>
              ) : (
                <Button
                  onClick={() => {
                    setMobileOpen(false);
                    openAuthModal();
                  }}
                  className="w-full py-2.5 text-xs font-semibold"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet
                </Button>
              )}
            </div>
          </nav>
        </div>
      )}

      {/* Global Modals */}
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
      <RoleSwitchModal
        isOpen={!!roleSwitchTarget}
        onClose={() => setRoleSwitchTarget(null)}
        targetRole={roleSwitchTarget || activeRole}
        currentAccount={account}
        onConfirmSwitch={handleConfirmRoleSwitch}
      />
      <AdminGovernanceModal isOpen={adminGovOpen} onClose={() => setAdminGovOpen(false)} />
      <AuditorDossierModal isOpen={auditorDossierOpen} onClose={() => setAuditorDossierOpen(false)} />
      <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
      <BlogModal isOpen={blogOpen} onClose={() => setBlogOpen(false)} />
    </>
  );
};
