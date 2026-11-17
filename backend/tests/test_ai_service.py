import pytest
from app.services.ai.ai_service import AIService

def test_ai_service_initialization_and_evaluation():
    service = AIService()
    assert service.classifier is not None
    assert service.explainer is not None

    sample_txn = {
        "amount": 60000.0,
        "currency": "DT",
        "merchant_category": "Crypto Exchange",
        "hour_of_day": 2,
        "is_night_transaction": 1,
        "time_since_last_txn_hrs": 0.2,
        "is_international": 1,
        "failed_attempts": 3,
        "pin_changed_recently": 1,
    }

    eval_result = service.evaluate(sample_txn, "0x1234567890abcdef")
    assert 0 <= eval_result["risk_score"] <= 100
    assert eval_result["risk_level"] in ["LOW", "MEDIUM", "HIGH"]
    assert eval_result["explanation_hash"].startswith("0x")
    assert len(eval_result["explanation_hash"]) == 66
    
    # Verify SHAP summary structure
    shap_summary = eval_result["shap_summary"]
    assert "top_positive_features" in shap_summary
    assert "top_negative_features" in shap_summary
    assert len(shap_summary["top_positive_features"]) <= 3
