# Riddra Page Information Model

This document is the human-readable companion to the typed canonical page model in [`lib/page-information-model.ts`](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/page-information-model.ts).

Use that typed registry as the source of truth for:
- page-family implementation decisions
- beta field scope
- preview-data boundaries
- truth-state behavior
- source attribution rules
- sidebar discipline

Do not introduce page-local field lists that drift away from the registry.

## How to use it

When building or refactoring a page family:
1. Read the relevant entry from `getRiddraPageInformationModel(pageType)`.
2. Treat `sections.required` and `betaFields.required` as the beta MVP contract.
3. Treat `previewAllowedFields` as localhost-only or explicitly-labeled preview scope.
4. Treat `forbiddenFields` as out of scope until the information model is revised.
5. Keep public trust-state wording and attribution aligned to the registry.

## Canonical page types

### Stock
- Required beta sections:
  - Hero
  - Summary strip
  - Top research board
  - Stock details
  - Shareholding
  - Price chart
  - Trailing returns
  - Quick stats
  - Market snapshot
  - Actions and docs
  - Annual returns
  - Fundamentals snapshot
  - Profitability and balance-sheet lens
  - Peer comparison
  - Related routes
  - Latest news section
  - Analyst section
- Optional beta sections:
  - Research watchpoints
  - Benchmark read note
  - Filings panel
  - Ownership quality note
- Required beta fields:
  - Company name
  - Exchange symbol
  - Sector
  - Benchmark
  - Latest quote or close
  - Truth state
  - Last trusted update
  - Chart bars when retained
  - Session OHLCV when retained
  - Peer route links
  - Source labels
- Preview allowed:
  - Extended fundamentals
  - Long-window return rows
  - Latest news list
  - Analyst checklist details
  - Localhost preview benchmark overlays
- Forbidden:
  - Fake analyst ratings
  - Target price
  - Recommendation score
  - Options OI
  - PCR
  - VIX
  - Unsupported transcript layer
- Sidebar blocks:
  - Quick stats
  - Compact market snapshot
  - Actions and docs

### Mutual fund
- Required beta sections:
  - Hero
  - Return strip
  - Top research board
  - Fund facts
  - Allocation and holdings
  - NAV chart
  - Return ladder
  - Rolling and annual returns
  - Quick stats
  - Fees and docs
  - Manager context
  - Risk and quality
  - Related routes
- Optional beta sections:
  - Overlap notes
  - Category rank
  - Selection checklist
  - Latest updates or news placeholder
- Required beta fields:
  - Fund name
  - Category
  - Benchmark
  - Latest NAV
  - Truth state
  - Last trusted update
  - Expense ratio when durable
  - Fund manager name when CMS-backed
  - Source labels
- Preview allowed:
  - Category rank
  - Overlap analytics
  - Extended rolling-return grids
  - Latest updates placeholder
- Forbidden:
  - Star ratings
  - Alpha
  - Sharpe
  - Sortino
  - Embedded SIP calculator outputs
- Sidebar blocks:
  - Quick stats
  - Market snapshot
  - Fees and docs
  - Manager context
  - Related routes

### Index
- Required beta sections:
  - Hero
  - Breadth strip
  - Session timeline chart
  - Session scoreboard
  - Breadth section
  - Leadership section
  - Concentration and composition
  - Timeline section
  - Quick stats
  - Market snapshot
  - Route handoffs
  - Compact actions
- Optional beta sections:
  - Component roster
  - Coverage note
  - Analyst watchpoints
- Required beta fields:
  - Benchmark title
  - Latest move
  - Breadth counts
  - Truth state
  - Last update
  - Source posture
- Preview allowed:
  - Deeper roster coverage
  - Extended timeline history
  - Sparse leadership rows
- Forbidden:
  - Options OI
  - PCR
  - VIX
  - Synthetic full heatmap without data lane
- Sidebar blocks:
  - Quick stats
  - Market snapshot
  - Compact actions and routes
  - Coverage note when needed

### Markets overview
- Required beta sections:
  - Market board
  - Benchmark snapshot cluster
  - Top gainers
  - Top losers
  - Metals snapshot
  - FX snapshot
  - Benchmark chart board
  - Route handoffs
- Optional beta sections:
  - Fund ideas
  - Sector snapshot
  - IPO watchlist
- Required beta fields:
  - Tracked index snapshots
  - Tracked mover rows
  - Metals values when sourced
  - FX anchor values when sourced
  - Truth states
  - Freshness labels
- Preview allowed:
  - Sector board placeholder
  - IPO board placeholder
  - Future global-market support placeholder
- Forbidden:
  - Synthetic macro dashboard
  - Synthetic sector heatmap
  - Exchange-wide fake mover coverage
- Sidebar blocks:
  - None required

