/**
 * TrustAudit — Glassmorphism Footer
 *
 * Compact footer with contract addresses, chain info, and links.
 */
import React from 'react';
import { Shield } from 'lucide-react';
import { REGISTRY_ADDRESS, CERTIFICATE_ADDRESS, CHAIN_ID } from '../../config/contracts';
import { HashDisplay } from '../ui/HashDisplay';
import { StatusDot } from '../ui/StatusDot';
import { useWallet } from '../../context/WalletContext';

export const Footer: React.FC = () => {
  const { isCorrectNetwork } = useWallet();

  return (
    <footer className="border-t border-slate-200 dark:border-cyan-500/10 bg-white/80 dark:bg-midnight-950/90 py-5 text-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/trustaudit-logo.png"
            alt="TrustAudit Emblem"
            className="w-5 h-5 object-contain"
          />
          <span className="font-display font-bold text-slate-900 dark:text-slate-100">TRUSTAUDIT</span>
          <span className="text-slate-300 dark:text-slate-600">&bull;</span>
          <StatusDot status={isCorrectNetwork ? 'connected' : 'error'} label={`Ganache ${CHAIN_ID}`} />
        </div>

        <div className="text-center text-[11px] text-slate-500 dark:text-slate-400">
          Engineered by <strong className="text-slate-800 dark:text-slate-200">Med Salim Gharsellaoui</strong>, <strong className="text-slate-800 dark:text-slate-200">Nour Abed</strong> & <strong className="text-slate-800 dark:text-slate-200">Malek Dhahri</strong>
        </div>

        <div className="flex items-center gap-6 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
          <span className="flex items-center gap-1.5">
            Registry: <HashDisplay hash={REGISTRY_ADDRESS} startChars={6} endChars={4} />
          </span>
          <span className="flex items-center gap-1.5">
            NFT: <HashDisplay hash={CERTIFICATE_ADDRESS} startChars={6} endChars={4} />
          </span>
        </div>
      </div>
    </footer>
  );
};
