import { Meilisearch, type Settings } from "meilisearch";

import { isHostedAppRuntime } from "@/lib/durable-data-runtime";
import { env, hasMeilisearchEnv } from "@/lib/env";
import { buildSearchIndexDocuments, type SearchIndexDocument } from "@/lib/search-engine/documents";
import { getHostedRuntimeRequirements } from "@/lib/runtime-launch-config";

const SEARCH_WAIT_TIMEOUT_MS = 60_000;
const SEARCH_WAIT_INTERVAL_MS = 250;
const SEARCH_STATUS_CACHE_TTL_MS = 15_000;
const SEARCH_ENGINE_CALL_TIMEOUT_MS = 1_200;

let lastSearchError: string | null = null;

let cachedSearchEngineStatus:
  | {
      expiresAt: number;
      value: SearchEngineStatus;
    }
  | null = null;

const searchIndexSynonyms: Record<string, string[]> = {
  mf: ["mutual fund", "mutual funds"],
  nav: ["fund nav", "net asset value"],
  etf: ["exchange traded fund", "exchange traded funds"],
  pms: ["portfolio management service", "portfolio management services"],
  aif: ["alternative investment fund", "alternative investment funds"],
  sif: ["specialized investment fund", "specialized investment funds"],
  ipo: ["initial public offering", "public issue"],
  banknifty: ["bank nifty", "nifty bank"],
  finnifty: ["fin nifty", "financial services index"],
  nifty50: ["nifty 50", "nifty fifty", "nse nifty"],
  fii: ["foreign institutional investor", "foreign institutional investors"],
  dii: ["domestic institutional investor", "domestic institutional investors"],
};

const searchIndexSettings: Settings = {
  searchableAttributes: ["title", "aliases", "keywords", "category", "entityType", "summary", "searchableText"],
  displayedAttributes: [
    "id",
    "title",
    "href",
    "category",
    "query",
    "reasonBase",
    "entityType",
    "routeFamily",
    "aliases",
    "keywords",
    "priority",
    "symbol",
    "sector",
    "fundCategory",
    "wealthFamily",
    "reportType",
  ],
  filterableAttributes: ["entityType", "category", "routeFamily", "sector", "fundCategory", "wealthFamily", "reportType"],
  sortableAttributes: ["priority", "title"],
  rankingRules: ["words", "typo", "proximity", "attribute", "sort", "exactness", "priority:desc"],
  synonyms: searchIndexSynonyms,
  typoTolerance: {
    enabled: true,
    minWordSizeForTypos: {
      oneTypo: 4,
      twoTypos: 8,
    },
    disableOnAttributes: ["symbol"],
  },
  faceting: {
    maxValuesPerFacet: 40,
  },
  pagination: {
    maxTotalHits: 500,
  },
};

export type SearchEngineHit = Pick<SearchIndexDocument, "title" | "href" | "category" | "query" | "reasonBase">;

export type SearchEngineStatus = {
  configured: boolean;
  host: string | null;
  indexUid: string;
  indexPrefix: string;
  healthy: boolean;
  indexPresent: boolean;
  indexedDocuments: number;
  lastUpdate: string | null;
  message: string | null;
  fallbackActive: boolean;
  lastSearchError: string | null;
};

export type SearchEngineRebuildResult = {
  indexUid: string;
  usedSwapRebuild: boolean;
  indexedDocuments: number;
  lastUpdate: string | null;
  summary: Awaited<ReturnType<typeof buildSearchIndexDocuments>>["summary"];
};

export type SearchEnginePublicState = {
  available: boolean;
  statusLabel: string;
  detail: string;
};

function getSearchEngineClient() {
  if (!hasMeilisearchEnv() || !env.meilisearchHost) {
    throw new Error("Meilisearch is not configured. Set MEILISEARCH_HOST and MEILISEARCH_API_KEY first.");
  }

  return new Meilisearch({
    host: env.meilisearchHost,
    apiKey: env.meilisearchApiKey,
  });
}

function updateLastSearchError(message: string | null) {
  lastSearchError = message && message.trim().length > 0 ? message.trim() : null;
}

