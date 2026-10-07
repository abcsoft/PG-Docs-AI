import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from src.core.db import Base
from src.core.repository import TenantOwnedMixin

# Single-document artifacts…
KIND_SUMMARY = "summary"
KIND_KEY_POINTS = "key_points"
KIND_RISKS = "risks"
KIND_EXTRACTION = "extraction"
# …and the multi-document one.
KIND_COMPARISON = "comparison"
KINDS = (KIND_SUMMARY, KIND_KEY_POINTS, KIND_RISKS, KIND_EXTRACTION, KIND_COMPARISON)


class ExtractionTemplate(TenantOwnedMixin, Base):
    """A reusable field spec for structured extraction runs."""

    __tablename__ = "extraction_templates"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(String(500))
    # [{"key": str, "label": str, "type": "string|number|date|boolean",
    #   "description": str, "required": bool}]
    fields: Mapped[list[dict[str, Any]]] = mapped_column(JSONB)
    created_by: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DocumentInsight(TenantOwnedMixin, Base):
    """A persisted document-intelligence artifact with its citations.

    Citations reference chunks that existed at generation time; the payload
    shape matches chat-message citations so the UI renders both the same way.
    """

    __tablename__ = "document_insights"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    kind: Mapped[str] = mapped_column(String(24))
    # All documents the artifact was generated from (one for single-doc
    # kinds, several for comparisons).
    document_ids: Mapped[list[str]] = mapped_column(JSONB)
    template_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("extraction_templates.id", ondelete="SET NULL"), nullable=True
    )
    template_name: Mapped[str | None] = mapped_column(String(120))
    result_markdown: Mapped[str] = mapped_column(Text)
    result_json: Mapped[dict[str, Any] | list[Any] | None] = mapped_column(JSONB)
    citations: Mapped[list[dict[str, Any]]] = mapped_column(JSONB)
    model: Mapped[str] = mapped_column(String(64))
    created_by: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Report(TenantOwnedMixin, Base):
    """A generated report over one or more documents."""

    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200))
    instructions: Mapped[str] = mapped_column(Text)
    document_ids: Mapped[list[str]] = mapped_column(JSONB)
    content_md: Mapped[str] = mapped_column(Text)
    citations: Mapped[list[dict[str, Any]]] = mapped_column(JSONB)
    model: Mapped[str] = mapped_column(String(64))
    created_by: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
