# RIDDRA FULL SYSTEM AUDIT

Last updated: 2026-05-01
Mode: final audit
Scope: codebase audit plus previously completed verification reports already present in this repo

## Audit posture

This is an honest whole-system review, not a feature summary.

Important limit:
- This pass is based on the current repository, existing runtime/report evidence already generated in `docs/`, and the durable behaviors visible in the app code.
- I did **not** run a brand-new end-to-end live test for every subsystem in this single pass.
- Where live proof already exists in prior reports, I use it.
- Where a subsystem is present in code but not freshly proven in current live evidence, I call that out directly.

---

## Part 1: System Overview

### Frontend architecture

- Next.js App Router application
- public product routes assembled from server components
- admin workspace under `/admin`
- stock, fund, IPO, search, index, news, account, and support surfaces
- canonical-first stock routing now prefers `stocks_master` and falls back to legacy `instruments`

### Backend architecture

- Next.js route handlers under `app/api`
- Supabase for auth, durable storage, and admin/state tables
- server-side and service-role Supabase clients for reads/writes
- Trigger-style durable job patterns and job tracking
- Yahoo importer plus generic CSV / Google Sheet / provider import pipeline

### Database architecture

- foundational public asset/content tables:
  - `instruments`
  - `companies`
  - `stock_pages`
  - `mutual_funds`
  - `ipos`
  - CMS/admin record tables
- legacy market-data durability lane:
  - `stock_quote_history`
  - `stock_ohlcv_history`
  - `benchmark_ohlcv_history`
  - `fund_nav_history`
- new Yahoo normalized stock lane:
  - `stocks_master`
  - `raw_yahoo_imports`
  - `stock_price_history`
  - `stock_market_snapshot`
  - `stock_valuation_metrics`
  - `stock_share_statistics`
  - `stock_financial_highlights`
  - `stock_income_statement`
  - `stock_balance_sheet`
  - `stock_cash_flow`
  - `stock_import_coverage`
  - `stock_import_activity_log`
  - `stock_import_reconciliation`
  - `stock_data_quality_summary`
  - `stock_data_freshness`
  - `stock_import_alerts`

### Data ingestion architecture

- manual CSV import path
- Google Sheet import path
- source-registry incremental sync path
- Yahoo import path
- separate admin CMS import path for editorial content

### Authentication architecture

- Supabase auth
- Google OAuth and email OTP / magic-link login
- Next.js middleware session refresh
- role and capability model:
  - admin
  - editor/operator
  - user
- durable product profile store with `last_active_at`

### Admin system

- protected admin shell
- admin users, activity log, content workspace, market-data ops, import control center, stock dashboard
- strong operator tooling, but some screens remain heavy and operationally dense

### SEO system

- route policy engine in `lib/seo-config.ts`
- `robots.ts`
- `sitemap.ts`
- JSON-LD rendering
- route-level canonical/indexability rules

### Activity logging system

- admin activity log for operator/admin actions
- Yahoo import activity log and reconciliation
- alert and freshness monitoring in the import control center

### High-level architecture diagram

```text
Browser
  -> Next.js App Router
      -> Public routes
          -> content assembly layer
              -> canonical stock resolver
              -> publishable CMS / admin records
              -> durable market-data readers
              -> Yahoo normalized stock readers
      -> Admin routes
          -> requireOperator / requireAdmin
          -> admin stores
          -> market-data import control center
          -> content workspace
      -> API routes
          -> auth/session routes
          -> admin import routes
          -> generic market-data ingest/sync routes
          -> search/index routes
  -> Supabase
      -> auth
      -> CMS/admin tables
      -> legacy market-data durability tables
      -> Yahoo normalized stock tables
      -> monitoring/quality/freshness tables
  -> External providers
      -> Yahoo chart/history
      -> Google Sheets / CSV / provider APIs
      -> Meilisearch
```

---

## Part 2: Data Engine Audit

### Tables and engine state reviewed

- `stock_ohlcv_history`
- `benchmark_ohlcv_history`
- `fund_nav_history`
- `stock_quote_history`
- `market_data_import_batches`
- `market_data_import_rows`
- `market_data_sources`

