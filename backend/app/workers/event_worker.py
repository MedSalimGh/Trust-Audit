import time
import json
import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.database import SessionLocal, init_db
from app.models.models import AuditCase, Approval, BlockchainEvent
from app.services.blockchain.blockchain_service import blockchain_service
from app.services.execution.execution_service import ExecutionService
from app.core.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("trustaudit.event_worker")

ROLE_NAMES = {0: "COMPLIANCE", 1: "RISK_MANAGER", 2: "DIRECTOR"}

class EventWorker:
    def __init__(self):
        self.last_block = 0
        self.running = False

    def get_latest_block(self) -> int:
        if not blockchain_service.is_connected():
            return 0
        try:
            return blockchain_service.w3.eth.block_number
        except Exception:
            return 0

    def process_events(self, from_block: int, to_block: int, db: Session) -> int:
        if not blockchain_service.registry_contract:
            return 0

        registry = blockchain_service.registry_contract
        processed_count = 0

        # Define event filters to query
        event_names = [
            "CaseRegistered",
            "AIAssessmentRecorded",
            "ApprovalSubmitted",
            "CaseApproved",
            "CaseRejected",
            "CaseEscalated",
        ]

        for name in event_names:
            event_abi_func = getattr(registry.events, name, None)
            if not event_abi_func:
                continue

            try:
                logs = event_abi_func().get_logs(from_block=from_block, to_block=to_block)
            except Exception as e:
                logger.warning(f"Failed to query logs for event {name}: {e}")
                continue

            for log in logs:
                tx_hash = log["transactionHash"].hex()
                log_idx = log["logIndex"]
                blk_num = log["blockNumber"]
                args = dict(log["args"])

                # Convert bytes to hex strings for serialization
                clean_args = {}
                for k, v in args.items():
                    if isinstance(v, bytes):
                        clean_args[k] = "0x" + v.hex()
                    else:
                        clean_args[k] = v

                case_id = clean_args.get("caseId")
                if not case_id:
                    continue

                # Check if event already indexed
                existing_evt = db.query(BlockchainEvent).filter(
                    BlockchainEvent.chain_id == settings.CHAIN_ID,
                    BlockchainEvent.transaction_hash == tx_hash,
                    BlockchainEvent.log_index == log_idx,
                ).first()

                if not existing_evt:
                    evt_record = BlockchainEvent(
                        chain_id=settings.CHAIN_ID,
                        block_number=blk_num,
                        transaction_hash=tx_hash,
                        log_index=log_idx,
                        event_name=name,
                        event_data=json.dumps(clean_args),
                        processed=False,
                    )
                    db.add(evt_record)
                    db.flush()
                else:
                    evt_record = existing_evt

                # Handle state synchronization
                self._apply_event_to_db(name, clean_args, db)
                evt_record.processed = True
                db.commit()
                processed_count += 1

        return processed_count

    def _apply_event_to_db(self, event_name: str, args: Dict[str, Any], db: Session):
        case_id = args.get("caseId")
        case = db.query(AuditCase).filter(AuditCase.case_id == case_id).first()
        if not case:
            return

        if event_name == "CaseRegistered":
            if case.status == "NONE":
                case.status = "REGISTERED"
            case.operator_address = args.get("operator", case.operator_address)

        elif event_name == "AIAssessmentRecorded":
            if case.status == "REGISTERED":
                case.status = "PENDING_APPROVAL"

        elif event_name == "ApprovalSubmitted":
            approver = (args.get("approver") or "").lower()
            role_int = args.get("role", 0)
            role_name = ROLE_NAMES.get(role_int, "COMPLIANCE")
            comment_hash = args.get("commentHash")
            is_override = bool(args.get("isOverride", False))

            existing_app = db.query(Approval).filter(
                Approval.case_id == case_id,
                Approval.approver_address == approver,
                Approval.role_signed == role_name,
                Approval.decision == "APPROVED",
            ).first()

            if not existing_app:
                app_rec = Approval(
                    case_id=case_id,
                    approver_address=approver,
                    role_signed=role_name,
                    decision="APPROVED",
                    comment_hash=comment_hash,
                    is_override=is_override,
                    justification_text="Recorded from on-chain event indexer",
                )
                db.add(app_rec)
                db.flush()

            # Synchronize authoritative approval count from on-chain smart contract
            on_chain = blockchain_service.get_case(case_id)
            if on_chain:
                case.approval_count = on_chain["approval_count"]
                case.required_approvals = on_chain["required_approvals"]
            else:
                case.approval_count = db.query(Approval).filter(Approval.case_id == case_id).count()

        elif event_name == "CaseApproved":
            case.status = "APPROVED"
            cert_id = args.get("certificateId", 0)
            if cert_id:
                case.certificate_id = int(cert_id)

            # Trigger automated decoupled execution
            try:
                ExecutionService.execute_transfer(db, case_id)
                logger.info(f"Auto-triggered bank execution for approved case {case_id}")
            except Exception as e:
                logger.error(f"Bank execution failed for case {case_id}: {e}")

        elif event_name == "CaseRejected":
            case.status = "REJECTED"
            rejector = (args.get("rejector") or "").lower()
            comment_hash = args.get("commentHash")
            role_name = "COMPLIANCE"
            if blockchain_service.registry_contract and rejector:
                try:
                    reg = blockchain_service.registry_contract
                    dir_role = reg.functions.DIRECTOR_ROLE().call()
                    risk_role = reg.functions.RISK_MANAGER_ROLE().call()
                    if reg.functions.hasRole(dir_role, rejector).call():
                        role_name = "DIRECTOR"
                    elif reg.functions.hasRole(risk_role, rejector).call():
                        role_name = "RISK_MANAGER"
                except Exception:
                    pass

            if rejector:
                existing_rej = db.query(Approval).filter(
                    Approval.case_id == case_id,
                    Approval.approver_address == rejector,
                    Approval.decision == "REJECTED"
                ).first()
                if not existing_rej:
                    app_rej = Approval(
                        case_id=case_id,
                        approver_address=rejector,
                        role_signed=role_name,
                        decision="REJECTED",
                        comment_hash=comment_hash or "0x0000000000000000000000000000000000000000000000000000000000000000",
                        is_override=False,
                        justification_text="Case formally rejected on blockchain (High fraud risk profile).",
                    )
                    db.add(app_rej)
                    db.flush()

        elif event_name == "CaseEscalated":
            case.status = "ESCALATED"

    def run_loop(self, poll_interval_sec: float = 2.0):
        init_db()
        self.running = True
        logger.info(f"Starting TrustAudit Event Indexer on chain ID {settings.CHAIN_ID}...")

        while self.running:
            try:
                if not blockchain_service.is_connected():
                    logger.debug("Blockchain node offline, waiting...")
                    time.sleep(poll_interval_sec)
                    continue

                latest = self.get_latest_block()
                if latest > self.last_block:
                    start_blk = self.last_block if self.last_block > 0 else 0
                    db = SessionLocal()
                    try:
                        n = self.process_events(start_blk, latest, db)
                        if n > 0:
                            logger.info(f"Indexed {n} events from blocks {start_blk}..{latest}")
                        self.last_block = latest
                    finally:
                        db.close()

            except Exception as e:
                logger.error(f"Event indexer loop error: {e}")

            time.sleep(poll_interval_sec)

if __name__ == "__main__":
    worker = EventWorker()
    try:
        worker.run_loop()
    except KeyboardInterrupt:
        logger.info("Stopping Event Indexer.")