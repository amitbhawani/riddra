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

const tokenAliases: Record<string, string[]> = {
  chart: ["chart", "charts", "price", "candles", "technical", "ohlcv"],
  compare: ["compare", "comparison", "vs", "versus", "peer", "against", "better", "between"],
  fund: ["fund", "mutual", "sip", "nav", "benchmark", "expense", "holdings", "allocation", "factsheet"],
  etf: ["etf", "etfs", "exchange", "passive", "tracking", "liquidity", "ter"],
  pms: ["pms", "portfolio", "management", "service", "manager", "ticket", "mandate"],
  aif: ["aif", "alternative", "category", "private", "vintage", "drawdown"],
  sif: ["sif", "specialized", "structured", "income", "allocation", "newage"],
  wealth: ["wealth", "etf", "pms", "aif", "sif", "allocation", "ticket", "liquidity", "taxation"],
  passive: ["passive", "index", "tracker", "benchmark", "lowcost"],
  tax: ["tax", "saver", "saving", "elss", "80c", "lockin"],
  hybrid: ["hybrid", "balanced", "advantage", "allocation", "dynamic"],
  debt: ["debt", "bond", "income", "duration", "accrual"],
  ipo: ["ipo", "gmp", "allotment", "listing"],
  calculator: ["calculator", "tool", "planner"],
  screener: ["screener", "screen", "filters", "stocks"],
  stock: ["stock", "stocks", "share", "shares", "equity"],
  ownership: ["ownership", "promoter", "promoters", "fii", "fiis", "dii", "diis", "shareholding"],
  holdings: ["holdings", "portfolio", "overlap", "allocation", "sector"],
  returns: ["returns", "return", "cagr", "performance", "nav"],
  risk: ["risk", "volatility", "drawdown", "defensive"],
  benchmark: ["benchmark", "index", "nifty", "sensex"],
  tracker: ["tracker", "index", "breadth", "heatmap", "pullers", "draggers", "market", "mood"],
  breadth: ["breadth", "advance", "decline", "advancers", "decliners", "market", "mood", "tracker"],
  index: ["index", "indices", "tracker", "benchmark", "breadth", "heatmap", "pullers", "draggers"],
  bank: ["bank", "banks", "banking", "banknifty", "nifty bank"],
  financial: ["financial", "finance", "financials", "finnifty", "fin nifty"],
};

export type SearchRankable = {
  title: string;
  query: string;
  category?: string;
};

export type RankedSearchEntry<T> = {
  entry: T;
  score: number;
  matchedTerms: string[];
};

function tokenize(value: string) {
  return tokenizeSearchText(value, stopWords);
}

function buildTokenSet(value: string) {
  return new Set(tokenize(value));
}

function getExpandedTokens(tokens: string[]) {
  const expanded = new Set<string>();

  for (const token of tokens) {
    expanded.add(token);

    for (const alias of tokenAliases[token] ?? []) {
      expanded.add(alias);
    }
  }

  return [...expanded];
}

function scoreEntry(query: string, entry: SearchRankable) {
  const normalizedQuery = normalizeSearchText(query);
  const compactQuery = compactSearchText(query);
  const queryTokens = tokenize(query);

  if (!normalizedQuery || queryTokens.length === 0) {
    return null;
  }

  const normalizedTitle = normalizeSearchText(entry.title);
  const normalizedCategory = normalizeSearchText(entry.category ?? "");
  const normalizedBody = normalizeSearchText(`${entry.title} ${entry.query} ${entry.category ?? ""}`);
  const compactTitle = compactSearchText(entry.title);
  const compactBody = compactSearchText(`${entry.title} ${entry.query} ${entry.category ?? ""}`);
  const titleTokens = buildTokenSet(entry.title);
  const categoryTokens = buildTokenSet(entry.category ?? "");
  const bodyTokens = buildTokenSet(`${entry.title} ${entry.query} ${entry.category ?? ""}`);
  const expandedTokens = getExpandedTokens(queryTokens);
  const matchedTerms = new Set<string>();
  let score = 0;

  if (normalizedTitle === normalizedQuery) {
    score += 260;
  } else if (normalizedBody.includes(normalizedQuery)) {
    score += 180;
  } else if (compactQuery.length >= 4 && (compactTitle.includes(compactQuery) || compactBody.includes(compactQuery))) {
    score += 150;
  }

  if (normalizedTitle.startsWith(normalizedQuery)) {
    score += 70;
  } else if (compactQuery.length >= 4 && compactTitle.startsWith(compactQuery)) {
    score += 54;
  }

  for (const token of queryTokens) {
    if (titleTokens.has(token)) {
      score += 34;
      matchedTerms.add(token);
      continue;
    }

    if (bodyTokens.has(token)) {
      score += 20;
      matchedTerms.add(token);
      continue;
    }

    const fuzzyTitleMatch = findFuzzyTokenMatch(token, titleTokens);
    if (fuzzyTitleMatch) {
      score += 18;
      matchedTerms.add(fuzzyTitleMatch);
      continue;
    }

    const fuzzyBodyMatch = findFuzzyTokenMatch(token, bodyTokens);
    if (fuzzyBodyMatch) {
      score += 11;
      matchedTerms.add(fuzzyBodyMatch);
    }
  }

  for (const token of expandedTokens) {
    if (matchedTerms.has(token)) {
      continue;
    }

    if (categoryTokens.has(token)) {
      score += 12;
      matchedTerms.add(token);
      continue;
    }

    if (bodyTokens.has(token)) {
      score += 8;
      matchedTerms.add(token);
    }
  }

  const coverage = queryTokens.filter((token) => matchedTerms.has(token)).length / queryTokens.length;
  score += coverage * 120;

  if (
    queryTokens.some((token) => tokenAliases.compare?.includes(token) || token === "compare") &&
    normalizedCategory.includes("compare")
  ) {
    score += 44;
  }

  if (queryTokens.some((token) => token === "chart") && normalizedCategory.includes("chart")) {
    score += 40;
  }

  if (
    queryTokens.some(
      (token) =>
        tokenAliases.index?.includes(token) ||
        tokenAliases.tracker?.includes(token) ||
        tokenAliases.breadth?.includes(token) ||
        token === "index" ||
        token === "tracker" ||
        token === "breadth",
    ) &&
    normalizedCategory.includes("index")
  ) {
    score += 38;
  }

  if (queryTokens.some((token) => token === "fund") && normalizedCategory.includes("mutual")) {
    score += 28;
  }

  if (queryTokens.some((token) => token === "ipo") && normalizedCategory.includes("ipo")) {
    score += 28;
  }

  if (
    queryTokens.some((token) => ["etf", "pms", "aif", "sif", "wealth"].includes(token)) &&
    ["etf", "pms", "aif", "sif"].some((token) => normalizedCategory.includes(token))
  ) {
    score += 30;
  }

  return score > 0
    ? {
        score,
        matchedTerms: [...matchedTerms].slice(0, 4),
      }
    : null;
}

export function rankSearchEntries<T extends SearchRankable>(query: string, entries: T[], limit: number) {
  return entries
    .map<RankedSearchEntry<T> | null>((entry) => {
      const ranked = scoreEntry(query, entry);

      if (!ranked) {
        return null;
      }

      return {
        entry,
        score: ranked.score,
        matchedTerms: ranked.matchedTerms,
      };
    })
    .filter((item): item is RankedSearchEntry<T> => Boolean(item))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.entry.title.localeCompare(right.entry.title);
    })
    .slice(0, limit);
}
