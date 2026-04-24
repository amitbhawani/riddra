# Broader Product Completion Checklist

## Scope reviewed

This checklist captures the post-flagship cleanup phase for these public families:

- ETF
- PMS
- AIF
- SIF
- Learn
- Newsletter
- Reports truth copy and route-status cleanup

## Page-family review

### Structurally complete but content-thin

- `ETF`
  - Shared product-page shell is in place on both hub and detail pages.
  - Biggest thin areas are real benchmark, liquidity, and document depth.
- `PMS`
  - Shared product-page shell is in place on both hub and detail pages.
  - Biggest thin areas are verified return history, provider-backed documents, and deeper suitability evidence.
- `AIF`
  - Shared product-page shell is in place on both hub and detail pages.
  - Biggest thin areas are structure depth, commitment/disclosure coverage, and real provider-backed evidence.
- `SIF`
  - Shared product-page shell is in place on both hub and detail pages.
  - Biggest thin areas are product-definition depth, disclosure-backed context, and stronger category evidence.

### Mixed shell or still using older public shells

- `Learn`
  - Hub is usable and already on product cards, but still uses older `Container/Eyebrow/SectionHeading` shell primitives.
  - Article, event, and track detail routes still rely on the older dark `GlowCard` family.
- `Newsletter`
  - Hub is usable and already on product cards, but still uses older `Container/Eyebrow/SectionHeading` shell primitives.
  - Newsletter detail routes still rely on the older dark `GlowCard` family.

## Preview and fallback cleanup completed

- Removed the most visible `Local preview auth...` phrasing from:
  - ETF hub and detail
  - PMS hub and detail
  - AIF hub and detail
  - SIF hub and detail
  - Learn hub and detail routes
  - Newsletter hub and detail routes
  - Reports hub and key report routes
- Standardized those public truth blocks onto one shared wording helper:
  - account continuity
  - intentionally deferred commercial billing
  - hosted-proof support readiness
- Replaced the public-facing `Preview route` label on `/reports` with `Coverage building`.

## Shared source and truth consistency review

### Now aligned

- Public truth copy for wealth-family, learn, newsletter, and reports routes now uses one shared helper.
- Public wording now avoids implying that local preview auth is itself a user-facing product mode.
- Billing messaging is now consistently framed as intentionally deferred during private beta instead of sounding half-configured and half-live.

### Still inconsistent

- `Stock`, `mutual-fund`, `index`, and `markets` use explicit data-lane precedence helpers.
- `ETF`, `PMS`, `AIF`, and `SIF` still depend mostly on:
  - CMS route gating
  - static wealth-product definitions
  - shared public truth messaging
  instead of a richer durable source-precedence layer.
- `Learn` and `Newsletter` still use:
  - publishable CMS gating
  - static library content
  - older shell components on detail pages
  rather than the newer product-page shell.

## Hosted-readiness blockers

### JSON-backed lanes that still need hosted DB ingestion

- `benchmark_ohlcv_history`
- `mutual_fund_nav_history`
- `fund_factsheet_snapshots`
- `fund_holding_snapshots`
- `fund_sector_allocation_snapshots`
- `stock_fundamentals`
- `stock_shareholding`
- `sector_performance_snapshots`
- `index_component_weight_snapshots`

### Local stores still needing durable hosted equivalents or proof

- Wealth-family data beyond CMS gating still needs durable provider-backed storage.
- Learn and newsletter content continuity still relies on static library structures rather than a durable editorial system proof.
- Several private-beta workflow stores remain file-backed by design and still need hosted proof before launch work resumes:
  - subscriber workspace memory
  - portfolio memory
  - broker sync memory
  - billing and lifecycle memory
  - support and notification registries

### Env and config verification still needed later

- Hosted auth proof with bypass off
- Hosted Supabase reads for the new market-data lanes
- Hosted worker proof for refresh and ingestion
- Hosted email/support proof
- Canonical site-url and runtime branching validation for the newer data-lane helpers

## Hosted proof readiness by family

### Closest to hosted proof

- Stock
- Mutual fund
- Index
- Markets

### Ready for shell-level hosted proof, but not full data proof

- ETF
- PMS
- AIF
- SIF

### Ready for editorial-route hosted proof, but not full continuity proof

- Learn
- Newsletter

## Recommended next implementation priority

Use the next implementation pass for:

1. shared shell migration of `learn` and `newsletter` detail routes onto the same light product-page primitives
2. first durable provider-backed data lane for one wealth family, starting with `ETF`
3. hosted-ingestion proof for the JSON-backed market and fund history stores
