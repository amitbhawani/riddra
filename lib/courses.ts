export type CourseLevel = "Beginner" | "Intermediate" | "Advanced";
export type CourseAccess = "Free" | "Bundle included" | "Premium later";

export type CourseLesson = {
  title: string;
  format: string;
  duration: string;
  outcome: string;
};

export type CourseLessonEntry = CourseLesson & {
  slug: string;
  lessonNumber: number;
  href: string;
};

export type CourseRouteLink = {
  label: string;
  href: string;
};

export type CourseItem = {
  slug: string;
  title: string;
  category: string;
  level: CourseLevel;
  audience: string;
  access: CourseAccess;
  duration: string;
  format: string;
  instructor: string;
  priceAnchor: string;
  bundleFit: string;
  summary: string;
  outcomes: string[];
  prerequisites: string[];
  deliverables: string[];
  modules: string[];
  lessonPlan: CourseLesson[];
  relatedRoutes: CourseRouteLink[];
};

export const courseCollections = [
  {
    title: "Free starter bundle",
    description: "Low-friction learning meant to create trust, encourage signups, and help users feel immediate value before any upsell.",
    access: "Free",
  },
  {
    title: "Subscriber bundle",
    description: "High-perceived-value courses included inside the early subscription so users feel they are getting much more than just tools.",
    access: "Bundle included",
  },
  {
    title: "Advanced tracks",
    description: "Deeper trader and investor programs that can become premium or cohort-style offerings later.",
    access: "Premium later",
  },
];

