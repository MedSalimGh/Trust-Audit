import json
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.models import AuditCase, AIAssessment
from app.schemas.schemas import AIAssessResponse
from app.services.ai.ai_service import AIService
from app.services.blockchain.blockchain_service import blockchain_service
from app.core.dependencies import get_current_user

logger = logging.getLogger("trustaudit.api.ai")
router = APIRouter(
    prefix="/ai",
    tags=["AI Risk Engine"],
    dependencies=[Depends(get_current_user)],
)

# Lazy singleton for AIService
_ai_service_instance = None

def get_ai_service() -> AIService:
    global _ai_service_instance
    if _ai_service_instance is None:
        _ai_service_instance = AIService()
    return _ai_service_instance

@router.post("/assess/{case_id}", response_model=AIAssessResponse)
def assess_case(case_id: str, db: Session = Depends(get_db)):
    case = db.query(AuditCase).filter(AuditCase.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    txn = case.transaction
    txn_dict = {
        "customer_reference": txn.customer_reference,
        "sender_iban": txn.sender_iban,
        "beneficiary_name": txn.beneficiary_name,
        "beneficiary_iban": txn.beneficiary_iban,
        "amount": txn.amount,
        "currency": txn.currency,
        "merchant_category": txn.merchant_category,
        "transaction_type": txn.transaction_type,
        "hour_of_day": txn.hour_of_day,
        "is_night_transaction": txn.is_night_transaction,
        "time_since_last_txn_hrs": txn.time_since_last_txn_hrs,
        "is_international": txn.is_international,
        "failed_attempts": txn.failed_attempts,
        "pin_changed_recently": txn.pin_changed_recently,
    }

    try:
        ai_service = get_ai_service()
        eval_result = ai_service.evaluate(txn_dict, case_id)
    except Exception as e:
        logger.error(f"AI evaluation failed for case {case_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"AI risk evaluation service failure: {str(e)}"
        )

    # 1. Store assessment in DB
    assessment = AIAssessment(
        case_id=case_id,
        model_version=eval_result["model_version"],
        risk_score=eval_result["risk_score"],
        risk_level=eval_result["risk_level"],
        feature_snapshot=json.dumps(txn_dict),
        shap_summary=json.dumps(eval_result["shap_summary"]),
        explanation_hash=eval_result["explanation_hash"],
    )
    db.add(assessment)

    # 2. Update case status & quorum if HIGH risk overlay applies
    case.status = "PENDING_APPROVAL"
    if eval_result["risk_level"] == "HIGH" and case.value_tier != 2:
        case.required_approvals = 2  # Elevate Tier 1/2 to 2 approvals (Compliance + Risk Manager)

    db.commit()

    # 3. If connected to blockchain, anchor assessment on-chain via AI Oracle wallet
    oracle_tx = None
    if blockchain_service.is_connected() and blockchain_service.registry_contract:
        try:
            oracle_tx = blockchain_service.submit_oracle_assessment(
                case_id=case_id,
                risk_score=eval_result["risk_score"],
                risk_level_enum=eval_result["risk_level_enum"],
                explanation_hash=eval_result["explanation_hash"]
            )
            logger.info(f"AI Oracle transaction confirmed: {oracle_tx}")
        except Exception as e:
            logger.warning(f"On-chain oracle submission skipped/failed (demo fallback): {e}")

    return AIAssessResponse(
        case_id=case_id,
        risk_score=eval_result["risk_score"],
        risk_level=eval_result["risk_level"],
        model_version=eval_result["model_version"],
        explanation_hash=eval_result["explanation_hash"],
        shap_summary=eval_result["shap_summary"],
        fraud_probability=eval_result["fraud_probability"]
    )
