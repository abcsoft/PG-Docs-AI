# Business Proposal — Document Intelligence as a Managed Service
## Northwind Analytics GmbH
Proposal reference: NA-2026-0442 · Prepared for: Globex Corporation · Date: 18 February 2026

---PAGE---

## 1. Executive summary

Northwind Analytics GmbH ("Northwind") proposes a fully managed document intelligence service for Globex Corporation ("Globex"): Northwind operates the platform, the models and the pipelines, and Globex consumes results through an API and review console. The total contract value is EUR 126,000 for a 12-month term. Northwind operates from Berlin and Toronto and serves 21 enterprise customers in regulated industries.

This proposal responds to RFP RG-2026-03 and is valid for 45 days.

---PAGE---

## 2. Scope of services

Northwind's managed service includes:

1. **Managed platform** — 800 active users, documents processed within 4 business hours, and a review console for quality assurance.
2. **Onboarding** — process discovery (1 week), pipeline configuration for up to 12 document types (4 weeks), and integration with Globex systems via REST API.
3. **Service operations** — monitoring, model retraining every quarter, and quarterly service reviews.

Out of scope: on-premises deployment (not offered), and migration of paper archives (quoted separately at EUR 0.04 per page).

---PAGE---

## 3. Commercials and payment terms

The total price of EUR 126,000 consists of:

- Managed service fee: EUR 9,000 per month (EUR 108,000 per year)
- Onboarding and configuration: EUR 18,000 one-off

**Payment schedule.** Invoices are issued quarterly in advance. Payment terms are net 45 from invoice date. The onboarding fee is invoiced in full at contract signature. Late payments accrue interest at the European Central Bank rate plus 6 percentage points. Prices are exclusive of VAT.

If processing volumes exceed 120,000 documents per quarter, a overage rate of EUR 0.09 per document applies, capped at 15% of the quarterly service fee.

---PAGE---

## 4. Delivery plan and key dates

- Contract signature target: 20 March 2026
- Process discovery: 30 March 2026
- Pipeline configuration complete: 5 May 2026
- Production cut-over: 20 May 2026

Northwind assigns a service manager and a solutions architect at 40% allocation during onboarding, dropping to 15% in steady state.

---PAGE---

## 5. Risk considerations

- **Data residency risk** — Northwind's primary processing region is Frankfurt, with a disaster-recovery site in Toronto; Globex legal must approve transatlantic replication.
- **Quarterly retraining risk** — model updates may shift extraction behaviour; Northwind provides a staging environment to validate changes 10 business days before production.
- **Volume risk** — the base package covers 120,000 documents per quarter; sustained excess volume requires a commercial revision.

All Globex data remains the property of Globex. Northwind is ISO 27001 certified and undergoes annual penetration tests; reports are shared under NDA.

---PAGE---

## 6. Acceptance and contact

Service acceptance follows the agreed pilot: 3 document types must reach 97% field-level accuracy over 500 consecutive live documents. Acceptance is deemed granted 5 business days after the accuracy report is delivered unless Globex raises written objections.

Commercial contact: Lena Fischer, Head of Sales, lena.fischer@northwind-analytics.example
Technical contact: Marc Dubois, Solutions Architect, marc.dubois@northwind-analytics.example
