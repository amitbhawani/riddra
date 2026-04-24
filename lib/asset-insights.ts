import { cache } from "react";

import {
  getCanonicalFundCompareHref,
  getCanonicalStockCompareHref,
  describeFundCompareCandidate,
  describeStockCompareCandidate,
  getRankedFundCompareCandidates,
  getRankedStockCompareCandidates,
} from "@/lib/compare-routing";
import { getFundOverlapLens, getFundReturnValue } from "@/lib/fund-research";
import { getFundTruthDetail, getFundTruthLabel, getStockTruthDetail, getStockTruthLabel } from "@/lib/market-truth";
import type { FundSnapshot, StockSnapshot } from "@/lib/mock-data";
import { getFund, getFunds, getStock, getStocks } from "@/lib/content";

export type InsightCard = {
  label: string;
  value: string;
  takeaway: string;
};

export type ComparableAsset = {
  slug: string;
  name: string;
  subLabel: string;
  highlight: string;
};

export type CompareRouteCandidate = {
  targetSlug: string;
  targetName: string;
  targetHref: string;
  href: string;
  subLabel: string;
  highlight: string;
  confidenceLabel?: string;
  matchupLabel?: string;
  rationale: string;
  truthLabel?: string;
  truthDetail?: string;
  metrics?: Array<{ label: string; value: string }>;
  decisionLanes?: string[];
};

function readStockStat(stock: StockSnapshot, label: string) {
  return stock.stats.find((item) => item.label === label)?.value ?? "Pending";
}

