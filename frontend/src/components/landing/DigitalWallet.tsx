/**
 * DigitalWallet Component
 *
 * High-fidelity interactive digital wallet featuring:
 * - 3D stacked card interface (Gold & Silver prestige cards)
 * - Smooth spring animations using Framer Motion (stiffness: 260, damping: 20)
 * - Realistic metallic textures, NFC contactless icons, embossed chip & typography
 * - Matte black card holder with depth, dashed leather stitching, and ambient lighting
 * - Interactive states (Hover to peek, Click card to expand, Click background to close)
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Wifi, ShieldCheck } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

export interface WalletCardData {
  id: string;
  type: 'gold' | 'silver' | 'platinum';
  number: string;
  holder: string;
  expiry: string;
  balance: string;
  tier: string;
}

export interface DigitalWalletProps {
  balance?: string;
  className?: string;
  cards?: WalletCardData[];
}

// --- Default Data ---

const DEFAULT_CARDS: WalletCardData[] = [
  {
    id: 'gold-card',
    type: 'gold',
    number: '•••• •••• •••• 4289',
    holder: 'ALEXANDER HAMILTON',
    expiry: '09/28',
    balance: '$250,000.00',
    tier: 'Prestige Gold',
  },
  {
    id: 'silver-card',
    type: 'silver',
    number: '•••• •••• •••• 8832',
    holder: 'ALEXANDER HAMILTON',
    expiry: '12/26',
    balance: '$4,200.50',
    tier: 'Platinum Reserve',
  },
];

// --- Sub-Components ---

const Card: React.FC<{
  data: WalletCardData;
  index: number;
  isActive: boolean;
  isHovered: boolean;
  onClick: () => void;
  totalCards: number;
}> = ({ data, index, isActive, isHovered, onClick, totalCards }) => {
  const isGold = data.type === 'gold';

  // Calculate vertical offset based on index and interaction state
  const yOffset = isActive
    ? 55 // Active card moves DOWN to cover the wallet (centered)
    : isHovered
      ? -160 + index * 60 // Hover: Fan downwards so headers are visible
      : 0 + index * 15; // Resting: Stack downwards

  // Dynamic Z-Index for "Pop Out" effect
  // Wallet Front is z-30. Resting cards < 30. Active card > 30.
  const zIndex = isActive ? 40 : 10 + index;
  const scale = isActive ? 1.05 : 1 - (totalCards - 1 - index) * 0.05;
  const brightness = isActive ? 1 : isHovered ? 1 : 0.65 - (totalCards - 1 - index) * 0.1;
  const rotateX = isActive ? 0 : isHovered ? -5 : 0;

  return (
    <motion.div
      layout
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      initial={false}
      animate={{
        y: yOffset,
        scale: scale,
        zIndex: zIndex,
        rotateX: rotateX,
        filter: `brightness(${brightness})`,
      }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
      }}
      className={cn(
        'absolute left-0 w-full h-[200px] rounded-xl cursor-pointer shadow-2xl overflow-hidden transform-gpu border border-white/20 select-none transition-shadow',
        isGold
          ? 'bg-gradient-to-br from-[#F5D79E] via-[#C8A059] to-[#6C5528] text-[#3E2C0F]'
          : 'bg-gradient-to-br from-[#F3F4F6] via-[#B8BFCA] to-[#4B5563] text-gray-900',
        isActive ? 'ring-2 ring-white/50 shadow-[0_20px_50px_rgba(0,0,0,0.6)]' : ''
      )}
      style={{
        transformStyle: 'preserve-3d',
        top: '-45px', // Positioned higher to peek out of the top
        transformOrigin: 'bottom center',
      }}
    >
      {/* Metallic Noise Texture Overlay */}
      <div
        className="absolute inset-0 opacity-25 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.25'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Dynamic Brushed Metallic Sheen */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent opacity-60 pointer-events-none" />

      {/* Card Content Layout */}
      <div className="relative p-5 h-full flex flex-col justify-between font-mono select-none">
        {/* Top Header: Chip + Contactless Wifi */}
        <div className="flex justify-between items-start">
          <div className="w-10 h-7 rounded bg-black/15 border border-black/20 flex items-center justify-center backdrop-blur-xs relative overflow-hidden">
            <div className="w-7 h-4 border border-black/30 rounded-xs flex items-center justify-center">
              <div className="w-3 h-2 border-r border-black/30" />
            </div>
            {/* Holographic Chip Reflection */}
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-300/20 via-transparent to-cyan-300/20 pointer-events-none" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-wider font-semibold opacity-70">
              {data.tier}
            </span>
            <Wifi className={cn('w-4 h-4 rotate-90 opacity-80', isGold ? 'text-[#3E2C0F]' : 'text-gray-800')} />
          </div>
        </div>

        {/* Center: Card Number */}
        <div className="space-y-3">
          <div
            className={cn(
              'text-lg sm:text-xl tracking-[0.22em] font-bold font-mono drop-shadow-xs',
              isGold ? 'text-[#2A1D07]' : 'text-gray-900'
            )}
          >
            {data.number}
          </div>

          {/* Bottom Info: Card Holder & Expiration */}
          <div className="flex justify-between items-end">
            <div className="space-y-0.5">
              <div className={cn('text-[9px] uppercase tracking-wider opacity-75 font-semibold', isGold ? 'text-[#3E2C0F]' : 'text-gray-800')}>
                Card Holder
              </div>
              <div className={cn('text-xs font-bold tracking-wider uppercase', isGold ? 'text-[#2A1D07]' : 'text-gray-900')}>
                {data.holder}
              </div>
            </div>
            <div className="space-y-0.5 text-right">
              <div className={cn('text-[9px] uppercase tracking-wider opacity-75 font-semibold', isGold ? 'text-[#3E2C0F]' : 'text-gray-800')}>
                Expires
              </div>
              <div className={cn('text-xs font-bold tracking-wider', isGold ? 'text-[#2A1D07]' : 'text-gray-900')}>
                {data.expiry}
              </div>
            </div>
          </div>
        </div>

        {/* Brand Stamp Simulation */}
        <div className={cn('absolute top-4 right-14 flex items-center gap-1', isGold ? 'text-[#3E2C0F]' : 'text-gray-900')}>
          <div className="font-serif italic text-base font-black tracking-tighter opacity-70">Prestige</div>
        </div>
      </div>
    </motion.div>
  );
};

