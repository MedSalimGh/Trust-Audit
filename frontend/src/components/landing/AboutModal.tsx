import React from 'react';
import { Shield, Award, Brain, Code2, Github, Linkedin, ExternalLink, X, Sparkles } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { Badge } from '../ui/Badge';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TEAM_MEMBERS = [
  {
    name: 'Med Salim Gharsellaoui',
    role: 'Lead Blockchain & Systems Architect',
    focus: 'Hybrid On-Chain Architecture & Full-Stack Security',
    bio: 'Pioneered the hybrid architecture separating public on-chain Solidity consensus from private banking databases. Designed the multi-signature state machine, FastAPI cryptographic orchestrator, and The Vault frontend.',
    skills: ['Solidity 0.8.24', 'Ethers.js v6', 'FastAPI & Pydantic', 'React & TypeScript', 'Zero-Trust Architecture'],
    initials: 'MSG',
    color: 'cyan',
    github: 'https://github.com/MedSalimGh',
  },
  {
    name: 'Nour Abed',
    role: 'AI & Machine Learning Engineer',
    focus: 'Fraud Risk Modeling & Explainable AI (SHAP)',
    bio: 'Developed the explainable fraud detection engine using XGBoost and Random Forest pipelines. Integrated SHAP feature attribution ensuring AI strictly advises human signers and never unilaterally executes or rejects.',
    skills: ['XGBoost & Scikit-Learn', 'SHAP Attribution', 'Feature Engineering', 'Fraud Analytics', 'Adversarial Defense'],
    initials: 'NA',
    color: 'emerald',
    github: 'https://github.com',
  },
  {
    name: 'Malek Dhahri',
    role: 'Smart Contract & Protocol Engineer',
    focus: 'Cryptographic Assurance & Soulbound Certificates',
    bio: 'Engineered the non-transferable ERC-5192 Soulbound Audit Token infrastructure and RFC 8785 canonical JSON hash serialization. Formulated the forensic tamper-detection verification algorithms.',
    skills: ['ERC-721 / ERC-5192', 'RFC 8785 Canonical JCS', 'Hardhat & OpenZeppelin', 'Forensic Verification', 'Cryptography'],
    initials: 'MD',
    color: 'gold',
    github: 'https://github.com',
  },
];

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-midnight-950/85 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-modal-title"
        className="relative w-full max-w-4xl z-10 animate-scale-in"
      >
        <GlassCard variant="elevated" className="border border-slate-200 dark:border-cyan-500/20 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-cyan-500/10 bg-slate-50 dark:bg-midnight-900/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center">
                <img
                  src="/trustaudit-logo.png"
                  alt="TrustAudit"
                  className="w-11 h-11 object-contain drop-shadow-[0_2px_10px_rgba(2,132,199,0.3)]"
                />
              </div>
              <div>
                <h2 id="about-modal-title" className="text-xl font-display font-bold text-slate-900 dark:text-white">
                  About the TrustAudit Project & Creators
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Engineering Team & Architectural Attribution
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto space-y-6">
            {/* Mission Statement */}
            <div className="p-4 rounded-xl bg-cyan-500/5 dark:bg-cyan-500/10 border border-cyan-500/20 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <strong className="text-cyan-700 dark:text-cyan-300 font-semibold block mb-1">
                Institutional Mission
              </strong>
              TrustAudit was architected and built to solve the compliance trilemma in institutional banking:
              maintaining 100% private banking data confidentiality while achieving mathematically provable,
              tamper-proof on-chain multi-signature quorum governance and court-admissible audit trails.
            </div>

            {/* Team Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {TEAM_MEMBERS.map((member) => (
                <div
                  key={member.name}
                  className="rounded-2xl p-5 border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-midnight-900/60 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Avatar Initials & Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 dark:from-cyan-900 dark:to-midnight-900 text-white font-display font-bold text-base flex items-center justify-center border border-slate-200 dark:border-cyan-500/30 shadow-sm">
                        {member.initials}
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        Engineer
                      </Badge>
                    </div>

                    <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                      {member.name}
                    </h3>
                    <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-2">
                      {member.role}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mb-3">
                      "{member.focus}"
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                      {member.bio}
                    </p>
                  </div>

                  <div>
                    <div className="flex flex-wrap gap-1 pt-3 border-t border-slate-100 dark:border-white/5">
                      {member.skills.map((skill) => (
                        <span
                          key={skill}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-mono"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 dark:bg-midnight-950/90 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-xs text-slate-500">
            <span>TrustAudit Enterprise Platform • Developed by Med Salim Gharsellaoui, Nour Abed & Malek Dhahri</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium transition"
            >
              Close
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
