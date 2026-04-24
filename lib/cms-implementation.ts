export type CmsImplementationStatus = "live" | "partial" | "planned";

export type CmsImplementationEntry = {
  blockKey: string;
  status: CmsImplementationStatus;
  note: string;
};

export const cmsImplementationMap: Record<string, CmsImplementationEntry[]> = {
  stock: [
    { blockKey: "hero_summary", status: "live", note: "Stock pages already have a hero, summary, and editorial framing." },
    { blockKey: "price_snapshot", status: "live", note: "Snapshot card is already visible on the stock page." },
    { blockKey: "chart_block", status: "live", note: "Embedded chart plus dedicated chart route are already in place." },
    { blockKey: "key_metrics", status: "live", note: "Core metrics are already rendered in the right-side card." },
    { blockKey: "fundamentals", status: "live", note: "Fundamental starter cards are now visible on the stock page and ready for source-backed expansion." },
    { blockKey: "shareholding", status: "partial", note: "Ownership mix is now visible, but historical trend support and source automation are still pending." },
    { blockKey: "peer_comparison", status: "live", note: "Comparable routes and compare cards already exist." },
    { blockKey: "news_filings", status: "partial", note: "A visible news-and-filings watch section is now on the page, but source-backed feeds are still pending." },
    { blockKey: "premium_prompts", status: "partial", note: "Upgrade language exists, but final premium prompts are not systemized yet." },
  ],
  ipo_mainboard: [
    { blockKey: "hero_summary", status: "live", note: "IPO detail pages already have a hero summary and issue framing." },
    { blockKey: "issue_snapshot", status: "live", note: "Issue snapshot cards are already rendered on the IPO page." },
    { blockKey: "timeline", status: "live", note: "IPO timeline cards are already present." },
    { blockKey: "issue_breakup", status: "live", note: "Issue breakup grid is already visible." },
    { blockKey: "gmp_block", status: "live", note: "Grey market premium is already surfaced in the top snapshot area." },
    { blockKey: "issue_partners", status: "live", note: "Registrar, lead managers, and market maker blocks are already visible." },
    { blockKey: "company_snapshot", status: "live", note: "Company snapshot table is already rendered." },
    { blockKey: "strengths_risks", status: "live", note: "Strength and risk blocks are already in place." },
    { blockKey: "subscription_tracker", status: "partial", note: "A subscription-watch section is now visible, but true day-wise bid data still needs source-backed wiring." },
    { blockKey: "allotment_block", status: "partial", note: "Allotment checklist guidance is now visible, but registrar-linked status and workflow logic are still pending." },
    { blockKey: "listing_watch", status: "partial", note: "Listing-watch framing is now visible, but listing-day metrics and the stock handoff flow still need backend support." },
    { blockKey: "documents_faqs", status: "partial", note: "Documents and FAQ sections now exist on the page, but true CMS uploads and indexing still need backend support." },
  ],
  ipo_sme: [
    { blockKey: "hero_summary", status: "live", note: "SME IPO pages reuse the same detailed hero structure." },
    { blockKey: "issue_snapshot", status: "live", note: "Issue snapshot cards are already reused for SME IPOs." },
    { blockKey: "lot_size_focus", status: "live", note: "SME hub now emphasizes lot size and minimum investment." },
    { blockKey: "timeline", status: "live", note: "Timeline cards are already available in the detailed IPO route." },
    { blockKey: "gmp_block", status: "live", note: "GMP appears in the SME issue experience too." },
    { blockKey: "company_snapshot", status: "live", note: "Company snapshot blocks are already available." },
    { blockKey: "strengths_risks", status: "live", note: "SME pages already have distinct risk framing support." },
    { blockKey: "subscription_tracker", status: "partial", note: "A subscription-watch section now supports SME framing, but official day-wise bid data is still pending." },
    { blockKey: "allotment_block", status: "partial", note: "Allotment checklist guidance is visible, but registrar-linked workflow support still needs backend work." },
    { blockKey: "listing_watch", status: "partial", note: "Dedicated listing-watch cards are now visible, but live listing-day support is still pending." },
    { blockKey: "documents_faqs", status: "partial", note: "Documents and FAQ blocks are visible, but upload management and indexing still need the CMS backend." },
  ],
  mutual_fund: [
    { blockKey: "hero_summary", status: "live", note: "Fund pages already have summary and category framing." },
    { blockKey: "nav_snapshot", status: "live", note: "NAV and 1Y return snapshot are already available." },
    { blockKey: "return_table", status: "live", note: "Fund return table is now visible on the route with reusable period cards." },
    { blockKey: "risk_category", status: "live", note: "Risk label, benchmark, AUM, and expense context are now rendered." },
    { blockKey: "holdings", status: "partial", note: "Top holdings are now visible, but source ingestion and deeper portfolio history are still pending." },
    { blockKey: "sector_allocation", status: "partial", note: "Sector mix is now rendered, but historical allocation trends still need data support." },
    { blockKey: "fund_manager", status: "partial", note: "Fund manager summary is now on the page, but richer manager history and linked content are still pending." },
    { blockKey: "peer_comparison", status: "live", note: "Fund compare routes already exist." },
    { blockKey: "premium_prompts", status: "partial", note: "Subscriber direction exists, but block-level premium prompting is not finalized." },
  ],
};

export function getCmsStatusTone(status: CmsImplementationStatus) {
  if (status === "live") return "bg-aurora/12 text-aurora";
  if (status === "partial") return "bg-flare/12 text-flare";
  return "bg-white/10 text-white";
}
