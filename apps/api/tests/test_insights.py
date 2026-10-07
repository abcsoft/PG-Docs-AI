import json

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.tenancy import TenantContext
from src.domains.documents.models import Document, DocumentChunk
from src.domains.llm_settings.resolver import chat_provider_dep, embedding_provider_dep
from src.domains.tenants.models import Membership, Organization

from tests.conftest import AuthHeaderFactory
from tests.llm.fakes import FakeChatProvider, make_completion

EMBEDDING_DIM = 1024


@pytest.fixture
async def tenant(db_session: AsyncSession) -> TenantContext:
    organization = Organization(name="Insights Co")
    organization.memberships = [Membership(user_id="alice", role="owner")]
    db_session.add(organization)
    await db_session.flush()
    return TenantContext(organization_id=organization.id, user_id="alice", role="owner")


@pytest.fixture
def org_headers(tenant: TenantContext, auth_headers: AuthHeaderFactory) -> dict[str, str]:
    return {**auth_headers(user_id="alice"), "X-Org-Id": str(tenant.organization_id)}


@pytest.fixture
def provider(app: FastAPI) -> FakeChatProvider:
    fake = FakeChatProvider()
    app.dependency_overrides[chat_provider_dep] = lambda: fake
    return fake


@pytest.fixture
def no_embedder(app: FastAPI) -> None:
    app.dependency_overrides[embedding_provider_dep] = lambda: None


def _fake_vector(seed: int = 0) -> list[float]:
    return [float((seed + i) % 97) / 97 for i in range(EMBEDDING_DIM)]


async def _add_document(
    db: AsyncSession,
    tenant: TenantContext,
    name: str,
    pages: list[str],
) -> Document:
    document = Document(
        tenant_id=tenant.organization_id,
        name=name,
        mime_type="text/plain",
        size_bytes=100,
        status="ready",
        title=name,
        created_by="alice",
        storage_path=f"x/{name}",
    )
    db.add(document)
    await db.flush()
    for position, (page, text) in enumerate(pages):
        db.add(
            DocumentChunk(
                tenant_id=tenant.organization_id,
                document_id=document.id,
                page=page,
                position=position,
                content=text,
                embedding=_fake_vector(position),
            )
        )
    await db.flush()
    return document


@pytest.fixture
async def contract(db_session: AsyncSession, tenant: TenantContext) -> Document:
    return await _add_document(
        db_session,
        tenant,
        "saas-contract.txt",
        [
            (1, "Master Services Agreement between Acme Cloud Ltd and Globex Corp."),
            (
                2,
                "Payment terms: invoices are due net 30. Late payments "
                "accrue 1.5% monthly interest.",
            ),
        ],
    )


# --- single-document insights --------------------------------------------------