async function withSearchTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Meilisearch ${label} timed out after ${SEARCH_ENGINE_CALL_TIMEOUT_MS}ms.`));
        }, SEARCH_ENGINE_CALL_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function waitForTask(client: Meilisearch, taskUid: number) {
  const task = await client.tasks.waitForTask(taskUid, {
    timeout: SEARCH_WAIT_TIMEOUT_MS,
    interval: SEARCH_WAIT_INTERVAL_MS,
  });

  if (task.status === "failed") {
    const detail =
      typeof task.error?.message === "string" && task.error.message.length > 0
        ? task.error.message
        : "Unknown Meilisearch task failure.";

    throw new Error(`Meilisearch task ${taskUid} failed: ${detail}`);
  }

  return task;
}

async function indexExists(index: ReturnType<Meilisearch["index"]>) {
  try {
    await withSearchTimeout(index.getRawInfo(), "index info lookup");
    return true;
  } catch {
    return false;
  }
}

async function ensureIndex(indexUid: string) {
  const client = getSearchEngineClient();
  const index = client.index<SearchIndexDocument>(indexUid);

  if (!(await indexExists(index))) {
    const createTask = await client.createIndex(indexUid, { primaryKey: "id" });
    await waitForTask(client, createTask.taskUid);
  }

  const settingsTask = await index.updateSettings(searchIndexSettings);
  await waitForTask(client, settingsTask.taskUid);

  return { client, index };
}

export function getSearchIndexUid() {
  return `${env.meilisearchIndexPrefix}_search`;
}

export function getSearchEngineReadiness() {
  return {
    configured: hasMeilisearchEnv(),
    host: env.meilisearchHost ?? null,
    indexUid: getSearchIndexUid(),
  };
}

export async function getSearchEngineStatus(): Promise<SearchEngineStatus> {
  if (cachedSearchEngineStatus && cachedSearchEngineStatus.expiresAt > Date.now()) {
    return cachedSearchEngineStatus.value;
  }

  const readiness = getSearchEngineReadiness();

  if (!readiness.configured || !readiness.host) {
    const hostedRequirements = getHostedRuntimeRequirements();
    const missingMessage =
      hostedRequirements.hosted && hostedRequirements.missingMeilisearch.length > 0
        ? `Hosted search requires ${hostedRequirements.missingMeilisearch.join(", ")}.`
        : "Meilisearch environment variables are missing.";

    const status = {
      configured: false,
      host: readiness.host,
      indexUid: readiness.indexUid,
      indexPrefix: env.meilisearchIndexPrefix,
      healthy: false,
      indexPresent: false,
      indexedDocuments: 0,
      lastUpdate: null,
      message: missingMessage,
      fallbackActive: true,
      lastSearchError: missingMessage,
    };
    updateLastSearchError(missingMessage);
    cachedSearchEngineStatus = {
      value: status,
      expiresAt: Date.now() + SEARCH_STATUS_CACHE_TTL_MS,
    };
    return status;
  }

  try {
    const client = getSearchEngineClient();
    const index = client.index<SearchIndexDocument>(readiness.indexUid);
    const healthy = await withSearchTimeout(client.isHealthy(), "health check");

    if (!healthy) {
      const status = {
        configured: true,
        host: readiness.host,
        indexUid: readiness.indexUid,
        indexPrefix: env.meilisearchIndexPrefix,
        healthy: false,
        indexPresent: false,
        indexedDocuments: 0,
        lastUpdate: null,
        message: "Meilisearch is configured but not responding as healthy.",
        fallbackActive: true,
        lastSearchError: "Meilisearch is configured but not responding as healthy.",
      };
      updateLastSearchError(status.message);
      cachedSearchEngineStatus = {
        value: status,
        expiresAt: Date.now() + SEARCH_STATUS_CACHE_TTL_MS,
      };
      return status;
    }

    if (!(await indexExists(index))) {
      const status = {
        configured: true,
        host: readiness.host,
        indexUid: readiness.indexUid,
        indexPrefix: env.meilisearchIndexPrefix,
        healthy: true,
        indexPresent: false,
        indexedDocuments: 0,
        lastUpdate: null,
        message: "Meilisearch is healthy, but the search index has not been created or rebuilt yet.",
        fallbackActive: true,
        lastSearchError: "Meilisearch is healthy, but the search index has not been created or rebuilt yet.",
      };
      updateLastSearchError(status.message);
      cachedSearchEngineStatus = {
        value: status,
        expiresAt: Date.now() + SEARCH_STATUS_CACHE_TTL_MS,
      };
      return status;
    }

    const [info, stats] = await Promise.all([
      withSearchTimeout(index.getRawInfo(), "index info read"),
      withSearchTimeout(index.getStats(), "stats read"),
    ]);

    const status = {
      configured: true,
      host: readiness.host,
      indexUid: readiness.indexUid,
      indexPrefix: env.meilisearchIndexPrefix,
      healthy: true,
      indexPresent: true,
      indexedDocuments: stats.numberOfDocuments,
      lastUpdate: info.updatedAt,
      message:
        stats.numberOfDocuments > 0
          ? null
          : "Meilisearch is healthy, but the index is empty. Run a rebuild before using public search.",
      fallbackActive: stats.numberOfDocuments <= 0,
      lastSearchError: null,
    };
    updateLastSearchError(status.message);
    cachedSearchEngineStatus = {
      value: status,
      expiresAt: Date.now() + SEARCH_STATUS_CACHE_TTL_MS,
    };
    return status;
  } catch (error) {
    const status = {
      configured: true,
      host: readiness.host,
      indexUid: readiness.indexUid,
      indexPrefix: env.meilisearchIndexPrefix,
      healthy: false,
      indexPresent: false,
      indexedDocuments: 0,
      lastUpdate: null,
      message: error instanceof Error ? error.message : "Unable to reach Meilisearch.",
      fallbackActive: true,
      lastSearchError: error instanceof Error ? error.message : "Unable to reach Meilisearch.",
    };
    updateLastSearchError(status.message);
    cachedSearchEngineStatus = {
      value: status,
      expiresAt: Date.now() + SEARCH_STATUS_CACHE_TTL_MS,
    };
    return status;
  }
}

export function getSearchEnginePublicState(status: SearchEngineStatus): SearchEnginePublicState {
  if (!status.configured) {
    return {
      available: false,
      statusLabel: "Search engine unavailable",
      detail: isHostedAppRuntime()
        ? "Hosted search requires explicit MEILISEARCH_HOST, MEILISEARCH_API_KEY, and MEILISEARCH_INDEX_PREFIX configuration. It no longer falls back to local-only defaults."
        : "Meilisearch environment variables are missing, so public search remains in a degraded state.",
    };
  }

  if (!status.healthy) {
    return {
      available: false,
      statusLabel: "Search engine unhealthy",
      detail:
        status.message ??
        "Meilisearch is configured, but the engine is not healthy enough to serve public search.",
    };
  }

  if (!status.indexPresent) {
    return {
      available: false,
      statusLabel: "Search index missing",
      detail:
        status.message ??
        "Meilisearch is reachable, but the search index has not been created or rebuilt yet.",
    };
  }

  if (status.indexedDocuments <= 0) {
    return {
      available: false,
      statusLabel: "Search index empty",
      detail:
        status.message ??
        "Meilisearch is reachable, but the index is empty. Public search stays degraded until a rebuild writes documents.",
    };
  }

  return {
    available: true,
    statusLabel: "Meilisearch live",
    detail: `${status.indexedDocuments} documents are indexed and ready for public search.`,
  };
}

export async function searchCatalogIndex(query: string, limit = 12) {
  const status = await getSearchEngineStatus();
  const publicState = getSearchEnginePublicState(status);

  if (!publicState.available) {
    return {
      configured: status.configured,
      available: false,
      reason: publicState.detail,
      hits: [] as SearchEngineHit[],
    };
  }

  const client = getSearchEngineClient();
  const index = client.index<SearchIndexDocument>(status.indexUid);

  try {
    const response = await withSearchTimeout(
      index.search<SearchIndexDocument>(query, {
        limit,
        showRankingScore: true,
        attributesToRetrieve: ["title", "href", "category", "query", "reasonBase"],
      }),
      "search query",
    );

    updateLastSearchError(null);

    return {
      configured: true,
      available: true,
      reason: null,
      hits: response.hits.map((item) => ({
        title: item.title,
        href: item.href,
        category: item.category,
        query: item.query,
        reasonBase: item.reasonBase,
      })),
    };
  } catch (error) {
    updateLastSearchError(
      error instanceof Error ? error.message : "The live search index could not be read right now.",
    );
    return {
      configured: true,
      available: false,
      reason:
        error instanceof Error
          ? error.message
          : "The live search index could not be read right now.",
      hits: [] as SearchEngineHit[],
    };
  }
}

export async function rebuildSearchEngineIndex(): Promise<SearchEngineRebuildResult> {
  const { documents, summary } = await buildSearchIndexDocuments();
  const primaryUid = getSearchIndexUid();
  const primary = await ensureIndex(primaryUid);

  if (!(await indexExists(primary.index))) {
    const addTask = await primary.index.addDocuments(documents, { primaryKey: "id" });
    await waitForTask(primary.client, addTask.taskUid);
    const [info, stats] = await Promise.all([primary.index.getRawInfo(), primary.index.getStats()]);

    return {
      indexUid: primaryUid,
      usedSwapRebuild: false,
      indexedDocuments: stats.numberOfDocuments,
      lastUpdate: info.updatedAt,
      summary,
    };
  }

  const currentStats = await primary.index.getStats();

  if (currentStats.numberOfDocuments === 0) {
    const addTask = await primary.index.addDocuments(documents, { primaryKey: "id" });
    await waitForTask(primary.client, addTask.taskUid);
    const [info, stats] = await Promise.all([primary.index.getRawInfo(), primary.index.getStats()]);

    return {
      indexUid: primaryUid,
      usedSwapRebuild: false,
      indexedDocuments: stats.numberOfDocuments,
      lastUpdate: info.updatedAt,
      summary,
    };
  }

  const tempUid = `${primaryUid}_rebuild_${Date.now()}`;
  const tempCreateTask = await primary.client.createIndex(tempUid, { primaryKey: "id" });
  await waitForTask(primary.client, tempCreateTask.taskUid);

  const temp = await ensureIndex(tempUid);
  const tempAddTask = await temp.index.addDocuments(documents, { primaryKey: "id" });
  await waitForTask(temp.client, tempAddTask.taskUid);

  const swapTask = await primary.client.swapIndexes([{ indexes: [primaryUid, tempUid], rename: false }]);
  await waitForTask(primary.client, swapTask.taskUid);

  const cleanupTask = await primary.client.deleteIndex(tempUid);
  await waitForTask(primary.client, cleanupTask.taskUid);

  const [info, stats] = await Promise.all([primary.index.getRawInfo(), primary.index.getStats()]);

  return {
    indexUid: primaryUid,
    usedSwapRebuild: true,
    indexedDocuments: stats.numberOfDocuments,
    lastUpdate: info.updatedAt,
    summary,
  };
}
