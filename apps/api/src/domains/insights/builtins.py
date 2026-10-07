"""Built-in extraction templates shipped with the product.

They are code constants, not rows: they cannot be edited or deleted by
tenants, they are identical across workspaces, and adding one does not
require a migration. Custom tenant templates live in the database and are
merged into the listing by the service layer.
"""

from typing import Any

BUILTIN_MARKER = "builtin"

BUILTIN_TEMPLATES: list[dict[str, Any]] = [
    {
        "id": "builtin-payment-terms",
        "name": "Payment terms",
        "description": "Amounts, currencies, due dates, late penalties and invoicing rules.",
        "builtin": True,
        "fields": [
            {
                "key": "total_amount",
                "label": "Total amount",
                "type": "string",
                "description": "Total value with currency, as written",
                "required": True,
            },
            {
                "key": "payment_schedule",
                "label": "Payment schedule",
                "type": "string",
                "description": "Installments, milestones or recurring billing cadence",
                "required": False,
            },
            {
                "key": "due_terms",
                "label": "Due terms",
                "type": "string",
                "description": "Net payment terms, e.g. net 30",
                "required": False,
            },
            {
                "key": "late_penalty",
                "label": "Late penalty",
                "type": "string",
                "description": "Interest or fees on late payment",
                "required": False,
            },
            {
                "key": "invoicing_instructions",
                "label": "Invoicing instructions",
                "type": "string",
                "description": "How and where invoices must be submitted",
                "required": False,
            },
            {
                "key": "currency",
                "label": "Currency",
                "type": "string",
                "description": "ISO currency code if stated",
                "required": False,
            },
        ],
    },
    {
        "id": "builtin-parties-dates",
        "name": "Parties & dates",
        "description": "Who is bound by the document and the timeline that governs it.",
        "builtin": True,
        "fields": [
            {
                "key": "parties",
                "label": "Parties",
                "type": "string",
                "description": "Each party with its role (supplier, customer, …)",
                "required": True,
            },
            {
                "key": "effective_date",
                "label": "Effective date",
                "type": "string",
                "description": "When the agreement starts",
                "required": False,
            },
            {
                "key": "term_duration",
                "label": "Term duration",
                "type": "string",
                "description": "Initial term length",
                "required": False,
            },
            {
                "key": "renewal",
                "label": "Renewal",
                "type": "string",
                "description": "Renewal mechanism (auto, manual, none)",
                "required": False,
            },
            {
                "key": "termination_notice",
                "label": "Termination notice",
                "type": "string",
                "description": "Notice period and process to terminate",
                "required": False,
            },
        ],
    },
    {
        "id": "builtin-obligations",
        "name": "Key obligations",
        "description": "Who must do what, by when, under which section.",
        "builtin": True,
        "fields": [
            {
                "key": "obligations",
                "label": "Obligations",
                "type": "string",
                "description": "List every concrete obligation: party, action, deadline, section",
                "required": True,
            },
            {
                "key": "service_levels",
                "label": "Service levels",
                "type": "string",
                "description": "SLAs, uptime or response commitments",
                "required": False,
            },
            {
                "key": "confidentiality_scope",
                "label": "Confidentiality scope",
                "type": "string",
                "description": "What is covered and for how long",
                "required": False,
            },
            {
                "key": "data_protection",
                "label": "Data protection",
                "type": "string",
                "description": "Data handling, residency or processing commitments",
                "required": False,
            },
        ],
    },
    {
        "id": "builtin-risk-register",
        "name": "Risk register",
        "description": "Structured risks with severity and affected sections.",
        "builtin": True,
        "fields": [
            {
                "key": "risks",
                "label": "Risks",
                "type": "string",
                "description": "Each risk: description, severity (low/medium/high), section",
                "required": True,
            },
            {
                "key": "liability_caps",
                "label": "Liability caps",
                "type": "string",
                "description": "Limits of liability and exclusions",
                "required": False,
            },
            {
                "key": "indemnities",
                "label": "Indemnities",
                "type": "string",
                "description": "Who indemnifies whom and for what",
                "required": False,
            },
            {
                "key": "auto_renewal_trap",
                "label": "Auto-renewal risk",
                "type": "string",
                "description": "Renewal terms that could trap a party",
                "required": False,
            },
        ],
    },
]


def builtin_by_id(template_id: str) -> dict[str, Any] | None:
    return next((t for t in BUILTIN_TEMPLATES if t["id"] == template_id), None)
