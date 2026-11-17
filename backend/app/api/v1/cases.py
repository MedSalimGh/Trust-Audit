import json
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.models import AuditCase, Transaction, CryptographicCommitment, AIAssessment, Approval
from app.schemas.schemas import (
    CaseListResponse, CaseSummary, CaseDetailResponse,
    CommentHashRequest, CommentHashResponse, ApprovalRecordSchema,
    SyncStatusRequest
)
from app.services.crypto.crypto_service import CryptoService
from app.services.blockchain.blockchain_service import blockchain_service
from app.core.dependencies import get_current_user, AuthenticatedUser

router = APIRouter(
    prefix="/cases",
    tags=["Cases"],
    dependencies=[Depends(get_current_user)],  # JWT required for all case endpoints
)

@router.get("", response_model=CaseListResponse)
def list_cases(
    status_filter: str = None,
    db: Session = Depends(get_db)
):
    query = db.query(AuditCase).join(Transaction)
    if status_filter:
        query = query.filter(AuditCase.status == status_filter)

    cases = query.order_by(AuditCase.created_at.desc()).all()
    items = []
    for c in cases:
        ai_score = None
        risk_level = None
        if c.assessments:
            latest_assessment = c.assessments[-1]
            ai_score = latest_assessment.risk_score
            risk_level = latest_assessment.risk_level
        elif c.status != "REGISTERED":
            # Auto-evaluate missing assessment for already-promoted cases
            try:
                from app.api.v1.ai import get_ai_service
                ai_service = get_ai_service()
                txn = c.transaction
                if txn:
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
                    eval_result = ai_service.evaluate(txn_dict, c.case_id)
                    assessment = AIAssessment(
                        case_id=c.case_id,
                        model_version=eval_result["model_version"],
                        risk_score=eval_result["risk_score"],
                        risk_level=eval_result["risk_level"],
                        feature_snapshot=json.dumps(txn_dict),
                        shap_summary=json.dumps(eval_result["shap_summary"]),
                        explanation_hash=eval_result["explanation_hash"],
                    )
                    db.add(assessment)
                    db.commit()
                    ai_score = eval_result["risk_score"]
                    risk_level = eval_result["risk_level"]
            except Exception as e:
                pass

        items.append(CaseSummary(
            case_id=c.case_id,
            amount=c.transaction.amount,
            currency=c.transaction.currency,
            beneficiary_name=c.transaction.beneficiary_name,
            merchant_category=c.transaction.merchant_category,
            transaction_type=c.transaction.transaction_type if c.transaction else None,
            ai_risk_score=ai_score,
            risk_score=ai_score,
            risk_level=risk_level,
            status=c.status,
            value_tier=c.value_tier,
            required_approvals=c.required_approvals,
            approval_count=c.approval_count,
            created_at=c.created_at,
            deadline=c.deadline,
            certificate_id=c.certificate_id,
        ))

    return CaseListResponse(total=len(items), items=items)