### Current assessment

#### 1. `stock_ohlcv_history`

Status:
- legacy durable stock history lane
- structurally sound in code
- currently **not** the main large-scale stock history source anymore; Yahoo normalized history now lives in `stock_price_history`

Findings:
- unique upsert path exists in [lib/market-data-durable-store.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/market-data-durable-store.ts)
- duplicate protection key is effectively `slug + timeframe + bar_time + source_label`
- legacy stock reset report shows this table was intentionally cleared during stock reset

Risks:
- medium: public stock code still has some legacy presence checks against this table
- medium: old and new stock history lanes coexist, which raises long-term confusion risk

Suggestion:
- keep it for legacy/public durable flows only, and document that `stock_price_history` is now the canonical Yahoo stock-history lane

#### 2. `benchmark_ohlcv_history`

Status:
- benchmark history lane looks well modeled and still relevant

Findings:
- migration and write path exist
- uniqueness is `index_slug + date + source_label`
- no fresh live integrity run was done in this audit pass

Risks:
- medium: not enough recent live proof in the current audit trail
- low: model itself is clean

Suggestion:
- run a focused benchmark integrity proof before scale-sensitive index work

#### 3. `fund_nav_history`

Status:
- active durable mutual-fund NAV lane

Findings:
- source-registry sync still writes here
- uniqueness is `slug + nav_date + source_label`
- the repo still contains overlapping `mutual_fund_nav_history`

Risks:
- high: overlapping NAV models create operator confusion
- medium: stale reads are possible if one surface uses the wrong NAV table

Suggestion:
- formally designate `fund_nav_history` as canonical and plan later cleanup of `mutual_fund_nav_history`

#### 4. `stock_quote_history`

Status:
- legacy latest-quote-over-time lane

Findings:
- unique key in code path is `slug + quoted_at + source_label`
- current stock route system mainly relies on Yahoo normalized `stock_market_snapshot` for the new universe
- legacy table still matters for older route fallbacks and legacy durability surfaces

Risks:
- medium: split between `stock_quote_history` and `stock_market_snapshot`
- low: duplicate controls are present

Suggestion:
- avoid mixing these two concepts in the UI; treat `stock_market_snapshot` as the new stock-universe source

#### 5. `market_data_import_batches`

Status:
- good batch-level tracking foundation for generic imports

Findings:
- active in manual CSV / Google Sheet / source-registry import flow
- durable row/batch design is production-grade

Risks:
- medium: generic market-data import system and Yahoo-specific import system both exist, which increases operator cognitive load

Suggestion:
- retain both, but separate them clearly in docs and admin naming

#### 6. `market_data_import_rows`

Status:
- strong row-level tracking model

Findings:
- supports validation, warnings, duplicate-state handling, and error visibility

Risks:
- low at schema level
- medium operationally because some admin screens can still become heavy if too many rows are loaded at once

Suggestion:
- continue using bounded pagination everywhere row-heavy data is shown

#### 7. `market_data_sources`

Status:
- active incremental sync registry

Findings:
- sync state, source identity, and duplicate-source matching are present
- identity matching logic is more mature than earlier iterations

Risks:
- medium: the repo still contains older orchestration abstractions (`source_contracts`, `ingest_jobs`, readiness tables)
- medium: this increases architectural overlap

Suggestion:
- make `market_data_sources` the documented canonical source-registry layer

### Cross-cutting data engine findings

#### Critical / high

1. Dual stock-data architecture remains a scale risk
- Severity: High
- Old durable stock tables and new Yahoo normalized tables coexist.
- This is survivable, but it is easy for future features to read the wrong layer.
- Fix: publish one internal data-source-of-truth matrix by surface.

2. Full-stock daily freshness is still not production-acceptable
- Severity: Critical
- Same-day-only mode stabilized importer behavior, but freshness for the current date is still not acceptable for unattended cron readiness.
- Fix: finish provider-aware daily update policy for non-trading-day / latest-available-date handling, then re-prove full-universe daily freshness.

3. Fundamentals remain blocked at scale
- Severity: High
- Yahoo price/history is usable; Yahoo protected fundamentals are not.
- Fix: keep fundamentals disabled for batch and use the separate Phase 2 plan.

