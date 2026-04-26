import { getFunds, getIpos, getStocks } from "@/lib/content";
import { getStockSectorHubs } from "@/lib/hubs";
import { getIndexSnapshots } from "@/lib/index-content";
import { getPublishableCmsRecords } from "@/lib/publishable-content";
import type {
  MarketNewsAiRewritePayload,
  MarketNewsMatchedEntity,
  MarketNewsRawItemRecord,
} from "@/lib/market-news/types";
import { normalizeWhitespace } from "@/lib/market-news/normalizers";

type StockCatalogEntry = {
  slug: string;
  name: string;
  symbol: string;
  sectorSlug: string | null;
};

type FundCatalogEntry = {
  slug: string;
  name: string;
};

type IpoCatalogEntry = {
  slug: string;
  name: string;
};

type SectorCatalogEntry = {
  slug: string;
  name: string;
};

type IndexCatalogEntry = {
  slug: string;
  title: string;
  shortName: string;
};

type EtfCatalogEntry = {
  slug: string;
  title: string;
};

type MatchAccumulator = {
  entityType: MarketNewsMatchedEntity["entityType"];
  entitySlug: string;
  symbol: string | null;
  displayName: string;
  sectorSlug: string | null;
  relevanceScore: number;
};

const ENTITY_MATCH_STOP_WORDS = new Set([
  "and",
  "bank",
  "company",
  "corp",
  "fund",
  "group",
  "inc",
  "india",
  "indian",
  "limited",
  "ltd",
  "market",
  "markets",
  "of",
  "the",
]);

function slugify(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeLookupText(value: string | null | undefined) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildTextBundle(rawItem: MarketNewsRawItemRecord, payload: MarketNewsAiRewritePayload) {
  return [
    rawItem.original_title,
    rawItem.original_excerpt,
    payload.rewritten_title,
    payload.short_summary,
    payload.summary,
    payload.category,
    payload.seo_title,
    payload.seo_description,
    ...payload.companies,
    ...payload.symbols,
    ...payload.sectors,
    ...payload.keywords,
  ]
    .map((value) => normalizeWhitespace(value))
    .filter(Boolean);
}

function normalizeValueSet(values: string[]) {
  return new Set(
    values
      .map((value) => normalizeLookupText(value))
      .filter(Boolean),
  );
}

function buildMeaningfulTokens(value: string) {
  return normalizeLookupText(value)
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !ENTITY_MATCH_STOP_WORDS.has(token));
}

function maybeAddMatch(
  map: Map<string, MatchAccumulator>,
  entry: MatchAccumulator,
) {
  const key = `${entry.entityType}:${entry.entitySlug}`;
  const existing = map.get(key);

  if (!existing || entry.relevanceScore > existing.relevanceScore) {
    map.set(key, entry);
  }
}

function aliasMatchedExactly(normalizedCandidates: Set<string>, aliases: string[]) {
  return aliases.find((alias) => normalizedCandidates.has(alias)) ?? null;
}

function aliasMatchedInText(normalizedText: string, aliases: string[], minLength = 4) {
  return (
    aliases.find((alias) => alias.length >= minLength && normalizedText.includes(alias)) ?? null
  );
}

function keywordMatchedInText(normalizedText: string, keywords: string[]) {
  return keywords.find((keyword) => normalizedText.includes(keyword)) ?? null;
}

function buildStockAliases(stock: StockCatalogEntry) {
  return Array.from(
    new Set(
      [
        normalizeLookupText(stock.name),
        normalizeLookupText(stock.slug.replace(/-/g, " ")),
        normalizeLookupText(stock.symbol),
      ].filter(Boolean),
    ),
  );
}

function buildSimpleAliases(name: string, slug: string) {
  return Array.from(
    new Set(
      [
        normalizeLookupText(name),
        normalizeLookupText(slug.replace(/-/g, " ")),
        normalizeLookupText(slug),
      ].filter(Boolean),
    ),
  );
}

function buildIndexAliases(index: IndexCatalogEntry) {
  return Array.from(
    new Set(
      [
        normalizeLookupText(index.title),
        normalizeLookupText(index.shortName),
        normalizeLookupText(index.slug),
        normalizeLookupText(index.slug.replace(/([a-z])([0-9])/g, "$1 $2")),
        normalizeLookupText(index.slug.replace(/([a-z])([A-Z])/g, "$1 $2")),
      ].filter(Boolean),
    ),
  );
}

