from __future__ import annotations

import csv
import os
import zipfile
from datetime import date
from xml.sax.saxutils import escape


WORKDIR = "/Users/amitbhawani/Documents/Ai FinTech Platform"
OUTDIR = os.path.join(WORKDIR, "deliverables")


def build_data():
    master_overview = [
        [
            "Module",
            "What it does",
            "Who it serves",
            "Traffic model",
            "Monetization model",
            "Priority",
            "Build now or later",
            "Why it matters",
        ],
        [
            "SEO stock pages",
            "Dynamic pages for every listed stock with price, charts, ratios, forecasts, peers, news and filings",
            "Retail investors and organic search visitors",
            "Very high",
            "Ads, lead capture, subscription upsell",
            "P0",
            "Now",
            "This is the biggest long-term traffic moat",
        ],
        [
            "Live market dashboard",
            "Indices, top gainers, losers, sectors, FII/DII, heatmaps and sentiment panels",
            "Daily active traders",
            "High",
            "Subscription plus habit loop",
            "P0",
            "Now",
            "Creates repeat visits and freshness",
        ],
        [
            "Option chain and OI analytics",
            "Strike data, OI changes, PCR, max pain, buildup and unwind dashboards",
            "Options traders",
            "Medium",
            "Core paid plan driver",
            "P0",
            "Now",
            "Most direct reason people pay recurring subscriptions",
        ],
        [
            "Advanced charts",
            "Trading-style charts, drawings, indicators, multi-timeframe and compare mode",
            "Active traders",
            "Medium",
            "Paid feature or freemium lock",
            "P0",
            "Now",
            "Needed if the brand wants to compete with GoCharting-like behavior",
        ],
        [
            "Fundamental screener",
            "Filter stocks by ratios, growth, valuation, ownership, quality and custom formulas",
            "Investors and swing traders",
            "High",
            "Paid plus SEO landing pages",
            "P0",
            "Now",
            "Screener-style utility has very high stickiness",
        ],
        [
            "Mutual fund pages",
            "Fund pages with NAV, holdings, sector allocation, risk, manager and compare view",
            "Mutual fund investors",
            "Very high",
            "Ads, affiliate, subscription upsell",
            "P0",
            "Now",
            "Search demand is strong and content scales well",
        ],
        [
            "IPO hub",
            "Upcoming, open, allotment, GMP, subscription, listing day and archive pages",
            "IPO-focused users",
            "Very high",
            "Ads, subscriptions, broker affiliate",
            "P0",
            "Now",
            "Fastest SEO win and easy repeat traffic",
        ],
        [
            "PMS and AIF discovery",
            "Directory pages, performance summaries, manager info and filters",
            "High net worth and serious investors",
            "Medium",
            "Premium research and leads",
            "P1",
            "Later",
            "Useful for trust and premium positioning, but data sourcing is harder",
        ],
        [
            "Courses and learning",
            "Recorded lessons, cohort training, webinars and certification-like journeys",
            "Beginners and upgrading users",
            "Medium",
            "One-time revenue and bundle upsell",
            "P1",
            "Later",
            "Strong fit with your creator-led go-to-market",
        ],
        [
            "AI copilot",
            "Ask questions on stocks, compare companies, summarize results and explain signals",
            "Subscribers",
            "Low direct SEO",
            "Premium differentiator",
            "P1",
            "After the data foundation",
            "AI is most valuable after structured data and pages exist",
        ],
        [
            "Broker execution and baskets",
            "Connect brokers, push watchlists or baskets, trade from screeners or charts",
            "Power users",
            "Low",
            "Premium, affiliate or execution revenue",
            "P2",
            "Later",
            "High complexity and compliance burden",
        ],
    ]

    competitor_landscape = [
        [
            "Competitor",
            "Primary focus",
            "Live data",
            "Charts",
            "Options analytics",
            "Fundamental research",
            "Mutual funds",
            "IPO coverage",
            "Education",
            "SEO/content scale",
            "Monetization style",
            "What to learn",
            "What to avoid",
        ],
        [
            "StockEdge",
            "All-in-one analytics app",
            "Yes",
            "Moderate",
            "Yes",
            "Yes",
            "Yes",
            "Limited",
            "Yes via ELM access in higher plans",
            "Moderate",
            "Subscription",
            "Scans, market breadth, packaged analytics",
            "Product breadth can feel busy and overwhelming",
        ],
        [
            "GoCharting",
            "Trading charts and terminal workflow",
            "Yes",
            "Strong",
            "Moderate",
            "Light",
            "No",
            "No",
            "Light",
            "Low",
            "Subscription",
            "Chart UX, strategy/formula charts, saved layouts",
            "Weak SEO moat compared with content-heavy players",
        ],
        [
            "Definedge / Opstra",
            "Options analysis and trading",
            "Yes",
            "Strong",
            "Very strong",
            "Moderate",
            "No",
            "No",
            "Yes across the larger Definedge universe",
            "Low",
            "Broker-led subscription bundle",
            "Best-in-class options workflows and trader-first tooling",
            "Hardcore trader UX is not beginner friendly",
        ],
        [
            "OI Pulse",
            "Open interest dashboards",
            "Yes",
            "Light",
            "Strong",
            "No",
            "No",
            "No",
            "No",
            "Low",
            "Subscription",
            "Single-purpose clarity for derivatives users",
            "Narrow product scope",
        ],
        [
            "Options Scalping",
            "Options education and trader tools",
            "Some",
            "Light",
            "Moderate",
            "No",
            "No",
            "No",
            "Yes",
            "Low",
            "Course plus subscription",
            "Community and trader education angle",
            "Too dependent on personality-led trust",
        ],
        [
            "Elearnmarkets",
            "Courses, webinars and education",
            "No",
            "No",
            "No",
            "Limited",
            "Limited",
            "No",
            "Very strong",
            "Medium",
            "Courses and memberships",
            "Education library and upsell ladder",
            "Weak daily product habit without tools",
        ],
        [
            "Screener",
            "Fundamental research and screening",
            "Delayed or not trading-led",
            "Light",
            "No",
            "Very strong",
            "No",
            "No",
            "Light",
            "High",
            "Premium subscription",
            "Clean UX, powerful screening, high trust",
            "Not built for live traders",
        ],
        [
            "Tickertape",
            "Retail investing research and discovery",
            "Yes",
            "Moderate",
            "Light",
            "Strong",
            "Strong",
            "Limited",
            "Light",
            "High",
            "Pro subscription and broker ecosystem",
            "Excellent stock page structure and portfolio context",
            "Can feel broad without a strong trader edge",
        ],
        [
            "Groww",
            "Broker plus distribution plus information",
            "Yes",
            "Moderate",
            "Moderate",
            "Moderate",
            "Strong",
            "Strong",
            "Light",
            "Very high",
            "Brokerage and cross-sell",
            "Mass-market distribution and page-level SEO",
            "Research depth is thinner than specialist tools",
        ],
        [
            "INDmoney",
            "Wealth app and stock discovery",
            "Yes",
            "Moderate",
            "Light",
            "Moderate",
            "Some",
            "Limited",
            "Light",
            "High",
            "Cross-sell and platform monetization",
            "Good consumer packaging of stock pages",
            "Less differentiated for serious trading users",
        ],
        [
            "Dhan",
            "Trading platform",
            "Yes",
            "Strong",
            "Strong",
            "Light",
            "Some",
            "Some",
            "Light",
            "Medium",
            "Brokerage",
            "Execution-led user experience",
            "Traffic moat is weaker than pure content platforms",
        ],
        [
            "Sensibull",
            "Options strategy builder",
            "Yes",
            "Moderate",
            "Very strong",
            "No",
            "No",
            "No",
            "Yes through content",
            "Medium",
            "B2C plus broker partnerships",
            "Strategy builder and payoff communication",
            "Narrow category focus",
        ],
        [
            "Quantsapp",
            "Options analytics",
            "Yes",
            "Moderate",
            "Strong",
            "No",
            "No",
            "No",
            "Light",
            "Low",
            "Subscription",
            "OI and options signal packaging",
            "Weaker long-tail content engine",
        ],
        [
            "Streak",
            "No-code strategy building and backtesting",
            "Yes",
            "Moderate",
            "Moderate",
            "No",
            "No",
            "No",
            "Light",
            "Low",
            "Subscription",
            "No-code automation angle",
            "SEO and investment research are not the focus",
        ],
        [
            "AlgoTest",
            "Options strategy backtesting",
            "Some",
            "Light",
            "Strong",
            "No",
            "No",
            "No",
            "Light",
            "Low",
            "Subscription",
            "Fast simulation-first workflow",
            "Not a broad consumer platform",
        ],
        [
            "smallcase",
            "Portfolio products and investing discovery",
            "Yes",
            "Light",
            "No",
            "Moderate",
            "Strong",
            "Some",
            "Strong content layer",
            "Very high",
            "Subscription, distribution and ecosystem revenue",
            "Productized investment baskets and content scale",
            "Not built around active trading",
        ],
        [
            "Zerodha IPO",
            "IPO discovery and application",
            "No",
            "No",
            "No",
            "No",
            "No",
            "Very strong",
            "Light",
            "High",
            "Broker acquisition",
            "Simple, trustworthy IPO UX",
            "Narrow page depth",
        ],
        [
            "Chittorgarh",
            "IPO information and archives",
            "No",
            "No",
            "No",
            "No",
            "No",
            "Very strong",
            "Light",
            "Very high",
            "Ads and affiliate",
            "Deep archive and IPO demand capture",
            "Old-school UX and weak product upsell",
        ],
    ]

    feature_priorities = [
        [
            "Feature",
            "User value",
            "Revenue impact",
            "SEO impact",
            "Complexity",
            "Recommended phase",
            "Decision",
        ],
        ["Stock pages", "Very high", "High", "Very high", "Medium", "Phase 1", "Build first"],
        ["IPO hub", "High", "High", "Very high", "Low to medium", "Phase 1", "Build first"],
        ["Fundamental screener", "High", "High", "Medium", "Medium", "Phase 1", "Build first"],
        ["Live watchlist and dashboards", "High", "High", "Low", "Medium", "Phase 1", "Build first"],
        ["Options chain and OI", "Very high", "Very high", "Low", "High", "Phase 1", "Build first for paid users"],
        ["Mutual fund pages", "High", "Medium", "Very high", "Medium", "Phase 1", "Build first"],
        ["Courses", "Medium", "Medium", "Medium", "Low", "Phase 2", "Add after product-market signal"],
        ["AI copilot", "Medium", "High for premium tier", "Low", "Medium", "Phase 2", "Add after structured data exists"],
        ["PMS directory", "Medium", "Medium", "Medium", "High", "Phase 3", "Research carefully"],
        ["AIF directory", "Medium", "Medium", "Medium", "High", "Phase 3", "Research carefully"],
        ["Broker execution", "High", "High", "Low", "High", "Phase 3", "Delay until trust and compliance mature"],
    ]

    tech_architecture = [
        [
            "Layer",
            "Recommendation",
            "Why this fits Riddra",
            "Notes",
        ],
        [
            "Frontend web",
            "Next.js on Vercel",
            "Best fit for SEO-heavy dynamic pages and fast product shipping",
            "Use App Router, ISR and server components for page generation",
        ],
        [
            "Design system",
            "Tailwind CSS plus shadcn/ui",
            "Fast to ship, flexible and easy to evolve",
            "Keep a clear brand system so the site does not feel generic",
        ],
        [
            "Auth",
            "Supabase Auth",
            "Simple email and social sign-in, works well with subscriptions",
            "Gate premium tools with row-level security and entitlement checks",
        ],
        [
            "Core database",
            "Supabase Postgres",
            "Strong default for relational financial data and content metadata",
            "Use partitioned history tables for market time-series",
        ],
        [
            "Realtime cache",
            "Redis or Upstash Redis",
            "Good for latest quotes, leaderboards and hot dashboards",
            "Do not query Postgres directly for every live tick",
        ],
        [
            "Background ingestion",
            "Dedicated worker service on Fly.io, Railway, Render or AWS",
            "Vercel is not the best place for persistent feed workers or long-running ingest",
            "This is one of the most important architecture decisions",
        ],
        [
            "Queues",
            "Redis queue or managed queue",
            "Needed for retries, imports, page refresh jobs and AI tasks",
            "Separate ingestion jobs from user-facing requests",
        ],
        [
            "Search",
            "Postgres search first, then Meilisearch or Typesense",
            "Fast enough early, easy to scale later",
            "Search matters a lot for stocks, funds, IPOs and screeners",
        ],
        [
            "File storage",
            "Supabase Storage or S3",
            "Useful for reports, course assets and generated exports",
            "Keep originals plus optimized web versions",
        ],
        [
            "Payments",
            "Razorpay",
            "India-friendly subscription handling",
            "Track plan, trial, renewal and failed payment state clearly",
        ],
        [
            "AI layer",
            "OpenAI API with retrieval over your own structured datasets",
            "AI should explain your own data, not hallucinate market facts",
            "Start with summaries, compare flows and insight generation",
        ],
        [
            "Analytics",
            "PostHog or Vercel Analytics plus custom events",
            "You need to see which pages convert visitors into subscribers",
            "Track search pages, watchlist use, screener use and IPO funnel events",
        ],
    ]

    data_model = [
        [
            "Table or entity",
            "Purpose",
            "Key columns",
            "Priority",
        ],
        ["instruments", "Master list for stocks, indices, funds, IPOs, PMS and AIF records", "instrument_id, slug, symbol, type, exchange, status", "P0"],
        ["companies", "Issuer metadata", "company_id, instrument_id, legal_name, sector, industry, description", "P0"],
        ["quotes_latest", "Fast lookup for the latest market values", "instrument_id, ltp, change_pct, volume, updated_at", "P0"],
        ["ohlcv_bars", "Historical candles", "instrument_id, timeframe, ts, open, high, low, close, volume", "P0"],
        ["fundamentals_snapshot", "Latest financial metrics for stock pages and screens", "instrument_id, pe, pb, roce, roe, debt_equity, eps, market_cap", "P0"],
        ["financial_statements", "Quarterly and annual statements", "instrument_id, period, revenue, ebitda, pat, assets, liabilities", "P0"],
        ["shareholding_patterns", "Promoter, FII, DII and public holdings over time", "instrument_id, as_of_date, promoter_pct, fii_pct, dii_pct, public_pct", "P0"],
        ["corporate_actions", "Splits, bonuses, dividends and other events", "instrument_id, action_type, ex_date, value", "P1"],
        ["option_contracts", "Contract metadata", "contract_id, underlying_id, expiry, strike, option_type", "P0"],
        ["option_chain_snapshots", "Realtime options chain data", "contract_id, oi, coi, iv, ltp, bid, ask, ts", "P0"],
        ["oi_aggregates", "Computed analytics", "underlying_id, expiry, pcr, max_pain, buildup_state, ts", "P0"],
        ["mutual_funds", "Fund master records", "fund_id, amc_id, category, plan_type, expense_ratio, risk_level", "P0"],
        ["mutual_fund_nav", "Historical NAV", "fund_id, nav_date, nav", "P0"],
        ["mutual_fund_holdings", "Holdings and sectors", "fund_id, as_of_date, holding_name, weight", "P0"],
        ["ipos", "IPO master records", "ipo_id, company_name, ipo_type, open_date, close_date, listing_date, status", "P0"],
        ["ipo_updates", "Subscription, GMP, allotment and listing events", "ipo_id, update_type, source, metric_value, ts", "P0"],
        ["content_pages", "CMS-style dynamic page metadata", "slug, content_type, title, seo_title, schema_json, publish_state", "P0"],
        ["news_items", "Stock or fund related news", "news_id, instrument_id, headline, source, published_at, summary", "P1"],
        ["users", "Subscriber accounts", "user_id, email, role, status", "P0"],
        ["subscriptions", "Billing records and plan state", "subscription_id, user_id, plan_code, status, renewal_date", "P0"],
        ["entitlements", "Feature gating", "user_id, feature_code, access_level", "P0"],
        ["watchlists", "Saved instruments and screens", "watchlist_id, user_id, name", "P1"],
        ["alerts", "Price, technical or screening alerts", "alert_id, user_id, rule_json, channel, status", "P1"],
        ["ai_conversations", "Saved premium AI sessions", "conversation_id, user_id, context_type, created_at", "P2"],
    ]

    roadmap = [
        ["Phase", "Duration", "Main outcome", "What we ship", "Success signal"],
        [
            "Phase 0",
            "Weeks 1-2",
            "Foundations",
            "Brand placeholder, Vercel project, Supabase project, auth, payment skeleton, design system, source mapping",
            "Team can deploy and log in",
        ],
        [
            "Phase 1",
            "Weeks 3-6",
            "Traffic engine v1",
            "Stock pages, IPO hub, mutual fund pages, sitemap, schema, search, content templates",
            "Pages indexed and traffic starts",
        ],
        [
            "Phase 2",
            "Weeks 7-10",
            "Subscriber value v1",
            "Watchlists, screener, premium market dashboard, subscription plans, user settings",
            "First meaningful free-to-paid conversion path",
        ],
        [
            "Phase 3",
            "Weeks 11-16",
            "Trader toolkit v1",
            "Option chain, OI analytics, heatmaps, alerts and richer charts",
            "Product becomes genuinely worth paying for",
        ],
        [
            "Phase 4",
            "Weeks 17-22",
            "AI layer and workflow depth",
            "AI explainers, compare mode, signal summaries and subscriber assistant",
            "Premium differentiation improves",
        ],
        [
            "Phase 5",
            "Months 6-9",
            "Education and community",
            "Courses, webinars, creator-led funnel, newsletter and onboarding journeys",
            "Lower acquisition cost and stronger retention",
        ],
        [
            "Phase 6",
            "Months 9-12",
            "Premium capital-market coverage",
            "PMS, AIF, SIF, manager pages and research surfaces",
            "Higher-value audience segments begin using the platform",
        ],
        [
            "Phase 7",
            "Months 12+",
            "Execution and ecosystem",
            "Broker integrations, baskets, deeper automation and partner APIs",
            "Platform evolves from research to action",
        ],
    ]

    seo_pages = [
        ["Page family", "Examples", "Why it matters", "Priority"],
        ["Stock pages", "/stocks/tata-motors", "Highest search volume and best compound SEO asset", "P0"],
        ["Stock compare pages", "/compare/tata-motors-vs-maruti", "High intent and strong internal linking", "P1"],
        ["Sector pages", "/sectors/auto-stocks", "Cluster authority and screener bridge", "P0"],
        ["Mutual fund pages", "/mutual-funds/hdfc-mid-cap-opportunities", "Large traffic pool and evergreen intent", "P0"],
        ["AMC pages", "/amc/hdfc-mutual-fund", "Strong hub pages for internal linking", "P1"],
        ["IPO main pages", "/ipo/upcoming", "Fast-moving traffic and recurring freshness", "P0"],
        ["IPO detail pages", "/ipo/hero-fincorp", "Captures high-intent search and listing lifecycle", "P0"],
        ["IPO GMP pages", "/ipo/hero-fincorp-gmp", "Massive short-window search interest", "P0"],
        ["IPO allotment pages", "/ipo/hero-fincorp-allotment-status", "Very high spike traffic", "P0"],
        ["PMS pages", "/pms/providers", "Premium audience acquisition", "P2"],
        ["AIF pages", "/aif/funds", "Premium audience acquisition", "P2"],
        ["Calculator pages", "/calculators/sip", "Reliable evergreen SEO and lead gen", "P1"],
        ["Glossary and explainers", "/learn/what-is-open-interest", "Supports AI and product education", "P1"],
        ["Screen result pages", "/screens/high-roe-low-debt", "User value and content scale", "P1"],
        ["Market event pages", "/results-calendar", "Daily habit traffic", "P1"],
    ]

    naming = [
        ["Name", "Positioning", "Why it works", "Risk"],
        ["Riddra", "Market radar with AI layer", "You already own the domain and it feels discovery-led", "Softer on finance trust than traditional finance names"],
        ["RadarIQ", "Research plus intelligence", "Short, memorable and premium-friendly", "Might face naming competition"],
        ["TradeRadar", "Trader-focused intelligence", "Clear for active trader audience", "Narrower if you expand deep into funds and wealth"],
        ["MarketPulse AI", "Live market pulse and AI assistance", "Fits dashboards and options analytics", "Name style is more descriptive than brandable"],
        ["FinScope AI", "Wide-angle finance discovery", "Works for stocks, funds, IPOs and pro tools", "A bit generic"],
        ["AlphaRadar", "Signals and edge", "Strong subscription feel", "May invite compliance sensitivity if overpromised"],
        ["InvestPulse", "Investor plus market motion", "Good for creator-led brand building", "Less trader-heavy"],
        ["SignalStack", "Suite of market signals and tools", "Good product architecture story", "Techy, not mass market"],
        ["NiveshIQ", "Indian investing plus intelligence", "Local relevance and AI angle", "Hindi-led name may narrow global feel"],
    ]

    sources = [
        ["Source type", "Brand or page", "URL", "What it informed"],
        ["Official site", "StockEdge pricing", "https://beta.stockedge.com/pricing", "Pricing and feature packaging"],
        ["Official docs", "GoCharting docs", "https://docs.gocharting.com/docs/get-started/gocharting-account", "Account, saved layouts and paid features"],
        ["Official docs", "GoCharting strategy charts", "https://gocharting.com/docs/charting/chart-types/Strategy-or-Formula-Charts-in-GoCharting", "Formula and strategy chart capability"],
        ["Official site", "Definedge Opstra product page", "https://www.definedgesecurities.com/products/opstra/", "Options feature depth and free vs pro framing"],
        ["Official docs", "Definedge Opstra user guide", "https://www.definedgesecurities.com/user-manuals/opstra-user-guide/", "Detailed options feature list"],
        ["Official site", "OI Pulse plans", "https://www.oipulse.com/app/plans", "Category confirmation for OI-focused product"],
        ["Official site", "Elearnmarkets course page", "https://www.elearnmarkets.com/courses/display/a2z-of-stock-market-for-beginners", "Education product model"],
        ["Official site", "Screener premium", "https://www.screener.in/premium/", "Pricing and premium feature detail"],
        ["Official help/blog", "Tickertape Pro", "https://www.tickertape.in/blog/tickertape-pro-features-for-advanced-investment-analysis/", "Advanced screening and forecast features"],
        ["Official site", "Groww upcoming IPO", "https://groww.in/ipo/upcoming", "IPO hub structure and content depth"],
        ["Official site", "Zerodha IPO", "https://zerodha.com/ipo/", "IPO workflow and archive structure"],
        ["Official site", "smallcase home", "https://www.smallcase.com/", "Wealth products, content and portfolio framing"],
        ["Official content", "smallcase learn", "https://www.smallcase.com/learn/", "SEO and educational content scale"],
        ["Official content", "smallcase subscriptions", "https://www.smallcase.com/learn/how-does-smallcase-subscription-work/", "Subscription model"],
        ["Official site", "Dhan options", "https://dhan.co/options//", "Trader platform positioning"],
    ]

    return {
        "01_Master_Overview": master_overview,
        "02_Competitor_Landscape": competitor_landscape,
        "03_Feature_Priorities": feature_priorities,
        "04_Tech_Architecture": tech_architecture,
        "05_Data_Model": data_model,
        "06_Roadmap": roadmap,
        "07_SEO_Pages": seo_pages,
        "08_Brand_Ideas": naming,
        "09_Sources": sources,
    }


