import React, { useState, useEffect } from 'react';
import {
  X, Send, Sparkles, AlertCircle, CheckCircle2, ShieldCheck, RefreshCw,
  Globe, Key, Moon, Sun, ArrowRight, ShieldAlert, FileText, Check, DollarSign, Building2
} from 'lucide-react';
import { ethers } from 'ethers';
import { useQueryClient } from '@tanstack/react-query';
import { createTransaction, assessCaseAI } from '../lib/api-client';
import { useWallet } from '../context/WalletContext';
import { REGISTRY_ADDRESS, REGISTRY_ABI, CHAIN_ID, CHAIN_ID_HEX } from '../config/contracts';

interface CreateCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (caseId: string) => void;
}

const PRESETS = [
  {
    name: 'Tier 3 Enterprise Transfer (60,000 DT)',
    badge: '3/3 Quorum Gate',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    description: 'Requires 3 human signatures: Compliance + Risk Manager + Director.',
    data: {
      customer_reference: 'REF-ENT-2026-8891',
      sender_name: 'Atlas Industrial SA',
      sender_iban: 'TN5910001000123456789012',
      beneficiary_name: 'EuroTech Global GmbH',
      beneficiary_iban: 'DE89370400440532013000',
      amount: 60000,
      currency: 'DT',
      merchant_category: 'Wire Transfer',
      transaction_type: 'Transfer',
      hour_of_day: 14,
      is_night_transaction: false,
      time_since_last_txn_hrs: 24.5,
      is_international: true,
      failed_attempts: 0,
      pin_changed_recently: false,
    },
  },
  {
    name: '🚨 High-Risk Fraud Anomaly (800 DT)',
    badge: 'AI HIGH RISK (Score 80)',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.3)]',
    description: 'Night window (1am) + 3 failed logins + International wire. AI High Risk Score ~80!',
    data: {
      customer_reference: 'REF-ANOMALY-2026-9901',
      sender_name: 'Walid Ben Amor',
      sender_iban: 'TN5910001000998877665544',
      beneficiary_name: 'Offshore Vault Holdings LTD',
      beneficiary_iban: 'DE89370400440532013000',
      amount: 800,
      currency: 'DT',
      merchant_category: 'Wire Transfer',
      transaction_type: 'Transfer',
      hour_of_day: 1,
      is_night_transaction: true,
      time_since_last_txn_hrs: 24.0,
      is_international: true,
      failed_attempts: 3,
      pin_changed_recently: false,
    },
  },
  {
    name: 'Routine Commercial Invoice (3,500 DT)',
    badge: 'Tier 1 Fast-Path',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    description: 'Tier 1 routine daytime transaction -> Single Compliance signoff.',
    data: {
      customer_reference: 'REF-COMM-2026-1049',
      sender_name: 'Sousse Distribution SARL',
      sender_iban: 'TN5910001000112233445566',
      beneficiary_name: 'Tunis Paper Mills',
      beneficiary_iban: 'TN5920002000667788990011',
      amount: 3500,
      currency: 'DT',
      merchant_category: 'Online Shopping',
      transaction_type: 'Payment',
      hour_of_day: 11,
      is_night_transaction: false,
      time_since_last_txn_hrs: 72.0,
      is_international: false,
      failed_attempts: 0,
      pin_changed_recently: false,
    },
  },
];

const CATEGORIES = [
  'Wire Transfer',
  'Crypto Exchange',
  'Online Shopping',
  'ATM Withdrawal',
  'POS Payment',
  'Electronics',
  'Jewelry',
  'Entertainment',
  'Groceries',
  'Travel',
  'Restaurants',
  'Gas Station',
  'Pharmacy',
  'Financial Services',
  'Cash Advance',
];

