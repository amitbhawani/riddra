export type DemoShowcaseSection = {
  title: string;
  summary: string;
  status: "Ready now" | "In progress" | "Next";
  href: string;
  checks: string[];
};

export const demoShowcaseReadiness: DemoShowcaseSection[] = [
  {
    title: "Stock detail showcase",
    summary:
      "Tata Motors and the strongest seeded stock routes now open with a clearer chart-or-compare showcase path, so the stock story lands faster during a live walkthrough.",
    status: "Ready now",
    href: "/stocks/tata-motors",
    checks: [
      "Hero should scan cleanly in under five seconds during a live walkthrough.",
      "Snapshot, source state, and chart handoff should feel trustworthy even before full live feeds are activated.",
      "A compare jump should be visible from the stock route without digging through the lower page.",
    ],
  },
  {
    title: "Mutual fund detail showcase",
    summary:
      "The mutual fund detail flow now opens with quick stats, suitability framing, and a cleaner compare-first showcase strip for the investor-side story.",
    status: "Ready now",
    href: "/mutual-funds/hdfc-mid-cap-opportunities",
    checks: [
      "Quick-view metrics must feel investor-friendly, not like internal placeholders.",
      "Research framing should explain fit, risk, and benchmark context at a glance.",
      "A clear compare route should be reachable from the first scroll, not only the lower compare card.",
    ],
  },
  {
    title: "Stock comparison showcase",
    summary:
      "Turn the stock compare route into a presentation-grade decision page instead of a thin metric table.",
    status: "Ready now",
    href: "/compare/stocks/tata-motors/reliance-industries",
    checks: [
      "Hero should summarize the matchup immediately.",
      "Side-by-side scorecards should highlight where each stock wins.",
      "The page should feel demo-worthy on both desktop and laptop widths.",
    ],
  },
  {
    title: "Visual data blocks and graphics",
    summary:
      "Stock and mutual-fund compare routes now carry a denser two-layer visual system, so key demo pages scan more like decision dashboards than text-heavy briefs.",
    status: "Ready now",
    href: "/compare/stocks/tata-motors/reliance-industries",
    checks: [
      "Core metrics now have both scorecard bars and winner-led matchup strips instead of relying only on plain table rows.",
      "The compare routes should scan cleanly in screenshots before the walkthrough drops into the lower table sections.",
      "The same visual language now works across stock and mutual-fund compare surfaces.",
    ],
  },
  {
    title: "Mutual fund comparison showcase",
    summary:
      "Upgrade the fund compare route into a cleaner allocator workflow with category fit, cost, risk, and holding context side by side.",
    status: "Ready now",
    href: "/compare/mutual-funds/hdfc-mid-cap-opportunities/sbi-bluechip-fund",
    checks: [
      "The page should help narrate fit, cost, and category differences without scrolling forever.",
      "Performance and allocation sections should be easy to present to non-technical viewers.",
      "The compare route should feel ready for screenshot sharing.",
    ],
  },
  {
    title: "Demo navigation discipline",
    summary:
      "Homepage plus the stock and mutual-fund hubs now expose the best opening sequence directly, so the walkthrough starts from intentional routes instead of improvised navigation.",
    status: "Ready now",
    href: "/",
    checks: [
      "Header should stay compact on desktop.",
      "Search should assist rather than explode the layout.",
      "The first screen should immediately orient the audience and expose the strongest next clicks.",
    ],
  },
  {
    title: "Screenshot-safe showcase routes",
    summary:
      "The strongest compare routes now have cleaner top frames for capture, so the first shared screenshots can come from pages that already explain themselves.",
    status: "Ready now",
    href: "/compare/mutual-funds/hdfc-mid-cap-opportunities/sbi-bluechip-fund",
    checks: [
      "The top fold should communicate the matchup without requiring narrator context.",
      "Winner-led metric strips should keep screenshots readable on laptop-width captures.",
      "The first capture set should favor the strongest stock and fund compare routes over lower-density pages.",
    ],
  },
];
