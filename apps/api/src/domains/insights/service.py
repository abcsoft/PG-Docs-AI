import json
import re
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from src.core.errors import BadRequest, NotFound
from src.core.tenancy import TenantContext
from src.domains.documents.models import Document
from src.domains.documents.retrieval import RetrievalService
from src.domains.insights.builtins import BUILTIN_TEMPLATES, builtin_by_id
from src.domains.insights.models import (
    KIND_COMPARISON,
    KIND_EXTRACTION,
    KIND_KEY_POINTS,
    KIND_RISKS,
    KIND_SUMMARY,
    DocumentInsight,
    ExtractionTemplate,
    Report,
)
from src.domains.insights.prompts import (
    COMPARISON_PROMPT,
    EXTRACTION_PROMPT,
    INSIGHTS_SYSTEM_PROMPT,
    KEY_POINTS_PROMPT,
    REPORT_PROMPT,
    RISKS_PROMPT,
    SUMMARY_PROMPT,
)
from src.domains.insights.repository import (
    ReportRepository,
    SourceRecord,
    load_document_sources,
    render_context,
)
from src.domains.usage.models import (
    FEATURE_COMPARISON,
    FEATURE_EXTRACTION,
    FEATURE_REPORT,
    FEATURE_SUMMARY,
)
from src.domains.usage.service import UsageService
from src.llm.provider import ChatProvider
from src.llm.types import Message

MARKER_RE = re.compile(r"\[(\d{1,3})\]")

SINGLE_DOC_PROMPTS = {
    KIND_SUMMARY: (SUMMARY_PROMPT, FEATURE_SUMMARY),
    KIND_KEY_POINTS: (KEY_POINTS_PROMPT, FEATURE_SUMMARY),
    KIND_RISKS: (RISKS_PROMPT, FEATURE_SUMMARY),
}

FIELD_TYPE_MAP = {"string": "string", "number": "number", "date": "string", "boolean": "boolean"}


def _citations(records: list[SourceRecord], markers: list[int]) -> list[dict[str, Any]]:
    by_marker = {r.marker: r for r in records}
    citations = []
    for marker in markers:
        record = by_marker.get(marker)
        if record is None:  # the model invented a marker — drop it
            continue
        citations.append(
            {
                "marker": record.marker,
                "document_id": record.document_id,
                "document_name": record.document_name,
                "page": record.page,
                "snippet": record.snippet,
            }
        )
    return citations


def _used_markers(text: str) -> list[int]:
    """Markers in order of first appearance, deduplicated."""
    seen: dict[int, None] = {}
    for match in MARKER_RE.finditer(text):
        seen.setdefault(int(match.group(1)))
    return list(seen)