async def test_summary_stores_insight_with_citations_from_markers(
    client: httpx.AsyncClient,
    org_headers: dict[str, str],
    provider: FakeChatProvider,
    contract: Document,
) -> None:
    provider.result = make_completion(
        "Acme and Globex agreed an MSA [1]. Invoices are due net 30 with 1.5% "
        "monthly late interest [2]. A fabricated claim [7]."
    )
    response = await client.post(
        f"/documents/{contract.id}/insights", json={"kind": "summary"}, headers=org_headers
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["kind"] == "summary"
    markers = [c["marker"] for c in body["citations"]]
    assert markers == [1, 2]  # the invented [7] is dropped
    assert body["citations"][0]["page"] == 1
    assert body["citations"][1]["page"] == 2
    assert body["model"] == "fake-model"


async def test_insight_history_is_listed_per_document(
    client: httpx.AsyncClient,
    org_headers: dict[str, str],
    provider: FakeChatProvider,
    contract: Document,
) -> None:
    await client.post(
        f"/documents/{contract.id}/insights", json={"kind": "summary"}, headers=org_headers
    )
    await client.post(
        f"/documents/{contract.id}/insights", json={"kind": "risks"}, headers=org_headers
    )
    response = await client.get(f"/documents/{contract.id}/insights", headers=org_headers)
    assert response.status_code == 200
    kinds = {i["kind"] for i in response.json()}
    assert kinds == {"summary", "risks"}


async def test_invalid_kind_rejected(
    client: httpx.AsyncClient,
    org_headers: dict[str, str],
    contract: Document,
    provider: FakeChatProvider,
) -> None:
    response = await client.post(
        f"/documents/{contract.id}/insights", json={"kind": "comparison"}, headers=org_headers
    )
    assert response.status_code == 422


# --- extraction ----------------------------------------------------------------


async def test_builtin_extraction_returns_structured_json_and_markdown(
    client: httpx.AsyncClient,
    org_headers: dict[str, str],
    provider: FakeChatProvider,
    contract: Document,
) -> None:
    provider.result = make_completion(
        json.dumps(
            {
                "total_amount": "USD 120,000 per year",
                "total_amount_source": 2,
                "due_terms": "net 30",
                "due_terms_source": 2,
                "currency": "USD",
                "currency_source": 2,
                "late_penalty": None,
                "late_penalty_source": None,
            }
        )
    )
    response = await client.post(
        "/insights/extract",
        json={"document_id": str(contract.id), "template_id": "builtin-payment-terms"},
        headers=org_headers,
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["kind"] == "extraction"
    assert body["template_name"] == "Payment terms"
    assert body["result_json"]["due_terms"] == "net 30"
    assert "net 30 [2]" in body["result_markdown"]
    markers = {c["marker"] for c in body["citations"]}
    assert markers == {2}


async def test_custom_template_lifecycle(
    client: httpx.AsyncClient, org_headers: dict[str, str], contract: Document
) -> None:
    create = await client.post(
        "/extraction-templates",
        json={
            "name": "Renewal dates",
            "fields": [{"key": "renewal_date", "label": "Renewal date", "type": "date"}],
        },
        headers=org_headers,
    )
    assert create.status_code == 201, create.text
    template = create.json()
    assert template["builtin"] is False

    listing = await client.get("/extraction-templates", headers=org_headers)
    ids = [t["id"] for t in listing.json()]
    assert template["id"] in ids
    assert "builtin-payment-terms" in ids

    deleted = await client.delete(f"/extraction-templates/{template['id']}", headers=org_headers)
    assert deleted.status_code == 204


async def test_member_cannot_manage_templates(
    db_session: AsyncSession,
    client: httpx.AsyncClient,
    tenant: TenantContext,
    auth_headers: AuthHeaderFactory,
) -> None:
    headers = {
        **auth_headers(user_id="bob"),
        "X-Org-Id": str(tenant.organization_id),
    }
    db_session.add(Membership(organization_id=tenant.organization_id, user_id="bob", role="member"))
    await db_session.flush()
    response = await client.post(
        "/extraction-templates",
        json={"name": "Nope", "fields": [{"key": "x", "label": "X"}]},
        headers=headers,
    )
    assert response.status_code == 403


# --- comparison ----------------------------------------------------------------


async def test_comparison_cites_both_documents(
    db_session: AsyncSession,
    client: httpx.AsyncClient,
    org_headers: dict[str, str],
    provider: FakeChatProvider,
    tenant: TenantContext,
    contract: Document,
) -> None:
    proposal = await _add_document(
        db_session,
        tenant,
        "proposal-b.txt",
        [(1, "Proposal B offers a fixed price of USD 90,000 per year, all inclusive.")],
    )
    provider.result = make_completion(
        "Proposal B costs 90k [3] while the contract prices at 120k [2]."
    )
    response = await client.post(
        "/insights/compare",
        json={"document_ids": [str(contract.id), str(proposal.id)]},
        headers=org_headers,
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["kind"] == "comparison"
    names = {c["document_name"] for c in body["citations"]}
    assert names == {"saas-contract.txt", "proposal-b.txt"}


async def test_comparison_requires_two_documents(
    client: httpx.AsyncClient,
    org_headers: dict[str, str],
    contract: Document,
    provider: FakeChatProvider,
) -> None:
    response = await client.post(
        "/insights/compare", json={"document_ids": [str(contract.id)]}, headers=org_headers
    )
    assert response.status_code == 422


# --- reports -------------------------------------------------------------------


async def test_report_generation_and_retrieval(
    client: httpx.AsyncClient,
    org_headers: dict[str, str],
    provider: FakeChatProvider,
    contract: Document,
    no_embedder: None,
) -> None:
    provider.result = make_completion(
        "# Spend review\n\nNet-30 terms apply [2].\n\n## Sources\n- [2] contract - page 2"
    )
    create = await client.post(
        "/reports",
        json={
            "title": "Spend review",
            "instructions": "Summarize our payment commitments",
            "document_ids": [str(contract.id)],
        },
        headers=org_headers,
    )
    assert create.status_code == 201, create.text
    report = create.json()
    assert report["title"] == "Spend review"
    assert report["citations"][0]["marker"] == 2

    listing = await client.get("/reports", headers=org_headers)
    assert [r["id"] for r in listing.json()] == [report["id"]]
    assert "content_md" not in listing.json()[0]

    fetched = await client.get(f"/reports/{report['id']}", headers=org_headers)
    assert fetched.status_code == 200
    assert "Net-30" in fetched.json()["content_md"]

    deleted = await client.delete(f"/reports/{report['id']}", headers=org_headers)
    assert deleted.status_code == 204
    assert (await client.get(f"/reports/{report['id']}", headers=org_headers)).status_code == 404


# --- tenant isolation -----------------------------------------------------------


async def test_insights_never_leak_across_tenants(
    db_session: AsyncSession,
    client: httpx.AsyncClient,
    contract: Document,
    auth_headers: AuthHeaderFactory,
    tenant: TenantContext,
) -> None:
    other = Organization(name="Other Co")
    other.memberships = [Membership(user_id="mallory", role="owner")]
    db_session.add(other)
    await db_session.flush()
    # mallory, a member of a different org, asks for alice's document insights
    response = await client.get(
        f"/documents/{contract.id}/insights",
        headers={**auth_headers(user_id="mallory"), "X-Org-Id": str(other.id)},
    )
    assert response.status_code == 404


# --- chunks endpoint -------------------------------------------------------------


async def test_document_chunks_endpoint_returns_ordered_sources(
    client: httpx.AsyncClient, org_headers: dict[str, str], contract: Document
) -> None:
    response = await client.get(f"/documents/{contract.id}/chunks", headers=org_headers)
    assert response.status_code == 200
    chunks = response.json()
    assert [c["page"] for c in chunks] == [1, 2]
    assert "Master Services Agreement" in chunks[0]["content"]


async def test_chunks_scoped_to_tenant(
    db_session: AsyncSession,
    client: httpx.AsyncClient,
    contract: Document,
    auth_headers: AuthHeaderFactory,
) -> None:
    other = Organization(name="Other Co")
    other.memberships = [Membership(user_id="mallory", role="owner")]
    db_session.add(other)
    await db_session.flush()
    response = await client.get(
        f"/documents/{contract.id}/chunks",
        headers={**auth_headers(user_id="mallory"), "X-Org-Id": str(other.id)},
    )
    assert response.status_code == 404
