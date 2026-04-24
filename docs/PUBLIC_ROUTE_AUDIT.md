# Public Route Audit

Last updated: 23 Apr 2026

## What this audit covers

This audit separates the route surface into four buckets:

1. Public pages that should stay discoverable.
2. Dynamic public route patterns that exist as reusable families.
3. Internal or noindex prototype pages that are still useful operationally.
4. Cleanup candidates that are safe to delete because they are manual-only junk records with no source-backed page behind them.

The live, complete tree is now available in the admin at:

- `/admin/sitemap`

That page is the canonical audit view because it is built from the same admin content registry used by the editor and list screens.

## Cleanup completed in this pass

Removed:

- `app/stocks/honeywell-automation/page.tsx`
- `app/stocks/honeywell-automation/loading.tsx`
- the seeded `honeywell-automation` stock entry from `lib/mock-data.ts`
- fake mutual-fund import draft records:
  - `wp-fund-1776835701786`
  - `closure-fund-1776833099387`
  - `precheck-fund-1776831938610`
  - `import-fund-1776831203204`

Also cleaned related noise from:

- `data/admin-operator-console.json`
- `data/admin-pending-approvals.json`
- `data/admin-import-batches.json`
- `data/admin-activity-log.json`

## Routes intentionally kept

- `/stocks/test-motors`
  - active stock-detail prototype route
- `/stocks/r-score-methodology`
  - noindex prototype explainer route

## Sitemap categories

The admin sitemap now groups the route surface into:

- Home & Discovery
- Stocks
- Mutual Funds
- Indices, Markets & Trading
- IPOs & Wealth Products
- Learning, Editorial & Community
- Utility, Trust & Corporate
- Dynamic Public Route Patterns
- Internal / Noindex / Test Routes

## Delete rules in the sitemap

Delete is intentionally restricted.

The sitemap only allows delete actions for:

- manual-only records
- records with no source-backed public page

Source-backed routes remain editable from their normal family editor, but they are not directly deletable from the sitemap.
