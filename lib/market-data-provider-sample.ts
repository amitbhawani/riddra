import { getIndianMarketSession } from "@/lib/market-session";
import {
  firstTrustedFundTargets,
  firstTrustedStockTargets,
} from "@/lib/market-data-first-rollout";

function getCurrentIndiaIso() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .replace(" ", "T")
    .replace(/\//g, "-");
}

export function getSampleMarketDataPayload() {
  const indiaNow = getCurrentIndiaIso();
  const marketSession = getIndianMarketSession();

  const stockQuoteMap: Record<string, { price: number; changePercent: number }> = {
    "tata-motors": { price: 345.1, changePercent: 0.74 },
    "reliance-industries": { price: 1314.0, changePercent: -2.68 },
    infosys: { price: 1276.0, changePercent: -1.28 },
    tcs: { price: 2470.5, changePercent: -2.13 },
    "hdfc-bank": { price: 793.0, changePercent: -2.14 },
    "icici-bank": { price: 1349.7, changePercent: 2.1 },
    "axis-bank": { price: 1352.8, changePercent: 0.15 },
    "state-bank-of-india": { price: 1061.85, changePercent: -0.45 },
    itc: { price: 298.8, changePercent: -1.79 },
  };

  return {
    generatedAt: indiaNow,
    marketSession,
    payload: {
      stockQuotes: [
        ...firstTrustedStockTargets.map((target) => ({
          slug: target.slug,
          source: "provider-delayed-feed",
          sourceCode: "nse_delayed_feed",
          price: stockQuoteMap[target.slug]?.price ?? 0,
          changePercent: stockQuoteMap[target.slug]?.changePercent ?? 0,
          lastUpdated: "2026-04-13T15:25:00+05:30",
        })),
      ],
      stockCharts: [
        {
          slug: "tata-motors",
          source: "provider-delayed-feed",
          sourceCode: "nse_delayed_feed",
          timeframe: "1D",
          lastUpdated: "2026-04-13T15:25:00+05:30",
          bars: [
            { time: "2026-04-09", open: 1010.2, high: 1029.8, low: 1002.4, close: 1024.3, volume: 1284000 },
            { time: "2026-04-10", open: 1024.3, high: 1048.4, low: 1019.9, close: 1042.35, volume: 1438000 },
            { time: "2026-04-11", open: 1042.35, high: 1051.2, low: 1031.4, close: 1038.85, volume: 1326000 },
            { time: "2026-04-12", open: 1038.85, high: 1046.6, low: 1029.1, close: 1035.2, volume: 1194000 },
            { time: "2026-04-13", open: 1035.2, high: 1049.9, low: 1031.8, close: 1042.35, volume: 1511000 },
          ],
        },
      ],
      fundNavs: [
        ...firstTrustedFundTargets.map((target) => ({
          slug: target.slug,
          source: "provider-delayed-nav-feed",
          sourceCode: "amfi_delayed_nav",
          nav:
            target.slug === "hdfc-mid-cap-opportunities"
              ? 189.44
              : target.slug === "sbi-bluechip-fund"
                ? 79.11
                : 0,
          returns1Y:
            target.slug === "hdfc-mid-cap-opportunities"
              ? 23.6
              : target.slug === "sbi-bluechip-fund"
                ? 18.2
                : undefined,
          navDate: "2026-04-14",
          lastUpdated: "2026-04-14T21:30:00+05:30",
        })),
      ],
      indexSnapshots: [
        {
          slug: "nifty50",
          sourceCode: "nse_index",
          snapshotAt: "2026-04-13T15:25:00+05:30",
          sessionPhase: "Closing push",
          movePercent: 0.33,
          weightedBreadthScore: 0.42,
          advancingCount: 31,
          decliningCount: 19,
          positiveWeightShare: 63.4,
          negativeWeightShare: 36.6,
          marketMood: "Bullish",
          dominanceLabel: "Leaders are in control",
          trendLabel: "Improving through the session",
          components: [
            { symbol: "HDFCBANK", name: "HDFC Bank", weight: 8.4, changePercent: 0.62, contribution: 0.05, signal: "bullish" },
            { symbol: "RELIANCE", name: "Reliance Industries", weight: 9.8, changePercent: 0.45, contribution: 0.04, signal: "bullish" },
            { symbol: "INFY", name: "Infosys", weight: 5.7, changePercent: -0.28, contribution: -0.02, signal: "neutral" },
          ],
        },
        {
          slug: "sensex",
          sourceCode: "bse_sensex",
          snapshotAt: "2026-04-13T15:25:00+05:30",
          sessionPhase: "Closing push",
          movePercent: 0.22,
          weightedBreadthScore: 0.33,
          advancingCount: 18,
          decliningCount: 12,
          positiveWeightShare: 58.2,
          negativeWeightShare: 41.8,
          marketMood: "Mixed",
          dominanceLabel: "Market tug-of-war",
          trendLabel: "Balanced intraday tone",
          components: [
            { symbol: "RELIANCE", name: "Reliance Industries", weight: 11.2, changePercent: 0.53, contribution: 0.06, signal: "bullish" },
            { symbol: "HDFCBANK", name: "HDFC Bank", weight: 10.5, changePercent: 0.66, contribution: 0.07, signal: "bullish" },
            { symbol: "INFY", name: "Infosys", weight: 7.4, changePercent: -0.35, contribution: -0.03, signal: "bearish" },
          ],
        },
        {
          slug: "banknifty",
          sourceCode: "nse_bank_index",
          snapshotAt: "2026-04-13T15:25:00+05:30",
          sessionPhase: "Mid-session balance",
          movePercent: 0.15,
          weightedBreadthScore: 0.23,
          advancingCount: 7,
          decliningCount: 5,
          positiveWeightShare: 56.7,
          negativeWeightShare: 43.3,
          marketMood: "Mixed",
          dominanceLabel: "Market tug-of-war",
          trendLabel: "Balanced intraday tone",
          components: [
            { symbol: "HDFCBANK", name: "HDFC Bank", weight: 28.4, changePercent: 0.64, contribution: 0.18, signal: "bullish" },
            { symbol: "ICICIBANK", name: "ICICI Bank", weight: 23.9, changePercent: 0.58, contribution: 0.14, signal: "bullish" },
            { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", weight: 8.3, changePercent: -0.52, contribution: -0.04, signal: "bearish" },
          ],
        },
        {
          slug: "finnifty",
          sourceCode: "nse_financial_services_index",
          snapshotAt: "2026-04-13T15:25:00+05:30",
          sessionPhase: "Opening drive",
          movePercent: 0.16,
          weightedBreadthScore: 0.25,
          advancingCount: 12,
          decliningCount: 8,
          positiveWeightShare: 59.1,
          negativeWeightShare: 40.9,
          marketMood: "Mixed",
          dominanceLabel: "Market tug-of-war",
          trendLabel: "Improving through the session",
          components: [
            { symbol: "HDFCBANK", name: "HDFC Bank", weight: 17.9, changePercent: 0.61, contribution: 0.11, signal: "bullish" },
            { symbol: "ICICIBANK", name: "ICICI Bank", weight: 14.6, changePercent: 0.47, contribution: 0.07, signal: "bullish" },
            { symbol: "BAJFINANCE", name: "Bajaj Finance", weight: 5.9, changePercent: -0.42, contribution: -0.02, signal: "bearish" },
          ],
        },
      ],
    },
  };
}
