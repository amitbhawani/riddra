import { cache } from "react";

import type { BenchmarkHistoryEntry } from "@/lib/benchmark-history-store";
import { getIndexSnapshotPresentation } from "@/lib/market-session";

export type IndexComponent = {
  symbol: string;
  name: string;
  weight: number;
  changePercent: number;
  contribution: number;
  signal: "bullish" | "bearish" | "neutral";
};

export type IndexSnapshot = {
  slug: "nifty50" | "banknifty" | "finnifty" | "sensex";
  title: string;
  shortName: string;
  sourceCode: string;
  lastUpdated: string;
  movePercent: number;
  weightedBreadthScore: number;
  breadthLabel: string;
  marketMood: "Bullish" | "Bearish" | "Mixed";
  advancingCount: number;
  decliningCount: number;
  positiveWeightShare: number;
  negativeWeightShare: number;
  dominanceLabel: string;
  trendLabel: string;
  sessionPhase: "Opening drive" | "Mid-session balance" | "Closing push";
  dataMode: "verified" | "seeded" | "manual";
  marketLabel: string;
  marketDetail: string;
  narrative: string;
  topPullers: IndexComponent[];
  topDraggers: IndexComponent[];
  timeline: IndexTimelinePoint[];
  historyBars?: BenchmarkHistoryEntry[];
  components: IndexComponent[];
  compositionMeta?: {
    sourceLabel: string;
    sourceDate: string;
    referenceUrl?: string;
    visibleCount: number;
    indexSize?: number;
    coveredWeightShare: number;
    concentrationLabel: string;
    concentrationSummary: string;
  };
  officialSyncNote: string;
};

export type IndexTimelinePoint = {
  timeLabel: string;
  weightedBreadthScore: number;
  marketMood: "Bullish" | "Bearish" | "Mixed";
  movePercent: number;
};

function computeContribution(weight: number, changePercent: number) {
  return Number(((weight * changePercent) / 100).toFixed(2));
}

function signalFromChange(changePercent: number): IndexComponent["signal"] {
  if (changePercent > 0.3) return "bullish";
  if (changePercent < -0.3) return "bearish";
  return "neutral";
}

function summarizeMood(score: number): IndexSnapshot["marketMood"] {
  if (score >= 0.45) return "Bullish";
  if (score <= -0.45) return "Bearish";
  return "Mixed";
}

function summarizeBreadth(score: number) {
  if (score >= 0.45) return "Broad-based strength";
  if (score <= -0.45) return "Broad-based weakness";
  return "Mixed breadth";
}

function summarizeDominance(positiveWeightShare: number, negativeWeightShare: number) {
  if (positiveWeightShare >= 60) return "Leaders are in control";
  if (negativeWeightShare >= 60) return "Draggers are dominating";
  return "Market tug-of-war";
}

function summarizeTrend(timeline: IndexTimelinePoint[]) {
  const first = timeline[0];
  const last = timeline[timeline.length - 1];

  if (!first || !last) return "Flat intraday tone";

  const delta = Number((last.weightedBreadthScore - first.weightedBreadthScore).toFixed(2));

  if (delta >= 0.25) return "Improving through the session";
  if (delta <= -0.25) return "Weakening through the session";
  return "Balanced intraday tone";
}

