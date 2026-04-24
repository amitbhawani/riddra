export type MarketCopilotRouteHandoff = {
  label: string;
  href: string;
  note: string;
};

export type MarketCopilotPlaybook = {
  slug: string;
  title: string;
  audience: string;
  goal: string;
  sampleAsk: string;
  answerShape: string;
  checks: string[];
  outputs: string[];
  routeHandoffs: MarketCopilotRouteHandoff[];
};

export const marketCopilotSummary = {
  answerMode: "Formula-first",
  liveAiDefault: "Disabled by design",
  groundedSources: 5,
  activePlaybooks: 5,
  routeHandoffs: 15,
};

export const marketCopilotPanels = [
  {
    title: "Index sentiment explainer",
    status: "Guided preview",
    summary: "Explains index mood using weighted breadth, pullers, draggers, and known rule-based market structures before any model call is considered.",
  },
  {
    title: "Stock compare handoff",
    status: "Working handoff",
    summary: "Turns a broad stock question into a tighter compare-first path so users land on the strongest decision route quickly.",
  },
  {
    title: "IPO and issue review guide",
    status: "Guided preview",
    summary: "Frames issue windows, document review, and listing flow as a stepwise decision brief instead of loose narrative advice.",
  },
  {
    title: "Fund shortlist guide",
    status: "Guided preview",
    summary: "Uses category fit, benchmark context, holdings posture, and route handoffs to keep fund selection grounded.",
  },
  {
    title: "Live AI optional layer",
    status: "Not activated",
    summary: "If enabled later, this layer can add a concise explanation on top of the structured result, but it never replaces the trusted base output.",
  },
];

