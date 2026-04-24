import { firstTrustedStockTargets } from "@/lib/market-data-first-rollout";
import { getTradingviewStockSymbol } from "@/lib/tradingview-symbols";

export type ChartVerificationStatus = "Ready" | "In progress" | "Blocked";

export type ChartVerificationRow = {
  family: string;
  label: string;
  href: string;
  symbol: string;
  status: ChartVerificationStatus;
  note: string;
  currentState: string;
  nextStep: string;
};

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export function getChartVerificationRows(): ChartVerificationRow[] {
  return [
    {
      family: "Front-door charts",
      label: "Homepage market chart grid",
      href: "/",
      symbol: "Native index plus stock grid",
      status: "Ready",
      note: "The homepage chart grid now uses the free native chart library for its three flagship index cards plus a native Tata Motors delayed-OHLCV stock tile, so the front door no longer depends on a hosted stock widget for its opening chart layer.",
      currentState: "Fully native front-door chart grid with route-backed index and stock chart payloads.",
      nextStep: "Keep screenshot-backed verification on mobile and desktop as the chart-strip layout evolves, but this block is no longer a hosted-widget risk lane.",
    },
    {
      family: "Front-door charts",
      label: "Markets chart section",
      href: "/markets",
      symbol: "Mixed index grid",
      status: "Ready",
      note: "The markets chart section now uses the free native chart library for all four flagship index cards, so it no longer depends on the hosted widget path for its opening visual layer.",
      currentState: "Fully native index chart grid with route snapshot data.",
      nextStep: "Keep screenshot-backed launch verification in place as styling evolves, but this block is no longer on the critical chart-risk path.",
    },
    {
      family: "Index route",
      label: "Nifty 50 session chart",
      href: "/nifty50",
      symbol: "Native chart library",
      status: "Ready",
      note: "The Nifty 50 route now uses the free TradingView chart library with local last-session timeline data, so it no longer depends on the hosted widget path that was causing the worst NSE popup and blank-load behavior.",
      currentState: "Native chart-library route with weighted-breadth overlay.",
      nextStep: "Keep the hosted-widget symbol audit for homepage and markets, but treat this route as the cleaner launch reference.",
    },
    {
      family: "Index route",
      label: "Bank Nifty session chart",
      href: "/banknifty",
      symbol: "Native chart library",
      status: "Ready",
      note: "Bank Nifty now renders through the free TradingView chart library using the route snapshot rather than the hosted widget, which removes the most visible popup-driven risk from this page.",
      currentState: "Native chart-library route with breadth overlay.",
      nextStep: "Keep verifying the route visually as styles evolve, but the symbol-normalization blocker is no longer on the critical path here.",
    },
    {
      family: "Index route",
      label: "Fin Nifty session chart",
      href: "/finnifty",
      symbol: "Native chart library",
      status: "Ready",
      note: "Fin Nifty now uses the free TradingView chart library with internal timeline data, so the route no longer depends on hosted-widget behavior for its opening chart surface.",
      currentState: "Native chart-library route with breadth overlay.",
      nextStep: "Treat this route as chart-safe while homepage and shared mixed-grid surfaces continue through hosted-widget verification.",
    },
    {
      family: "Index route",
      label: "Sensex session chart",
      href: "/sensex",
      symbol: "Native chart library",
      status: "Ready",
      note: "Sensex already had the cleanest hosted-widget posture, and it now also uses the same native chart-library path as the other major indices for a consistent launch-safe experience.",
      currentState: "Native chart-library route with breadth overlay.",
      nextStep: "Keep this as the stable reference implementation while the broader mixed chart surfaces continue through verification.",
    },
    ...firstTrustedStockTargets.map((target) => ({
      family: "Stock charts",
      label: `${target.name} chart route`,
      href: `${target.route}/chart`,
      symbol: getTradingviewStockSymbol(target.symbol),
      status: "In progress" as const,
      note:
        target.slug === "tata-motors"
          ? "This route already has the strongest source-entry OHLCV path in the first trusted stock set, but it still needs final launch-grade verification on speed, visual integrity, and route trust copy."
          : "This chart route now sits inside the first trusted stock-chart audit set instead of being ignored until later, but it still needs verified OHLCV writes before the public chart can be treated as truly trusted.",
      currentState:
        target.slug === "tata-motors"
          ? "Native-ready chart route with persisted source-entry OHLCV support."
          : "Dedicated chart route with verified OHLCV still pending.",
      nextStep:
        target.slug === "tata-motors"
          ? "Keep this as the stock-chart control case while widening verified OHLCV coverage to the rest of the first trusted stock set."
          : "Load verified or source-entry OHLCV into this route and then verify the public chart flow end to end.",
    })),
    {
      family: "Fund charts",
      label: "Mutual-fund benchmark proxy charts",
      href: "/mutual-funds/hdfc-mid-cap-opportunities",
      symbol: "Benchmark proxy",
      status: "In progress",
      note: "Fund routes now use a stable benchmark-handoff card instead of embedding a flaky hosted proxy chart as if it were scheme-specific truth, but the visual layer is still benchmark-led rather than a real scheme-history chart.",
      currentState: "Stable benchmark or market handoff card with explicit proxy language.",
      nextStep: "Move from benchmark handoff into verified benchmark-specific mapping or real scheme-history coverage before fund chart claims expand.",
    },
  ];
}

export function getChartVerificationSummary() {
  const rows = getChartVerificationRows();

  return {
    total: rows.length,
    ready: rows.filter((row) => row.status === "Ready").length,
    inProgress: rows.filter((row) => row.status === "In progress").length,
    blocked: rows.filter((row) => row.status === "Blocked").length,
  };
}

export function toChartVerificationCsv(rows: ChartVerificationRow[]) {
  const header = ["family", "label", "href", "symbol", "status", "note", "current_state", "next_step"];
  const lines = rows.map((row) =>
    [row.family, row.label, row.href, row.symbol, row.status, row.note, row.currentState, row.nextStep]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}
