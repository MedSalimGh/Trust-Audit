import json
import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.models import AuditCase, Transaction, CryptographicCommitment
from app.services.crypto.crypto_service import CryptoService
from app.services.blockchain.blockchain_service import blockchain_service

logger = logging.getLogger("trustaudit.audit")

class AuditService:
    @classmethod
    def verify_case_integrity(cls, db: Session, case_id: str) -> Dict[str, Any]:
        """
        Independent Auditor verification protocol:
        1. Retrieve stored private transaction record & salt from DB
        2. Recompute canonical JSON and salted commitment
        3. Fetch on-chain saltedInputHash
        4. Compare commitments and report bit-level tamper status
        """
        case = db.query(AuditCase).filter(AuditCase.case_id == case_id).first()
        if not case:
            return {
                "case_id": case_id,
                "is_valid": False,
                "status": "CASE_NOT_FOUND",
                "on_chain_hash": "",
                "recomputed_hash": "",
                "tampered_fields": []
            }

        commitment = db.query(CryptographicCommitment).filter(
            CryptographicCommitment.case_id == case_id
        ).first()
        if not commitment:
            return {
                "case_id": case_id,
                "is_valid": False,
                "status": "MISSING_COMMITMENT",
                "on_chain_hash": "",
                "recomputed_hash": "",
                "tampered_fields": []
            }

        txn = case.transaction
        current_data = {
            "customer_reference": txn.customer_reference,
            "sender_iban": txn.sender_iban,
            "beneficiary_name": txn.beneficiary_name,
            "beneficiary_iban": txn.beneficiary_iban,
            "amount": float(txn.amount),
            "currency": txn.currency,
            "merchant_category": txn.merchant_category,
            "transaction_type": txn.transaction_type,
        }

        # Recompute commitment
        recomputed_hash = CryptoService.compute_salted_input_hash(current_data, commitment.secret_salt)
        
        # Read from blockchain
        on_chain_case = blockchain_service.get_case(case_id)
        if on_chain_case:
            on_chain_hash = on_chain_case["salted_input_hash"]
        else:
            on_chain_hash = commitment.salted_input_hash

        is_valid = (recomputed_hash.lower() == on_chain_hash.lower())

        tampered_fields = []
        if not is_valid:
            try:
                original_payload = json.loads(commitment.canonical_json)
                all_keys = set(original_payload.keys()).union(set(current_data.keys()))
                for k in sorted(all_keys):
                    orig_val = original_payload.get(k)
                    curr_val = current_data.get(k)
                    if orig_val != curr_val:
                        tampered_fields.append({
                            "field": k,
                            "original_value": orig_val,
                            "tampered_value": curr_val,
                            "expected": orig_val,
                            "actual": curr_val,
                        })
            except Exception as e:
                logger.error(f"Error diffing tampered fields: {e}")

        salt_hex = (
            "0x" + commitment.secret_salt.hex()
            if isinstance(commitment.secret_salt, (bytes, bytearray))
            else str(commitment.secret_salt)
        )

        return {
            "case_id": case_id,
            "is_valid": is_valid,
            "status": "INTEGRITY_VERIFIED" if is_valid else "TAMPERING_DETECTED",
            "on_chain_hash": on_chain_hash,
            "recomputed_hash": recomputed_hash,
            "calculated_hash": recomputed_hash,
            "tampered_fields": tampered_fields,
            "current_data": current_data,
            "secret_salt": salt_hex,
        }
