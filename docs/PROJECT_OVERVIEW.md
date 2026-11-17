# TrustAudit — Project Overview

## 1. Executive Summary

**TrustAudit** is an AI-assisted, blockchain-backed banking transaction audit and multi-signature approval platform. It addresses the critical governance, regulatory, and security challenges in financial services when deploying Artificial Intelligence for fraud detection and high-value transaction approval.

Unlike traditional banking dashboards that simply write arbitrary hashes to a database or use a blockchain as a passive timestamping log, TrustAudit establishes an **EVM-enforced Execution Gate**:
- **Smart contracts** are authoritative for workflow transitions, role-based access control, multi-signature approval quorum, escalation deadlines, and audit certificate minting.
- **Artificial Intelligence (Machine Learning + SHAP)** acts exclusively in an **advisory capacity**, delivering quantifiable risk scores and transparent explanations without unilateral approval or rejection authority.
- **Cryptographic Evidence Engine** utilizes RFC 8785 Canonical JSON (JCS), 32-byte cryptographically secure pseudorandom salts, and SHA-256 commitments to prove data integrity without ever exposing Personally Identifiable Information (PII) or banking secrets on-chain.
- **MetaMask Web3 Wallets** enforce direct human authorization, upholding separation of duties and legal non-repudiation.
- **Soulbound Tokens (ERC-721 / ERC-5192)** materialize non-transferable, tamper-proof compliance attestations upon completion of the audit lifecycle.
- **Off-chain Bank Execution Simulator** executes transfers conditionally only after verifying on-chain `APPROVED` status with strict idempotency.

---

## 2. Regulatory and Industry Problem Statement

### 2.1 The Log Falsification Vulnerability (Internal Fraud & Legal Exposure)
In standard banking and fintech infrastructure, transaction validation records, analyst comments, and audit trails reside in relational databases (PostgreSQL, Oracle, SQL Server). Database administrators (DBAs) and privileged system operators possess technical capabilities to modify timestamps, alter approval notes, or purge records retroactively. During forensic investigations by regulatory bodies (e.g., ACPR, ECB, BCT, SEC), financial institutions face substantial evidentiary challenges proving that internal logs have not been manipulated post-facto.

### 2.2 EU AI Act (Article 14) Compliance: Mandatory Human Oversight
Article 14 of the European Union AI Act strictly classifies AI systems used for credit scoring and financial transaction risk assessment as **High-Risk AI Systems**. The regulation mandates effective human oversight (*Human-in-the-loop*):
- AI cannot possess autonomous decision-making power to block or approve customer funds.
- Human operators must have the explicit right and technical ability to contest or override AI assessments (*Human Disagreement / Override Rate*).
- Explanations of AI risk factors must be captured immutably at inference time to prevent covert model swaps.

### 2.3 GDPR (Article 17) & Banking Secrecy: Zero PII On-Chain
Blockchains are immutable by design. Storing customer identities, IBANs, or transaction balances on a public or consortium ledger violates GDPR Article 17 ("Right to Erasure" / "Right to be Forgotten") and banking secrecy statutes. TrustAudit solves this tension through a **hybrid privacy-preserving commitment model**: private data remains strictly off-chain, while salted SHA-256 commitments anchor mathematical proofs to the blockchain.

---

## 3. Product Modules Overview

TrustAudit is composed of eight cohesive modules:

| Module | Name | Primary Responsibility |
| :---: | :--- | :--- |
| **01** | **Identity & Wallet Management** | MetaMask Web3 connection, EIP-4361 Sign-In with Ethereum (SIWE), session management, smart contract role mapping (`AccessControl`). |
| **02** | **Transaction Management** | Ingestion of sensitive banking transfers, schema validation (Pydantic), off-chain encrypted persistence, case initialization. |
| **03** | **AI Risk Assessment** | Scikit-learn/XGBoost inference, 0–100 risk scoring, categorical risk levels (LOW, MEDIUM, HIGH), local SHAP feature explanations. Advisory only. |
| **04** | **Cryptographic Evidence** | RFC 8785 JSON Canonicalization, 32-byte CSPRNG salt generation, SHA-256 commitment formulation, bit-level integrity verification. |
| **05** | **Blockchain Approval Engine** | Smart contract (`TrustAuditRegistry.sol`) managing case states, role authorization, multi-sig quorum policies, deadline escalation, and audit events. |
| **06** | **NFT Audit Certificate** | Soulbound Token (`TrustAuditCertificate.sol` implementing ERC-721 + ERC-5192) permanently bound to approved case references; transfers disabled. |
| **07** | **Audit & Verification ("Tamper Lab")** | Independent auditor portal, on-chain commitment fetching, local hash recomputation, instant visual tampering detection and differential diagnostics. |
| **08** | **Bank Execution Simulator** | Event-driven transfer execution simulator triggered exclusively by verified `CaseApproved` on-chain events with idempotent UUID tracking. |

---

## 4. Key Performance Indicators (KPIs)

1. **Human Override Rate (Disagreement Rate)**: Ratio of cases where human approvers contradicted the AI recommendation. Tracked for AI model drift and human complacency monitoring.
2. **Mean Time to Approval (SLA)**: Elapsed time between case registration (`REGISTERED`) and final quorum satisfaction (`APPROVED`).
3. **Escalation Frequency**: Percentage of cases that exceeded time-to-approve SLAs and triggered the public `escalateCase()` mechanism.
4. **Integrity Audit Precision**: 100% mathematical detection of single-bit off-chain data modifications during auditor verification.
5. **Zero-PII Compliance**: Complete absence of plaintext customer names, accounts, amounts, salts, and unhashed justification notes on-chain.

---

## 5. Team Division of Work (2 Developers)

To maintain architectural cohesion, development is partitioned by technical domain rather than arbitrary UI page slicing:

```
┌────────────────────────────────────────────────────────┐
│             DEVELOPER 1: BLOCKCHAIN LEAD               │
├────────────────────────────────────────────────────────┤
│ • Solidity Smart Contracts (^0.8.24, OpenZeppelin v5)   │
│ • TrustAuditRegistry & TrustAuditCertificate (ERC-5192)│
│ • Role-Based Access Control & Multi-Signature Quorum   │
│ • Hardhat 3 & Foundry Testing Suite (Fuzz/Invariants)  │
│ • Ganache Local Demonstration Node Management          │
│ • Contract Event Architecture & ABI Synchronization    │
└────────────────────────────────────────────────────────┘
                           ▲
                           │ Shared Integration Contract
                           ▼
┌────────────────────────────────────────────────────────┐
│         DEVELOPER 2: AI / FULL-STACK LEAD              │
├────────────────────────────────────────────────────────┤
│ • Python FastAPI Microservices & Database Persistence  │
│ • ML Risk Pipeline (Scikit-Learn/XGBoost + SHAP)       │
│ • RFC 8785 Canonical JSON & Salted SHA-256 Engine      │
│ • React (Vite) + TypeScript + Tailwind CSS UI / DApp   │
│ • MetaMask Connect, wagmi, viem Web3 Integration       │
│ • Web3.py Blockchain Event Indexer & Bank Simulator    │
└────────────────────────────────────────────────────────┘
```
