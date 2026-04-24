export type Webinar = {
  slug: string;
  title: string;
  format: string;
  audience: string;
  cadence: string;
  duration: string;
  host: string;
  nextSession: string;
  access: string;
  summary: string;
  formatStatus: string;
  replayPlan: string;
  registrationMode: string;
  registrationSteps: string[];
  replayAssets: string[];
  outcomes: string[];
  agenda: string[];
  assets: string[];
  followUpRoutes: Array<{ label: string; href: string }>;
};

export const webinarSummary = {
  upcomingSessions: 3,
  starterTracks: 2,
  creatorFormats: 3,
  replayAssets: 5,
};

export const webinars: Webinar[] = [
  {
    slug: "ipo-analysis-live",
    title: "IPO Analysis Live Workshop",
    format: "Live workshop",
    audience: "IPO-first investors",
    cadence: "Weekly during active issue windows",
    duration: "75 minutes",
    host: "Amit Bhawani",
    nextSession: "Saturday · 11:00 AM IST",
    access: "Free with signup",
    summary:
      "A guided live session format that turns the IPO hub into a conversion and trust engine through reviews, question handling, and document-led walkthroughs.",
    formatStatus: "Launch-ready",
    replayPlan: "Replay page, IPO checklist article, and allotment reminder sequence",
    registrationMode: "Open signup with reminder and worksheet delivery",
    registrationSteps: [
      "Collect signup details, topic intent, and IPO focus so the live room context stays relevant.",
      "Send the worksheet, DRHP reading checklist, and issue window reminder before the session.",
      "Route attendees into the replay, IPO hub, and allotment follow-up after the workshop ends.",
    ],
    replayAssets: [
      "Chaptered replay with valuation, risk, and listing-day sections",
      "Issue-review worksheet and DRHP checklist download",
      "Recap note linked to IPO detail pages and the investor digest",
    ],
    outcomes: [
      "Teach users how to judge issue quality, pricing, and lifecycle risk.",
      "Turn live Q&A into reusable FAQ and newsletter blocks.",
      "Link event attendees back into IPO detail pages and tools.",
    ],
    agenda: [
      "Issue snapshot and valuation framing",
      "DRHP and promoter-readiness review",
      "Grey market premium caution and how to interpret it",
      "Listing-day expectations and follow-up checklist",
    ],
    assets: [
      "Live issue-review worksheet",
      "DRHP and RHP reading checklist",
      "Listing-day action note",
    ],
    followUpRoutes: [
      { label: "IPO Hub", href: "/ipo" },
      { label: "Courses", href: "/courses/ipo-analysis-made-easy" },
      { label: "Newsletter", href: "/newsletter/ipo-and-listings-watch" },
    ],
  },
  {
    slug: "chart-reading-bootcamp",
    title: "Chart Reading Bootcamp",
    format: "Multi-part webinar",
    audience: "Trader and chart users",
    cadence: "Cohort-ready",
    duration: "90 minutes",
    host: "Amit Bhawani",
    nextSession: "Next cohort opens soon",
    access: "Bundle included",
    summary:
      "A chart-first teaching format tied directly to the workstation and advanced charts surfaces so education and tooling reinforce each other.",
    formatStatus: "In build",
    replayPlan: "Replay clips, workstation walkthrough, and chart-layout onboarding sequence",
    registrationMode: "Cohort waitlist with chart-prep checklist",
    registrationSteps: [
      "Capture chart skill level, device preference, and preferred market style before cohort access is granted.",
      "Send the markup template, layout checklist, and practice journal ahead of the first session.",
      "Sequence learners into replay clips, chart routes, and workstation onboarding after the bootcamp.",
    ],
    replayAssets: [
      "Segmented replay clips for structure, layouts, and planning workflows",
      "Chart-markup template plus preset checklist",
      "Practice review journal tied to chart and workstation routes",
    ],
    outcomes: [
      "Connect chart education directly to Riddra trading surfaces.",
      "Create replay snippets for newsletters and onboarding emails.",
      "Build trust in chart tools before advanced indicator access is enabled.",
    ],
    agenda: [
      "Price structure and trend reading",
      "How to use layouts, watchlists, and presets",
      "Index replay and practice workflow",
      "From chart reading to rules-based trade planning",
    ],
    assets: [
      "Chart-markup template",
      "Layout and preset checklist",
      "Practice review journal",
    ],
    followUpRoutes: [
      { label: "Charts", href: "/charts" },
      { label: "Advanced Charts", href: "/advanced-charts" },
      { label: "Course", href: "/courses/price-action-and-chart-reading" },
    ],
  },
  {
    slug: "mutual-fund-selection-clinic",
    title: "Mutual Fund Selection Clinic",
    format: "Live Q&A plus examples",
    audience: "Long-term investors",
    cadence: "Monthly",
    duration: "60 minutes",
    host: "Amit Bhawani",
    nextSession: "Month-end investor clinic",
    access: "Free with signup",
    summary:
      "A repeatable education format that helps users compare categories, benchmarks, holdings, and costs while building trust in the investor layer.",
    formatStatus: "Launch-ready",
    replayPlan: "Evergreen selection guide, compare page links, and investor weekly digest",
    registrationMode: "Free investor RSVP with category-specific prompts",
    registrationSteps: [
      "Capture fund category interests, SIP horizon, and benchmark questions before the live clinic.",
      "Deliver the shortlist worksheet and benchmark cheat-sheet as the pre-session pack.",
      "Route attendees into replay, compare pages, and the investor digest once the clinic closes.",
    ],
    replayAssets: [
      "Evergreen replay chapters for category fit, risk, and shortlist logic",
      "Fund shortlist worksheet plus SIP decision checklist",
      "Compare-page handoff note and investor-weekly recap",
    ],
    outcomes: [
      "Teach users how to compare funds without depending on hype.",
      "Support category pages and fund detail pages with embedded education.",
      "Feed the investor newsletter with better structured examples.",
    ],
    agenda: [
      "Category fit and benchmark context",
      "Risk, holdings, and expense review",
      "Comparing manager style and allocation drift",
      "How to turn research into SIP decisions",
    ],
    assets: [
      "Fund shortlist worksheet",
      "Risk and benchmark cheat-sheet",
      "SIP decision checklist",
    ],
    followUpRoutes: [
      { label: "Mutual Funds", href: "/mutual-funds" },
      { label: "Course", href: "/courses/mutual-fund-selection-framework" },
      { label: "Wealth", href: "/wealth" },
    ],
  },
];

export const webinarRules = [
  "Webinars should link back into learn articles, courses, IPO pages, fund pages, and tools so each live event strengthens the rest of the platform.",
  "Creator formats should support launch giveaways, bundle value, and subscriber retention instead of existing as isolated media experiments.",
  "Every webinar should be reusable later as an article embed, course asset, or newsletter sequence so one content effort creates multiple outputs.",
];

export function getWebinarBySlug(slug: string) {
  return webinars.find((item) => item.slug === slug);
}

export function getWebinarRoutes() {
  return webinars.map((item) => ({
    title: item.title,
    href: `/webinars/${item.slug}`,
  }));
}

export function getWebinarRegisterRoutes() {
  return webinars.map((item) => ({
    title: `${item.title} registration`,
    href: `/webinars/${item.slug}/register`,
  }));
}

export function getWebinarReplayRoutes() {
  return webinars.map((item) => ({
    title: `${item.title} replay`,
    href: `/webinars/${item.slug}/replay`,
  }));
}
