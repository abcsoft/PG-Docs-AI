# Production Checklist

Go-live gate for PG Docs AI. Every item is either verified in the repo
(✅ = covered by tests/CI) or an operator action (☐).

## 1. Security & secrets

- ✅ Tenant isolation enforced in the repository layer, cross-tenant tests included
- ✅ Provider keys Fernet-encrypted at rest, write-only via the API
- ✅ Workspace API keys stored as SHA-256 hashes, shown once, org-bound, revocable
- ✅ API keys ignored forged `X-Org-Id` headers (tested)
- ✅ No secrets in code; `.env` files git-ignored; error envelope never leaks internals
- ✅ Admin endpoints gated by `ADMIN_EMAILS`, non-admins get 404
- ☐ Rotate `SECRET_ENCRYPTION_KEY` per environment; store in Secret Manager (never in tfvars)
- ☐ Generate a strong `BETTER_AUTH_SECRET`; enable `AUTH_JWT_ISSUER`/`AUTH_JWT_AUDIENCE` verification
- ☐ Set `APP_ENV=production` (docs off, production logging, CORS locked)
- ☐ Confirm CORS `allow_origins` equals the deployed web origin only
- ☐ Platform admin email list reviewed (each entry = cross-tenant access)
- ☐ Run ` SECURITY.md` disclosure contact: set `security@pgsofts.org` mailbox

## 2. Data & tenancy

- ✅ All tenant-owned tables carry indexed `tenant_id` with CASCADE deletes
- ☐ Enable PostgreSQL RLS as defence-in-depth (documented option; not on by default)
- ☐ Verify backup + restore on the production database (Neon PITR or equivalent)
- ☐ Document data-retention windows and the deletion path (document delete → chunks + blob gone)
- ☐ Test workspace deletion end-to-end in staging before launch

## 3. LLM providers

- ✅ Resolution order org key → server key → 503 with guidance
- ✅ Every call metered (tokens, cache tokens, cost, latency) including failures
- ✅ Rate limits per workspace (rpm + tokens/day), plan-aware, admin-overridable
- ☐ Set server-wide fallback keys (or decide BYO-only) before launch
- ☐ Confirm pricing table (`src/llm/pricing.py`) matches current model prices
- ☐ Run `make evals` against production models; record the baseline score
- ☐ Set model expectations in Settings UI screenshots (defaults: claude-sonnet-4-6, voyage-3.5)

## 4. Jobs & pipelines

- ✅ Ingestion idempotent, retried (max 3), failures surfaced on the document
- ☐ If QUEUE_DRIVER=cloud_tasks: verify OIDC invoker permissions and a 2xx from `/internal/jobs` in staging
- ☐ If QUEUE_DRIVER=arq: provision a always-on worker and monitoring for it
- ☐ Load-test ingestion with your largest real documents (20 MB limit)

## 5. Web & auth

- ✅ Session-gated routes in middleware; auth pages redirect when signed in
- ✅ Better Auth email/password (+ optional SSO env-gated)
- ☐ Configure `BETTER_AUTH_URL` to the production domain (https://pgsofts.org)
- ☐ Verify password-reset email delivery (Resend configured + domain verified)
- ☐ DNS: apex + www → deployed web; TLS active
- ☐ Set Vercel env: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_*`, `NEXT_PUBLIC_API_URL`

## 6. Billing (optional module)

- ✅ Feature-flagged; off = no Stripe code executes
- ☐ Create products/prices in Stripe; set `STRIPE_PRICE_PRO`
- ☐ Webhook endpoint + `STRIPE_WEBHOOK_SECRET` verified with a test event
- ☐ Test upgrade → rate limits change → cancellation → portal flows in staging
- ☐ Tax settings reviewed in Stripe

## 7. Observability & ops

- ✅ Structured logs with request/tenant ids; OTel spans incl. `llm.call` attributes
- ✅ `/health` endpoint for probes
- ☐ Point `OTEL_EXPORTER_OTLP_ENDPOINT` at a collector; create dashboards (p95 latency, error rate, LLM spend/day, ingestion failures)
- ☐ Alerts: 5xx rate, provider 5xx/429 ratio, queue depth, DB connections
- ☐ Log retention and PII scrubbing policy confirmed with the log provider

## 8. Trust & legal pages

- ✅ Privacy, Terms, Security, About, Contact shipped; sitemap + robots updated
- ☐ Legal review of privacy/terms for your jurisdiction and entity name
- ☐ Replace contact mailbox placeholders with monitored inboxes
- ☐ Publish status page (even a simple one) and link it

## 9. Launch-day smoke test

- [ ] Sign up → workspace auto-created → upload PDF → ready state
- [ ] Chat: cited answer (with keys configured) + "not in your documents" case
- [ ] Summary, risks, extraction, comparison, report generate and export
- [ ] API key: create → call `GET /documents` with Bearer key → revoke → 401
- [ ] Usage dashboard shows the calls made above
- [ ] Admin panel accessible to allowlisted email only
- [ ] Demo seeding runs clean on the production database (optional demo workspace)
