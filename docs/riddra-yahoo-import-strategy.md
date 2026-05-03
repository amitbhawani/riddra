# Riddra Yahoo Finance Import Strategy

Last updated: 2026-04-28

## Purpose

This document defines the production plan for building the Riddra Yahoo Finance data import system.

This stage is planning only.

What this document does:
- defines the phased implementation strategy
- defines the Yahoo data buckets Riddra needs
- separates backend ingestion from frontend presentation
- sets guardrails for durable, validated, editor-safe imports

What this document does not do:
- build the importer
- finalize every field mapping
- enable live production sync yet

## Product Goal

Riddra should be able to ingest selected Yahoo Finance market and company data through one controlled pipeline, store it durably, validate it, deduplicate it, and make it available for admin workflows and frontend display.

The system should support:
- stock-first rollout
- incremental sync
- durable history
- latest snapshot refresh
- admin visibility
- future scheduler support
- clean frontend consumption

## Core Principles

- One ingestion pipeline, not parallel ad-hoc importers.
- Durable database writes only.
- No local JSON fallback in hosted mode.
- Validation before persistence.
- Duplicate-safe writes.
- Explicit activity logging.
- Clear separation between:
  - raw imported market data
  - admin editorial data
  - computed Riddra presentation layer

## Three-Phase Plan

## Phase 1: Data Planning + Database Foundation

Goal:
Define exactly what Yahoo Finance data Riddra wants, where it should live, how it maps to existing stock/fund/index records, and what durable schemas and conflict keys are required.

Main outcomes:
- confirm durable tables and source registry design
- define import contracts per data bucket
- define mapping rules for stock symbols, benchmarks, and funds
- define freshness, conflict, and deduplication rules
- identify what should be stored as:
  - history
  - latest snapshot
  - structured profile data
  - computed Riddra layer

Includes:
- source planning
- field mapping
- data bucket classification
- schema compatibility review
- import batch and sync metadata requirements

Does not include:
- live Yahoo ingestion jobs
- frontend rendering work

## Phase 2: Backend Import + Admin System

Goal:
Build the Yahoo-backed backend ingestion and admin control system using the existing market-data import infrastructure.

Main outcomes:
- Yahoo source detection and normalization
- scheduler-ready sync jobs
- preview before import
- durable sync execution
- batch tracking
- source health and retry logic
- admin source registry and sync controls
- activity logging

Includes:
- Yahoo chart/latest snapshot fetch path
- source registry integration
- cooldown, retry, timeout, and failure controls
- validation and warning system
- admin source preview and source health tooling

Does not include:
- final public UI presentation polish for all imported buckets

## Phase 3: Frontend Display

Goal:
Show imported Yahoo-backed data clearly and safely on public stock pages and related frontend surfaces.

Main outcomes:
- frontend field parity with backend data
- chart/history display from durable imported rows
- latest market snapshot display
- valuation/statistics display
- company/profile/fundamental display
- clear fallback rules when Yahoo data is incomplete
- Riddra computed layer on top of imported raw data

Includes:
- route-level data wiring
- missing-data handling
- public presentation QA
- source-aware freshness display where needed

Does not include:
- uncontrolled direct frontend edits of imported time-series rows

## Yahoo Data Buckets

The Yahoo Finance import roadmap is organized into these 10 buckets.

### 1. Identity and Company Profile
- company name
- ticker / exchange symbol
- sector
- industry
- long business summary
- website
- exchange metadata
- quote type / instrument type

Target use:
- stock identity sections
- backend source mapping
- SEO/contextual content support

### 2. Historical Price Data
- daily OHLCV
- historical adjusted price references if required later
- rolling history used for charts and time-series calculations

Target use:
- `stock_ohlcv_history`
- chart rendering
- historical analytics

### 3. Latest Market Snapshot
- latest price
- previous close
- open
- high
- low
- day change
- day change percent
- latest volume
- quote timestamp

Target use:
- latest stock snapshot
- header/hero market panels
- search/index freshness layer

### 4. Valuation and Key Statistics
- market cap
- enterprise value
- trailing P/E
- forward P/E
- PEG
- price-to-book
- EV/revenue
- EV/EBITDA
- shares outstanding

