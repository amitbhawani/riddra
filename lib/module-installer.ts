export const moduleInstallerSummary = {
  starterKits: 6,
  readyToClone: 4,
  queuedFamilies: 5,
};

export const moduleInstallerItems = [
  {
    title: "Equity research starter kit",
    status: "Ready",
    summary:
      "A reusable install path for stock detail pages, compare routes, chart entry points, key stats, FAQs, and source-aware editorial blocks.",
  },
  {
    title: "IPO lifecycle starter kit",
    status: "Ready",
    summary:
      "A reusable install path for mainboard and SME IPOs with issue cards, timeline blocks, GMP, subscription watch, allotment, and listed-stock handoff.",
  },
  {
    title: "Wealth product starter kit",
    status: "Ready",
    summary:
      "A reusable install path for ETF, PMS, AIF, and SIF families using common registry, lifecycle, document, and editorial assumptions.",
  },
  {
    title: "Creator distribution starter kit",
    status: "Ready",
    summary:
      "A reusable install path for learn, courses, webinars, newsletter tracks, and creator workflows with shared media and publishing assumptions.",
  },
  {
    title: "Campaign microsite kit",
    status: "Queued",
    summary:
      "A lightweight launch kit for webinar funnels, giveaways, waitlists, and other high-conversion campaign pages built from shared modules.",
  },
  {
    title: "Support center kit",
    status: "Queued",
    summary:
      "A reusable install path for help articles, issue triage, onboarding guides, and recovery flows that later support subscriber success operations.",
  },
];

export const moduleInstallerRules = [
  "A starter kit should declare route pattern, field pack, block set, lifecycle assumptions, and search behavior before it is marked installable.",
  "The goal is copy-safe expansion: operators should know which families are ready to clone versus those still missing structural pieces.",
  "Installable kits should reuse shared contracts, not silently fork them.",
];
