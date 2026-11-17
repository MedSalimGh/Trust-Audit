from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

# -----------------------------------------------------------------------------
# Auth Schemas
# -----------------------------------------------------------------------------
class NonceRequest(BaseModel):
    wallet_address: str
    chain_id: int = 1337

class NonceResponse(BaseModel):
    nonce: str
    message: str

class VerifySignatureRequest(BaseModel):
    message: str
    signature: str

class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    wallet_address: str
    roles: List[str]

class UserProfile(BaseModel):
    wallet_address: str
    roles: List[str]
    is_active: bool = True

# -----------------------------------------------------------------------------
# Transaction & Case Schemas
# -----------------------------------------------------------------------------
class TransactionCreate(BaseModel):
    customer_reference: str
    sender_iban: str
    sender_name: Optional[str] = "Private Banking Client"
    beneficiary_name: str
    beneficiary_iban: str
    amount: float
    currency: str = "DT"
    merchant_category: str = "Crypto Exchange"
    transaction_type: str = "STANDARD_TRANSFER"
    
    # Feature context
    hour_of_day: int = 12
    is_night_transaction: int = 0
    time_since_last_txn_hrs: float = 24.0
    is_international: int = 0
    failed_attempts: int = 0
    pin_changed_recently: int = 0

class TransactionResponse(BaseModel):
    id: str
    case_id: str
    salted_input_hash: str
    value_tier: int
    required_approvals: int
    deadline: datetime
    status: str

class CaseSummary(BaseModel):
    case_id: str
    amount: float
    currency: str
    beneficiary_name: str
    merchant_category: str
    transaction_type: Optional[str] = None
    ai_risk_score: Optional[int] = None
    risk_score: Optional[int] = None
    risk_level: Optional[str] = None
    status: str
    value_tier: int
    required_approvals: int
    approval_count: int
    created_at: datetime
    deadline: datetime
    certificate_id: Optional[int] = None

class CaseListResponse(BaseModel):
    total: int
    items: List[CaseSummary]

class ApprovalRecordSchema(BaseModel):
    approver: str
    role: str
    decision: Optional[str] = "APPROVED"
    comment_hash: str
    is_override: bool
    justification_text: Optional[str] = None
    timestamp: datetime

class SyncStatusRequest(BaseModel):
    justification: Optional[str] = None
    decision: Optional[str] = "APPROVED"
    role: Optional[str] = None
    approver: Optional[str] = None
    comment_hash: Optional[str] = None

class CaseDetailResponse(BaseModel):
    case_id: str
    transaction: Dict[str, Any]
    status: str
    value_tier: int
    required_approvals: int
    approval_count: int
    deadline: datetime
    certificate_id: Optional[int] = None
    salted_input_hash: str
    ai_assessment: Optional[Dict[str, Any]] = None
    approvals: List[ApprovalRecordSchema]
    is_escalated: bool = False

# -----------------------------------------------------------------------------
# AI Schemas
# -----------------------------------------------------------------------------
class AIAssessResponse(BaseModel):
    case_id: str
    risk_score: int
    risk_level: str
    model_version: str
    explanation_hash: str
    shap_summary: Dict[str, Any]
    fraud_probability: float

# -----------------------------------------------------------------------------
# Cryptography & Comment Hash Schemas
# -----------------------------------------------------------------------------
class CommentHashRequest(BaseModel):
    justification: str

class CommentHashResponse(BaseModel):
    comment_hash: str

class VerifyIntegrityResponse(BaseModel):
    case_id: str
    is_valid: bool
    status: str
    on_chain_hash: str
    recomputed_hash: str
    calculated_hash: Optional[str] = None
    tampered_fields: List[Dict[str, Any]] = []
    current_data: Optional[Dict[str, Any]] = None
    secret_salt: Optional[str] = None

class TamperSimulationRequest(BaseModel):
    altered_amount: Optional[float] = None
    altered_beneficiary: Optional[str] = None

# -----------------------------------------------------------------------------
# Execution Simulator Schemas
# -----------------------------------------------------------------------------
class ExecutionResponse(BaseModel):
    id: str
    case_id: str
    idempotency_key: str
    status: str
    simulated_channel: str
    executed_at: datetime
