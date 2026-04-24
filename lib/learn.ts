import { cache } from "react";

export type LearnArticle = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  keyTakeaways: string[];
};

export type RouteLink = {
  label: string;
  href: string;
  note: string;
};

export type LearningPath = {
  slug: string;
  title: string;
  audience: string;
  summary: string;
  promise: string;
  steps: string[];
  focusAreas: string[];
  relatedRoutes: RouteLink[];
};

export type MarketEvent = {
  slug: string;
  title: string;
  eventType: string;
  status: string;
  dateLabel: string;
  summary: string;
  assetRef: string;
  archiveNote: string;
  checkpoints: string[];
  followUpRoutes: RouteLink[];
};

export const learnArticles: LearnArticle[] = [
  {
    slug: "what-is-open-interest",
    title: "What Is Open Interest",
    category: "Derivatives Basics",
    summary:
      "Open interest is one of the most important context signals for options and futures traders, especially when paired with price movement and volume.",
    keyTakeaways: [
      "Open interest shows the number of active contracts",
      "It becomes more useful when paired with price behavior",
      "It can support buildup and unwind interpretations",
    ],
  },
  {
    slug: "how-to-read-ipo-gmp",
    title: "How To Read IPO GMP",
    category: "IPO Basics",
    summary:
      "Grey market premium can attract a lot of attention, but it should never be treated as the only signal when evaluating an IPO.",
    keyTakeaways: [
      "GMP is not an official price signal",
      "Official issue documents still matter more",
      "Listing outcomes depend on more than hype",
    ],
  },
  {
    slug: "how-to-compare-mutual-funds",
    title: "How To Compare Mutual Funds",
    category: "Fund Research",
    summary:
      "Comparing mutual funds well requires more than returns. Category fit, risk, benchmark, and consistency matter too.",
    keyTakeaways: [
      "Returns alone can be misleading",
      "Category and benchmark context are essential",
      "Risk and portfolio style should influence fund selection",
    ],
  },
];

