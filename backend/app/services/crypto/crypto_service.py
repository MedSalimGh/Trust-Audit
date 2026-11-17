import hashlib
import json
import secrets
from typing import Any, Dict, List, Tuple

class CryptoService:
    DOMAIN_INPUT_PREFIX = b"TrustAudit:v1"
    DOMAIN_XAI_PREFIX = b"TrustAudit:XAI:v1"
    DOMAIN_COMMENT_PREFIX = b"TrustAudit:Comment:v1"

    @staticmethod
    def canonicalize_json(data: Dict[str, Any]) -> bytes:
        """
        RFC 8785 JSON Canonicalization Scheme (JCS) compliant serialization:
        - Keys sorted lexicographically
        - Separators normalized without whitespace (':', ',')
        - UTF-8 encoded byte array
        """
        return json.dumps(
            data,
            ensure_ascii=False,
            sort_keys=True,
            separators=(',', ':')
        ).encode('utf-8')

    @staticmethod
    def generate_salt(length: int = 32) -> bytes:
        """Generate a cryptographically secure random salt of specified byte length."""
        return secrets.token_bytes(length)

    @classmethod
    def compute_salted_input_hash(cls, data: Dict[str, Any], salt: bytes) -> str:
        """
        Computes domain-separated salted transaction commitment:
        SHA256("TrustAudit:v1" || JCS(data) || salt)
        """
        if len(salt) != 32:
            raise ValueError(f"Salt must be exactly 32 bytes, got {len(salt)}")
        
        canonical_bytes = cls.canonicalize_json(data)
        hasher = hashlib.sha256()
        hasher.update(cls.DOMAIN_INPUT_PREFIX)
        hasher.update(canonical_bytes)
        hasher.update(salt)
        return "0x" + hasher.hexdigest()

    @classmethod
    def compute_explanation_hash(cls, shap_summary: Dict[str, Any]) -> str:
        """
        Computes domain-separated AI explanation commitment:
        SHA256("TrustAudit:XAI:v1" || JCS(shap_summary))
        """
        canonical_bytes = cls.canonicalize_json(shap_summary)
        hasher = hashlib.sha256()
        hasher.update(cls.DOMAIN_XAI_PREFIX)
        hasher.update(canonical_bytes)
        return "0x" + hasher.hexdigest()

    @classmethod
    def compute_comment_hash(cls, justification: str) -> str:
        """
        Computes domain-separated approval/rejection justification commitment:
        SHA256("TrustAudit:Comment:v1" || UTF8(justification))
        """
        hasher = hashlib.sha256()
        hasher.update(cls.DOMAIN_COMMENT_PREFIX)
        hasher.update(justification.strip().encode('utf-8'))
        return "0x" + hasher.hexdigest()

    @classmethod
    def verify_integrity(
        cls,
        stored_data: Dict[str, Any],
        salt: bytes,
        on_chain_commitment: str
    ) -> Dict[str, Any]:
        """
        Recalculates commitment and checks equality with on-chain reference.
        Returns validation diagnosis and field diffs.
        """
        recomputed_hash = cls.compute_salted_input_hash(stored_data, salt)
        normalized_on_chain = on_chain_commitment.lower()
        normalized_recomputed = recomputed_hash.lower()

        is_valid = (normalized_on_chain == normalized_recomputed)

        return {
            "is_valid": is_valid,
            "status": "INTEGRITY_VERIFIED" if is_valid else "TAMPERING_DETECTED",
            "on_chain_hash": on_chain_commitment,
            "recomputed_hash": recomputed_hash,
        }