function getStockMatchScore(input: {
  stock: StockCatalogEntry;
  exactCandidates: Set<string>;
  normalizedText: string;
}) {
  const aliases = buildStockAliases(input.stock);
  const normalizedSymbol = normalizeLookupText(input.stock.symbol);
  const exactAlias = aliasMatchedExactly(input.exactCandidates, aliases);
  const aliasInText = aliasMatchedInText(input.normalizedText, aliases, 5);
  const fuzzyKeyword = keywordMatchedInText(
    input.normalizedText,
    buildMeaningfulTokens(input.stock.name),
  );

  if (exactAlias === normalizeLookupText(input.stock.name)) {
    return 1.0;
  }

  if (
    exactAlias === normalizeLookupText(input.stock.slug.replace(/-/g, " ")) ||
    exactAlias === normalizeLookupText(input.stock.slug)
  ) {
    return 1.0;
  }

  if (exactAlias === normalizedSymbol) {
    return 0.95;
  }

  if (aliasInText) {
    return 0.8;
  }

  if (fuzzyKeyword) {
    return 0.5;
  }

  return 0;
}

function getSimpleEntityMatchScore(input: {
  name: string;
  slug: string;
  exactCandidates: Set<string>;
  normalizedText: string;
  minTextAliasLength?: number;
}) {
  const aliases = buildSimpleAliases(input.name, input.slug);
  const exactAlias = aliasMatchedExactly(input.exactCandidates, aliases);
  const aliasInText = aliasMatchedInText(
    input.normalizedText,
    aliases,
    input.minTextAliasLength ?? 5,
  );
  const fuzzyKeyword = keywordMatchedInText(
    input.normalizedText,
    buildMeaningfulTokens(input.name),
  );

  if (exactAlias === normalizeLookupText(input.name)) {
    return 1.0;
  }

  if (
    exactAlias === normalizeLookupText(input.slug.replace(/-/g, " ")) ||
    exactAlias === normalizeLookupText(input.slug)
  ) {
    return 0.8;
  }

  if (aliasInText) {
    return 0.8;
  }

  if (fuzzyKeyword) {
    return 0.5;
  }

  return 0;
}

function getIndexMatchScore(input: {
  index: IndexCatalogEntry;
  exactCandidates: Set<string>;
  normalizedText: string;
}) {
  const aliases = buildIndexAliases(input.index);
  const exactAlias = aliasMatchedExactly(input.exactCandidates, aliases);
  const aliasInText = aliasMatchedInText(input.normalizedText, aliases, 4);
  const fuzzyKeyword = keywordMatchedInText(
    input.normalizedText,
    buildMeaningfulTokens(input.index.title),
  );

  if (
    exactAlias === normalizeLookupText(input.index.title) ||
    exactAlias === normalizeLookupText(input.index.shortName)
  ) {
    return 1.0;
  }

  if (aliasInText) {
    return 0.8;
  }

  if (fuzzyKeyword) {
    return 0.5;
  }

  return 0;
}

async function loadEntityCatalog() {
  const [stocks, funds, ipos, sectors, indexes, etfs] = await Promise.all([
    getStocks(),
    getFunds(),
    getIpos(),
    getStockSectorHubs(),
    getIndexSnapshots(),
    getPublishableCmsRecords("etf"),
  ]);

  return {
    stocks: stocks.map<StockCatalogEntry>((stock) => ({
      slug: stock.slug,
      name: stock.name,
      symbol: stock.symbol,
      sectorSlug: stock.sector ? slugify(stock.sector) : null,
    })),
    funds: funds.map<FundCatalogEntry>((fund) => ({
      slug: fund.slug,
      name: fund.name,
    })),
    ipos: ipos.map<IpoCatalogEntry>((ipo) => ({
      slug: ipo.slug,
      name: ipo.name,
    })),
    sectors: sectors.map<SectorCatalogEntry>((sector) => ({
      slug: sector.slug,
      name: sector.name,
    })),
    indexes: indexes.map<IndexCatalogEntry>((index) => ({
      slug: index.slug,
      title: index.title,
      shortName: index.shortName,
    })),
    etfs: etfs.map<EtfCatalogEntry>((etf) => ({
      slug: etf.canonicalSlug,
      title: etf.title,
    })),
  };
}

