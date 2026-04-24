# Riddra Masterplan

This is the single source of truth for how we build `riddra.com`.

## Core mission

Build Riddra as an Indian market intelligence platform that combines:

1. SEO-first market pages
2. Subscription-first trader tools
3. Structured financial data
4. Future AI workflows built on top of trusted internal data

## Product strategy

Riddra is not starting as a broker or a bloated super app.

We are starting with:

1. Stock pages
2. IPO hub
3. Mutual fund pages
4. Screener
5. Premium dashboard
6. Option chain and OI analytics
7. Index intelligence pages for `Nifty50`, `BankNifty`, `Fin Nifty`, and `Sensex`
8. Build tracker page for macro execution visibility
9. Advanced charts with proprietary indicator access
10. Free tools layer for user activation

Later expansions:

1. Courses
2. AI copilot
3. PMS pages
4. AIF pages
5. SIF pages
6. ETF pages
7. Broker or partner execution flows
8. Portfolio tracker with CSV import and broker connectivity
9. Notification and engagement engine
10. Smart search-result layer

## Official data policy

This rule is mandatory for the whole project:

We will use legitimate and official sources wherever possible.

Priority order:

1. Official exchange data or officially licensed market data
2. Official company filings and disclosures
3. Official AMC, fund house, exchange, depository, regulator, and issuer data
4. Official APIs from trusted providers with clear usage rights
5. Only then carefully selected third-party aggregation sources

Examples of preferred sources:

1. NSE
2. BSE
3. SEBI
4. AMFI
5. Company investor relations pages
6. Exchange circulars and filings
7. Official IPO documents like DRHP, RHP, prospectus, and allotment updates

Important:

- Realtime data is not the same as unofficial scraped data.
- Before promising realtime market features, we must confirm source licensing, refresh limits, commercial rights, and compliance boundaries.
- Any feature using live or near-live data must be documented with its exact source and refresh behavior.

## Architecture principles

Use this stack unless we consciously approve a change:

1. `Next.js` on Vercel for the website and app
2. `Supabase` for auth, Postgres, storage, and access control
3. `Redis` for hot caches, queue support, and fast dashboards
4. Dedicated ingest workers outside Vercel for live pipelines and recurring sync jobs

## Build principles

Every new feature should follow these rules:

1. Reusable design system first
2. Reusable route patterns first
3. Structured data model first
4. SEO metadata and schema planning first
5. Feature gating planned before premium release
6. Source documentation added before production data integration
7. New domains should plug into reusable modules instead of custom one-off systems

## Platform OS rule

Riddra should evolve like a structured fintech operating system, not a fragile app.

That means:

1. New route families should feel closer to installing a module than commissioning a bespoke rebuild
2. CMS blueprints, field packs, workflow states, alerts, and lifecycle rules should be reusable across asset classes
3. Providers like email, SMS, WhatsApp, analytics, payments, AI, and broker connectivity should be replaceable through stable adapters
4. The backend should eventually let operators enable or expand product capabilities without code edits for every small change
5. WordPress-like ease is the goal, but with stricter structured data, audit, and lifecycle discipline

## Low-cost AI rule

Riddra should be AI-ready without becoming AI-expensive by default.

That means:

1. Deterministic tools, formulas, templates, and retrieval-backed results should do most of the work
2. Real model calls should be optional, admin-controlled, and safe to disable without breaking core product flows
3. If AI is enabled, it should sit on top of trusted internal data rather than inventing unsupported answers
4. Expensive always-on chat is not the default product model; smart-feeling tools and structured summaries come first
5. AI costs should be treated like an operational budget with clear modes such as `formula_first`, `hybrid_optional`, and `live_ai_on_demand`

## Standardization rules

We will keep these standardized across the app:

1. Design language
2. Page layout system
3. Content block order
4. Metadata pattern
5. Naming conventions
6. Database naming
7. Feature documentation
8. Progress tracking

## Standard page flow

Stock pages should eventually follow:

1. Hero summary
2. Price snapshot
3. Chart block
4. Key metrics
5. Fundamentals
6. Shareholding
7. Peer comparison
8. News and filings
9. Premium upgrade prompts

IPO pages should eventually follow:

1. Hero summary
2. Dates and price band
3. Issue details
4. Subscription tracker
5. GMP block
6. Allotment block
7. Listing block
8. Company fundamentals
9. FAQ and structured content

IPO lifecycle rule:

