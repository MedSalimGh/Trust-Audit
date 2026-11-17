import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.database import init_db
from app.core.security import create_access_token

# Ensure tables exist for tests
init_db()

client = TestClient(app)

# ─── Test JWT helper ──────────────────────────────────────────────────────────
# Creates a valid JWT for a test wallet with all roles so every endpoint is
# accessible. This does NOT bypass auth — it proves auth enforcement works
# because without this token, every protected endpoint returns 401.

TEST_WALLET = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
TEST_ROLES = ["OPERATOR", "COMPLIANCE", "RISK_MANAGER", "DIRECTOR", "AUDITOR", "ADMIN"]


def _auth_headers() -> dict:
    """Return Authorization header with a valid test JWT."""
    token = create_access_token(data={"sub": TEST_WALLET, "roles": TEST_ROLES})
    return {"Authorization": f"Bearer {token}"}


# ─── Tests ────────────────────────────────────────────────────────────────────

def test_api_root_and_health():
    res_root = client.get("/")
    assert res_root.status_code == 200
    assert res_root.json()["status"] == "online"

    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "healthy"

def test_auth_nonce():
    res = client.post("/api/v1/auth/nonce", json={
        "wallet_address": TEST_WALLET,
        "chain_id": 1337
    })
    assert res.status_code == 200
    data = res.json()
    assert "nonce" in data
    assert "message" in data

def test_protected_endpoint_rejects_unauthenticated():
    """Verify that protected endpoints return 401 without a JWT."""
    res = client.post("/api/v1/transactions", json={
        "customer_reference": "CUST-UNAUTH-001",
        "sender_iban": "TN59100012345678901234",
        "beneficiary_name": "Test",
        "beneficiary_iban": "DE89370400440532013000",
        "amount": 1000.0,
        "currency": "DT",
        "merchant_category": "Retail",
        "transaction_type": "DOMESTIC",
        "hour_of_day": 12,
        "is_night_transaction": 0,
        "time_since_last_txn_hrs": 24.0,
        "is_international": 0,
        "failed_attempts": 0,
        "pin_changed_recently": 0,
    })
    assert res.status_code == 401

def test_full_transaction_and_tamper_lifecycle():
    headers = _auth_headers()

    # 1. Create Transaction
    payload = {
        "customer_reference": "CUST-TEST-001",
        "sender_iban": "TN59100012345678901234",
        "beneficiary_name": "Offshore Global",
        "beneficiary_iban": "DE89370400440532013000",
        "amount": 60000.0,
        "currency": "DT",
        "merchant_category": "Crypto Exchange",
        "transaction_type": "CROSS_BORDER",
        "hour_of_day": 3,
        "is_night_transaction": 1,
        "time_since_last_txn_hrs": 0.1,
        "is_international": 1,
        "failed_attempts": 3,
        "pin_changed_recently": 1
    }

    res_create = client.post("/api/v1/transactions", json=payload, headers=headers)
    assert res_create.status_code == 201
    create_data = res_create.json()
    case_id = create_data["case_id"]
    assert create_data["value_tier"] == 2  # Tier 3 (> 50,000 DT)
    assert create_data["required_approvals"] == 3

    # 2. Run AI Assessment
    res_ai = client.post(f"/api/v1/ai/assess/{case_id}", headers=headers)
    assert res_ai.status_code == 200
    ai_data = res_ai.json()
    assert 0 <= ai_data["risk_score"] <= 100
    assert ai_data["explanation_hash"].startswith("0x")

    # 3. Verify Initial Integrity (Should be valid)
    res_verify = client.post(f"/api/v1/audit/{case_id}/verify", headers=headers)
    assert res_verify.status_code == 200
    verify_data = res_verify.json()
    assert verify_data["is_valid"] is True
    assert verify_data["status"] == "INTEGRITY_VERIFIED"

    # 4. Simulate Database Tampering (Altering amount 60,000 -> 6,000)
    res_tamper = client.post(f"/api/v1/audit/{case_id}/simulate-tamper", json={
        "altered_amount": 6000.0
    }, headers=headers)
    assert res_tamper.status_code == 200

    # 5. Verify Tampered Integrity (Should be detected!)
    res_verify2 = client.post(f"/api/v1/audit/{case_id}/verify", headers=headers)
    assert res_verify2.status_code == 200
    verify_data2 = res_verify2.json()
    assert verify_data2["is_valid"] is False
    assert verify_data2["status"] == "TAMPERING_DETECTED"
    assert len(verify_data2["tampered_fields"]) > 0
    assert verify_data2["tampered_fields"][0]["field"] == "amount"

    # 6. Restore Original Data
    res_restore = client.post(f"/api/v1/audit/{case_id}/restore", headers=headers)
    assert res_restore.status_code == 200

    # 7. Verify Restored Integrity (Should be valid again!)
    res_verify3 = client.post(f"/api/v1/audit/{case_id}/verify", headers=headers)
    assert res_verify3.status_code == 200
    assert res_verify3.json()["is_valid"] is True

    # 8. Clean up test records from database so tests never pollute production state
    from app.models.database import SessionLocal
    from app.models.models import AuditCase, Transaction, CryptographicCommitment, AIAssessment
    cleanup_db = SessionLocal()
    try:
        cleanup_db.query(AIAssessment).filter(AIAssessment.case_id == case_id).delete()
        cleanup_db.query(CryptographicCommitment).filter(CryptographicCommitment.case_id == case_id).delete()
        case_obj = cleanup_db.query(AuditCase).filter(AuditCase.case_id == case_id).first()
        if case_obj:
            t_id = case_obj.transaction_id
            cleanup_db.delete(case_obj)
            cleanup_db.query(Transaction).filter(Transaction.id == t_id).delete()
        cleanup_db.commit()
    finally:
        cleanup_db.close()
