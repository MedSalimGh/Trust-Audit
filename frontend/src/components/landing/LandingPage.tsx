/**
 * TrustAudit — Enterprise Landing Page ("The Vault")
 *
 * Ultra-crafted, fintech-grade design with high-performance CSS/JS parallax,
 * interactive 3D tilted hero centerpiece showcasing the official emblem,
 * dynamic cursor-spotlight cards, interactive live audit lifecycle simulation,
 * multi-tier governance explorer, research whitepapers, and team attribution
 * for Med Salim Gharsellaoui, Nour Abed, and Malek Dhahri.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Key, ArrowRight, Lock, CheckCircle2, Cpu, FileCode2,
  Users, BookOpen, ExternalLink, Sparkles, ChevronRight, Sun, Moon,
  Layers, Database, FileCheck, Check, Copy, ArrowUpRight, Brain,
  Zap, Award, AlertTriangle, ShieldCheck, Activity, Terminal, Eye,
  Compass, Fingerprint, RefreshCw, Wallet
} from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ScrollReveal } from '../ui/ScrollReveal';
import { StaggerText } from '../ui/StaggerText';
import { ANIMATION_CONFIG } from '../../lib/animations';
import { AboutModal, TEAM_MEMBERS } from './AboutModal';
import { BlogModal, BLOG_POSTS } from './BlogModal';
import { DigitalWallet } from './DigitalWallet';
import { TeamCarousel } from './TeamCarousel';
import { GovernanceTicker } from './GovernanceTicker';
import { CHAIN_ID } from '../../config/contracts';
import { cn } from '../../lib/cn';

// ─── Dynamic Spotlight Card Component ─────────────────────────────────────────

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  tiltEffect?: boolean;
}

function SpotlightCard({ children, className, tiltEffect = false, ...props }: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMouse({ x, y });

    if (tiltEffect) {
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rx = ((y - centerY) / centerY) * -5;
      const ry = ((x - centerX) / centerX) * 5;
      setTilt({ rx, ry });
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (tiltEffect) setTilt({ rx: 0, ry: 0 });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        '--mouse-x': `${mouse.x}px`,
        '--mouse-y': `${mouse.y}px`,
        transform: tiltEffect && isHovered
          ? `perspective(800px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateZ(4px)`
          : 'perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0px)',
      } as React.CSSProperties}
      className={cn(
        "spotlight-card relative rounded-2xl transition-all duration-300",
        "bg-white dark:bg-midnight-950/80",
        "border border-slate-200/90 dark:border-white/10",
        "shadow-[0_4px_20px_-2px_rgba(15,23,42,0.06),0_2px_6px_-1px_rgba(15,23,42,0.02)]",
        "dark:shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]",
        "hover:border-cyan-500/50 dark:hover:border-cyan-400/40",
        "hover:shadow-[0_12px_32px_-4px_rgba(2,132,199,0.12),0_4px_12px_-2px_rgba(15,23,42,0.04)]",
        "dark:hover:shadow-[0_16px_48px_rgba(6,182,212,0.15)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── Main Landing Page Component ──────────────────────────────────────────────

export function LandingPage() {
  const navigate = useNavigate();
  const { account, connectWallet, isConnecting } = useWallet();
  const { isAuthenticated, authenticate } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Modals state
  const [aboutOpen, setAboutOpen] = useState(false);
  const [blogOpen, setBlogOpen] = useState(false);
  const [activeBlogId, setActiveBlogId] = useState<string | undefined>(undefined);

  // Interactive Simulator Tab state
  const [activeStep, setActiveStep] = useState<number>(0);

  // Interactive Governance Tier state
  const [selectedTier, setSelectedTier] = useState<number>(2);

  // Mouse Parallax coordinates (smooth smoothed coordinate values)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = (clientX / innerWidth) * 2 - 1;
    const y = (clientY / innerHeight) * 2 - 1;
    setMousePos({ x, y });
  }, []);

  const handleLaunchApp = useCallback(async () => {
    if (account && isAuthenticated) {
      navigate('/dashboard');
      return;
    }

    try {
      if (!account) {
        const addr = await connectWallet();
        if (addr) {
          await authenticate();
        }
      } else if (!isAuthenticated) {
        await authenticate();
      }
      navigate('/dashboard');
    } catch {
      navigate('/dashboard');
    }
  }, [account, isAuthenticated, connectWallet, authenticate, navigate]);

  const openBlogReader = (id: string) => {
    setActiveBlogId(id);
    setBlogOpen(true);
  };

  // 4-stage lifecycle demonstration data
  const SIMULATION_STEPS = [
    {
      step: '01',
      title: 'Off-Chain RFC 8785 Hash Commitment',
      badge: 'Zero-PII Cryptography',
      desc: 'Banking transaction details (IBANs, beneficiaries, amounts) remain strictly off-chain in private databases. A 32-byte cryptographically secure random salt is generated and bound to canonical RFC 8785 JSON.',
      code: `// Off-Chain Commitment Computation
canonical_payload = JCS({
  "amount": 75000.00,
  "currency": "TND",
  "sender_iban": "TN5910001234567890123456",
  "beneficiary_iban": "TN5920009876543210987654"
})
salted_hash = SHA256("TrustAudit:v1" || canonical_payload || salt)
// Result: 0x8f4c9a1b2d3e4f5a... (Only this 32-byte hash reaches Ethereum)`,
      meta: 'Protected by Banking Secrecy Law'
    },
    {
      step: '02',
      title: 'Consultative AI Risk Scoring',
      badge: 'Strictly Advisory ML',
      desc: 'XGBoost and Random Forest models evaluate calibrated fraud probability and generate SHAP explainability matrices. Crucially, the AI never holds private keys, executes, or rejects.',
      code: `// Consultative Model Response
{
  "calibrated_risk_score": 78,
  "risk_level": "HIGH",
  "shap_drivers": [
    { "feature": "amount_dt", "shap": +0.42, "interpretation": "High value Tier 3" },
    { "feature": "is_night_tx", "shap": +0.28, "interpretation": "Executed at 02:40 AM" },
    { "feature": "merchant_cat", "shap": -0.15, "interpretation": "Known financial counterparty" }
  ],
  "governance_note": "AI suggests director veto review; AI has NO execution authority."
}`,
      meta: 'XGBoost & Random Forest + SHAP'
    },
    {
      step: '03',
      title: 'On-Chain Multi-Sig Quorum Gate',
      badge: 'Solidity AccessControl',
      desc: 'Smart contracts enforce role-based approvals based on the transaction value tier. Approvers sign with MetaMask. State transitions cannot be bypassed by any backend or UI.',
      code: `// TrustAuditRegistry.sol On-Chain Quorum
case.status = Status.PENDING_APPROVAL;
required_signatures = 3; // Compliance + Risk Manager + Executive Director

// Enforced via OpenZeppelin AccessControl:
require(hasRole(ROLE_DIRECTOR, msg.sender), "Not authorized for Tier 3");
case.approvals[msg.sender] = true;
if (case.approvalCount >= required_signatures) {
    case.status = Status.APPROVED;
    emit CaseApproved(caseId, block.timestamp);
}`,
      meta: 'Ganache Local EVM (Chain ID: 1337)'
    },
    {
      step: '04',
      title: 'ERC-5192 Soulbound Audit Certificate',
      badge: 'Immutable Verification',
      desc: 'Upon full quorum approval, the Registry authorizes the TrustAuditCertificate contract to mint a non-transferable, soulbound audit NFT containing cryptographic commitment references.',
      code: `// TrustAuditCertificate.sol (ERC-721 + ERC-5192)
uint256 tokenId = _nextTokenId++;
_safeMint(authorizedAuditor, tokenId);
emit Locked(tokenId); // Non-transferable Soulbound Token

// Metadata URI anchors canonical hash proof:
tokenURI(tokenId) => ipfs://bafy.../proof_metadata.json
// Permanent on-chain evidentiary audit record`,
      meta: 'Soulbound Non-Transferable Token'
    }
  ];

  return (
    <div
      onMouseMove={handleMouseMove}
      className="min-h-screen bg-slate-50 dark:bg-midnight-950 text-slate-900 dark:text-slate-100 font-body relative overflow-x-hidden transition-colors duration-200"
    >
      {/* ── Dynamic Multi-Layer Parallax Background Elements ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        {/* Fine Dot Grid Pattern */}
        <div className="absolute inset-0 dot-pattern opacity-70 dark:opacity-40" />

        {/* Parallax Radial Glow 1 (Cyan / Institutional Blue) */}
        <div
          className="absolute -top-40 -left-40 w-[650px] h-[650px] rounded-full blur-[140px] opacity-35 dark:opacity-20 transition-transform duration-700 ease-out"
          style={{
            background: 'radial-gradient(circle, #0284c7 0%, rgba(6,182,212,0) 70%)',
            transform: `translate3d(${mousePos.x * 35}px, ${mousePos.y * 35}px, 0)`,
          }}
        />

        {/* Parallax Radial Glow 2 (Indigo / Royal Purple) */}
        <div
          className="absolute top-1/4 -right-40 w-[700px] h-[700px] rounded-full blur-[160px] opacity-25 dark:opacity-20 transition-transform duration-700 ease-out"
          style={{
            background: 'radial-gradient(circle, #6366f1 0%, rgba(147,51,234,0) 70%)',
            transform: `translate3d(${mousePos.x * -40}px, ${mousePos.y * -40}px, 0)`,
          }}
        />

        {/* Parallax Radial Glow 3 (Emerald / Gold Integrity) */}
        <div
          className="absolute -bottom-40 left-1/4 w-[600px] h-[600px] rounded-full blur-[150px] opacity-20 dark:opacity-15 transition-transform duration-1000 ease-out"
          style={{
            background: 'radial-gradient(circle, #0ea5e9 0%, rgba(16,185,129,0) 70%)',
            transform: `translate3d(${mousePos.x * 20}px, ${mousePos.y * 20}px, 0)`,
          }}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          ENTERPRISE HEADER
          ═══════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-midnight-950/90 border-b border-slate-200 dark:border-cyan-500/10 shadow-xs backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">

            {/* Brand Logo & Name */}
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-transform hover:scale-105">
                <img
                  src="/trustaudit-logo.png"
                  alt="TrustAudit Emblem"
                  className="w-10 h-10 object-contain drop-shadow-[0_2px_8px_rgba(2,132,199,0.35)]"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-display font-bold tracking-tight text-slate-900 dark:text-white">
                    TRUSTAUDIT
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 uppercase">
                    v1.0
                  </span>
                </div>
                <span className="hidden sm:block text-[9px] tracking-widest text-slate-500 dark:text-slate-400 font-mono uppercase">
                  Institutional Banking Audit & EVM Gate
                </span>
              </div>
            </div>

            {/* Navigation Links with Icons */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/90 dark:glass px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/5 text-xs font-semibold shadow-xs">
              <a
                href="#architecture"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-300 hover:bg-white/80 dark:hover:bg-slate-800/40 transition"
              >
                <Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Architecture</span>
              </a>
              <a
                href="#lifecycle"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-300 hover:bg-white/80 dark:hover:bg-slate-800/40 transition"
              >
                <Activity className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Audit Lifecycle</span>
              </a>
              <a
                href="#governance"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-300 hover:bg-white/80 dark:hover:bg-slate-800/40 transition"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Governance Tiers</span>
              </a>
              <a
                href="#treasury-wallet"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-300 hover:bg-white/80 dark:hover:bg-slate-800/40 transition"
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Wallet</span>
              </a>
              <button
                onClick={() => setBlogOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-300 hover:bg-white/80 dark:hover:bg-slate-800/40 transition"
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Blogs</span>
              </button>
              <button
                onClick={() => setAboutOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-300 hover:bg-white/80 dark:hover:bg-slate-800/40 transition"
              >
                <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>About</span>
              </button>
            </nav>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition shadow-xs"
                title={`Switch to ${theme === 'light' ? 'Dark Vault' : 'Light Professional'} theme`}
                aria-label="Toggle color theme"
              >
                {theme === 'light' ? (
                  <Moon className="w-4 h-4 text-slate-700" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-400" />
                )}
              </button>

              {/* Terminal Launch CTA */}
              <Button
                size="sm"
                onClick={handleLaunchApp}
                isLoading={isConnecting}
                className="font-semibold text-xs py-2 px-3 sm:px-4 shadow-sm flex items-center gap-1.5"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>{account ? 'Open Vault' : 'Connect Vault'}</span>
                <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
              </Button>
            </div>

          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════
          HERO SECTION (3D Parallax Emblem + Kinetic Typography)
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 pt-16 pb-20 sm:pt-24 sm:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

          {/* Left Column: Typography & Action Buttons */}
          <div className="lg:col-span-7 text-left space-y-6">
            {/* Overline Badge */}
            <ScrollReveal delay={0}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/30 text-cyan-800 dark:text-cyan-300 font-mono text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>HYBRID ON-CHAIN / OFF-CHAIN BANKING GOVERNANCE</span>
              </div>
            </ScrollReveal>

            {/* Main Headline */}
            <ScrollReveal delay={100}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.08]">
                <StaggerText text="Mathematical Certainty for " delay={100} />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-700 via-cyan-600 to-indigo-600 dark:from-cyan-300 dark:via-cyan-400 dark:to-gold-300">
                  High-Value Banking Settlement
                </span>
              </h1>
            </ScrollReveal>

            {/* Subtitle */}
            <ScrollReveal delay={200}>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                Solidity smart contracts enforce immutable multi-signature quorums.
                Advisory AI calculates calibrated fraud risk and SHAP explainability.
                Zero private banking data on-chain through RFC 8785 canonical hash commitments.
              </p>
            </ScrollReveal>

            {/* Primary Action Buttons */}
            <ScrollReveal delay={300}>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  size="lg"
                  onClick={handleLaunchApp}
                  isLoading={isConnecting}
                  className="px-6 py-3 text-sm font-semibold shadow-md flex items-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  <span>{account ? 'Access Governance Terminal' : 'Launch Banking Terminal'}</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>

                <button
                  onClick={() => setAboutOpen(true)}
                  className="px-5 py-3 text-sm font-semibold rounded-xl border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200 transition shadow-xs flex items-center gap-2"
                >
                  <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Meet the Creators</span>
                </button>
              </div>
            </ScrollReveal>

            {/* Micro specs indicator */}
            <ScrollReveal delay={380}>
              <div className="pt-4 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Solidity 0.8.24 Authority</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-500" />
                  <span>MetaMask EIP-4361 Auth</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                  <span>Ganache Local EVM Ready</span>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Right Column: Interactive 3D Parallax Emblem Centerpiece */}
          <div className="lg:col-span-5 flex items-center justify-center relative">
            <ScrollReveal delay={200} className="w-full flex items-center justify-center relative">
              {/* Pulsating background halo */}
              <div
                className="absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-gradient-to-tr from-cyan-500/25 via-blue-500/20 to-purple-500/20 blur-3xl animate-pulse-glow pointer-events-none"
              />

              {/* Orbiting Floating Badge 1 (Top Left) */}
              <div
                className="absolute -top-4 -left-2 sm:left-4 z-20 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-cyan-500/30 text-xs font-mono font-semibold text-slate-900 dark:text-cyan-300 shadow-md animate-float-slow"
                style={{
                  transform: `translate3d(${mousePos.x * -18}px, ${mousePos.y * -18}px, 0)`,
                }}
              >
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  RFC 8785 Sealed
                </span>
              </div>

              {/* Orbiting Floating Badge 2 (Bottom Right) */}
              <div
                className="absolute -bottom-4 right-2 sm:right-6 z-20 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-purple-500/30 text-xs font-mono font-semibold text-slate-900 dark:text-purple-300 shadow-md animate-float-reverse"
                style={{
                  transform: `translate3d(${mousePos.x * 22}px, ${mousePos.y * 22}px, 0)`,
                }}
              >
                <span className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  ERC-5192 Soulbound
                </span>
              </div>

              {/* Orbiting Floating Badge 3 (Middle Right) */}
              <div
                className="absolute top-1/2 -right-4 z-20 hidden sm:flex px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-[11px] font-mono text-emerald-800 dark:text-emerald-300 shadow-xs"
                style={{
                  transform: `translate3d(${mousePos.x * 15}px, ${mousePos.y * -15}px, 0)`,
                }}
              >
                <span>3-of-5 Quorum Veto</span>
              </div>

              {/* Main Interactive 3D Emblem Container */}
              <div
                style={{
                  transform: `perspective(1000px) rotateX(${mousePos.y * -12}deg) rotateY(${mousePos.x * 12}deg)`,
                  transition: 'transform 0.15s ease-out',
                }}
                className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-white/90 via-slate-50/80 to-white/90 dark:from-slate-900/90 dark:via-midnight-950/90 dark:to-slate-900/90 border border-slate-200/90 dark:border-cyan-500/25 shadow-xl hover:shadow-2xl transition-shadow group flex flex-col items-center justify-center max-w-sm w-full"
              >
                {/* Emblem Image */}
                <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
                  <img
                    src="/trustaudit-logo.png"
                    alt="TrustAudit High-Security Banking Emblem"
                    className="w-full h-full object-contain filter drop-shadow-[0_12px_24px_rgba(2,132,199,0.35)] dark:drop-shadow-[0_16px_36px_rgba(6,182,212,0.45)] group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Status capsule underneath the emblem */}
                <div className="mt-4 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-midnight-900/90 border border-slate-200 dark:border-cyan-500/30 flex items-center gap-2 text-xs font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">Consensus Prime:</span>
                  <span className="text-cyan-700 dark:text-cyan-400">Registry Active</span>
                </div>
              </div>
            </ScrollReveal>
          </div>

        </div>

        {/* Live Metrics Ticker Bar */}
        <ScrollReveal delay={280}>
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-white dark:glass border border-slate-200/90 dark:border-white/10 shadow-sm">
          <div className="p-3 text-center">
            <div className="text-2xl sm:text-3xl font-display font-bold text-cyan-600 dark:text-cyan-400">
              RFC 8785
            </div>
            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1 font-semibold">
              Canonical JSON Hashing
            </div>
          </div>
          <div className="p-3 text-center border-l border-slate-200 dark:border-white/5">
            <div className="text-2xl sm:text-3xl font-display font-bold text-indigo-600 dark:text-indigo-400">
              ERC-5192
            </div>
            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1 font-semibold">
              Soulbound Audit NFTs
            </div>
          </div>
          <div className="p-3 text-center border-l border-slate-200 dark:border-white/5">
            <div className="text-2xl sm:text-3xl font-display font-bold text-amber-600 dark:text-amber-400">
              3-of-5
            </div>
            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1 font-semibold">
              Multi-Sig Quorum Veto
            </div>
          </div>
          <div className="p-3 text-center border-l border-slate-200 dark:border-white/5">
            <div className="text-2xl sm:text-3xl font-display font-bold text-emerald-600 dark:text-emerald-400">
              0%
            </div>
            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1 font-semibold">
              On-Chain PII Exposure
            </div>
          </div>
        </div>
        </ScrollReveal>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          INTERACTIVE AUDIT LIFECYCLE SIMULATOR SECTION
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="lifecycle" className="relative z-10 py-20 border-t border-slate-200 dark:border-white/5 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <ScrollReveal delay={0}>
            <Badge variant="outline" className="text-xs mb-3 font-mono">
              LIVE TECHNICAL WORKFLOW
            </Badge>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 dark:text-white">
              <StaggerText text="The 4-Stage Forensic Audit Lifecycle" delay={100} />
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <p className="mt-3 text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
              Click through each stage to explore how TrustAudit enforces security from off-chain salt generation to soulbound token minting.
            </p>
          </ScrollReveal>
        </div>

        {/* Interactive Step Switcher Tabs */}
        <ScrollReveal delay={280}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
            {SIMULATION_STEPS.map((s, idx) => (
              <button
                key={s.step}
                onClick={() => setActiveStep(idx)}
                className={cn(
                  "p-3 rounded-xl text-left border transition-all duration-200",
                  activeStep === idx
                    ? "bg-white dark:bg-slate-900 border-cyan-500 text-cyan-800 dark:text-cyan-300 shadow-sm ring-1 ring-cyan-500"
                    : "bg-slate-100/70 dark:bg-midnight-950/50 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/40"
                )}
              >
                <div className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400 mb-0.5">
                  Stage {s.step}
                </div>
                <div className="text-xs font-semibold truncate text-slate-900 dark:text-white">
                  {s.title.split(' ')[0]} {s.title.split(' ')[1]}
                </div>
              </button>
            ))}
          </div>

          {/* Active Stage Technical Showcase Card */}
          <SpotlightCard className="p-6 sm:p-8" tiltEffect>
            <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
              {/* Description Column */}
              <div className="lg:w-1/2 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-cyan-600/10 text-cyan-700 dark:text-cyan-400 font-mono font-bold text-xs flex items-center justify-center">
                    {SIMULATION_STEPS[activeStep].step}
                  </span>
                  <Badge variant="outline" className="text-xs font-mono">
                    {SIMULATION_STEPS[activeStep].badge}
                  </Badge>
                </div>

                <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-white">
                  {SIMULATION_STEPS[activeStep].title}
                </h3>

                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {SIMULATION_STEPS[activeStep].desc}
                </p>

                <div className="pt-2 flex items-center gap-2 text-xs font-mono text-cyan-700 dark:text-cyan-400 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>{SIMULATION_STEPS[activeStep].meta}</span>
                </div>
              </div>

              {/* Code / Evidence Window */}
              <div className="lg:w-1/2 w-full bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs overflow-x-auto shadow-inner text-slate-300">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="ml-1 text-slate-400">proof-execution.sol</span>
                  </span>
                  <span className="text-cyan-400 font-bold">STAGE {SIMULATION_STEPS[activeStep].step} VERIFIED</span>
                </div>
                <pre className="text-emerald-400 dark:text-emerald-400 leading-relaxed whitespace-pre-wrap">
                  {SIMULATION_STEPS[activeStep].code}
                </pre>
              </div>
            </div>
          </SpotlightCard>
        </ScrollReveal>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          CORE PHILOSOPHY: THE TRIAD OF INSTITUTIONAL TRUST
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="architecture" className="relative z-10 py-20 border-t border-slate-200 dark:border-white/5 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <ScrollReveal delay={0}>
            <Badge variant="outline" className="text-xs mb-3 font-mono">
              CORE PHILOSOPHY
            </Badge>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 dark:text-white">
              <StaggerText text="The Triad of Institutional Trust" delay={100} />
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <p className="mt-3 text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
              Engineered to reconcile public blockchain immutability with strict banking confidentiality regulations.
            </p>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={280}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <SpotlightCard className="p-6 flex flex-col justify-between" tiltEffect>
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 dark:bg-cyan-500/10 border border-blue-500/20 dark:border-cyan-500/20 flex items-center justify-center text-blue-600 dark:text-cyan-400 mb-5">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white mb-2">
                  1. Solidity Is Authoritative
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Every state transition, quorum requirement, time-locked deadline, and approval veto is enforced
                  unconditionally by the <strong>TrustAuditRegistry</strong> smart contract. Frontends and backends are never trusted.
                </p>
              </div>
              <div className="text-[11px] font-mono text-cyan-700 dark:text-cyan-400 pt-3 border-t border-slate-100 dark:border-white/5 font-semibold">
                OpenZeppelin 5.x • Hardhat EVM
              </div>
            </SpotlightCard>

            {/* Card 2 */}
            <SpotlightCard className="p-6 flex flex-col justify-between" tiltEffect>
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/10 border border-indigo-500/20 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-5">
                  <Brain className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white mb-2">
                  2. AI Is Strictly Advisory
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Machine learning models evaluate risk probabilities and produce SHAP explainability matrices.
                  <strong> The AI never executes, approves, or rejects.</strong> Model downtime is never treated as low risk.
                </p>
              </div>
              <div className="text-[11px] font-mono text-indigo-700 dark:text-indigo-400 pt-3 border-t border-slate-100 dark:border-white/5 font-semibold">
                XGBoost • Random Forest • SHAP
              </div>
            </SpotlightCard>

            {/* Card 3 */}
            <SpotlightCard className="p-6 flex flex-col justify-between" tiltEffect>
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/20 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-5">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white mb-2">
                  3. Zero Private Data On-Chain
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Customer IBANs and balances remain strictly off-chain. Only 32-byte salted commitments
                  <code> SHA256("TrustAudit:v1" || JCS(data) || salt)</code> are anchored on the blockchain.
                </p>
              </div>
              <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 pt-3 border-t border-slate-100 dark:border-white/5 font-semibold">
                RFC 8785 Canonical JCS • SHA-256
              </div>
            </SpotlightCard>
          </div>
        </ScrollReveal>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          DYNAMIC GOVERNANCE TIERS SECTION
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="governance" className="relative z-10 py-20 border-t border-slate-200 dark:border-white/5 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <ScrollReveal delay={0}>
            <Badge variant="outline" className="text-xs mb-3 font-mono">
              ON-CHAIN QUORUM LIMITS
            </Badge>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 dark:text-white">
              <StaggerText text="Multi-Tier Risk Governance" delay={100} />
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <p className="mt-3 text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
              Every transaction is classified into value tiers enforced by smart contract logic with strict separation of duties.
            </p>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={280}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tier 1 */}
            <SpotlightCard className="p-6 space-y-4" tiltEffect>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-slate-500 font-bold uppercase">Tier 1</span>
                <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px]">
                  Routine
                </Badge>
              </div>
              <div className="text-2xl font-bold font-display text-slate-900 dark:text-white">
                &lt; 5,000 DT
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Standard domestic commercial payments. Requires single Compliance Officer cryptographic signature.
              </p>
              <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>1 Signature (Compliance)</span>
              </div>
            </SpotlightCard>

            {/* Tier 2 */}
            <SpotlightCard className="p-6 space-y-4 border-blue-500/40 dark:border-cyan-500/30" tiltEffect>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-blue-600 dark:text-cyan-400 font-bold uppercase">Tier 2</span>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-cyan-300 border-blue-500/30 text-[10px]">
                  Commercial
                </Badge>
              </div>
              <div className="text-2xl font-bold font-display text-slate-900 dark:text-white">
                5,000 – 50,000 DT
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Corporate trade and cross-border settlement. Requires dual sign-off from Compliance and Risk Management.
              </p>
              <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-mono">
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
                <span>2 Signatures (Compliance + Risk)</span>
              </div>
            </SpotlightCard>

            {/* Tier 3 */}
            <SpotlightCard className="p-6 space-y-4 border-amber-500/40 dark:border-amber-400/30" tiltEffect>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-amber-600 dark:text-amber-400 font-bold uppercase">Tier 3</span>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">
                  High-Value Enterprise
                </Badge>
              </div>
              <div className="text-2xl font-bold font-display text-slate-900 dark:text-white">
                &gt; 50,000 DT
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Institutional capital movements. Requires triple multi-sig quorum including Executive Director veto clearance.
              </p>
              <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-mono">
                <CheckCircle2 className="w-4 h-4 text-amber-500" />
                <span>3 Signatures (Compliance + Risk + Director)</span>
              </div>
            </SpotlightCard>
          </div>

          {/* Horizontally Scrolling Institutional Partners & Standards Ticker */}
          <GovernanceTicker />
        </ScrollReveal>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          INTERACTIVE DIGITAL WALLET SHOWCASE (Treasury Motion Graphics)
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="treasury-wallet" className="relative z-10 py-20 border-t border-slate-200 dark:border-white/5 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <ScrollReveal delay={0}>
            <Badge variant="outline" className="text-xs mb-3 font-mono">
              TREASURY & MOTION PHYSICS
            </Badge>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 dark:text-white">
              <StaggerText text="High-Fidelity Treasury Digital Wallet" delay={100} />
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <p className="mt-3 text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
              Hover over the matte black card holder to peek stacked corporate treasury cards with 60fps spring physics. Click any card to expand embossed metallic textures and inspect verified on-chain reserves.
            </p>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={280}>
          <DigitalWallet />
        </ScrollReveal>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          ABOUT CREATORS SECTION (Med Salim, Nour, Malek)
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="about" className="relative z-10 py-20 border-t border-slate-200 dark:border-white/5 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8">
          <ScrollReveal delay={0}>
            <Badge variant="outline" className="text-xs mb-3 font-mono">
              ENGINEERING & CREATORS
            </Badge>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 dark:text-white">
              <StaggerText text="Architected by Experts in Security & AI" delay={100} />
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <p className="mt-3 text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
              Meet the engineering minds behind TrustAudit. Navigate the interactive fanned card stack below to inspect architectural specializations, fraud modeling, and cryptographic governance.
            </p>
          </ScrollReveal>
        </div>

        {/* Fanned Stack Testimonial Carousel */}
        <ScrollReveal delay={280}>
          <TeamCarousel onOpenAboutModal={() => setAboutOpen(true)} />
        </ScrollReveal>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          RESEARCH & BLOGS SECTION
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="blogs" className="relative z-10 py-20 border-t border-slate-200 dark:border-white/5 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
          <div>
            <ScrollReveal delay={0}>
              <Badge variant="outline" className="text-xs mb-3 font-mono">
                PUBLICATIONS & PROTOCOLS
              </Badge>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 dark:text-white">
                <StaggerText text="Research & Technical Briefs" delay={100} />
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={200}>
              <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm max-w-xl">
                In-depth articles covering our cryptographic standards, adversarial machine learning, and soulbound NFT auditing.
              </p>
            </ScrollReveal>
          </div>

          <ScrollReveal delay={240}>
            <Button variant="outline" size="sm" onClick={() => setBlogOpen(true)} className="self-start sm:self-auto text-xs">
              <span>View All Papers</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={280}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {BLOG_POSTS.map((post) => (
              <SpotlightCard
                key={post.id}
                onClick={() => openBlogReader(post.id)}
                className="p-6 cursor-pointer flex flex-col justify-between group"
                tiltEffect
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mb-3">
                    <span className="text-cyan-700 dark:text-cyan-400 font-bold">{post.category}</span>
                    <span>{post.readTime}</span>
                  </div>

                  <h3 className="text-base font-display font-bold text-slate-900 dark:text-white group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-colors line-clamp-2 mb-2 leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed mb-4">
                    {post.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-cyan-700 dark:text-cyan-400 font-semibold">
                  <span>Read Research Paper</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </SpotlightCard>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FINAL ENTERPRISE CTA
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 py-24 border-t border-slate-200 dark:border-white/5 bg-slate-100/60 dark:bg-midnight-900/40 text-center px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <ScrollReveal delay={0}>
            <Badge variant="outline" className="text-xs font-mono">
              INSTITUTIONAL AUDIT SYSTEM
            </Badge>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <h2 className="text-3xl sm:text-5xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
              <StaggerText text="Ready to Audit Banking Workflows?" delay={100} />
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
              Connect your MetaMask wallet configured for Ganache Local (Chain ID: {CHAIN_ID}) to access
              the real-time audit governance terminal.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={300}>
            <div>
              <Button
                size="lg"
                onClick={handleLaunchApp}
                isLoading={isConnecting}
                className="px-8 py-3.5 text-sm font-semibold shadow-md flex items-center gap-2 mx-auto"
              >
                <Terminal className="w-4 h-4" />
                <span>{account ? 'Open Audit Terminal' : 'Connect Vault & Launch'}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          ENTERPRISE FOOTER
          ═══════════════════════════════════════════════════════════════════ */}
      <footer className="relative z-10 border-t border-slate-200 dark:border-white/5 py-12 px-4 sm:px-6 lg:px-8 bg-white dark:bg-midnight-950 text-slate-600 dark:text-slate-400 text-xs font-mono">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-lg flex items-center justify-center">
              <img
                src="/trustaudit-logo.png"
                alt="TrustAudit"
                className="w-8 h-8 object-contain drop-shadow"
              />
            </div>
            <div>
              <span className="font-display font-bold text-slate-900 dark:text-white">TRUSTAUDIT</span>
              <span className="block text-[10px] text-slate-400">Hybrid On-Chain/Off-Chain Banking Audit</span>
            </div>
          </div>

          <div className="text-center md:text-left text-[11px] text-slate-500 dark:text-slate-400">
            Engineered by <strong className="text-slate-800 dark:text-slate-200">Med Salim Gharsellaoui</strong>, <strong className="text-slate-800 dark:text-slate-200">Nour Abed</strong> & <strong className="text-slate-800 dark:text-slate-200">Malek Dhahri</strong>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button onClick={() => setAboutOpen(true)} className="hover:text-cyan-700 dark:hover:text-cyan-300">
              Team
            </button>
            <button onClick={() => setBlogOpen(true)} className="hover:text-cyan-700 dark:hover:text-cyan-300">
              Research
            </button>
            <a
              href="https://github.com/MedSalimGh/TrustAudit"
              target="_blank"
              rel="noreferrer"
              className="hover:text-cyan-700 dark:hover:text-cyan-300 flex items-center gap-1"
            >
              GitHub <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
      <BlogModal isOpen={blogOpen} onClose={() => setBlogOpen(false)} initialPostId={activeBlogId} />
    </div>
  );
}