1. A company can begin as `upcoming_ipo`, move to `open_ipo`, then `listed`
2. While in IPO mode, the public page should show GMP, subscription, allotment, and issue-specific blocks
3. Once officially listed, the primary long-term route should move into the listed stock system
4. The IPO route should remain as an archive and lifecycle history page, not disappear
5. The listed stock route should inherit the company identity cleanly so we do not duplicate the business in two unrelated systems

Mutual fund pages should eventually follow:

1. Hero summary
2. NAV snapshot
3. Return table
4. Risk and category
5. Holdings
6. Sector allocation
7. Fund manager section
8. Peer comparison
9. Premium prompts

Reference-grade page rule:

1. A route family is not considered truly launch-ready just because it exists and ranks
2. Charts should eventually include denser indicator controls, drawings, timeframe switching, saved layouts, and option-context workflows
3. Stock pages should eventually include stronger quote context, performance ranges, financial statements, valuations, peer sets, event blocks, and news depth
4. Mutual fund pages should eventually include rolling returns, holdings history, allocation trends, overlap and compare workflows, and stronger risk framing
5. IPO pages should eventually include richer schedule detail, subscription history, reservation breakup, GMP context, registrar/allotment actions, and archive continuity
6. Wealth-product pages should eventually include strategy fit, risk, liquidity, taxation, cost, holdings, and compare-ready research blocks
7. The build tracker should keep calling out this depth gap explicitly until the public product feels closer to a serious market-intelligence platform than a route-complete shell

Index pages should eventually follow:

1. Hero summary
2. Index move and mood snapshot
3. Pullers and draggers
4. Component contribution table
5. Breadth and weightage interpretation
6. Historical archive
7. Alerts and premium prompts

Portfolio tracking should eventually follow:

1. CSV import
2. Smart holdings parser
3. Portfolio dashboard
4. Broker connectivity
5. Holdings analytics
6. AI summaries and alerts
7. Notification preferences and consent-ready channels

Portfolio AI validation rule:

1. CSV imports should not be blindly accepted when the data looks inconsistent
2. The system should normalize symbols and holdings intelligently, but uncertain matches must be confirmed by the user
3. If quantities, symbols, or prices appear mismatched, the user should be asked to verify them against broker or demat records
4. Saved portfolios should preserve an audit summary of what changed from the previous import

Notification readiness rule:

1. Signups should prepare the backend for future email newsletters, WhatsApp alerts, SMS alerts, and app push notifications
2. Notification preferences, consent state, and channel mapping should be treated as first-class backend concepts
3. Delivery providers can change later, so the backend should stay provider-agnostic and event-driven

Naming rule:

1. `Riddra` is the active brand name and should remain centralized so any future naming updates stay controlled and shared-config driven
2. Avoid hardcoding the current name in scattered feature logic, templates, or AI outputs

Manual override and data-ops rule:

1. Every important public asset should be editable from an internal admin layer
2. Dynamic source-fed fields and manual editorial fields should be stored separately
3. We must support temporary manual overrides when a source fails or lags
4. Manual overrides should record who changed the field, when it changed, and why
5. When the source is healthy again, we should be able to switch back without losing override history

CMS and revision-control rule:

1. Riddra should have a real internal CMS for stocks, IPOs, mutual funds, and future wealth products
2. Staff should be able to manually edit page blocks, upload documents, and enrich company information without touching code
3. Every editorial change should create a revision log with user, timestamp, changed fields, and rollback support
4. The backend should feel operationally simple, like a structured finance CMS rather than a developer-only console

## Documentation rules

Every meaningful change should update at least one of these:

1. `docs/MASTERPLAN.md`
2. `docs/PROGRESS.md`
3. `docs/ENGINEERING_STANDARDS.md`

## Phase map

### Phase 0

Foundation:

- App shell
- Design system
- Pricing
- Login and signup shell
- SEO-ready route families
- Development standards

### Phase 0.1

Platform plumbing:

- Supabase auth
- Base schema
- Seed content records
- Entitlements model

### Phase 1

Launch shell, traffic engine, and daily habit surfaces:

- Stock pages
- IPO hub
- Mutual fund pages
- Index intelligence pages
- Build tracker visibility
- Sitemap expansion
- Structured SEO
- Launch-trust pages
- Public onboarding
- Tools, alerts, and search-led activation
- Account inbox and setup shell

### Phase 2

Data foundation, CMS execution, and source pipelines:

- Supabase production wiring
- CMS editing and rollback
- Source registry and ingest jobs
- Source-failure override handling
- IPO-to-listed lifecycle automation
- Realtime and near-realtime data planning

