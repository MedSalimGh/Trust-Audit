# ADR-002: Unified Multi-Signature Quorum Policy & AI Risk Overlay

## Status
Accepted

## Context
Earlier requirements documents exhibited a contradiction: one section specified 2 signatures for high-value transactions (> 50,000 DT), while another section and demonstration scenario required 3 signatures (Compliance + Risk Manager + Director). Furthermore, requirements around AI advisory risk and human-in-the-loop oversight needed formal encoding.

## Decision
We freeze the following quorum policy uniformly across contracts, backend, tests, and user interfaces:
1. **Tier 1 (< 5,000 DT)**: 1 signature (`COMPLIANCE_ROLE`).
2. **Tier 2 (5,000 to 50,000 DT inclusive)**: 1 signature (`COMPLIANCE_ROLE`).
3. **Tier 3 (> 50,000 DT)**: 3 signatures (`COMPLIANCE_ROLE` + `RISK_MANAGER_ROLE` + `DIRECTOR_ROLE`).
4. **AI High-Risk Overlay**: If the AI Risk Engine flags a case as `HIGH` risk (`risk_score >= 70`), an additional approval from `RISK_MANAGER_ROLE` is required even if the amount belongs to Tier 1 or Tier 2.
5. **Human Primacy**: AI can never approve, reject, or reduce quorum below 1 human. Human approvers can override AI recommendations, but must supply an on-chain justification commitment (`commentHash`).
6. **Trusted Assertion**: The transaction amount tier is passed as a trusted assertion during case registration, preserving amount privacy on-chain.

## Consequences
- **Positive**: Resolves all ambiguities, aligns demonstration scenario A (60,000 DT transaction with 3 signatures), and fulfills EU AI Act Article 14 human oversight mandates.
- **Negative**: Adds multi-role orchestration complexity on the frontend and requires testing varied quorum branches.