def col_name(idx: int) -> str:
    letters = ""
    idx += 1
    while idx:
        idx, rem = divmod(idx - 1, 26)
        letters = chr(65 + rem) + letters
    return letters


def sheet_xml(rows):
    lines = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
        "<sheetData>",
    ]
    for r_idx, row in enumerate(rows, start=1):
        lines.append(f'<row r="{r_idx}">')
        for c_idx, value in enumerate(row):
            if value is None:
                continue
            text = escape(str(value))
            ref = f"{col_name(c_idx)}{r_idx}"
            lines.append(
                f'<c r="{ref}" t="inlineStr"><is><t xml:space="preserve">{text}</t></is></c>'
            )
        lines.append("</row>")
    lines.extend(["</sheetData>", "</worksheet>"])
    return "\n".join(lines)


def workbook_xml(sheet_names):
    sheets = []
    for idx, name in enumerate(sheet_names, start=1):
        sheets.append(
            f'<sheet name="{escape(name)}" sheetId="{idx}" r:id="rId{idx}"/>'
        )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n'
        "  <sheets>\n    "
        + "\n    ".join(sheets)
        + "\n  </sheets>\n</workbook>"
    )


def workbook_rels(sheet_names):
    rels = []
    for idx, _ in enumerate(sheet_names, start=1):
        rels.append(
            f'<Relationship Id="rId{idx}" '
            'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
            f'Target="worksheets/sheet{idx}.xml"/>'
        )
    rels.append(
        '<Relationship Id="rId999" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" '
        'Target="styles.xml"/>'
    )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n  '
        + "\n  ".join(rels)
        + "\n</Relationships>"
    )