### ETF
- Required beta sections:
  - Hero
  - Price or NAV snapshot
  - Underlying benchmark
  - Expense ratio
  - Issuer context
  - Chart
  - Return table
  - Quick stats
  - Actions and docs
  - Related routes
- Optional beta sections:
  - AUM
  - Holdings or exposure
  - Liquidity note
  - Tracking-difference note
  - Peer ETFs
- Required beta fields:
  - ETF name
  - Issuer
  - Benchmark or index
  - Latest price or NAV truth state
  - Expense ratio when durable
  - Source and freshness
- Preview allowed:
  - AUM
  - Tracking error
  - Liquidity metrics
  - Peer ETFs
- Forbidden:
  - Options data
  - Tax optimizer
  - Advanced creation redemption analytics
- Sidebar blocks:
  - Quick stats
  - Market snapshot when relevant
  - Docs and actions

### PMS
- Required beta sections:
  - Hero
  - Strategy summary
  - Manager or firm
  - Mandate style
  - Minimum ticket
  - Benchmark
  - Documents
  - Route context
- Optional beta sections:
  - Return highlights
  - Portfolio snapshots
  - Manager note
- Required beta fields:
  - Strategy name
  - Provider
  - Category or style
  - Minimum investment
  - Benchmark
  - Documents
  - Truth state
- Preview allowed:
  - Returns
  - AUM
  - Holdings
  - Portfolio snapshots
- Forbidden:
  - Client-performance claims without audited source
  - Unsupported scorecards
- Sidebar blocks:
  - Quick facts
  - Docs and actions
  - Market context only when directly helpful

### AIF
- Required beta sections:
  - Hero
  - Category
  - Strategy summary
  - Manager
  - Structure
  - Minimum commitment
  - Benchmark or reference index when used
  - Disclosures and docs
  - Route context
- Optional beta sections:
  - Sector exposure
  - Vintage note
  - Return summary
- Required beta fields:
  - Manager
  - Category
  - Structure
  - Minimum commitment
  - Documents
  - Truth state
- Preview allowed:
  - AUM
  - Holdings
  - Return track record
  - Composition notes
- Forbidden:
  - IRR or MOIC claims without source
  - Realized unrealized split without source
- Sidebar blocks:
  - Quick facts
  - Docs and actions

### SIF
- Required beta sections:
  - Hero
  - Strategy summary
  - Provider
  - Structure or type
  - Minimum investment
  - Risk posture
  - Docs and disclosures
  - Route context
- Optional beta sections:
  - Model allocation
  - Return snapshot
- Required beta fields:
  - Provider
  - Strategy type
  - Minimum investment
  - Documents
  - Truth state
- Preview allowed:
  - Returns
  - Composition
  - Model allocation
- Forbidden:
  - Unsupported payoff diagrams
  - Derived performance claims without source
- Sidebar blocks:
  - Quick facts
  - Docs and actions

### Learn
- Required beta sections:
  - Title
  - Category or track
  - Publish and update date
  - Author or source
  - Hero summary
  - Body content
  - Related lessons and routes
- Optional beta sections:
  - Glossary
  - Key takeaways box
  - Next lesson
  - References
- Required beta fields:
  - Title
  - Slug
  - Author
  - Publish date
  - Update date
  - Body content
  - Track or category
  - Related links
- Preview allowed:
  - Read time
  - Progress state
  - Quiz placeholder
- Forbidden:
  - Unlabeled AI-generated summaries
  - Fabricated references
- Sidebar blocks:
  - Contents list
  - Related lessons
  - Relevant market routes when useful

### Newsletter
- Required beta sections:
  - Issue title
  - Issue date
  - Summary
  - Body sections
  - Key links
  - Archive and related navigation
- Optional beta sections:
  - Editor note
  - Featured charts
  - Market recap box
- Required beta fields:
  - Issue title
  - Issue date
  - Summary
  - Body content
  - Archive links
- Preview allowed:
  - Subscription module
  - Engagement stats placeholder
- Forbidden:
  - Fake subscriber counts
  - Fake open rates
  - Fake sponsor blocks
- Sidebar blocks:
  - Archive links
  - Related routes
  - Signup CTA when real

## Shared trust-state requirements

Across public page families, use the shared public states only:
- `Verified`
- `Delayed Snapshot`
- `Read Failed`
- `Unavailable`
- `Not Available Yet`

Do not expose internal operator wording on public pages.

## Shared attribution requirements

Attribution should remain concise and should appear only where it materially improves trust:
- chart source
- quick-stats source
- disclosure or document source where relevant
- editorial source or reference context where relevant

## Consumption guidance

Future implementation work should consume the typed model directly.

Recommended pattern:
- page composition decides what to render from `sections`
- data loaders decide what must be backed by real data from `betaFields.required`
- preview systems are limited to `previewAllowedFields`
- blockers and out-of-scope work should be checked against `forbiddenFields`

If a new field or section is needed, update the typed registry first, then update the page implementation.
