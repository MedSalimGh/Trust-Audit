# ADR-004: RFC 8785 Canonical JSON, Salted SHA-256 Commitments & Tamper Evidence

## Status
Accepted

## Context
To detect whether private transaction records (e.g., amount, sender IBAN, recipient IBAN) have been modified in the bank's database after case registration, a cryptographic commitment must be stored on-chain. Standard JSON serialization formats vary across programming languages in key sorting, whitespace, and floating-point representations, leading to false-positive hash mismatches. Furthermore, financial transaction fields often have low entropy, making un-salted hashes vulnerable to pre-image dictionary and rainbow table attacks.

## Decision
1. **Canonicalization Standard**: We mandate **RFC 8785 (JSON Canonicalization Scheme - JCS)** for serializing private data before hashing. Keys are sorted lexicographically, and whitespace is normalized.
2. **Secret Salt Generation**: The backend generates a 32-byte cryptographically secure pseudorandom salt (`secrets.token_bytes(32)`) for each transaction, stored strictly off-chain in encrypted storage.
3. **Commitment Formula**:
   $$\text{saltedInputHash} = \text{SHA256}\Big(\text{"TrustAudit:v1"} \parallel \text{JCS}(\text{TransactionData}) \parallel \text{salt}\Big)$$
4. **Verification Protocol**: During auditor inspection, the system reconstructs the JCS string from private storage, recalculates the SHA-256 commitment using the stored salt, and compares it with the on-chain value from `TrustAuditRegistry.sol`. A mismatch indicates tampering.

## Consequences
- **Positive**: Complete defense against dictionary attacks, 100% deterministic cross-platform hash reproducibility, and instant bit-level tamper detection.
- **Negative**: If a salt is lost or corrupted off-chain, mathematical verification becomes impossible. Strict database backup and encryption-at-rest policies must be maintained.
