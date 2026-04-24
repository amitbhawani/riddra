import type { ScreenerRow } from "@/lib/screener";
import {
  compactSearchText,
  findFuzzyTokenMatch,
  normalizeSearchText,
  tokenizeSearchText,
} from "@/lib/search-fuzzy";

const stopWords = new Set([
  "a",
  "an",
  "and",
  "best",
  "by",
  "for",
  "how",
  "i",
  "in",
  "is",
  "me",
  "my",
  "of",
  "on",
  "or",
  "show",
  "the",
  "to",
  "what",
  "with",
]);

const compareKeywords = ["compare", "comparison", "peer", "versus", "vs"];
const screenerWorkflowKeywords = [
  "screen",
  "screener",
  "filter",
  "filters",
  "shortlist",
  "ideas",
  "candidates",
  "scan",
];
const truthAliases: Record<ScreenerRow["routeTruthState"], string[]> = {
  delayed_snapshot: ["delayed", "snapshot", "verified"],
  manual_close: ["manual", "managed", "close"],
  seeded: ["seeded", "fallback", "pending"],
};

export type RankedScreenerRow = {
  row: ScreenerRow;
  score: number;
  matchedTerms: string[];
  reason: string;
};

export type ScreenerQueryIntent = {
  kind: "sector" | "metric" | "truth" | "workflow" | "pending";
  label: string;
  detail: string;
};

export type ScreenerQueryResult = {
  matches: RankedScreenerRow[];
  intents: ScreenerQueryIntent[];
};

export type ScreenerTruthFilter =
  | "Verified or managed only"
  | "Delayed snapshots only"
  | "Manual close only"
  | "Seeded metrics only";

export type ScreenerSectorFilter = string;
export const screenerMetricGroupIds = [
  "route-backed-fundamentals",
  "market-snapshot",
  "decision-handoff",
  "pending-metric-lanes",
] as const;
export type ScreenerMetricGroupId = (typeof screenerMetricGroupIds)[number];

export const screenerSortOptions = ["Market cap", "Day move", "ROE", "Debt / Equity", "Name"] as const;
export type ScreenerSortOption = (typeof screenerSortOptions)[number];

export type ScreenerQueryPrefill = {
  searchTerm: string;
  sectorFilter: ScreenerSectorFilter | null;
  truthFilter: ScreenerTruthFilter | null;
  compareOnly: boolean;
  suggestedStack: string | null;
  metricGroup: ScreenerMetricGroupId;
  sortBy: ScreenerSortOption;
  summary: string;
  intents: ScreenerQueryIntent[];
};

const sectorAliases: Array<{ sector: string; aliases: string[]; matchingSectors: string[] }> = [
  {
    sector: "Banking",
    aliases: ["bank", "banks", "banking", "private bank"],
    matchingSectors: ["Banking"],
  },
  {
    sector: "Financials",
    aliases: ["financial", "financials", "finance", "lender", "lenders", "nbfc", "insurance", "insurer", "insurers"],
    matchingSectors: ["Banking", "NBFC", "Financial Services", "Insurance"],
  },
  {
    sector: "Auto",
    aliases: ["auto", "autos", "automobile", "automobiles", "vehicle", "vehicles"],
    matchingSectors: ["Auto"],
  },
  {
    sector: "IT Services",
    aliases: ["it", "tech", "technology", "software", "it services"],
    matchingSectors: ["IT Services"],
  },
  {
    sector: "Pharma",
    aliases: ["pharma", "pharmaceutical", "pharmaceuticals", "healthcare"],
    matchingSectors: ["Pharma"],
  },
  {
    sector: "Consumer",
    aliases: ["consumer", "fmcg", "staples", "defensive"],
    matchingSectors: ["Consumer"],
  },
  {
    sector: "Industrials",
    aliases: ["industrial", "industrials", "capital goods", "infra", "infrastructure"],
    matchingSectors: ["Industrials"],
  },
  {
    sector: "Auto Ancillary",
    aliases: ["auto ancillary", "auto anc", "components", "auto parts"],
    matchingSectors: ["Auto Ancillary"],
  },
];