def _sync_onchain_signatures_for_case(case: AuditCase, db: Session):
    """Query on-chain blockchain events to populate any missing approval or rejection records."""
    if not blockchain_service.is_connected() or not blockchain_service.registry_contract:
        return
    try:
        reg = blockchain_service.registry_contract
        case_bytes = bytes.fromhex(case.case_id.replace("0x", ""))
        role_map = {0: "COMPLIANCE", 1: "RISK_MANAGER", 2: "DIRECTOR"}

        # 1. Sync ApprovalSubmitted
        app_filter = reg.events.ApprovalSubmitted.create_filter(from_block=0, to_block='latest')
        for ev in app_filter.get_all_entries():
            if ev.args.caseId == case_bytes:
                approver = ev.args.approver.lower()
                role_name = role_map.get(ev.args.role, "COMPLIANCE")
                c_hash = "0x" + ev.args.commentHash.hex()
                is_ov = bool(ev.args.isOverride)

                existing = db.query(Approval).filter(
                    Approval.case_id == case.case_id,
                    Approval.approver_address == approver,
                    Approval.role_signed == role_name,
                    Approval.decision == "APPROVED"
                ).first()
                if not existing:
                    db.add(Approval(
                        case_id=case.case_id,
                        approver_address=approver,
                        role_signed=role_name,
                        decision="APPROVED",
                        comment_hash=c_hash,
                        is_override=is_ov,
                        justification_text=f"Regulatory sign-off approved on blockchain by {role_name}.",
                    ))

        # 2. Sync CaseRejected
        rej_filter = reg.events.CaseRejected.create_filter(from_block=0, to_block='latest')
        for ev in rej_filter.get_all_entries():
            if ev.args.caseId == case_bytes:
                rejector = ev.args.rejector.lower()
                c_hash = "0x" + ev.args.commentHash.hex()

                role_name = "COMPLIANCE"
                try:
                    dir_role = reg.functions.DIRECTOR_ROLE().call()
                    risk_role = reg.functions.RISK_MANAGER_ROLE().call()
                    if reg.functions.hasRole(dir_role, rejector).call():
                        role_name = "DIRECTOR"
                    elif reg.functions.hasRole(risk_role, rejector).call():
                        role_name = "RISK_MANAGER"
                except Exception:
                    pass

                existing = db.query(Approval).filter(
                    Approval.case_id == case.case_id,
                    Approval.approver_address == rejector,
                    Approval.decision == "REJECTED"
                ).first()
                if not existing:
                    db.add(Approval(
                        case_id=case.case_id,
                        approver_address=rejector,
                        role_signed=role_name,
                        decision="REJECTED",
                        comment_hash=c_hash,
                        is_override=False,
                        justification_text="Case formally rejected on blockchain (High fraud risk profile).",
                    ))
        db.commit()
    except Exception:
        pass

