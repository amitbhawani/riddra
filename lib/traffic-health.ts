export const trafficHealthSummary = {
  acquisitionRoutes: 8,
  searchSignals: 6,
  healthMonitors: 5,
};

export const trafficHealthItems = [
  {
    title: "Crawl and index integrity",
    status: "In progress",
    summary:
      "Core discovery pages should later be checked for sitemap presence, crawlability, canonical hygiene, and duplicate-path risk before search traffic is trusted.",
  },
  {
    title: "Schema and structured-data confidence",
    status: "In progress",
    summary:
      "Stocks, IPOs, learn pages, courses, tools, and wealth surfaces should later be reviewed for schema completeness so search previews stay coherent as the platform grows.",
  },
  {
    title: "Performance and route quality",
    status: "Queued",
    summary:
      "Heavy public pages should later have a simple quality layer for performance, layout stability, and interaction smoothness instead of relying only on successful builds.",
  },
  {
    title: "Search-traffic anomaly response",
    status: "Queued",
    summary:
      "The team should eventually detect traffic drops, broken route clusters, and metadata regressions quickly enough to respond before they become invisible losses.",
  },
];

export const trafficHealthRules = [
  "Traffic health should be treated like a product system, not a marketing afterthought.",
  "Crawl, schema, and performance issues are trust issues when discovery is a core growth channel.",
  "Operator workflows should make traffic regressions visible before they compound.",
];
