export const marketDataSummary = {
  verifiedDurable: 0,
  manualOrDegraded: 2,
  blocked: 1,
  previewInternal: 1,
};

export const marketDataSurfaces = [
  {
    surface: "Stock public pages",
    latency: "End of day or event driven",
    sourceStrategy: "Official exchange references plus issuer documents",
    cacheStrategy: "Daily snapshot plus event revalidation",
    status: "Manual / degraded",
  },
  {
    surface: "IPO lifecycle pages",
    latency: "Event driven",
    sourceStrategy: "Regulator documents plus editorial confirmation",
    cacheStrategy: "Document-triggered revalidation",
    status: "Manual / event-driven",
  },
  {
    surface: "Index live trackers",
    latency: "Near realtime",
    sourceStrategy: "Licensed index inputs required",
    cacheStrategy: "Hot cache plus snapshot history",
    status: "Blocked",
  },
  {
    surface: "Advanced charts workstation",
    latency: "Near realtime",
    sourceStrategy: "Lightweight Charts plus approved feed layer",
    cacheStrategy: "Session cache plus saved layouts",
    status: "Preview / internal",
  },
];

export const marketDataRules = [
  "Every market-data promise should declare the allowed latency, legal source strategy, cache policy, and entitlement scope before it reaches public pages.",
  "End-of-day and event-driven surfaces can launch first, while near-realtime promises should stay clearly gated behind compliant source access and cache design.",
  "Public pages, trader tools, and alerts should read from derived and cached tables instead of hitting source jobs directly.",
  "Manual retained snapshots and internal preview desks should be labeled explicitly instead of reading like verified live market data.",
];
