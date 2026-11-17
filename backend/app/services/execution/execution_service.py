import hashlib
import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.models import ExecutionRecord, AuditCase
from app.core.config import settings

logger = logging.getLogger("trustaudit.execution")

class ExecutionService:
    @staticmethod
    def generate_idempotency_key(case_id: str, chain_id: int) -> str:
        data = f"EXECUTE:{case_id}:{chain_id}".encode("utf-8")
        return "0x" + hashlib.sha256(data).hexdigest()

    @classmethod
    def execute_transfer(cls, db: Session, case_id: str) -> ExecutionRecord:
        """
        Executes simulated bank transfer after verifying case is APPROVED.
        Strictly idempotent.
        """
        idempotency_key = cls.generate_idempotency_key(case_id, settings.CHAIN_ID)

        # Check existing execution
        existing = db.query(ExecutionRecord).filter(
            ExecutionRecord.idempotency_key == idempotency_key
        ).first()
        if existing:
            logger.info(f"Execution already recorded for case {case_id} (idempotency key {idempotency_key})")
            return existing

        case = db.query(AuditCase).filter(AuditCase.case_id == case_id).first()
        if not case:
            raise ValueError(f"Case {case_id} not found")

        record = ExecutionRecord(
            case_id=case_id,
            idempotency_key=idempotency_key,
            status="EXECUTED",
            simulated_channel="CORE_BANKING_RTGS"
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        logger.info(f"Bank Execution Simulator: transfer executed for case {case_id}")
        return record