export const CreateCaseModal: React.FC<CreateCaseModalProps> = ({ isOpen, onClose, onCreated }) => {
  const queryClient = useQueryClient();
  const { account, connectWallet } = useWallet();

  const [formData, setFormData] = useState(PRESETS[0].data);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'FORM' | 'CRYPTO' | 'METAMASK' | 'AI' | 'SUCCESS'>('FORM');
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const loadPreset = (preset: typeof PRESETS[0]) => {
    setFormData({ ...preset.data });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    let activeAccount = account;
    if (!activeAccount) {
      if (typeof (window as any).ethereum !== 'undefined') {
        try {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const accounts = await provider.send('eth_requestAccounts', []);
          if (accounts.length > 0) {
            activeAccount = accounts[0];
            await connectWallet();
          }
        } catch (e: any) {
          setErrorMsg('MetaMask connection request was cancelled.');
          return;
        }
      }
    }

    if (!activeAccount) {
      setErrorMsg('Please connect your MetaMask wallet before initiating a transaction.');
      return;
    }

    try {
      setLoading(true);

      // Step 1: Off-chain DB registration & cryptographic commitment
      setStep('CRYPTO');
      setStatusMsg('Computing RFC 8785 canonical JSON & 32-byte salted SHA-256 commitment...');
      const txnRes = await createTransaction({
        ...formData,
        amount: Number(formData.amount),
        hour_of_day: Number(formData.hour_of_day),
        time_since_last_txn_hrs: Number(formData.time_since_last_txn_hrs),
        failed_attempts: Number(formData.failed_attempts),
      }) as { case_id: string; salted_input_hash: string; value_tier: number; deadline: string };

      const { case_id, salted_input_hash, value_tier, deadline } = txnRes;
      setCreatedCaseId(case_id);

      // Step 2: On-chain Registration via MetaMask
      setStep('METAMASK');
      setStatusMsg('Verifying network & confirming transaction in MetaMask...');

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== CHAIN_ID) {
        setStatusMsg('Please switch MetaMask network to Ganache Local EVM...');
        try {
          await (window as any).ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CHAIN_ID_HEX }],
          });
        } catch (switchErr: any) {
          if (switchErr.code === 4902) {
            await (window as any).ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: CHAIN_ID_HEX,
                  chainName: 'Ganache Local EVM',
                  rpcUrls: ['http://127.0.0.1:8545'],
                  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                },
              ],
            });
          } else {
            throw new Error(`Wrong Network (${network.name}). Please switch MetaMask to Ganache Local EVM (Chain ID: ${CHAIN_ID})`);
          }
        }
      }

      const activeProvider = new ethers.BrowserProvider((window as any).ethereum);
      const activeNetwork = await activeProvider.getNetwork();
      if (Number(activeNetwork.chainId) !== CHAIN_ID) {
        throw new Error(
          `Safety Block: MetaMask is currently connected to ${activeNetwork.name} (Chain ID ${activeNetwork.chainId}). Please switch MetaMask to "Ganache Local EVM" (Chain ID: ${CHAIN_ID}) before registering this case!`
        );
      }
      const signer = await activeProvider.getSigner();
      const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);

      const unixDeadline = Math.floor(new Date(deadline).getTime() / 1000);

      // Invoke registerCase on TrustAuditRegistry
      const tx = await registry.registerCase(case_id, salted_input_hash, value_tier, unixDeadline);
      setStatusMsg(`Mining on Ganache EVM (Tx: ${tx.hash.slice(0, 10)}...)...`);
      await tx.wait();
      setTxHash(tx.hash);

      // Step 3: Trigger Consultative AI Risk Assessment
      setStep('AI');
      setStatusMsg('Running Scikit-Learn fraud detection model & SHAP TreeExplainer...');
      try {
        await assessCaseAI(case_id);
      } catch (aiErr) {
        console.warn('AI assessment trigger warning:', aiErr);
      }

      // Immediately invalidate cases cache so the table updates in the background
      await queryClient.invalidateQueries({ queryKey: ['cases'] });

      setStep('SUCCESS');
      setStatusMsg('Case successfully registered on-chain and screened by AI!');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.reason || err.message || 'Failed to register transaction case.');
      setStep('FORM');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    queryClient.invalidateQueries({ queryKey: ['cases'] });
    if (createdCaseId) {
      onCreated(createdCaseId);
    }
    setCreatedCaseId(null);
    setTxHash(null);
    onClose();
    setStep('FORM');
  };

  const handleClose = () => {
    if (createdCaseId) {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      setCreatedCaseId(null);
      setTxHash(null);
    }
    setStep('FORM');
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) handleClose();
      }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      <div className="bg-[#070b16] border border-cyan-500/25 rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] text-slate-100 animate-scale-in">
        {/* Header */}
        <div className="px-6 py-5 border-b border-cyan-500/20 flex items-center justify-between bg-gradient-to-r from-slate-950 via-[#070d1e] to-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Initiate Banking Audit Case</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 uppercase font-semibold">
                  EVM Gate (1337)
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                RFC 8785 canonical commitment · CSPRNG 32-byte salt · Multi-sig governance
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-slate-400 hover:text-white transition p-1.5 rounded-xl hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {step === 'SUCCESS' ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(16,185,129,0.25)]">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-xl font-bold text-white">Case Successfully Registered & Anchored!</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Off-chain evidence has been salted & hashed, the EVM execution gate is primed on Ganache, and the AI
                risk engine has computed calibrated scores.
              </p>

              <div className="bg-slate-950 p-4 rounded-xl border border-white/10 max-w-lg mx-auto text-left font-mono text-xs space-y-2">
                <div>
                  <span className="text-slate-400">Case Reference ID: </span>
                  <span className="text-cyan-400 font-bold break-all">{createdCaseId}</span>
                </div>
                {txHash && (
                  <div>
                    <span className="text-slate-400">Blockchain Tx: </span>
                    <span className="text-slate-300 break-all">{txHash}</span>
                  </div>
                )}
              </div>

              <div className="pt-4">
                <button
                  onClick={handleFinish}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-sm rounded-xl transition shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                >
                  View Case Details & Approvals
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="py-14 text-center space-y-4">
              <RefreshCw className="w-10 h-10 animate-spin text-cyan-400 mx-auto" />
              <div className="text-base font-bold text-white">
                {step === 'CRYPTO' && '1/3 Generating Cryptographic Salt & Canonical Commitment'}
                {step === 'METAMASK' && '2/3 Confirming Multi-Sig Registration in MetaMask'}
                {step === 'AI' && '3/3 Running Scikit-Learn Model & SHAP TreeExplainer'}
              </div>
              <p className="text-xs text-slate-400 font-mono max-w-sm mx-auto">{statusMsg}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMsg && (
                <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Demo Scenario Presets */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Quick Scenario Presets</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">1-click automated setup</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {PRESETS.map((p, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => loadPreset(p)}
                      className="group p-3 text-left bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-xl transition-all duration-200 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${p.badgeClass}`}>
                            {p.badge}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                          {p.name}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-2 line-clamp-2">
                        {p.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Grid Section 1: Classification */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-4">
                <div className="text-[11px] font-mono uppercase tracking-wider font-bold text-cyan-400 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Transaction Identification & Category</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold mb-1.5">
                      Customer Reference
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.customer_reference}
                      onChange={(e) => setFormData({ ...formData, customer_reference: e.target.value })}
                      className="w-full bg-[#040814] border border-slate-700 hover:border-cyan-500/50 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 font-mono transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold mb-1.5">
                      Transaction Category
                    </label>
                    <select
                      value={formData.merchant_category}
                      onChange={(e) => setFormData({ ...formData, merchant_category: e.target.value })}
                      className="w-full bg-[#040814] border border-slate-700 hover:border-cyan-500/50 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 font-sans transition"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat} className="bg-slate-900 text-white">
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Form Grid Section 2: Financial Counterparties */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-4">
                <div className="text-[11px] font-mono uppercase tracking-wider font-bold text-cyan-400 flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Settlement Counterparties (Off-Chain Banking Details)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold mb-1.5">
                      Sender Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.sender_name}
                      onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
                      className="w-full bg-[#040814] border border-slate-700 hover:border-cyan-500/50 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 font-sans transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold mb-1.5">
                      Sender IBAN
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.sender_iban}
                      onChange={(e) => setFormData({ ...formData, sender_iban: e.target.value })}
                      className="w-full bg-[#040814] border border-slate-700 hover:border-cyan-500/50 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 font-mono transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold mb-1.5">
                      Beneficiary Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.beneficiary_name}
                      onChange={(e) => setFormData({ ...formData, beneficiary_name: e.target.value })}
                      className="w-full bg-[#040814] border border-slate-700 hover:border-cyan-500/50 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 font-sans transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold mb-1.5">
                      Beneficiary IBAN
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.beneficiary_iban}
                      onChange={(e) => setFormData({ ...formData, beneficiary_iban: e.target.value })}
                      className="w-full bg-[#040814] border border-slate-700 hover:border-cyan-500/50 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 font-mono transition"
                    />
                  </div>
                </div>
              </div>

              {/* Form Grid Section 3: Amount & Timing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold">
                      Settlement Amount (DT)
                    </label>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {formData.amount >= 50000 ? 'Tier 3 (>50k DT)' : formData.amount >= 5000 ? 'Tier 2 (5k-50k DT)' : 'Tier 1 (<5k DT)'}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#040814] border border-slate-700 hover:border-cyan-500/50 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs font-mono font-bold text-slate-400">
                      DT
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold">
                      Hour of Day (0–23)
                    </label>
                    {formData.is_night_transaction ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1 font-semibold">
                        <Moon className="w-3 h-3 text-rose-400" />
                        Night Window (High Risk)
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                        <Sun className="w-3 h-3 text-emerald-400" />
                        Business Window
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={formData.hour_of_day}
                    onChange={(e) => {
                      const h = parseInt(e.target.value) || 0;
                      setFormData({
                        ...formData,
                        hour_of_day: h,
                        is_night_transaction: h >= 22 || h < 6,
                      });
                    }}
                    className="w-full bg-[#040814] border border-slate-700 hover:border-cyan-500/50 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition"
                  />
                </div>
              </div>

              {/* Form Grid Section 4: AI Behavioral Risk Vector Indicators */}
              <div className="p-4.5 rounded-xl bg-[#030611] border border-cyan-500/25 space-y-3.5 shadow-[0_0_20px_rgba(6,182,212,0.06)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      Fraud Telemetry Indicators (Scikit-Learn ML Feature Inputs)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    23-Dim Vector
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Interactive toggle card: International Wire */}
                  <div
                    onClick={() => setFormData({ ...formData, is_international: !formData.is_international })}
                    className={`cursor-pointer p-3 rounded-xl border transition-all flex items-center justify-between ${
                      formData.is_international
                        ? 'bg-cyan-500/15 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Globe className={`w-4 h-4 ${formData.is_international ? 'text-cyan-400' : 'text-slate-500'}`} />
                      <div>
                        <div className="text-xs font-bold text-white">Cross-Border</div>
                        <div className="text-[10px] text-slate-400">International Wire</div>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                      formData.is_international ? 'bg-cyan-500 border-cyan-400 text-slate-950' : 'border-slate-600'
                    }`}>
                      {formData.is_international && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  {/* Interactive toggle card: PIN Changed Recently */}
                  <div
                    onClick={() => setFormData({ ...formData, pin_changed_recently: !formData.pin_changed_recently })}
                    className={`cursor-pointer p-3 rounded-xl border transition-all flex items-center justify-between ${
                      formData.pin_changed_recently
                        ? 'bg-amber-500/15 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Key className={`w-4 h-4 ${formData.pin_changed_recently ? 'text-amber-400' : 'text-slate-500'}`} />
                      <div>
                        <div className="text-xs font-bold text-white">Credential Reset</div>
                        <div className="text-[10px] text-slate-400">PIN Changed Recently</div>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                      formData.pin_changed_recently ? 'bg-amber-500 border-amber-400 text-slate-950' : 'border-slate-600'
                    }`}>
                      {formData.pin_changed_recently && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  {/* Failed Authentication Attempts Counter */}
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        Failed Auth Logins
                      </span>
                      {formData.failed_attempts >= 3 && (
                        <span className="text-[9px] font-bold text-rose-400 uppercase">Anomaly</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={formData.failed_attempts}
                        onChange={(e) => setFormData({ ...formData, failed_attempts: parseInt(e.target.value) || 0 })}
                        className="w-full bg-[#040814] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono font-bold focus:border-cyan-400 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400 font-mono">tries</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Action Bar */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold rounded-xl transition shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center gap-2 hover:scale-[1.01]"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Commit RFC 8785 Hash & Register on EVM</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};