const metricIntentDefinitions = [
  {
    label: "High ROE",
    detail: "Profitability-first screen",
    aliases: ["high roe", "roe", "profitable", "profitability", "quality"],
    matches: (row: ScreenerRow) => (row.roeValue ?? -Infinity) >= 18,
  },
  {
    label: "Low debt",
    detail: "Balance-sheet comfort",
    aliases: ["low debt", "debt", "low leverage", "leverage", "clean balance sheet"],
    matches: (row: ScreenerRow) => (row.debtEquityValue ?? Infinity) <= 0.4,
  },
  {
    label: "Large cap",
    detail: "Scale and liquidity bias",
    aliases: ["large cap", "largecaps", "big cap", "mega cap", "market cap", "leaders", "blue chip", "bluechip"],
    matches: (row: ScreenerRow) => (row.marketCapValue ?? -Infinity) >= 50000,
  },
  {
    label: "Near highs",
    detail: "Upper-range momentum bias",
    aliases: ["near highs", "near high", "upper range", "breakout", "momentum", "range leader"],
    matches: (row: ScreenerRow) => row.position52W === "Near highs" || row.position52W === "Upper range",
  },
  {
    label: "Positive move",
    detail: "Names participating on the tape",
    aliases: ["gainers", "green", "up today", "positive", "bullish", "rising", "outperforming", "leaders"],
    matches: (row: ScreenerRow) => (row.dayMoveValue ?? -Infinity) > 0,
  },
];

const pendingIntentDefinitions = [
  {
    label: "Valuation lane pending",
    detail: "Valuation screening still needs source-backed PE, PB, and yield ingestion",
    aliases: ["undervalued", "cheap", "valuation", "value", "pe", "p e", "pb", "p b", "price to book", "price earnings"],
  },
  {
    label: "Dividend lane pending",
    detail: "Dividend yield and payout scoring still need source-backed factor ingestion",
    aliases: ["dividend", "yield", "income", "high yield", "dividend yield"],
  },
  {
    label: "Growth lane pending",
    detail: "Growth screening still needs durable sales and profit trend ingestion",
    aliases: ["growth", "sales growth", "profit growth", "earnings growth", "compounder"],
  },
  {
    label: "Ownership lane pending",
    detail: "Ownership trend screening still needs promoter, FII, and DII history ingestion",
    aliases: ["promoter holding", "shareholding", "fii", "dii", "ownership", "institutional"],
  },
  {
    label: "Volume lane pending",
    detail: "Volume and delivery-based screening still need source-backed history ingestion",
    aliases: ["volume", "delivery", "breakout volume", "accumulation"],
  },
] as const;

const truthIntentDefinitions = [
  {
    label: "Verified or managed",
    detail: "Avoid pure seeded rows",
    aliases: ["verified", "managed", "trusted", "route backed"],
    matches: (row: ScreenerRow) => row.routeTruthState !== "seeded",
  },
  {
    label: "Delayed snapshots",
    detail: "Prefer delayed route snapshots",
    aliases: ["delayed", "snapshot", "delayed snapshot"],
    matches: (row: ScreenerRow) => row.routeTruthState === "delayed_snapshot",
  },
  {
    label: "Manual close",
    detail: "Prefer source-entry managed rows",
    aliases: ["manual", "manual close", "managed close", "source entry"],
    matches: (row: ScreenerRow) => row.routeTruthState === "manual_close",
  },
  {
    label: "Seeded only",
    detail: "Review fallback coverage routes",
    aliases: ["seeded", "fallback", "pending metrics"],
    matches: (row: ScreenerRow) => row.routeTruthState === "seeded",
  },
];

function tokenize(value: string) {
  return tokenizeSearchText(value, stopWords);
}

function containsPhrase(haystack: string, needle: string) {
  return ` ${haystack} `.includes(` ${needle} `);
}

export function getScreenerSectorMatches(filter: ScreenerSectorFilter, availableSectors: string[]) {
  const exactMatch = availableSectors.find((sector) => sector === filter);

  if (exactMatch) {
    return [exactMatch];
  }

  const thematicMatch = sectorAliases.find((entry) => entry.sector === filter);

  if (!thematicMatch) {
    return [];
  }

  return thematicMatch.matchingSectors.filter((sector) => availableSectors.includes(sector));
}

export function getScreenerSectorFilterOptions(availableSectors: string[]) {
  const exactSectors = [...availableSectors].sort((left, right) => left.localeCompare(right));
  const thematicFilters = sectorAliases
    .filter((entry) => entry.matchingSectors.some((sector) => availableSectors.includes(sector)))
    .map((entry) => entry.sector)
    .filter((sector, index, allSectors) => allSectors.indexOf(sector) === index && !exactSectors.includes(sector));

  return ["All sectors", ...thematicFilters, ...exactSectors];
}

export function doesRowMatchScreenerSectorFilter(
  row: Pick<ScreenerRow, "sector">,
  filter: ScreenerSectorFilter,
  availableSectors: string[],
) {
  const matchedSectors = getScreenerSectorMatches(filter, availableSectors);

  if (matchedSectors.length === 0) {
    return row.sector === filter;
  }

  return matchedSectors.includes(row.sector);
}

