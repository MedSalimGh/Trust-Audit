/**
 * GovernanceTicker Component
 *
 * Horizontally scrolling ticker showcasing partner and regulatory networks with:
 * - Gradient edge fade (left and right masks for seamless fade out)
 * - Hover-pause interaction
 * - Seamless looping animation using Tailwind CSS
 * - Strict dark/light theme compatibility
 * - Accessible reduced-motion support
 */

import React from 'react';
import {
  Building2, Globe, ShieldCheck, Layers, Scale,
  Terminal, FileCode2, Database, Activity, Sparkles
} from 'lucide-react';
import { cn } from '../../lib/cn';

export interface PartnerItem {
  id: string;
  name: string;
  category: string;
  standard: string;
  icon: React.ElementType;
  accent: 'cyan' | 'blue' | 'indigo' | 'emerald' | 'amber' | 'purple';
}

const PARTNERS: PartnerItem[] = [
  {
    id: 'swift',
    name: 'SWIFT Alliance',
    category: 'Inter-Bank Settlement',
    standard: 'ISO 20022 Standard',
    icon: Globe,
    accent: 'cyan',
  },
  {
    id: 'bct',
    name: 'Banque Centrale (BCT)',
    category: 'Regulatory Authority',
    standard: 'Banking Supervision',
    icon: Building2,
    accent: 'blue',
  },
  {
    id: 'openzeppelin',
    name: 'OpenZeppelin',
    category: 'Smart Contract Security',
    standard: 'AccessControl 5.x',
    icon: ShieldCheck,
    accent: 'emerald',
  },
  {
    id: 'eea',
    name: 'Enterprise Ethereum',
    category: 'Consensus Architecture',
    standard: 'EVM Institutional',
    icon: Layers,
    accent: 'indigo',
  },
  {
    id: 'basel',
    name: 'Basel III Accord',
    category: 'Capital Adequacy',
    standard: 'BCBS Prudential Rules',
    icon: Scale,
    accent: 'amber',
  },
  {
    id: 'rfc8785',
    name: 'RFC 8785 Canonical JCS',
    category: 'Cryptographic Standard',
    standard: 'Deterministic JSON',
    icon: FileCode2,
    accent: 'cyan',
  },
  {
    id: 'hardhat',
    name: 'Hardhat EVM Core',
    category: 'Deterministic Sandbox',
    standard: 'Solidity 0.8.24',
    icon: Terminal,
    accent: 'purple',
  },
  {
    id: 'ganache',
    name: 'Ganache EVM Engine',
    category: 'Chain ID 1337',
    standard: 'Local Multi-Sig EVM',
    icon: Database,
    accent: 'emerald',
  },
  {
    id: 'fsb',
    name: 'Financial Stability Board',
    category: 'Risk Oversight',
    standard: 'Systemic Surveillance',
    icon: Activity,
    accent: 'blue',
  },
];

const ACCENT_COLORS = {
  cyan: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800/40',
  blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/40',
  indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/40',
  emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40',
  amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40',
  purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/40',
};

export interface GovernanceTickerProps {
  className?: string;
}

export const GovernanceTicker: React.FC<GovernanceTickerProps> = ({ className }) => {
  // Seamless loop by duplicating items
  const duplicatedPartners = [...PARTNERS, ...PARTNERS];

  return (
    <div className={cn('relative w-full overflow-hidden mt-12 pt-8 border-t border-slate-200/80 dark:border-white/5', className)}>
      {/* Section Sub-header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Institutional Settlement & Regulatory Interoperability Standards</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-slate-400 dark:text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Active Standards</span>
        </div>
      </div>

      {/* Main Ticker Viewport with Gradient Edge Fades */}
      <div className="relative w-full overflow-hidden group select-none py-2">
        {/* Left Gradient Edge Fade */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-28 z-20 bg-gradient-to-r from-[var(--bg-primary,#f8fafc)] dark:from-[var(--bg-primary,#030712)] to-transparent"
        />

        {/* Right Gradient Edge Fade */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-28 z-20 bg-gradient-to-l from-[var(--bg-primary,#f8fafc)] dark:from-[var(--bg-primary,#030712)] to-transparent"
        />

        {/* Seamless Horizontally Scrolling Track with Hover-Pause */}
        <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused] items-center gap-4 sm:gap-6 will-change-transform">
          {duplicatedPartners.map((item, idx) => {
            const Icon = item.icon;
            const accentStyle = ACCENT_COLORS[item.accent];

            return (
              <div
                key={`${item.id}-${idx}`}
                className="flex items-center gap-3.5 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-white/10 shadow-xs hover:border-cyan-500/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 shrink-0 cursor-default"
              >
                {/* Partner Icon */}
                <div
                  className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 transition-transform duration-300',
                    accentStyle
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Partner Metadata */}
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-display text-slate-900 dark:text-white whitespace-nowrap">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    <span>{item.category}</span>
                    <span className="opacity-40">•</span>
                    <span className="text-cyan-700 dark:text-cyan-400 font-medium">{item.standard}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GovernanceTicker;
