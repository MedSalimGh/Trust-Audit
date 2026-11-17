import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.models import AuditCase, Transaction, CryptographicCommitment
from app.schemas.schemas import VerifyIntegrityResponse, TamperSimulationRequest
from app.services.audit.audit_service import AuditService
from app.core.dependencies import get_current_user, require_role, AuthenticatedUser

router = APIRouter(
    prefix="/audit",
    tags=["Auditor & Tamper Lab"],
    dependencies=[Depends(get_current_user)],  # JWT required
)

@router.post("/{case_id}/verify", response_model=VerifyIntegrityResponse)
def verify_case(case_id: str, db: Session = Depends(get_db)):
    result = AuditService.verify_case_integrity(db, case_id)
    if result["status"] == "CASE_NOT_FOUND":
        raise HTTPException(status_code=404, detail="Case not found")
    return VerifyIntegrityResponse(**result)

@router.post("/{case_id}/simulate-tamper")
def simulate_tampering(
    case_id: str,
    req: TamperSimulationRequest,
    db: Session = Depends(get_db)
):
    """
    Tamper Lab Demonstration Endpoint:
    Simulates a rogue database administrator secretly altering data off-chain
    (e.g. reducing 60,000 DT to 6,000 DT).
    """
    case = db.query(AuditCase).filter(AuditCase.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    txn = case.transaction
    original_amount = txn.amount
    original_beneficiary = txn.beneficiary_name

    if req.altered_amount is not None:
        txn.amount = req.altered_amount
    if req.altered_beneficiary is not None:
        txn.beneficiary_name = req.altered_beneficiary

    db.commit()

    return {
        "status": "DATA_TAMPERED_IN_DATABASE",
        "case_id": case_id,
        "original_amount": original_amount,
        "tampered_amount": txn.amount,
        "original_beneficiary": original_beneficiary,
        "tampered_beneficiary": txn.beneficiary_name,
        "notice": "Off-chain record altered. Run verification to see cryptographic detection."
    }

@router.post("/{case_id}/restore")
def restore_original_data(case_id: str, db: Session = Depends(get_db)):
    """Restores original data from the immutable canonical snapshot."""
    case = db.query(AuditCase).filter(AuditCase.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    commitment = db.query(CryptographicCommitment).filter(
        CryptographicCommitment.case_id == case_id
    ).first()
    if not commitment:
        raise HTTPException(status_code=404, detail="Commitment not found")

    orig_dict = json.loads(commitment.canonical_json)
    txn = case.transaction
    txn.amount = float(orig_dict["amount"])
    txn.beneficiary_name = orig_dict["beneficiary_name"]
    txn.beneficiary_iban = orig_dict["beneficiary_iban"]
    txn.sender_iban = orig_dict["sender_iban"]
    txn.customer_reference = orig_dict["customer_reference"]
    txn.currency = orig_dict["currency"]
    txn.merchant_category = orig_dict["merchant_category"]
    txn.transaction_type = orig_dict["transaction_type"]

    db.commit()

    return {
        "status": "RESTORED",
        "case_id": case_id,
        "amount": txn.amount,
        "beneficiary": txn.beneficiary_name
    }