export function detectScreenerQueryIntents(query: string): ScreenerQueryIntent[] {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return [];
  }

  const intents: ScreenerQueryIntent[] = [];

  for (const entry of sectorAliases) {
    if (entry.aliases.some((alias) => containsPhrase(normalizedQuery, normalizeSearchText(alias)))) {
      intents.push({
        kind: "sector",
        label: entry.sector,
        detail: "Sector intent detected from the query",
      });
    }
  }

  for (const entry of metricIntentDefinitions) {
    if (entry.aliases.some((alias) => containsPhrase(normalizedQuery, normalizeSearchText(alias)))) {
      intents.push({
        kind: "metric",
        label: entry.label,
        detail: entry.detail,
      });
    }
  }

  for (const entry of truthIntentDefinitions) {
    if (entry.aliases.some((alias) => containsPhrase(normalizedQuery, normalizeSearchText(alias)))) {
      intents.push({
        kind: "truth",
        label: entry.label,
        detail: entry.detail,
      });
    }
  }

  for (const entry of pendingIntentDefinitions) {
    if (entry.aliases.some((alias) => containsPhrase(normalizedQuery, normalizeSearchText(alias)))) {
      intents.push({
        kind: "pending",
        label: entry.label,
        detail: entry.detail,
      });
    }
  }

  if (compareKeywords.some((keyword) => containsPhrase(normalizedQuery, keyword))) {
    intents.push({
      kind: "workflow",
      label: "Compare-ready",
      detail: "The query is asking for a peer handoff",
    });
  }

  if (screenerWorkflowKeywords.some((keyword) => containsPhrase(normalizedQuery, keyword))) {
    intents.push({
      kind: "workflow",
      label: "Screener-ready",
      detail: "The query is asking for a filterable shortlist workflow",
    });
  }

  return intents.filter(
    (intent, index, all) => all.findIndex((item) => item.kind === intent.kind && item.label === intent.label) === index,
  );
}

function mapTruthIntentToFilter(label: string): ScreenerTruthFilter | null {
  switch (label) {
    case "Verified or managed":
      return "Verified or managed only";
    case "Delayed snapshots":
      return "Delayed snapshots only";
    case "Manual close":
      return "Manual close only";
    case "Seeded only":
      return "Seeded metrics only";
    default:
      return null;
  }
}

function getSuggestedStack(intents: ScreenerQueryIntent[]) {
  const labels = new Set(intents.map((intent) => intent.label));

  if (labels.has("Banking") && labels.has("High ROE") && labels.has("Positive move")) {
    return "Banking leaders";
  }

  if (labels.has("Banking") && labels.has("High ROE")) {
    return "Banking quality";
  }

  if (labels.has("Near highs") && labels.has("Positive move")) {
    return "Range leaders";
  }

  if (labels.has("High ROE") && labels.has("Low debt")) {
    return "Quality balance sheets";
  }

  return null;
}

function buildIntentSummary(intents: ScreenerQueryIntent[]) {
  if (intents.length === 0) {
    return "Use the route-backed stock screener when the query sounds broader than one company page.";
  }

  const pendingIntents = intents.filter((intent) => intent.kind === "pending");
  const activeIntents = intents.filter((intent) => intent.kind !== "pending");

  if (
    activeIntents.some((intent) => intent.kind === "workflow" && intent.label === "Screener-ready") &&
    activeIntents.every((intent) => intent.kind === "workflow")
  ) {
    return "Prefill the screener as a shortlist workflow so the first view behaves more like a filterable idea board than a static result list.";
  }

  if (pendingIntents.length > 0 && activeIntents.length === 0) {
    return "Use the route-backed screener as a shortlist first. The query asks for factor lanes that are still pending deeper source-backed ingestion.";
  }

  if (pendingIntents.length > 0 && activeIntents.length > 0) {
    return "Prefill the screener around the route-backed parts of the query while keeping unsupported factor lanes explicit until deeper metric ingestion lands.";
  }

  if (activeIntents.some((intent) => intent.kind === "sector" && intent.label === "Banking")) {
    const hasHighRoe = activeIntents.some((intent) => intent.kind === "metric" && intent.label === "High ROE");
    const hasLowDebt = activeIntents.some((intent) => intent.kind === "metric" && intent.label === "Low debt");

    if (hasHighRoe && hasLowDebt) {
      return "Prefill the screener around banking profitability and scale, but do not force a generic debt-to-equity rule because lender leverage is not comparable to non-financial sectors.";
    }
  }

  const labels = activeIntents.map((intent) => intent.label.toLowerCase());

  if (labels.length === 1) {
    return `Prefill the screener around ${labels[0]} so the first view reflects the query intent immediately.`;
  }

  if (labels.length === 2) {
    return `Prefill the screener around ${labels[0]} plus ${labels[1]} so the first view reflects the query intent immediately.`;
  }

  return `Prefill the screener around ${labels.slice(0, 3).join(", ")} so the first view reflects the query intent immediately.`;
}

