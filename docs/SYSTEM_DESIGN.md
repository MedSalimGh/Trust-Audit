# TrustAudit — System Design & Sequence Flows

## 1. End-to-End Workflow Sequence

The TrustAudit lifecycle orchestrates off-chain data creation, cryptographic commitment generation, on-chain state progression, multi-role human approval, Soulbound NFT minting, and asynchronous bank execution.

```mermaid
sequenceDiagram
    autonumber
    actor Operator as Operator (MetaMask)
    participant Front as React DApp
    participant API as FastAPI Backend
    participant DB as Private Database
    participant AI as AI Engine & SHAP
    actor Oracle as AI Oracle Wallet
    participant Chain as TrustAuditRegistry.sol
    participant NFT as TrustAuditCertificate.sol
    actor Approver as Compliance / Risk / Director
    participant Indexer as Web3.py Event Indexer
    participant Bank as Bank Execution Simulator
    actor Auditor as External Auditor

    %% 1. Case Ingestion & Commitment
    Note over Operator, DB: Phase 1: Ingestion & Commitment Generation
    Operator->>Front: Enter transaction details (IBAN, Amount, etc.)
    Front->>API: POST /api/v1/transactions (Payload)
    API->>API: Generate 32-byte CSPRNG Salt
    API->>API: Compute JCS Canonical JSON & SHA-256
    API->>DB: Store Private Record & Salt (Encrypted)
    API-->>Front: Return caseId & saltedInputHash

    %% 2. Case Registration On-Chain
    Note over Operator, Chain: Phase 2: On-Chain Registration
    Front->>Operator: Prompt MetaMask to sign registerCase(caseId, saltedInputHash, valueTier)
    Operator->>Chain: registerCase(...) [msg.sender = Operator]
    Chain->>Chain: Verify OPERATOR_ROLE & Case does not exist
    Chain-->>Indexer: Emit CaseRegistered(caseId, operator, saltedInputHash)
    Indexer->>DB: Update Case Status -> REGISTERED

    %% 3. AI Assessment & Oracle Recording
    Note over AI, Chain: Phase 3: AI Inference & Oracle Anchoring
    Indexer->>API: Trigger AI Assessment Worker
    API->>AI: evaluate_transaction(features)
    AI-->>API: Risk Score (87), HIGH, SHAP Explanations
    API->>API: Compute explanationHash = SHA256(JCS(SHAP_summary))
    API->>DB: Store Full SHAP Report & explanationHash
    API->>Oracle: Sign recordAIAssessment(caseId, 87, HIGH, explanationHash)
    Oracle->>Chain: recordAIAssessment(...) [msg.sender = Oracle]
    Chain->>Chain: Verify AI_ORACLE_ROLE & State == REGISTERED
    Chain-->>Indexer: Emit AIAssessmentRecorded(caseId, 87, HIGH, explanationHash)
    Indexer->>DB: Update Case Status -> PENDING_APPROVAL

    %% 4. Human Approval Workflow
    Note over Approver, Chain: Phase 4: Human Review & Quorum Approval
    Approver->>Front: Connect MetaMask & View Pending Cases
    Front->>API: GET /api/v1/cases/{caseId}
    API-->>Front: Return private details & AI risk radar
    Approver->>Front: Submit Decision ("Approved", justification text)
    Front->>API: POST /api/v1/cases/{caseId}/comment-hash
    API-->>Front: Return commentHash = SHA256(justification)
    Front->>Approver: Prompt MetaMask sign submitApproval(caseId, commentHash)
    Approver->>Chain: submitApproval(...) [msg.sender = Approver]
    Chain->>Chain: Verify Approver Role, Anti-Double-Sign, Not Operator
    Chain-->>Indexer: Emit ApprovalSubmitted(caseId, approver, role, commentHash)
    
    %% Quorum Reached -> Approved
    opt Quorum Satisfied
        Chain->>NFT: mintCertificate(recipient, caseId)
        NFT-->>Chain: Return tokenId
        Chain-->>Indexer: Emit CaseApproved(caseId, tokenId)
        NFT-->>Indexer: Emit Locked(tokenId) (ERC-5192)
    end
    Indexer->>DB: Update Case Status -> APPROVED

    %% 5. Simulated Bank Execution
    Note over Indexer, Bank: Phase 5: Simulated Bank Execution
    Indexer->>Bank: Trigger Execution for caseId (Idempotent UUID)
    Bank->>DB: Record Execution Log (STATUS: EXECUTED)

    %% 6. Auditor Verification
    Note over Auditor, Chain: Phase 6: Independent Verification
    Auditor->>Front: Submit Case ID for Audit
    Front->>API: POST /api/v1/audit/{caseId}/verify
    API->>DB: Fetch stored private JSON & salt
    API->>API: Recompute SHA256("TrustAudit:v1" || JCS(data) || salt)
    API->>Chain: Read on-chain saltedInputHash via getCase(caseId)
    API->>API: Compare recomputed hash == on-chain hash
    API-->>Front: Return INTEGRITY_VERIFIED (or TAMPERED)
```

---

## 2. Failure & Edge Case Handling

| Scenario | System Behavior | Recovery Action |
| :--- | :--- | :--- |
| **MetaMask Rejection / User Cancel** | Transaction is aborted in browser. Local contract state is unchanged. | DApp catches RPC error 4001; displays notification; case remains in current state. |
| **Network Mismatch (Non-Ganache)** | DApp detects `chainId != 1337` (or configured Ganache ID). | DApp disables transaction buttons and prompts `wallet_switchEthereumChain`. |
| **AI Engine Unavailable / Crashes** | Ingestion completes; case remains in `REGISTERED`. | Backend flags `AI_UNAVAILABLE`. Case **never** auto-approves or defaults to LOW risk. Manual fallback queue triggered. |
| **Approval Deadline Expired** | Case in `PENDING_APPROVAL` exceeds `deadline` timestamp. | Any caller or backend cron calls `escalateCase(caseId)`. Contract transitions status to `ESCALATED`. Approvals locked. |
| **Double Approval Attempt** | Same approver attempts to sign twice on a single case. | Contract checks `hasApproved[caseId][msg.sender]` and reverts with custom error `AlreadyApproved()`. |
| **Operator Attempts Approval** | Case creator attempts to call `submitApproval`. | Contract checks `msg.sender != auditCase.operator` and reverts with `OperatorCannotApprove()`. |
| **Duplicate Bank Execution Attempt** | Indexer receives repeated `CaseApproved` event or restarts. | Execution service checks unique database constraint on `case_id` in `execution_records`. Operation is idempotent. |

---

## 3. Bank Execution Simulator Architecture

The execution of financial transfers must never be confused with the smart contract approval:
1. The EVM smart contract is the **authoritative governance gate**, granting cryptographic clearance.
2. The **Bank Execution Simulator** represents the institutional core banking switch (e.g., SWIFT / SEPA / ACH adapter).
3. **Idempotency Guarantee**:
   $$\text{IdempotencyKey} = \text{SHA256}(\text{"EXECUTE:"} \parallel \text{caseId} \parallel \text{chainId})$$
   When the indexer catches `CaseApproved`, it passes this key to `ExecutionService`. If an execution entry with that key already exists, the event is acknowledged without repeating the transfer.
