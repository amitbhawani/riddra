# Riddra execution roadmap

This project should start as a search-first research platform with paid trader tools, not as a full broker or everything-at-once super app.

## Recommended starting point

Build these first:

1. Dynamic stock pages
2. IPO hub
3. Mutual fund pages
4. Fundamental screener
5. Premium live dashboard
6. Option chain and OI analytics

Delay these until later:

1. Courses
2. AI copilot
3. PMS and AIF directories
4. Broker execution

The reasoning is simple:

- SEO pages give you free traffic.
- Trader tools give you subscription revenue.
- Education works best after you already have users.
- AI is only useful after your own structured data foundation exists.

## Best software approach

Use a hybrid stack:

- `Next.js` on Vercel for the public website, member dashboards, SEO pages and app UI
- `Supabase` for auth, Postgres, storage and subscription-linked user access
- `Redis` for hot market cache, rate limiting, leaderboards and queue support
- A dedicated background worker service outside Vercel for live market ingestion, cron jobs and refresh pipelines

Important note:

Vercel is excellent for frontend delivery and API surfaces, but it should not be your core always-on market feed engine.

## Product structure

Your platform can be shaped into 3 layers:

1. Free traffic layer
   Stock pages, mutual fund pages, IPO pages, market pages, calculators and glossary pages
2. Subscriber layer
   Screener, watchlists, alerts, premium dashboards, option chain, OI analytics and AI summaries
3. Expansion layer
   Courses, webinars, PMS and AIF discovery, partner integrations and execution workflows

## What we should build first with Codex

Step 1 should be a working product skeleton with:

- Homepage
- Pricing page
- Login and signup
- Stock page template
- IPO page template
- Mutual fund page template
- Simple screener UI
- Admin-ready content structure

This is the smallest serious version of the business.

## 90-day plan

### Month 1

- Set up `riddra.com` on Vercel
- Create Supabase schema
- Add auth and plan gating
- Create design system and page shell
- Build homepage, pricing and login

### Month 2

- Build stock page template
- Build IPO listing and detail pages
- Build mutual fund listing and detail pages
- Create sitemap, schema markup and search-friendly routing
- Add starter admin/import workflow

### Month 3

- Build screener
- Build watchlist
- Build premium dashboard
- Build first option chain and OI analytics screens
- Add Razorpay subscriptions

## Compliance and business caution

Because this is a financial platform in India, treat these as early business tracks:

1. Legal and compliance review
2. Market data licensing review
3. SEBI-related advisory boundaries
4. Clear distinction between education, analytics and personalized advice

This matters a lot before launching paid recommendations or AI-led guidance.

## Positioning

The strongest positioning is:

`Riddra = SEO-driven market intelligence platform + trader toolkit + AI-assisted research layer`

That keeps the product broad, but still sharp enough to explain quickly.

## Suggested next milestone

The next Codex task should be:

`Build Phase 0 of Riddra as a Next.js app with homepage, pricing page, auth flow shell and SEO-ready stock/IPO/fund route structure.`