export function buildScreenerQueryPrefill(query: string): ScreenerQueryPrefill {
  const intents = detectScreenerQueryIntents(query);
  const sectorIntent = intents.find((intent) => intent.kind === "sector");
  const truthIntent = intents.find((intent) => intent.kind === "truth");
  const compareOnly = intents.some((intent) => intent.kind === "workflow" && intent.label === "Compare-ready");
  const labels = new Set(intents.map((intent) => intent.label));
  const hasPendingIntent = intents.some((intent) => intent.kind === "pending");
  const hasMomentumIntent = labels.has("Near highs") || labels.has("Positive move");
  const hasRoeIntent = labels.has("High ROE");
  const hasDebtIntent = labels.has("Low debt");

  let metricGroup: ScreenerMetricGroupId = "route-backed-fundamentals";

  if (hasPendingIntent) {
    metricGroup = "pending-metric-lanes";
  } else if (compareOnly) {
    metricGroup = "decision-handoff";
  } else if (hasMomentumIntent) {
    metricGroup = "market-snapshot";
  }

  let sortBy: ScreenerSortOption = "Market cap";

  if (hasMomentumIntent) {
    sortBy = "Day move";
  } else if (hasRoeIntent) {
    sortBy = "ROE";
  } else if (hasDebtIntent && !hasRoeIntent) {
    sortBy = "Debt / Equity";
  }

  return {
    searchTerm: query.trim(),
    sectorFilter: sectorIntent?.label ?? null,
    truthFilter: truthIntent ? mapTruthIntentToFilter(truthIntent.label) : null,
    compareOnly,
    suggestedStack: getSuggestedStack(intents),
    metricGroup,
    sortBy,
    summary: buildIntentSummary(intents),
    intents,
  };
}

function buildSearchBody(row: ScreenerRow) {
  return normalizeSearchText(
    [
      row.name,
      row.symbol,
      row.sector,
      row.routeState,
      row.truthLabel,
      row.truthDetail,
      row.rationale,
      row.tags.join(" "),
      row.compareLabel ?? "",
      row.compareHighlight ?? "",
      row.compareRationale ?? "",
      row.position52W,
    ].join(" "),
  );
}

function buildReason(options: {
  exactSymbol: boolean;
  exactName: boolean;
  queryHasCompareIntent: boolean;
  row: ScreenerRow;
  matchedTerms: string[];
}) {
  if (options.exactSymbol) {
    return `Exact ticker match on ${options.row.symbol}.`;
  }

  if (options.exactName) {
    return `Exact company-name match for ${options.row.name}.`;
  }

  if (options.queryHasCompareIntent && options.row.compareHref) {
    return `${options.row.name} stays near the top because the query implies a compare handoff and this route is compare-ready.`;
  }

  if (options.matchedTerms.length > 0) {
    return `Matched ${options.matchedTerms.slice(0, 3).join(", ")} across the route-backed stock record.`;
  }

  return `Matched ${options.row.name} from the current screener query.`;
}