def root_rels():
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n'
        '  <Relationship Id="rId1" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
        'Target="xl/workbook.xml"/>\n'
        '  <Relationship Id="rId2" '
        'Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" '
        'Target="docProps/core.xml"/>\n'
        '  <Relationship Id="rId3" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" '
        'Target="docProps/app.xml"/>\n'
        "</Relationships>"
    )


def content_types(sheet_count):
    overrides = [
        '<Override PartName="/xl/workbook.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
        '<Override PartName="/xl/styles.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
        '<Override PartName="/docProps/core.xml" '
        'ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>',
        '<Override PartName="/docProps/app.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>',
    ]
    for idx in range(1, sheet_count + 1):
        overrides.append(
            f'<Override PartName="/xl/worksheets/sheet{idx}.xml" '
            'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n'
        '  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n'
        '  <Default Extension="xml" ContentType="application/xml"/>\n  '
        + "\n  ".join(overrides)
        + "\n</Types>"
    )


def styles_xml():
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n'
        '  <fonts count="1"><font><sz val="11"/><name val="Aptos"/></font></fonts>\n'
        '  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>\n'
        '  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>\n'
        '  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>\n'
        '  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>\n'
        '  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>\n'
        '</styleSheet>'
    )


def core_xml():
    today = date.today().isoformat()
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
        'xmlns:dc="http://purl.org/dc/elements/1.1/" '
        'xmlns:dcterms="http://purl.org/dc/terms/" '
        'xmlns:dcmitype="http://purl.org/dc/dcmitype/" '
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n'
        '  <dc:creator>Codex</dc:creator>\n'
        '  <cp:lastModifiedBy>Codex</cp:lastModifiedBy>\n'
        f'  <dcterms:created xsi:type="dcterms:W3CDTF">{today}T00:00:00Z</dcterms:created>\n'
        f'  <dcterms:modified xsi:type="dcterms:W3CDTF">{today}T00:00:00Z</dcterms:modified>\n'
        "  <dc:title>Riddra research workbook</dc:title>\n"
        "</cp:coreProperties>"
    )