export const courses: CourseItem[] = [
  {
    slug: "stock-market-foundation",
    title: "Stock Market Foundation",
    category: "Beginner Markets",
    level: "Beginner",
    audience: "First-time stock market learners",
    access: "Free",
    duration: "6 modules",
    format: "Video + notes",
    instructor: "Amit Bhawani",
    priceAnchor: "Worth ₹2,499",
    bundleFit: "Starter trust builder",
    summary: "Entry-level course designed to help first-time users understand stocks, brokers, demat, indices, and the Riddra product journey.",
    outcomes: [
      "Understand how Indian stock markets are structured",
      "Learn the role of broker, demat, and exchange systems",
      "Get comfortable reading basic stock and IPO pages",
    ],
    prerequisites: [
      "No prior market experience required",
      "Have a basic interest in stocks, IPOs, or investing",
      "Keep one demo stock and one index page open while learning",
    ],
    deliverables: [
      "Starter glossary and concept notes",
      "First watchlist setup checklist",
      "Route map into stocks, IPOs, and market pages",
    ],
    modules: ["Markets 101", "Demat and broker basics", "How to read a stock page", "Index basics", "IPO basics", "First watchlist"],
    lessonPlan: [
      {
        title: "How Indian markets are structured",
        format: "Video lesson",
        duration: "18 min",
        outcome: "Understand exchanges, indices, brokers, and listed companies in one clean frame.",
      },
      {
        title: "Broker, demat, and order flow basics",
        format: "Video + worksheet",
        duration: "22 min",
        outcome: "Know what actually happens between your broker screen and the exchange.",
      },
      {
        title: "Reading a stock page without getting overwhelmed",
        format: "Guided walkthrough",
        duration: "16 min",
        outcome: "Use the main stock summary, chart, compare, and event sections with confidence.",
      },
      {
        title: "Index basics through Nifty and Sensex",
        format: "Video lesson",
        duration: "14 min",
        outcome: "Understand what indices measure and why breadth and weights matter.",
      },
      {
        title: "IPO basics and issue lifecycle",
        format: "Checklist walkthrough",
        duration: "17 min",
        outcome: "Read issue windows, allotment flow, and listing-day transitions clearly.",
      },
      {
        title: "Build your first market watchlist",
        format: "Practical task",
        duration: "12 min",
        outcome: "End the course with a starter list of stocks, one IPO, and one index to monitor.",
      },
    ],
    relatedRoutes: [
      { label: "Stocks", href: "/stocks" },
      { label: "IPO Hub", href: "/ipo" },
      { label: "Markets", href: "/markets" },
    ],
  },
  {
    slug: "ipo-analysis-made-easy",
    title: "IPO Analysis Made Easy",
    category: "IPO and Primary Markets",
    level: "Beginner",
    audience: "IPO-focused retail investors",
    access: "Bundle included",
    duration: "8 modules",
    format: "Video + checklist",
    instructor: "Amit Bhawani",
    priceAnchor: "Worth ₹4,999",
    bundleFit: "Subscriber conversion bundle",
    summary: "A lifecycle-oriented course teaching users how to assess upcoming IPOs, track allotment, and transition listed issues into long-term research.",
    outcomes: [
      "Evaluate issue size, lot size, GMP, and source documents with discipline",
      "Understand allotment, refund, demat credit, and listing-day flow",
      "Separate official information from market noise",
    ],
    prerequisites: [
      "Know basic stock-market terms",
      "Be familiar with lot size, issue dates, and demat account basics",
      "Keep the IPO hub open while moving through the course",
    ],
    deliverables: [
      "IPO document-review checklist",
      "Allotment and listing-day action sheet",
      "Issue-quality scoring framework",
    ],
    modules: ["IPO lifecycle", "DRHP and RHP basics", "Grey market premium rules", "Subscription data", "Allotment checks", "Listing-day read", "SME IPO risk", "IPO archive to stock handoff"],
    lessonPlan: [
      {
        title: "IPO lifecycle from DRHP to listing",
        format: "Video lesson",
        duration: "20 min",
        outcome: "Understand the full timeline so you know what to review at each stage.",
      },
      {
        title: "How to read DRHP and RHP quickly",
        format: "Document walkthrough",
        duration: "26 min",
        outcome: "Find the sections that matter most without getting buried in the PDF.",
      },
      {
        title: "GMP, noise, and market gossip discipline",
        format: "Framework lesson",
        duration: "14 min",
        outcome: "Avoid over-weighting unofficial chatter when judging an IPO.",
      },
      {
        title: "Subscription data and reservation breakup",
        format: "Table walkthrough",
        duration: "15 min",
        outcome: "Read QIB, HNI, retail, and employee demand without confusion.",
      },
      {
        title: "Allotment, refund, and demat-credit flow",
        format: "Practical checklist",
        duration: "12 min",
        outcome: "Know the exact post-close steps and where users usually get confused.",
      },
      {
        title: "Listing-day framing",
        format: "Scenario workshop",
        duration: "18 min",
        outcome: "Plan what to do on listing day instead of reacting emotionally.",
      },
      {
        title: "SME-specific risk lens",
        format: "Risk review",
        duration: "16 min",
        outcome: "Separate SME opportunity from SME execution and liquidity risk.",
      },
      {
        title: "From IPO page to long-term stock tracking",
        format: "Handoff module",
        duration: "13 min",
        outcome: "Convert a listing event into ongoing research coverage.",
      },
    ],
    relatedRoutes: [
      { label: "IPO Hub", href: "/ipo" },
      { label: "Results Calendar", href: "/reports/results-calendar" },
      { label: "Stocks", href: "/stocks" },
    ],
  },
  {
    slug: "price-action-and-chart-reading",
    title: "Price Action and Chart Reading",
    category: "Trading and Technicals",
    level: "Intermediate",
    audience: "Traders building chart discipline",
    access: "Bundle included",
    duration: "12 modules",
    format: "Video + chart lab",
    instructor: "Amit Bhawani",
    priceAnchor: "Worth ₹7,499",
    bundleFit: "Trader upgrade path",
    summary: "A practical trading course that will later sit close to the charts product and your proprietary indicator workflow.",
    outcomes: [
      "Read candles, structure, support and resistance with clarity",
      "Use charts with context instead of pure indicator dependence",
      "Prepare for Riddra advanced charts and future indicator logic",
    ],
    prerequisites: [
      "Understand basic market terminology",
      "Be comfortable opening stock charts and switching timeframes",
      "Have one or two stocks or indices you already follow",
    ],
    deliverables: [
      "Chart-reading worksheet pack",
      "Trade-planning and review template",
      "Setup checklist for layouts and follow-up practice",
    ],
    modules: ["Chart anatomy", "Trend structure", "Support and resistance", "Breakouts", "Pullbacks", "Multi-timeframe reading", "Volume context", "Risk setup", "Entry planning", "Exit planning", "Trade journaling", "Chart lab"],
    lessonPlan: [
      {
        title: "Chart anatomy and candle logic",
        format: "Video lesson",
        duration: "24 min",
        outcome: "Read candle structure and chart context before using signals.",
      },
      {
        title: "Trend structure and swing logic",
        format: "Live chart walkthrough",
        duration: "22 min",
        outcome: "Recognize continuation, pullback, and failure structure clearly.",
      },
      {
        title: "Support and resistance that actually matters",
        format: "Mark-up lab",
        duration: "20 min",
        outcome: "Avoid clutter and focus on levels worth respecting.",
      },
      {
        title: "Breakouts, traps, and confirmation",
        format: "Case-study module",
        duration: "19 min",
        outcome: "Separate clean breakout structure from false urgency.",
      },
      {
        title: "Multi-timeframe reading",
        format: "Chart lab",
        duration: "18 min",
        outcome: "Line up higher and lower timeframe context before planning entries.",
      },
      {
        title: "Volume, risk, and journaling workflow",
        format: "Checklist + template",
        duration: "21 min",
        outcome: "Tie analysis into a repeatable trade-review system.",
      },
    ],
    relatedRoutes: [
      { label: "Charts", href: "/charts" },
      { label: "Advanced Charts", href: "/advanced-charts" },
      { label: "Trader Workstation", href: "/trader-workstation" },
    ],
  },
  {
    slug: "mutual-fund-selection-framework",
    title: "Mutual Fund Selection Framework",
    category: "Investing and Wealth",
    level: "Beginner",
    audience: "Long-term fund investors",
    access: "Free",
    duration: "5 modules",
    format: "Video + templates",
    instructor: "Amit Bhawani",
    priceAnchor: "Worth ₹2,999",
    bundleFit: "Investor trust builder",
    summary: "Investor-friendly course covering categories, risk, holdings, benchmark fit, and how to compare funds without confusion.",
    outcomes: [
      "Read category, benchmark, and risk information correctly",
      "Compare funds using holdings, returns, and costs",
      "Build a basic long-term fund shortlist with confidence",
    ],
    prerequisites: [
      "Basic understanding of SIPs or long-term investing",
      "No prior fund-analysis experience required",
      "Keep one category page and one fund detail route open while learning",
    ],
    deliverables: [
      "Fund shortlist worksheet",
      "Risk and benchmark comparison cheat-sheet",
      "SIP decision framing template",
    ],
    modules: ["Fund categories", "Risk and benchmark", "Return periods", "Holdings and sector mix", "Building a shortlist"],
    lessonPlan: [
      {
        title: "Fund categories and what they mean",
        format: "Video lesson",
        duration: "16 min",
        outcome: "Know the difference between large-cap, flexi-cap, index, and thematic funds.",
      },
      {
        title: "Risk, benchmark, and suitability",
        format: "Framework lesson",
        duration: "18 min",
        outcome: "Judge whether a fund belongs in your kind of portfolio.",
      },
      {
        title: "Returns without return-chasing",
        format: "Table walkthrough",
        duration: "14 min",
        outcome: "Read trailing returns in context instead of chasing recent winners.",
      },
      {
        title: "Holdings, sector mix, and overlap",
        format: "Portfolio review",
        duration: "17 min",
        outcome: "Spot concentration, duplication, and benchmark drift.",
      },
      {
        title: "Build a shortlist and take action",
        format: "Practical module",
        duration: "12 min",
        outcome: "Leave with a cleaner investor decision process and shortlist.",
      },
    ],
    relatedRoutes: [
      { label: "Mutual Funds", href: "/mutual-funds" },
      { label: "Fund Categories", href: "/fund-categories" },
      { label: "Wealth", href: "/wealth" },
    ],
  },
  {
    slug: "options-and-open-interest-playbook",
    title: "Options and Open Interest Playbook",
    category: "Derivatives",
    level: "Advanced",
    audience: "Options traders and derivatives learners",
    access: "Premium later",
    duration: "14 modules",
    format: "Video + live examples",
    instructor: "Amit Bhawani",
    priceAnchor: "Worth ₹12,000",
    bundleFit: "Advanced premium program",
    summary: "Advanced trader course aligned with the future derivatives, index, and analytics products on Riddra.",
    outcomes: [
      "Understand open interest, positioning, and expiry behavior",
      "Combine index sentiment pages with derivatives context",
      "Build a disciplined options workflow instead of chasing isolated signals",
    ],
    prerequisites: [
      "Comfort with charts and basic trader terminology",
      "Understand futures and options basics before joining",
      "Best paired with the chart-reading course or equivalent experience",
    ],
    deliverables: [
      "OI and expiry-play framework",
      "Risk checklist for derivatives setups",
      "Index-context worksheet for options decisions",
    ],
    modules: ["Options foundations", "OI basics", "Strike behavior", "Expiry structure", "Index context", "Risk frameworks", "Strategy selection", "Journal and review"],
    lessonPlan: [
      {
        title: "Options foundations and positioning lens",
        format: "Video lesson",
        duration: "26 min",
        outcome: "Frame derivatives as positioning and risk, not excitement.",
      },
      {
        title: "Open interest, change in OI, and participation",
        format: "Table + scenario lab",
        duration: "23 min",
        outcome: "Read OI changes with cleaner structure and less noise.",
      },
      {
        title: "Strike behavior and expiry structure",
        format: "Case study",
        duration: "21 min",
        outcome: "Understand how strikes cluster and shift into expiry week.",
      },
      {
        title: "Index context and derivatives alignment",
        format: "Workflow module",
        duration: "18 min",
        outcome: "Connect index pages, sentiment, and derivatives positioning into one view.",
      },
      {
        title: "Risk frameworks and review discipline",
        format: "Template walkthrough",
        duration: "19 min",
        outcome: "Move from signal-chasing into a repeatable options process.",
      },
    ],
    relatedRoutes: [
      { label: "Option Chain", href: "/option-chain" },
      { label: "Nifty 50", href: "/nifty50" },
      { label: "Trader Workstation", href: "/trader-workstation" },
    ],
  },
];

export function getCourseBySlug(slug: string) {
  return courses.find((course) => course.slug === slug) ?? null;
}

function slugifyLessonTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getCourseLessonEntries(course: CourseItem): CourseLessonEntry[] {
  return course.lessonPlan.map((lesson, index) => {
    const slug = `${index + 1}-${slugifyLessonTitle(lesson.title)}`;

    return {
      ...lesson,
      slug,
      lessonNumber: index + 1,
      href: `/courses/${course.slug}/lessons/${slug}`,
    };
  });
}

export function getCourseLessonBySlug(courseSlug: string, lessonSlug: string) {
  const course = getCourseBySlug(courseSlug);

  if (!course) {
    return null;
  }

  const lessons = getCourseLessonEntries(course);
  const lesson = lessons.find((item) => item.slug === lessonSlug);

  if (!lesson) {
    return null;
  }

  return {
    course,
    lesson,
    lessons,
  };
}

export function getCourseLessonRoutes() {
  return courses.flatMap((course) =>
    getCourseLessonEntries(course).map((lesson) => ({
      courseSlug: course.slug,
      lessonSlug: lesson.slug,
      href: lesson.href,
    })),
  );
}
