# TrustAudit — AI Model Specification & Evaluation

## 1. Executive Summary & Purpose

The TrustAudit AI Engine provides **consultative fraud risk assessment and explainability** for financial transactions. Under Article 14 of the EU AI Act, the AI engine is classified as an advisory component within a High-Risk AI System. It possesses **zero autonomous decision-making power**: it cannot approve, reject, sign, or execute transactions.

Its mandate is:
1. Estimate transaction fraud probability $P(\text{fraud}) \in [0.0, 1.0]$.
2. Map probability to a standardized **0–100 Risk Score** and categorical level (`LOW`, `MEDIUM`, `HIGH`).
3. Generate local feature attributions via **SHAP (SHapley Additive exPlanations)**.
4. Compute an immutable cryptographic commitment (`explanationHash`) anchored on-chain to freeze the inference rationale in time.

---

## 2. Empirical Comparison of Candidate Kaggle Models

Two pre-trained models from Kaggle were provided and inspected directly in the local environment:

### 2.1 Model Candidate A: Airline Fraud Detection XGBoost
- **Source**: `Ml Fraud Detection Models/airline_fraud_xgboost.joblib` (Nibedita Sahu)
- **Artifact Architecture**: Serialized dictionary containing:
  - `model`: `xgboost.sklearn.XGBClassifier` (500 estimators, max_depth=6, lr=0.1, `scale_pos_weight`=65.48)
  - `preprocessor`: `sklearn.compose.ColumnTransformer`
  - `threshold`: 0.91
  - `metadata`: Validation ROC-AUC: 0.8936, Test ROC-AUC: 0.9067, Precision: 0.6319, Recall: 0.3742, F1: 0.4701
- **Expected Features (8)**:
  - Numeric: `amount`, `account_age_days`, `transaction_hour`, `transaction_dayofweek`
  - Categorical: `billing_country`, `route`, `card_bin`, `currency`
- **Domain Compatibility Assessment**:
  - **REJECTED FOR CORE BANKING TRANSFERS**.
  - The model was trained specifically on **commercial airline ticket purchases**. The mandatory feature `route` represents airport flight pairs (e.g., `JFK-LHR`, `CDG-DXB`), which do not exist in general banking wire transfers (IBAN-to-IBAN or interbank clearance). Forcing arbitrary airline flight route values into banking transactions violates domain integrity.

---

### 2.2 Model Candidate B: Financial Fraud Detection Model (FDM)
- **Source**: `Ml Fraud Detection Models/my_fraud_detection_model.pkl` (Oludare Shalom)
- **Artifact Architecture**: `sklearn.pipeline.Pipeline` containing:
  - `preprocessor`: `ColumnTransformer` with `OneHotEncoder(handle_unknown='ignore')` for 15 transaction categories and passthrough numeric features.
  - `classifier`: `RandomForestClassifier` (200 trees, `max_depth`=10, `class_weight='balanced'`, random_state=42).
- **Expected Features (9)**:
  1. `transaction_amount`: Size of the transfer in currency units (float).
  2. `merchant_category`: Categorical string (`ATM Withdrawal`, `Crypto Exchange`, `Electronics`, `Gaming`, `Jewelry`, `Online Shopping`, `Travel`, `Utilities`, etc.).
  3. `hour_of_day`: Hour of the day [0–23].
  4. `transaction_hour`: Hour of transaction [0–23].
  5. `is_night_transaction`: Binary flag [0 or 1] for off-hours transfers.
  6. `time_since_last_txn_hrs`: Velocity indicator (hours elapsed since prior transfer).
  7. `is_international`: Cross-border indicator [0 or 1].
  8. `failed_attempts`: Counter of prior failed authentication attempts [0, 1, 2, ...].
  9. `pin_changed_recently`: Recent security credential change indicator [0 or 1].
