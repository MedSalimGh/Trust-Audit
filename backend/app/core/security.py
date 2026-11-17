import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
from eth_account.messages import encode_defunct
from eth_account import Account
from app.core.config import settings

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generate signed JWT bearer token for authenticated session."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate JWT bearer token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except Exception:
        return None

def generate_siwe_nonce() -> str:
    """Generate a random 16-character alphanumeric nonce."""
    return secrets.token_hex(8)

def recover_signer_from_message(message: str, signature: str) -> Optional[str]:
    """Recover Ethereum wallet address from signed message."""
    try:
        signable_msg = encode_defunct(text=message)
        recovered_address = Account.recover_message(signable_msg, signature=signature)
        return recovered_address.lower()
    except Exception:
        return None
