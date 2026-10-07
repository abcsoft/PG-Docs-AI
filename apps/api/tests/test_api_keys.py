import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.tenancy import TenantContext
from src.domains.documents.models import Document
from src.domains.tenants.models import Membership, Organization

from tests.conftest import AuthHeaderFactory


@pytest.fixture
async def tenant(db_session: AsyncSession) -> TenantContext:
    organization = Organization(name="Keys Co")
    organization.memberships = [Membership(user_id="alice", role="owner")]
    db_session.add(organization)
    await db_session.flush()
    return TenantContext(organization_id=organization.id, user_id="alice", role="owner")


@pytest.fixture
def org_headers(tenant: TenantContext, auth_headers: AuthHeaderFactory) -> dict[str, str]:
    return {**auth_headers(user_id="alice"), "X-Org-Id": str(tenant.organization_id)}


@pytest.fixture
async def document(db_session: AsyncSession, tenant: TenantContext) -> Document:
    document = Document(
        tenant_id=tenant.organization_id,
        name="doc.txt",
        mime_type="text/plain",
        size_bytes=10,
        created_by="alice",
        storage_path="x/doc.txt",
    )
    db_session.add(document)
    await db_session.flush()
    return document


async def _create_key(
    client: httpx.AsyncClient, org_headers: dict[str, str], name: str = "CI key"
) -> str:
    response = await client.post("/api-keys", json={"name": name}, headers=org_headers)
    assert response.status_code == 201, response.text
    return response.json()["key"]


async def test_key_shown_once_and_prefix_thereafter(
    client: httpx.AsyncClient, org_headers: dict[str, str]
) -> None:
    created = await client.post("/api-keys", json={"name": "CI key"}, headers=org_headers)
    assert created.status_code == 201
    full_key = created.json()["key"]
    assert full_key.startswith("pgda_")

    listing = await client.get("/api-keys", headers=org_headers)
    records = listing.json()
    assert [r["prefix"] for r in records] == [full_key[: len(full_key) - 32]]
    assert all("key" not in r or not r.get("key") for r in records)
    assert records[0]["revoked_at"] is None


async def test_key_authenticates_without_org_header(
    client: httpx.AsyncClient, org_headers: dict[str, str], document: Document
) -> None:
    full_key = await _create_key(client, org_headers)
    response = await client.get("/documents", headers={"Authorization": f"Bearer {full_key}"})
    assert response.status_code == 200
    assert [d["id"] for d in response.json()] == [str(document.id)]


async def test_key_cannot_be_pointed_at_another_org(
    db_session: AsyncSession,
    client: httpx.AsyncClient,
    org_headers: dict[str, str],
    tenant: TenantContext,
) -> None:
    other = Organization(name="Victim Co")
    other.memberships = [Membership(user_id="bob", role="owner")]
    db_session.add(other)
    await db_session.flush()

    full_key = await _create_key(client, org_headers)
    response = await client.get(
        "/documents",
        headers={"Authorization": f"Bearer {full_key}", "X-Org-Id": str(other.id)},
    )
    # The key is bound to its own org — the forged header is ignored.
    assert response.status_code == 200
    assert response.json() == []


async def test_revoked_key_is_rejected(
    client: httpx.AsyncClient, org_headers: dict[str, str]
) -> None:
    full_key = await _create_key(client, org_headers)
    listing = await client.get("/api-keys", headers=org_headers)
    key_id = listing.json()[0]["id"]

    revoked = await client.delete(f"/api-keys/{key_id}", headers=org_headers)
    assert revoked.status_code == 204

    response = await client.get("/documents", headers={"Authorization": f"Bearer {full_key}"})
    assert response.status_code == 401


async def test_garbage_key_rejected(client: httpx.AsyncClient) -> None:
    response = await client.get(
        "/documents", headers={"Authorization": "Bearer pgda_totallymadeup"}
    )
    assert response.status_code == 401


async def test_member_cannot_manage_keys(
    db_session: AsyncSession,
    client: httpx.AsyncClient,
    tenant: TenantContext,
    auth_headers: AuthHeaderFactory,
) -> None:
    db_session.add(Membership(organization_id=tenant.organization_id, user_id="bob", role="member"))
    await db_session.flush()
    headers = {**auth_headers(user_id="bob"), "X-Org-Id": str(tenant.organization_id)}
    assert (await client.get("/api-keys", headers=headers)).status_code == 403
    assert (await client.post("/api-keys", json={"name": "x"}, headers=headers)).status_code == 403


async def test_duplicate_name_conflicts(
    client: httpx.AsyncClient, org_headers: dict[str, str]
) -> None:
    await _create_key(client, org_headers, name="same")
    response = await client.post("/api-keys", json={"name": "same"}, headers=org_headers)
    assert response.status_code == 409