class InsightsService:
    """Generates and persists document-intelligence artifacts with citations.

    Every artifact is produced from a numbered source list; citations are
    derived from the markers the model actually used — never from the
    model's claims alone. The provider is optional: template-management
    methods never call the model.
    """

    def __init__(
        self, db: AsyncSession, tenant: TenantContext, provider: ChatProvider | None = None
    ) -> None:
        self._db = db
        self._tenant = tenant
        self._provider = provider
        self._usage = UsageService(db, tenant)

    def _model(self) -> ChatProvider:
        if self._provider is None:
            raise RuntimeError("A chat provider is required for artifact generation")
        return self._provider

    # --- templates ---------------------------------------------------------

    def list_templates(self) -> list[dict[str, Any]]:
        return list(BUILTIN_TEMPLATES)

    async def resolve_template(self, template_id: str) -> dict[str, Any]:
        builtin = builtin_by_id(template_id)
        if builtin is not None:
            return builtin
        try:
            template_uuid = uuid.UUID(template_id)
        except ValueError as exc:
            raise NotFound("Extraction template not found") from exc
        from src.domains.insights.repository import ExtractionTemplateRepository

        template = await ExtractionTemplateRepository(self._db, self._tenant).get(template_uuid)
        if template is None:
            raise NotFound("Extraction template not found")
        return _template_dict(template, builtin=False)

    async def create_template(
        self, name: str, description: str | None, fields: list[dict[str, Any]], created_by: str
    ) -> dict[str, Any]:
        from src.domains.insights.repository import ExtractionTemplateRepository

        repository = ExtractionTemplateRepository(self._db, self._tenant)
        template = repository.add(
            ExtractionTemplate(
                name=name, description=description, fields=fields, created_by=created_by
            )
        )
        await self._db.flush()
        await self._db.refresh(template)
        return _template_dict(template, builtin=False)

    async def list_custom_templates(self) -> list[dict[str, Any]]:
        from src.domains.insights.repository import ExtractionTemplateRepository

        templates = await ExtractionTemplateRepository(self._db, self._tenant).list_recent()
        return [_template_dict(t, builtin=False) for t in templates]

    async def delete_template(self, template_id: uuid.UUID) -> None:
        from src.domains.insights.repository import ExtractionTemplateRepository

        repository = ExtractionTemplateRepository(self._db, self._tenant)
        template = await repository.get(template_id)
        if template is None:
            raise NotFound("Extraction template not found")
        await repository.delete(template)

    # --- artifacts ----------------------------------------------------------

    async def run_single(self, document: Document, kind: str) -> DocumentInsight:
        if kind not in SINGLE_DOC_PROMPTS:
            raise BadRequest(f"Unsupported insight kind: {kind}")
        prompt_template, feature = SINGLE_DOC_PROMPTS[kind]
        records = await load_document_sources(self._db, self._tenant, [document])
        if not records:
            raise BadRequest("Document has no indexed content yet — wait for processing to finish")

        completion = await self._usage.tracked_complete(
            self._model(),
            feature,
            self._tenant.user_id,
            [Message(role="user", content=prompt_template.format(context=render_context(records)))],
            system=INSIGHTS_SYSTEM_PROMPT,
        )
        return await self._store(
            kind=kind,
            document_ids=[str(document.id)],
            markdown=completion.text,
            result_json=None,
            citations=_citations(records, _used_markers(completion.text)),
            model=completion.model,
            template_id=None,
            template_name=None,
        )

    async def run_extraction(self, document: Document, template: dict[str, Any]) -> DocumentInsight:
        records = await load_document_sources(self._db, self._tenant, [document])
        if not records:
            raise BadRequest("Document has no indexed content yet — wait for processing to finish")

        fields_spec = _fields_spec_text(template["fields"])
        schema = _extraction_schema(template["fields"])
        prompt = EXTRACTION_PROMPT.format(fields=fields_spec, context=render_context(records))
        completion = await self._usage.tracked_complete(
            self._model(),
            FEATURE_EXTRACTION,
            self._tenant.user_id,
            [Message(role="user", content=prompt)],
            system=INSIGHTS_SYSTEM_PROMPT,
            json_schema=schema,
            max_tokens=2000,
        )
        try:
            data = json.loads(completion.text)
        except json.JSONDecodeError as exc:
            raise BadRequest("The model returned malformed extraction data — try again") from exc

        markers = _extraction_markers(data)
        markdown = _extraction_markdown(template["name"], template["fields"], data)
        template_id = template.get("id") if template.get("builtin") else template["id"]
        return await self._store(
            kind=KIND_EXTRACTION,
            document_ids=[str(document.id)],
            markdown=markdown,
            result_json=data,
            citations=_citations(records, markers),
            model=completion.model,
            template_id=uuid.UUID(template_id) if _is_uuid(template_id) else None,
            template_name=template["name"],
        )

    async def run_comparison(self, documents: list[Document], focus: str | None) -> DocumentInsight:
        if len(documents) < 2:
            raise BadRequest("Comparison needs at least two documents")
        records = await load_document_sources(self._db, self._tenant, documents)
        if not records:
            raise BadRequest("None of the documents have indexed content yet")

        names = ", ".join(f"'{d.title or d.name}'" for d in documents)
        focus_block = f"\nPay particular attention to: {focus}.\n" if focus else ""
        prompt = COMPARISON_PROMPT.format(
            count=len(documents),
            names=names,
            focus=focus_block,
            context=render_context(records),
        )
        completion = await self._usage.tracked_complete(
            self._model(),
            FEATURE_COMPARISON,
            self._tenant.user_id,
            [Message(role="user", content=prompt)],
            system=INSIGHTS_SYSTEM_PROMPT,
            max_tokens=3000,
        )
        return await self._store(
            kind=KIND_COMPARISON,
            document_ids=[str(d.id) for d in documents],
            markdown=completion.text,
            result_json=None,
            citations=_citations(records, _used_markers(completion.text)),
            model=completion.model,
            template_id=None,
            template_name=None,
        )

    async def run_report(
        self,
        title: str,
        instructions: str,
        documents: list[Document],
        retrieval: RetrievalService | None,
    ) -> Report:
        records = await self._retrieve_sources(documents, instructions, retrieval)
        if not records:
            raise BadRequest("The selected documents have no indexed content yet")

        prompt = REPORT_PROMPT.format(
            title=title,
            instructions=instructions,
            context=render_context(records),
        )
        completion = await self._usage.tracked_complete(
            self._model(),
            FEATURE_REPORT,
            self._tenant.user_id,
            [Message(role="user", content=prompt)],
            system=INSIGHTS_SYSTEM_PROMPT,
            max_tokens=4000,
        )
        repository = ReportRepository(self._db, self._tenant)
        report = repository.add(
            Report(
                title=title,
                instructions=instructions,
                document_ids=[str(d.id) for d in documents],
                content_md=completion.text,
                citations=_citations(records, _used_markers(completion.text)),
                model=completion.model,
                created_by=self._tenant.user_id,
            )
        )
        await self._db.flush()
        await self._db.refresh(report)
        return report

    async def _retrieve_sources(
        self,
        documents: list[Document],
        instructions: str,
        retrieval: RetrievalService | None,
    ) -> list[SourceRecord]:
        """Reports pull the most relevant chunks per document (vector search
        driven by the report brief) instead of a document's opening pages.
        Without an embedder, fall back to opening-context selection."""
        if retrieval is None:
            return await load_document_sources(self._db, self._tenant, documents)

        by_id = {d.id: d for d in documents}
        records: list[SourceRecord] = []
        for document in documents:
            results = await retrieval.search(
                instructions,
                created_by=self._tenant.user_id,
                top_k=4,
                document_ids=[document.id],
            )
            for citation in results:
                records.append(
                    SourceRecord(
                        marker=0,
                        document=by_id[citation.document_id],
                        page=citation.page,
                        content=citation.content,
                    )
                )
        for index, record in enumerate(records, start=1):
            record.marker = index
        if not records:
            return await load_document_sources(self._db, self._tenant, documents)
        return records

    async def _store(
        self,
        kind: str,
        document_ids: list[str],
        markdown: str,
        result_json: dict[str, Any] | list[Any] | None,
        citations: list[dict[str, Any]],
        model: str,
        template_id: uuid.UUID | None,
        template_name: str | None,
    ) -> DocumentInsight:
        from src.domains.insights.repository import DocumentInsightRepository

        insight = DocumentInsightRepository(self._db, self._tenant).add(
            DocumentInsight(
                kind=kind,
                document_ids=document_ids,
                template_id=template_id,
                template_name=template_name,
                result_markdown=markdown,
                result_json=result_json,
                citations=citations,
                model=model,
                created_by=self._tenant.user_id,
            )
        )
        await self._db.flush()
        await self._db.refresh(insight)
        return insight


