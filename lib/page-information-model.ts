export type RiddraPageType =
  | "stock"
  | "mutual_fund"
  | "index"
  | "markets"
  | "etf"
  | "pms"
  | "aif"
  | "sif"
  | "learn"
  | "newsletter";

export type InformationModelGroup = {
  required: string[];
  optional: string[];
};

export type ChartRequirement = {
  requirement: string;
  betaStatus: "required" | "optional" | "not_supported_yet";
};

export type RiddraPageInformationModel = {
  pageType: RiddraPageType;
  title: string;
  sections: InformationModelGroup;
  betaFields: InformationModelGroup;
  previewAllowedFields: string[];
  forbiddenFields: string[];
  sidebarBlocks: string[];
  chartDataRequirements: ChartRequirement[];
  truthStateRequirements: string[];
  attributionRequirements: string[];
};

export const RIDDRA_PAGE_INFORMATION_MODEL: Record<RiddraPageType, RiddraPageInformationModel> = {
  stock: {
    pageType: "stock",
    title: "Stock detail page",
    sections: {
      required: [
        "Hero",
        "Summary strip",
        "Top research board",
        "Stock details",
        "Shareholding",
        "Price chart",
        "Trailing returns",
        "Quick stats",
        "Market snapshot",
        "Actions and docs",
        "Annual returns",
        "Fundamentals snapshot",
        "Profitability and balance-sheet lens",
        "Peer comparison",
        "Related routes",
        "Latest news section",
        "Analyst section",
      ],
      optional: ["Research watchpoints", "Benchmark read note", "Filings panel", "Ownership quality note"],
    },
    betaFields: {
      required: [
        "Company name",
        "Exchange symbol",
        "Sector",
        "Benchmark",
        "Latest quote or close",
        "Truth state",
        "Last trusted update",
        "Chart bars when retained",
        "Session OHLCV when retained",
        "Peer route links",
        "Source labels",
      ],
      optional: [
        "Industry",
        "Market cap",
        "P/E",
        "P/B",
        "ROE",
        "ROCE",
        "52W high",
        "52W low",
        "Dividend yield",
        "Long-window returns",
      ],
    },
    previewAllowedFields: [
      "Extended fundamentals",
      "Long-window return rows",
      "Latest news list",
      "Analyst checklist details",
      "Benchmark comparison overlays in clearly labeled preview mode",
    ],
    forbiddenFields: [
      "Fake analyst ratings",
      "Target price",
      "Recommendation score",
      "Options OI",
      "PCR",
      "VIX",
      "Unsupported transcript layer",
    ],
    sidebarBlocks: ["Quick stats", "Compact market snapshot", "Actions and docs"],
    chartDataRequirements: [
      { requirement: "Primary stock chart with supported timeframe toggles", betaStatus: "required" },
      { requirement: "Benchmark overlay only when real or clearly preview-labeled", betaStatus: "optional" },
      { requirement: "Trailing returns table visible in the summary research board", betaStatus: "required" },
    ],
    truthStateRequirements: [
      "Verified",
      "Delayed Snapshot",
      "Read Failed",
      "Unavailable",
      "Not Available Yet",
      "No internal or operator phrasing on public surfaces",
    ],
    attributionRequirements: ["Quote source", "Chart source", "Fundamental source where shown", "Document or filings source where shown"],
  },
  mutual_fund: {
    pageType: "mutual_fund",
    title: "Mutual-fund detail page",
    sections: {
      required: [
        "Hero",
        "Return strip",
        "Top research board",
        "Fund facts",
        "Allocation and holdings",
        "NAV chart",
        "Return ladder",
        "Rolling and annual returns",
        "Quick stats",
        "Fees and docs",
        "Manager context",
        "Risk and quality",
        "Related routes",
      ],
      optional: ["Overlap notes", "Category rank", "Selection checklist", "Latest updates or news placeholder"],
    },
    betaFields: {
      required: [
        "Fund name",
        "Category",
        "Benchmark",
        "Latest NAV",
        "Truth state",
        "Last trusted update",
        "Expense ratio when durable",
        "Fund manager name when CMS-backed",
        "Source labels",
      ],
      optional: [
        "Holdings",
        "Allocation splits",
        "Rolling returns",
        "Annual returns",
        "Factsheet metadata",
        "Category rank",
      ],
    },
    previewAllowedFields: ["Category rank", "Overlap analytics", "Extended rolling-return grids", "Latest updates placeholder"],
    forbiddenFields: ["Star ratings", "Alpha", "Sharpe", "Sortino", "Embedded SIP calculator outputs"],
    sidebarBlocks: ["Quick stats", "Market snapshot", "Fees and docs", "Manager context", "Related routes"],
    chartDataRequirements: [
      { requirement: "NAV chart when retained history exists", betaStatus: "required" },
      { requirement: "Return ladder sourced from real retained or factsheet-backed table rows", betaStatus: "required" },
    ],
    truthStateRequirements: [
      "Verified NAV must be distinct from delayed or manual NAV",
      "Unavailable and read-failed states must remain separate",
      "No internal admin wording",
    ],
    attributionRequirements: ["NAV source", "Factsheet source", "Holdings source where shown", "Benchmark source"],
  },
  index: {
    pageType: "index",
    title: "Index detail page",
    sections: {
      required: [
        "Hero",
        "Breadth strip",
        "Session timeline chart",
        "Session scoreboard",
        "Breadth section",
        "Leadership section",
        "Concentration and composition",
        "Timeline section",
        "Quick stats",
        "Market snapshot",
        "Route handoffs",
        "Compact actions",
      ],
      optional: ["Component roster", "Coverage note", "Analyst watchpoints"],
    },
    betaFields: {
      required: [
        "Benchmark title",
        "Latest move",
        "Breadth counts",
        "Truth state",
        "Last update",
        "Source posture",
      ],
      optional: ["Top pullers", "Top draggers", "Timeline points", "Component roster"],
    },
    previewAllowedFields: ["Deeper roster coverage", "Extended timeline history", "Sparse leadership rows"],
    forbiddenFields: ["Options OI", "PCR", "VIX", "Synthetic full heatmap without data lane"],
    sidebarBlocks: ["Quick stats", "Market snapshot", "Compact actions and routes", "Coverage note when needed"],
    chartDataRequirements: [
      { requirement: "Primary benchmark timeline when retained multi-point data exists", betaStatus: "required" },
      { requirement: "Strong unavailable state when timeline is absent", betaStatus: "required" },
      { requirement: "Component roster only when tracked coverage exists", betaStatus: "optional" },
    ],
    truthStateRequirements: [
      "Verified",
      "Partial",
      "Delayed Snapshot",
      "Read Failed",
      "Unavailable",
      "Coverage limitations must be explicit",
    ],
    attributionRequirements: ["Benchmark source", "Snapshot source", "Coverage note source posture where shown"],
  },
  markets: {
    pageType: "markets",
    title: "Markets overview page",
    sections: {
      required: [
        "Market board",
        "Benchmark snapshot cluster",
        "Top gainers",
        "Top losers",
        "Metals snapshot",
        "FX snapshot",
        "Benchmark chart board",
        "Route handoffs",
      ],
      optional: ["Fund ideas", "Sector snapshot", "IPO watchlist"],
    },
    betaFields: {
      required: [
        "Tracked index snapshots",
        "Tracked mover rows",
        "Metals values when sourced",
        "FX anchor values when sourced",
        "Truth states",
        "Freshness labels",
      ],
      optional: ["Fund idea cards", "Sector snapshot", "IPO watchlist"],
    },
    previewAllowedFields: ["Sector board placeholder", "IPO board placeholder", "Future global-market support placeholder"],
    forbiddenFields: ["Synthetic macro dashboard", "Synthetic sector heatmap", "Exchange-wide fake mover coverage"],
    sidebarBlocks: [],
    chartDataRequirements: [
      { requirement: "Retained benchmark chart tiles only where real series exist", betaStatus: "required" },
      { requirement: "Explicit unavailable state for missing chart lanes", betaStatus: "required" },
    ],
    truthStateRequirements: [
      "Each lane can independently show delayed, unavailable, or read-failed",
      "No free-widget or internal labels in public UI",
    ],
    attributionRequirements: ["One concise source line for each snapshot family", "Chart tile source and freshness where shown"],
  },
  etf: {
    pageType: "etf",
    title: "ETF detail page",
    sections: {
      required: [
        "Hero",
        "Price or NAV snapshot",
        "Underlying benchmark",
        "Expense ratio",
        "Issuer context",
        "Chart",
        "Return table",
        "Quick stats",
        "Actions and docs",
        "Related routes",
      ],
      optional: ["AUM", "Holdings or exposure", "Liquidity note", "Tracking-difference note", "Peer ETFs"],
    },
    betaFields: {
      required: ["ETF name", "Issuer", "Benchmark or index", "Latest price or NAV truth state", "Expense ratio when durable", "Source and freshness"],
      optional: ["AUM", "Holdings", "Tracking error", "Liquidity metrics", "Peer table"],
    },
    previewAllowedFields: ["AUM", "Tracking error", "Liquidity metrics", "Peer ETFs"],
    forbiddenFields: ["Options data", "Tax optimizer", "Advanced creation redemption analytics"],
    sidebarBlocks: ["Quick stats", "Market snapshot when relevant", "Docs and actions"],
    chartDataRequirements: [
      { requirement: "ETF price or NAV chart depending durable source availability", betaStatus: "required" },
      { requirement: "Benchmark linkage must be real before visual comparison is implied", betaStatus: "required" },
    ],
    truthStateRequirements: [
      "Exchange-traded price state must stay distinct from NAV or factsheet state",
      "No unsupported ETF analytics phrasing",
    ],
    attributionRequirements: ["Exchange source", "NAV source where shown", "Issuer or disclosure source"],
  },
  pms: {
    pageType: "pms",
    title: "PMS detail page",
    sections: {
      required: [
        "Hero",
        "Strategy summary",
        "Manager or firm",
        "Mandate style",
        "Minimum ticket",
        "Benchmark",
        "Documents",
        "Route context",
      ],
      optional: ["Return highlights", "Portfolio snapshots", "Manager note"],
    },
    betaFields: {
      required: ["Strategy name", "Provider", "Category or style", "Minimum investment", "Benchmark", "Documents", "Truth state"],
      optional: ["Returns", "AUM", "Holdings", "Drawdown"],
    },
    previewAllowedFields: ["Returns", "AUM", "Holdings", "Portfolio snapshots"],
    forbiddenFields: ["Client-performance claims without audited source", "Unsupported scorecards"],
    sidebarBlocks: ["Quick facts", "Docs and actions", "Market context only when directly helpful"],
    chartDataRequirements: [
      { requirement: "No performance chart unless a real audited track record exists", betaStatus: "required" },
    ],
    truthStateRequirements: [
      "Disclosure-led pages may legitimately stay sparse",
      "Data not connected yet is acceptable when explicit",
    ],
    attributionRequirements: ["Provider source", "Disclosure source", "Document source"],
  },
  aif: {
    pageType: "aif",
    title: "AIF detail page",
    sections: {
      required: [
        "Hero",
        "Category",
        "Strategy summary",
        "Manager",
        "Structure",
        "Minimum commitment",
        "Benchmark or reference index when used",
        "Disclosures and docs",
        "Route context",
      ],
      optional: ["Sector exposure", "Vintage note", "Return summary"],
    },
    betaFields: {
      required: ["Manager", "Category", "Structure", "Minimum commitment", "Documents", "Truth state"],
      optional: ["AUM", "Holdings", "Returns", "Portfolio composition"],
    },
    previewAllowedFields: ["AUM", "Holdings", "Return track record", "Composition notes"],
    forbiddenFields: ["IRR or MOIC claims without source", "Realized unrealized split without source"],
    sidebarBlocks: ["Quick facts", "Docs and actions"],
    chartDataRequirements: [{ requirement: "No chart by default", betaStatus: "required" }],
    truthStateRequirements: ["Disclosure-first posture", "Sparse data must stay explicit rather than padded"],
    attributionRequirements: ["Manager source", "Disclosure source", "Document source"],
  },
  sif: {
    pageType: "sif",
    title: "SIF detail page",
    sections: {
      required: [
        "Hero",
        "Strategy summary",
        "Provider",
        "Structure or type",
        "Minimum investment",
        "Risk posture",
        "Docs and disclosures",
        "Route context",
      ],
      optional: ["Model allocation", "Return snapshot"],
    },
    betaFields: {
      required: ["Provider", "Strategy type", "Minimum investment", "Documents", "Truth state"],
      optional: ["Returns", "Composition", "Benchmark-relative stats"],
    },
    previewAllowedFields: ["Returns", "Composition", "Model allocation"],
    forbiddenFields: ["Unsupported payoff diagrams", "Derived performance claims without source"],
    sidebarBlocks: ["Quick facts", "Docs and actions"],
    chartDataRequirements: [{ requirement: "No chart unless real series exists", betaStatus: "required" }],
    truthStateRequirements: ["Disclosure-first posture", "Sparse pages must not imply live market-style coverage"],
    attributionRequirements: ["Issuer source", "Disclosure source", "Document source"],
  },
  learn: {
    pageType: "learn",
    title: "Learn article detail page",
    sections: {
      required: ["Title", "Category or track", "Publish and update date", "Author or source", "Hero summary", "Body content", "Related lessons and routes"],
      optional: ["Glossary", "Key takeaways box", "Next lesson", "References"],
    },
    betaFields: {
      required: ["Title", "Slug", "Author", "Publish date", "Update date", "Body content", "Track or category", "Related links"],
      optional: ["Read time", "Progress state", "Quiz block", "Glossary"],
    },
    previewAllowedFields: ["Read time", "Progress state", "Quiz placeholder"],
    forbiddenFields: ["Unlabeled AI-generated summaries", "Fabricated references"],
    sidebarBlocks: ["Contents list", "Related lessons", "Relevant market routes when useful"],
    chartDataRequirements: [
      { requirement: "Only embed charts with explicit source and truth posture", betaStatus: "optional" },
    ],
    truthStateRequirements: ["Editorial freshness should be shown instead of market-data truth states", "No operator wording"],
    attributionRequirements: ["Author or editorial source", "Reference section for external facts", "Source lines on embedded market data snippets"],
  },
  newsletter: {
    pageType: "newsletter",
    title: "Newsletter detail page",
    sections: {
      required: ["Issue title", "Issue date", "Summary", "Body sections", "Key links", "Archive and related navigation"],
      optional: ["Editor note", "Featured charts", "Market recap box"],
    },
    betaFields: {
      required: ["Issue title", "Issue date", "Summary", "Body content", "Archive links"],
      optional: ["Editor note", "Featured chart references", "Subscription module", "Engagement stats"],
    },
    previewAllowedFields: ["Subscription module", "Engagement stats placeholder"],
    forbiddenFields: ["Fake subscriber counts", "Fake open rates", "Fake sponsor blocks"],
    sidebarBlocks: ["Archive links", "Related routes", "Signup CTA when real"],
    chartDataRequirements: [
      { requirement: "Charts only when backed by real page data or explicit sourced embeds", betaStatus: "optional" },
    ],
    truthStateRequirements: ["Editorial freshness and archive integrity", "No market-data trust labels unless a real snippet is embedded"],
    attributionRequirements: ["Issue metadata attribution", "Source lines for embedded market data snippets only"],
  },
};

export const RIDDRA_PAGE_INFORMATION_MODEL_ORDER: RiddraPageType[] = [
  "stock",
  "mutual_fund",
  "index",
  "markets",
  "etf",
  "pms",
  "aif",
  "sif",
  "learn",
  "newsletter",
];

export function getRiddraPageInformationModel(pageType: RiddraPageType) {
  return RIDDRA_PAGE_INFORMATION_MODEL[pageType];
}

export function listRiddraPageInformationModels() {
  return RIDDRA_PAGE_INFORMATION_MODEL_ORDER.map((pageType) => RIDDRA_PAGE_INFORMATION_MODEL[pageType]);
}