export const learningPaths: LearningPath[] = [
  {
    slug: "beginner-investor-track",
    title: "Beginner investor track",
    audience: "First-time market learners",
    summary: "Start with market basics, move into stock and fund comparison, and then graduate into portfolio-building confidence.",
    promise: "Give first-time users a clear path from basic market vocabulary into practical research, watchlists, and a calmer investing workflow.",
    steps: [
      "Learn market terms and basic chart vocabulary",
      "Understand how to compare stocks and mutual funds",
      "Build a simple watchlist and follow event-driven updates",
    ],
    focusAreas: [
      "Market vocabulary, price basics, and why routes like stocks, funds, and IPO pages feel different.",
      "Simple compare workflows so a user can judge fit before opening advanced research surfaces.",
      "Entry-level watchlist and event habits that build confidence without forcing a trader-style workflow.",
    ],
    relatedRoutes: [
      {
        label: "Stock Market Foundation course",
        href: "/courses/stock-market-foundation",
        note: "Start with a course structure if the user wants a guided sequence instead of one-off reading.",
      },
      {
        label: "How to compare mutual funds",
        href: "/learn/how-to-compare-mutual-funds",
        note: "Use this article when the user is choosing between category options and needs benchmark context.",
      },
      {
        label: "Mutual fund selection clinic",
        href: "/webinars/mutual-fund-selection-clinic",
        note: "Move into live or replay-friendly examples once the user is ready for real shortlist-style learning.",
      },
      {
        label: "Results and event calendar",
        href: "/reports/results-calendar",
        note: "Use event-led discovery to keep learning connected to real market follow-through.",
      },
    ],
  },
  {
    slug: "trader-track",
    title: "Trader track",
    audience: "Chart and derivatives users",
    summary: "Move from chart reading into open interest, option-chain interpretation, scanner workflows, and replay-led learning.",
    promise: "Turn chart curiosity into a more structured trader workflow with cleaner setup review, derivatives context, and replay-oriented study.",
    steps: [
      "Read price structure and chart bias cleanly",
      "Understand OI, PCR, max-pain, and expiry behavior",
      "Connect scanners, charts, and option-chain context into one workflow",
    ],
    focusAreas: [
      "Price structure, layouts, and chart-reading habits that support repeat decision-making.",
      "Derivatives interpretation without pretending preview surfaces are already full live terminals.",
      "Scanner, chart, and replay handoffs so a user can practice one workflow across multiple routes.",
    ],
    relatedRoutes: [
      {
        label: "Chart reading bootcamp",
        href: "/webinars/chart-reading-bootcamp",
        note: "Use the webinar route when the user wants a cohort-style or replay-friendly chart workflow.",
      },
      {
        label: "What is open interest",
        href: "/learn/what-is-open-interest",
        note: "Read this first before stepping into option-chain or trader-workstation preview routes.",
      },
      {
        label: "Tools hub",
        href: "/tools",
        note: "Practice with the public calculators and checklists before moving into the premium workflow shells.",
      },
      {
        label: "Option chain",
        href: "/option-chain",
        note: "Use this as a preview-backed route to understand the derivatives workflow that the learning path references.",
      },
    ],
  },
  {
    slug: "wealth-builder-track",
    title: "Wealth-builder track",
    audience: "Long-term allocation users",
    summary: "Focus on mutual funds, ETFs, PMS/AIF understanding, and the suitability lens behind wealth decisions.",
    promise: "Help long-term allocators move from noisy product selection toward category fit, suitability, and durable wealth-product understanding.",
    steps: [
      "Compare funds beyond trailing returns",
      "Understand ETF, PMS, and AIF role differences",
      "Build allocation discipline before product selection gets more advanced",
    ],
    focusAreas: [
      "Category fit, benchmark context, and suitability framing instead of one-dimensional return chasing.",
      "ETF, PMS, AIF, and SIF role clarity so wealth routes feel connected instead of siloed product pages.",
      "Allocation discipline, risk posture, and follow-up workflows that fit long-term investors better than trader tools.",
    ],
    relatedRoutes: [
      {
        label: "Mutual fund selection framework",
        href: "/courses/mutual-fund-selection-framework",
        note: "Use the course path when the user wants a more systematic fund-evaluation flow.",
      },
      {
        label: "Mutual fund hub",
        href: "/mutual-funds",
        note: "Move into route-level research once the user understands the category and benchmark basics.",
      },
      {
        label: "Wealth products hub",
        href: "/wealth",
        note: "Use the broader wealth layer when ETF, PMS, AIF, and SIF fit starts to matter.",
      },
      {
        label: "Investor weekly newsletter",
        href: "/newsletter/investor-weekly",
        note: "Keep long-term users in a calmer recurring digest rather than pushing them into daily market noise.",
      },
    ],
  },
];

