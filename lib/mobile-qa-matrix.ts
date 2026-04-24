export type MobileQaArea = {
  title: string;
  status: "Ready to test" | "Needs testing" | "Blocked by live data";
  summary: string;
  routes: string[];
};

export const mobileQaAreas: MobileQaArea[] = [
  {
    title: "Public discovery and trust",
    status: "Ready to test",
    summary:
      "Homepage, pricing, learn, privacy, terms, and contact now need one deliberate small-screen pass for spacing, CTA visibility, and trust-path clarity.",
    routes: ["/", "/pricing", "/learn", "/privacy", "/terms", "/contact"],
  },
  {
    title: "Search, screener, and tool workflows",
    status: "Ready to test",
    summary:
      "Header search, assisted search, screener interactions, and the first calculators are all live, but they still need thumb-friendly mobile behavior checks.",
    routes: ["/search", "/screener", "/tools", "/tools/position-size-calculator"],
  },
  {
    title: "Stocks, charts, and indices",
    status: "Blocked by live data",
    summary:
      "The routes are provider-ready and session-aware, but the mobile QA pass should be repeated after verified Tata Motors and tracked index payloads are flowing.",
    routes: ["/stocks/tata-motors", "/stocks/tata-motors/chart", "/indices", "/nifty50", "/sensex"],
  },
  {
    title: "Signup, login, and account setup",
    status: "Needs testing",
    summary:
      "The auth flow and onboarding path need a compact-screen review so Google login, magic-link fallback, and account setup stay clear without desktop assumptions.",
    routes: ["/login", "/signup", "/account/setup"],
  },
  {
    title: "Subscriber workspace and portfolio",
    status: "Needs testing",
    summary:
      "Account, portfolio, alerts, broker review, and workspace routes now have stronger interactions, so the mobile pass needs to confirm the controls stay reachable.",
    routes: ["/account", "/portfolio", "/portfolio/import", "/portfolio/manual", "/account/brokers/review"],
  },
];

export const mobileQaChecklist = [
  "Verify the compact header, search dropdown, and primary navigation do not overflow or trap focus.",
  "Confirm the main CTA and first-scroll content are visible without a broken spacer above the page body.",
  "Check chart, screener, and calculator controls for thumb reach, overflow, and clipped labels.",
  "Confirm auth, pricing, and support routes keep trust messaging and next-step actions above the fold.",
  "Repeat the stocks and indices pass once verified provider payloads are flowing, not only while the pages are in provider-ready mode.",
];
