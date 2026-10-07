"""Seed a realistic demo workspace: organisation, demo documents, ingestion.

Run after signing up in the web app:

    cd apps/api && uv run python scripts/seed_demo.py --email you@example.com

What it does:
- finds (or creates) a "Demo Workspace" organisation owned by that user;
- renders the demo corpus in scripts/demo_corpus/ to multi-page PDFs so
  citations carry real page numbers;
- ingests each document inline — real embeddings when an embeddings key is
  configured (org settings or server env), deterministic hash embeddings
  otherwise so the workspace is still browsable end to end;
- prints suggested demo prompts.

Idempotent: documents already seeded are skipped unless --force re-ingests.
"""

import argparse
import asyncio
import hashlib
import re
import sys
import uuid
from pathlib import Path

import pymupdf
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

CORPUS_DIR = Path(__file__).parent / "demo_corpus"
PAGE_MARKER = "---PAGE---"
DEMO_ORG_NAME = "Demo Workspace"
EMBEDDING_DIM = 1024

DEMO_WORKFLOWS = [
    "Summarize this contract — open the SaaS agreement and run Summary",
    "Compare these two proposals — select the Acme and Northwind proposals",
    "List payment terms — run the Payment terms extraction on the contract",
    "What risks are mentioned? — run Risk register on any proposal",
]


def render_pdf(markdown_text: str) -> bytes:
    """Render corpus markdown to a multi-page PDF (page breaks at markers)."""
    pages = [page.strip() for page in markdown_text.split(PAGE_MARKER) if page.strip()]
    document = pymupdf.open()
    for text in pages:
        page = document.new_page()  # A4 default
        margin, font, size, leading = 54, "helv", 10, 14
        max_chars = int((page.rect.width - 2 * margin) / (size * 0.5))
        y = margin
        for raw_line in text.splitlines():
            for line in _wrap(raw_line, max_chars) or [""]:
                page.insert_text((margin, y), line, fontname=font, fontsize=size)
                y += leading
                if y > page.rect.height - margin:
                    page = document.new_page()
                    y = margin
    # A line that ends exactly at the bottom margin leaves a blank trailing page.
    if document.page_count > 1 and not document[document.page_count - 1].get_text().strip():
        document.delete_page(document.page_count - 1)
    return document.tobytes()


def _wrap(line: str, width: int) -> list[str]:
    words, lines, current = line.split(), [], ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if len(candidate) <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def _hash_vector(text: str) -> list[float]:
    vector = [0.0] * EMBEDDING_DIM
    for token in re.findall(r"[a-z0-9]+", text.lower()):
        bucket = int(hashlib.sha256(token.encode()).hexdigest()[:8], 16) % EMBEDDING_DIM
        vector[bucket] += 1.0
    norm = sum(v * v for v in vector) ** 0.5 or 1.0
    return [v / norm for v in vector]


class HashingEmbedder:
    """Deterministic offline embeddings — NOT semantic. Lets the demo
    workspace exist without API keys; re-run the seeder with a real key to
    get semantic retrieval."""

    async def embed(self, texts: list[str], input_type: str = "document"):
        from src.llm.types import EmbeddingResult

        return EmbeddingResult(
            embeddings=[_hash_vector(t) for t in texts],
            model="hash-embeddings-demo",
            input_tokens=sum(len(t.split()) for t in texts),
        )


