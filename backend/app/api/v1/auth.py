import time
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.schemas import (
    NonceRequest, NonceResponse, VerifySignatureRequest,
    AuthTokenResponse, UserProfile
)
from app.core.security import (
    generate_siwe_nonce, recover_signer_from_message,
    create_access_token, decode_access_token
)
from app.core.dependencies import get_current_user, AuthenticatedUser
from app.services.blockchain.blockchain_service import blockchain_service

logger = logging.getLogger("trustaudit.auth")

router = APIRouter(prefix="/auth", tags=["Authentication"])

# ─── Nonce Cache ──────────────────────────────────────────────────────────────
# Stores { wallet_address_lower: (nonce, created_timestamp) }
# Nonces expire after 5 minutes and are single-use (deleted after verify).
_NONCE_CACHE: dict[str, tuple[str, float]] = {}
_NONCE_EXPIRY_SECONDS = 300  # 5 minutes


def _cleanup_expired_nonces() -> None:
    """Remove expired nonces from the cache."""
    now = time.time()
    expired = [k for k, (_, ts) in _NONCE_CACHE.items() if now - ts > _NONCE_EXPIRY_SECONDS]
    for k in expired:
        del _NONCE_CACHE[k]


@router.post("/nonce", response_model=NonceResponse)
def get_nonce(req: NonceRequest):
    """Generate a single-use nonce for SIWE authentication."""
    _cleanup_expired_nonces()

    nonce = generate_siwe_nonce()
    wallet_key = req.wallet_address.lower()
    _NONCE_CACHE[wallet_key] = (nonce, time.time())

    message = (
        f"trustaudit.bank wants you to sign in with your Ethereum account:\n"
        f"{req.wallet_address}\n\n"
        f"URI: http://localhost:5173\n"
        f"Version: 1\n"
        f"Chain ID: {req.chain_id}\n"
        f"Nonce: {nonce}"
    )
    return NonceResponse(nonce=nonce, message=message)


@router.post("/verify", response_model=AuthTokenResponse)
def verify_signature(req: VerifySignatureRequest):
    """Verify wallet signature and issue JWT bearer token."""
    recovered_address = recover_signer_from_message(req.message, req.signature)
    if not recovered_address:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid wallet signature"
        )

    # ── Nonce validation: single-use + expiry ──
    wallet_key = recovered_address.lower()
    cached = _NONCE_CACHE.get(wallet_key)
    if cached is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No nonce found for this wallet. Request a new nonce."
        )

    stored_nonce, stored_time = cached
    # Delete immediately — single-use enforcement
    del _NONCE_CACHE[wallet_key]

    # Check expiry
    if time.time() - stored_time > _NONCE_EXPIRY_SECONDS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nonce expired. Please request a new nonce."
        )

    # Verify the nonce is present in the signed message
    if stored_nonce not in req.message:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nonce mismatch — possible replay attack."
        )

    # ── Resolve on-chain roles ──
    roles: list[str] = []
    role_names = [
        "OPERATOR_ROLE", "AI_ORACLE_ROLE", "COMPLIANCE_ROLE",
        "RISK_MANAGER_ROLE", "DIRECTOR_ROLE", "AUDITOR_ROLE"
    ]
    for r in role_names:
        if blockchain_service.has_role(r, recovered_address):
            roles.append(r)

    # Fallback: check manifest role mappings (Ganache demo)
    manifest_roles = blockchain_service.manifest.get("roles", {})
    for role_key, addr in manifest_roles.items():
        if addr.lower() == recovered_address.lower():
            role_enum_name = f"{role_key.upper()}_ROLE"
            if role_key == "riskManager":
                role_enum_name = "RISK_MANAGER_ROLE"
            if role_enum_name not in roles:
                roles.append(role_enum_name)

    logger.info(f"Wallet authenticated: {recovered_address} | Roles: {roles}")

    token = create_access_token({
        "sub": recovered_address,
        "roles": roles
    })

    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=86400,
        wallet_address=recovered_address,
        roles=roles
    )


@router.get("/me", response_model=UserProfile)
async def get_profile(user: AuthenticatedUser = Depends(get_current_user)):
    """Return the currently authenticated user's profile from their JWT."""
    return UserProfile(
        wallet_address=user.wallet_address,
        roles=user.roles,
        is_active=True
    )
