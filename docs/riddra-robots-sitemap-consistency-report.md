# Riddra Robots and Sitemap Consistency Report

Date: 2026-05-02  
Timezone: Asia/Kolkata  
Prompt: 135

## Scope

This pass re-ran the final proof for:

- `robots.txt`
- `sitemap.xml`
- `/markets/news` indexing consistency
- canonical stock sitemap coverage
- duplicate stock URL detection
- `www` vs non-`www` behavior

It uses:

- current repo code
- local route checks on `http://localhost:3000`
- hosted route checks on `https://www.riddra.com`

## 1. Files Inspected

- [app/robots.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/robots.ts)
- [app/sitemap.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/app/sitemap.ts)
- [lib/seo-config.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/seo-config.ts)
- [lib/public-site-url.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/public-site-url.ts)

## 2. Current Indexing Decision

`/markets/news` is intentionally **blocked from indexing**.

The shared policy and the served files now agree on that:

- `robots.txt` disallows `/markets/news/`
- `sitemap.xml` does not include `/markets/news`

## 3. Route Status Proof

## Local

- `http://localhost:3000/robots.txt` -> `200`
- `http://localhost:3000/sitemap.xml` -> `200`

## Hosted canonical

- `https://www.riddra.com/robots.txt` -> `200`
- `https://www.riddra.com/sitemap.xml` -> `200`

## Non-www hosted

- `https://riddra.com/robots.txt` -> `307` redirect to `https://www.riddra.com/robots.txt`
- `https://riddra.com/sitemap.xml` -> `307` redirect to `https://www.riddra.com/sitemap.xml`

## 4. robots.txt Proof

Fresh local and hosted `robots.txt` responses matched.

Key lines served:

- `Allow: /`
- `Allow: /stocks/`
- `Allow: /nifty50`
- `Allow: /markets`
- `Allow: /search`
- `Disallow: /admin/`
- `Disallow: /account/`
- `Disallow: /portfolio/`
- `Disallow: /user/`
- `Disallow: /private-beta`
- `Disallow: /news/`
- `Disallow: /markets/news/`
- `Disallow: /mutual-funds/`
- `Disallow: /wealth/`
- `Disallow: /compare/`
- `Disallow: /api/`

Served sitemap pointer:

- `Sitemap: https://www.riddra.com/sitemap.xml`

That matches the `www` canonical behavior in [lib/public-site-url.ts](/Users/amitbhawani/Documents/Ai%20FinTech%20Platform/lib/public-site-url.ts).

## 5. sitemap.xml Proof

Fresh local and hosted `sitemap.xml` bodies were checked.

Confirmed:

- `/markets/news` is **not** present
- `/admin` routes are **not** present
- `/account` routes are **not** present
- other private/internal routes are **not** present:
  - `/portfolio`
  - `/user/`
  - `/api/`
  - `/private-beta`

## 6. Canonical Stock Slug Proof

The hosted sitemap currently contains:

- `1001` stock detail URLs
- `0` duplicate stock detail URLs

Confirmed canonical stock detail URLs present:

- `https://www.riddra.com/stocks/20-microns-limited`
- `https://www.riddra.com/stocks/infosys`
- `https://www.riddra.com/stocks/hdfc-bank`
- `https://www.riddra.com/stocks/icici-bank`

Important nuance from this re-run:

- `https://www.riddra.com/stocks/reliance-industries` was **not** present in the hosted sitemap body on this pass
- `https://www.riddra.com/stocks/tcs` was **not** present in the hosted sitemap body on this pass

So the final proof supports:

- canonical stock slugs are present in the sitemap
- duplicate stock URLs are not present

But it also shows an open sitemap-coverage gap for at least:

- `reliance-industries`
- `tcs`

## 7. Local vs Hosted Sitemap Shape

Local `http://localhost:3000/sitemap.xml` is serving canonical hosted URLs, not localhost URLs.

Verified locally:

- stock URLs are emitted as `https://www.riddra.com/stocks/...`
- local sitemap stock URL count: `1001`
- local duplicate stock URL count: `0`
- `/markets/news` absent
- `/admin` absent
- `/account` absent

That means:

- local and hosted are aligned on canonical URL shape
- the sitemap is intentionally normalized to the `www` production origin

## 8. www and non-www Behavior

Current behavior is consistent and documented:

- the canonical public site origin is `https://www.riddra.com`
- `lib/public-site-url.ts` explicitly normalizes `riddra.com` to `www.riddra.com`
- `robots.txt` points to the `www` sitemap URL
- non-`www` hosted requests for both `robots.txt` and `sitemap.xml` redirect to `www`

So the SEO asset behavior is:

- `www` is canonical
- non-`www` is a redirecting alias

## 9. Final Verdict

## Passed

- `/robots.txt` -> `200`
- `/sitemap.xml` -> `200`
- `/markets/news` indexing decision is consistent across both
- admin/account/private routes are not in the sitemap
- canonical stock slugs are present
- no duplicate stock URLs were found
- `www` and non-`www` behavior is consistent and documented

## Open nuance

The sitemap consistency issue itself is fixed, but the hosted sitemap still does not currently include at least these expected stock routes:

- `reliance-industries`
- `tcs`

That is now a sitemap coverage issue, not a robots/sitemap policy mismatch.

## 10. Validation Summary

- local `robots.txt` -> `200`
- local `sitemap.xml` -> `200`
- hosted `www` `robots.txt` -> `200`
- hosted `www` `sitemap.xml` -> `200`
- hosted non-`www` `robots.txt` -> `307` to `www`
- hosted non-`www` `sitemap.xml` -> `307` to `www`
- hosted stock sitemap URL count -> `1001`
- hosted duplicate stock sitemap URLs -> `0`
