export type ReferenceParityStatus = "Seeded" | "Partial" | "Missing depth";

export type ReferenceParitySection = {
  title: string;
  href: string;
  status: ReferenceParityStatus;
  currentState: string;
  references: string[];
  mustHave: string[];
};

export type ReferenceParityRegistryRow = {
  cluster: string;
  href: string;
  status: ReferenceParityStatus;
  currentState: string;
  references: string;
  mustHaveCount: string;
  topMustHave: string;
};

export const referenceParitySections: ReferenceParitySection[] = [
  {
    title: "Portfolio, watchlists, and alerts",
    href: "/portfolio",
    status: "Seeded",
    currentState:
      "Portfolio, watchlists, and account alerts now have real route families and better structure, but holdings, P&L, watchlist activity, and recent alerts still lean on seeded demo data and not-yet-wired delivery channels.",
    references: ["INDmoney", "Groww", "Kite"],
    mustHave: [
      "Real holdings ingestion or user-entered persistence instead of seeded portfolio snapshots",
      "Watchlist-level performance, notes, and alert attachment tied to real asset state",
      "Channel-aware alert delivery with working email, push, and optional WhatsApp or SMS paths",
      "Subscriber workspace continuity across inbox, alerts, watchlists, and portfolio repair flows",
      "Cleaner truth-state labeling whenever the account layer still uses demo or delayed data",
    ],
  },
  {
    title: "Tools and calculator depth",
    href: "/tools",
    status: "Partial",
    currentState:
      "The tools family is broad and the legacy calculators exist in the route system, but the tools hub still behaves more like a catalog than a clearly interactive utility layer and some calculators still need more visible native depth.",
    references: ["Groww Calculators", "Kuvera Tools", "Zerodha Varsity tools"],
    mustHave: [
      "More obvious interactive states and outcomes from the tools hub itself",
      "Clearer trust, formula, and input-output framing for each calculator route",
      "Persistent saved inputs or share-ready outputs on the highest-value calculators",
      "Cleaner native Riddra presentation for imported or legacy utility flows",
      "Better grouping between trader tools, investor tools, IPO tools, and document utilities",
    ],
  },
  {
    title: "Charts and trader workstation",
    href: "/charts",
    status: "Partial",
    currentState:
      "The charts layer now has workspace controls, indicator/control framing, and option-analytics tie-ins, but it still needs saved layouts, richer drawing tooling, and deeper trader workflows.",
    references: ["GoCharting", "Definedge", "Options Scalping", "OI Pulse"],
    mustHave: [
      "Denser indicator menu and overlay controls",
      "Drawing-tool stack with saved chart layouts",
      "Timeframe, template, and replay workflows that feel trader-native",
      "Option-chain and derivatives context tied into charts",
      "Scanner-linked and watchlist-linked chart workflows",
    ],
  },
  {
    title: "Stock detail pages",
    href: "/stocks/tata-motors",
    status: "Partial",
    currentState:
      "Stock pages now carry chart context, quote framing, valuation blocks, financial scorecards, ownership lens, and event watch across a 100-plus-route seeded stock graph, and the first trusted stock set can now promote into an honest native source-entry chart state through the admin-backed OHLCV lane, but the family still needs fuller statement depth, peer scoring, and denser market-memory continuity.",
    references: ["Groww", "Screener", "Tickertape", "INDmoney", "India Infoline", "Dhan"],
    mustHave: [
      "Intraday, 52-week, volume, and delivery-style quote context",
      "Performance tables across 1D to multi-year ranges",
      "Financial statements, quarterly blocks, and valuation stacks",
      "Peer comparison, scorecard, and red-flag style research modules",
      "Corporate actions, events, and denser news-and-filings memory",
    ],
  },
  {
    title: "Mutual fund detail pages",
    href: "/mutual-funds/hdfc-mid-cap-opportunities",
    status: "Partial",
    currentState:
      "Fund pages now cover NAV, return tables, benchmark lens, holdings, allocation, manager detail, suitability framing, and source-entry factsheet evidence across a materially broader seeded category bench, but they still need deeper rolling-return history, AMC-document automation, and overlap analytics.",
    references: ["Groww", "Tickertape", "INDmoney"],
    mustHave: [
      "Rolling-return and trailing-return comparisons against benchmark and category",
      "Holdings-history and allocation-trend views",
      "Fund overlap, concentration, and compare workflows",
      "Riskometer-style framing and drawdown context",
      "Richer expense, exit-load, tax, and suitability explanation blocks",
    ],
  },
  {
    title: "IPO pages and IPO trackers",
    href: "/ipo",
    status: "Partial",
    currentState:
      "IPO pages now include denser issue data, timeline, readiness framing, and tracker lanes across a broader mainboard and SME bench instead of a tiny showcase set, but subscription history, archive depth, and registrar-led utility still need to grow further.",
    references: ["Chittorgarh", "Zerodha IPO", "Groww IPO"],
    mustHave: [
      "Cleaner issue schedule and reservation breakup",
      "Subscription-history and GMP-history depth",
      "Registrar, allotment, and listing-action helper blocks",
      "Mainboard and SME tracker density with archive continuity",
      "Company fundamentals and peer context tied into the IPO event",
    ],
  },
  {
    title: "Wealth product pages",
    href: "/wealth",
    status: "Partial",
    currentState:
      "ETF, PMS, AIF, and SIF pages now include research lens, fit, avoid-if, diligence, liquidity, taxation, and compare framing across a broader seeded product bench, and the family hubs now surface ticket posture, status mix, and compare-lane breadth instead of only simple listing cards, but they still need holdings and performance-history depth.",
    references: ["Tickertape", "Groww", "INDmoney"],
    mustHave: [
      "Strategy-fit, risk, liquidity, and taxation blocks",
      "Benchmark, performance, and holdings exposure detail",
      "Cost, lock-in, and suitability comparisons",
      "Product-level compare views across similar wealth vehicles",
      "More explicit investor-intent framing by family",
    ],
  },
  {
    title: "Screener and research columns",
    href: "/screener",
    status: "Partial",
    currentState:
      "The screener now has saved stacks, metric groups, research columns, and workflow lanes, but it still needs true historical data depth and compare/export logic before it feels daily-use ready.",
    references: ["Screener", "StockEdge", "Tickertape"],
    mustHave: [
      "Richer sortable metrics across valuation, growth, ownership, and returns",
      "Saved screen logic tied to watchlists and trader workflows",
      "Sector, theme, and peer-aware filter combinations",
      "Historical column views and compare-ready exports",
      "Research summary cards that explain why a result set matters",
    ],
  },
  {
    title: "AI copilot and guided intelligence",
    href: "/market-copilot",
    status: "Partial",
    currentState:
      "The copilot route now includes formula-first playbooks, route-aware next moves, sample asks, structured answer shapes, and a first persisted grounded-answer memory lane with retrieval datasets plus reusable answer packets, but it still needs a true ask-and-answer workflow, saved context, and stronger evidence-backed responses before it feels like a deeply working guided assistant.",
    references: ["Perplexity", "Tickertape", "INDmoney"],
    mustHave: [
      "A real ask-and-answer workflow grounded in trusted route-backed market data",
      "Clear task framing like summarize, compare, explain, and next-step handoffs",
      "Evidence-backed answers with source-state honesty instead of narrative-only positioning",
      "Saved context or session continuity across user research flows",
      "Guardrails that make it obvious when live AI is off and formula-first logic is being used",
    ],
  },
  {
    title: "Tools and calculator depth",
    href: "/tools",
    status: "Partial",
    currentState:
      "The tools hub now includes an inline interactive explorer with working position-size, IPO-lot, SIP-goal, and breakout-checklist panels, and the strongest tool detail routes already load real calculator or legacy utility surfaces, but a wider share of the catalog still needs first-party interaction depth before the tools family feels consistently product-grade.",
    references: ["Groww calculators", "ClearTax calculators", "INDmoney tools"],
    mustHave: [
      "More first-party calculator panels instead of placeholder copy on lower-coverage tools",
      "Cleaner persistence or save-state handoff into account workflows where it makes sense",
      "Shared result explanation blocks that connect outputs to charts, IPO pages, or portfolio routes",
      "Better mobile behavior across the heavier legacy utility embeds",
      "Clear distinction between full calculators, embedded utilities, and coming-soon workflows",
    ],
  },
  {
    title: "Option chain and derivatives surfaces",
    href: "/option-chain",
    status: "Seeded",
    currentState:
      "The option-chain route now behaves as an honest derivatives workstation shell with no fake strike table or seeded retained chain snapshots, but it still is not a trustworthy live OI or derivatives workflow.",
    references: ["Sensibull", "NSE Option Chain", "Opstra"],
    mustHave: [
      "Live or delayed option-chain data with real strike ladders and expiry switching",
      "Open interest, PCR, IV, volume, and change-in-OI depth that is source-backed",
      "Meaningful call-vs-put summaries, max-pain style context, and strike clustering",
      "Better linkage from charts, watchlists, and trader workflows into derivatives context",
      "Honest empty or coming-soon states whenever a chain is not source-backed yet",
    ],
  },
  {
    title: "Trader workstation and premium workflows",
    href: "/trader-workstation",
    status: "Missing depth",
    currentState:
      "The trader-workstation route now has plan gating and strong product framing, but it still behaves more like a roadmap surface than a working premium terminal with real workflows.",
    references: ["GoCharting", "TradingView", "Dhan", "Definedge"],
    mustHave: [
      "A real multi-panel workstation with chart, watchlist, scanner, and trade workflow continuity",
      "Saved layouts, presets, and premium-only workflow persistence",
      "Live or delayed data modules that justify the premium positioning beyond copy",
      "Direct linkage across option chain, chart layouts, alerts, and screener actions",
      "Cleaner distinction between usable premium tools and future roadmap modules",
    ],
  },
  {
    title: "Learning, mentorship, and community depth",
    href: "/learn",
    status: "Partial",
    currentState:
      "Learning routes now include real persona-track pages, event-archive detail routes, and dedicated mentorship plus community child pages that connect articles, courses, webinars, reports, and guided-program layers more deliberately, but the public education product still needs much deeper lesson density, replay depth, participation mechanics, and progression memory before it feels like a serious trader-investor library rather than a strong starter framework.",
    references: ["Elearnmarkets"],
    mustHave: [
      "Clear beginner, trader, options, investor, and wealth-builder tracks",
      "Richer webinar archive and replay structure",
      "Bundle logic tied to mentorship and cohort progression",
      "Mentorship and community routes with stronger participation, moderation, and continuity mechanics",
      "Topic libraries for charts, derivatives, investing, and portfolio building",
      "Stronger onboarding from education into paid product value",
    ],
  },
  {
    title: "Courses and education bundles",
    href: "/courses",
    status: "Partial",
    currentState:
      "Courses, bundles, and advanced tracks now expose richer audience framing, lesson plans, prerequisites, deliverables, companion route handoffs, and real lesson-level pages, but the layer still needs richer media payloads, progress persistence, and bundle-linked access control before it feels like a durable learning product.",
    references: ["Varsity", "Elearnmarkets", "Trendlyne University"],
    mustHave: [
      "Real lesson counts, module breakdowns, and visible course progression instead of only bundle framing",
      "Lesson-level pages with actual educational payloads, not only summary cards and category labels",
      "Stronger conversion path from learn hub into concrete free and paid courses",
      "Clear differentiation between starter, subscriber, and advanced educational value",
      "Replay, worksheet, or practice depth that makes the course library feel durable",
    ],
  },
  {
    title: "Webinars and replay operations",
    href: "/webinars",
    status: "Partial",
    currentState:
      "The webinar layer now carries session logistics, host framing, access posture, event assets, companion route handoffs, and dedicated registration plus replay child routes, but durable RSVP persistence, replay hosting, and attendance-linked follow-up mechanics still need to exist before it feels fully operational.",
    references: ["Zerodha Varsity", "Elearnmarkets", "TradingQnA events"],
    mustHave: [
      "Working registration or RSVP mechanics for upcoming live sessions",
      "Replay pages with actual session assets, not only summary framing",
      "Clear event metadata like date, instructor, duration, and access policy tied to real workflows",
      "Operational linkage between webinars, courses, newsletter, and mentorship follow-up",
      "Better visibility into which sessions are live, upcoming, archived, or subscriber-only",
    ],
  },
];

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export function getReferenceParityRegistryRows(): ReferenceParityRegistryRow[] {
  return referenceParitySections.map((section) => ({
    cluster: section.title,
    href: section.href,
    status: section.status,
    currentState: section.currentState,
    references: section.references.join(" | "),
    mustHaveCount: String(section.mustHave.length),
    topMustHave: section.mustHave[0] ?? "",
  }));
}

export function getReferenceParityRegistrySummary() {
  const rows = getReferenceParityRegistryRows();

  return {
    total: rows.length,
    partial: rows.filter((row) => row.status === "Partial").length,
    seeded: rows.filter((row) => row.status === "Seeded").length,
    missingDepth: rows.filter((row) => row.status === "Missing depth").length,
  };
}

export function toReferenceParityRegistryCsv(rows: ReferenceParityRegistryRow[]) {
  const header = ["cluster", "href", "status", "currentState", "references", "mustHaveCount", "topMustHave"];

  const lines = rows.map((row) =>
    [row.cluster, row.href, row.status, row.currentState, row.references, row.mustHaveCount, row.topMustHave]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
