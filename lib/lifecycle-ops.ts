export const lifecycleSummary = {
  activeTransitions: 3,
  archiveReady: 2,
  pendingMapping: 1,
};

export const lifecycleSamples = [
  {
    entity: "ipo:hero-fincorp",
    currentState: "upcoming_ipo",
    nextState: "listed_stock",
    transitionType: "ipo_to_stock",
    owner: "ipo-desk@riddra.com",
    note: "Carry forward the historical IPO page as archive context while the listed-stock page becomes the long-term destination.",
  },
  {
    entity: "ipo:shree-ram-twistex",
    currentState: "sme_ipo",
    nextState: "listed_stock_archive_linked",
    transitionType: "sme_listing_transition",
    owner: "ipo-desk@riddra.com",
    note: "Preserve SME issue history, listing watch context, and documents while linking the company into the broader stock system.",
  },
  {
    entity: "stock:tata-motors",
    currentState: "active_listed",
    nextState: "active_listed",
    transitionType: "corporate_event_refresh",
    owner: "equities@riddra.com",
    note: "Lifecycle ops should also cover ongoing major-event refreshes, not only one-time IPO listing transitions.",
  },
];

export const lifecycleRules = [
  "No asset should lose URL continuity or historical context just because it changes state.",
  "IPO, SME IPO, listed stock, fund, and future wealth products should all share one lifecycle discipline instead of separate ad hoc transitions.",
  "Lifecycle actions should be tied to documents, announcements, relationships, and publishing states so the whole system stays coherent.",
];
