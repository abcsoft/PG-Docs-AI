import time
import uuid
from dataclasses import dataclass
from functools import lru_cache
from typing import Annotated, Any

import httpx
import jwt
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.db import get_db
from src.core.errors import AuthServiceUnavailable, Unauthorized

JWT_ALGORITHMS = ["EdDSA"]  # Better Auth signs with Ed25519 by default


class JwksCache:
    """Fetches and caches the Better Auth JWKS.

    Keys rotate rarely; a short TTL plus an on-miss refresh covers rotation
    without hitting the auth service on every request.
    """

    def __init__(self, url: str, ttl_seconds: float = 300) -> None:
        self._url = url
        self._ttl = ttl_seconds
        self._keys: dict[str, jwt.PyJWK] = {}
        self._fetched_at: float | None = None

    async def _refresh(self) -> None:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(self._url)
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise AuthServiceUnavailable() from exc
        self._keys = {
            key_data["kid"]: jwt.PyJWK(key_data)
            for key_data in response.json().get("keys", [])
            if "kid" in key_data
        }
        self._fetched_at = time.monotonic()

    async def get_key(self, kid: str) -> jwt.PyJWK:
        is_stale = self._fetched_at is None or time.monotonic() - self._fetched_at > self._ttl
        if is_stale or kid not in self._keys:
            await self._refresh()
        try:
            return self._keys[kid]
        except KeyError as exc:
            raise Unauthorized("Unknown signing key") from exc


@lru_cache
def get_jwks_cache() -> JwksCache:
    return JwksCache(get_settings().auth_jwks_url)


@dataclass(frozen=True)
class AuthenticatedUser:
    user_id: str
    email: str | None
    name: str | None = None
    # Set when the request authenticated with a workspace API key: the key
    # is org-scoped, so the org is fixed by the key, not by X-Org-Id.
    api_key_org_id: uuid.UUID | None = None


async def get_current_user(
    request: Request,
    jwks: Annotated[JwksCache, Depends(get_jwks_cache)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AuthenticatedUser:
    scheme, _, token = request.headers.get("Authorization", "").partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise Unauthorized("Missing bearer token")

    # Workspace API keys (pgda_…) authenticate against their SHA-256 hash —
    # only that hash is stored, so a database leak leaks no usable keys.
    from src.domains.apikeys.models import KEY_PREFIX

    if token.startswith(KEY_PREFIX):
        from src.domains.apikeys.service import authenticate_request_key

        record = await authenticate_request_key(db, token)
        if record is None:
            raise Unauthorized("Invalid API key")
        await db.commit()
        return AuthenticatedUser(
            user_id=f"apikey:{record.prefix}",
            email=None,
            name=record.name,
            api_key_org_id=record.tenant_id,
        )

    try:
        kid = jwt.get_unverified_header(token).get("kid")
    except jwt.InvalidTokenError as exc:
        raise Unauthorized("Malformed token") from exc
    if not kid:
        raise Unauthorized("Missing key id")

    key = await jwks.get_key(kid)
    settings = get_settings()
    try:
        claims: dict[str, Any] = jwt.decode(
            token,
            key=key,
            algorithms=JWT_ALGORITHMS,
            audience=settings.auth_jwt_audience,
            issuer=settings.auth_jwt_issuer,
            options={"verify_aud": settings.auth_jwt_audience is not None},
        )
    except jwt.ExpiredSignatureError as exc:
        raise Unauthorized("Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise Unauthorized("Invalid token") from exc

    user_id = claims.get("sub")
    if not user_id:
        raise Unauthorized("Missing subject claim")
    return AuthenticatedUser(user_id=user_id, email=claims.get("email"), name=claims.get("name"))


CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
