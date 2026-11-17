import React from 'react';

interface CertificateArtworkProps {
  tokenId: number;
  caseId: string;
  amount: number;
  currency: string;
  beneficiaryName: string;
  approvalCount: number;
  requiredApprovals: number;
  createdAt?: string;
  variant?: 'card' | 'modal';
}

export const SoulboundCertificateArtwork: React.FC<CertificateArtworkProps> = ({
  tokenId,
  caseId,
  amount,
  currency,
  beneficiaryName,
  approvalCount,
  requiredApprovals,
  createdAt,
  variant = 'card',
}) => {
  const shortCaseId = `${caseId.slice(0, 10)}...${caseId.slice(-8)}`;
  const formattedAmount = Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const issueDate = createdAt ? new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }) : 'IMMUTABLE EPOCH';

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden select-none border border-amber-500/30 dark:border-amber-400/30 shadow-2xl transition-all duration-300 ${
        variant === 'card'
          ? 'aspect-[16/10] hover:scale-[1.02] hover:shadow-amber-500/20'
          : 'aspect-[16/10] max-w-4xl mx-auto shadow-amber-500/20'
      }`}
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, #171d2b 0%, #0c101a 50%, #06080e 100%)',
      }}
    >
      {/* SVG Canvas Certificate Representation */}
      <svg
        viewBox="0 0 800 500"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id={`goldGrad-${tokenId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="25%" stopColor="#eab308" />
            <stop offset="50%" stopColor="#ca8a04" />
            <stop offset="75%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#a16207" />
          </linearGradient>

          <linearGradient id={`emeraldGrad-${tokenId}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>

          <radialGradient id={`glowGrad-${tokenId}`} cx="50%" cy="30%" r="50%">
            <stop offset="0%" stopColor="#eab308" stopOpacity="0.15" />
            <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#06080e" stopOpacity="0" />
          </radialGradient>

          {/* Security Pattern (Guilloche Micro-grid) */}
          <pattern id={`guilloche-${tokenId}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <path
              d="M 0 10 Q 5 0, 10 10 T 20 10 M 10 0 Q 15 10, 20 0 T 30 0"
              fill="none"
              stroke="#ca8a04"
              strokeWidth="0.4"
              strokeOpacity="0.15"
            />
          </pattern>

          {/* Corner Rosette Pattern */}
          <g id={`corner-rosette-${tokenId}`}>
            <circle cx="0" cy="0" r="28" fill="none" stroke={`url(#goldGrad-${tokenId})`} strokeWidth="1" strokeOpacity="0.6" />
            <circle cx="0" cy="0" r="22" fill="none" stroke={`url(#goldGrad-${tokenId})`} strokeWidth="0.6" strokeDasharray="2,2" />
            <circle cx="0" cy="0" r="14" fill="#0b0f19" stroke={`url(#goldGrad-${tokenId})`} strokeWidth="1" />
            <circle cx="0" cy="0" r="6" fill="#eab308" />
          </g>
        </defs>

        {/* Ambient Glow */}
        <rect width="800" height="500" fill={`url(#glowGrad-${tokenId})`} />

        {/* Background Guilloche Security Pattern */}
        <rect x="25" y="25" width="750" height="450" fill={`url(#guilloche-${tokenId})`} />

        {/* Outer Guilloche Border */}
        <rect
          x="20"
          y="20"
          width="760"
          height="460"
          rx="12"
          fill="none"
          stroke={`url(#goldGrad-${tokenId})`}
          strokeWidth="2.5"
          strokeOpacity="0.85"
        />

        {/* Inner Fine Border */}
        <rect
          x="28"
          y="28"
          width="744"
          height="444"
          rx="8"
          fill="none"
          stroke="#ca8a04"
          strokeWidth="0.8"
          strokeDasharray="4,2"
          strokeOpacity="0.6"
        />

        {/* 4 Corner Rosettes */}
        <use href={`#corner-rosette-${tokenId}`} x="32" y="32" />
        <use href={`#corner-rosette-${tokenId}`} x="768" y="32" />
        <use href={`#corner-rosette-${tokenId}`} x="32" y="468" />
        <use href={`#corner-rosette-${tokenId}`} x="768" y="468" />

        {/* Top Header Badge */}
        <g transform="translate(400, 52)">
          <rect
            x="-190"
            y="-14"
            width="380"
            height="28"
            rx="6"
            fill="#0f172a"
            stroke={`url(#goldGrad-${tokenId})`}
            strokeWidth="1"
          />
          <text
            x="0"
            y="4"
            textAnchor="middle"
            fill="#fef08a"
            fontSize="9"
            fontWeight="700"
            letterSpacing="2.5"
            fontFamily="monospace"
          >
            SOVEREIGN AUDIT &amp; CLEARING ATTESTATION
          </text>
        </g>

        {/* Official Title */}
        <text
          x="400"
          y="100"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="18"
          fontWeight="800"
          letterSpacing="1"
          fontFamily="system-ui, sans-serif"
        >
          SOULBOUND AUDIT CERTIFICATE
        </text>

        <text
          x="400"
          y="118"
          textAnchor="middle"
          fill="#94a3b8"
          fontSize="9.5"
          letterSpacing="1"
          fontFamily="monospace"
        >
          ERC-721 / ERC-5192 NON-TRANSFERABLE COMPLIANCE PROOF
        </text>

        {/* Gold Divider Line */}
        <line
          x1="180"
          y1="130"
          x2="620"
          y2="130"
          stroke={`url(#goldGrad-${tokenId})`}
          strokeWidth="1.2"
          strokeOpacity="0.6"
        />

        {/* Central Official Medallion / Shield */}
        <g transform="translate(130, 235)">
          {/* Circular Seal Background */}
          <circle cx="0" cy="0" r="54" fill="#0b0f19" stroke={`url(#goldGrad-${tokenId})`} strokeWidth="2" />
          <circle cx="0" cy="0" r="48" fill="none" stroke="#ca8a04" strokeWidth="0.8" strokeDasharray="3,3" />
          <circle cx="0" cy="0" r="38" fill="#1e293b" stroke={`url(#emeraldGrad-${tokenId})`} strokeWidth="1" />

          {/* Central Shield Graphic */}
          <path
            d="M 0 -20 L 16 -12 L 16 6 C 16 16, 0 24, 0 24 C 0 24, -16 16, -16 6 L -16 -12 Z"
            fill="none"
            stroke="#fef08a"
            strokeWidth="2"
          />
          {/* Checkmark in shield */}
          <path
            d="M -7 2 L -2 7 L 8 -5"
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <text
            x="0"
            y="70"
            textAnchor="middle"
            fill="#eab308"
            fontSize="9"
            fontWeight="700"
            fontFamily="monospace"
            letterSpacing="1"
          >
            TOKEN #{String(tokenId).padStart(4, '0')}
          </text>
        </g>

        {/* Main Certificate Information Block */}
        <g transform="translate(220, 160)">
          {/* Settlement Value Box */}
          <rect
            x="0"
            y="0"
            width="510"
            height="58"
            rx="8"
            fill="#090d16"
            stroke="#334155"
            strokeWidth="0.8"
          />
          <text x="20" y="22" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
            Validated Settlement Amount:
          </text>
          <text
            x="20"
            y="46"
            fill="#38bdf8"
            fontSize="22"
            fontWeight="800"
            fontFamily="monospace"
          >
            {formattedAmount} <tspan fill="#fef08a" fontSize="15">{currency}</tspan>
          </text>

          {/* Beneficiary Entity */}
          <text x="320" y="22" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
            Beneficiary Entity:
          </text>
          <text
            x="320"
            y="44"
            fill="#ffffff"
            fontSize="13"
            fontWeight="700"
            fontFamily="sans-serif"
          >
            {beneficiaryName.length > 20 ? `${beneficiaryName.slice(0, 19)}...` : beneficiaryName}
          </text>

          {/* Cryptographic Hash Row */}
          <g transform="translate(0, 72)">
            <text x="0" y="14" fill="#94a3b8" fontSize="9.5" fontFamily="sans-serif">
              Anchored Case Reference:
            </text>
            <text x="145" y="14" fill="#a78bfa" fontSize="9.5" fontWeight="600" fontFamily="monospace">
              {shortCaseId}
            </text>

            <text x="0" y="32" fill="#94a3b8" fontSize="9.5" fontFamily="sans-serif">
              Quorum Signatures:
            </text>
            <text x="145" y="32" fill="#10b981" fontSize="9.5" fontWeight="700" fontFamily="monospace">
              {approvalCount} of {requiredApprovals} Signed &amp; Ratified (100% Quorum Met)
            </text>

            <text x="0" y="50" fill="#94a3b8" fontSize="9.5" fontFamily="sans-serif">
              Attestation Date:
            </text>
            <text x="145" y="50" fill="#f8fafc" fontSize="9.5" fontFamily="monospace">
              {issueDate}
            </text>
          </g>

          {/* Three Governance Seal Badges */}
          <g transform="translate(0, 140)">
            {/* Seal 1: Compliance */}
            <g transform="translate(0, 0)">
              <rect x="0" y="0" width="160" height="34" rx="6" fill="#022c22" stroke="#10b981" strokeWidth="1" />
              <circle cx="16" cy="17" r="6" fill="#10b981" />
              <path d="M 13 17 L 15 19 L 19 14" fill="none" stroke="#022c22" strokeWidth="1.5" strokeLinecap="round" />
              <text x="30" y="15" fill="#a7f3d0" fontSize="8" fontWeight="700" fontFamily="sans-serif">
                COMPLIANCE OFFICER
              </text>
              <text x="30" y="26" fill="#34d399" fontSize="7" fontFamily="monospace">
                VERIFIED &amp; SIGNED
              </text>
            </g>

            {/* Seal 2: Risk Manager */}
            <g transform="translate(175, 0)">
              <rect x="0" y="0" width="160" height="34" rx="6" fill="#082f49" stroke="#0ea5e9" strokeWidth="1" />
              <circle cx="16" cy="17" r="6" fill="#0ea5e9" />
              <path d="M 13 17 L 15 19 L 19 14" fill="none" stroke="#082f49" strokeWidth="1.5" strokeLinecap="round" />
              <text x="30" y="15" fill="#bae6fd" fontSize="8" fontWeight="700" fontFamily="sans-serif">
                RISK MANAGER
              </text>
              <text x="30" y="26" fill="#38bdf8" fontSize="7" fontFamily="monospace">
                XAI &amp; OVERLAY CLEARED
              </text>
            </g>

            {/* Seal 3: Executive Director */}
            <g transform="translate(350, 0)">
              <rect x="0" y="0" width="160" height="34" rx="6" fill="#422006" stroke="#eab308" strokeWidth="1" />
              <circle cx="16" cy="17" r="6" fill="#eab308" />
              <path d="M 13 17 L 15 19 L 19 14" fill="none" stroke="#422006" strokeWidth="1.5" strokeLinecap="round" />
              <text x="30" y="15" fill="#fef08a" fontSize="8" fontWeight="700" fontFamily="sans-serif">
                EXECUTIVE DIRECTOR
              </text>
              <text x="30" y="26" fill="#facc15" fontSize="7" fontFamily="monospace">
                VAULT RATIFIED
              </text>
            </g>
          </g>
        </g>

        {/* Footer Security Watermark */}
        <g transform="translate(400, 440)">
          <text
            x="0"
            y="0"
            textAnchor="middle"
            fill="#64748b"
            fontSize="8"
            letterSpacing="1"
            fontFamily="monospace"
          >
            GANACHE EVM (1337) • TRUSTAUDIT REGISTRY v1.0 • SOULBOUND ERC-5192 LOCKED TO INSTITUTIONAL VAULT
          </text>
        </g>
      </svg>

      {/* Shimmer overlay for card realism */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
    </div>
  );
};