#### Medium

4. NAV table overlap remains unresolved
- Severity: Medium
- `fund_nav_history` and `mutual_fund_nav_history` both exist.
- Fix: cleanup plan and surface-level deprecation.

5. Generic market-data ingest and Yahoo-specific ingest overlap conceptually
- Severity: Medium
- Fix: operator docs and route labeling should keep “generic provider import” and “Yahoo stock import” separate.

6. Live integrity proof for benchmark/fund lanes is thinner than for Yahoo stock lanes
- Severity: Medium
- Fix: run focused benchmark/NAV verification when those surfaces become a priority.

---

## Part 3: Auth and User System

### What is implemented

- Google OAuth is implemented in [app/(auth)/actions.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/%28auth%29/actions.ts)
- email OTP login is implemented
- logout route clears auth cookies and signs out server-side
- middleware refreshes sessions for protected surfaces
- role/capability checks exist through `requireUser`, `requireOperator`, and `requireAdmin`
- last-active tracking is now updated on meaningful authenticated requests with throttling

### Findings

#### Strengths

- protected routes are well covered structurally
- admin layout re-checks permissions server-side
- session refresh is centralized in middleware
- `last_active_at` logic is much better than earlier state

#### Risks

1. Local auth bypass and open admin access flags are dangerous if misconfigured
- Severity: High
- The code supports trusted-local bypass and open admin access helpers.
- This is useful in dev, but disastrous if enabled incorrectly in deployed runtime.
- Fix: deployment checklist must explicitly assert these are off in production.

2. Admin identity is partly email-based in middleware
- Severity: Medium
- Middleware uses admin-email checks for some operator gating before deeper capability checks.
- The deeper server-side guards are stronger, but the layered model is still more complex than ideal.
- Fix: keep role/capability checks authoritative in server loaders and APIs.

3. Session expiry / recovery is implemented, but not freshly proven in a full end-to-end hosted session-expiry test in this audit pass
- Severity: Medium
- Fix: run one hosted auth continuity proof before scale.

4. `createSupabaseReadClient()` can use service-role server-side
- Severity: High
- This is not a direct browser secret leak, but it weakens the distinction between public-safe reads and privileged reads.
- Fix: after RLS hardening, reduce or eliminate service-role fallback for general read client usage.

### Auth verdict

- Good for limited live use
- Not yet hardened enough to call fully security-finished production auth infrastructure

---

## Part 4: Admin Panel Audit

### `/admin/users`

Strengths:
- role management
- tier management
- last-active display improvements
- guarded self-delete protection

Issues:
- full user list loads in one pass
- no advanced pagination/sorting on every dimension yet
- backfill logic is helpful but not a substitute for full observability

Severity:
- Medium UX / scale risk

### `/admin/activity-log`

Strengths:
- filtering and grouping are good
- route feels operationally useful

Issues:
- loads `500` entries at once
- can become heavy at scale
- no explicit server pagination

Severity:
- Medium

### `/admin/market-data/import`

Strengths:
- duplicate handling
- validation path
- activity log integration

Issues:
- generic import path is good, but complexity is high
- not all operators will distinguish generic import vs Yahoo stock import easily

Severity:
- Medium UX clarity risk

### `/admin/market-data/sources`

Strengths:
- real source-registry and sync state
- incremental sync foundation is solid

Issues:
- overlaps conceptually with other import systems
- needs stronger operator clarity about which source lanes are still canonical

Severity:
- Medium

### `/admin/content`

Strengths:
- broad family support
- strong search and editor entry points

Issues:
- it is powerful, but broad enough to intimidate non-technical editors
- some runtime still depends on schema/service-role posture for operator CMS durability

Severity:
- Medium

### Admin UX issues summary

High:
- import control center is much better than before, but still dense and operationally heavy for non-technical admins

Medium:
- some large tables need deeper pagination
- generic import vs Yahoo import vs CMS import distinction should be clearer
- monitoring is strong internally, but still not external-alerting-ready

---

## Part 5: Data Ingestion and Sync

### CSV import