export const marketEvents: MarketEvent[] = [
  {
    slug: "tata-motors-results",
    title: "Tata Motors Results Window",
    eventType: "Results",
    status: "Upcoming tracking lane",
    dateLabel: "Coming soon",
    assetRef: "stock:tata-motors",
    summary:
      "Results windows are useful event pages because they create repeat traffic and naturally connect with stock and sector pages.",
    archiveNote:
      "Should later preserve quarterly beats, misses, management commentary, and follow-through links into the stock memory layer.",
    checkpoints: [
      "Capture the pre-results expectation framing from the stock route and related sector context.",
      "Carry the announcement into post-results scorecards, guidance notes, and watchlist follow-up.",
      "Preserve the next two or three result windows so the stock page gains durable market-memory depth.",
    ],
    followUpRoutes: [
      {
        label: "Tata Motors stock page",
        href: "/stocks/tata-motors",
        note: "Move into the stock route for valuation, market-memory, and chart context once the event matters.",
      },
      {
        label: "Auto sector hub",
        href: "/sectors/auto",
        note: "Compare the event against related sector leaders and laggards instead of viewing it in isolation.",
      },
      {
        label: "Results calendar",
        href: "/reports/results-calendar",
        note: "Keep the broader quarterly-event context visible for users following multiple names.",
      },
    ],
  },
  {
    slug: "hero-fincorp-ipo-window",
    title: "Hero Fincorp IPO Window",
    eventType: "IPO",
    status: "Lifecycle watch",
    dateLabel: "To be announced",
    assetRef: "ipo:hero-fincorp",
    summary:
      "IPO windows support multiple connected pages: issue details, GMP, allotment, listing, and FAQs.",
    archiveNote:
      "Should persist subscription, allotment, listing, and post-listing handoff as one connected IPO event-history chain.",
    checkpoints: [
      "Track the issue snapshot, DRHP-to-RHP handoff, and investor caution notes in one chain.",
      "Preserve subscription, allotment, and listing updates instead of resetting context on every route.",
      "Link the IPO event into post-listing stock coverage and learning surfaces for better continuity.",
    ],
    followUpRoutes: [
      {
        label: "IPO hub",
        href: "/ipo",
        note: "Use the main IPO tracker when the user is browsing multiple active and upcoming issues.",
      },
      {
        label: "IPO analysis live workshop",
        href: "/webinars/ipo-analysis-live",
        note: "Move into a live or replay-friendly explanation route when the user wants guided issue review.",
      },
      {
        label: "How to read IPO GMP",
        href: "/learn/how-to-read-ipo-gmp",
        note: "Use this explainer so hype-driven GMP questions stay tied to better investor discipline.",
      },
    ],
  },
  {
    slug: "amc-nav-refresh",
    title: "Mutual Fund NAV Refresh Cycle",
    eventType: "NAV",
    status: "Daily trust cadence",
    dateLabel: "Daily",
    assetRef: "mutual_fund:hdfc-mid-cap-opportunities",
    summary:
      "Daily NAV refreshes are a recurring trust and habit surface for mutual fund users and category hubs.",
    archiveNote:
      "Should become a rolling archive of NAV, category context, and commentary refreshes rather than a one-line recurring note.",
    checkpoints: [
      "Refresh the delayed NAV and category context together so the route stays trustworthy.",
      "Preserve change notes and compare-readiness instead of presenting each NAV as an isolated number.",
      "Tie the daily trust cadence back into category pages, compare routes, and allocator learning paths.",
    ],
    followUpRoutes: [
      {
        label: "HDFC Mid-Cap Opportunities",
        href: "/mutual-funds/hdfc-mid-cap-opportunities",
        note: "Use the fund route for holdings, benchmark, and suitability context around the NAV.",
      },
      {
        label: "Mid-cap fund category",
        href: "/fund-categories/mid-cap-fund",
        note: "Keep the category lens visible so one NAV move does not get mistaken for the whole fund story.",
      },
      {
        label: "Mutual fund selection clinic",
        href: "/webinars/mutual-fund-selection-clinic",
        note: "Use a live or replay-friendly education route when users need help turning NAV updates into decisions.",
      },
    ],
  },
];

export const getLearnArticles = cache(async () => learnArticles);
export const getLearningPaths = cache(async () => learningPaths);
export const getLearningPath = cache(async (slug: string) => {
  return learningPaths.find((item) => item.slug === slug) ?? null;
});

export const getLearnArticle = cache(async (slug: string) => {
  return learnArticles.find((item) => item.slug === slug) ?? null;
});

export const getMarketEvents = cache(async () => marketEvents);
export const getMarketEvent = cache(async (slug: string) => {
  return marketEvents.find((item) => item.slug === slug) ?? null;
});

export function getLearningPathRoutes() {
  return learningPaths.map((path) => ({
    slug: path.slug,
    href: `/learn/tracks/${path.slug}`,
  }));
}

export function getMarketEventRoutes() {
  return marketEvents.map((event) => ({
    slug: event.slug,
    href: `/learn/events/${event.slug}`,
  }));
}
