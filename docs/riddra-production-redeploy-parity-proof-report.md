# Riddra Production Redeploy Parity Proof

Date:

- `2026-05-02`

Goal:

- confirm the latest local repo fixes are now deployed to Production
- prove hosted parity for stock pages, hosted search fallback, and robots/sitemap consistency

## Production deployment used

- deployment id: `dpl_GDNGo1xTxEGi5FVwUvMrBMF8Bbpc`
- production url: [https://riddra-5gd260s8k-amitbhawani-1947s-projects.vercel.app](https://riddra-5gd260s8k-amitbhawani-1947s-projects.vercel.app)
- production alias: [https://www.riddra.com](https://www.riddra.com)
- ready state: `READY`

Vercel proof:

- `vercel inspect https://www.riddra.com`
- returned the new deployment id above and showed `status = Ready`

## Pre-redeploy truth

Before the fresh production deploy, hosted was still stale.

Observed on hosted before redeploy:

- `normalizedData:null` still present in hosted stock HTML
- `Awaiting extended history` still present
- `Loading stored chart history` still present
- visible `1D` chart tab still present in hosted HTML
- `/api/search/suggestions?query=reliance&limit=8` returned empty suggestions
- `robots.txt` blocked `/markets/news/`, but `sitemap.xml` still included `/markets/news`

That confirmed production had not yet picked up the current local stock/search/SEO fixes.

## Post-redeploy hosted checks

### Stock route health

All target hosted stock routes returned `200` after the new production alias went live.

| Route | Status | Time |
| --- | --- | --- |
| `/stocks/reliance-industries` | `200` | `8.08s` |
| `/stocks/tcs` | `200` | `8.34s` |
| `/stocks/infosys` | `200` | `8.39s` |
| `/stocks/hdfc-bank` | `200` | `8.60s` |
| `/stocks/icici-bank` | `200` | `6.02s` |
| `/stocks/20-microns-limited` | `200` | `5.17s` |

### Search and SEO route health

| Route | Status | Time | Result |
| --- | --- | --- | --- |
| `/api/search/suggestions?query=reliance&limit=8` | `200` | `1.95s` | useful stock suggestions returned |
| `/search?query=reliance` | `200` | `9.87s` | hosted search page rendered |
| `/robots.txt` | `200` | `0.47s` | hosted robots policy rendered |
| `/sitemap.xml` | `200` | `0.64s` | hosted sitemap rendered |

## Hosted stock parity proof

### Six-page consistency sweep

For all six target stock pages:

- `status = 200`
- `normalizedData:null = false`
- visible `1D` chart tab = `false`
- `Awaiting extended history = false`
- `Loading stored chart history = false`
- `Fundamentals are not available from the current data provider yet. = true`

Verified routes:

- `/stocks/reliance-industries`
- `/stocks/tcs`
- `/stocks/infosys`
- `/stocks/hdfc-bank`
- `/stocks/icici-bank`
- `/stocks/20-microns-limited`

### Reliance hosted HTML markers

Confirmed on hosted Reliance after redeploy:

- visible `7D` range present
- visible `1M` range present
- visible `1D` tab absent
- `normalizedData:null` absent
- `Awaiting extended history` absent
- `Loading stored chart history` absent
- fundamentals unavailable notice present

Important nuance:

- the raw hosted HTML still contains legacy serialized data with `\"timeframe\":\"1D\"` inside an embedded chart snapshot object
- this is not the visible public chart tab
- the visible stock-page chart range buttons no longer expose `1D`

## Hosted search fallback proof

Hosted suggestions are no longer empty for `reliance`.

Observed hosted JSON:

```json
{
  "suggestions": [
    {
      "title": "Reliance Industries",
      "href": "/stocks/reliance-industries",
      "category": "Stock"
    }
  ],
  "degraded": true
}
```

Meaning:

- hosted fallback search is now active when Meilisearch envs are missing
- useful stock suggestions are returned
- Production is no longer stuck on the previous empty-suggestions behavior

Additional `/search` page proof:

- `status = 200`
- hosted HTML includes `Reliance Industries`
- hosted HTML does not include `No results`

## Robots and sitemap consistency proof

Hosted `robots.txt` still blocks:

- `/markets/news/`

Hosted `sitemap.xml` after redeploy:

- does **not** include `/markets/news`

So the previous mismatch is resolved on hosted Production.

## Final verdict

### Production redeploy parity

- **PASS**

### What is now proven live

- latest stock-page parity fixes are deployed to hosted Production
- hosted stock pages no longer show the old broken chart/loading/extended-history state
- hosted stock pages no longer emit `normalizedData:null` on the verified target set
- hosted search suggestions now degrade cleanly and return useful stock results without Meilisearch envs
- hosted `robots.txt` and `sitemap.xml` are now consistent for `/markets/news`

### What is still not the same as a full hosted signoff

- Meilisearch is still not fully configured in Production
- Trigger.dev production cron proof is still a separate blocker
- final RLS closure is still a separate blocker
- hosted search page latency is still high even though fallback now works

## Bottom line

Prompt 133 is satisfied for parity proof:

- the latest local repo changes relevant to stock-page parity, hosted search fallback, and robots/sitemap consistency are now deployed to Production
- the previously stale hosted behavior is no longer what Production serves
