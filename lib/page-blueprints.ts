export type AssetType = "stock" | "ipo" | "mutual_fund";

export type BlueprintBlock = {
  key: string;
  label: string;
  status: "live" | "planned";
};

export const pageBlueprints: Record<AssetType, BlueprintBlock[]> = {
  stock: [
    { key: "hero_summary", label: "Hero summary", status: "live" },
    { key: "price_snapshot", label: "Price snapshot", status: "live" },
    { key: "core_metrics", label: "Core metrics", status: "live" },
    { key: "content_sections", label: "Structured content sections", status: "live" },
    { key: "source_trust", label: "Source trust and methodology", status: "live" },
    { key: "chart_block", label: "Interactive chart", status: "live" },
    { key: "fundamentals", label: "Fundamentals", status: "live" },
    { key: "shareholding", label: "Shareholding", status: "live" },
    { key: "peer_comparison", label: "Peer comparison", status: "live" },
    { key: "news_filings", label: "News and filings", status: "live" },
  ],
  ipo: [
    { key: "hero_summary", label: "Hero summary", status: "live" },
    { key: "timeline_snapshot", label: "Timeline snapshot", status: "live" },
    { key: "content_sections", label: "Structured content sections", status: "live" },
    { key: "source_trust", label: "Source trust and methodology", status: "live" },
    { key: "issue_details", label: "Issue details", status: "live" },
    { key: "subscription_tracker", label: "Subscription tracker", status: "live" },
    { key: "gmp_block", label: "GMP block", status: "live" },
    { key: "allotment_block", label: "Allotment block", status: "live" },
    { key: "listing_block", label: "Listing coverage", status: "live" },
    { key: "faq_block", label: "FAQ and schema content", status: "live" },
  ],
  mutual_fund: [
    { key: "hero_summary", label: "Hero summary", status: "live" },
    { key: "nav_snapshot", label: "NAV snapshot", status: "live" },
    { key: "content_sections", label: "Structured content sections", status: "live" },
    { key: "source_trust", label: "Source trust and methodology", status: "live" },
    { key: "return_table", label: "Return table", status: "live" },
    { key: "risk_category", label: "Risk and category", status: "live" },
    { key: "holdings", label: "Holdings", status: "live" },
    { key: "sector_allocation", label: "Sector allocation", status: "live" },
    { key: "fund_manager", label: "Fund manager", status: "live" },
    { key: "compare_block", label: "Fund comparison", status: "live" },
  ],
};

export function getBlueprint(assetType: AssetType) {
  return pageBlueprints[assetType];
}
