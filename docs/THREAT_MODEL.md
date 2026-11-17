# TrustAudit — Threat Model & Security Analysis

## 1. Scope & Methodology

This threat model follows the **STRIDE** methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) tailored to a hybrid Web3 banking architecture.

---

## 2. Protected Assets & Trust Assumptions

### 2.1 Critical Assets
1. **Confidential Customer Financial Data**: Account numbers, balances, IBANs, recipient data, and transaction amounts (strictly off-chain).
2. **Cryptographic Salts**: 32-byte secret random numbers required to prevent pre-image dictionary attacks against low-entropy financial values.
3. **Approval State & Governance Integrity**: Legitimate multi-signature quorum for transaction clearance.
4. **AI Assessment Provenance**: Model version, risk score, and SHAP explanation commitments.
5. **Soulbound Audit Certificates**: Non-transferable ERC-5192 tokens certifying valid compliance completion.

### 2.2 Trust Assumptions
- **The EVM Execution Environment (Ganache / Hardhat)** is secure and executes Solidity bytecode deterministically according to the rules of consensus.
- **The Private Database Server** is considered vulnerable to insider access (e.g., rogue DBA or compromised sysadmin). The architecture must detect any tampering post-facto.
- **Client Frontend** is untrusted; all security rules must be enforced on-chain or cryptographically in the backend.

---

## 3. Threat Matrix & Mitigations (STRIDE)

| Threat Category | Threat Description | Attack Vector | Architectural Mitigation |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Attacker impersonates a Compliance Officer or Risk Manager to approve a case. | Forged HTTP requests or intercepted session tokens. | **MetaMask Wallet Signature Required**: Every approval must originate as a signed EVM transaction from an address possessing the required role in `TrustAuditRegistry`. Backend session alone cannot authorize. |
| **Tampering** | Rogue DBA modifies transaction amount from 60,000 DT to 6,000 DT in the database to conceal illicit capital flight. | Direct SQL update in private database. | **Salted SHA-256 Commitments**: The on-chain `saltedInputHash` was committed at registration. During audit, recomputation over modified data yields a hash mismatch: `TAMPERING_DETECTED`. |
| **Repudiation** | Compliance Officer claims they never approved a fraudulent transaction. | Officer denies responsibility during internal inquiry. | **On-Chain Signature Logging**: Approvals record `msg.sender`, `block.timestamp`, and `commentHash` in an immutable smart contract event and state array. Cryptographically non-repudiable. |
| **Information Disclosure** | Customer transaction details leaked on a public blockchain explorer. | Naive developer stores cleartext JSON or IBANs in contract storage or events. | **Zero-PII On-Chain Guarantee**: The smart contract stores only 32-byte hashes (`caseId`, `saltedInputHash`, `explanationHash`, `commentHash`). Data is salted to defeat dictionary attacks. |
| **Denial of Service** | Case hangs indefinitely because an assigned Compliance Officer refuses or fails to review it. | Inaction or sabotage by an employee holding an approval role. | **Time-Bound Escalation Machine**: Each case features a strict deadline. Once expired, anyone can trigger `escalateCase(caseId)`, locking regular approvals and escalating to higher governance. |
| **Elevation of Privilege** | Operator grants themselves `COMPLIANCE_ROLE` or approves their own transaction. | Operator calls `submitApproval` on a case they created. | **Separation of Duties Invariant**: `TrustAuditRegistry` checks `require(msg.sender != auditCase.operator, "Operator cannot approve own case")` and verifies `hasRole(REQUIRED_ROLE, msg.sender)`. |

---

## 4. Specific Attack Scenarios & Mitigations

### 4.1 Dictionary & Rainbow Table Attacks on Commitments
- **Vulnerability**: Transaction amounts and currency codes have low entropy (e.g., common amounts like 1,000 DT or 50,000 DT). A public SHA-256 hash of `{"amount": 1000}` can easily be brute-forced using rainbow tables.
- **Mitigation**: Inclusion of a **32-byte cryptographically secure random salt** ($2^{256}$ search space) generated via system CSPRNG (`secrets.token_bytes(32)`). The salt is kept confidential off-chain.

### 4.2 AI Oracle Credential Compromise
- **Vulnerability**: If the server-side AI Oracle private key is stolen, can an attacker approve fraudulent transactions?
- **Mitigation**: **Least Privilege Role Segregation**. The `AI_ORACLE_ROLE` only permits calling `recordAIAssessment(caseId, score, riskLevel, explanationHash)`. It has **no authority** to call `submitApproval`, `rejectCase`, or mint certificates. Even a compromised oracle can only adjust a risk score; human approvers are still mandated to reach quorum.

### 4.3 Front-Running & Replay Attacks
- **Vulnerability**: Attacker intercepts an approver's transaction payload and attempts to replay it on another case or network.
- **Mitigation**: Each case has a globally unique `caseId` (UUIDv4 hashed into `bytes32`). Approvals explicitly bind `caseId` and check `hasApproved[caseId][msg.sender]`. EVM transaction replay across chains is prevented by EIP-155 Chain ID validation.

### 4.4 Soulbound Token Transfer / Sale
- **Vulnerability**: An operator or approver attempts to transfer an audit certificate to another wallet or secondary market to falsely certify an unapproved account.
- **Mitigation**: `TrustAuditCertificate.sol` implements **ERC-5192 Minimal Soulbound Tokens**. It overrides `transferFrom`, `safeTransferFrom`, and `approve`, unconditionally reverting on any transfer attempt once locked.
