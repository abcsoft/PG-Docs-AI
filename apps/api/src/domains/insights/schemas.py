import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

InsightKind = Literal["summary", "key_points", "risks", "extraction", "comparison"]


class ExtractionField(BaseModel):
    key: str = Field(min_length=1, max_length=64, pattern=r"^[a-z][a-z0-9_]*$")
    label: str = Field(min_length=1, max_length=120)
    type: Literal["string", "number", "date", "boolean"] = "string"
    description: str | None = None
    required: bool = False


class ExtractionTemplateOut(BaseModel):
    id: str
    name: str
    description: str | None
    fields: list[dict[str, Any]]
    builtin: bool
    created_at: str | None = None


class ExtractionTemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    fields: list[ExtractionField] = Field(min_length=1, max_length=20)


class InsightRunIn(BaseModel):
    kind: Literal["summary", "key_points", "risks"]


class CitationOut(BaseModel):
    marker: int | None = None
    document_id: str
    document_name: str
    page: int | None
    snippet: str


class DocumentInsightOut(BaseModel):
    id: uuid.UUID
    kind: InsightKind
    document_ids: list[str]
    template_name: str | None
    result_markdown: str
    result_json: dict[str, Any] | list[Any] | None
    citations: list[dict[str, Any]]
    model: str
    created_at: datetime


class ExtractIn(BaseModel):
    document_id: uuid.UUID
    template_id: str  # builtin id ("builtin-…") or a custom template UUID


class CompareIn(BaseModel):
    document_ids: list[uuid.UUID] = Field(min_length=2, max_length=5)
    focus: str | None = Field(default=None, max_length=500)


class ReportCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    instructions: str = Field(min_length=3, max_length=4000)
    document_ids: list[uuid.UUID] = Field(min_length=1, max_length=10)


class ReportOut(BaseModel):
    id: uuid.UUID
    title: str
    instructions: str
    document_ids: list[str]
    content_md: str
    citations: list[dict[str, Any]]
    model: str
    created_at: datetime


class ReportSummaryOut(BaseModel):
    id: uuid.UUID
    title: str
    instructions: str
    document_ids: list[str]
    created_at: datetime
