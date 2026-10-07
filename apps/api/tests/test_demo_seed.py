"""The demo seeder's PDF renderer — the part worth unit-testing: page
markers must become real PDF pages, because citation quality in the demo
workspace depends on it."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

import pymupdf
from seed_demo import PAGE_MARKER, render_pdf


def test_render_pdf_turns_page_markers_into_pages() -> None:
    text = PAGE_MARKER.join([f"# Page {n}\n\nBody text for page {n}." for n in range(1, 4)])
    with pymupdf.open(stream=render_pdf(text), filetype="pdf") as document:
        assert document.page_count == 3
        assert "Page 2" in document[1].get_text()
        assert "Body text for page 3." in document[2].get_text()


def test_render_pdf_wraps_long_lines_instead_of_clipping() -> None:
    # ~100 wrapped lines: far beyond one page, none clipped.
    long_line = "word " * 2000
    with pymupdf.open(stream=render_pdf(long_line), filetype="pdf") as document:
        assert document.page_count >= 2
        assert "word" in document[0].get_text()
        assert "word" in document[document.page_count - 1].get_text()
