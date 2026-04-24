import type { FundSnapshot, StockSnapshot } from "@/lib/mock-data";

type ComparePair<T> = {
  left: T;
  right: T;
};

export type CompareRecommendationMeta = {
  highlight: string;
  rationale: string;
  confidenceLabel: string;
  matchupLabel: string;
  truthLabel: string;
};

type CanonicalComparePair = {
  leftSlug: string;
  rightSlug: string;
};

const stockSectorFamilies: Record<string, string> = {
  banking: "financials",
  nbfc: "financials",
  "financial services": "financials",
  auto: "autos",
  "auto ancillary": "autos",
  consumer: "consumer",
  retail: "consumer",
  energy: "energy",
  power: "energy",
  metals: "materials",
  cement: "materials",
  pharma: "healthcare",
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

function normalizeLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function readFundReturn(fund: FundSnapshot, targetLabel: string) {
  const normalizedTarget = normalizeLabel(targetLabel);
  const match =
    fund.returnsTable.find((item) => normalizeLabel(item.label) === normalizedTarget) ??
    fund.returnsTable.find((item) => normalizeLabel(item.label).startsWith(normalizedTarget));

  return match?.value ?? "Pending";
}

function getMarketCapBucket(value: string) {
  const parsed = parseMarketCap(value);

  if (parsed === null) {
    return "unknown";
  }

  if (parsed >= 500000) {
    return "mega cap";
  }

  if (parsed >= 100000) {
    return "large cap";
  }

  if (parsed >= 20000) {
    return "mid cap";
  }

  return "small cap";
}

function getSectorFamily(sector: string) {
  return stockSectorFamilies[sector.trim().toLowerCase()] ?? sector.trim().toLowerCase();
}

function getStockTruthScore(stock: StockSnapshot) {
  if (stock.snapshotMeta?.mode === "delayed_snapshot") {
    return 36;
  }

  if (stock.snapshotMeta?.mode === "manual_close") {
    return 18;
  }

  return 0;
}

function getFundTruthScore(fund: FundSnapshot) {
  if (fund.snapshotMeta?.mode === "delayed_snapshot") {
    return 36;
  }

  if (fund.snapshotMeta?.mode === "manual_nav") {
    return 18;
  }

  return 0;
}

function getStockTruthLabel(stock: StockSnapshot) {
  if (stock.snapshotMeta?.mode === "delayed_snapshot") {
    return "Delayed snapshot";
  }

  if (stock.snapshotMeta?.mode === "manual_close") {
    return "Managed last close";
  }

  return "Seeded context";
}

function getFundTruthLabel(fund: FundSnapshot) {
  if (fund.snapshotMeta?.mode === "delayed_snapshot") {
    return "Delayed snapshot";
  }

  if (fund.snapshotMeta?.mode === "manual_nav") {
    return "Managed NAV";
  }

  return "Seeded context";
}

function compareCanonicalOrder(
  leftSlug: string,
  leftScore: number,
  leftName: string,
  rightSlug: string,
  rightScore: number,
  rightName: string,
): CanonicalComparePair {
  if (rightScore > leftScore) {
    return { leftSlug: rightSlug, rightSlug: leftSlug };
  }

  if (leftScore > rightScore) {
    return { leftSlug, rightSlug };
  }

  if (leftName.localeCompare(rightName) <= 0) {
    return { leftSlug, rightSlug };
  }

  return { leftSlug: rightSlug, rightSlug: leftSlug };
}

function getStockConfidenceLabel(base: StockSnapshot, candidate: StockSnapshot) {
  const relationship = getStockRelationship(base, candidate);
  const sameBucket = getMarketCapBucket(readStockStat(base, "Market Cap")) === getMarketCapBucket(readStockStat(candidate, "Market Cap"));
  const truthScore = getStockTruthScore(candidate);

  if (relationship === "same_sector" && sameBucket && truthScore >= 18) {
    return "High-confidence peer";
  }

  if (relationship === "same_sector" || relationship === "adjacent_sector") {
    return truthScore >= 18 ? "Strong compare handoff" : "Good compare handoff";
  }

  return "Fallback proxy";
}

function getFundConfidenceLabel(base: FundSnapshot, candidate: FundSnapshot) {
  const relationship = getFundRelationship(base, candidate);
  const truthScore = getFundTruthScore(candidate);

  if (relationship === "same_category" && truthScore >= 18) {
    return "High-confidence peer";
  }

  if (relationship === "same_category" || relationship === "shared_benchmark") {
    return truthScore >= 18 ? "Strong compare handoff" : "Good compare handoff";
  }

  return "Fallback proxy";
}

function getStockRelationship(base: StockSnapshot, candidate: StockSnapshot) {
  if (base.sector === candidate.sector) {
    return "same_sector";
  }

  if (getSectorFamily(base.sector) === getSectorFamily(candidate.sector)) {
    return "adjacent_sector";
  }

  return "cross_sector";
}

function getFundRelationship(base: FundSnapshot, candidate: FundSnapshot) {
  if (base.category === candidate.category) {
    return "same_category";
  }

  if (base.benchmark === candidate.benchmark) {
    return "shared_benchmark";
  }

  return "cross_category";
}

function readStockStat(stock: StockSnapshot, label: string) {
  return stock.stats.find((item) => item.label === label)?.value ?? "";
}

function scoreNumericCloseness(left: number | null, right: number | null, maxPoints: number) {
  if (left === null || right === null) {
    return 0;
  }

  const largest = Math.max(Math.abs(left), Math.abs(right), 1);
  const gap = Math.abs(left - right) / largest;
  return Math.max(0, maxPoints - gap * maxPoints);
}

function scoreStockCandidate(base: StockSnapshot, candidate: StockSnapshot) {
  let score = 0;
  const relationship = getStockRelationship(base, candidate);

  if (relationship === "same_sector") {
    score += 220;
  } else if (relationship === "adjacent_sector") {
    score += 90;
  } else {
    score -= 140;
  }

  score += scoreNumericCloseness(
    parseMarketCap(readStockStat(base, "Market Cap")),
    parseMarketCap(readStockStat(candidate, "Market Cap")),
    64,
  );
  score += scoreNumericCloseness(
    parsePercent(readStockStat(base, "ROE")),
    parsePercent(readStockStat(candidate, "ROE")),
    24,
  );
  score += scoreNumericCloseness(
    parseRatio(readStockStat(base, "Debt / Equity")),
    parseRatio(readStockStat(candidate, "Debt / Equity")),
    20,
  );
  score += scoreNumericCloseness(parsePercent(base.change), parsePercent(candidate.change), 10);

  if (getMarketCapBucket(readStockStat(base, "Market Cap")) === getMarketCapBucket(readStockStat(candidate, "Market Cap"))) {
    score += 18;
  }

  score += getStockTruthScore(candidate);

  return score;
}

function scoreFundCandidate(base: FundSnapshot, candidate: FundSnapshot) {
  let score = 0;
  const relationship = getFundRelationship(base, candidate);

  if (relationship === "same_category") {
    score += 240;
  } else if (relationship === "shared_benchmark") {
    score += 80;
  } else {
    score -= 180;
  }

  if (base.benchmark === candidate.benchmark) {
    score += 34;
  }

  if (base.riskLabel === candidate.riskLabel) {
    score += 24;
  }

  score += scoreNumericCloseness(parsePercent(base.returns1Y), parsePercent(candidate.returns1Y), 24);
  score += scoreNumericCloseness(parsePercent(readFundReturn(base, "3Y")), parsePercent(readFundReturn(candidate, "3Y")), 20);
  score += scoreNumericCloseness(parsePercent(base.expenseRatio), parsePercent(candidate.expenseRatio), 18);
  score += scoreNumericCloseness(parseMarketCap(base.aum), parseMarketCap(candidate.aum), 18);
  score += getFundTruthScore(candidate);

  return score;
}

export function describeStockCompareCandidate(base: StockSnapshot, candidate: StockSnapshot): CompareRecommendationMeta {
  const relationship = getStockRelationship(base, candidate);
  const sameBucket = getMarketCapBucket(readStockStat(base, "Market Cap")) === getMarketCapBucket(readStockStat(candidate, "Market Cap"));
  const confidenceLabel = getStockConfidenceLabel(base, candidate);
  const truthLabel = getStockTruthLabel(candidate);

  if (relationship === "same_sector") {
    return {
      highlight: sameBucket ? `${base.sector} peer` : `${base.sector} matchup`,
      rationale: sameBucket
        ? `Best when you want a like-for-like ${base.sector.toLowerCase()} comparison with similar scale, cleaner peer framing, and ${truthLabel.toLowerCase()} on the candidate route.`
        : `Best when you want a same-sector read before widening into broader market comparisons, with ${truthLabel.toLowerCase()} carrying through on the candidate route.`,
      confidenceLabel,
      matchupLabel: sameBucket ? "Like-for-like sector peer" : "Same-sector compare",
      truthLabel,
    };
  }

  if (relationship === "adjacent_sector") {
    return {
      highlight: "Adjacent peer set",
      rationale:
        `Best when you want a close business-model comparison across adjacent sectors without falling into an unrelated cross-market matchup, while keeping ${truthLabel.toLowerCase()} visible on the candidate route.`,
      confidenceLabel,
      matchupLabel: "Adjacent-sector compare",
      truthLabel,
    };
  }

  return {
    highlight: "Broader market proxy",
    rationale:
      `Use this only when the sector bench is still thin and you need the nearest scale-and-quality proxy rather than a true same-sector peer. The candidate currently carries ${truthLabel.toLowerCase()}.`,
    confidenceLabel,
    matchupLabel: "Cross-sector fallback",
    truthLabel,
  };
}

export function describeFundCompareCandidate(base: FundSnapshot, candidate: FundSnapshot): CompareRecommendationMeta {
  const relationship = getFundRelationship(base, candidate);
  const confidenceLabel = getFundConfidenceLabel(base, candidate);
  const truthLabel = getFundTruthLabel(candidate);

  if (relationship === "same_category") {
    return {
      highlight: "Category peer",
      rationale:
        `Best when you want a true allocator comparison on category fit, cost, benchmark posture, and return consistency, with ${truthLabel.toLowerCase()} on the candidate route.`,
      confidenceLabel,
      matchupLabel: "Same-category compare",
      truthLabel,
    };
  }

  if (relationship === "shared_benchmark") {
    return {
      highlight: "Benchmark proxy",
      rationale:
        `Useful when category coverage is still thin but you want two funds tied to the same benchmark posture before opening a broader shortlist, with ${truthLabel.toLowerCase()} still visible on the candidate route.`,
      confidenceLabel,
      matchupLabel: "Shared-benchmark compare",
      truthLabel,
    };
  }

  return {
    highlight: "Broader allocator proxy",
    rationale:
      `Use this only as a fallback while the seeded fund bench grows; it is a looser compare route than a same-category shortlist, and the candidate currently carries ${truthLabel.toLowerCase()}.`,
    confidenceLabel,
    matchupLabel: "Cross-category fallback",
    truthLabel,
  };
}

export function getRankedStockCompareCandidates(
  stocks: StockSnapshot[],
  slug: string,
  options?: {
    excludeSlug?: string;
    limit?: number;
  },
) {
  const current = stocks.find((item) => item.slug === slug);

  if (!current) {
    return [];
  }

  const limit = options?.limit ?? 3;

  return stocks
    .filter((item) => item.slug !== current.slug && item.slug !== options?.excludeSlug)
    .map((candidate) => ({
      candidate,
      score: scoreStockCandidate(current, candidate),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.candidate.name.localeCompare(right.candidate.name);
    })
    .slice(0, limit)
    .map((item) => item.candidate);
}

export function getRankedFundCompareCandidates(
  funds: FundSnapshot[],
  slug: string,
  options?: {
    excludeSlug?: string;
    limit?: number;
  },
) {
  const current = funds.find((item) => item.slug === slug);

  if (!current) {
    return [];
  }

  const limit = options?.limit ?? 3;

  return funds
    .filter((item) => item.slug !== current.slug && item.slug !== options?.excludeSlug)
    .map((candidate) => ({
      candidate,
      score: scoreFundCandidate(current, candidate),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.candidate.name.localeCompare(right.candidate.name);
    })
    .slice(0, limit)
    .map((item) => item.candidate);
}

export function getPreferredStockComparePairs(stocks: StockSnapshot[], limitPerStock = 1): ComparePair<StockSnapshot>[] {
  const seenPairs = new Set<string>();
  const pairs: Array<ComparePair<StockSnapshot> & { score: number }> = [];

  for (const stock of stocks) {
    const matches = getRankedStockCompareCandidates(stocks, stock.slug, { limit: limitPerStock });

    for (const candidate of matches) {
      const pairKey = [stock.slug, candidate.slug].sort().join(":");

      if (seenPairs.has(pairKey)) {
        continue;
      }

      seenPairs.add(pairKey);
      pairs.push({
        left: stock,
        right: candidate,
        score: scoreStockCandidate(stock, candidate) + getStockShowcaseScore(stock, stocks) + getStockShowcaseScore(candidate, stocks),
      });
    }
  }

  return pairs
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return `${left.left.name} ${left.right.name}`.localeCompare(`${right.left.name} ${right.right.name}`);
    })
    .map(({ left, right }) => ({ left, right }));
}

export function getPreferredFundComparePairs(funds: FundSnapshot[], limitPerFund = 1): ComparePair<FundSnapshot>[] {
  const seenPairs = new Set<string>();
  const pairs: Array<ComparePair<FundSnapshot> & { score: number }> = [];

  for (const fund of funds) {
    const matches = getRankedFundCompareCandidates(funds, fund.slug, { limit: limitPerFund });

    for (const candidate of matches) {
      const pairKey = [fund.slug, candidate.slug].sort().join(":");

      if (seenPairs.has(pairKey)) {
        continue;
      }

      seenPairs.add(pairKey);
      pairs.push({
        left: fund,
        right: candidate,
        score: scoreFundCandidate(fund, candidate) + getFundShowcaseScore(fund, funds) + getFundShowcaseScore(candidate, funds),
      });
    }
  }

  return pairs
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return `${left.left.name} ${left.right.name}`.localeCompare(`${right.left.name} ${right.right.name}`);
    })
    .map(({ left, right }) => ({ left, right }));
}

