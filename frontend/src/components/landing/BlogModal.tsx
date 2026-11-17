import React, { useState } from 'react';
import { BookOpen, Calendar, Clock, ArrowRight, X, Shield, Lock, Cpu, Sparkles } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { Badge } from '../ui/Badge';

interface BlogModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPostId?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  subtitle: string;
  category: 'Cryptography' | 'AI Governance' | 'Smart Contracts';
  date: string;
  readTime: string;
  author: string;
  summary: string;
  content: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    id: 'ai-advisory-governance',
    title: 'Why AI Must Never Decide: Building Advisory-Only Fraud Detection for Banking Audits',
    subtitle: 'The regulatory and systemic risks of autonomous machine learning in financial settlement.',
    category: 'AI Governance',
    date: 'November 2026',
    readTime: '6 min read',
    author: 'Nour Abed & Med Salim Gharsellaoui',
    summary: 'Autonomous AI models in financial approvals create severe legal liability and hallucination risks. TrustAudit enforces a strictly advisory architecture where AI explains risk via SHAP, but only human multi-sig quorums can approve.',
    content: [
      'In high-value banking operations, autonomous AI models present a catastrophic liability paradox: when an autonomous model incorrectly flags or executes an enterprise transfer, who bears legal fiduciary responsibility under Basel III and GDPR? Neither the model weights nor the cloud API provider.',
      'To solve this, TrustAudit separates analytical intelligence from executive authority. Our AI subsystem operates strictly in an advisory capacity.',
      'Using an ensemble of XGBoost and Random Forest models trained on enterprise transaction distributions, the AI engine evaluates behavioral vectors—such as geographic velocity, historical frequency delta, and out-of-band PIN modifications. It generates a continuous risk score between 0 and 100, paired with an explanation hash.',
      'Crucially, model failure or service degradation can never be interpreted as low risk. Even when the AI marks a transaction as low risk, the smart contract still mandates human multi-signature sign-off. The AI is a microscope for the human auditor, never the judge.',
    ],
  },
  {
    id: 'rfc-8785-canonical-hashes',
    title: 'Zero-Knowledge Compliance: RFC 8785 Canonical JSON & Salted SHA-256 Commitments on EVM',
    subtitle: 'How banks prove data integrity on public blockspace without leaking customer bank accounts.',
    category: 'Cryptography',
    date: 'November 2026',
    readTime: '8 min read',
    author: 'Malek Dhahri & Med Salim Gharsellaoui',
    summary: 'Storing private bank data on a blockchain violates financial privacy laws. TrustAudit uses RFC 8785 JSON Canonicalization Scheme (JCS) paired with 32-byte cryptographically secure salts to create irreversible, deterministic commitments.',
    content: [
      'A fundamental dilemma facing blockchain adoption in institutional finance is the permanence of on-chain data. Public EVM ledgers are immutable; if sensitive customer IBANs, tax IDs, or transaction notes are recorded on-chain—even encrypted—they risk future exposure through quantum cryptanalysis or private key leakage.',
      'TrustAudit pioneers a hybrid on-chain/off-chain model where private transaction payloads remain inside regulated bank perimeters.',
      'To achieve mathematical tamper-evidence, transactions are normalized using the RFC 8785 JSON Canonicalization Scheme (JCS). This standard eliminates key reordering, whitespace variance, and unicode ambiguity, ensuring identical byte representation regardless of operating system or runtime.',
      'The canonical string is combined with a domain separator and a 32-byte cryptographically secure random salt: SHA256("TrustAudit:v1" || JCS(data) || salt). Only this 32-byte root is submitted to the Solidity smart contract. Anyone can verify integrity by providing the preimage, yet nobody can reverse-engineer private banking details from the blockchain.',
    ],
  },
  {
    id: 'soulbound-tokens-forensics',
    title: 'Soulbound Tokens (ERC-5192) as Court-Admissible Forensic Audit Evidence',
    subtitle: 'Replacing insecure paper receipts and centralized databases with non-transferable Ethereum certificates.',
    category: 'Smart Contracts',
    date: 'November 2026',
    readTime: '5 min read',
    author: 'Med Salim Gharsellaoui & Malek Dhahri',
    summary: 'Traditional audit certificates are easily forged or altered in centralized databases. TrustAudit issues soulbound ERC-5192 NFTs that permanently link the approved case ID, approver addresses, and timestamp without holding personal data.',
    content: [
      'In traditional internal banking audits, approval logs live in relational databases like PostgreSQL or Oracle. If a rogue database administrator or privileged attacker gains access, rows can be silently altered or backdated, corrupting the audit trail.',
      'TrustAudit binds execution to non-transferable ERC-721 + ERC-5192 Soulbound Tokens (SBT). Upon achieving the required threshold of human MetaMask approvals (e.g., 3-of-3 for Tier-3 enterprise transfers > 50,000 DT), the TrustAuditRegistry invokes the TrustAuditCertificate contract to mint a permanent audit token.',
      'ERC-5192 guarantees non-transferability through an on-chain lock event: once minted to the institutional vault, the certificate can never be transferred, sold, or destroyed. The token URI references a deterministic cryptographic proof containing the exact case ID, salted hash commitment, approver signatures, and execution timestamp.',
      'Regulators and external auditors can verify compliance instantaneously by querying the public smart contract without accessing bank databases or trusting internal bank personnel.',
    ],
  },
];

