from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.models import BlockchainEvent
from app.services.blockchain.blockchain_service import blockchain_service
from app.core.dependencies import get_current_user

router = APIRouter(
    prefix="/blockchain",
    tags=["Blockchain Operations"],
    dependencies=[Depends(get_current_user)],
)

@router.get("/network")
def get_network_info():
    is_conn = blockchain_service.is_connected()
    chain_id = blockchain_service.get_chain_id() if is_conn else 0
    return {
        "connected": is_conn,
        "chain_id": chain_id,
        "network_name": "Ganache Local EVM",
        "registry_address": getattr(blockchain_service, "registry_address", None),
        "certificate_address": getattr(blockchain_service, "certificate_address", None),
        "roles": blockchain_service.manifest.get("roles", {})
    }

@router.get("/cases/{case_id}")
def get_on_chain_case(case_id: str):
    on_chain = blockchain_service.get_case(case_id)
    if not on_chain:
        raise HTTPException(status_code=404, detail="Case not found on-chain")
    return on_chain

@router.get("/events")
def list_indexed_events(db: Session = Depends(get_db)):
    events = db.query(BlockchainEvent).order_by(BlockchainEvent.id.desc()).limit(100).all()
    return [
        {
            "id": e.id,
            "chain_id": e.chain_id,
            "block_number": e.block_number,
            "transaction_hash": e.transaction_hash,
            "log_index": e.log_index,
            "event_name": e.event_name,
            "event_data": e.event_data,
            "processed": e.processed
        }
        for e in events
    ]
