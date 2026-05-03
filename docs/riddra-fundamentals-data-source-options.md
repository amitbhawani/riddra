# Riddra Fundamentals Data Source Options

Last updated: 2026-04-30  
Scope: decision memo only, no implementation in this step

## Background

Riddra’s Yahoo chart/history lane is now working at scale for:

- historical daily prices
- latest snapshot fallback from chart/history

But Yahoo protected fundamentals remain blocked in the current runtime:

- `quoteSummary`-style valuation/statistics modules return repeated `401`
- financial statements modules return repeated `401`
- browser-like crumb fallback has also shown `429`

That means Riddra needs a deliberate fundamentals plan instead of trying to force Yahoo deeper than it currently allows.

## Decision summary

If the goal is **safe, launchable, and maintainable fundamentals coverage**, the best current path is:

1. keep Yahoo only for price/history and chart-derived snapshot fallback
2. do **not** rely on protected Yahoo fundamentals in batch mode
3. use a **hybrid approach**
   - editor-entered fundamentals for the top public stocks first
   - optional lightweight backup data from official/public issuer surfaces where legally acceptable
   - move to a paid vendor later if broad structured fundamentals become product-critical

## Option 1: Continue Yahoo degraded mode only

### What it means

Use Yahoo only for:

- historical prices
- latest snapshot fallback from chart/history

Do not attempt real valuation or financial statement coverage beyond warning-only or manual test mode.

### Evaluation

| Factor | Assessment |
|---|---|
| Cost | Very low |
| Risk | Low technical risk, high product-depth limitation |
| Data depth | Low for fundamentals |
| Reliability | Good for chart/history, poor for protected fundamentals |
| Legal / ToS concern | Moderate, because Yahoo access is unofficial even where it works |
| Implementation difficulty | Low |
| Recommendation | Keep as the current baseline, but not as the full fundamentals strategy |

### Recommendation note

This is the safest short-term stance, but it is not a fundamentals solution. It only keeps Riddra honest while preventing more wasted effort on blocked Yahoo endpoints.

## Option 2: Screener-style scraping if legally/safely acceptable

### What it means

Scrape a public third-party research site with richer fundamentals tables and statements, similar to how consumer equity research sites expose:

- valuation ratios
- balance sheet / P&L / cash flow tables
- shareholding
- peer data

### Evaluation

| Factor | Assessment |
|---|---|
| Cost | Low direct cost, high maintenance cost |
| Risk | High |
| Data depth | High if it works |
| Reliability | Medium to low over time |
| Legal / ToS concern | High |
| Implementation difficulty | Medium initially, high ongoing |
| Recommendation | Not recommended as the main production path unless explicit legal comfort exists |

### Main risks

- ToS or scraping-policy exposure
- anti-bot changes
- HTML structure breaks
- repeated parser maintenance
- brittle production dependency for a core product layer

### Recommendation note

This can look attractive because it is rich and cheap, but it creates long-term fragility and legal ambiguity. It is better treated as a last resort, not the foundation.

## Option 3: NSE / BSE public pages as backup

### What it means

Use official or semi-official exchange/company public surfaces for limited fundamentals backup where available:

- company result summaries
- corporate announcements
- filings
- limited issuer facts

### Evaluation

| Factor | Assessment |
|---|---|
| Cost | Low direct cost |
| Risk | Medium |
| Data depth | Low to medium |
| Reliability | Medium |
| Legal / ToS concern | Lower than third-party scraping, but still needs care |
| Implementation difficulty | Medium |
| Recommendation | Good as a selective backup source, not a full normalized fundamentals engine by itself |

### Main limitations

- data is often fragmented, not product-shaped
- inconsistent structure across exchanges and companies
- not ideal for broad ratio/statement normalization at 2,000+ stock scale

### Recommendation note

Useful for:

- verification
- fallback
- source evidence
- selected critical fields

Not ideal as the only broad structured fundamentals source.

## Option 4: Paid vendor later

### What it means

Adopt a licensed structured market-data/fundamentals vendor later for:

- valuation metrics
- statements
- ownership
- events
- cleaner API-backed coverage

### Evaluation

| Factor | Assessment |
|---|---|
| Cost | Medium to high |
| Risk | Low to medium |
| Data depth | High |
| Reliability | High if vendor quality is good |
| Legal / ToS concern | Low |
| Implementation difficulty | Medium |
| Recommendation | Best long-term scalable solution if fundamentals become core product infrastructure |

### Recommendation note