Target use:
- stock metrics panels
- admin structured fields

### 5. Financial Statements
- income statement values
- balance sheet values
- cash flow values
- annual and quarterly views where available

Target use:
- fundamentals blocks
- derived ratios

### 6. Profitability, Growth and Health Ratios
- revenue growth
- profit growth
- margins
- ROE
- ROA
- ROCE if derivable
- debt / equity
- leverage and coverage indicators

Target use:
- performance/fundamental summaries
- Riddra quality layer

### 7. Dividends, Splits and Corporate Actions
- dividend rate
- dividend yield
- ex-dividend date
- payout history if available
- split history
- other corporate action signals where exposed

Target use:
- investor details
- long-term return context

### 8. Earnings, Calendar and Analyst Data
- earnings date / range
- EPS estimates
- earnings surprises if available
- analyst targets
- recommendation trend
- earnings calendar context

Target use:
- forecast modules
- analyst sections

### 9. Holders and Ownership
- major holders
- institutional ownership
- insider ownership
- mutual fund / institutional holding breakdown where Yahoo exposes it

Target use:
- ownership summaries
- investor composition sections

### 10. Options, News and Riddra Calculated Layer
- options metadata if needed later
- Yahoo-linked recent news references
- Riddra-calculated metrics based on imported raw data
  - return windows
  - volatility slices
  - range positioning
  - outperformance / comparison layers
  - internal scoring inputs

Target use:
- extended analytics
- frontend insight modules
- editorial/computed overlays

## Bucket-to-Storage Direction

| Bucket | Primary storage direction | Notes |
|---|---|---|
| Identity and Company Profile | structured profile table or durable record fields | not time-series |
| Historical Price Data | `stock_ohlcv_history` | core durable history |
| Latest Market Snapshot | `stock_quote_history` + latest derived snapshot | refresh from newest available data |
| Valuation and Key Statistics | structured snapshot/profile layer | likely latest-only |
| Financial Statements | structured financial statement layer | may need separate schema |
| Profitability, Growth and Health Ratios | structured snapshot + computed layer | some imported, some derived |
| Dividends, Splits and Corporate Actions | corporate-actions layer | may require separate durable tables |
| Earnings, Calendar and Analyst Data | structured event/snapshot layer | freshness-sensitive |
| Holders and Ownership | structured ownership layer | snapshot oriented |
| Options, News and Riddra Calculated Layer | mixed: raw source refs + computed | not all should be stored as raw Yahoo data |

## Implementation Strategy by Phase

### Phase 1 focus
- confirm which Yahoo buckets are in scope for v1
- confirm which tables already exist
- define any new durable tables needed
- define symbol-to-slug mapping rules
- define source registry metadata contract

### Phase 2 focus
- start with:
  - Historical Price Data
  - Latest Market Snapshot
  - Identity/Profile mapping needed for source confidence
- then expand to:
  - Valuation and Key Statistics
  - Earnings / Analyst data
  - Holders / Ownership

### Phase 3 focus
- wire stock pages to imported durable data
- preserve editorial override rules where needed
- show clear freshness and fallback behavior

## Data Quality Rules

Yahoo imports should follow these rules:
- no duplicate durable rows
- no blind overwrite unless configured
- explicit validation errors for invalid data
- warnings for suspicious but non-blocking data
- deterministic latest snapshot updates
- explicit source error state in registry

## Acceptance Definition

The Yahoo import system is ready for implementation when:
- the phase-by-phase work breakdown is agreed
- the data bucket scope is clear
- storage direction is defined
- admin workflow expectations are defined
- success criteria for each phase are documented

## Out of Scope for This Planning Pass

- full importer implementation
- live cron configuration
- provider switching logic beyond Yahoo
- full mutual fund / benchmark parity using Yahoo
- frontend redesign

## Next Step

Next execution step after this planning pass:
- move into Phase 1 task execution using the tracker in [docs/riddra-yahoo-import-tracker.md](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/docs/riddra-yahoo-import-tracker.md)
