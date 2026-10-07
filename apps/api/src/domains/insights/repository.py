import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.repository import TenantScopedRepository
from src.core.tenancy import TenantContext
from src.domains.documents.models import Document, DocumentChunk
from src.domains.insights.models import DocumentInsight, ExtractionTemplate, Report


class ExtractionTemplateRepository(TenantScopedRepository[ExtractionTemplate]):
    model = ExtractionTemplate

    async def list_recent(self, limit: int = 50) -> list[ExtractionTemplate]:
        result = await self._db.execute(
            self._query().order_by(ExtractionTemplate.created_at.desc()).limit(limit)
        )
        return list(result.scalars().all())


class DocumentInsightRepository(TenantScopedRepository[DocumentInsight]):
    model = DocumentInsight

    async def list_for_document(
        self, document_id: uuid.UUID, limit: int = 20
    ) -> list[DocumentInsight]:
        result = await self._db.execute(
            self._query()
            .where(DocumentInsight.document_ids.contains([str(document_id)]))
            .order_by(DocumentInsight.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())


class ReportRepository(TenantScopedRepository[Report]):
    model = Report

    async def list_recent(self, limit: int = 50) -> list[Report]:
        result = await self._db.execute(
            self._query().order_by(Report.created_at.desc()).limit(limit)
        )
        return list(result.scalars().all())


# Context assembly lives here rather than in a chunk repository: it spans
# several documents and applies a character budget, which is insight logic.

CONTEXT_BUDGET_CHARS = 60_000
# Documents longer than the budget keep their beginning and end: openings
# carry parties, definitions and commercial terms; endings carry signatures,
# termination and general provisions.
TAIL_KEEP_RATIO = 0.25
CHUNK_PREVIEW_CHARS = 400


class SourceRecord:
    """One numbered source block: a chunk chosen as context.

    Accepts page/content primitives so both a DocumentChunk (context
    assembly) and a Citation (report retrieval) can feed it."""

    def __init__(self, marker: int, document: Document, page: int | None, content: str) -> None:
        self.marker = marker
        self.document_id = str(document.id)
        self.document_name = document.title or document.name
        self.page = page
        self.content = content
        self.snippet = content[:CHUNK_PREVIEW_CHARS]


async def load_document_sources(
    db: AsyncSession,
    tenant: TenantContext,
    documents: list[Document],
    budget: int = CONTEXT_BUDGET_CHARS,
) -> list[SourceRecord]:
    """Ordered chunks across the given documents, packed into a character
    budget. Chunks stay in document order (opening → ending) so summaries
    read the document the way it was written."""
    from src.core.errors import BadRequest  # local import avoids a cycle at import time

    if not documents:
        raise BadRequest("No documents provided")

    per_document = max(1, budget // len(documents))
    records: list[SourceRecord] = []
    for document in documents:
        result = await db.execute(
            select(DocumentChunk)
            .where(
                DocumentChunk.tenant_id == tenant.organization_id,
                DocumentChunk.document_id == document.id,
            )
            .order_by(DocumentChunk.position)
        )
        chunks = list(result.scalars().all())
        if not chunks:
            continue
        total = sum(len(c.content) for c in chunks)
        if total > per_document:
            # Keep the head, then as much of the tail as the budget allows.
            tail_budget = int(per_document * TAIL_KEEP_RATIO)
            head: list[DocumentChunk] = []
            used = 0
            for chunk in chunks:
                if used + len(chunk.content) > per_document - tail_budget:
                    break
                head.append(chunk)
                used += len(chunk.content)
            tail: list[DocumentChunk] = []
            for chunk in reversed(chunks):
                if used + len(chunk.content) > per_document:
                    break
                tail.insert(0, chunk)
                used += len(chunk.content)
            selected = head + tail
        else:
            selected = chunks
        records.extend(
            SourceRecord(len(records) + 1, document, c.page, c.content) for c in selected
        )
    return records


def render_context(records: list[SourceRecord]) -> str:
    from src.domains.insights.prompts import GROUNDING_NOTE, SOURCE_BLOCK

    blocks = [
        SOURCE_BLOCK.format(
            n=r.marker,
            name=r.document_name,
            page=r.page if r.page is not None else "—",
            content=r.content,
        )
        for r in records
    ]
    return "\n\n".join(blocks) + "\n" + GROUNDING_NOTE
