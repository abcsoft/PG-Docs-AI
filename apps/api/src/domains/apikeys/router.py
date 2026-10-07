import uuid
from datetime import datetime

from fastapi import APIRouter, status
from pydantic import BaseModel, Field
from src.core.db import DbSession
from src.core.errors import Forbidden
from src.core.tenancy import CurrentTenant, TenantContext
from src.domains.apikeys.service import ApiKeyService

router = APIRouter(prefix="/api-keys", tags=["api-keys"])


class ApiKeyOut(BaseModel):
    id: uuid.UUID
    name: str
    prefix: str
    last_used_at: datetime | None
    revoked_at: datetime | None
    created_at: datetime


class ApiKeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class ApiKeyCreatedOut(BaseModel):
    """The full key appears exactly once, in this response."""

    key: str
    record: ApiKeyOut


def _require_admin(tenant: TenantContext) -> None:
    if tenant.role not in ("owner", "admin"):
        raise Forbidden("Only owners and admins can manage API keys")


@router.get("")
async def list_api_keys(tenant: CurrentTenant, db: DbSession) -> list[ApiKeyOut]:
    _require_admin(tenant)
    keys = await ApiKeyService(db, tenant).list_keys()
    return [ApiKeyOut.model_validate(k, from_attributes=True) for k in keys]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_api_key(
    payload: ApiKeyCreate, tenant: CurrentTenant, db: DbSession
) -> ApiKeyCreatedOut:
    _require_admin(tenant)
    created = await ApiKeyService(db, tenant).create_key(payload.name, tenant.user_id)
    response = ApiKeyCreatedOut(
        key=created.key, record=ApiKeyOut.model_validate(created.record, from_attributes=True)
    )
    await db.commit()
    return response


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(key_id: uuid.UUID, tenant: CurrentTenant, db: DbSession) -> None:
    _require_admin(tenant)
    await ApiKeyService(db, tenant).revoke_key(key_id)
    await db.commit()