This is the cleanest real production path for wide coverage. The tradeoff is cost and procurement timing, not technical feasibility.

If Riddra wants:

- consistent valuation
- broad financial statements
- auditable structured coverage
- fewer brittle workarounds

then a vendor is the strongest long-term answer.

## Option 5: Manual / editor-entered fundamentals for top stocks

### What it means

Use the existing admin/editor system to enter or curate fundamentals for a smaller high-priority set:

- top 25
- top 50
- top 100

Potentially covering:

- market cap
- P/E
- P/B
- ROE
- ROCE
- dividend yield
- debt/equity
- selected annual/quarterly headline metrics

### Evaluation

| Factor | Assessment |
|---|---|
| Cost | Low to medium human effort |
| Risk | Medium operational risk, low platform risk |
| Data depth | Medium for selected stocks |
| Reliability | High if editorial process is disciplined |
| Legal / ToS concern | Low |
| Implementation difficulty | Low to medium |
| Recommendation | Strong near-term option for public-facing quality on the most important stocks |

### Main strengths

- works with current Riddra admin model
- avoids protected Yahoo dependence
- provides accurate flagship pages where it matters most
- easy to audit and override

### Main limitations

- does not scale cheaply to all 2,157 stocks
- depends on editorial process discipline
- slower refresh cadence than API-driven data

### Recommendation note

This is one of the best short-term routes for a fintech product that needs trustworthy public pages before it can justify vendor spend.

## Option 6: Hybrid approach

### What it means

Split the system by what actually works today:

- Yahoo chart/history for prices and latest chart-derived snapshot
- manual/editor-entered fundamentals for top-priority public stocks
- selective exchange/company public-source verification where helpful
- paid vendor later for broad structured fundamentals if needed

### Evaluation

| Factor | Assessment |
|---|---|
| Cost | Medium overall, staged over time |
| Risk | Lowest practical risk for current Riddra stage |
| Data depth | Medium now, high later |
| Reliability | High for price layer, medium-high for curated fundamentals |
| Legal / ToS concern | Low to medium |
| Implementation difficulty | Medium |
| Recommendation | Best practical recommendation for Riddra right now |

### Why this is the best fit

It aligns with current observed reality:

- Yahoo chart/history works
- Yahoo protected fundamentals do not
- Riddra already has a strong admin/editor layer
- public stock pages do not need all 2,157 stocks to have perfect fundamentals on day one

It also gives a clean staged roadmap:

1. keep price data broad
2. keep public routes working for the full stock universe
3. improve fundamentals quality where user attention is highest
4. avoid scraping fragility unless absolutely necessary
5. move to licensed data only when the business case is strong

## Practical recommendation matrix

| Option | Short-term fit | Long-term fit | Overall recommendation |
|---|---|---|---|
| Yahoo degraded mode only | Strong | Weak | Keep as baseline only |
| Screener-style scraping | Weak | Weak | Avoid as primary strategy |
| NSE / BSE public pages backup | Medium | Medium | Use selectively |
| Paid vendor later | Medium | Strong | Best long-term scalable path |
| Manual/editor fundamentals | Strong | Medium | Best near-term quality path |
| Hybrid approach | Strong | Strong | Best overall recommendation |

## Recommended path for Riddra

### Phase A: Immediate

- keep Yahoo chart/history active
- keep quote snapshot in chart-fallback-only mode
- disable protected Yahoo fundamentals in batch mode
- clearly label fundamentals as limited or curated where needed

### Phase B: Public quality improvement

- manually curate fundamentals for top public stocks first
- start with the stocks that matter most for:
  - homepage/featured routes
  - search demand
  - SEO priorities
  - compare workflows

### Phase C: Selective source expansion

- add selective exchange/company-source verification for a few important fields
- avoid broad scraping dependency unless governance is explicitly approved

### Phase D: Scalable fundamentals

- evaluate a paid structured data vendor once:
  - public stock coverage is stable
  - price-update jobs are operationally healthy
  - the product clearly needs broad fundamentals depth

## Final recommendation

Riddra should **not** keep investing in blocked Yahoo protected fundamentals as a primary data strategy.

The most practical route is:

- **Yahoo for price/history only**
- **manual/editor-curated fundamentals for top stocks**
- **selective official-source backup where useful**
- **paid vendor later if broad fundamentals become core to the product**

That gives the best balance across:

- cost
- reliability
- legal safety
- implementation effort
- product usefulness

without creating another brittle data dependency that will break as soon as the upstream protection changes.
