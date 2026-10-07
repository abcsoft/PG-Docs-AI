import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, status
from src.core.db import DbSession
from src.core.errors import Forbidden, NotFound
from src.core.tenancy import CurrentTenant, TenantContext
from src.domains.documents.models import Document
from src.domains.documents.repository import DocumentRepository
from src.domains.documents.retrieval import RetrievalService
from src.domains.insights.schemas import (
    CompareIn,
    DocumentInsightOut,
    ExtractIn,
    ExtractionTemplateCreate,
    ExtractionTemplateOut,
    InsightRunIn,
    ReportCreate,
    ReportOut,
    ReportSummaryOut,
)
from src.domains.insights.service import InsightsService
from src.domains.llm_settings.resolver import chat_provider_dep, embedding_provider_dep
from src.llm.provider import ChatProvider, EmbeddingProvider
from src.llm.rate_limit import TenantRateLimiter, get_rate_limiter

router = APIRouter(tags=["insights"])

Provider = Annotated[ChatProvider, Depends(chat_provider_dep)]
Embedder = Annotated[EmbeddingProvider | None, Depends(embedding_provider_dep)]
RateLimiter = Annotated[TenantRateLimiter, Depends(get_rate_limiter)]


def _insight_out(insight: Any) -> DocumentInsightOut:
    return DocumentInsightOut.model_validate(insight, from_attributes=True)


def _require_admin(tenant: TenantContext) -> None:
    if tenant.role not in ("owner", "admin"):
        raise Forbidden("Only owners and admins can manage extraction templates")


async def _ready_document(db: DbSession, tenant: CurrentTenant, document_id: uuid.UUID) -> Document:
    document = await DocumentRepository(db, tenant).get(document_id)
    if document is None:
        raise NotFound("Document not found")
    return document


# --- extraction templates ------------------------------------------------------


@router.get("/extraction-templates")
async def list_templates(tenant: CurrentTenant, db: DbSession) -> list[dict[str, Any]]:
    service = InsightsService(db, tenant)
    custom = await service.list_custom_templates()
    return service.list_templates() + custom


@router.post("/extraction-templates", status_code=status.HTTP_201_CREATED)
async def create_template(
    payload: ExtractionTemplateCreate, tenant: CurrentTenant, db: DbSession
) -> ExtractionTemplateOut:
    _require_admin(tenant)
    service = InsightsService(db, tenant)
    template = await service.create_template(
        name=payload.name,
        description=payload.description,
        fields=[f.model_dump() for f in payload.fields],
        created_by=tenant.user_id,
    )
    await db.commit()
    return ExtractionTemplateOut.model_validate(template)


@router.delete("/extraction-templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(template_id: uuid.UUID, tenant: CurrentTenant, db: DbSession) -> None:
    _require_admin(tenant)
    service = InsightsService(db, tenant)
    await service.delete_template(template_id)
    await db.commit()


# --- single-document insights ---------------------------------------------------


@router.post("/documents/{document_id}/insights", status_code=status.HTTP_201_CREATED)
async def run_insight(
    document_id: uuid.UUID,
    payload: InsightRunIn,
    tenant: CurrentTenant,
    db: DbSession,
    provider: Provider,
    limiter: RateLimiter,
) -> DocumentInsightOut:
    await limiter.check(
        tenant.organization_id, tenant.rpm_override, tenant.tpd_override, plan=tenant.plan
    )
    document = await _ready_document(db, tenant, document_id)
    service = InsightsService(db, tenant, provider)
    insight = await service.run_single(document, payload.kind)
    response = _insight_out(insight)
    await db.commit()
    return response


@router.get("/documents/{document_id}/insights")
async def list_document_insights(
    document_id: uuid.UUID, tenant: CurrentTenant, db: DbSession
) -> list[DocumentInsightOut]:
    from src.domains.insights.repository import DocumentInsightRepository

    # 404 for documents outside the workspace, mirroring /documents/{id}.
    await _ready_document(db, tenant, document_id)
    insights = await DocumentInsightRepository(db, tenant).list_for_document(document_id)
    return [_insight_out(i) for i in insights]


@router.post("/insights/extract", status_code=status.HTTP_201_CREATED)
async def run_extraction(
    payload: ExtractIn,
    tenant: CurrentTenant,
    db: DbSession,
    provider: Provider,
    limiter: RateLimiter,
) -> DocumentInsightOut:
    await limiter.check(
        tenant.organization_id, tenant.rpm_override, tenant.tpd_override, plan=tenant.plan
    )
    document = await _ready_document(db, tenant, payload.document_id)
    service = InsightsService(db, tenant, provider)
    template = await service.resolve_template(payload.template_id)
    insight = await service.run_extraction(document, template)
    response = _insight_out(insight)
    await db.commit()
    return response


@router.post("/insights/compare", status_code=status.HTTP_201_CREATED)
async def run_comparison(
    payload: CompareIn,
    tenant: CurrentTenant,
    db: DbSession,
    provider: Provider,
    limiter: RateLimiter,
) -> DocumentInsightOut:
    await limiter.check(
        tenant.organization_id, tenant.rpm_override, tenant.tpd_override, plan=tenant.plan
    )
    documents = []
    for document_id in payload.document_ids:
        documents.append(await _ready_document(db, tenant, document_id))
    service = InsightsService(db, tenant, provider)
    insight = await service.run_comparison(documents, payload.focus)
    response = _insight_out(insight)
    await db.commit()
    return response


# --- reports --------------------------------------------------------------------


@router.get("/reports")
async def list_reports(tenant: CurrentTenant, db: DbSession) -> list[ReportSummaryOut]:
    from src.domains.insights.repository import ReportRepository

    reports = await ReportRepository(db, tenant).list_recent()
    return [ReportSummaryOut.model_validate(r, from_attributes=True) for r in reports]


@router.post("/reports", status_code=status.HTTP_201_CREATED)
async def create_report(
    payload: ReportCreate,
    tenant: CurrentTenant,
    db: DbSession,
    provider: Provider,
    embedder: Embedder,
    limiter: RateLimiter,
) -> ReportOut:
    await limiter.check(
        tenant.organization_id, tenant.rpm_override, tenant.tpd_override, plan=tenant.plan
    )
    documents = []
    for document_id in payload.document_ids:
        documents.append(await _ready_document(db, tenant, document_id))
    retrieval = RetrievalService(db, tenant, embedder) if embedder else None
    service = InsightsService(db, tenant, provider)
    report = await service.run_report(payload.title, payload.instructions, documents, retrieval)
    response = ReportOut.model_validate(report, from_attributes=True)
    await db.commit()
    return response


@router.get("/reports/{report_id}")
async def get_report(report_id: uuid.UUID, tenant: CurrentTenant, db: DbSession) -> ReportOut:
    from src.domains.insights.repository import ReportRepository

    report = await ReportRepository(db, tenant).get(report_id)
    if report is None:
        raise NotFound("Report not found")
    return ReportOut.model_validate(report, from_attributes=True)


@router.delete("/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(report_id: uuid.UUID, tenant: CurrentTenant, db: DbSession) -> None:
    from src.domains.insights.repository import ReportRepository

    repository = ReportRepository(db, tenant)
    report = await repository.get(report_id)
    if report is None:
        raise NotFound("Report not found")
    await repository.delete(report)
    await db.commit()