function parseMetricNumber(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^\d.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseMarketCapValue(value: string) {
  const normalized = value.replace(/₹|,/g, "").trim().toLowerCase();
  const parsed = Number.parseFloat(normalized.replace(/[^\d.]/g, ""));

  if (!Number.isFinite(parsed)) {
    return null;
  }

  if (normalized.includes("l cr")) {
    return parsed * 100000;
  }

  if (normalized.includes("cr")) {
    return parsed;
  }

  return parsed;
}

function describeDifference(
  candidateName: string,
  candidateValue: string,
  baseName: string,
  baseValue: string,
  label: string,
  options?: { lowerIsBetter?: boolean; neutralCopy?: string },
) {
  const candidateNumeric = parseMetricNumber(candidateValue);
  const baseNumeric = parseMetricNumber(baseValue);

  if (candidateNumeric === null || baseNumeric === null) {
    return options?.neutralCopy ?? `${label} still needs verified context before this matchup can be framed cleanly.`;
  }

  if (candidateNumeric === baseNumeric) {
    return `${label} currently reads almost identical between ${candidateName} and ${baseName}.`;
  }

  const candidateWins = options?.lowerIsBetter ? candidateNumeric < baseNumeric : candidateNumeric > baseNumeric;

  return candidateWins
    ? `${candidateName} currently leads on ${label.toLowerCase()}: ${candidateValue} vs ${baseValue}.`
    : `${candidateName} trails ${baseName} on ${label.toLowerCase()}: ${candidateValue} vs ${baseValue}.`;
}

function buildStockDecisionLanes(base: StockSnapshot, candidate: StockSnapshot) {
  const candidateMarketCap = readStockStat(candidate, "Market Cap");
  const baseMarketCap = readStockStat(base, "Market Cap");
  const candidateMarketCapValue = parseMarketCapValue(candidateMarketCap);
  const baseMarketCapValue = parseMarketCapValue(baseMarketCap);

  return [
    describeDifference(candidate.name, readStockStat(candidate, "ROE"), base.name, readStockStat(base, "ROE"), "Profitability", {
      neutralCopy: "Profitability still needs cleaner source-backed depth before this matchup can claim a clear ROE edge.",
    }),
    describeDifference(
      candidate.name,
      readStockStat(candidate, "Debt / Equity"),
      base.name,
      readStockStat(base, "Debt / Equity"),
      "Balance-sheet comfort",
      {
        lowerIsBetter: true,
        neutralCopy: "Leverage still needs cleaner source-backed depth before this matchup can claim a cleaner balance-sheet edge.",
      },
    ),
    candidateMarketCapValue === null || baseMarketCapValue === null
      ? "Scale still needs verified market-cap context before this route can frame leadership versus challenger posture cleanly."
      : candidateMarketCapValue > baseMarketCapValue
        ? `${candidate.name} brings the larger scale anchor: ${candidateMarketCap} vs ${baseMarketCap}.`
        : `${candidate.name} is the smaller-scale alternative: ${candidateMarketCap} vs ${baseMarketCap}.`,
  ];
}

function buildFundDecisionLanes(base: FundSnapshot, candidate: FundSnapshot) {
  const overlapLens = getFundOverlapLens(base, candidate);

  return [
    describeDifference(candidate.name, candidate.returns1Y, base.name, base.returns1Y, "1Y return", {
      neutralCopy: "Recent-performance context is still too even to create a clean 1Y-return edge.",
    }),
    describeDifference(candidate.name, candidate.expenseRatio, base.name, base.expenseRatio, "Cost drag", {
      lowerIsBetter: true,
      neutralCopy: "Cost posture still needs clearer separation before this route can claim a meaningful expense edge.",
    }),
    overlapLens.sharedHoldingsCount > 0 || overlapLens.sharedSectorWeight !== "0.0%"
      ? `${overlapLens.posture} with ${base.name}: ${overlapLens.sharedHoldingsCount} shared holdings and ${overlapLens.sharedSectorWeight} shared sector weight.`
      : `${candidate.name} offers a genuinely distinct visible portfolio posture against ${base.name}.`,
  ];
}

export function buildStockInsights(stock: StockSnapshot): InsightCard[] {
  return [
    {
      label: "Search demand role",
      value: stock.momentumLabel,
      takeaway: "This helps decide whether the page should be treated as a flagship SEO template or a secondary supporting page.",
    },
    {
      label: "Sector context",
      value: stock.sector,
      takeaway: "Sector-aware clusters will become important for category hubs and compare routes.",
    },
    {
      label: "Content posture",
      value: stock.keyPoints.length > 0 ? "Structured starter content" : "Needs depth",
      takeaway: "This indicates whether the page is moving toward a repeatable publishing standard.",
    },
  ];
}

export function buildFundInsights(fund: FundSnapshot): InsightCard[] {
  return [
    {
      label: "Category",
      value: fund.category,
      takeaway: "Category clarity is critical because fund discovery is often category-led rather than name-led.",
    },
    {
      label: "Investor angle",
      value: fund.returns1Y,
      takeaway: "Quick return snapshots are helpful, but future versions should balance returns with risk and benchmark context.",
    },
    {
      label: "Content posture",
      value: fund.keyPoints.length > 0 ? "Structured starter content" : "Needs depth",
      takeaway: "This shows whether the route is becoming compare-ready and investor-friendly.",
    },
  ];
}

export const getComparableStocks = cache(async (slug: string): Promise<ComparableAsset[]> => {
  const stocks = await getStocks();
  const current = stocks.find((item) => item.slug === slug);

  if (!current) {
    return [];
  }

  return getRankedStockCompareCandidates(stocks, slug, { limit: 3 })
    .map((item) => {
      const meta = describeStockCompareCandidate(current, item);

        return {
        slug: item.slug,
        name: item.name,
        subLabel: item.sector,
        highlight: meta.highlight,
      };
    });
});

export const getComparableFunds = cache(async (slug: string): Promise<ComparableAsset[]> => {
  const funds = await getFunds();
  const current = funds.find((item) => item.slug === slug);

  if (!current) {
    return [];
  }

  return getRankedFundCompareCandidates(funds, slug, { limit: 3 })
    .map((item) => {
      const meta = describeFundCompareCandidate(current, item);

        return {
        slug: item.slug,
        name: item.name,
        subLabel: item.category,
        highlight: meta.highlight,
      };
    });
});

export const getStockComparePair = cache(async (leftSlug: string, rightSlug: string) => {
  const [left, right] = await Promise.all([getStock(leftSlug), getStock(rightSlug)]);
  return left && right ? { left, right } : null;
});

export const getFundComparePair = cache(async (leftSlug: string, rightSlug: string) => {
  const [left, right] = await Promise.all([getFund(leftSlug), getFund(rightSlug)]);
  return left && right ? { left, right } : null;
});

export const getStockCompareCandidates = cache(
  async (
    slug: string,
    options?: {
      excludeSlug?: string;
      limit?: number;
    },
  ): Promise<CompareRouteCandidate[]> => {
    const stocks = await getStocks();
    const current = stocks.find((item) => item.slug === slug);

    if (!current) {
      return [];
    }

    const limit = options?.limit ?? 3;

    return getRankedStockCompareCandidates(stocks, slug, { excludeSlug: options?.excludeSlug, limit })
      .map((candidate) => {
        const meta = describeStockCompareCandidate(current, candidate);
        const href = getCanonicalStockCompareHref(stocks, current.slug, candidate.slug);

        return {
          targetSlug: candidate.slug,
          targetName: candidate.name,
          targetHref: `/stocks/${candidate.slug}`,
          href: href ?? `/compare/stocks/${current.slug}/${candidate.slug}`,
          subLabel: candidate.sector,
          highlight: meta.highlight,
          confidenceLabel: meta.confidenceLabel,
          matchupLabel: meta.matchupLabel,
          rationale: meta.rationale,
          truthLabel: getStockTruthLabel(candidate),
          truthDetail: getStockTruthDetail(candidate),
          metrics: [
            { label: "Match quality", value: meta.confidenceLabel },
            { label: "Matchup type", value: meta.matchupLabel },
            { label: "Market Cap", value: readStockStat(candidate, "Market Cap") },
            { label: "ROE", value: readStockStat(candidate, "ROE") },
            { label: "Debt / Equity", value: readStockStat(candidate, "Debt / Equity") },
          ],
          decisionLanes: buildStockDecisionLanes(current, candidate),
        };
      });
  },
);

export const getFundCompareCandidates = cache(
  async (
    slug: string,
    options?: {
      excludeSlug?: string;
      limit?: number;
    },
  ): Promise<CompareRouteCandidate[]> => {
    const funds = await getFunds();
    const current = funds.find((item) => item.slug === slug);

    if (!current) {
      return [];
    }

    const limit = options?.limit ?? 3;

    return getRankedFundCompareCandidates(funds, slug, { excludeSlug: options?.excludeSlug, limit })
      .map((candidate) => {
        const meta = describeFundCompareCandidate(current, candidate);
        const href = getCanonicalFundCompareHref(funds, current.slug, candidate.slug);

        return {
          targetSlug: candidate.slug,
          targetName: candidate.name,
          targetHref: `/mutual-funds/${candidate.slug}`,
          href: href ?? `/compare/mutual-funds/${current.slug}/${candidate.slug}`,
          subLabel: candidate.category,
          highlight: meta.highlight,
          confidenceLabel: meta.confidenceLabel,
          matchupLabel: meta.matchupLabel,
          rationale: meta.rationale,
          truthLabel: getFundTruthLabel(candidate),
          truthDetail: getFundTruthDetail(candidate),
          metrics: [
            { label: "Match quality", value: meta.confidenceLabel },
            { label: "Matchup type", value: meta.matchupLabel },
            { label: "1Y return", value: candidate.returns1Y },
            { label: "3Y", value: getFundReturnValue(candidate, "3Y CAGR") },
            { label: "Expense ratio", value: candidate.expenseRatio },
            { label: "AUM", value: candidate.aum },
          ],
          decisionLanes: buildFundDecisionLanes(current, candidate),
        };
      });
  },
);

export const getStockCompareCandidate = cache(async (slug: string): Promise<CompareRouteCandidate | null> => {
  const [candidate] = await getStockCompareCandidates(slug, { limit: 1 });
  return candidate ?? null;
});

export const getFundCompareCandidate = cache(async (slug: string): Promise<CompareRouteCandidate | null> => {
  const [candidate] = await getFundCompareCandidates(slug, { limit: 1 });
  return candidate ?? null;
});