function matchStocks(
  matches: Map<string, MatchAccumulator>,
  catalog: readonly StockCatalogEntry[],
  exactCandidates: Set<string>,
  normalizedText: string,
) {
  for (const stock of catalog) {
    const relevanceScore = getStockMatchScore({
      stock,
      exactCandidates,
      normalizedText,
    });

    if (relevanceScore < 0.5) {
      continue;
    }

    maybeAddMatch(matches, {
      entityType: "stock",
      entitySlug: stock.slug,
      symbol: stock.symbol,
      displayName: stock.name,
      sectorSlug: stock.sectorSlug,
      relevanceScore,
    });
  }
}

function matchSimpleEntities(
  matches: Map<string, MatchAccumulator>,
  input: {
    entityType: MarketNewsMatchedEntity["entityType"];
    items: ReadonlyArray<{ slug: string; name: string }>;
    exactCandidates: Set<string>;
    normalizedText: string;
    minTextAliasLength?: number;
  },
) {
  for (const item of input.items) {
    const relevanceScore = getSimpleEntityMatchScore({
      name: item.name,
      slug: item.slug,
      exactCandidates: input.exactCandidates,
      normalizedText: input.normalizedText,
      minTextAliasLength: input.minTextAliasLength,
    });

    if (relevanceScore < 0.5) {
      continue;
    }

    maybeAddMatch(matches, {
      entityType: input.entityType,
      entitySlug: item.slug,
      symbol: null,
      displayName: item.name,
      sectorSlug: input.entityType === "sector" ? item.slug : null,
      relevanceScore,
    });
  }
}

function matchIndexes(
  matches: Map<string, MatchAccumulator>,
  catalog: readonly IndexCatalogEntry[],
  exactCandidates: Set<string>,
  normalizedText: string,
) {
  for (const index of catalog) {
    const relevanceScore = getIndexMatchScore({
      index,
      exactCandidates,
      normalizedText,
    });

    if (relevanceScore < 0.5) {
      continue;
    }

    maybeAddMatch(matches, {
      entityType: "index",
      entitySlug: index.slug,
      symbol: null,
      displayName: index.title,
      sectorSlug: null,
      relevanceScore,
    });
  }
}

function maybeMatchMarket(
  matches: Map<string, MatchAccumulator>,
  normalizedText: string,
  category: string,
) {
  const marketSignals = [
    "capital market",
    "equity market",
    "indian market",
    "market breadth",
    "market sentiment",
    "market update",
    "markets",
    "macro",
  ];

  if (
    marketSignals.some((signal) => normalizedText.includes(signal)) ||
    ["macro", "regulatory"].includes(category)
  ) {
    maybeAddMatch(matches, {
      entityType: "market",
      entitySlug: "markets",
      symbol: null,
      displayName: "Markets",
      sectorSlug: null,
      relevanceScore: 0.6,
    });
  }
}

export async function matchMarketNewsEntities(input: {
  rawItem: MarketNewsRawItemRecord;
  payload: MarketNewsAiRewritePayload;
}) {
  const catalog = await loadEntityCatalog();
  const bundle = buildTextBundle(input.rawItem, input.payload);
  const normalizedText = normalizeLookupText(bundle.join(" "));
  const exactCandidates = normalizeValueSet(bundle);
  const matches = new Map<string, MatchAccumulator>();

  matchStocks(matches, catalog.stocks, exactCandidates, normalizedText);
  matchSimpleEntities(matches, {
    entityType: "mutual_fund",
    items: catalog.funds,
    exactCandidates,
    normalizedText,
  });
  matchSimpleEntities(matches, {
    entityType: "ipo",
    items: catalog.ipos,
    exactCandidates,
    normalizedText,
  });
  matchSimpleEntities(matches, {
    entityType: "sector",
    items: catalog.sectors,
    exactCandidates,
    normalizedText,
  });
  matchIndexes(matches, catalog.indexes, exactCandidates, normalizedText);
  matchSimpleEntities(matches, {
    entityType: "etf",
    items: catalog.etfs.map((item) => ({ slug: item.slug, name: item.title })),
    exactCandidates,
    normalizedText,
  });
  maybeMatchMarket(matches, normalizedText, normalizeLookupText(input.payload.category));

  return [...matches.values()]
    .filter((match) => match.relevanceScore >= 0.6)
    .sort((left, right) => right.relevanceScore - left.relevanceScore)
    .slice(0, 10)
    .map<MarketNewsMatchedEntity>((match) => ({
      entityType: match.entityType,
      entitySlug: match.entitySlug,
      symbol: match.symbol,
      displayName: match.displayName,
      sectorSlug: match.sectorSlug,
      relevanceScore: Number(match.relevanceScore.toFixed(2)),
    }));
}
