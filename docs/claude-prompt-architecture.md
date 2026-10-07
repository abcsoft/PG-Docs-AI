# Claude Prompt Architecture

Every Claude call in PG Docs AI is defined in one of three places:

| Module | Serves | Output |
|---|---|---|
| `apps/api/src/domains/chat/service.py` + `agent.py` | Chat conversations | streamed Markdown |
| `apps/api/src/domains/insights/prompts.py` | Summaries, key points, risks, extraction, comparison, reports | Markdown + structured JSON |
| `apps/api/src/domains/documents/ingestion.py` | Document metadata at ingest | strict JSON |

## The four invariants

1. **Numbered sources only.** The context is always presented as `[n] Document —
   page N` blocks. The model may only cite markers that exist in that list.
   Post-processing (`_used_markers` + `_citations`) maps markers back to source
   records and **drops anything the model invented**. A fabricated citation
   never reaches the user because it never had a source record to begin with.
2. **Grounding over recall.** Prompts forbid outside knowledge and prefer
   "not stated in the provided sources" over a guess. The chat agent goes
   further: a `search_documents` tool it *must* call before answering factual
   questions, even when it believes it knows the answer.
3. **Static, cacheable system prompts.** System prompts are constant strings —
   no dynamic interpolation — so Anthropic prompt caching stays effective
   (the provider sends `cache_control: ephemeral` on the system block).
4. **Document text is data.** All document content is wrapped in `<source>`
   delimiters and the system prompt says to treat it as data, never
   instructions — instruction injection inside a contract cannot change the task.

## Chat: the agentic loop

```
system: RAG_SYSTEM_PROMPT          (stable prefix)
tools:  search_documents, get_workspace_stats
loop (max 4 rounds):
  model → tool_use(search_documents) → full chunk content as tool_result
  model → final text with inline claims grounded in tool results
```

Citations are collected **from the tool results the model actually saw**, not
from its prose: each retrieved chunk with score ≥ 0.3 becomes a citation chip
(document, page, snippet). If nothing clears the threshold, the answer has no
citations — and the model was told to say when the documents don't contain the
answer. Usage, tokens and citations are persisted with the message.

## Insights: one contract, six artifacts

All insight prompts share the same shape (from `insights/prompts.py`):

```
system: INSIGHTS_SYSTEM_PROMPT     (analyst persona, citation rules, anti-injection)
user:   <task-specific instructions>
        <numbered source blocks [n] Document — page N>
        <grounding reminder>
```

| Artifact | Prompt | Output contract |
|---|---|---|
| **Executive summary** | `SUMMARY_PROMPT` | overview → key terms (cited) → watch-outs, ≤300 words |
| **Key points** | `KEY_POINTS_PROMPT` | 5–10 one-sentence bullets, cited, concrete facts first |
| **Risk register** | `RISKS_PROMPT` | Markdown table: Risk · Severity · Where · Why, every row cited |
| **Extraction** | `EXTRACTION_PROMPT` | JSON schema forced (structured output); each field carries `<field>_source` = the marker it came from, or `null` |
| **Comparison** | `COMPARISON_PROMPT` | at-a-glance table → key differences (both sides cited) → recommendation; unknowns are "not stated" |
| **Report** | `REPORT_PROMPT` | titled Markdown, executive summary, every claim cited, explicit gaps, `## Sources` list, 400–800 words |

### Extraction detail

Field specifications become a **JSON schema** passed via structured output, so
the response is parseable by construction:

```json
{
  "total_amount": "USD 148,500 per year",
  "total_amount_source": 3,
  "due_terms": "net 30",
  "due_terms_source": 3,
  "late_penalty": null,
  "late_penalty_source": null
}
```

`null` means *the document does not state it* — the product renders "not
stated" rather than an empty guess. The markdown rendering of an extraction
carries the marker next to every filled field.

### Context assembly (where the sources come from)

- **Single-document artifacts** — chunks in document order under a character
  budget (~60k); long documents keep head *and* tail (openings carry parties
  and commercial terms, endings carry termination and general provisions).
- **Comparisons** — the budget is split per document, so every side gets fair
  representation in the source list.
- **Reports** — relevance-selected: the report brief itself is the retrieval
  query (top-4 chunks per selected document, hybrid rerank), falling back to
  document-order context when no embedder is configured.

## Anti-fabrication checklist (what the code enforces)

- Citations can only reference source records that were actually sent.
- Invented markers are dropped (`_citations` maps through the source list).
- Chat citations can only come from tool results in the same turn.
- Extraction sources are integers validated against the marker set.
- Negative-space behavior is *tested*: the eval suite includes questions whose
  correct answer is "not in the documents" and scores the model on saying so.

## Cost and cache notes

- System prompts are stable → prefix caching applies across calls in a workspace.
- Every call is metered (tokens incl. cache read/write, cost, latency) to
  `llm_usage` with a feature tag (`chat`, `rag`, `summary`, `extraction`,
  `comparison`, `report`, `ingestion`) — the usage dashboard attributes spend
  to features, not just models.
- Max output tokens are bounded per artifact type (500–4000).