export const marketCopilotPlaybooks: MarketCopilotPlaybook[] = [
  {
    slug: "decode-index-mood",
    title: "Decode index mood",
    audience: "Daily market readers",
    goal: "Turn an index move into a structured breadth-first explanation.",
    sampleAsk: "Why does Nifty 50 feel strong today if only a few names are pulling it up?",
    answerShape: "Mood summary → pullers and draggers → breadth read → next route to open",
    checks: [
      "Read market mood, breadth score, advancing-vs-declining count, and weight share first.",
      "Separate dominant leaders from broad participation so the answer does not overstate strength.",
      "Keep Sensex as the clean control route while NSE chart verification still needs care.",
    ],
    outputs: [
      "A clean explanation of whether the move is broad, narrow, mixed, or weakening.",
      "A short list of which route to open next: index page, compare page, or market overview.",
      "A formula-first answer that still works when live AI is disabled.",
    ],
    routeHandoffs: [
      {
        label: "Nifty 50",
        href: "/nifty50",
        note: "Use this for the main breadth, puller, and dragger read.",
      },
      {
        label: "Sensex",
        href: "/sensex",
        note: "Use this as the cleanest chart anchor while NSE chart mapping is still being normalized.",
      },
      {
        label: "Markets",
        href: "/markets",
        note: "Use this when the user needs a broader market snapshot instead of one index only.",
      },
    ],
  },
  {
    slug: "compare-leading-stocks",
    title: "Compare leading stocks",
    audience: "Research and compare users",
    goal: "Move quickly from a broad stock question into a stronger side-by-side route.",
    sampleAsk: "Should I study HDFC Bank or ICICI Bank first if I want a cleaner banking leader?",
    answerShape: "Matchup framing → best compare route → what to read first → deeper stock pages",
    checks: [
      "Start with sector and scale similarity instead of comparing unrelated names.",
      "Use the compare route first when a decision is really about choosing between two leaders.",
      "Keep quote truth honest when a page is still on delayed or manual-close mode.",
    ],
    outputs: [
      "A tighter compare-first recommendation instead of a vague stock summary.",
      "A route handoff into the strongest stock-vs-stock decision page.",
      "Clear next moves into individual research pages only if needed.",
    ],
    routeHandoffs: [
      {
        label: "HDFC Bank vs ICICI Bank",
        href: "/compare/stocks/hdfc-bank/icici-bank",
        note: "Strong sector-matched compare route for leadership and quality framing.",
      },
      {
        label: "Stocks",
        href: "/stocks",
        note: "Use this if the user still needs the broader stock library before comparing.",
      },
      {
        label: "Tata Motors",
        href: "/stocks/tata-motors",
        note: "One of the completed stock research routes for follow-through depth.",
      },
    ],
  },
  {
    slug: "review-ipo-window",
    title: "Review an IPO window",
    audience: "IPO and allotment users",
    goal: "Turn IPO interest into a document-led action brief.",
    sampleAsk: "What should I actually review before applying to an IPO this week?",
    answerShape: "Issue status → what to read → risk checks → allotment and listing follow-through",
    checks: [
      "Start with the issue lifecycle, schedule, and price-band clarity.",
      "Separate official documents and process steps from GMP-style noise.",
      "Always leave the user with the next operational route to open.",
    ],
    outputs: [
      "A checklist-led IPO review instead of generic hype or noise.",
      "A cleaner transition from IPO curiosity into issue research and later stock tracking.",
      "A path into the IPO course or webinar when the user needs more structured help.",
    ],
    routeHandoffs: [
      {
        label: "IPO Hub",
        href: "/ipo",
        note: "Use this for the live issue list, lifecycle framing, and action windows.",
      },
      {
        label: "IPO Analysis Course",
        href: "/courses/ipo-analysis-made-easy",
        note: "Use this when the user needs a more structured process than one short answer.",
      },
      {
        label: "IPO Analysis Live Workshop",
        href: "/webinars/ipo-analysis-live",
        note: "Use this for event-led education and replay follow-through.",
      },
    ],
  },
  {
    slug: "shortlist-mutual-funds",
    title: "Shortlist mutual funds",
    audience: "Investor and SIP users",
    goal: "Keep fund selection anchored in category fit and route-backed comparison.",
    sampleAsk: "How do I narrow two or three mutual funds without just chasing 1-year returns?",
    answerShape: "Category fit → benchmark and risk read → shortlist route → SIP or compare handoff",
    checks: [
      "Start with goal horizon and category fit before return tables.",
      "Use compare routes when the user is deciding between similar funds.",
      "Keep NAV-feed truth explicit when a route is still awaiting verified delayed snapshots.",
    ],
    outputs: [
      "A shortlist framework instead of a single performance-chasing recommendation.",
      "A handoff into fund comparison, wealth planning, or SIP planning depending on intent.",
      "A cleaner investor workflow that ties education to product routes.",
    ],
    routeHandoffs: [
      {
        label: "Mutual Fund Compare",
        href: "/compare/mutual-funds/hdfc-mid-cap-opportunities/sbi-bluechip-fund",
        note: "Use this when the user is deciding between two named funds.",
      },
      {
        label: "Mutual Funds",
        href: "/mutual-funds",
        note: "Use this for the broader fund library and route discovery.",
      },
      {
        label: "SIP Goal Planner",
        href: "/tools/sip-goal-planner",
        note: "Use this when the next question is really about contribution planning.",
      },
    ],
  },
  {
    slug: "map-next-best-route",
    title: "Map the next best route",
    audience: "Users unsure where to go next",
    goal: "Translate vague intent into the right Riddra surface quickly.",
    sampleAsk: "I want to understand the market, find a stock idea, and maybe plan a SIP. Where do I start?",
    answerShape: "Intent split → best route sequence → strongest pages to open now",
    checks: [
      "Identify whether the user is asking about markets, trading, IPOs, long-term investing, or utilities.",
      "Prefer strong existing routes over weaker shell-heavy routes.",
      "Keep the journey practical: one discovery page, one decision page, one action page.",
    ],
    outputs: [
      "A route sequence instead of a generic content recommendation.",
      "More reliable product discovery for users who do not know the menu structure yet.",
      "A formula-first guidance layer that improves the shell-heavy parts of the platform today.",
    ],
    routeHandoffs: [
      {
        label: "Markets",
        href: "/markets",
        note: "Best starting point for broad daily context.",
      },
      {
        label: "Screener",
        href: "/screener",
        note: "Use this when the user wants idea discovery or filter-driven narrowing.",
      },
      {
        label: "Tools",
        href: "/tools",
        note: "Use this when the next move is planning, sizing, or utility work.",
      },
    ],
  },
];

export const marketCopilotRules = [
  "The copilot should explain what the system already knows from structured data before it attempts any generated summary.",
  "If live AI is disabled, the copilot still works through templates, formulas, and grounded retrieval.",
  "Every answer should stay connected to real product surfaces like charts, stock pages, IPO pages, fund pages, and tools.",
  "When a route is still seeded or pending, the copilot should hand users into the strongest honest route instead of pretending weak data is authoritative.",
];