function makeIndexSnapshot(input: {
  slug: IndexSnapshot["slug"];
  title: string;
  shortName: string;
  sourceCode: string;
  lastUpdated: string;
  components: Array<{ symbol: string; name: string; weight: number; changePercent: number }>;
  timeline: Array<{ timeLabel: string; weightedBreadthScore: number; movePercent: number }>;
  sessionPhase: IndexSnapshot["sessionPhase"];
  narrative: string;
}): IndexSnapshot {
  const marketPresentation = getIndexSnapshotPresentation("seeded");
  const components = input.components.map((item) => ({
    ...item,
    contribution: computeContribution(item.weight, item.changePercent),
    signal: signalFromChange(item.changePercent),
  }));

  const weightedBreadthScore = Number(
    components.reduce((sum, item) => sum + item.contribution, 0).toFixed(2),
  );
  const movePercent = Number(
    (
      components.reduce((sum, item) => sum + item.changePercent * item.weight, 0) /
      components.reduce((sum, item) => sum + item.weight, 0)
    ).toFixed(2),
  );
  const advancingCount = components.filter((item) => item.changePercent > 0).length;
  const decliningCount = components.filter((item) => item.changePercent < 0).length;
  const positiveWeightShare = Number(
    components
      .filter((item) => item.changePercent > 0)
      .reduce((sum, item) => sum + item.weight, 0)
      .toFixed(2),
  );
  const negativeWeightShare = Number(
    components
      .filter((item) => item.changePercent < 0)
      .reduce((sum, item) => sum + item.weight, 0)
      .toFixed(2),
  );
  const topPullers = [...components]
    .filter((item) => item.contribution > 0)
    .sort((left, right) => right.contribution - left.contribution)
    .slice(0, 3);
  const topDraggers = [...components]
    .filter((item) => item.contribution < 0)
    .sort((left, right) => left.contribution - right.contribution)
    .slice(0, 3);
  const timeline = input.timeline.map((point) => ({
    ...point,
    marketMood: summarizeMood(point.weightedBreadthScore),
  }));

  return {
    slug: input.slug,
    title: input.title,
    shortName: input.shortName,
    sourceCode: input.sourceCode,
    lastUpdated: input.lastUpdated,
    movePercent,
    weightedBreadthScore,
    breadthLabel: summarizeBreadth(weightedBreadthScore),
    marketMood: summarizeMood(weightedBreadthScore),
    advancingCount,
    decliningCount,
    positiveWeightShare,
    negativeWeightShare,
    dominanceLabel: summarizeDominance(positiveWeightShare, negativeWeightShare),
    trendLabel: summarizeTrend(timeline),
    sessionPhase: input.sessionPhase,
    dataMode: "seeded",
    marketLabel: marketPresentation.marketLabel,
    marketDetail: marketPresentation.marketDetail,
    narrative: input.narrative,
    topPullers,
    topDraggers,
    timeline,
    components,
    officialSyncNote:
      "Component weights and direction should be reviewed against the official index source every trading day before the verified public layer is treated as authoritative.",
  };
}

