# TrustAudit — System Architecture

## 1. Architectural Philosophy: The Hybrid Trust Model

TrustAudit implements a **hybrid on-chain / off-chain architecture**. In enterprise and commercial banking, placing full financial records on a decentralized ledger is technically unviable, economically prohibitive, and legally prohibited by data protection regulations (e.g., GDPR, CCPA).

The core tenet of TrustAudit is:
> **The blockchain is the authoritative execution gate for governance, approvals, and integrity proofs; the off-chain system is the custodian of confidential business data and service orchestration.**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       HYBRID TRUST & DATA BOUNDARY                          │
├──────────────────────────────────────┬──────────────────────────────────────┤
│       OFF-CHAIN (PRIVATE DOMAIN)     │      ON-CHAIN (AUTHORITATIVE DOMAIN) │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ • Customer Names, Passports, PII     │ • Pseudonymous Case ID (bytes32)     │
│ • Full IBANs / Account Identifiers   │ • Salted Transaction Hash (bytes32)  │
│ • Cleartext Transaction Amounts      │ • AI Explanation Hash (bytes32)      │
│ • 32-Byte Secret Random Salts        │ • AI Risk Score (uint8, 0-100)       │
│ • Full ML Model & Feature Vectors    │ • Categorical Risk Level (enum)      │
│ • Raw SHAP Feature Impact Reports    │ • Workflow State Machine (enum)      │
│ • Full Text Decision Justifications  │ • Approver Signatures & Roles        │
│ • Bank Execution Logs & State        │ • Decision Comment Hashes (bytes32)  │
│ • Database & Application User Logins │ • Soulbound Token NFT (ERC-5192)     │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

---

## 2. High-Level Component Architecture

```mermaid
flowchart TD
    subgraph CLIENT_TIER ["Client Tier (Browser / React DApp)"]
        UI[React + Vite + TypeScript]
        MM[MetaMask Extension]
        UI <--> MM
    end

    subgraph BACKEND_TIER ["Application Tier (FastAPI Orchestrator)"]
        API[FastAPI Gateway]
        AUTH[Auth Service - SIWE & Session]
        CRYPTO[Crypto Engine - RFC 8785 + SHA-256]
        AI_SVC[AI Service - Risk Scoring & SHAP]
        INDEXER[Blockchain Event Indexer - Web3.py]
        EXEC_SIM[Bank Execution Simulator]
        
        API --> AUTH
        API --> CRYPTO
        API --> AI_SVC
        API --> EXEC_SIM
        INDEXER --> API
    end

    subgraph DATA_TIER ["Data Tier (Off-Chain Private Storage)"]
        DB[(PostgreSQL / SQLite)]
        MODEL_STORE[Trained Model Registry .joblib]
        API <--> DB
        AI_SVC <--> MODEL_STORE
    end

    subgraph BLOCKCHAIN_TIER ["Blockchain Tier (Local Ganache EVM Node)"]
        REGISTRY["TrustAuditRegistry.sol (State & Quorum Authority)"]
        CERTIFICATE["TrustAuditCertificate.sol (Soulbound NFT ERC-5192)"]
        REGISTRY -->|mintCertificate| CERTIFICATE
    end

    %% Client Interactions
    UI -->|REST / JSON| API
    MM -->|Direct EIP-1193 JSON-RPC / Transactions| REGISTRY
    
    %% Backend to Blockchain
    INDEXER -.->|WebSocket / HTTP Event Polling| REGISTRY
    INDEXER -.->|Read Events| CERTIFICATE
    API -.->|Oracle Transactions (AI_ORACLE_ROLE)| REGISTRY
```

---

## 3. Layer Breakdown & Responsibilities

### 3.1 Presentation Layer (React DApp + MetaMask Connect)
- **Framework:** React 18+ with TypeScript, bundled with Vite.
- **Styling & Components:** Tailwind CSS, Radix UI primitives, Lucide icons.
- **Web3 Wallet Integration:** wagmi / viem and MetaMask Connect.
- **Security Boundary:** The frontend provides user experience and wallet connectivity, but is strictly **untrusted**. Hiding a button based on a client-side state does not grant authorization. The smart contract validates every function invocation against sender address (`msg.sender`) and role mappings.

### 3.2 Orchestration Layer (Python + FastAPI)
- **Framework:** FastAPI with Python 3.12 (asynchronous REST handlers).
- **Validation:** Pydantic v2 data models for input sanitization and response contracts.
- **Cryptographic Services:** Implementation of RFC 8785 JSON Canonicalization Scheme (JCS), generation of 32-byte cryptographically secure random salts via `secrets.token_bytes(32)`, and SHA-256 hashing.
- **Blockchain Connectivity:** Web3.py connected to Ganache RPC (`http://127.0.0.1:8545`).
- **Private Data Custody:** Exposes private banking records only to authenticated and authorized sessions; never returns raw salts in unprivileged API responses.

### 3.3 Artificial Intelligence Layer (Scikit-Learn + SHAP)
- **Execution:** Local Python runtime inference, isolated from the public network.
- **Pipeline:** Preprocessing transformer + calibrated classifier producing risk probabilities `[0.0, 1.0]`.
- **Explainability:** `shap.TreeExplainer` computing local feature attributions at inference time.
- **Output:**
  1. `risk_score`: 0–100 integer.
  2. `risk_level`: `LOW` (0–29), `MEDIUM` (30–69), `HIGH` (70–100).
  3. `explanation_hash`: `SHA256(canonical(top_features))` anchored on-chain.
- **Governance Constraint:** Strictly advisory. The AI engine possesses zero execution keys for case approval.

### 3.4 Consensus & Execution Gate Layer (Solidity Smart Contracts)
- **Execution Network:** Ganache EVM node (Chain ID 1337 or 5777).
- **Core Contracts:**
  - `TrustAuditRegistry.sol`: Owns state transitions, role verification, multi-signature quorum, timeout escalations, and event emissions.
  - `TrustAuditCertificate.sol`: Non-transferable ERC-721 Soulbound Token minted upon case approval.
- **Authoritative Status:** The database reflects what the blockchain confirms. In the event of discrepancy, on-chain state takes precedence.

---

## 4. Signing & Credential Policy

To ensure strict non-repudiation and separation of privileges:

1. **Human Operators & Approvers (MetaMask Direct Signing)**:
   - Case Registration (`registerCase`): Signed directly by the Operator's MetaMask wallet.
   - Case Approvals (`submitApproval`): Signed directly by the Compliance, Risk Manager, or Director MetaMask wallet.
   - Case Rejections (`rejectCase`): Signed directly by the authorized reviewer's MetaMask wallet.
   - *Rule:* The FastAPI backend **never** stores private keys of human users, nor does it assemble or execute meta-transactions on behalf of humans.

2. **AI Oracle Automated Worker (Dedicated Oracle Wallet)**:
   - AI Assessment Submission (`recordAIAssessment`): Signed by a dedicated, restricted server wallet possessing only the `AI_ORACLE_ROLE`.
   - *Rule:* The Oracle wallet cannot call `submitApproval`, `rejectCase`, or `registerCase`. Its privileges are strictly confined to recording risk scores and explanation hashes for existing, non-assessed cases.

3. **Escalation Keeper (Permissionless or Automated Worker)**:
   - Escalation Trigger (`escalateCase`): Can be executed by any account or a cron-based backend worker after the deadline has elapsed. The contract verifies time conditions internally (`block.timestamp > deadline`), precluding arbitrary escalation.
