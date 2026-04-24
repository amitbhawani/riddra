export const moduleCatalogSummary = {
  installableFamilies: 8,
  activeContracts: 5,
  queuedModules: 4,
};

export const moduleCatalogItems = [
  {
    title: "Equity research family",
    status: "Active",
    summary:
      "Stocks, sectors, compare flows, chart routes, news blocks, and filings-ready sections all operate as one reusable route-family contract.",
  },
  {
    title: "IPO lifecycle family",
    status: "Active",
    summary:
      "Mainboard and SME IPO flows share the same lifecycle rules, issue blocks, archive handoff, and listing transition logic.",
  },
  {
    title: "Funds and wealth family",
    status: "Active",
    summary:
      "Mutual funds, ETFs, PMS, AIF, and SIF now use shared route and CMS assumptions instead of separate mini-systems.",
  },
  {
    title: "Learning and creator family",
    status: "Active",
    summary:
      "Learn, courses, webinars, newsletter tracks, and creator operations are now treated as one reusable publishing system.",
  },
  {
    title: "Workstation tools family",
    status: "Active",
    summary:
      "Charts, option chain, scanner presets, replay, and trader presets behave like one trader-workstation module cluster.",
  },
  {
    title: "Broker pages family",
    status: "Queued",
    summary:
      "Future broker comparisons, partner pages, and execution surfaces should plug into shared field packs and lifecycle rules.",
  },
  {
    title: "Campaign microsite family",
    status: "Queued",
    summary:
      "Launch giveaways, webinar registrations, course funnels, and future creator campaigns should reuse one lightweight module kit.",
  },
  {
    title: "Support center family",
    status: "Queued",
    summary:
      "Help articles, onboarding checklists, issue triage, and recovery flows should become a reusable operational module later.",
  },
];

export const moduleCatalogRules = [
  "A new product family should start from a known contract: route pattern, field pack, CMS blocks, audit rules, and search/index behavior.",
  "Installing a new family should feel like enabling a module, not inventing a parallel subsystem.",
  "Every module should declare what is source-backed, editorial, derived, and user-generated before it goes live.",
];
