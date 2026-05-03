import { getFunds, getIpos, getPublicStockDiscoveryStocks } from "@/lib/content";
import { filterEntriesToPublicSearchRoutes } from "@/lib/public-search-routes";
import { searchPublicCatalogFallback } from "@/lib/public-search-fallback";
import { buildSearchEntryPresentation } from "@/lib/search-entry-presentation";
import type { FundSnapshot, IpoSnapshot, StockSnapshot } from "@/lib/mock-data";
import {
  getSearchEnginePublicState,
  getSearchEngineStatus,
  searchCatalogIndex,
} from "@/lib/search-engine/meilisearch";
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

  if (!engine.available) {
    const fallbackEntries = await searchPublicCatalogFallback(normalized, limit);

    return {
      suggestions: fallbackEntries.map((entry) => ({
        title: entry.title,
        href: entry.href,
        category: entry.category,
        query: entry.query,
        context: entry.context,
        truthLabel: entry.truthLabel,
      })),
      degraded: true,
      message: engine.detail,
    };
  }

  const [stocks, ipos, funds] = await Promise.all([
    getPublicStockDiscoveryStocks(),
    getIpos(),
    getFunds(),
  ]);
  const catalogHits = await searchCatalogIndex(normalized, limit);
  if (!catalogHits.available) {
    const fallbackEntries = await searchPublicCatalogFallback(normalized, limit);

    return {
      suggestions: fallbackEntries.map((entry) => ({
        title: entry.title,
        href: entry.href,
        category: entry.category,
        query: entry.query,
        context: entry.context,
        truthLabel: entry.truthLabel,
      })),
      degraded: true,
      message: catalogHits.reason ?? "Search is using the stored route fallback while the live engine recovers.",
    };
  }
  const directIntentEntries = getDirectIntentEntries(normalized, { stocks, funds, ipos });
  const compareIntentEntry = getCompareIntentEntry(normalized, { stocks, funds });
  const rawRankedEntries = catalogHits.hits;
  const filteredEntries = await filterEntriesToPublicSearchRoutes([
    ...directIntentEntries,
    ...(compareIntentEntry ? [compareIntentEntry] : []),
    ...rawRankedEntries,
  ]);
  const entryPresentationOptions = {
    stocks,
    funds,
    ipos,
  };
  const combinedEntries: SearchSuggestion[] = [
    ...filteredEntries.map((entry) => toSearchSuggestion(entry, entryPresentationOptions)),
  ].filter((entry, index, allEntries) => allEntries.findIndex((item) => item.href === entry.href) === index);

  return {
    suggestions: combinedEntries.slice(0, limit),
    degraded: false,
    message: null,
  };
}
