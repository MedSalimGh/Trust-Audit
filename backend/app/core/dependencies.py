"""
FastAPI dependency injection for authentication and authorization.
Uses JWT bearer tokens from the wallet SIWE auth flow.
"""
import time
from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import decode_access_token

security_scheme = HTTPBearer(auto_error=False)


class AuthenticatedUser:
    """Represents a verified JWT payload."""
    __slots__ = ("wallet_address", "roles", "exp")

    def __init__(self, wallet_address: str, roles: List[str], exp: int):
        self.wallet_address = wallet_address
        self.roles = roles
        self.exp = exp

    @property
    def is_admin(self) -> bool:
        return "ADMIN_ROLE" in self.roles or "ADMIN" in self.roles


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> AuthenticatedUser:
    """
    Extract and validate JWT from Authorization: Bearer <token>.
    Raises 401 if token is missing, expired, or malformed.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please connect your wallet.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    wallet_address: Optional[str] = payload.get("sub")
    roles: List[str] = payload.get("roles", [])
    exp: int = payload.get("exp", 0)

    if not wallet_address:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing wallet address.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return AuthenticatedUser(wallet_address=wallet_address, roles=roles, exp=exp)


def require_role(*allowed_roles: str):
    """
    Dependency factory: returns a dependency that checks the user
    has at least one of the specified roles.

    Usage:
        @router.get("/admin", dependencies=[Depends(require_role("ADMIN_ROLE"))])
        def admin_only(): ...

    Or as parameter injection:
        def my_endpoint(user: AuthenticatedUser = Depends(require_role("OPERATOR_ROLE"))):
            ...
    """
    async def _check_role(
        user: AuthenticatedUser = Depends(get_current_user),
    ) -> AuthenticatedUser:
        # ADMIN bypass
        if user.is_admin:
            return user

        # Normalize: accept both "OPERATOR" and "OPERATOR_ROLE"
        user_role_set = set()
        for r in user.roles:
            user_role_set.add(r)
            user_role_set.add(r.replace("_ROLE", ""))

        allowed_set = set()
        for r in allowed_roles:
            allowed_set.add(r)
            allowed_set.add(r.replace("_ROLE", ""))

        if not user_role_set & allowed_set:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {', '.join(allowed_roles)}",
            )
        return user

    return _check_role
