import hashlib
import secrets
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.errors import Conflict, NotFound
from src.core.repository import TenantScopedRepository
from src.core.tenancy import TenantContext
from src.domains.apikeys.models import KEY_ID_CHARS, KEY_PREFIX, KEY_SECRET_CHARS, ApiKey


def hash_key(full_key: str) -> str:
    return hashlib.sha256(full_key.encode()).hexdigest()


async def find_active_key(db: AsyncSession, key_hash: str) -> ApiKey | None:
    """Global lookup by unique hash — used by the auth layer before any
    tenant context exists. The returned row carries its owning org."""
    result = await db.execute(
        select(ApiKey).where(ApiKey.key_hash == key_hash, ApiKey.revoked_at.is_(None))
    )
    return result.scalar_one_or_none()


async def authenticate_request_key(db: AsyncSession, full_key: str) -> ApiKey | None:
    """Resolve a presented bearer key, stamping throttled last-used state."""
    record = await find_active_key(db, hash_key(full_key))
    if record is None:
        return None
    now = datetime.now(UTC)
    if record.last_used_at is None or (now - record.last_used_at).total_seconds() > 60:
        record.last_used_at = now
        await db.flush()
    return record


class ApiKeyRepository(TenantScopedRepository[ApiKey]):
    model = ApiKey


@dataclass(frozen=True)
class CreatedKey:
    key: str  # the full key — shown once
    record: ApiKey


class ApiKeyService:
    def __init__(self, db: AsyncSession, tenant: TenantContext) -> None:
        self._db = db
        self._tenant = tenant
        self._repository = ApiKeyRepository(db, tenant)

    async def list_keys(self) -> list[ApiKey]:
        result = await self._db.execute(
            self._repository._query().order_by(ApiKey.created_at.desc())
        )
        return list(result.scalars().all())

    async def create_key(self, name: str, created_by: str) -> CreatedKey:
        existing = await self.list_keys()
        if any(k.name == name and k.revoked_at is None for k in existing):
            raise Conflict(f"An API key named '{name}' already exists")
        key_id = secrets.token_hex(KEY_ID_CHARS // 2)
        secret = secrets.token_urlsafe(KEY_SECRET_CHARS)[:KEY_SECRET_CHARS]
        full_key = f"{KEY_PREFIX}{key_id}{secret}"
        record = self._repository.add(
            ApiKey(
                name=name,
                prefix=f"{KEY_PREFIX}{key_id}",
                key_hash=hash_key(full_key),
                created_by=created_by,
            )
        )
        await self._db.flush()
        return CreatedKey(key=full_key, record=record)

    async def revoke_key(self, key_id: uuid.UUID) -> None:
        record = await self._repository.get(key_id)
        if record is None:
            raise NotFound("API key not found")
        record.revoked_at = datetime.now(UTC)
        await self._db.flush()