function scoreRow(row: ScreenerRow, query: string): RankedScreenerRow | null {
  const normalizedQuery = normalizeSearchText(query);
  const compactQuery = compactSearchText(query);
  const queryTokens = tokenize(query);
  const intents = detectScreenerQueryIntents(query);

  if (!normalizedQuery) {
    return null;
  }

  const normalizedName = normalizeSearchText(row.name);
  const normalizedSymbol = normalizeSearchText(row.symbol);
  const normalizedSector = normalizeSearchText(row.sector);
  const normalizedBody = buildSearchBody(row);
  const compactName = compactSearchText(row.name);
  const compactBody = compactSearchText(
    [
      row.name,
      row.symbol,
      row.sector,
      row.tags.join(" "),
      row.compareLabel ?? "",
      row.compareHighlight ?? "",
    ].join(" "),
  );
  const bodyTokens = new Set(tokenize(normalizedBody));
  const nameTokens = new Set(tokenize(row.name));
  const sectorTokens = new Set(tokenize(row.sector));
  const tagTokens = new Set(row.tags.flatMap((tag) => tokenize(tag)));
  const matchedTerms = new Set<string>();
  const queryHasCompareIntent = compareKeywords.some((keyword) => containsPhrase(normalizedQuery, keyword));
  const exactSymbol = normalizedSymbol === normalizedQuery;
  const exactName = normalizedName === normalizedQuery;
  let score = 0;

  if (exactSymbol) {
    score += 320;
    matchedTerms.add(row.symbol);
  } else if (normalizedSymbol.startsWith(normalizedQuery)) {
    score += 180;
    matchedTerms.add(row.symbol);
  }

  if (exactName) {
    score += 280;
    matchedTerms.add(row.name);
  } else if (normalizedName.startsWith(normalizedQuery)) {
    score += 160;
    matchedTerms.add(row.name);
  }

  if (normalizedBody.includes(normalizedQuery)) {
    score += 150;
  } else if (compactQuery.length >= 4 && (compactName.includes(compactQuery) || compactBody.includes(compactQuery))) {
    score += 118;
  }

  if (normalizedSector === normalizedQuery) {
    score += 120;
    matchedTerms.add(row.sector);
  }

  for (const token of queryTokens) {
    if (containsPhrase(normalizedSymbol, token)) {
      score += 60;
      matchedTerms.add(token);
      continue;
    }

    if (containsPhrase(normalizedName, token)) {
      score += 42;
      matchedTerms.add(token);
      continue;
    }

    if (containsPhrase(normalizedSector, token)) {
      score += 24;
      matchedTerms.add(token);
      continue;
    }

    if (row.tags.some((tag) => containsPhrase(normalizeSearchText(tag), token))) {
      score += 18;
      matchedTerms.add(token);
      continue;
    }

    if (containsPhrase(normalizedBody, token)) {
      score += 12;
      matchedTerms.add(token);
      continue;
    }

    const fuzzyNameMatch = findFuzzyTokenMatch(token, nameTokens);
    if (fuzzyNameMatch) {
      score += 20;
      matchedTerms.add(fuzzyNameMatch);
      continue;
    }

    const fuzzySectorMatch = findFuzzyTokenMatch(token, sectorTokens);
    if (fuzzySectorMatch) {
      score += 16;
      matchedTerms.add(fuzzySectorMatch);
      continue;
    }

    const fuzzyTagMatch = findFuzzyTokenMatch(token, tagTokens);
    if (fuzzyTagMatch) {
      score += 12;
      matchedTerms.add(fuzzyTagMatch);
      continue;
    }

    const fuzzyBodyMatch = findFuzzyTokenMatch(token, bodyTokens);
    if (fuzzyBodyMatch) {
      score += 8;
      matchedTerms.add(fuzzyBodyMatch);
    }
  }

  if (queryHasCompareIntent && row.compareHref) {
    score += 42;
    matchedTerms.add("compare");
  }

  for (const intent of intents) {
    if (intent.kind === "sector" && intent.label === row.sector) {
      score += 54;
      matchedTerms.add(intent.label);
    }

    if (intent.kind === "metric") {
      const definition = metricIntentDefinitions.find((item) => item.label === intent.label);
      if (definition?.matches(row)) {
        score += 36;
        matchedTerms.add(intent.label.toLowerCase());
      }
    }

    if (intent.kind === "truth") {
      const definition = truthIntentDefinitions.find((item) => item.label === intent.label);
      if (definition?.matches(row)) {
        score += 26;
        matchedTerms.add(intent.label.toLowerCase());
      }
    }

    if (intent.kind === "workflow" && intent.label === "Compare-ready" && row.compareHref) {
      score += 30;
      matchedTerms.add("compare-ready");
    }
  }

  for (const alias of truthAliases[row.routeTruthState]) {
    if (containsPhrase(normalizedQuery, alias)) {
      score += 18;
      matchedTerms.add(alias);
    }
  }

  if (score <= 0) {
    return null;
  }

  return {
    row,
    score,
    matchedTerms: [...matchedTerms].slice(0, 4),
    reason: buildReason({
      exactSymbol,
      exactName,
      queryHasCompareIntent,
      row,
      matchedTerms: [...matchedTerms],
    }),
  };
}

export function rankScreenerRows(rows: ScreenerRow[], query: string) {
  const intents = detectScreenerQueryIntents(query);
  const matches = rows
    .map((row) => scoreRow(row, query))
    .filter((item): item is RankedScreenerRow => Boolean(item))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.row.name.localeCompare(right.row.name);
    });

  return {
    matches,
    intents,
  } satisfies ScreenerQueryResult;
}