# --- extraction helpers -------------------------------------------------------


def _template_dict(template: ExtractionTemplate, builtin: bool) -> dict[str, Any]:
    return {
        "id": str(template.id),
        "name": template.name,
        "description": template.description,
        "fields": template.fields,
        "builtin": builtin,
        "created_at": template.created_at.isoformat(),
    }


def _fields_spec_text(fields: list[dict[str, Any]]) -> str:
    lines = []
    for field in fields:
        required = "required" if field.get("required") else "optional"
        lines.append(
            f"- {field['key']} ({field.get('type', 'string')}, {required}): {field.get('label')}"
        )
        if field.get("description"):
            lines.append(f"  {field['description']}")
    return "\n".join(lines)


def _extraction_schema(fields: list[dict[str, Any]]) -> dict[str, Any]:
    properties: dict[str, Any] = {}
    required: list[str] = []
    for field in fields:
        json_type = FIELD_TYPE_MAP.get(str(field.get("type", "string")), "string")
        properties[str(field["key"])] = {"type": json_type}
        properties[f"{field['key']}_source"] = {"type": ["integer", "null"]}
        if field.get("required"):
            required.append(str(field["key"]))
    return {
        "type": "object",
        "properties": properties,
        "required": required,
        "additionalProperties": False,
    }


def _extraction_markers(data: Any) -> list[int]:
    markers: list[int] = []
    if isinstance(data, dict):
        for value in data.values():
            if isinstance(value, int) and not isinstance(value, bool):
                markers.append(value)
    return markers


def _extraction_markdown(
    template_name: str, fields: list[dict[str, Any]], data: dict[str, Any]
) -> str:
    lines = [f"## {template_name}", ""]
    for field in fields:
        key = str(field["key"])
        value = data.get(key)
        source = data.get(f"{key}_source")
        marker = f" [{source}]" if isinstance(source, int) else ""
        if isinstance(value, list):
            rendered = "; ".join(str(v) for v in value) if value else "—"
        elif value is None or value == "":
            rendered = "not stated"
        else:
            rendered = str(value)
        lines.append(f"- **{field.get('label', key)}:** {rendered}{marker}")
    return "\n".join(lines)


def _is_uuid(value: Any) -> bool:
    try:
        uuid.UUID(str(value))
        return True
    except (ValueError, TypeError):
        return False
