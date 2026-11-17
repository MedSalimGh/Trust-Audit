# TrustAudit — Security Invariants & Formal Properties

## 1. Core Security Invariants

These invariants define non-negotiable security boundaries that must hold true across all states, execution sequences, and edge conditions.

---

### Invariant 1: Strict Separation of Duties (Anti-Self-Approval)
$$\forall c \in \text{Cases}, \quad \text{msg.sender} == c.\text{operator} \implies \text{submitApproval}(c.\text{caseId}, \dots) \text{ REVERTS}$$
- **Formal Expression**: The account that initiates and registers a case is permanently prohibited from approving, rejecting, or participating in the quorum for that case.
- **Enforcement**: Smart contract check `if (msg.sender == c.operator) revert OperatorCannotApprove();`.

---

### Invariant 2: Quorum Non-Duplication (Anti-Double-Voting)
$$\forall c \in \text{Cases}, \forall a \in \text{Approvers}, \quad \text{hasApproved}[c.\text{caseId}][a] \le 1$$
- **Formal Expression**: An individual wallet address can submit at most one approval for a given case, regardless of how many roles that address holds.
- **Enforcement**: Smart contract mapping `mapping(bytes32 => mapping(address => bool)) private _hasApproved;` checked prior to incrementing approval counters.

---

### Invariant 3: Approval Quorum Completeness & Role Enforcement
$$c.\text{status} == \text{APPROVED} \iff \sum \text{Approvals}(c) \ge c.\text{requiredApprovals} \quad \land \quad \text{RolesSatisfied}(c)$$
- **Formal Expression**: A case can never enter `APPROVED` without collecting the full complement of required signatures and verifying that mandatory specialized roles (e.g., Risk Manager for HIGH risk) have signed.

---

### Invariant 4: State Terminality & Monotonicity
$$\text{State}(c) \in \{\text{APPROVED}, \text{REJECTED}, \text{ESCALATED}\} \implies \forall t > t_{\text{terminal}}, \quad \Delta \text{State}(c) = \emptyset$$
- **Formal Expression**: Terminal states are irreversible. An approved case cannot be subsequently rejected; a rejected case cannot be revived; an escalated case cannot be approved through normal workflows.

---

### Invariant 5: Registry-Exclusive NFT Minting
$$\forall \text{caller} \neq \text{TrustAuditRegistry}, \quad \text{TrustAuditCertificate.mintCertificate}(\dots) \text{ REVERTS}$$
- **Formal Expression**: The audit certificate contract will reject any minting request unless called directly by the verified `TrustAuditRegistry` contract address.

---

### Invariant 6: Soulbound Inalienability (ERC-5192)
$$\forall \text{tokenId}, \quad \text{locked}(\text{tokenId}) == \text{true} \quad \land \quad \text{transferFrom}(\dots) \text{ REVERTS}$$
- **Formal Expression**: Audit certificates are non-transferable soulbound tokens. Any invocation of `transferFrom`, `safeTransferFrom`, or approval delegation must revert.

---

### Invariant 7: Unique Certificate Binding
$$\forall c \in \text{Cases}, \quad \text{CertificateCount}(c) \le 1$$
- **Formal Expression**: Exactly zero certificates exist for pending, rejected, or escalated cases. Exactly one certificate is minted when a case transitions to `APPROVED`.

---

### Invariant 8: AI Non-Autonomous Authority
$$\forall \text{call} \in \{\text{submitApproval}, \text{rejectCase}, \text{mintCertificate}\}, \quad \text{caller} == \text{AI\_ORACLE} \implies \text{REVERTS}$$
- **Formal Expression**: The AI Oracle wallet address has no administrative or approval privileges. It can exclusively invoke `recordAIAssessment`.

---

### Invariant 9: Zero PII on Ledger
$$\forall \text{slot} \in \text{ContractStorage}, \forall e \in \text{Events}, \quad \text{PII}(\text{slot}) = \emptyset \quad \land \quad \text{PII}(e) = \emptyset$$
- **Formal Expression**: No plaintext customer identifiers, account numbers, amounts, secret salts, or unhashed justifications are ever stored or emitted on-chain.

---

### Invariant 10: Cryptographic Tamper-Evidence
$$\text{Data modified off-chain} \implies \text{SHA256}(\text{"TrustAudit:v1"} \parallel \text{JCS}(\text{ModifiedData}) \parallel \text{salt}) \neq \text{onChainCommitment}$$
- **Formal Expression**: Any alteration of off-chain private fields produces an immediate, detectable hash divergence during verification.

---

## 2. Invariant Verification Strategy (Foundry / Slither)

To formally prove these properties:
1. **Slither Static Analysis**: Detect reentrancy, uninitialized state, and access-control bypasses.
2. **Foundry Stateful Invariant Tests**:
   - `invariant_operatorNeverApproves()`
   - `invariant_noDoubleVoting()`
   - `invariant_noTransferOfCertificate()`
   - `invariant_onlyRegistryMints()`
   - `invariant_terminalStatesNeverChange()`