async def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--email", help="email of an existing signed-up user")
    parser.add_argument("--user-id", help="auth user id (alternative to --email)")
    parser.add_argument("--force", action="store_true", help="re-ingest already-seeded documents")
    args = parser.parse_args()
    if not args.email and not args.user_id:
        parser.error("provide --email (of a signed-up user) or --user-id")

    import src.all_models  # noqa: F401 — complete the model registry
    from src.core.config import get_settings
    from src.core.storage import get_storage
    from src.core.tenancy import TenantContext
    from src.domains.documents.ingestion import ingest_document
    from src.domains.documents.models import Document
    from src.domains.llm_settings.resolver import (
        resolve_chat_provider,
        resolve_embedding_provider,
    )
    from src.domains.tenants.models import Membership, Organization
    from src.llm.errors import ProviderNotConfigured

    settings = get_settings()
    engine = create_async_engine(settings.database_url)
    sessions = async_sessionmaker(engine, expire_on_commit=False)

    async with sessions() as db:
        user_id = args.user_id
        if not user_id:
            row = (
                await db.execute(
                    sa.text('SELECT id FROM auth."user" WHERE email = :email'),
                    {"email": args.email},
                )
            ).scalar_one_or_none()
            if row is None:
                sys.stdout.write(
                    f"No user found for {args.email}. Sign up in the web app first, "
                    "then re-run the seeder.\n"
                )
                return 1
            user_id = row

        org = (
            await db.execute(sa.select(Organization).where(Organization.name == DEMO_ORG_NAME))
        ).scalar_one_or_none()
        if org is None:
            org = Organization(name=DEMO_ORG_NAME)
            db.add(org)
            await db.flush()
            sys.stdout.write(f"Created organization '{DEMO_ORG_NAME}' ({org.id})\n")
        membership = (
            await db.execute(
                sa.select(Membership).where(
                    Membership.organization_id == org.id, Membership.user_id == user_id
                )
            )
        ).scalar_one_or_none()
        if membership is None:
            db.add(Membership(organization_id=org.id, user_id=user_id, role="owner"))
            await db.commit()
            sys.stdout.write(f"Added owner membership for user {user_id}\n")

        tenant = TenantContext(organization_id=org.id, user_id=user_id, role="owner")
        try:
            embedder = await resolve_embedding_provider(db, tenant)
            embedder_name = "real embeddings (configured key)"
        except ProviderNotConfigured:
            embedder = HashingEmbedder()
            embedder_name = (
                "offline hash embeddings (configure an embeddings key for semantic search)"
            )
        try:
            chat_provider = await resolve_chat_provider(db, tenant)
        except ProviderNotConfigured:
            chat_provider = None

        storage = get_storage()
        seeded, skipped = 0, 0
        for source in sorted(CORPUS_DIR.glob("*.md")):
            name = source.stem + ".pdf"
            existing = (
                await db.execute(
                    sa.select(Document).where(Document.tenant_id == org.id, Document.name == name)
                )
            ).scalar_one_or_none()
            if existing is not None and not args.force:
                sys.stdout.write(f"  = {name} already seeded (use --force to re-ingest)\n")
                skipped += 1
                continue
            if existing is not None:
                document = existing
            else:
                document = Document(
                    tenant_id=org.id,
                    name=name,
                    mime_type="application/pdf",
                    size_bytes=0,
                    created_by=user_id,
                    storage_path=f"{org.id}/{uuid.uuid4()}/{name}",
                )
                db.add(document)
                await db.flush()

            pdf_bytes = render_pdf(source.read_text(encoding="utf-8"))
            document.size_bytes = len(pdf_bytes)
            await storage.save(document.storage_path, pdf_bytes)
            await db.commit()

            await ingest_document(db, storage, embedder, tenant, document.id, chat_provider)
            await db.refresh(document)
            suffix = f" ({document.error})" if document.error else ""
            sys.stdout.write(f"  + {name}: {document.status}{suffix}\n")
            seeded += 1

        sys.stdout.write(
            f"\nDone: {seeded} ingested, {skipped} skipped. Embeddings: {embedder_name}.\n"
        )
        sys.stdout.write("Suggested demo workflows:\n")
        for workflow in DEMO_WORKFLOWS:
            sys.stdout.write(f"  - {workflow}\n")
        sys.stdout.write(f"\nWorkspace id for the API (X-Org-Id): {org.id}\n")
    await engine.dispose()
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