@router.get("/{case_id}", response_model=CaseDetailResponse)
def get_case_detail(case_id: str, db: Session = Depends(get_db)):
    case = db.query(AuditCase).filter(AuditCase.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Read live on-chain case status if available
    on_chain = blockchain_service.get_case(case_id)
    if on_chain:
        status_map = {
            0: "NONE", 1: "REGISTERED", 2: "PENDING_APPROVAL",
            3: "APPROVED", 4: "REJECTED", 5: "ESCALATED"
        }
        on_chain_status_str = status_map.get(on_chain["status"], case.status)
        if case.status != on_chain_status_str or case.approval_count != on_chain["approval_count"]:
            case.status = on_chain_status_str
            case.approval_count = on_chain["approval_count"]
            case.required_approvals = on_chain["required_approvals"]
            if on_chain["certificate_id"] > 0:
                case.certificate_id = on_chain["certificate_id"]
            db.commit()

    # Synchronize on-chain signatures and rejections
    _sync_onchain_signatures_for_case(case, db)
    db.refresh(case)

    commitment = db.query(CryptographicCommitment).filter(
        CryptographicCommitment.case_id == case_id
    ).first()

    ai_dict = None
    if case.assessments:
        latest_ai = case.assessments[-1]
        try:
            shap_json = json.loads(latest_ai.shap_summary)
        except Exception:
            shap_json = {}
        ai_dict = {
            "model_version": latest_ai.model_version,
            "risk_score": latest_ai.risk_score,
            "risk_level": latest_ai.risk_level,
            "explanation_hash": latest_ai.explanation_hash,
            "shap_summary": shap_json,
        }
    else:
        try:
            from app.api.v1.ai import get_ai_service
            ai_service = get_ai_service()
            txn = case.transaction
            if txn:
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
                eval_result = ai_service.evaluate(txn_dict, case.case_id)
                assessment = AIAssessment(
                    case_id=case.case_id,
                    model_version=eval_result["model_version"],
                    risk_score=eval_result["risk_score"],
                    risk_level=eval_result["risk_level"],
                    feature_snapshot=json.dumps(txn_dict),
                    shap_summary=json.dumps(eval_result["shap_summary"]),
                    explanation_hash=eval_result["explanation_hash"],
                )
                db.add(assessment)
                if case.status == "REGISTERED":
                    case.status = "PENDING_APPROVAL"
                db.commit()
                ai_dict = {
                    "model_version": eval_result["model_version"],
                    "risk_score": eval_result["risk_score"],
                    "risk_level": eval_result["risk_level"],
                    "explanation_hash": eval_result["explanation_hash"],
                    "shap_summary": eval_result["shap_summary"],
                }
        except Exception:
            pass

    # Deduplicate approvals by (approver_address.lower(), role_signed, decision)
    # Prioritize rich human justifications over generic indexer strings
    deduped_approvals = {}
    for app in case.approvals:
        key = (app.approver_address.lower(), app.role_signed, app.decision or "APPROVED")
        if key not in deduped_approvals:
            deduped_approvals[key] = app
        else:
            current = deduped_approvals[key]
            # If current is generic and new is custom, replace with custom
            if (
                current.justification_text.startswith("Recorded from on-chain")
                or current.justification_text.startswith("Regulatory sign-off approved")
            ) and not (
                app.justification_text.startswith("Recorded from on-chain")
                or app.justification_text.startswith("Regulatory sign-off approved")
            ):
                deduped_approvals[key] = app

    approvals_list = []
    for app in deduped_approvals.values():
        approvals_list.append(ApprovalRecordSchema(
            approver=app.approver_address.lower(),
            role=app.role_signed,
            decision=app.decision or "APPROVED",
            comment_hash=app.comment_hash,
            is_override=app.is_override,
            justification_text=app.justification_text,
            timestamp=app.timestamp,
        ))

    txn = case.transaction
    txn_dict = {
        "id": txn.id,
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

    return CaseDetailResponse(
        case_id=case.case_id,
        transaction=txn_dict,
        status=case.status,
        value_tier=case.value_tier,
        required_approvals=case.required_approvals,
        approval_count=case.approval_count,
        deadline=case.deadline,
        certificate_id=case.certificate_id,
        salted_input_hash=commitment.salted_input_hash if commitment else "",
        ai_assessment=ai_dict,
        approvals=approvals_list,
        is_escalated=(case.status == "ESCALATED")
    )

@router.post("/{case_id}/comment-hash", response_model=CommentHashResponse)
def compute_comment_hash(case_id: str, req: CommentHashRequest):
    if not req.justification.strip():
        raise HTTPException(status_code=400, detail="Justification cannot be empty")
    h = CryptoService.compute_comment_hash(req.justification)
    return CommentHashResponse(comment_hash=h)

@router.post("/{case_id}/sync-status")
def sync_case_status(
    case_id: str,
    req: Optional[SyncStatusRequest] = None,
    db: Session = Depends(get_db)
):
    case = db.query(AuditCase).filter(AuditCase.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    on_chain = blockchain_service.get_case(case_id)
    if not on_chain:
        return {"synced": False, "message": "Case not found on-chain"}

    status_map = {
        0: "NONE", 1: "REGISTERED", 2: "PENDING_APPROVAL",
        3: "APPROVED", 4: "REJECTED", 5: "ESCALATED"
    }
    case.status = status_map.get(on_chain["status"], case.status)
    case.approval_count = on_chain["approval_count"]
    case.required_approvals = on_chain["required_approvals"]
    if on_chain["certificate_id"] > 0:
        case.certificate_id = on_chain["certificate_id"]
    if on_chain["operator"] != "0x0000000000000000000000000000000000000000":
        case.operator_address = on_chain["operator"].lower()

    # Record direct vote payload if provided
    if req and req.approver and req.justification:
        existing = db.query(Approval).filter(
            Approval.case_id == case_id,
            Approval.approver_address.ilike(req.approver),
            Approval.decision == req.decision
        ).first()
        if existing:
            existing.justification_text = req.justification
            if req.comment_hash:
                existing.comment_hash = req.comment_hash
        else:
            db.add(Approval(
                case_id=case_id,
                approver_address=req.approver,
                role_signed=req.role or "COMPLIANCE",
                decision=req.decision or "APPROVED",
                comment_hash=req.comment_hash or "0x0000000000000000000000000000000000000000000000000000000000000000",
                is_override=False,
                justification_text=req.justification,
            ))

    db.commit()

    # Ensure all on-chain events are also reflected in SQLite
    _sync_onchain_signatures_for_case(case, db)
    db.refresh(case)

    return {"synced": True, "status": case.status, "approvals": case.approval_count}
