# Riddra Hosted Beta Smoke Proof Report

Date: 2026-05-02  
Target: [https://riddra.com](https://riddra.com)

## Summary

Hosted production is live and broadly reachable, but it is **not yet parity-clean** with the current repo state.

The biggest hosted gaps found in this smoke proof were:

- root-domain traffic adds an extra `riddra.com -> www.riddra.com` redirect hop
- `/search` is very slow
- live stock detail rendering is behind the local fixed version
- stock chart UI on hosted still shows the old broken state
- SEO parity is inconsistent between `robots.txt` and `sitemap.xml`

## Route checks

Measured first from the requested host `https://riddra.com`, following redirects.

| Route | Final status | Response time | Final URL | Pass/Fail | Notes |
|---|---:|---:|---|---|---|
| `/` | `200` | `8.82s` | `https://www.riddra.com/` | `FAIL` | Live, but too slow for a homepage smoke pass. |
| `/stocks` | `200` | `3.44s` | `https://www.riddra.com/stocks` | `PASS` | Reachable, but slower than ideal. |
| `/stocks/reliance-industries` | `200` | `5.21s` | `https://www.riddra.com/stocks/reliance-industries` | `FAIL` | Reachable, but hosted UI is not parity-clean. |
| `/admin` | `200` | `1.31s` | `https://www.riddra.com/login` | `PASS` | Protected route redirects to login. |
| `/admin/users` | `200` | `0.93s` | `https://www.riddra.com/login` | `PASS` | Protected route redirects to login. |
| `/admin/activity-log` | `200` | `0.99s` | `https://www.riddra.com/login` | `PASS` | Protected route redirects to login. |
| `/admin/market-data/sources` | `200` | `0.94s` | `https://www.riddra.com/login` | `PASS` | Protected route redirects to login. |
| `/admin/market-data/import-control-center` | `200` | `0.96s` | `https://www.riddra.com/login` | `PASS` | Protected route redirects to login. |
| `/robots.txt` | `200` | `0.52s` | `https://www.riddra.com/robots.txt` | `PASS` | Reachable. |
| `/sitemap.xml` | `200` | `2.83s` | `https://www.riddra.com/sitemap.xml` | `PASS` | Reachable, but content has parity issues. |
| `/search` | `200` | `11.06s` | `https://www.riddra.com/search` | `FAIL` | Very slow. |
| `/login` | `200` | `2.18s` | `https://www.riddra.com/login` | `PASS` | Reachable. |
| `/account` | `200` | `1.54s` | `https://www.riddra.com/login` | `PASS` | Protected route redirects to login. |

## Canonical-host timing check

To separate redirect overhead from true hosted render cost, I also checked the canonical host directly:

| Route | Status | Direct `www` response time | Result |
|---|---:|---:|---|
| `https://www.riddra.com/` | `200` | `5.51s` | Still slow even without redirect |
| `https://www.riddra.com/stocks` | `200` | `2.10s` | Better, but still not fast |
| `https://www.riddra.com/stocks/reliance-industries` | `200` | `5.61s` | Still slow |
| `https://www.riddra.com/search` | `200` | `10.46s` | Still very slow |
| `https://www.riddra.com/api/search/suggestions?q=reliance` | `200` | `1.99s` | Faster than the page, but returned empty suggestions |

## Search smoke proof

Tested:

- `/search`
- `/api/search/suggestions?q=reliance`

Findings:

- `/search` returned `200` but took `11.06s` from `riddra.com` and `10.46s` from `www.riddra.com`
- `/api/search/suggestions?q=reliance` returned:

```json
{"suggestions":[],"degraded":false,"message":null}
```

Interpretation:

- search did not error
- but it is too slow
- and the public suggestion response for a strong query like `reliance` being empty is a hosted search-quality gap

## Login / account flow

Verified:

- `/login` loads with `200`
- `/account` redirects to `/login`
- protected admin routes also redirect to `/login`

Result:

- unauthenticated protection is working
- I did **not** perform an authenticated login because no production credentials/session were provided for this smoke pass

## Watchlist persistence

Status:

- **Not fully verified**

Reason:

- no authenticated hosted session was available in this pass
- I did not perform a production write flow without an authenticated user session

What is still verified:

- stock pages show the sign-in gate for watchlist actions
- `/account` is protected correctly

## Browser notes

### Homepage

Chrome initially showed a blank black page on first paint even though HTTP returned `200`.  
After a manual reload, the homepage rendered successfully with navigation, market strips, and content cards.

This looks like an intermittent hosted client-side or first-paint parity issue, not a hard HTTP outage.

### Reliance stock page

Browser-level proof on `https://www.riddra.com/stocks/reliance-industries` showed a major hosted parity gap:

- page rendered, but the stock detail UI is clearly behind the local fixed version
- the chart area still shows:
  - `1D` button present
  - `1Y RETURN Awaiting extended history`
  - chart body stuck on `Loading stored chart history...`
- visible displayed values conflict across the page:
  - top header price displayed as `₹155.00`
  - chart summary/latest close displayed as `₹1,430.80`
  - snapshot sidecards show `Not available`

This is a strong sign that hosted production is serving an older or inconsistent stock-page build/state.

## SEO smoke proof

### `robots.txt`

Observed key rules:

- `Allow: /`
- `Allow: /stocks/`
- `Allow: /markets`
- `Allow: /search`
- `Disallow: /admin/`
- `Disallow: /account/`
- `Disallow: /markets/news/`
- `Disallow: /mutual-funds/`

### `sitemap.xml`

Observed:

- sitemap is reachable
- sitemap includes `https://www.riddra.com/markets/news`

Hosted SEO parity gap:

- `robots.txt` disallows `/markets/news/`
- `sitemap.xml` includes `/markets/news`

That is an SEO contradiction.

Quick spot-check also did **not** surface:

- `/stocks/reliance-industries`
- `/mutual-funds/...`
- `/search`

in the live sitemap snippet searches I ran, which suggests hosted sitemap coverage may still be incomplete for some important public route families.

## Hosted parity gaps

1. Hosted stock detail is behind the current repo state.
   - `1D` still visible
   - `Awaiting extended history` still visible
   - chart still stuck loading
   - conflicting price values on the same page

2. Hosted search is too slow.
   - `/search` around `10-11s`
   - suggestions API did not fail, but returned empty results for `reliance`

3. Root-domain canonicalization adds extra latency.
   - `riddra.com` always redirects to `www.riddra.com`

4. SEO configuration is inconsistent.
   - `robots.txt` disallows `/markets/news/`
   - `sitemap.xml` includes `/markets/news`

5. Browser first-paint behavior is not fully stable.
   - homepage first showed blank black paint before manual reload

## Final hosted-beta verdict

**NO-GO**

Why:

- hosted production is live, but not parity-clean with the current fixed local state
- stock detail page behavior is visibly inconsistent and stale
- search is too slow for a hosted beta confidence pass
- SEO route policy is internally inconsistent

## What should be fixed before hosted-beta GO

1. Redeploy the stock-page fixes that removed the broken hosted chart state.
2. Verify hosted stock detail values are internally consistent after deploy.
3. Fix hosted search latency and confirm suggestions return meaningful results for core stock queries.
4. Resolve the `robots.txt` vs `sitemap.xml` contradiction for `/markets/news` and any other blocked-but-indexed public surfaces.
5. Re-run this hosted smoke pass with an authenticated beta/admin session if you want full proof for:
   - admin pages
   - account dashboard
   - watchlist persistence