// --- Main DigitalWallet Component ---

export function DigitalWallet({
  balance = '$250,000',
  className,
  cards = DEFAULT_CARDS,
}: DigitalWalletProps) {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [isWalletHovered, setIsWalletHovered] = useState(false);

  const handleBackgroundClick = () => {
    setActiveCardId(null);
  };

  const activeCard = cards.find((c) => c.id === activeCardId);
  const currentBalance = activeCard ? activeCard.balance : balance;

  return (
    <div
      className={cn(
        'relative w-full py-16 px-4 flex flex-col items-center justify-center overflow-hidden rounded-3xl bg-[#051810] border border-emerald-950/60 shadow-2xl',
        className
      )}
      onClick={handleBackgroundClick}
    >
      {/* Decorative ambient lighting - Emerald/Forest glow */}
      <div className="absolute top-[-30%] left-[-20%] w-[140%] h-[160%] bg-[radial-gradient(circle_at_50%_45%,rgba(21,65,45,0.75)_0%,rgba(5,24,16,0.98)_70%)] pointer-events-none" />

      {/* Subtle Grid Accent */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(16, 185, 129, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(16, 185, 129, 0.15) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Header Tag */}
      <div className="relative z-10 flex items-center gap-2 mb-8 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>TREASURY LIQUIDITY VAULT</span>
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-md" style={{ perspective: '1000px' }}>
        {/* Wallet Container */}
        <div
          className="relative w-80 h-56 md:w-96 md:h-64 cursor-pointer"
          onMouseEnter={() => setIsWalletHovered(true)}
          onMouseLeave={() => setIsWalletHovered(false)}
        >
          {/* Card Stack Area - Children sort relative to Wallet Front */}
          <div
            className="absolute inset-x-6 top-0 bottom-0 pointer-events-none"
            style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
          >
            {cards.map((card, index) => (
              <div key={card.id} className="pointer-events-auto">
                <Card
                  data={card}
                  index={index}
                  isActive={activeCardId === card.id}
                  isHovered={isWalletHovered}
                  onClick={() => setActiveCardId(activeCardId === card.id ? null : card.id)}
                  totalCards={cards.length}
                />
              </div>
            ))}
          </div>

          {/* The Physical Wallet (Front Pocket) */}
          <motion.div
            className="absolute inset-0 bg-[#121212] rounded-2xl shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95)] border border-white/10 z-30 flex flex-col items-center justify-center text-center overflow-hidden"
            initial={false}
            animate={{
              rotateX: isWalletHovered || activeCardId ? 5 : 0,
              y: isWalletHovered ? 5 : 0,
            }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            {/* Leather Noise Texture */}
            <div
              className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.3'/%3E%3C/svg%3E")`,
              }}
            />

            {/* Subtle Gradient for volume */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/60 pointer-events-none" />

            {/* Wallet Stitching */}
            <div className="absolute inset-3 border border-dashed border-white/15 rounded-xl opacity-60 pointer-events-none" />

            {/* BALANCE DISPLAY INSIDE WALLET */}
            <div className="relative z-10 flex flex-col items-center space-y-1.5">
              <span className="text-[#6E8B7E] text-[10px] tracking-[0.28em] font-bold uppercase font-mono">
                {activeCard ? `${activeCard.tier.toUpperCase()} BALANCE` : 'TOTAL BALANCE'}
              </span>
              <motion.div
                key={currentBalance}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-4xl sm:text-5xl text-[#F0F2F1] font-display tracking-tight font-bold"
                style={{ textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}
              >
                {currentBalance}
              </motion.div>
              <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-400/90 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Audited On-Chain (EVM Ganache)</span>
              </div>
            </div>

            {/* Wallet Slot Visual */}
            <div className="absolute top-0 inset-x-8 h-1 bg-black/70 rounded-b-lg blur-[1px]" />
          </motion.div>

          {/* Wallet Back Layer (Depth) */}
          <motion.div
            className="absolute inset-0 bg-[#080808] rounded-2xl z-0 transform translate-y-3 translate-z-[-10px] scale-[0.98] border border-black"
          />
        </div>
      </div>
    </div>
  );
}

export default DigitalWallet;
