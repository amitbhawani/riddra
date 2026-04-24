export type ScreenerMetricRegistryStatus = "Ready" | "In progress" | "Blocked";

export type ScreenerMetricRegistryRow = {
  lane: "Route-backed" | "Decision handoff" | "Pending ingestion";
  metric: string;
  status: ScreenerMetricRegistryStatus;
  screenerView: string;
  href: string;
  note: string;
  source: string;
};

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export const screenerMetricRegistryRows: ScreenerMetricRegistryRow[] = [
  {
    lane: "Route-backed",
    metric: "CMP",
    status: "Ready",
    screenerView: "Market snapshot",
    href: "/screener",
    note: "CMP is already tied to the same route-level stock records that power public stock pages.",
    source: "Stock route snapshot layer",
  },
  {
    lane: "Route-backed",
    metric: "1D move",
    status: "Ready",
    screenerView: "Market snapshot",
    href: "/screener",
    note: "Daily move is already displayed from the same stock route context used across discovery and compare pages.",
    source: "Stock route snapshot layer",
  },
  {
    lane: "Route-backed",
    metric: "ROE",
    status: "In progress",
    screenerView: "Route-backed fundamentals",
    href: "/screener",
    note: "ROE is visible today, but it still depends on mixed route-backed and seeded stock metadata until source writes replace the fallback layer.",
    source: "Route-backed stats with seeded fallback",
  },
  {
    lane: "Route-backed",
    metric: "Debt / Equity",
    status: "In progress",
    screenerView: "Route-backed fundamentals",
    href: "/screener",
    note: "Debt / Equity is available in the current screener, but it still needs canonical financial-source ingestion before it becomes daily-use trustworthy.",
    source: "Route-backed stats with seeded fallback",
  },
  {
    lane: "Route-backed",
    metric: "Market Cap",
    status: "In progress",
    screenerView: "Route-backed fundamentals",
    href: "/screener",
    note: "Market-cap sorting and saved stacks work now, but the metric still needs fully canonical delayed-data writes before the screen feels reference-grade.",
    source: "Route-backed stats with seeded fallback",
  },
  {
    lane: "Route-backed",
    metric: "52W position",
    status: "In progress",
    screenerView: "Route-backed fundamentals",
    href: "/screener",
    note: "52W position is derived from the current route stats and works well for demos, but the underlying range data still needs broader source verification.",
    source: "Derived from route stats",
  },
  {
    lane: "Decision handoff",
    metric: "Truth state",
    status: "Ready",
    screenerView: "Decision handoff",
    href: "/admin/search-screener-truth",
    note: "The screener already exposes whether a row is delayed snapshot, manual last close, or seeded, so route credibility stays visible during shortlist work.",
    source: "Route truth-state model",
  },
  {
    lane: "Decision handoff",
    metric: "Compare-ready handoff",
    status: "Ready",
    screenerView: "Decision handoff",
    href: "/compare/stocks/reliance-industries/tata-consultancy-services",
    note: "The screener can already hand strong rows directly into compare routes through the ranked compare-routing layer.",
    source: "Canonical compare-routing layer",
  },
  {
    lane: "Pending ingestion",
    metric: "Sales growth",
    status: "Blocked",
    screenerView: "Pending metric lanes",
    href: "/admin/source-jobs",
    note: "Growth-led filters should stay blocked until source jobs write trustworthy multi-period financial history.",
    source: "Future financial ingestion",
  },
  {
    lane: "Pending ingestion",
    metric: "Ownership trend",
    status: "Blocked",
    screenerView: "Pending metric lanes",
    href: "/admin/source-jobs",
    note: "Ownership trend should only appear once promoter, FII, DII, and public-shareholding history can be sourced consistently.",
    source: "Future shareholding ingestion",
  },
  {
    lane: "Pending ingestion",
    metric: "Volume history",
    status: "Blocked",
    screenerView: "Pending metric lanes",
    href: "/admin/source-jobs",
    note: "Volume-led filters need verified OHLCV history, not only presentational chart coverage.",
    source: "Future OHLCV ingestion",
  },
  {
    lane: "Pending ingestion",
    metric: "Event-backed signals",
    status: "Blocked",
    screenerView: "Pending metric lanes",
    href: "/admin/source-mapping-desk",
    note: "Event signals should only be promoted after results, filings, corporate actions, and announcement flows are source-backed.",
    source: "Future event-ingestion layer",
  },
];

export const screenerMetricRegistrySummary = {
  total: screenerMetricRegistryRows.length,
  ready: screenerMetricRegistryRows.filter((row) => row.status === "Ready").length,
  inProgress: screenerMetricRegistryRows.filter((row) => row.status === "In progress").length,
  blocked: screenerMetricRegistryRows.filter((row) => row.status === "Blocked").length,
};

export function toScreenerMetricRegistryCsv(rows: ScreenerMetricRegistryRow[]) {
  const header = ["lane", "metric", "status", "screener_view", "href", "note", "source"];
  const lines = rows.map((row) =>
    [row.lane, row.metric, row.status, row.screenerView, row.href, row.note, row.source]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
