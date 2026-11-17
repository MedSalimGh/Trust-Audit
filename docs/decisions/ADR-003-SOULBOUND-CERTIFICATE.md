# ADR-003: Non-Transferable Soulbound Token (ERC-5192) for Audit Certificates

## Status
Accepted

## Context
When a high-value or high-risk banking transaction completes its multi-signature audit workflow and receives final approval, an authoritative compliance attestation must be issued. Traditional ERC-721 NFTs are transferable, which would permit financial compliance certificates to be sold, traded, or transferred to unverified accounts, invalidating their legal and regulatory utility.

## Decision
We implement `TrustAuditCertificate.sol` as a **Soulbound Token** compliant with **ERC-721 and ERC-5192 (Minimal Soulbound Tokens)**:
1. **Restricted Minting**: Only the `TrustAuditRegistry` contract can invoke `mintCertificate()`. External or direct calls by users or admins revert.
2. **Permanent Locking**: The token is immediately marked `locked(tokenId) == true` upon minting.
3. **Inalienability**: Invocations of `transferFrom`, `safeTransferFrom`, `approve`, and `setApprovalForAll` unconditionally revert with a custom error `ErrSoulboundTokenNonTransferable`.
4. **Safe Metadata**: Token metadata (`tokenURI`) contains exclusively pseudonymous case references, timestamps, and compliance traits; zero customer PII or account details are embedded.
5. **Institutional Recipient**: Certificates are minted to a designated institutional compliance vault address rather than personal operator addresses.

## Consequences
- **Positive**: Cryptographically enforces non-transferability, provides an immutable badge of compliance inspectable on block explorers (Blockscout, Etherscan), and prevents certificate spoofing.
- **Negative**: Overriding standard ERC-721 transfer functions requires rigorous unit testing to ensure compatibility with standard wallet viewers.