### Phase 3

Subscriber workspace and retention systems:

- Portfolio tracker
- CSV import review
- Manual portfolio builder
- Broker connectivity
- Watchlists and saved screens
- Notifications and inbox
- Subscription and entitlement boundaries

### Phase 4

Trader workstation and advanced analytics:

- Option chain
- OI analytics
- Advanced charts and proprietary indicator access
- Scanner and intraday workstation flows
- Index replay and ranked-mover tools
- Power-user alerts and presets

### Phase 5

Wealth, investor, and long-tail asset expansion:

- Mutual fund depth
- ETF pages
- PMS pages
- AIF pages
- SIF pages
- Investor calculators and wealth tools

### Phase 6

Learning, creator engine, and distribution:

- Learn hub with embedded videos
- Courses and bundles
- Webinar and workshop flows
- Newsletter and content distribution
- Creator media and publishing workflow

### Phase 7

AI copilots, apps, and ecosystem expansion:

- Smart structured search
- AI validation and summaries
- Mobile app readiness
- Partner or execution ecosystem exploration
- AI quality and human-review guardrails

### Phase 8

Scale architecture, CMS operating system, and plugin-style expansion:

- Thousands-of-pages CMS operating system
- Plugin-style route families
- Deep SQL memory and audit model
- Separation of source, editorial, and derived layers

### Phase 9

One-click modules, integration marketplace, and operator-grade extensibility:

- One-click route-family installers
- Replaceable provider adapters
- Admin-side configuration panels
- Reusable field packs and CMS kits

### Phase 10

Growth automation, CRM, and subscriber lifecycle operations:

- Email, WhatsApp, SMS, and push campaign engine
- CRM segments and lead scoring
- Broker-reconciliation and portfolio exception desk
- Help center, support workflows, and user success operations
- Consent-aware lifecycle campaigns and recovery playbooks

### Phase 11

Reliability, observability, security, and release confidence:

- Release QA and regression discipline
- Observability and failure visibility
- Security and operator access control
- Backup, recovery, and performance health

### Phase 12

Mobile readiness, experience polish, and guided learning-community expansion:

- Mobile app and push-ready product contracts
- Mentorship and guided cohort-style learning tracks
- Multilingual creator-media expansion
- Product design-system refinement and launch-grade UX polish

### Phase 13

Private beta activation, credential handoff, and internal-production control:

- Provider credentials and env activation
- Private-beta mode control
- Deployment hardening and access gating
- Preflight verification after activation
- Owner accountability and rollout runbook

### Phase 14

Private beta operations, monitoring, and trust-focused iteration:

- Limited private beta enablement
- Monitoring, support, and incident coverage
- Controlled-traffic provider verification
- Trust-copy and onboarding iteration

### Phase 15

Internal production hardening and deferred commercial lanes:

- Reference-grade charts and trader workstation
- Reference-grade stock, fund, IPO, and wealth detail pages
- Structured research columns and comparable metrics
- Durable search, workflow, and data-hardening depth
- Marketing and announcement readiness deferred until later
- Billing and monetization deferred until company readiness
- Roadmap reset before any broad public go-live

### Phase 16

Public-launch expansion after private beta:

- Reference-grade education and webinar library
- Research archives, announcements, and event-history depth
- Evidence-led product parity upgrades
- Broad-public smoke, announcement, and commercial rollout after private-beta proof

## Proprietary indicator track

Riddra should support a proprietary charting edge as a subscription feature.

Current direction:

1. Keep `Advanced Charts` as a first-class paid product surface.
2. Use your TradingView indicator as a subscriber benefit under the minimum paid plan if the access model works commercially.
3. Prefer preserving the exact logic by starting from the Pine Script, not by approximating from screenshots.
4. Decide later whether this remains TradingView-linked, gets rebuilt natively, or supports both access paths.

## Cost-efficiency principle

We will prefer:

1. Reusing standard components
2. One shared content system
3. One shared page pattern per asset class
4. One shared source registry per data domain
5. One documented roadmap and progress log

This reduces wasted credits, repeated code, repeated design work, and messy decisions.

## Temporary access rule

During the active build phase:

1. Treat subscriber-facing product pages as if every signed-up user has `Elite` access
2. Do not prematurely hide core product surfaces behind partial plan gating
3. Keep internal admin and staff operations pages protected
4. Final pricing boundaries and entitlements will be decided later after the product surface is clearer