export function getCanonicalStockComparePair(stocks: StockSnapshot[], leftSlug: string, rightSlug: string): CanonicalComparePair | null {
  const left = stocks.find((item) => item.slug === leftSlug);
  const right = stocks.find((item) => item.slug === rightSlug);

  if (!left || !right || left.slug === right.slug) {
    return null;
  }

  return compareCanonicalOrder(
    left.slug,
    getStockShowcaseScore(left, stocks) + scoreStockCandidate(left, right),
    left.name,
    right.slug,
    getStockShowcaseScore(right, stocks) + scoreStockCandidate(right, left),
    right.name,
  );
}

export function getCanonicalFundComparePair(funds: FundSnapshot[], leftSlug: string, rightSlug: string): CanonicalComparePair | null {
  const left = funds.find((item) => item.slug === leftSlug);
  const right = funds.find((item) => item.slug === rightSlug);

  if (!left || !right || left.slug === right.slug) {
    return null;
  }

  return compareCanonicalOrder(
    left.slug,
    getFundShowcaseScore(left, funds) + scoreFundCandidate(left, right),
    left.name,
    right.slug,
    getFundShowcaseScore(right, funds) + scoreFundCandidate(right, left),
    right.name,
  );
}

export function getCanonicalStockCompareHref(stocks: StockSnapshot[], leftSlug: string, rightSlug: string) {
  const canonicalPair = getCanonicalStockComparePair(stocks, leftSlug, rightSlug);

  return canonicalPair
    ? `/compare/stocks/${canonicalPair.leftSlug}/${canonicalPair.rightSlug}`
    : null;
}

