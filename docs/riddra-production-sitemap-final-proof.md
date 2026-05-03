# Riddra Production Sitemap Final Proof

Date: 2026-05-03  
Timezone: Asia/Kolkata

## Verdict

**PASS**

The sitemap pagination fix from Prompt 138 is live on production.

## Current Production Deployment

Verified with `vercel inspect www.riddra.com`:

- deployment id: `dpl_Fwwuf58kgi5BGqtjo29px7jENrqZ`
- status: `Ready`
- production alias includes:
  - `https://www.riddra.com`
  - `https://riddra.com`

This is the deployment currently serving the hosted sitemap proof below.

## Hosted Response Checks

### `https://www.riddra.com/sitemap.xml`

- status: `200`
- content-type: `application/xml`
- last-modified: `Sun, 03 May 2026 05:41:50 GMT`

### `https://www.riddra.com/robots.txt`

- status: `200`
- content-type: `text/plain`
- last-modified: `Sun, 03 May 2026 05:41:49 GMT`

## Required Stock URL Presence

Verified present in the live hosted sitemap:

- `https://www.riddra.com/stocks/reliance-industries`
- `https://www.riddra.com/stocks/tcs`
- `https://www.riddra.com/stocks/infosys`
- `https://www.riddra.com/stocks/hdfc-bank`
- `https://www.riddra.com/stocks/icici-bank`
- `https://www.riddra.com/stocks/20-microns-limited`

## Sitemap Integrity Checks

Computed from the live hosted sitemap payload:

- total URLs: `2163`
- total stock URLs: `2157`
- duplicate stock URLs: `0`

### `/markets/news` policy

Sitemap:

- `/markets/news` absent: `true`

Robots:

- `Disallow: /markets/news/` present: `true`

So the robots and sitemap policy remains consistent in production.

## Final Read

The earlier production sitemap coverage gap for:

- `reliance-industries`
- `tcs`

is now closed on the live hosted deployment. The sitemap pagination fix is serving correctly in production, the six target stock URLs are present, `/markets/news` remains excluded, and there are no duplicate stock URLs in the live sitemap.
