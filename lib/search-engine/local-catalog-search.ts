import { buildSearchIndexDocuments, type SearchIndexDocument } from "@/lib/search-engine/documents";
import type { SearchEngineHit } from "@/lib/search-engine/meilisearch";

const LOCAL_SEARCH_CACHE_TTL_MS = 60_000;

type LocalCatalogCacheEntry = {
  documents: SearchIndexDocument[];
  expiresAt: number;
};

let localCatalogCache: LocalCatalogCacheEntry | null = null;
let localCatalogPromise: Promise<SearchIndexDocument[]> | null = null;

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

async function getLocalCatalogDocuments() {
  const now = Date.now();

  if (localCatalogCache && localCatalogCache.expiresAt > now) {
    return localCatalogCache.documents;
  }

  if (!localCatalogPromise) {
    localCatalogPromise = buildSearchIndexDocuments()
      .then((result) => {
        localCatalogCache = {
          documents: result.documents,
          expiresAt: Date.now() + LOCAL_SEARCH_CACHE_TTL_MS,
        };

        return result.documents;
      })
      .finally(() => {
        localCatalogPromise = null;
      });
  }

  return localCatalogPromise;
}

function scoreDocument(document: SearchIndexDocument, normalizedQuery: string, queryTerms: string[]) {
  const title = normalizeText(document.title);
  const aliases = document.aliases.map(normalizeText).filter(Boolean);
  const keywords = document.keywords.map(normalizeText).filter(Boolean);
  const searchableText = normalizeText(document.searchableText);
  let score = document.priority;

  if (title === normalizedQuery) {
    score += 1200;
  } else if (aliases.includes(normalizedQuery)) {
    score += 1100;
  } else if (title.startsWith(normalizedQuery)) {
    score += 900;
  } else if (aliases.some((alias) => alias.startsWith(normalizedQuery))) {
    score += 820;
  } else if (title.includes(normalizedQuery)) {
    score += 700;
  } else if (aliases.some((alias) => alias.includes(normalizedQuery))) {
    score += 620;
  } else if (searchableText.includes(normalizedQuery)) {
    score += 420;
  }

  let matchedTerms = 0;

  for (const term of queryTerms) {
    if (title === term) {
      score += 220;
      matchedTerms += 1;
      continue;
    }

    if (title.startsWith(term)) {
      score += 180;
      matchedTerms += 1;
      continue;
    }

    if (aliases.some((alias) => alias === term || alias.startsWith(term))) {
      score += 160;
      matchedTerms += 1;
      continue;
    }

    if (keywords.includes(term)) {
      score += 120;
      matchedTerms += 1;
      continue;
    }

    if (searchableText.includes(term)) {
      score += 80;
      matchedTerms += 1;
    }
  }

  if (queryTerms.length > 1) {
    score += matchedTerms * 40;
  }

  return matchedTerms > 0 || score > document.priority ? score : 0;
}

export async function searchCatalogLocally(query: string, limit = 12): Promise<SearchEngineHit[]> {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return [];
  }

  const queryTerms = normalizedQuery.split(" ").filter((term) => term.length >= 2);
  const documents = await getLocalCatalogDocuments();

  return documents
    .map((document) => ({
      document,
      score: scoreDocument(document, normalizedQuery, queryTerms),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (right.document.priority !== left.document.priority) {
        return right.document.priority - left.document.priority;
      }

      return left.document.title.localeCompare(right.document.title);
    })
    .slice(0, limit)
    .map(({ document }) => ({
      title: document.title,
      href: document.href,
      category: document.category,
      query: document.query,
      reasonBase: document.reasonBase,
    }));
}
