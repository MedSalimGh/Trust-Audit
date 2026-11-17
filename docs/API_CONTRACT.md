# TrustAudit — REST API Contract & Specification

## 1. Global API Standards

- **Base URL**: `/api/v1`
- **Protocol**: HTTP/1.1 or HTTP/2 over TLS (or localhost for development)
- **Data Exchange Format**: `application/json`
- **Authentication**: Bearer Token (JWT issued after EIP-4361 SIWE signature verification)
- **Error Response Standard**: RFC 7807 Problem Details
  ```json
  {
    "type": "https://trustaudit.bank/errors/unauthorized-action",
    "title": "Forbidden",
    "status": 403,
    "detail": "Wallet 0x1234 does not hold COMPLIANCE_ROLE",
    "instance": "/api/v1/cases/0xabcd/evidence"
  }
  ```

---

## 2. Authentication Endpoints

### 2.1 Generate Authentication Nonce
- **`POST /api/v1/auth/nonce`**
- **Description**: Generates a cryptographic nonce for Sign-In with Ethereum (SIWE).
- **Request Body**:
  ```json
  {
    "wallet_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "chain_id": 1337
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "nonce": "a8f7c9b2e4d1f038",
    "message": "trustaudit.bank wants you to sign in with your Ethereum account:\n0x7099...\n\nURI: http://localhost:5173\nVersion: 1\nChain ID: 1337\nNonce: a8f7c9b2e4d1f038\nIssued At: 2026-11-14T12:00:00Z"
  }
  ```

### 2.2 Verify Wallet Signature & Issue Session
- **`POST /api/v1/auth/verify`**
- **Description**: Verifies EIP-191 / EIP-4361 signature against issued nonce; creates session.
- **Request Body**:
  ```json
  {
    "message": "trustaudit.bank wants you to sign in...",
    "signature": "0xabc123..."
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "expires_in": 86400,
    "wallet_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "roles": ["COMPLIANCE_ROLE"]
  }
  ```

### 2.3 Current Session Profile
- **`GET /api/v1/auth/me`**
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
  ```json
  {
    "wallet_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "roles": ["COMPLIANCE_ROLE"],
    "is_active": true
  }
  ```

---

## 3. Transactions & Cases Endpoints

### 3.1 Create Private Transaction & Generate Commitment
- **`POST /api/v1/transactions`**
- **Headers**: `Authorization: Bearer <token>` (Operator role required)
- **Request Body**:
  ```json
  {
    "customer_reference": "CUST-98214",
    "sender_iban": "TN59100012345678901234",
    "beneficiary_name": "International Holdings Ltd",
    "beneficiary_iban": "DE89370400440532013000",
    "amount": 60000.0,
    "currency": "DT",
    "merchant_category": "Crypto Exchange",
    "transaction_type": "CROSS_BORDER_WIRE",
    "hour_of_day": 2,
    "is_night_transaction": 1,
    "time_since_last_txn_hrs": 0.5,
    "is_international": 1,
    "failed_attempts": 2,
    "pin_changed_recently": 1
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "case_id": "0x4e6b2089456942c7a407335272a27ffb2a0d0e65306915fb6d354b6d49826d40",
    "salted_input_hash": "0x98f24b22c26f0bc0f98317a637db91386d493a7e584f22495d4d3d19e913a86c",
    "value_tier": 2,
    "deadline_seconds": 172800,
    "status": "DRAFT"
  }
  ```

### 3.2 List Cases
- **`GET /api/v1/cases?status=PENDING_APPROVAL&page=1&limit=20`**
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
  ```json
  {
    "total": 1,
    "page": 1,
    "items": [
      {
        "case_id": "0x4e6b2089...",
        "amount": 60000.0,
        "currency": "DT",
        "beneficiary_name": "International Holdings Ltd",
        "ai_risk_score": 87,
        "risk_level": "HIGH",
        "status": "PENDING_APPROVAL",
        "required_approvals": 3,
        "approval_count": 1,
        "created_at": "2026-11-14T12:05:00Z",
        "deadline": "2026-11-16T12:05:00Z"
      }
    ]
  }
  ```

### 3.3 Get Case Details
- **`GET /api/v1/cases/{caseId}`**
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**: Full case data, commitments, on-chain state, approver history.

### 3.4 Compute Justification Comment Hash
- **`POST /api/v1/cases/{caseId}/comment-hash`**
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "justification": "Confirmed with corporate treasury via callback. Verified invoices."
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "comment_hash": "0x7a3e9c..."
  }
  ```

---

## 4. AI & Explainability Endpoints

### 4.1 Trigger AI Assessment (Automated or Manual Retry)
- **`POST /api/v1/ai/assess/{caseId}`**
- **Response (200 OK)**:
  ```json
  {
    "case_id": "0x4e6b2089...",
    "risk_score": 87,
    "risk_level": "HIGH",
    "model_version": "fdm-rf-v1.0.0",
    "explanation_hash": "0x12ab89...",
    "top_factors": [
      {"feature": "merchant_category", "value": "Crypto Exchange", "impact": "+0.31"},
      {"feature": "transaction_amount", "value": 60000.0, "impact": "+0.24"},
      {"feature": "failed_attempts", "value": 2, "impact": "+0.15"}
    ]
  }
  ```

---

## 5. Cryptography & Audit Endpoints

### 5.1 Verify Case Integrity ("Tamper Lab")
- **`POST /api/v1/audit/{caseId}/verify`**
- **Headers**: `Authorization: Bearer <token>` (Auditor or Compliance role)
- **Response (200 OK - Valid)**:
  ```json
  {
    "case_id": "0x4e6b2089...",
    "status": "INTEGRITY_VERIFIED",
    "is_valid": true,
    "on_chain_hash": "0x98f24b22c26f0bc0f98317a637db91386d493a7e584f22495d4d3d19e913a86c",
    "recomputed_hash": "0x98f24b22c26f0bc0f98317a637db91386d493a7e584f22495d4d3d19e913a86c",
    "tampered_fields": []
  }
  ```
- **Response (200 OK - Tampered Simulation)**:
  ```json
  {
    "case_id": "0x4e6b2089...",
    "status": "TAMPERING_DETECTED",
    "is_valid": false,
    "on_chain_hash": "0x98f24b22c26f0bc0f98317a637db91386d493a7e584f22495d4d3d19e913a86c",
    "recomputed_hash": "0x3310a01984bc783421d019efaa98129841804bc495d4d3d19e913a86c1284920",
    "tampered_fields": [
      {
        "field": "amount",
        "stored_value": 6000.0,
        "original_commitment_reference": "Discrepancy detected"
      }
    ]
  }
  ```

---

## 6. Execution Simulator Endpoints

### 6.1 List Simulated Bank Executions
- **`GET /api/v1/executions`**
- **Response (200 OK)**:
  ```json
  [
    {
      "execution_id": "exec-99214-a1",
      "case_id": "0x4e6b2089...",
      "idempotency_key": "0x7719284...",
      "execution_status": "EXECUTED",
      "executed_at": "2026-11-14T12:30:15Z",
      "simulated_channel": "CORE_BANKING_RTGS"
    }
  ]
  ```
