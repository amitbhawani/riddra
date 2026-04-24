# Localhost Page Model Decisions

This pass freezes the public localhost-beta information model for the main page families without redesigning the shell again.

## Stock detail
- Good enough now:
  - hero, summary board, price chart, trailing returns, quick stats, shareholding, fundamentals snapshot, peer comparison, related routes, analyst checklist
- Too thin or placeholder-heavy:
  - latest news when the route only has placeholder news items
  - route-context blocks that depend on placeholder news copy
- Hide until real data exists:
  - latest news section and tab when no concrete headline-ready items exist
  - filings-first news stream until the stock-news lane is connected
- Required for localhost beta:
  - hero with truth state
  - chart with retained-window honesty
  - trailing returns
  - fundamentals and ownership
  - peer / benchmark context
  - one closing checklist or route-handoff section

## Mutual-fund detail
- Good enough now:
  - hero, NAV chart, trailing returns, return ladder, annual returns when available, manager context, related routes, quick stats
- Too thin or empty:
  - composition chapter when holdings and sector-allocation data are both missing
  - concentration cues derived from partial composition coverage
- Hide until real data exists:
  - composition sub-sections that would show only empty holdings or empty allocation placeholders
  - full concentration lens unless both holdings and allocation are present
- Required for localhost beta:
  - fund identity
  - NAV history
  - return ladder
  - benchmark mapping
  - manager / factsheet context
  - clear related-route handoffs

## Index detail
- Good enough now:
  - hero, breadth strip, timeline chart, leadership, composition, timeline summary, quick stats, route handoffs
- Too thin or empty:
  - component roster when only a very small retained component set exists
- Hide until real data exists:
  - synthetic heatmaps or unsupported derivatives layers
  - deeper roster expansion beyond tracked constituents
- Required for localhost beta:
  - latest move
  - breadth split
  - visible leadership
  - retained timeline if available
  - concentration cues
  - route handoffs into stocks / markets / learn

## Markets
- Good enough now:
  - market board, benchmark chart board, gainers, losers, route handoffs
- Too thin or empty:
  - sector-performance board when no durable sector rows exist
  - IPO watchlist when no retained issue set is worth showing
- Hide until real data exists:
  - sector board
  - IPO watchlist
  - full-market mover expansion
- Required for localhost beta:
  - retained market snapshot board
  - benchmark chart cluster
  - top gainers
  - top losers
  - one contextual follow-through block into indices or learn or events

## ETF detail
- Good enough now:
  - hero, strategy framing, benchmark / issuer / structure snapshot, portfolio role, fit / avoid / diligence, compare lanes
- Too thin or empty:
  - price/NAV history and return-table modules without a durable ETF data lane
- Hide until real data exists:
  - ETF chart
  - price or NAV snapshot board
  - AUM / tracking-difference / liquidity detail if only placeholder
- Required for localhost beta:
  - strategy summary
  - benchmark and issuer context
  - ticket / risk / taxation / cost lens
  - due-diligence notes

## PMS detail
- Good enough now:
  - hero, strategy summary, mandate style, provider context, minimum ticket, fit / avoid / diligence, compare lanes
- Too thin or empty:
  - return highlights without durable PMS performance history
- Hide until real data exists:
  - performance table
  - portfolio snapshots
  - manager-note updates that are not source-backed
- Required for localhost beta:
  - strategy framing
  - provider and benchmark
  - minimum ticket
  - suitability and diligence

## AIF detail
- Good enough now:
  - hero, structure, eligibility framing, risk/liquidity/tax context, fit / avoid / diligence, compare lanes
- Too thin or empty:
  - portfolio or return modules without durable AIF documents/history
- Hide until real data exists:
  - synthetic return history
  - live AUM / holdings / document-led snapshots that are not actually connected
- Required for localhost beta:
  - structure and eligibility context
  - benchmark / manager / ticket framing
  - due diligence
  - compare lanes

## SIF detail
- Good enough now:
  - hero, structure, payoff/risk framing, fit / avoid / diligence, compare lanes
- Too thin or empty:
  - payout / return modules without real SIF coverage
- Hide until real data exists:
  - synthetic payout math
  - placeholder product metrics that read like live coverage
- Required for localhost beta:
  - structure and use-case
  - risk / liquidity / taxation framing
  - diligence notes
  - compare lanes

## Learn detail
- Good enough now:
  - hero, article summary, takeaways, compact reading context, truth/support block
- Too thin or empty:
  - long-form article-body expansion when there is no structured CMS body yet
- Hide until real data exists:
  - linked resources, related lessons, document downloads, author boxes, and any extra editorial modules that do not yet exist as real content
- Required for localhost beta:
  - title
  - summary
  - takeaways
  - compact side-rail context

## Newsletter detail
- Good enough now:
  - hero, issue structure, linked product surfaces, archive continuity, snapshot/context rail
- Too thin or empty:
  - extra support or lifecycle panels that would repeat the same information
- Hide until real data exists:
  - issue archive bodies, issue-level analytics, and campaign-performance modules
- Required for localhost beta:
  - track identity
  - audience/cadence/objective
  - issue structure
  - linked surfaces
  - one compact archive-continuity block
