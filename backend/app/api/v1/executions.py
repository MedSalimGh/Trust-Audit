from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.models import ExecutionRecord, AuditCase
from app.schemas.schemas import ExecutionResponse
from app.services.execution.execution_service import ExecutionService
from app.core.dependencies import get_current_user

router = APIRouter(
    prefix="/executions",
    tags=["Bank Execution Simulator"],
    dependencies=[Depends(get_current_user)],
)

@router.get("", response_model=list[ExecutionResponse])
def list_executions(db: Session = Depends(get_db)):
    records = db.query(ExecutionRecord).order_by(ExecutionRecord.executed_at.desc()).all()
    return records

@router.post("/trigger/{case_id}", response_model=ExecutionResponse)
def trigger_execution(case_id: str, db: Session = Depends(get_db)):
    case = db.query(AuditCase).filter(AuditCase.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if case.status != "APPROVED":
        raise HTTPException(status_code=400, detail="Cannot execute transfer: Case is not APPROVED on-chain")

    record = ExecutionService.execute_transfer(db, case_id)
    return record
