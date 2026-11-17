import pytest
from app.services.crypto.crypto_service import CryptoService

def test_canonical_json_key_order_independence():
    dict1 = {"amount": 60000.0, "currency": "DT", "beneficiary": "ACME Corp"}
    dict2 = {"currency": "DT", "beneficiary": "ACME Corp", "amount": 60000.0}

    canonical1 = CryptoService.canonicalize_json(dict1)
    canonical2 = CryptoService.canonicalize_json(dict2)

    assert canonical1 == canonical2
    assert b" " not in canonical1.replace(b"ACME Corp", b"")  # no separator whitespace

def test_salt_generation_length():
    salt = CryptoService.generate_salt(32)
    assert len(salt) == 32
    assert isinstance(salt, bytes)

def test_salted_input_hash_deterministic():
    data = {"amount": 60000.0, "currency": "DT", "account": "TN5910001"}
    salt = b"\x00" * 32

    hash1 = CryptoService.compute_salted_input_hash(data, salt)
    hash2 = CryptoService.compute_salted_input_hash(data, salt)

    assert hash1 == hash2
    assert hash1.startswith("0x")
    assert len(hash1) == 66  # 0x + 64 hex chars

def test_tampering_detection():
    original_data = {"amount": 60000.0, "currency": "DT"}
    tampered_data = {"amount": 6000.0, "currency": "DT"}  # 1 zero removed
    salt = CryptoService.generate_salt(32)

    original_hash = CryptoService.compute_salted_input_hash(original_data, salt)
    tampered_hash = CryptoService.compute_salted_input_hash(tampered_data, salt)

    assert original_hash != tampered_hash

    # Run verification against original commitment
    res_valid = CryptoService.verify_integrity(original_data, salt, original_hash)
    assert res_valid["is_valid"] is True
    assert res_valid["status"] == "INTEGRITY_VERIFIED"

    res_tampered = CryptoService.verify_integrity(tampered_data, salt, original_hash)
    assert res_tampered["is_valid"] is False
    assert res_tampered["status"] == "TAMPERING_DETECTED"
