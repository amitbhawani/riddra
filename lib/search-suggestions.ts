import { getFunds, getIpos, getStocks } from "@/lib/content";
import { filterEntriesToPublishableCms } from "@/lib/publishable-content";
import { buildSearchEntryPresentation } from "@/lib/search-entry-presentation";
import type { FundSnapshot, IpoSnapshot, StockSnapshot } from "@/lib/mock-data";
import {
  getSearchEnginePublicState,
  getSearchEngineStatus,
  searchCatalogIndex,
} from "@/lib/search-engine/meilisearch";
import { searchCatalogLocally } from "@/lib/search-engine/local-catalog-search";
import { getCompareIntentEntry, getDirectIntentEntries } from "@/lib/search-intent";
import type { SearchCatalogEntry } from "@/lib/search-catalog";

export type SearchSuggestion = {
  title: string;
  href: string;
  category: string;
  query: string;
  context: string;
  truthLabel?: string;
};

export type ServerSearchSuggestionsResult = {
  suggestions: SearchSuggestion[];
  degraded: boolean;
  message: string | null;
};

function toSearchSuggestion(
  entry: SearchCatalogEntry,
  options: {
    stocks: StockSnapshot[];
    funds: FundSnapshot[];
    ipos: IpoSnapshot[];
  },
): SearchSuggestion {
  return {
    title: entry.title,
    href: entry.href,
    category: entry.category,
    query: entry.query,
    ...buildSearchEntryPresentation(entry, options),
  };
}
export function getSearchSuggestions(query: string, limit = 6) {
  void query;
  void limit;
  return [];
}

export async function getServerSearchSuggestions(query: string, limit = 8): Promise<ServerSearchSuggestionsResult> {
  const normalized = query.trim().toLowerCase();
  const searchEngineStatus = await getSearchEngineStatus();
  const engine = getSearchEnginePublicState(searchEngineStatus);

  if (!normalized) {
    return {
      suggestions: [],
      degraded: false,
      message: null,
    };
  }

  const [stocks, ipos, funds] = await Promise.all([getStocks(), getIpos(), getFunds()]);
  const catalogHits = engine.available ? await searchCatalogIndex(normalized, limit) : { available: true, hits: await searchCatalogLocally(normalized, limit) };

  const directIntentEntries = (
    await filterEntriesToPublishableCms(getDirectIntentEntries(normalized, { stocks, funds, ipos }))
  ).map((entry) =>
    toSearchSuggestion(entry, {
      stocks,
      funds,
      ipos,
    }),
  );
  const compareIntentEntry = getCompareIntentEntry(normalized, { stocks, funds });
  const rankedEntries = catalogHits.available
    ? (await filterEntriesToPublishableCms(catalogHits.hits)).map((item) =>
        toSearchSuggestion(item, {
          stocks,
          funds,
          ipos,
        }),
      )
    : [];
  const compareSuggestion: SearchSuggestion[] = compareIntentEntry
    ? (
        await filterEntriesToPublishableCms([compareIntentEntry])
      ).map((entry) =>
        toSearchSuggestion(entry, {
          stocks,
          funds,
          ipos,
        }),
      )
    : [];
  const combinedEntries: SearchSuggestion[] = [
    ...directIntentEntries,
    ...compareSuggestion,
    ...rankedEntries,
  ].filter((entry, index, allEntries) => allEntries.findIndex((item) => item.href === entry.href) === index);

  return {
    suggestions: combinedEntries.slice(0, limit),
    degraded: false,
    message: null,
  };
}
