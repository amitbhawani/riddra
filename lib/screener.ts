import {
  describeStockCompareCandidate,
  getCanonicalStockCompareHref,
  getRankedStockCompareCandidates,
} from "@/lib/compare-routing";
import type { StockSnapshot } from "@/lib/mock-data";

export type ScreenerRow = {
  id: string;
  name: string;
  symbol: string;
  slug: string;
  sector: string;
  stockHref: string;
  chartHref: string;
  cmp: string;
  dayMove: string;
  roe: string;
  debtEquity: string;
  marketCap: string;
  routeState: string;
  position52W: string;
  tags: string[];
  truthLabel: string;
  truthDetail: string;
  rationale: string;
  compareHref: string | null;
  compareLabel: string | null;
  compareHighlight: string | null;
  compareRationale: string | null;
  cmpValue: number | null;
  dayMoveValue: number | null;
  roeValue: number | null;
  debtEquityValue: number | null;
  marketCapValue: number | null;
  routeTruthState: "delayed_snapshot" | "manual_close" | "seeded";
};

function parseMarketCap(value: string) {
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

function parsePercent(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^\d.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRatio(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^\d.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanPublicMetricValue(value: string) {
  return /^awaiting verified/i.test(value.trim()) ? "Not available yet" : value;
}

function parseRangePosition(rangeValue: string, priceValue: string) {
  const numbers = rangeValue.match(/[\d,.]+/g);

  if (!numbers || numbers.length < 2) {
    return "Range context pending";
  }

  const low = Number.parseFloat(numbers[0].replace(/,/g, ""));
  const high = Number.parseFloat(numbers[1].replace(/,/g, ""));

  if (!Number.isFinite(low) || !Number.isFinite(high) || high <= low) {
    return "Range context pending";
  }

  const spread = high - low;
  const current = Number.parseFloat(priceValue.replace(/[^\d.+-]/g, ""));

  if (!Number.isFinite(current)) {
    return "Range context pending";
  }

  const distanceFromHigh = (high - current) / spread;

  if (distanceFromHigh <= 0.18) {
    return "Near highs";
  }

  if (distanceFromHigh <= 0.35) {
    return "Upper range";
  }

  if (distanceFromHigh >= 0.82) {
    return "Near lows";
  }

  return "Mid range";
}

function buildTags(stock: StockSnapshot) {
  const roe = parsePercent(stock.stats.find((item) => item.label === "ROE")?.value ?? "");
  const debtEquity = parseRatio(stock.stats.find((item) => item.label === "Debt / Equity")?.value ?? "");
  const dayMove = parsePercent(stock.change);
  const marketCap = parseMarketCap(stock.stats.find((item) => item.label === "Market Cap")?.value ?? "");
  const rangePosition = parseRangePosition(
    stock.stats.find((item) => item.label === "52W Range")?.value ?? "",
    stock.price,
  );
  const tags: string[] = [];

  if (roe !== null && roe > 18) {
    tags.push("ROE > 18%");
  }

  if (roe !== null && roe > 15) {
    tags.push("ROE > 15%");
  }

  if (debtEquity !== null && debtEquity < 0.4) {
    tags.push("Debt / Equity < 0.4");
  }

  if (marketCap !== null && marketCap >= 50000) {
    tags.push("Market Cap > ₹50,000 Cr");
  }

  if (dayMove !== null && dayMove > 0) {
    tags.push("Price move > 0%");
  }

  if (rangePosition === "Near highs" || rangePosition === "Upper range") {
    tags.push("Upper range or near highs");
  }

  tags.push(`Sector: ${stock.sector}`);

  return Array.from(new Set(tags));
}

function buildRationale(stock: StockSnapshot) {
  const firstPoint = stock.keyPoints[0] ?? stock.summary;
  return firstPoint.replace(/\.$/, "");
}

export function buildScreenerRows(stocks: StockSnapshot[]): ScreenerRow[] {
  return [...stocks]
    .sort((left, right) => {
      const leftCap = parseMarketCap(left.stats.find((item) => item.label === "Market Cap")?.value ?? "") ?? -1;
      const rightCap = parseMarketCap(right.stats.find((item) => item.label === "Market Cap")?.value ?? "") ?? -1;

      if (rightCap !== leftCap) {
        return rightCap - leftCap;
      }

      return left.name.localeCompare(right.name);
    })
    .map((stock, _index, orderedStocks) => {
      const roe = cleanPublicMetricValue(stock.stats.find((item) => item.label === "ROE")?.value ?? "Pending");
      const debtEquity = cleanPublicMetricValue(stock.stats.find((item) => item.label === "Debt / Equity")?.value ?? "Pending");
      const marketCap = cleanPublicMetricValue(stock.stats.find((item) => item.label === "Market Cap")?.value ?? "Pending");
      const position52W = parseRangePosition(
        stock.stats.find((item) => item.label === "52W Range")?.value ?? "",
        stock.price,
      );
      const compareCandidate = getRankedStockCompareCandidates(orderedStocks, stock.slug, { limit: 1 })[0] ?? null;
      const compareMeta = compareCandidate ? describeStockCompareCandidate(stock, compareCandidate) : null;
      const compareHref = compareCandidate ? getCanonicalStockCompareHref(orderedStocks, stock.slug, compareCandidate.slug) : null;

      return {
        id: `${stock.slug}-screener`,
        name: stock.name,
        symbol: stock.symbol,
        slug: stock.slug,
        sector: stock.sector,
        stockHref: `/stocks/${stock.slug}`,
        chartHref: `/stocks/${stock.slug}/chart`,
        cmp: stock.price,
        dayMove: stock.change,
        roe,
        debtEquity,
        marketCap,
        routeState:
          stock.snapshotMeta?.mode === "delayed_snapshot"
            ? "Delayed route snapshot"
            : stock.snapshotMeta?.mode === "manual_close"
              ? "Manual last-close route"
              : "Seeded route context",
        position52W,
        tags: buildTags(stock),
        truthLabel:
          stock.snapshotMeta?.mode === "delayed_snapshot"
            ? "Canonical route with delayed snapshot"
            : stock.snapshotMeta?.mode === "manual_close"
              ? "Canonical route with manual last close"
              : "Canonical route with seeded metrics",
        truthDetail:
          stock.snapshotMeta?.marketDetail ??
          (stock.snapshotMeta?.mode === "delayed_snapshot"
            ? "Delayed quote coverage is active on the canonical stock route."
            : stock.snapshotMeta?.mode === "manual_close"
              ? "The stock route is using a manually managed last-close snapshot until verified market writes take over."
              : "The stock route is live, but market metrics still rely on seeded fallback context while verified writes are pending."),
        rationale: buildRationale(stock),
        compareHref,
        compareLabel: compareCandidate ? `Compare with ${compareCandidate.name}` : null,
        compareHighlight: compareMeta?.highlight ?? null,
        compareRationale: compareMeta?.rationale ?? null,
        cmpValue: parseRatio(stock.price),
        dayMoveValue: parsePercent(stock.change),
        roeValue: parsePercent(roe),
        debtEquityValue: parseRatio(debtEquity),
        marketCapValue: parseMarketCap(marketCap),
        routeTruthState:
          stock.snapshotMeta?.mode === "delayed_snapshot"
            ? "delayed_snapshot"
            : stock.snapshotMeta?.mode === "manual_close"
              ? "manual_close"
              : "seeded",
      };
    });
}