const snapshots: IndexSnapshot[] = [
  makeIndexSnapshot({
    slug: "nifty50",
    title: "Nifty 50",
    shortName: "Nifty50",
    sourceCode: "nse_index",
    lastUpdated: "Official factsheet · Mar 30, 2026",
    sessionPhase: "Closing push",
    narrative:
      "This page tracks whether heavyweight Nifty 50 constituents are broadly supporting or dragging the index, with the seeded reference weights refreshed to the latest official factsheet profile.",
    timeline: [
      { timeLabel: "09:20", weightedBreadthScore: 0.11, movePercent: 0.08 },
      { timeLabel: "10:05", weightedBreadthScore: 0.24, movePercent: 0.15 },
      { timeLabel: "11:10", weightedBreadthScore: 0.38, movePercent: 0.23 },
      { timeLabel: "12:20", weightedBreadthScore: 0.21, movePercent: 0.14 },
      { timeLabel: "13:35", weightedBreadthScore: 0.33, movePercent: 0.2 },
      { timeLabel: "15:10", weightedBreadthScore: 0.42, movePercent: 0.27 },
    ],
    components: [
      { symbol: "HDFCBANK", name: "HDFC Bank", weight: 10.94, changePercent: 0.62 },
      { symbol: "RELIANCE", name: "Reliance Industries", weight: 8.87, changePercent: 0.45 },
      { symbol: "ICICIBANK", name: "ICICI Bank", weight: 8.42, changePercent: 0.41 },
      { symbol: "BHARTIARTL", name: "Bharti Airtel", weight: 5.34, changePercent: 0.81 },
      { symbol: "INFY", name: "Infosys", weight: 4.28, changePercent: -0.28 },
      { symbol: "TCS", name: "TCS", weight: 4.11, changePercent: -0.18 },
      { symbol: "LT", name: "Larsen & Toubro", weight: 4.02, changePercent: 0.54 },
      { symbol: "SBIN", name: "State Bank of India", weight: 3.97, changePercent: 0.37 },
      { symbol: "AXISBANK", name: "Axis Bank", weight: 3.26, changePercent: -0.33 },
      { symbol: "HCLTECH", name: "HCLTech", weight: 3.01, changePercent: 0.24 },
      { symbol: "BAJFINANCE", name: "Bajaj Finance", weight: 2.92, changePercent: -0.42 },
      { symbol: "ITC", name: "ITC", weight: 2.71, changePercent: -0.14 },
      { symbol: "M&M", name: "Mahindra & Mahindra", weight: 2.58, changePercent: 0.43 },
      { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", weight: 2.44, changePercent: -0.46 },
      { symbol: "MARUTI", name: "Maruti Suzuki", weight: 2.37, changePercent: 0.37 },
      { symbol: "HINDUNILVR", name: "Hindustan Unilever", weight: 2.31, changePercent: 0.18 },
      { symbol: "SUNPHARMA", name: "Sun Pharma", weight: 2.19, changePercent: 0.31 },
      { symbol: "TATAMOTORS", name: "Tata Motors", weight: 2.14, changePercent: 0.74 },
      { symbol: "ULTRACEMCO", name: "UltraTech Cement", weight: 1.95, changePercent: 0.28 },
      { symbol: "NTPC", name: "NTPC", weight: 1.88, changePercent: 0.26 },
      { symbol: "POWERGRID", name: "Power Grid", weight: 1.74, changePercent: -0.07 },
      { symbol: "NESTLEIND", name: "Nestle India", weight: 1.58, changePercent: 0.14 },
      { symbol: "TECHM", name: "Tech Mahindra", weight: 1.42, changePercent: -0.25 },
      { symbol: "TATASTEEL", name: "Tata Steel", weight: 1.38, changePercent: -0.33 },
      { symbol: "ASIANPAINT", name: "Asian Paints", weight: 1.34, changePercent: -0.19 },
      { symbol: "BAJAJFINSV", name: "Bajaj Finserv", weight: 1.31, changePercent: -0.18 },
      { symbol: "BAJAJ-AUTO", name: "Bajaj Auto", weight: 1.26, changePercent: 0.22 },
      { symbol: "ONGC", name: "ONGC", weight: 1.13, changePercent: 0.34 },
      { symbol: "TITAN", name: "Titan", weight: 1.12, changePercent: 0.16 },
      { symbol: "ADANIENT", name: "Adani Enterprises", weight: 1.09, changePercent: 0.48 },
      { symbol: "TRENT", name: "Trent", weight: 1.05, changePercent: 0.63 },
      { symbol: "TATACONSUM", name: "Tata Consumer", weight: 0.98, changePercent: 0.18 },
      { symbol: "BEL", name: "Bharat Electronics", weight: 0.96, changePercent: 0.42 },
      { symbol: "GRASIM", name: "Grasim Industries", weight: 0.94, changePercent: -0.05 },
      { symbol: "CIPLA", name: "Cipla", weight: 0.91, changePercent: 0.27 },
      { symbol: "JSWSTEEL", name: "JSW Steel", weight: 0.89, changePercent: -0.16 },
      { symbol: "HDFCLIFE", name: "HDFC Life", weight: 0.86, changePercent: 0.55 },
      { symbol: "DRREDDY", name: "Dr Reddy's", weight: 0.83, changePercent: -0.13 },
      { symbol: "EICHERMOT", name: "Eicher Motors", weight: 0.79, changePercent: 0.21 },
      { symbol: "ADANIPORTS", name: "Adani Ports", weight: 0.77, changePercent: 0.35 },
      { symbol: "BRITANNIA", name: "Britannia", weight: 0.74, changePercent: 0.12 },
      { symbol: "COALINDIA", name: "Coal India", weight: 0.72, changePercent: 0.19 },
      { symbol: "SHRIRAMFIN", name: "Shriram Finance", weight: 0.7, changePercent: 0.44 },
      { symbol: "INDUSINDBK", name: "IndusInd Bank", weight: 0.68, changePercent: -0.74 },
      { symbol: "HEROMOTOCO", name: "Hero MotoCorp", weight: 0.66, changePercent: 0.15 },
      { symbol: "APOLLOHOSP", name: "Apollo Hospitals", weight: 0.64, changePercent: 0.29 },
      { symbol: "JIOFIN", name: "Jio Financial Services", weight: 0.62, changePercent: -0.09 },
      { symbol: "SBILIFE", name: "SBI Life", weight: 0.59, changePercent: -0.21 },
      { symbol: "HINDALCO", name: "Hindalco", weight: 0.58, changePercent: 0.17 },
      { symbol: "DIVISLAB", name: "Divi's Laboratories", weight: 0.51, changePercent: -0.08 },
    ],
  }),
  makeIndexSnapshot({
    slug: "banknifty",
    title: "Bank Nifty",
    shortName: "BankNifty",
    sourceCode: "nse_bank_index",
    lastUpdated: "Official factsheet · Mar 30, 2026",
    sessionPhase: "Closing push",
    narrative:
      "Bank Nifty intelligence should help identify whether the index mood is being carried by a few heavyweight banks or supported by broad banking participation, with reference weights refreshed to the latest official factsheet profile.",
    timeline: [
      { timeLabel: "09:20", weightedBreadthScore: 0.09, movePercent: 0.07 },
      { timeLabel: "10:05", weightedBreadthScore: 0.31, movePercent: 0.22 },
      { timeLabel: "11:10", weightedBreadthScore: 0.43, movePercent: 0.31 },
      { timeLabel: "12:20", weightedBreadthScore: 0.18, movePercent: 0.13 },
      { timeLabel: "13:35", weightedBreadthScore: 0.27, movePercent: 0.18 },
      { timeLabel: "15:10", weightedBreadthScore: 0.36, movePercent: 0.24 },
    ],
    components: [
      { symbol: "HDFCBANK", name: "HDFC Bank", weight: 19.01, changePercent: 0.64 },
      { symbol: "ICICIBANK", name: "ICICI Bank", weight: 14.11, changePercent: 0.58 },
      { symbol: "AXISBANK", name: "Axis Bank", weight: 10.01, changePercent: 0.44 },
      { symbol: "SBIN", name: "State Bank of India", weight: 9.94, changePercent: -0.31 },
      { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", weight: 9.73, changePercent: -0.52 },
      { symbol: "FEDERALBNK", name: "Federal Bank", weight: 6.18, changePercent: -0.18 },
      { symbol: "INDUSINDBK", name: "IndusInd Bank", weight: 4.8, changePercent: -0.74 },
      { symbol: "AUBANK", name: "AU Small Finance Bank", weight: 4.49, changePercent: 0.41 },
      { symbol: "BANKBARODA", name: "Bank of Baroda", weight: 4.45, changePercent: 0.29 },
      { symbol: "CANBK", name: "Canara Bank", weight: 4.06, changePercent: 0.21 },
      { symbol: "PNB", name: "Punjab National Bank", weight: 3.97, changePercent: -0.22 },
      { symbol: "IDFCFIRSTB", name: "IDFC First Bank", weight: 3.55, changePercent: 0.35 },
    ],
  }),
  makeIndexSnapshot({
    slug: "finnifty",
    title: "Fin Nifty",
    shortName: "FinNifty",
    sourceCode: "nse_financial_services_index",
    lastUpdated: "Official factsheet · Mar 30, 2026",
    sessionPhase: "Closing push",
    narrative:
      "Fin Nifty should help users understand whether financial-services sentiment is broad and stable or overly dependent on a handful of banks and lenders, with reference weights refreshed to the latest official factsheet profile.",
    timeline: [
      { timeLabel: "09:20", weightedBreadthScore: 0.05, movePercent: 0.04 },
      { timeLabel: "10:05", weightedBreadthScore: 0.12, movePercent: 0.08 },
      { timeLabel: "11:10", weightedBreadthScore: 0.18, movePercent: 0.11 },
      { timeLabel: "12:20", weightedBreadthScore: 0.14, movePercent: 0.09 },
      { timeLabel: "13:35", weightedBreadthScore: 0.23, movePercent: 0.15 },
      { timeLabel: "15:10", weightedBreadthScore: 0.29, movePercent: 0.19 },
    ],
    components: [
      { symbol: "HDFCBANK", name: "HDFC Bank", weight: 18.92, changePercent: 0.61 },
      { symbol: "ICICIBANK", name: "ICICI Bank", weight: 14.05, changePercent: 0.47 },
      { symbol: "AXISBANK", name: "Axis Bank", weight: 10.0, changePercent: 0.39 },
      { symbol: "SBIN", name: "State Bank of India", weight: 9.89, changePercent: 0.33 },
      { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", weight: 9.31, changePercent: -0.36 },
      { symbol: "BAJFINANCE", name: "Bajaj Finance", weight: 7.67, changePercent: -0.42 },
      { symbol: "SHRIRAMFIN", name: "Shriram Finance", weight: 4.37, changePercent: 0.44 },
      { symbol: "BSE", name: "BSE Ltd", weight: 3.92, changePercent: 0.52 },
      { symbol: "BAJAJFINSV", name: "Bajaj Finserv", weight: 3.37, changePercent: -0.18 },
      { symbol: "SBILIFE", name: "SBI Life Insurance", weight: 2.86, changePercent: -0.21 },
      { symbol: "HDFCLIFE", name: "HDFC Life", weight: 2.68, changePercent: 0.55 },
      { symbol: "ICICIPRULI", name: "ICICI Prudential Life", weight: 2.34, changePercent: -0.16 },
      { symbol: "PFC", name: "Power Finance Corp", weight: 2.29, changePercent: 0.24 },
      { symbol: "RECLTD", name: "REC", weight: 2.17, changePercent: 0.19 },
      { symbol: "JIOFIN", name: "Jio Financial Services", weight: 2.11, changePercent: -0.09 },
      { symbol: "CHOLAFIN", name: "Cholamandalam Finance", weight: 1.97, changePercent: 0.28 },
      { symbol: "MUTHOOTFIN", name: "Muthoot Finance", weight: 1.83, changePercent: 0.17 },
      { symbol: "MCX", name: "MCX", weight: 1.52, changePercent: 0.31 },
      { symbol: "LICHSGFIN", name: "LIC Housing Finance", weight: 1.34, changePercent: 0.11 },
      { symbol: "LICI", name: "LIC", weight: 1.18, changePercent: -0.07 },
    ],
  }),
  makeIndexSnapshot({
    slug: "sensex",
    title: "Sensex",
    shortName: "Sensex",
    sourceCode: "bse_sensex",
    lastUpdated: "Official factsheet · Apr 30, 2025",
    sessionPhase: "Closing push",
    narrative:
      "Sensex pages should show whether the day is being shaped by concentrated heavyweight moves or by broader participation across the 30 index constituents, with seeded reference weights refreshed to the latest official factsheet profile.",
    timeline: [
      { timeLabel: "09:20", weightedBreadthScore: 0.03, movePercent: 0.02 },
      { timeLabel: "10:05", weightedBreadthScore: 0.14, movePercent: 0.09 },
      { timeLabel: "11:10", weightedBreadthScore: 0.11, movePercent: 0.08 },
      { timeLabel: "12:20", weightedBreadthScore: 0.22, movePercent: 0.15 },
      { timeLabel: "13:35", weightedBreadthScore: 0.28, movePercent: 0.19 },
      { timeLabel: "15:10", weightedBreadthScore: 0.35, movePercent: 0.24 },
    ],
    components: [
      { symbol: "HDFCBANK", name: "HDFC Bank", weight: 15.66, changePercent: 0.66 },
      { symbol: "ICICIBANK", name: "ICICI Bank", weight: 10.88, changePercent: 0.38 },
      { symbol: "RELIANCE", name: "Reliance Industries", weight: 10.24, changePercent: 0.53 },
      { symbol: "INFY", name: "Infosys", weight: 5.75, changePercent: -0.35 },
      { symbol: "BHARTIARTL", name: "Bharti Airtel", weight: 5.37, changePercent: 0.59 },
      { symbol: "ITC", name: "ITC", weight: 4.23, changePercent: 0.22 },
      { symbol: "LT", name: "Larsen & Toubro", weight: 4.2, changePercent: 0.72 },
      { symbol: "TCS", name: "TCS", weight: 3.74, changePercent: -0.18 },
      { symbol: "AXISBANK", name: "Axis Bank", weight: 3.63, changePercent: -0.26 },
      { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", weight: 3.49, changePercent: -0.44 },
      { symbol: "MARUTI", name: "Maruti Suzuki", weight: 3.18, changePercent: 0.37 },
      { symbol: "SUNPHARMA", name: "Sun Pharma", weight: 2.98, changePercent: 0.31 },
      { symbol: "SBIN", name: "State Bank of India", weight: 2.91, changePercent: 0.29 },
      { symbol: "M&M", name: "Mahindra & Mahindra", weight: 2.74, changePercent: 0.43 },
      { symbol: "HINDUNILVR", name: "Hindustan Unilever", weight: 2.62, changePercent: 0.18 },
      { symbol: "NTPC", name: "NTPC", weight: 2.49, changePercent: 0.26 },
      { symbol: "POWERGRID", name: "Power Grid", weight: 2.36, changePercent: -0.07 },
      { symbol: "HCLTECH", name: "HCLTech", weight: 2.24, changePercent: 0.24 },
      { symbol: "TECHM", name: "Tech Mahindra", weight: 2.11, changePercent: -0.25 },
      { symbol: "TITAN", name: "Titan", weight: 1.98, changePercent: 0.16 },
      { symbol: "ULTRACEMCO", name: "UltraTech Cement", weight: 1.92, changePercent: 0.28 },
      { symbol: "ASIANPAINT", name: "Asian Paints", weight: 1.87, changePercent: -0.19 },
      { symbol: "BAJFINANCE", name: "Bajaj Finance", weight: 1.74, changePercent: -0.42 },
      { symbol: "BAJAJFINSV", name: "Bajaj Finserv", weight: 1.58, changePercent: -0.18 },
      { symbol: "NESTLEIND", name: "Nestle India", weight: 1.49, changePercent: 0.14 },
      { symbol: "TATASTEEL", name: "Tata Steel", weight: 1.35, changePercent: -0.33 },
      { symbol: "INDUSINDBK", name: "IndusInd Bank", weight: 1.22, changePercent: -0.74 },
      { symbol: "ADANIPORTS", name: "Adani Ports", weight: 1.14, changePercent: 0.35 },
      { symbol: "TATAMOTORS", name: "Tata Motors", weight: 1.07, changePercent: 0.74 },
      { symbol: "ETERNAL", name: "Eternal", weight: 0.96, changePercent: 0.52 },
    ],
  }),
];

export const getIndexSnapshots = cache(async () => snapshots);

export const getIndexSnapshot = cache(async (slug: string) => {
  return snapshots.find((item) => item.slug === slug) ?? null;
});
