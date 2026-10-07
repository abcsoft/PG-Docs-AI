# Demo Video Script — 90 seconds

**Goal**: show upload → processing → cited answer → summary → extraction →
report export in one continuous session. **Setup**: seeded demo workspace, dark
theme, 1440×900, browser zoom ~125% for readability, cursor highlighting on.

> Replace the placeholder on the landing page (`#demo-video` section) with the
> recorded file — drop it in `apps/web/public/` and swap the placeholder for a
> `<video controls>` element, or embed from your video host.

---

## Scene 1 — The problem (0:00–0:08)

**Screen**: landing page hero (`pgsofts.org`).

**VO**: "Your team has hundreds of pages of contracts and proposals. Generic AI
chatbots answer confidently — and you can't check a word of it."

**Action**: slow scroll past the hero mock into the citation demo section; hover
the `[3]` markers in the risk table.

---

## Scene 2 — Upload (0:08–0:20)

**Screen**: app `/documents`, Demo Workspace.

**VO**: "PG Docs AI is a workspace, not a chat box. Drop in a PDF —"

**Action**: drag `saas-agreement-globex.pdf` onto the upload area. The row
appears with status `processing`. Status flips to `ready` (cut after ~2s of
processing; speed up the wait in the edit).

**VO**: "— it's parsed page by page, chunked, embedded, and indexed with page
numbers. That's what makes real citations possible."

---

## Scene 3 — Ask, get a cited answer (0:20–0:40)

**Screen**: `/chat`.

**VO**: "Ask anything. Before answering, Claude searches your documents —"

**Action**: click the suggested chip **"List payment terms"**. The chat shows
*Searching documents…*, then streams the answer. Hover one citation chip
(`saas-agreement-globex.pdf · p.3`) — snippet tooltip appears.

**VO**: "— every claim carries a marker back to the exact page and passage.
Click through to the source viewer: this is the identical text the model read.
If the answer isn't in your documents, it says so."

---

## Scene 4 — Summary and risks (0:40–0:55)

**Screen**: `/documents` → open the SaaS agreement.

**VO**: "Open a document for the full intelligence kit."

**Action**: click **Summary** → dialog renders the executive summary with
citations; close it. Click **Risks** → risk register table appears. Scroll the
source chunks panel briefly.

**VO**: "One click gives you an executive summary, key points, or a risk
register with severity and page references — each one grounded and stored in
the document's history."

---

## Scene 5 — Extraction + comparison (0:55–1:10)

**Screen**: still on the document.

**Action**: click **Extract data** → choose **Payment terms** → run. The
structured result shows each field with its source marker and "not stated"
where the document is silent.

**VO**: "Extraction templates turn paragraphs into structured data — with a
source on every field."

**Screen**: `/documents`, select both proposals, click **Compare**.

**VO**: "Select two proposals and get the deltas that matter, side by side."

---

## Scene 6 — Report + export (1:10–1:25)

**Screen**: `/reports` → **New report** → title "Vendor assessment",
instructions prefilled, select the two proposals → Generate (cut through
processing).

**Action**: scroll the report; click **Export Markdown** — file downloads.

**VO**: "Describe the report you need. PG Docs AI writes it from your
documents, cites every claim, and exports clean Markdown you can share."

---

## Scene 7 — Close (1:25–1:30)

**Screen**: quick montage — usage dashboard, Settings → API keys (create key),
team members.

**VO**: "Multi-tenant, your own Claude key, per-workspace API access. PG Docs
AI — documents in, cited answers out. Start free at pgsofts.org."

**End card**: logo + `pgsofts.org` + "Start free".

---

## Recording checklist

- [ ] Seed a fresh demo workspace (`scripts/seed_demo.py`) right before recording
- [ ] Clear existing chat conversations and insights for a clean history
- [ ] Keep total runtime ≤ 95s; cut processing waits, keep one short "processing" beat
- [ ] Hover states: citation tooltips and `[n]` markers must be visible ≥ 1s each
- [ ] No real customer data; use the seeded demo documents only
- [ ] Export 1080p; add captions (the VOs above are the caption text)
