import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type SearchQueryEvent = {
  query: string;
  loggedAt: string;
  resultCount: number;
  actionCount: number;
  groupCount: number;
  focusCardTitle?: string;
  focusCardHref?: string;
  leadCategory?: string;
  leadHref?: string;
  zeroResults: boolean;
};

type SearchQueryMemoryStore = {
  version: number;
  events: SearchQueryEvent[];
};

export type SearchQueryTopQuery = {
  query: string;
  count: number;
  zeroResultCount: number;
  bestLeadHref?: string;
};

export type SearchQueryMemory = {
  events: SearchQueryEvent[];
  summary: {
    trackedQueries: number;
    zeroResultQueries: number;
    guidedHandoffs: number;
    focusCardHits: number;
    averageResultCount: number;
  };
  topQueries: SearchQueryTopQuery[];
  rules: string[];
};

export type RecordSearchQueryEventInput = {
  query: string;
  resultCount: number;
  actionCount: number;
  groupCount: number;
  focusCardTitle?: string | null;
  focusCardHref?: string | null;
  leadCategory?: string | null;
  leadHref?: string | null;
};

const STORE_PATH = path.join(process.cwd(), "data", "search-query-memory.json");
const STORE_VERSION = 1;
const MAX_EVENTS = 200;
const SEARCH_QUERY_MEMORY_CACHE_TTL_MS = 30_000;
let searchQueryMutationQueue = Promise.resolve();

type TimedCacheEntry<T> = {
  expiresAt: number;
  value: T;
};

let searchQueryStoreCache: TimedCacheEntry<SearchQueryMemoryStore> | null = null;
let searchQueryMemoryCache: TimedCacheEntry<SearchQueryMemory> | null = null;

function readTimedCache<T>(entry: TimedCacheEntry<T> | null) {
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    return null;
  }

  return entry.value;
}

async function readStore(): Promise<SearchQueryMemoryStore | null> {
  const cached = readTimedCache(searchQueryStoreCache);

  if (cached) {
    return cached;
  }

  try {
    const content = await readFile(STORE_PATH, "utf8");
    const store = JSON.parse(content) as SearchQueryMemoryStore;
    searchQueryStoreCache = {
      value: store,
      expiresAt: Date.now() + SEARCH_QUERY_MEMORY_CACHE_TTL_MS,
    };
    return store;
  } catch {
    return null;
  }
}

async function writeStore(store: SearchQueryMemoryStore) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  searchQueryStoreCache = {
    value: store,
    expiresAt: Date.now() + SEARCH_QUERY_MEMORY_CACHE_TTL_MS,
  };
  searchQueryMemoryCache = {
    value: toMemory(store),
    expiresAt: Date.now() + SEARCH_QUERY_MEMORY_CACHE_TTL_MS,
  };
}

function buildDefaultStore(): SearchQueryMemoryStore {
  return {
    version: STORE_VERSION,
    events: [],
  };
}

async function ensureStore() {
  const storeExists = await access(STORE_PATH)
    .then(() => true)
    .catch(() => false);
  const store = await readStore();

  if (storeExists && store?.events) {
    return store;
  }

  const nextStore = buildDefaultStore();
  await writeStore(nextStore);
  return nextStore;
}

function sanitizeCount(value: number) {
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;
}

function toMemory(store: SearchQueryMemoryStore): SearchQueryMemory {
  const trackedQueries = store.events.length;
  const zeroResultQueries = store.events.filter((event) => event.zeroResults).length;
  const guidedHandoffs = store.events.filter((event) => event.actionCount > 0 || event.focusCardHref).length;
  const focusCardHits = store.events.filter((event) => event.focusCardHref).length;
  const totalResults = store.events.reduce((sum, event) => sum + event.resultCount, 0);
  const queryMap = new Map<string, SearchQueryTopQuery>();

  for (const event of store.events) {
    const existing = queryMap.get(event.query);

    if (existing) {
      existing.count += 1;
      existing.zeroResultCount += event.zeroResults ? 1 : 0;
      if (!existing.bestLeadHref && event.leadHref) {
        existing.bestLeadHref = event.leadHref;
      }
      continue;
    }

    queryMap.set(event.query, {
      query: event.query,
      count: 1,
      zeroResultCount: event.zeroResults ? 1 : 0,
      bestLeadHref: event.leadHref,
    });
  }

  return {
    events: store.events,
    summary: {
      trackedQueries,
      zeroResultQueries,
      guidedHandoffs,
      focusCardHits,
      averageResultCount: trackedQueries ? Number((totalResults / trackedQueries).toFixed(1)) : 0,
    },
    topQueries: [...queryMap.values()].sort((left, right) => right.count - left.count).slice(0, 5),
    rules: [
      "Search quality should be improved from tracked queries, not only from route intuition and manual reviews.",
      "Zero-result and low-result searches should stay visible so alias, typo, and content gaps become explicit backlog work.",
      "The strongest search handoffs should be measured at the same time as result counts so route discovery stays tied to actual follow-through.",
    ],
  };
}

export async function getSearchQueryMemory(): Promise<SearchQueryMemory> {
  const cached = readTimedCache(searchQueryMemoryCache);

  if (cached) {
    return cached;
  }

  const store = await ensureStore();
  const memory = toMemory(store);
  searchQueryMemoryCache = {
    value: memory,
    expiresAt: Date.now() + SEARCH_QUERY_MEMORY_CACHE_TTL_MS,
  };
  return memory;
}

export async function recordSearchQueryEvent(input: RecordSearchQueryEventInput): Promise<SearchQueryMemory> {
  const mutation = searchQueryMutationQueue.then(async () => {
    const store = await ensureStore();
    const query = input.query.trim();

    if (!query) {
      return toMemory(store);
    }

    const nextEvent: SearchQueryEvent = {
      query,
      loggedAt: new Date().toISOString(),
      resultCount: sanitizeCount(input.resultCount),
      actionCount: sanitizeCount(input.actionCount),
      groupCount: sanitizeCount(input.groupCount),
      focusCardTitle: input.focusCardTitle?.trim() || undefined,
      focusCardHref: input.focusCardHref?.trim() || undefined,
      leadCategory: input.leadCategory?.trim() || undefined,
      leadHref: input.leadHref?.trim() || undefined,
      zeroResults: sanitizeCount(input.resultCount) === 0,
    };
    const nextStore: SearchQueryMemoryStore = {
      ...store,
      events: [nextEvent, ...store.events].slice(0, MAX_EVENTS),
    };

    await writeStore(nextStore);
    return toMemory(nextStore);
  });

  searchQueryMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export function toSearchQueryRegistryCsv(events: SearchQueryEvent[]) {
  const columns = [
    "query",
    "logged_at",
    "result_count",
    "action_count",
    "group_count",
    "focus_card_title",
    "focus_card_href",
    "lead_category",
    "lead_href",
    "zero_results",
  ];
  const dataRows = events.map((event) =>
    [
      event.query,
      event.loggedAt,
      event.resultCount,
      event.actionCount,
      event.groupCount,
      event.focusCardTitle ?? "",
      event.focusCardHref ?? "",
      event.leadCategory ?? "",
      event.leadHref ?? "",
      event.zeroResults ? "yes" : "no",
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(","),
  );

  return `${columns.join(",")}\n${dataRows.join("\n")}\n`;
}
