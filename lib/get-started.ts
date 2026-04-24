export type GettingStartedPath = {
  title: string;
  summary: string;
  href: string;
  audience: string;
};

export type AccountSetupItem = {
  title: string;
  note: string;
  status: "Ready" | "Next" | "Later";
};

export const gettingStartedPaths: GettingStartedPath[] = [
  {
    title: "Explore Indian stocks",
    summary: "Start with market pages, charts, sectors, and compare flows if you mainly track listed companies.",
    href: "/stocks",
    audience: "Investors and traders",
  },
  {
    title: "Track IPOs and SME IPOs",
    summary: "Use the IPO hub, GMP-driven issue pages, and lifecycle pages if new listings are your main interest.",
    href: "/ipo",
    audience: "IPO-focused users",
  },
  {
    title: "Use free tools first",
    summary: "Position sizing, IPO lot planning, SIP planning, and checklist-style tools can build trust before signup.",
    href: "/tools",
    audience: "First-time visitors",
  },
  {
    title: "Set up a portfolio workflow",
    summary: "Move into CSV import review, manual portfolio creation, and alert readiness if you want a daily workspace.",
    href: "/portfolio",
    audience: "Account-led users",
  },
  {
    title: "Learn and courses",
    summary: "Use articles and bundled course pages if you want to pair product usage with education and videos later.",
    href: "/learn",
    audience: "Content-led users",
  },
];

export const accountSetupItems: AccountSetupItem[] = [
  {
    title: "Choose your primary use case",
    note: "Investor, trader, IPO watcher, portfolio user, or learner. This should shape future onboarding and recommendations.",
    status: "Ready",
  },
  {
    title: "Set alert intensity and channels",
    note: "Route users into the alert-preferences flow early so Riddra can stay useful without becoming noisy.",
    status: "Ready",
  },
  {
    title: "Create or import first portfolio",
    note: "A saved portfolio is one of the strongest retention drivers and the cleanest path into future subscriber depth.",
    status: "Next",
  },
  {
    title: "Save first watchlist or workspace preset",
    note: "This should follow once entitlements and saved states are backed by the real data layer.",
    status: "Later",
  },
];
