# ADR-001: Hybrid On-Chain / Off-Chain Architecture

## Status
Accepted

## Context
Commercial banking applications handle sensitive financial data governed by strict privacy laws (GDPR, EU AI Act, Banking Secrecy). Storing client PII or transaction balances directly on a public or consortium blockchain is illegal and technically prohibitive. Conversely, storing audit logs exclusively in centralized databases leaves institutions vulnerable to retroactive log tampering by privileged operators or database administrators.

## Decision
We adopt a **hybrid on-chain / off-chain architecture**:
- **Off-chain (Private Domain)**: Customer names, IBANs, raw amounts, 32-byte secret random salts, full ML feature matrices, and full SHAP explanation reports remain in the private FastAPI backend and database.
- **On-chain (Authoritative Governance Domain)**: Solidity smart contracts (`TrustAuditRegistry.sol`) store pseudonymous `caseId`s, salted cryptographic commitments (`saltedInputHash`, `explanationHash`, `commentHash`), role-based access control, workflow state transitions, and multi-signature approvals.
- **Consensus Primacy**: The smart contract is the sole authoritative gate for whether a case is valid, approved, rejected, or escalated. The off-chain system acts as an executor only after on-chain approval is confirmed.

## Consequences
- **Positive**: Strict regulatory compliance (zero PII on-chain), complete immunity to off-chain log tampering, and clear separation of concerns.
- **Negative**: Requires synchronization between off-chain database and blockchain via an asynchronous event indexer; integrity verification requires access to both off-chain records and on-chain commitments.