Assessment:
- implemented and structurally sound
- duplicate handling exists
- batch and row tracking are real strengths

Risk:
- medium only if operators misuse import type/source mapping

### Google Sheet import

Assessment:
- present in the same shared import engine
- source-registry integration is solid

Risk:
- medium due to remote sheet/schema drift, not app architecture

### Yahoo ingestion

Assessment:
- chart/history path is the strongest external data lane in the system
- protected quoteSummary/fundamentals path is still blocked/degraded

Risks:
- high for any plan that depends on live fundamentals at scale
- medium for same-day provider availability variance on some symbols

### Source registry

Assessment:
- one of the cleaner parts of the data system

### Incremental sync

Assessment:
- thoughtful logic exists for latest stored date, preview, no-new-rows, retry/cooldown behavior

### Ingestion audit summary

Critical:
- full-universe unattended daily freshness is still not proven

High:
- Yahoo fundamentals should remain disabled for batch

Medium:
- multiple ingestion abstractions increase maintenance cost

---

## Part 6: Performance Audit

### Current state

From the latest local performance evidence in repo docs:

- `/admin/market-data/import-control-center`
  - cold local first-hit improved significantly
  - warm local route can be around `1.11s`
- `/stocks`
  - warm local route around `0.56s`
- `/stocks/reliance-industries`
  - warm local route around `1.54s`
- `/sitemap.xml`
  - around `1.87s`
- search suggestions
  - around `2.98s`

### Strengths

- canonical stock discovery path was optimized heavily
- stock listing no longer requires full enrichment on first render
- normalized stock detail moved off the first render path
- control center now has lightweight mode

### Remaining bottlenecks

1. First-hit dev compile overhead still exists
- Severity: Medium

2. Search remains multi-source and still not extremely cheap
- Severity: Medium

3. Some admin dashboards still aggregate a lot of durable state in one request
- Severity: Medium

4. Many server-side reads still flow through Supabase over network in local development
- Severity: Medium

### Performance verdict

- Much better than earlier
- Good enough for limited use
- Still needs continued discipline around admin payload size and server-side read cost

---

## Part 7: SEO Audit

### What is strong

- explicit route policy model
- `robots.ts`
- `sitemap.ts`
- route-specific canonical/indexability handling
- JSON-LD support
- admin and private routes are marked non-indexable

### Risks

1. SEO is intentionally conservative for many surfaces
- Severity: Medium
- mutual funds, wealth, compare, and news detail pages are intentionally excluded
- that is not broken, but it limits SEO reach

2. Canonical stock discovery is now broader, but legacy/public overlap still needs careful long-term canonical governance
- Severity: Medium

3. Search results and stock hub are indexable, which is useful, but can create quality risk if thin pages proliferate
- Severity: Medium

4. News detail noindex posture may reduce discoverability if editorial strategy later changes
- Severity: Low, but strategic

### SEO verdict

- structurally thoughtful
- not broken
- still in a cautious, partly intentionally underexposed state

---

## Part 8: Security Audit

### Strong areas

- most admin APIs are protected with `requireAdmin` or `requireOperator`
- middleware adds secure headers
- auth/session refresh logic exists
- a lot of admin input sanitization exists in `lib/admin-operator-guards.ts`

### Vulnerabilities / concerns

#### Critical

1. Supabase Security Advisor RLS warnings are still unresolved until `0052` is applied
- Severity: Critical
- This is a real hardening gap.

#### High

2. `createSupabaseReadClient()` may use service role for general server-side reads
- Severity: High
- This is the sharpest code-level security smell remaining.

3. Dev bypass / open admin access flags are powerful and dangerous if deployed wrong
- Severity: High

4. No broad app-level rate limiting is evident for most admin/public APIs
- Severity: High
- Yahoo has guardrails; the whole app does not.

#### Medium

5. `dangerouslySetInnerHTML` exists for JSON-LD
- Severity: Medium
- It is expected for schema scripts, but it means schema inputs must remain trusted and sanitized.

6. Admin/public read separation is still partly enforced by “server-only path” rather than pure least-privilege RLS
- Severity: Medium

### Security verdict