def app_xml(sheet_names):
    titles = "".join(f"<vt:lpstr>{escape(name)}</vt:lpstr>" for name in sheet_names)
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" '
        'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">\n'
        "  <Application>Codex</Application>\n"
        f"  <TitlesOfParts><vt:vector size=\"{len(sheet_names)}\" baseType=\"lpstr\">{titles}</vt:vector></TitlesOfParts>\n"
        f"  <Worksheets>{len(sheet_names)}</Worksheets>\n"
        "</Properties>"
    )


def write_csvs(data):
    csv_dir = os.path.join(OUTDIR, "csv")
    os.makedirs(csv_dir, exist_ok=True)
    for name, rows in data.items():
        path = os.path.join(csv_dir, f"{name}.csv")
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerows(rows)


def write_xlsx(data):
    xlsx_path = os.path.join(OUTDIR, "riddra_research_workbook.xlsx")
    sheet_names = list(data.keys())
    with zipfile.ZipFile(xlsx_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types(len(sheet_names)))
        zf.writestr("_rels/.rels", root_rels())
        zf.writestr("xl/workbook.xml", workbook_xml(sheet_names))
        zf.writestr("xl/_rels/workbook.xml.rels", workbook_rels(sheet_names))
        zf.writestr("xl/styles.xml", styles_xml())
        zf.writestr("docProps/core.xml", core_xml())
        zf.writestr("docProps/app.xml", app_xml(sheet_names))
        for idx, name in enumerate(sheet_names, start=1):
            zf.writestr(f"xl/worksheets/sheet{idx}.xml", sheet_xml(data[name]))
    return xlsx_path


def main():
    os.makedirs(OUTDIR, exist_ok=True)
    data = build_data()
    write_csvs(data)
    xlsx_path = write_xlsx(data)
    print(xlsx_path)


if __name__ == "__main__":
    main()