export const BlogModal: React.FC<BlogModalProps> = ({ isOpen, onClose, initialPostId }) => {
  const [selectedPost, setSelectedPost] = useState<BlogPost>(
    () => BLOG_POSTS.find((p) => p.id === initialPostId) || BLOG_POSTS[0]
  );

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
        aria-labelledby="blog-modal-title"
        className="relative w-full max-w-5xl z-10 animate-scale-in"
      >
        <GlassCard variant="elevated" className="border border-slate-200 dark:border-cyan-500/20 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-cyan-500/10 bg-slate-50 dark:bg-midnight-900/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-600 flex items-center justify-center shadow-md">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 id="blog-modal-title" className="text-xl font-display font-bold text-slate-900 dark:text-white">
                  TrustAudit Engineering & Research Insights
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Whitepapers, Cryptographic Protocols & Governance Standards
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

          {/* Body: Sidebar + Reader */}
          <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden min-h-0">
            {/* Sidebar list */}
            <div className="md:col-span-4 border-r border-slate-200 dark:border-white/5 p-4 overflow-y-auto space-y-2.5 bg-slate-50/50 dark:bg-black/20">
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2 px-1">
                Articles & Publications
              </div>
              {BLOG_POSTS.map((post) => {
                const active = post.id === selectedPost.id;
                return (
                  <button
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    className={`w-full text-left p-3.5 rounded-xl transition-all border ${
                      active
                        ? 'bg-white dark:bg-midnight-800 border-cyan-500/40 shadow-sm dark:shadow-[0_0_15px_rgba(6,182,212,0.15)] text-slate-900 dark:text-white'
                        : 'border-transparent hover:bg-white/60 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
                      <span className="text-cyan-600 dark:text-cyan-400 font-semibold">{post.category}</span>
                      <span className="text-slate-400">{post.readTime}</span>
                    </div>
                    <div className="font-semibold text-xs line-clamp-2 leading-snug">
                      {post.title}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Article Reader */}
            <div className="md:col-span-8 p-6 md:p-8 overflow-y-auto space-y-6 bg-white dark:bg-midnight-950/60">
              {/* Meta */}
              <div className="space-y-3 pb-6 border-b border-slate-200 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border-cyan-500/30">
                    {selectedPost.category}
                  </Badge>
                  <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                    <Calendar className="w-3.5 h-3.5" />
                    {selectedPost.date}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    {selectedPost.readTime}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white leading-tight">
                  {selectedPost.title}
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                  {selectedPost.subtitle}
                </p>

                <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400 pt-1">
                  Authored by: <strong className="text-slate-900 dark:text-slate-200">{selectedPost.author}</strong>
                </div>
              </div>

              {/* Body */}
              <div className="prose dark:prose-invert max-w-none space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {selectedPost.content.map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 dark:bg-midnight-950/90 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-xs text-slate-500">
            <span>TrustAudit Research Publication Series</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium transition"
            >
              Close Reader
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
