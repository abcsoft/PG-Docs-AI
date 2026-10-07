import re
import time
import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.tenancy import TenantContext
from src.domains.documents.models import STATUS_READY, Document, DocumentChunk
from src.domains.usage.service import UsageService
from src.llm.provider import EmbeddingProvider

DEFAULT_TOP_K = 5
SNIPPET_MAX_CHARS = 400
# Hybrid rerank: candidates fetched by vector distance, then fused with a
# lexical overlap score. Embeddings capture meaning; lexical matching keeps
# exact identifiers (section numbers, product names, amounts) on top when
# the embedding ranks them below paraphrases.
CANDIDATE_POOL = 15
VECTOR_WEIGHT = 0.7
LEXICAL_WEIGHT = 0.3
_WORD_RE = re.compile(r"[a-zA-Z0-9]{2,}")
_STOPWORDS = frozenset(
    "the a an and or of to in for on with by is are was were be been this that these those "
    "it its as at from what which who whom how when where why not no yes do does did done "
    "shall will would should could may might must about into over under".split()
)


@dataclass(frozen=True)
class Citation:
    document_id: uuid.UUID
    document_name: str
    page: int | None
    snippet: str  # truncated, for UI display
    content: str  # full chunk text, for the model
    score: float


def _tokens(text: str) -> set[str]:
    return {t for t in _WORD_RE.findall(text.lower()) if t not in _STOPWORDS}


def _lexical_score(query_tokens: set[str], chunk: str) -> float:
    if not query_tokens:
        return 0.0
    chunk_tokens = _tokens(chunk)
    if not chunk_tokens:
        return 0.0
    overlap = len(query_tokens & chunk_tokens) / len(query_tokens)
    coverage = len(query_tokens & chunk_tokens) / len(chunk_tokens)
    # F1-style blend: rewards matching many query terms without rewarding
    # boilerplate chunks that happen to contain everything.
    return (2 * overlap * coverage / (overlap + coverage)) if overlap + coverage else 0.0


class RetrievalService:
    """Vector search over the tenant's ready documents."""

    def __init__(self, db: AsyncSession, tenant: TenantContext, embedder: EmbeddingProvider):
        self._db = db
        self._tenant = tenant
        self._embedder = embedder

    async def search(
        self,
        query: str,
        created_by: str,
        top_k: int = DEFAULT_TOP_K,
        document_ids: list[uuid.UUID] | None = None,
    ) -> list[Citation]:
        started = time.monotonic()
        result = await self._embedder.embed([query], input_type="query")
        await UsageService(self._db, self._tenant).record_embedding(
            created_by=created_by,
            model=result.model,
            input_tokens=result.input_tokens,
            latency_ms=int((time.monotonic() - started) * 1000),
        )
        query_vector = result.embeddings[0]

        distance = DocumentChunk.embedding.cosine_distance(query_vector).label("distance")
        statement = (
            select(DocumentChunk, Document.name, distance)
            .join(Document, Document.id == DocumentChunk.document_id)
            .where(
                DocumentChunk.tenant_id == self._tenant.organization_id,
                Document.status == STATUS_READY,
            )
            .order_by(distance)
            .limit(CANDIDATE_POOL if document_ids is None else CANDIDATE_POOL * 2)
        )
        if document_ids is not None:
            statement = statement.where(DocumentChunk.document_id.in_(document_ids))
        rows = (await self._db.execute(statement)).all()

        query_tokens = _tokens(query)
        ranked = sorted(
            (
                (
                    chunk,
                    name,
                    VECTOR_WEIGHT * (1.0 - dist)
                    + LEXICAL_WEIGHT * _lexical_score(query_tokens, chunk.content),
                )
                for chunk, name, dist in rows
            ),
            key=lambda entry: entry[2],
            reverse=True,
        )
        return [
            Citation(
                document_id=chunk.document_id,
                document_name=name,
                page=chunk.page,
                snippet=chunk.content[:SNIPPET_MAX_CHARS],
                content=chunk.content,
                score=round(score, 4),
            )
            for chunk, name, score in ranked[:top_k]
        ]

    async def has_ready_documents(self) -> bool:
        statement = (
            select(Document.id)
            .where(
                Document.tenant_id == self._tenant.organization_id,
                Document.status == STATUS_READY,
            )
            .limit(1)
        )
        return (await self._db.execute(statement)).scalar_one_or_none() is not None
