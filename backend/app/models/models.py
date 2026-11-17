import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime,
    ForeignKey, LargeBinary, Text, UniqueConstraint
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

def get_utc_now():
    return datetime.now(timezone.utc)

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_reference = Column(String(64), nullable=False)
    sender_iban = Column(String(34), nullable=False)
    sender_name = Column(String(128), nullable=True, default="Private Banking Client")
    beneficiary_name = Column(String(128), nullable=False)
    beneficiary_iban = Column(String(34), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False, default="DT")
    merchant_category = Column(String(64), nullable=False)
    transaction_type = Column(String(32), nullable=False, default="STANDARD_TRANSFER")
    
    # Context features for risk assessment
    hour_of_day = Column(Integer, default=12)
    is_night_transaction = Column(Integer, default=0)
    time_since_last_txn_hrs = Column(Float, default=24.0)
    is_international = Column(Integer, default=0)
    failed_attempts = Column(Integer, default=0)
    pin_changed_recently = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    audit_case = relationship("AuditCase", back_populates="transaction", uselist=False)

class CryptographicCommitment(Base):
    __tablename__ = "cryptographic_commitments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(66), unique=True, nullable=False, index=True)
    secret_salt = Column(LargeBinary, nullable=False)
    canonical_json = Column(Text, nullable=False)
    salted_input_hash = Column(String(66), nullable=False)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

class AuditCase(Base):
    __tablename__ = "audit_cases"

    case_id = Column(String(66), primary_key=True, index=True)
    transaction_id = Column(String(36), ForeignKey("transactions.id"), unique=True, nullable=False)
    operator_address = Column(String(42), nullable=False)
    status = Column(String(32), nullable=False, default="REGISTERED")
    value_tier = Column(Integer, nullable=False, default=0)
    required_approvals = Column(Integer, nullable=False, default=1)
    approval_count = Column(Integer, nullable=False, default=0)
    deadline = Column(DateTime(timezone=True), nullable=False)
    certificate_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=get_utc_now)

    transaction = relationship("Transaction", back_populates="audit_case")
    assessments = relationship("AIAssessment", back_populates="audit_case")
    approvals = relationship("Approval", back_populates="audit_case")
    execution = relationship("ExecutionRecord", back_populates="audit_case", uselist=False)

class AIAssessment(Base):
    __tablename__ = "ai_assessments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(66), ForeignKey("audit_cases.case_id"), nullable=False, index=True)
    model_version = Column(String(64), nullable=False)
    risk_score = Column(Integer, nullable=False)
    risk_level = Column(String(16), nullable=False)
    feature_snapshot = Column(Text, nullable=False)
    shap_summary = Column(Text, nullable=False)
    explanation_hash = Column(String(66), nullable=False)
    evaluated_at = Column(DateTime(timezone=True), default=get_utc_now)

    audit_case = relationship("AuditCase", back_populates="assessments")

class Approval(Base):
    __tablename__ = "approvals"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(66), ForeignKey("audit_cases.case_id"), nullable=False, index=True)
    approver_address = Column(String(42), nullable=False)
    role_signed = Column(String(32), nullable=False)
    decision = Column(String(16), nullable=False, default="APPROVED")
    is_override = Column(Boolean, nullable=False, default=False)
    justification_text = Column(Text, nullable=False)
    comment_hash = Column(String(66), nullable=False)
    transaction_hash = Column(String(66), nullable=True)
    timestamp = Column(DateTime(timezone=True), default=get_utc_now)

    audit_case = relationship("AuditCase", back_populates="approvals")

class ExecutionRecord(Base):
    __tablename__ = "execution_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(66), ForeignKey("audit_cases.case_id"), unique=True, nullable=False)
    idempotency_key = Column(String(66), unique=True, nullable=False, index=True)
    status = Column(String(24), nullable=False, default="EXECUTED")
    simulated_channel = Column(String(32), nullable=False, default="CORE_BANKING_RTGS")
    executed_at = Column(DateTime(timezone=True), default=get_utc_now)

    audit_case = relationship("AuditCase", back_populates="execution")

class BlockchainEvent(Base):
    __tablename__ = "blockchain_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    chain_id = Column(Integer, nullable=False)
    block_number = Column(Integer, nullable=False)
    transaction_hash = Column(String(66), nullable=False)
    log_index = Column(Integer, nullable=False)
    event_name = Column(String(64), nullable=False)
    event_data = Column(Text, nullable=False)
    processed = Column(Boolean, default=False)

    __table_args__ = (
        UniqueConstraint("chain_id", "transaction_hash", "log_index", name="uq_event_log"),
    )