export function getCanonicalFundCompareHref(funds: FundSnapshot[], leftSlug: string, rightSlug: string) {
  const canonicalPair = getCanonicalFundComparePair(funds, leftSlug, rightSlug);

  return canonicalPair
    ? `/compare/mutual-funds/${canonicalPair.leftSlug}/${canonicalPair.rightSlug}`
    : null;
}

function getStockShowcaseScore(stock: StockSnapshot, stocks: StockSnapshot[]) {
  const topCompareCandidate = getRankedStockCompareCandidates(stocks, stock.slug, { limit: 1 })[0] ?? null;
  const roe = parsePercent(readStockStat(stock, "ROE")) ?? 0;
  const dayMove = parsePercent(stock.change) ?? 0;
  const marketCap = parseMarketCap(readStockStat(stock, "Market Cap")) ?? 0;
  const sizeScore = marketCap > 0 ? Math.log10(marketCap + 1) * 10 : 0;

  return (
    getStockTruthScore(stock) * 4 +
    sizeScore +
    Math.max(roe, 0) +
    Math.max(dayMove, 0) * 3 +
    (topCompareCandidate ? 36 + getStockTruthScore(topCompareCandidate) : 0)
  );
}

function getFundShowcaseScore(fund: FundSnapshot, funds: FundSnapshot[]) {
  const topCompareCandidate = getRankedFundCompareCandidates(funds, fund.slug, { limit: 1 })[0] ?? null;
  const returns1Y = parsePercent(fund.returns1Y) ?? 0;
  const expenseRatio = parsePercent(fund.expenseRatio);
  const aum = parseMarketCap(fund.aum) ?? 0;
  const sizeScore = aum > 0 ? Math.log10(aum + 1) * 10 : 0;
  const factsheetScore = fund.factsheetMeta ? 24 : 0;
  const costScore = expenseRatio !== null ? Math.max(0, 3 - expenseRatio) * 8 : 0;

  return (
    getFundTruthScore(fund) * 4 +
    factsheetScore +
    sizeScore +
    Math.max(returns1Y, 0) * 2 +
    costScore +
    (topCompareCandidate ? 36 + getFundTruthScore(topCompareCandidate) : 0)
  );
}

export function getPreferredStockShowcaseRoutes(stocks: StockSnapshot[], limit = 3) {
  return [...stocks]
    .sort((left, right) => {
      const rightScore = getStockShowcaseScore(right, stocks);
      const leftScore = getStockShowcaseScore(left, stocks);

      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, limit);
}

export function getPreferredFundShowcaseRoutes(funds: FundSnapshot[], limit = 3) {
  return [...funds]
    .sort((left, right) => {
      const rightScore = getFundShowcaseScore(right, funds);
      const leftScore = getFundShowcaseScore(left, funds);

      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, limit);
}
