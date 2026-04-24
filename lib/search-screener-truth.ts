import { canonicalCompareCoverageSummary } from "@/lib/canonical-compare-coverage";
import { communityProgramsItems } from "@/lib/community-programs";
import { learnArticles, learningPaths, marketEvents } from "@/lib/learn";
import { mentorshipTracks } from "@/lib/mentorship";
import { canonicalCoverageSummary } from "@/lib/canonical-coverage";
import { sampleFunds, sampleIpos, sampleStocks } from "@/lib/mock-data";
import { buildSearchCatalog } from "@/lib/search-catalog";
import { screenerMetricRegistrySummary } from "@/lib/screener-metric-registry";
import { webinars } from "@/lib/webinars";

export type SearchScreenerTruthItem = {
  title: string;
  status: "Real" | "Partial" | "Preview / internal" | "Blocked";
  detail: string;
  href: string;
};

const currentCatalog = buildSearchCatalog({
  stocks: sampleStocks,
  ipos: sampleIpos,
  funds: sampleFunds,
  learnArticles,
  learningPaths,
  marketEvents,
  mentorshipTracks,
  communityPrograms: communityProgramsItems,
  webinars,
});
const currentSuggestionUniverse = currentCatalog.length;
const currentSeededScreenerRows = sampleStocks.length;
const assetRouteCoverage = currentCatalog.filter((item) =>
  ["Stock", "Mutual Fund", "IPO", "ETF", "PMS", "AIF", "SIF", "Sector", "Fund Category", "Index"].includes(item.category),
).length;
const compareRouteCoverage = currentCatalog.filter((item) =>
  ["Compare", "Fund Compare"].includes(item.category),
).length;
const workflowCoverage = currentCatalog.filter((item) =>
  ["Workflow", "Tool", "Hub", "Learn", "Course"].includes(item.category),
).length;
const routeBackedScreenerRows = sampleStocks.filter((stock) => stock.snapshotMeta?.mode !== "fallback").length;

export const searchScreenerTruthSummary = {
  suggestionUniverse: currentSuggestionUniverse,
  seededScreenerRows: currentSeededScreenerRows,
  canonicalBacklog: 2,
  canonicalRouteCoverage: canonicalCoverageSummary.totalRoutes,
  canonicalCompareCoverage: canonicalCompareCoverageSummary.totalRoutes,
  assetRouteCoverage,
  compareRouteCoverage,
  workflowCoverage,
  routeBackedScreenerRows,
  screenerMetricRegistryRows: screenerMetricRegistrySummary.total,
};

export const searchScreenerTruthItems: SearchScreenerTruthItem[] = [
  {
    title: "Search suggestion source",
    status: "Preview / internal",
    detail:
      "The live Meilisearch engine is real, but this admin coverage model still measures a route-backed preview catalog assembled from in-repo lists rather than a deeper canonical asset registry.",
    href: "/search",
  },
  {
    title: "Autocomplete and route indexing",
    status: "Partial",
    detail:
      "Autocomplete now covers more of the real route graph, admin can rebuild and inspect the live Meilisearch index safely, live `/search` queries now persist a feedback trail for zero-result gaps and strongest route handoffs, and search ops can now turn repeated misses into owned review rows with proposed aliases and routes, but the lane still needs a database-backed asset index so route growth, aliases, and identity changes stop relying on curated in-repo lists.",
    href: "/admin/canonical-asset-intake",
  },
  {
    title: "Compare-route registry",
    status: "Preview / internal",
    detail:
      "The ranked stock and mutual-fund pairing layer now has an exportable compare-route registry, but it still depends on a curated preview relationship model instead of a durable asset-identity graph.",
    href: "/admin/search-screener-truth",
  },
  {
    title: "Screener result truth",
    status: "Preview / internal",
    detail:
      "Saved stacks and metric groups now render against the route-backed stock list, but the screener registry still mixes preview and seeded rows until source-backed factor history and fuller metric coverage are live.",
    href: "/screener",
  },
  {
    title: "Metric ingestion and filter logic",
    status: "Blocked",
    detail:
      "Real ROE, ROCE, debt, growth, and ownership metrics still need source-backed ingestion before the screener can move from a research prototype into a trustworthy decision engine.",
    href: "/admin/source-jobs",
  },
];

export const searchScreenerTruthRules = [
  "Autocomplete and `/search` should read from canonical asset identity through the shared Meilisearch layer, not from drifting local ranking code per route.",
  "Search quality should be improved from persisted query logs, zero-result audits, and handoff evidence instead of only manual route reviews.",
  "Repeated search misses should become owned review rows with alias or route fixes instead of staying trapped inside summary metrics.",
  "Screener rows should only point to routes that match the underlying asset identity exactly.",
  "Filters should not be marketed as deep research logic until the underlying metrics come from trusted source pipelines.",
  "Search and screener should be upgraded together because both depend on the same canonical asset and metric truth layer.",
];

export const searchScreenerTruthBreakdown = [
  {
    title: "Asset route coverage",
    value: `${assetRouteCoverage} searchable asset and hub routes`,
    detail: "Stocks, funds, IPOs, wealth products, sectors, fund categories, and index trackers are all present in the ranked catalog instead of hiding inside separate route families.",
  },
  {
    title: "Canonical route registry",
    value: `${canonicalCoverageSummary.totalRoutes} exported canonical routes`,
    detail: "Admin can now download one CSV registry spanning stocks, funds, IPOs, ETFs, PMS, AIF, and SIF routes instead of inferring coverage only from summary copy.",
  },
  {
    title: "Persisted query feedback",
    value: "Live search queries now leave a durable audit trail",
    detail: "The public search route now records result counts, strongest lead routes, focus-card hits, and zero-result gaps, but the current admin feedback log is still file-backed for private beta.",
  },
  {
    title: "Canonical compare registry",
    value: `${canonicalCompareCoverageSummary.totalRoutes} exported compare routes`,
    detail: "The strongest stock and mutual-fund matchups now have one registry-backed compare layer that can feed search truth, admin review, and sitemap discovery.",
  },
  {
    title: "Compare-route coverage",
    value: `${compareRouteCoverage} ranked compare entries`,
    detail: "Search can now hand off into stock and mutual-fund compare pages from the same catalog that powers direct asset matches.",
  },
  {
    title: "Workflow coverage",
    value: `${workflowCoverage} workflow, tool, hub, and learn entries`,
    detail: "The Meilisearch layer still acts as a route navigator, not only an asset lookup, so chart, screener, calendar, report, and learning routes stay reachable from intent-style queries.",
  },
  {
    title: "Route-backed screener state",
    value: `${routeBackedScreenerRows} of ${currentSeededScreenerRows} rows show richer route context`,
    detail: "Only names already carrying delayed or manual route state are counted here; the rest still stay visibly seeded preview rows until upstream market writes improve.",
  },
];
