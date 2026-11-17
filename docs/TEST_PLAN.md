# TrustAudit — Master Verification & Test Plan

## 1. Testing Strategy Overview

TrustAudit adopts a multi-layered verification strategy across Solidity smart contracts, Python backend microservices, Machine Learning inference pipelines, and the React DApp.

```
       / \
      / E2E \       Playwright / MetaMask Scenario Demonstrations (3 Core Scenarios)
     /-------\
    / Integr. \     FastAPI <-> Ganache Event Indexing & Web3.py Replay Tests
   /-----------\
  /  Property   \   Foundry Fuzzing & Slither Static Analysis Invariant Tests
 /---------------\
/   Unit Tests    \ Hardhat 3 Contract Tests & Pytest Cryptography/ML Tests
-------------------
```

---

## 2. Smart Contract Test Suites (Hardhat 3 + TypeScript & Foundry)

### 2.1 Role-Based Access Control (`Authorization.test.ts`)
- [ ] `test_operatorCanRegisterCase`: Account with `OPERATOR_ROLE` successfully registers a case.
- [ ] `test_unauthorizedCannotRegisterCase`: Random wallet reverts with `AccessControlUnauthorizedAccount`.
- [ ] `test_onlyOracleCanRecordAIAssessment`: Compliance Officer or Operator calling `recordAIAssessment` reverts.
- [ ] `test_auditorCannotApproveOrReject`: Wallet with `AUDITOR_ROLE` calling `submitApproval` reverts.
- [ ] `test_unauthorizedCannotMintNFT`: Direct call to `TrustAuditCertificate.mintCertificate` reverts with `OnlyRegistryCanMint`.

### 2.2 Workflow & State Transitions (`Workflow.test.ts`)
- [ ] `test_cannotApproveBeforeAIAssessment`: Calling `submitApproval` on a `REGISTERED` case reverts.
- [ ] `test_cannotApproveWithoutQuorum`: Partial approval preserves `PENDING_APPROVAL` status.
- [ ] `test_approvedCaseCannotBeRejected`: Calling `rejectCase` on an `APPROVED` case reverts with `InvalidCaseStatus`.
- [ ] `test_rejectedCaseCannotBeApproved`: Calling `submitApproval` on a `REJECTED` case reverts.
- [ ] `test_cannotEscalateBeforeDeadline`: Calling `escalateCase` when `block.timestamp < deadline` reverts.
- [ ] `test_canEscalateAfterDeadline`: Calling `escalateCase` when `block.timestamp > deadline` succeeds and sets `ESCALATED`.

### 2.3 Quorum & Governance Rules (`Quorum.test.ts`)
- [ ] `test_operatorCannotApproveOwnCase`: Creator trying to approve their own case reverts with `OperatorCannotApprove`.
- [ ] `test_noDoubleVoting`: Same approver wallet submitting a second approval on a case reverts with `AlreadyApproved`.
- [ ] `test_tier1_requiresOneApproval`: Tier 1 (< 5,000 DT) approved after 1 Compliance approval.
- [ ] `test_tier3_requiresThreeApprovals`: Tier 3 (> 50,000 DT) requires Compliance + Risk Manager + Director.
- [ ] `test_highRiskOverlay`: Tier 1 transaction marked `HIGH` risk requires Risk Manager review in addition to Compliance.

### 2.4 Soulbound NFT Mechanics (`TrustAuditCertificate.test.ts`)
- [ ] `test_nftMintedUponApproval`: Approving case mints exactly 1 certificate.
- [ ] `test_nftIsLocked`: `locked(tokenId)` returns `true` (ERC-5192).
- [ ] `test_nftTransferReverts`: `transferFrom`, `safeTransferFrom`, `approve` revert with `ErrSoulboundTokenNonTransferable`.

---

## 3. Backend, Cryptography & ML Tests (Pytest)

### 3.1 Cryptographic Commitment Tests (`test_cryptography.py`)
- [ ] `test_canonical_json_determinism`: Key ordering differences yield identical UTF-8 canonical strings.
- [ ] `test_salt_entropy`: Generated salts have 32 bytes and non-repeating entropy.
- [ ] `test_salted_hash_tamper_detection`: Modifying `amount` by 1 unit changes `saltedInputHash`.
- [ ] `test_missing_salt_fails_safely`: Verification without salt returns `CORRUPT_EVIDENCE`.

### 3.2 AI & Explainability Tests (`test_ai_engine.py`)
- [ ] `test_fdm_pipeline_assembly`: Categorical encoding and numeric remainder assemble into exactly 23 features.
- [ ] `test_risk_score_range`: Output score is strictly an integer between 0 and 100.
- [ ] `test_shap_feature_importance`: SHAP values compute for positive and negative impact factors.
- [ ] `test_ai_unavailable_safety`: Unhandled input does not default to LOW risk; raises `AI_ASSESSMENT_UNAVAILABLE`.

---

## 4. End-to-End Demonstration Scenarios

### Scenario A: High-Value 60,000 DT Audit Lifecycle
1. Operator registers 60,000 DT transfer via MetaMask.
2. AI assesses risk score (87/100, HIGH); Oracle anchors assessment on-chain.
3. Compliance Officer approves via MetaMask.
4. Risk Manager approves via MetaMask.
5. Director approves via MetaMask.
6. Contract status transitions to `APPROVED`.
7. Soulbound NFT certificate #1 is minted to the institutional recipient.
8. Event indexer triggers Bank Execution Simulator (idempotent status: `EXECUTED`).
9. Auditor verifies integrity: **INTEGRITY VERIFIED (100% MATCH)**.

### Scenario B: Database Tampering Detection ("Tamper Lab")
1. Retrieve verified 60,000 DT transaction from database.
2. Simulate malicious DBA update: alter amount in database from `60,000` to `6,000`.
3. Auditor executes verification from DApp.
4. Backend recomputes SHA-256 hash using altered data + original salt.
5. Hash comparison fails:
   - On-Chain Commitment: `0x98f24b22...`
   - Recalculated Hash: `0x3310a019...`
6. UI displays **TAMPERING DETECTED** banner, highlighting the modified `amount` field.

### Scenario C: Unauthorized Operator Approval Block
1. Operator connects MetaMask wallet.
2. Operator attempts to invoke `submitApproval` on their own case.
3. EVM transaction reverts on-chain: `OperatorCannotApprove()`.
4. DApp captures revert and displays authorization failure.
