import os
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
import shap
import joblib

# Handle scikit-learn 1.6 -> 1.8 unpickling compatibility
import sklearn.compose._column_transformer as ct
if not hasattr(ct, '_RemainderColsList'):
    class _RemainderColsList(list):
        pass
    ct._RemainderColsList = _RemainderColsList

from app.services.crypto.crypto_service import CryptoService

logger = logging.getLogger("trustaudit.ai")

class AIService:
    """
    TrustAudit Consultative AI Risk & Explainability Engine.
    Exclusively advisory under EU AI Act Article 14. Zero autonomous execution authority.
    """
    MODEL_VERSION = "fdm-rf-v1.0.0"
    
    # Expected categorical classes from training
    EXPECTED_CATEGORIES = [
        'ATM Withdrawal', 'Clothing', 'Crypto Exchange', 'Education', 'Electronics',
        'Entertainment', 'Fuel', 'Gaming', 'Grocery', 'Healthcare', 'Jewelry',
        'Online Shopping', 'Restaurant', 'Travel', 'Utilities'
    ]
    
    NUMERIC_COLUMNS = [
        'hour_of_day', 'is_night_transaction', 'transaction_amount',
        'time_since_last_txn_hrs', 'is_international', 'failed_attempts',
        'pin_changed_recently', 'transaction_hour'
    ]

    def __init__(self, model_path: Optional[str] = None):
        if model_path is None:
            # Default to the verified model in Ml Fraud Detection Models
            current_dir = Path(__file__).resolve().parent
            project_root = current_dir.parent.parent.parent.parent
            model_path = str(project_root / "Ml Fraud Detection Models" / "my_fraud_detection_model.pkl")

        self.model_path = model_path
        self._load_model()

    def _load_model(self):
        try:
            logger.info(f"Loading verified fraud detection model from: {self.model_path}")
            pipeline = joblib.load(self.model_path)
            
            # Extract components
            preprocessor = pipeline.named_steps['preprocessor']
            self.cat_encoder = preprocessor.named_transformers_['cat']
            self.classifier = pipeline.named_steps['classifier']
            
            # Initialize TreeExplainer for SHAP local attributions
            self.explainer = shap.TreeExplainer(self.classifier)
            logger.info("AI Model & SHAP TreeExplainer initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to load AI model: {e}")
            raise RuntimeError(f"AI Model initialization failure: {e}")

    def prepare_features(self, txn: Dict[str, Any]) -> Tuple[np.ndarray, List[str]]:
        """
        Transforms transaction dictionary into 23-dimension model matrix:
        15 one-hot encoded categories + 8 numeric features.
        """
        # 1. Categorical encoding
        merchant_cat = txn.get("merchant_category", "Online Shopping")
        cat_df = pd.DataFrame([{"merchant_category": merchant_cat}])
        cat_encoded = self.cat_encoder.transform(cat_df)
        if hasattr(cat_encoded, "toarray"):
            cat_encoded = cat_encoded.toarray()

        cat_feature_names = [f"category_{c}" for c in self.cat_encoder.categories_[0]]

        # 2. Numeric features extraction with default fallbacks
        hour = int(txn.get("hour_of_day", txn.get("transaction_hour", 12)))
        amount = float(txn.get("amount", txn.get("transaction_amount", 1000.0)))
        is_night = int(txn.get("is_night_transaction", 1 if (hour < 6 or hour > 22) else 0))
        time_since_last = float(txn.get("time_since_last_txn_hrs", 24.0))
        is_intl = int(txn.get("is_international", 1 if str(txn.get("currency", "DT")).upper() != "DT" else 0))
        failed = int(txn.get("failed_attempts", 0))
        pin_changed = int(txn.get("pin_changed_recently", 0))

        num_values = np.array([[
            hour,
            is_night,
            amount,
            time_since_last,
            is_intl,
            failed,
            pin_changed,
            hour
        ]], dtype=float)

        all_feature_names = cat_feature_names + self.NUMERIC_COLUMNS
        X_final = np.hstack([cat_encoded, num_values])
        return X_final, all_feature_names

    def evaluate(self, txn: Dict[str, Any], case_id: str) -> Dict[str, Any]:
        """
        Evaluates transaction risk and computes local SHAP explanations.
        Advisory only: does not grant approval authority.
        """
        X, feature_names = self.prepare_features(txn)
        
        # Predict probability of fraud class (index 1)
        probabilities = self.classifier.predict_proba(X)[0]
        fraud_prob = float(probabilities[1])
        
        # 0-100 Risk Score
        risk_score = int(round(fraud_prob * 100))
        
        # Risk Category
        if risk_score >= 70:
            risk_level = "HIGH"
            risk_level_enum = 2
        elif risk_score >= 30:
            risk_level = "MEDIUM"
            risk_level_enum = 1
        else:
            risk_level = "LOW"
            risk_level_enum = 0

        # SHAP calculation
        shap_values = self.explainer.shap_values(X)
        
        # Handle SHAP output format (binary classification: take class 1)
        if isinstance(shap_values, list) and len(shap_values) == 2:
            shap_for_fraud = shap_values[1][0]
        elif isinstance(shap_values, np.ndarray) and shap_values.ndim == 3:
            shap_for_fraud = shap_values[0, :, 1]
        else:
            shap_for_fraud = np.array(shap_values).flatten()

        # Extract top 3 positive (risk-increasing) and top 3 negative (risk-reducing) features
        feature_impacts = []
        for name, impact in zip(feature_names, shap_for_fraud):
            feature_impacts.append({
                "feature": name,
                "impact": round(float(impact), 4)
            })

        # Sort features by impact
        sorted_by_impact = sorted(feature_impacts, key=lambda x: x["impact"], reverse=True)
        top_positive = [f for f in sorted_by_impact if f["impact"] > 0][:3]
        top_negative = [f for f in sorted_by_impact if f["impact"] < 0][-3:]

        shap_summary = {
            "case_id": case_id,
            "model_version": self.MODEL_VERSION,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "top_positive_features": top_positive,
            "top_negative_features": top_negative,
        }

        # Compute on-chain explanation commitment
        explanation_hash = CryptoService.compute_explanation_hash(shap_summary)

        return {
            "case_id": case_id,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "risk_level_enum": risk_level_enum,
            "model_version": self.MODEL_VERSION,
            "explanation_hash": explanation_hash,
            "shap_summary": shap_summary,
            "fraud_probability": round(fraud_prob, 4),
        }