- Not security-finished
- Good internal guard coverage in code
- Still needs RLS hardening and read-client tightening before true production confidence

---

## Part 9: UI / UX Audit

### Strengths

- stock detail pages are safer and clearer than earlier
- canonical-only stocks render without crashing
- admin surfaces are rich and operational
- empty-state handling is much better in stock data views

### Issues

1. Import Control Center is strong but dense
- Severity: Medium

2. Some admin tables still need broader sort/pagination consistency
- Severity: Medium

3. Data clarity around “legacy vs canonical vs normalized vs durable” is still too technical for non-engineer admins
- Severity: High UX clarity risk

4. Partial fundamentals story is still confusing for public/admin expectations
- Severity: Medium

### UX verdict

- Good progress
- Still too operator-heavy in some places

---

## Part 10: Logging and Monitoring

### Strong areas

- admin activity log exists
- import activity log exists
- reconciliation exists
- quality summary exists
- freshness exists
- internal alert model exists
- control center exposes a meaningful amount of operational state

### Gaps

1. No external notifications yet
- Severity: Medium

2. Monitoring is very app-facing, not infra-facing
- Severity: Medium

3. Some monitoring confidence still depends on successful freshness generation and job discipline
- Severity: Medium

### Observability verdict

- strong for an internal operator dashboard
- not yet mature external operations monitoring

---

## Part 11: Edge Case Testing

### Covered well

- missing normalized stock data now degrades safely
- canonical-only stock routes render safe pages
- duplicate-key Yahoo daily history bug was fixed
- activity/reconciliation step-name mismatch was fixed
- invalid/missing data is usually surfaced as warning/empty state rather than 500

### Remaining break points

1. Full-universe daily freshness depends on provider target-date availability
- Severity: High

2. Fundamentals provider lane is still blocked
- Severity: High

3. Legacy/new data-layer overlap can still confuse future developers and operators
- Severity: Medium

4. Some old tables and routes remain in the repo without being fully retired
- Severity: Medium

---

## Part 12: Final Report

### 1. Critical issues: must fix before scale

1. Apply and verify [db/migrations/0052_harden_public_table_rls.sql](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/db/migrations/0052_harden_public_table_rls.sql)
2. Tighten or retire the service-role fallback behavior in [lib/supabase/admin.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/supabase/admin.ts) for general read usage
3. Finish full-universe same-day freshness policy for the live operating date before enabling unattended cron
4. Keep Yahoo fundamentals disabled for scale until a separate fundamentals source strategy is implemented

### 2. High priority issues

1. Publish a canonical data-source matrix so legacy and new stock tables are not confused
2. Resolve NAV-table overlap (`fund_nav_history` vs `mutual_fund_nav_history`)
3. Add broader API rate limiting / abuse control
4. Prove hosted auth continuity and session-expiry behavior in one clean end-to-end run
5. Simplify operator messaging around import systems and source lanes

### 3. Medium improvements

1. Add deeper pagination to large admin tables
2. Add external alert delivery later
3. Further simplify Import Control Center for non-technical admins
4. Improve search performance and source-graph caching further
5. Reduce architectural overlap in older market-data execution abstractions

### 4. Nice-to-have improvements

1. More benchmark/fund live integrity audits
2. More automated negative security checks
3. Friendlier editor-facing data-truth explanations
4. Cleaner long-term legacy stock-layer cleanup after full route migration settles

---

## System Score

- Data Engine: `7/10`
- Security: `5/10`
- Performance: `7/10`
- SEO: `7/10`
- UX: `6/10`
- Overall: `6.5/10`

## Final verdict

**SAFE FOR LIMITED USE**

Why not “SAFE FOR PRODUCTION”:

- RLS hardening is still pending
- read-privilege posture is not strict enough yet
- cron and full-universe daily freshness are not ready
- Yahoo fundamentals at scale are still unavailable

Why not “NOT SAFE”:

- public stock routes are stable
- core admin systems exist and are guarded
- price/history ingestion is real and largely durable
- logging, reconciliation, quality, and freshness systems are meaningfully in place

The platform is credible for controlled usage and continued rollout, but it is **not yet safe for broad unattended scale**.