- **Domain Compatibility Assessment**:
  - **SELECTED AS PRIMARY PRODUCTION CANDIDATE**.
  - Features directly map to core banking fraud detection signals: velocity, transaction size, international routing, credential modifications, and anomalous categories (such as uncharacteristic `Crypto Exchange` or high-value `Wire Transfer` outflows).

---

## 3. Preprocessing, Compatibility & Serialization Resolution

### 3.1 Scikit-Learn Version Compatibility Handling
The FDM model artifact was serialized with Scikit-learn 1.6.1, whereas modern development environments operate on Scikit-learn 1.8.x. In 1.8.x, internal class representations of `_RemainderColsList` in `ColumnTransformer` were refactored.

**Implementation Solution**:
The TrustAudit AI service uses a decoupled, robust feature transformer adapter:
1. Extracts the fitted `OneHotEncoder` directly from `pipeline.named_steps['preprocessor'].named_transformers_['cat']`.
2. Encodes the categorical `merchant_category` into 15 binary dummy variables.
3. Assembles the 8 remainder numeric features in exact training order.
4. Produces the deterministic 23-column input matrix expected by `RandomForestClassifier.predict_proba()`.
5. Re-exports the unified pipeline cleanly using modern `joblib` for zero-warning, high-speed production inference.

---

## 4. Risk Score Calibration & Categorization

The raw output of the Random Forest classifier is the estimated probability of fraud:
$$P(\text{fraud}) \in [0.0, 1.0]$$

### 4.1 Standardized Risk Score Formula
$$\text{RiskScore} = \text{round}\big(P(\text{fraud}) \times 100\big) \in [0, 100]$$

### 4.2 Categorical Risk Levels

| Score Range | Risk Level Enum | Contract Quorum Consequence |
| :---: | :---: | :--- |
| **0 – 29** | `RiskLevel.LOW` (0) | Standard tier quorum (1 Compliance Officer for Tier 1/2). |
| **30 – 69** | `RiskLevel.MEDIUM` (1) | Standard tier quorum; flagged for standard review. |
| **70 – 100**| `RiskLevel.HIGH` (2) | **Triggers On-Chain High-Risk Overlay**: Mandates Risk Manager review regardless of transaction amount. |

---

## 5. Explainability (SHAP) & Cryptographic Anchoring

### 5.1 Local Feature Attribution
For every evaluated transaction, the AI service runs `shap.TreeExplainer(random_forest_model)` on the assembled feature matrix.
It isolates:
- **Top 3 Risk-Increasing Factors** (highest positive SHAP values).
- **Top 3 Risk-Decreasing Factors** (lowest negative SHAP values).

### 5.2 Canonical Explanation Hash Formulation
To prevent retroactive tampering with AI explanations:
```json
{
  "base_value": 0.42,
  "case_id": "0x1234...",
  "model_version": "fdm-rf-v1.0.0",
  "risk_score": 87,
  "top_positive_features": [
    {"feature": "merchant_category_Crypto Exchange", "impact": 0.28},
    {"feature": "failed_attempts", "impact": 0.19},
    {"feature": "is_night_transaction", "impact": 0.12}
  ]
}
```
$$\text{explanationHash} = \text{SHA256}\Big(\text{"TrustAudit:XAI:v1"} \parallel \text{JCS}(\text{SHAP\_Summary})\Big)$$
This 32-byte hash is recorded on-chain by the Oracle in `recordAIAssessment()`.

---

## 6. Model Governance & Fallback Policy

1. **Advisory Invariant**: The AI engine can never sign transactions, grant approvals, or reject cases.
2. **Missing Feature / Inference Failure**:
   - If required features cannot be computed, or if the model service encounters an unhandled exception:
     - The case state remains in `REGISTERED`.
     - An error alert `AI_ASSESSMENT_UNAVAILABLE` is raised.
     - **Safety Invariant**: Under no circumstance is a failing AI model treated as "LOW risk".
     - Approval can only proceed under an explicit manual emergency fallback policy authorized by a Director.
