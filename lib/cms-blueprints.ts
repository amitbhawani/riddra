export type CmsBlueprint = {
  assetType: string;
  title: string;
  description: string;
  blocks: Array<{
    key: string;
    title: string;
    mode: "source" | "editorial" | "hybrid";
  }>;
};

export const cmsBlueprints: CmsBlueprint[] = [
  {
    assetType: "stock",
    title: "Listed stock blueprint",
    description: "Long-term company page with live market context, research blocks, charting, and editorial depth.",
    blocks: [
      { key: "hero_summary", title: "Hero summary", mode: "editorial" },
      { key: "price_snapshot", title: "Price snapshot", mode: "source" },
      { key: "chart_block", title: "Chart block", mode: "hybrid" },
      { key: "key_metrics", title: "Key metrics", mode: "source" },
      { key: "fundamentals", title: "Fundamentals", mode: "hybrid" },
      { key: "shareholding", title: "Shareholding", mode: "source" },
      { key: "peer_comparison", title: "Peer comparison", mode: "hybrid" },
      { key: "news_filings", title: "News and filings", mode: "hybrid" },
      { key: "premium_prompts", title: "Premium prompts", mode: "editorial" },
    ],
  },
  {
    assetType: "ipo_mainboard",
    title: "Mainboard IPO blueprint",
    description: "Issue lifecycle page for larger public issues with GMP, timeline, allotment, listing, and company context.",
    blocks: [
      { key: "hero_summary", title: "Hero summary", mode: "editorial" },
      { key: "issue_snapshot", title: "Issue snapshot cards", mode: "source" },
      { key: "timeline", title: "Timeline and allotment dates", mode: "source" },
      { key: "issue_breakup", title: "Issue breakup", mode: "source" },
      { key: "gmp_block", title: "Grey market premium block", mode: "hybrid" },
      { key: "issue_partners", title: "Registrar and lead managers", mode: "source" },
      { key: "company_snapshot", title: "Company snapshot", mode: "hybrid" },
      { key: "strengths_risks", title: "Strengths and risks", mode: "editorial" },
      { key: "documents_faqs", title: "Documents and FAQs", mode: "editorial" },
    ],
  },
  {
    assetType: "ipo_sme",
    title: "SME IPO blueprint",
    description: "SME issue lifecycle page with stronger lot-size, capital requirement, and liquidity-risk framing.",
    blocks: [
      { key: "hero_summary", title: "Hero summary", mode: "editorial" },
      { key: "issue_snapshot", title: "Issue snapshot cards", mode: "source" },
      { key: "lot_size_focus", title: "Lot size and capital requirement", mode: "source" },
      { key: "timeline", title: "Timeline and allotment dates", mode: "source" },
      { key: "gmp_block", title: "Grey market premium block", mode: "hybrid" },
      { key: "company_snapshot", title: "Company snapshot", mode: "hybrid" },
      { key: "strengths_risks", title: "Strengths and risks", mode: "editorial" },
      { key: "listing_watch", title: "Listing watch and archive continuity", mode: "editorial" },
      { key: "documents_faqs", title: "Documents and FAQs", mode: "editorial" },
    ],
  },
  {
    assetType: "mutual_fund",
    title: "Mutual fund blueprint",
    description: "Evergreen fund page with NAV, returns, holdings, category context, and compare workflows.",
    blocks: [
      { key: "hero_summary", title: "Hero summary", mode: "editorial" },
      { key: "nav_snapshot", title: "NAV snapshot", mode: "source" },
      { key: "return_table", title: "Return table", mode: "source" },
      { key: "risk_category", title: "Risk and category", mode: "hybrid" },
      { key: "holdings", title: "Holdings", mode: "source" },
      { key: "sector_allocation", title: "Sector allocation", mode: "source" },
      { key: "fund_manager", title: "Fund manager section", mode: "hybrid" },
      { key: "peer_comparison", title: "Peer comparison", mode: "hybrid" },
      { key: "premium_prompts", title: "Premium prompts", mode: "editorial" },
    ],
  },
  {
    assetType: "etf",
    title: "ETF blueprint",
    description: "Benchmark-led passive product page with liquidity framing, allocation context, and compare-ready investor guidance.",
    blocks: [
      { key: "hero_summary", title: "Hero summary", mode: "editorial" },
      { key: "benchmark_snapshot", title: "Benchmark snapshot", mode: "source" },
      { key: "liquidity_costs", title: "Liquidity and cost view", mode: "hybrid" },
      { key: "allocation_use_case", title: "Allocation use case", mode: "editorial" },
      { key: "tracking_quality", title: "Tracking quality", mode: "source" },
      { key: "peer_comparison", title: "Peer comparison", mode: "hybrid" },
    ],
  },
  {
    assetType: "pms",
    title: "PMS blueprint",
    description: "High-intent wealth page with strategy style, manager context, minimum ticket, and suitability framing.",
    blocks: [
      { key: "hero_summary", title: "Hero summary", mode: "editorial" },
      { key: "manager_snapshot", title: "Manager snapshot", mode: "hybrid" },
      { key: "strategy_overview", title: "Strategy overview", mode: "editorial" },
      { key: "ticket_risk", title: "Ticket size and risk", mode: "source" },
      { key: "portfolio_style", title: "Portfolio style", mode: "hybrid" },
      { key: "documents_faqs", title: "Documents and FAQs", mode: "editorial" },
    ],
  },
  {
    assetType: "aif",
    title: "AIF blueprint",
    description: "Alternative-product page with category, lock-in, eligibility, and document-heavy investor framing.",
    blocks: [
      { key: "hero_summary", title: "Hero summary", mode: "editorial" },
      { key: "structure_snapshot", title: "Structure snapshot", mode: "source" },
      { key: "eligibility", title: "Eligibility and access", mode: "source" },
      { key: "strategy_risk", title: "Strategy and risk", mode: "hybrid" },
      { key: "documents", title: "Documents", mode: "editorial" },
      { key: "lifecycle_notes", title: "Lifecycle notes", mode: "editorial" },
    ],
  },
  {
    assetType: "sif",
    title: "SIF blueprint",
    description: "Emerging-category wealth page reserved for glossary-friendly education, product context, and future compliance-aware updates.",
    blocks: [
      { key: "hero_summary", title: "Hero summary", mode: "editorial" },
      { key: "category_definition", title: "Category definition", mode: "editorial" },
      { key: "structure_snapshot", title: "Structure snapshot", mode: "source" },
      { key: "risk_notes", title: "Risk notes", mode: "hybrid" },
      { key: "documents_faqs", title: "Documents and FAQs", mode: "editorial" },
      { key: "lifecycle_notes", title: "Lifecycle notes", mode: "editorial" },
    ],
  },
];
