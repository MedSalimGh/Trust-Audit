import uuid
import hashlib
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.models import Transaction, CryptographicCommitment, AuditCase
from app.schemas.schemas import TransactionCreate, TransactionResponse
from app.services.crypto.crypto_service import CryptoService
from app.core.dependencies import get_current_user

router = APIRouter(
    prefix="/transactions",
    tags=["Transactions"],
    dependencies=[Depends(get_current_user)],
)

@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(payload: TransactionCreate, db: Session = Depends(get_db)):
    # 1. Persist private transaction
    txn = Transaction(
        customer_reference=payload.customer_reference,
        sender_iban=payload.sender_iban,
        beneficiary_name=payload.beneficiary_name,
        beneficiary_iban=payload.beneficiary_iban,
        amount=payload.amount,
        currency=payload.currency,
        merchant_category=payload.merchant_category,
        transaction_type=payload.transaction_type,
        hour_of_day=payload.hour_of_day,
        is_night_transaction=payload.is_night_transaction,
        time_since_last_txn_hrs=payload.time_since_last_txn_hrs,
        is_international=payload.is_international,
        failed_attempts=payload.failed_attempts,
        pin_changed_recently=payload.pin_changed_recently,
    )
    db.add(txn)
    db.flush()

    # 2. Derive caseId as unique bytes32
    case_uuid = uuid.uuid4().hex
    case_id = "0x" + hashlib.sha256(case_uuid.encode('utf-8')).hexdigest()

    # 3. Assemble canonical payload & generate 32-byte CSPRNG salt
    canonical_dict = {
        "customer_reference": txn.customer_reference,
        "sender_iban": txn.sender_iban,
        "beneficiary_name": txn.beneficiary_name,
        "beneficiary_iban": txn.beneficiary_iban,
        "amount": float(txn.amount),
        "currency": txn.currency,
        "merchant_category": txn.merchant_category,
        "transaction_type": txn.transaction_type,
    }
    salt = CryptoService.generate_salt(32)
    salted_input_hash = CryptoService.compute_salted_input_hash(canonical_dict, salt)
    canonical_json_str = CryptoService.canonicalize_json(canonical_dict).decode("utf-8")

    # 4. Persist cryptographic commitment
    commitment = CryptographicCommitment(
        case_id=case_id,
        secret_salt=salt,
        canonical_json=canonical_json_str,
        salted_input_hash=salted_input_hash,
    )
    db.add(commitment)

    # 5. Determine Value Tier and base quorum
    if payload.amount > 50000.0:
        value_tier = 2  # TIER_3_ABOVE_50K
        required_approvals = 3
    elif payload.amount >= 5000.0:
        value_tier = 1  # TIER_2_5K_TO_50K
        required_approvals = 1
    else:
        value_tier = 0  # TIER_1_BELOW_5K
        required_approvals = 1

    deadline = datetime.now(timezone.utc) + timedelta(hours=48)

    # 6. Initialize AuditCase in off-chain database
    audit_case = AuditCase(
        case_id=case_id,
        transaction_id=txn.id,
        operator_address="0x0000000000000000000000000000000000000000", # set upon MetaMask registration
        status="REGISTERED",
        value_tier=value_tier,
        required_approvals=required_approvals,
        approval_count=0,
        deadline=deadline,
    )
    db.add(audit_case)
    db.commit()
    db.refresh(txn)

    return TransactionResponse(
        id=txn.id,
        case_id=case_id,
        salted_input_hash=salted_input_hash,
        value_tier=value_tier,
        required_approvals=required_approvals,
        deadline=deadline,
        status="REGISTERED"
    )

@router.get("/{txn_id}")
def get_transaction(txn_id: str, db: Session = Depends(get_db)):
    txn = db.query(Transaction).filter(Transaction.id == txn_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return txn
