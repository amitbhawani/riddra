import {
  firstTrustedFundTargets,
  firstTrustedStockTargets,
} from "@/lib/market-data-first-rollout";

export type ProviderPayloadContract = {
  family: string;
  description: string;
  targetRoutes: string[];
  requiredFields: string[];
  sampleValues: Record<string, string | number | boolean>;
};

export const providerPayloadContracts: ProviderPayloadContract[] = [
  {
    family: "Stock quote snapshot",
    description: "Normalized delayed quote payload for the first trusted stock rollout set.",
    targetRoutes: firstTrustedStockTargets.map((target) => target.route),
    requiredFields: ["slug", "symbol", "name", "price", "change", "changePercent", "asOf", "source", "mode"],
    sampleValues: {
      slug: "tata-motors",
      symbol: "TATAMOTORS",
      name: "Tata Motors",
      price: 945.2,
      change: 12.6,
      changePercent: 1.35,
      asOf: "2026-04-14T09:45:00+05:30",
      source: "Approved delayed equity feed",
      mode: "delayed_snapshot",
    },
  },
  {
    family: "Stock OHLCV chart bar",
    description: "Normalized OHLCV candle payload for chart rendering and detail-route trust state.",
    targetRoutes: ["/stocks/tata-motors/chart"],
    requiredFields: ["slug", "interval", "timestamp", "open", "high", "low", "close", "volume", "source"],
    sampleValues: {
      slug: "tata-motors",
      interval: "1d",
      timestamp: "2026-04-14T09:15:00+05:30",
      open: 938.4,
      high: 952.7,
      low: 934.1,
      close: 945.2,
      volume: 2850000,
      source: "Approved delayed OHLCV feed",
    },
  },
  {
    family: "Index snapshot",
    description: "Normalized breadth and level snapshot for the first tracked indices.",
    targetRoutes: ["/nifty50", "/sensex", "/banknifty", "/finnifty"],
    requiredFields: ["slug", "label", "level", "change", "changePercent", "advances", "declines", "asOf", "source"],
    sampleValues: {
      slug: "nifty50",
      label: "Nifty 50",
      level: 24385.6,
      change: 168.2,
      changePercent: 0.69,
      advances: 32,
      declines: 18,
      asOf: "2026-04-14T09:45:00+05:30",
      source: "Approved delayed index feed",
    },
  },
  {
    family: "Mutual fund NAV snapshot",
    description: "Normalized NAV payload for the first real delayed mutual-fund refresh path.",
    targetRoutes: firstTrustedFundTargets.map((target) => target.route),
    requiredFields: ["slug", "schemeName", "nav", "returns1Y", "navDate", "source", "mode"],
    sampleValues: {
      slug: "hdfc-mid-cap-opportunities",
      schemeName: "HDFC Mid-Cap Opportunities Fund",
      nav: 198.34,
      returns1Y: 23.6,
      navDate: "2026-04-13",
      source: "AMFI delayed NAV feed",
      mode: "delayed_snapshot",
    },
  },
];
