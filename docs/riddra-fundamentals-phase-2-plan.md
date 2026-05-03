# Riddra Fundamentals Phase 2 Plan

Last updated: 2026-04-30

## Goal

Phase 2 for fundamentals should add reliable, usable company fundamentals without blocking the already-working Yahoo chart-based price system.

This plan assumes:

- price history and daily snapshots remain chart-driven
- Yahoo protected `quoteSummary` and financial-statement modules remain unreliable for batch use
- fundamentals should be introduced in layers, starting with the highest-value stocks first

## Phase 2 principles

1. Do not block the price-data pipeline while fundamentals are still partial.
2. Prefer reliability over theoretical coverage.
3. Make coverage status explicit in admin and public UI.
4. Keep raw-source provenance visible.
5. Start with the top stocks that matter most to users before widening the universe.

## 1. Top 50 stock manual data layer

### Purpose

Create a trusted fundamentals layer for the most important names first, even before large-scale automation is perfect.

### Scope

Start with approximately 50 high-priority stocks such as:

- Nifty 50 leaders
- highest-traffic stock pages
- stocks used in editorial content
- benchmark sector leaders

### Data to capture

- revenue
- EBITDA
- net profit
- EPS
- book value
- ROE
- ROCE
- debt/equity
- operating cash flow
- free cash flow if available
- dividend per share / yield
- promoter holding / major ownership summary

### Storage approach

Use the existing normalized stock fundamentals structure where possible, but allow editor-approved entries to be marked as:

- `source = manual_editor`
- `source_confidence = high`
- `coverage_scope = top_50`

### Why this helps

- immediate high-quality coverage for the most visible pages
- avoids waiting for a full scraper/vendor rollout
- creates a gold-standard data set to compare future automated ingestion against

### Recommendation

This should be the first production fundamentals layer added.

## 2. Hybrid editor + scraper approach

### Purpose

Scale beyond the top 50 without pretending every source is equally reliable.

### Model

Use automation for collection and editors for review.

Suggested flow:

1. scraper or parser collects candidate fundamentals
2. raw payload is stored
3. normalization produces draft rows
4. admin UI shows:
   - parsed values
   - missing values
   - source URL / provenance
   - changed-versus-previous values
5. editor approves, edits, or rejects

### Best use case

- top 50 to top 250 expansion
- sectors where fundamentals are updated regularly
- data that needs human sanity-checking before public display

### Benefits

- faster than manual-only entry
- safer than fully automatic public publishing
- compatible with current Riddra admin workflow

### Risks

- requires review UI discipline
- partial automation can still produce noisy drafts
- needs clear status labels like `draft`, `reviewed`, `published`

### Recommendation

This should be the main scale-up path after the top 50 manual layer.

## 3. Optional NSE/BSE integration

### Purpose

Use official or semi-official exchange disclosures where practical for backup and validation.

### Good candidates

- shareholding pattern support
- corporate actions
- filings and results calendar references
- company announcement cross-checking

### Not ideal as sole fundamentals source

- exchange pages are often disclosure-first, not API-first
- structure may be inconsistent
- normalization effort is higher than it looks

### Best role

Use NSE/BSE as:

- validation source
- fallback source
- source-of-truth cross-check for key figures

### Recommendation

Useful as a supporting layer, not the first full fundamentals engine.

## 4. Future paid vendor integration

### Purpose

Provide broad, structured, repeatable fundamentals coverage when fundamentals become a core product requirement.

### When it becomes justified

- when coverage needs to move beyond curated top stocks
- when editor workload becomes too high
- when consistent annual/quarterly statements across a wide stock universe become product-critical

### What to expect

- structured statements
- key ratios
- standardized field coverage
- cleaner updates and provenance

### Tradeoff

- recurring cost
- vendor lock-in risk
- migration and normalization work still required

### Recommendation

This is the long-term scale path if fundamentals become central to Riddra’s public stock product.

## 5. UI strategy for partial fundamentals

The UI must clearly distinguish:

- available and verified
- available but editor-reviewed only
- draft / awaiting verification
- unavailable

### Public stock pages

Show fundamentals in layers:

1. verified highlights block
2. statements / ratios section
3. coverage note when partial

Recommended copy examples:

- `Verified fundamentals available`
- `Partial fundamentals available for this stock`
- `Fundamentals coverage is expanding; price and chart data are currently more complete than company financials`

### Admin/editor UI

Show:

- source type
- last updated
- field fill percentage
- review status
- changed values since last update
- missing fields

### Important rule

Do not render empty fundamentals sections as if data is complete. Missing data should show an intentional state, not a broken table.

## 6. Fallback behavior

Fallback behavior should be explicit and stable.

### If fundamentals are unavailable

Show:

- price history
- latest snapshot
- corporate actions if available
- holders if available
- research / narrative content

Hide or soften:

- valuation scoring that depends on missing fundamentals
- statement tables with no real rows
- fake precision metrics

### If only partial fundamentals are available

Show:

- populated fields
- missing fields as blank or `Not available yet`
- section-level coverage note

### If source quality is uncertain

Show admin-side warnings and keep public exposure conservative until reviewed.

## Recommended rollout order

### Step 1

Top 50 manual fundamentals layer.

### Step 2

Admin review workflow for draft fundamentals.

### Step 3

Hybrid editor + scraper ingestion for top 250 stocks.

### Step 4

Selective NSE/BSE validation where useful.

### Step 5

Decision point:

- continue hybrid curated path
- or move to paid structured vendor for broader coverage

## Success criteria for Phase 2

1. Top 50 stocks have reliable public fundamentals coverage.
2. Public UI clearly communicates partial versus verified coverage.
3. Admins can review and correct imported fundamentals safely.
4. Price-data features remain unaffected by fundamentals gaps.
5. Broad-universe fundamentals are not batch-enabled until source reliability is proven.

## Final recommendation

The safest next move is:

1. build a top-50 manual/editor fundamentals layer
2. add reviewable hybrid ingestion after that
3. keep Yahoo protected fundamentals disabled for batch
4. treat official exchange pages as validation/fallback, not the whole solution
5. keep a paid vendor as the future scale option, not the immediate dependency
