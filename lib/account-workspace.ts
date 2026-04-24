export const workspaceSummary = {
  activeModules: 6,
  retainedFlows: 5,
  premiumTracks: 3,
};

export const workspaceModules = [
  {
    title: "Inbox and alerts",
    href: "/account/inbox",
    note: "High-signal action queue for portfolio reviews, IPO milestones, and future AI summaries.",
  },
  {
    title: "Watchlists",
    href: "/account/watchlists",
    note: "Saved asset groups for stocks, IPOs, and funds so users return to their own context instead of starting from scratch.",
  },
  {
    title: "Saved screens",
    href: "/account/screens",
    note: "Reusable research layouts for stock scans, IPO review flows, and mutual-fund comparison work.",
  },
  {
    title: "Broker connections",
    href: "/account/brokers",
    note: "Connected-broker and CSV-fallback workflows for portfolio sync, mismatch review, and approval-first updates.",
  },
  {
    title: "Billing and access",
    href: "/account/access",
    note: "Plan framing, billing lifecycle, entitlement audit, billing recovery, support handoff, and future premium boundaries in one subscriber-safe area.",
  },
  {
    title: "Portfolio tracker",
    href: "/portfolio",
    note: "CSV import, manual builder, holdings review, and later broker-linked portfolio memory.",
  },
];

export const accessSummary = {
  includedNow: 8,
  premiumLater: 4,
  workspaceRules: 3,
};

export const accessRules = [
  "Current build mode still treats signed-up users as Elite, so this page is a preview of future gating rather than a hard restriction surface.",
  "Feature gating should stay entitlement-based so a page can remain public while specific actions or saved-state workflows become premium.",
  "Billing, alerts, workspace memory, and future mobile access should all read from the same entitlement state once live payments are enabled.",
];
