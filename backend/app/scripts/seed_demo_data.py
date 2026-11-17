import uuid
import json
import hashlib
from datetime import datetime, timedelta, timezone
from app.models.database import engine, Base, SessionLocal, init_db
from app.models.models import (
    Transaction, CryptographicCommitment, AuditCase,
    AIAssessment, Approval, ExecutionRecord
)
from app.services.crypto.crypto_service import CryptoService
from app.services.ai.ai_service import AIService
from app.services.execution.execution_service import ExecutionService
from app.core.config import settings

def seed_database():
    print("Initializing fresh TrustAudit SQLite tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    ai_service = AIService()

    try:
        # =====================================================================
        # Case 1: Tier 3 High-Value Enterprise Transfer (60,000 DT)
        # Quorum: 3 Signatures Required (Compliance + Risk Manager + Director)
        # =====================================================================
        print("Seeding Case 1: Tier 3 Enterprise Transfer (60,000 DT)...")
        txn1 = Transaction(
            customer_reference="REF-ENT-2026-8891",
            sender_iban="TN5910001000123456789012",
            sender_name="Atlas Industrial Equipment SA",
            beneficiary_name="EuroTech Global Manufacturing GmbH",
            beneficiary_iban="DE89370400440532013000",
            amount=60000.0,
            currency="DT",
            merchant_category="Wire Transfer",
            transaction_type="Transfer",
            hour_of_day=14,
            is_night_transaction=0,
            time_since_last_txn_hrs=24.5,
            is_international=1,
            failed_attempts=0,
            pin_changed_recently=0,
        )
        db.add(txn1)
        db.flush()

        case_id_1 = "0x" + hashlib.sha256("TRUSTAUDIT_CASE_DEMO_001".encode()).hexdigest()
        canonical_dict_1 = {
            "customer_reference": txn1.customer_reference,
            "sender_iban": txn1.sender_iban,
            "beneficiary_name": txn1.beneficiary_name,
            "beneficiary_iban": txn1.beneficiary_iban,
            "amount": float(txn1.amount),
            "currency": txn1.currency,
            "merchant_category": txn1.merchant_category,
            "transaction_type": txn1.transaction_type,
        }
        salt_1 = CryptoService.generate_salt(32)
        salted_hash_1 = CryptoService.compute_salted_input_hash(canonical_dict_1, salt_1)
        canonical_json_str_1 = CryptoService.canonicalize_json(canonical_dict_1).decode("utf-8")

        db.add(CryptographicCommitment(
            case_id=case_id_1,
            secret_salt=salt_1,
            canonical_json=canonical_json_str_1,
            salted_input_hash=salted_hash_1,
        ))

        case_1 = AuditCase(
            case_id=case_id_1,
            transaction_id=txn1.id,
            operator_address="0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            status="PENDING_APPROVAL",
            value_tier=2,
            required_approvals=3,
            approval_count=0,
            deadline=datetime.now(timezone.utc) + timedelta(hours=48),
        )
        db.add(case_1)

        # Run AI evaluation
        eval_1 = ai_service.evaluate({
            "amount": txn1.amount,
            "merchant_category": txn1.merchant_category,
            "hour_of_day": txn1.hour_of_day,
            "time_since_last_txn_hrs": txn1.time_since_last_txn_hrs,
            "is_international": txn1.is_international,
            "failed_attempts": txn1.failed_attempts,
            "pin_changed_recently": txn1.pin_changed_recently,
        }, case_id_1)

        db.add(AIAssessment(
            case_id=case_id_1,
            model_version=eval_1["model_version"],
            risk_score=eval_1["risk_score"],
            risk_level=eval_1["risk_level"],
            feature_snapshot=json.dumps(canonical_dict_1),
            shap_summary=json.dumps(eval_1["shap_summary"]),
            explanation_hash=eval_1["explanation_hash"],
        ))

        # =====================================================================
        # Case 2: High-Risk Crypto Offshore Transfer (14,500 DT)
        # Quorum: 2 Signatures (Compliance + Mandatory Risk Manager Overlay)
        # =====================================================================
        print("Seeding Case 2: Suspicious Crypto Exchange (14,500 DT)...")
        txn2 = Transaction(
            customer_reference="REF-CRYPTO-2026-4402",
            sender_iban="TN5910001000998877665544",
            sender_name="Farouk Belhadj",
            beneficiary_name="BitExchange Offshore Intermediary LLC",
            beneficiary_iban="TN5920002000332211009988",
            amount=14500.0,
            currency="DT",
            merchant_category="Crypto Exchange",
            transaction_type="Transfer",
            hour_of_day=3,
            is_night_transaction=1,
            time_since_last_txn_hrs=0.5,
            is_international=1,
            failed_attempts=3,
            pin_changed_recently=1,
        )
        db.add(txn2)
        db.flush()

        case_id_2 = "0x" + hashlib.sha256("TRUSTAUDIT_CASE_DEMO_002".encode()).hexdigest()
        canonical_dict_2 = {
            "customer_reference": txn2.customer_reference,
            "sender_iban": txn2.sender_iban,
            "beneficiary_name": txn2.beneficiary_name,
            "beneficiary_iban": txn2.beneficiary_iban,
            "amount": float(txn2.amount),
            "currency": txn2.currency,
            "merchant_category": txn2.merchant_category,
            "transaction_type": txn2.transaction_type,
        }
        salt_2 = CryptoService.generate_salt(32)
        salted_hash_2 = CryptoService.compute_salted_input_hash(canonical_dict_2, salt_2)
        canonical_json_str_2 = CryptoService.canonicalize_json(canonical_dict_2).decode("utf-8")

        db.add(CryptographicCommitment(
            case_id=case_id_2,
            secret_salt=salt_2,
            canonical_json=canonical_json_str_2,
            salted_input_hash=salted_hash_2,
        ))

        case_2 = AuditCase(
            case_id=case_id_2,
            transaction_id=txn2.id,
            operator_address="0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            status="PENDING_APPROVAL",
            value_tier=1,
            required_approvals=2,  # elevated due to HIGH risk
            approval_count=0,
            deadline=datetime.now(timezone.utc) + timedelta(hours=24),
        )
        db.add(case_2)

        eval_2 = ai_service.evaluate({
            "amount": txn2.amount,
            "merchant_category": txn2.merchant_category,
            "hour_of_day": txn2.hour_of_day,
            "time_since_last_txn_hrs": txn2.time_since_last_txn_hrs,
            "is_international": txn2.is_international,
            "failed_attempts": txn2.failed_attempts,
            "pin_changed_recently": txn2.pin_changed_recently,
        }, case_id_2)

        db.add(AIAssessment(
            case_id=case_id_2,
            model_version=eval_2["model_version"],
            risk_score=eval_2["risk_score"],
            risk_level=eval_2["risk_level"],
            feature_snapshot=json.dumps(canonical_dict_2),
            shap_summary=json.dumps(eval_2["shap_summary"]),
            explanation_hash=eval_2["explanation_hash"],
        ))

        # =====================================================================
        # Case 3: Fully Approved & Certified Commercial Transfer (4,200 DT)
        # Status: APPROVED with NFT Certificate Token #1 and Bank Settlement
        # =====================================================================
        print("Seeding Case 3: Routine Commercial Transfer (4,200 DT - APPROVED)...")
        txn3 = Transaction(
            customer_reference="REF-COMM-2026-1049",
            sender_iban="TN5910001000112233445566",
            sender_name="Sousse Distribution SARL",
            beneficiary_name="Tunis Paper Mills SA",
            beneficiary_iban="TN5920002000667788990011",
            amount=4200.0,
            currency="DT",
            merchant_category="Online Shopping",
            transaction_type="Payment",
            hour_of_day=11,
            is_night_transaction=0,
            time_since_last_txn_hrs=72.0,
            is_international=0,
            failed_attempts=0,
            pin_changed_recently=0,
        )
        db.add(txn3)
        db.flush()

        case_id_3 = "0x" + hashlib.sha256("TRUSTAUDIT_CASE_DEMO_003".encode()).hexdigest()
        canonical_dict_3 = {
            "customer_reference": txn3.customer_reference,
            "sender_iban": txn3.sender_iban,
            "beneficiary_name": txn3.beneficiary_name,
            "beneficiary_iban": txn3.beneficiary_iban,
            "amount": float(txn3.amount),
            "currency": txn3.currency,
            "merchant_category": txn3.merchant_category,
            "transaction_type": txn3.transaction_type,
        }
        salt_3 = CryptoService.generate_salt(32)
        salted_hash_3 = CryptoService.compute_salted_input_hash(canonical_dict_3, salt_3)
        canonical_json_str_3 = CryptoService.canonicalize_json(canonical_dict_3).decode("utf-8")

        db.add(CryptographicCommitment(
            case_id=case_id_3,
            secret_salt=salt_3,
            canonical_json=canonical_json_str_3,
            salted_input_hash=salted_hash_3,
        ))

        case_3 = AuditCase(
            case_id=case_id_3,
            transaction_id=txn3.id,
            operator_address="0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            status="APPROVED",
            value_tier=0,
            required_approvals=1,
            approval_count=1,
            certificate_id=1,
            deadline=datetime.now(timezone.utc) + timedelta(hours=72),
        )
        db.add(case_3)

        eval_3 = ai_service.evaluate({
            "amount": txn3.amount,
            "merchant_category": txn3.merchant_category,
            "hour_of_day": txn3.hour_of_day,
            "time_since_last_txn_hrs": txn3.time_since_last_txn_hrs,
            "is_international": txn3.is_international,
            "failed_attempts": txn3.failed_attempts,
            "pin_changed_recently": txn3.pin_changed_recently,
        }, case_id_3)

        db.add(AIAssessment(
            case_id=case_id_3,
            model_version=eval_3["model_version"],
            risk_score=eval_3["risk_score"],
            risk_level=eval_3["risk_level"],
            feature_snapshot=json.dumps(canonical_dict_3),
            shap_summary=json.dumps(eval_3["shap_summary"]),
            explanation_hash=eval_3["explanation_hash"],
        ))

        # Add Compliance approval
        comment_text_3 = "Commercial trade invoice verified against customs declaration."
        comment_hash_3 = CryptoService.compute_comment_hash(comment_text_3)
        db.add(Approval(
            case_id=case_id_3,
            approver_address="0x90F79bf6EB2c4f870365E785982E1f101E93b906",
            role_signed="COMPLIANCE",
            comment_hash=comment_hash_3,
            is_override=False,
            justification_text=comment_text_3,
        ))

        # Add simulated bank execution
        db.add(ExecutionRecord(
            case_id=case_id_3,
            idempotency_key=ExecutionService.generate_idempotency_key(case_id_3, settings.CHAIN_ID),
            status="EXECUTED",
            simulated_channel="CORE_BANKING_RTGS",
        ))

        db.commit()
        print("Database seeding completed successfully! 3 demo cases ready.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()