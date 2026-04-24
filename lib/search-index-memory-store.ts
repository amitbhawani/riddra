import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { getSearchIndexRegistryRows } from "@/lib/search-index-registry";

export type SearchIndexLane = {
  lane: string;
  status: "Ready" | "In progress" | "Blocked" | "Planned";
  indexedRecords: number;
  aliasGroups: number;
  typoProtectedRoutes: number;
  filterCoverage: string;
  lastRefreshAt: string;
  nextStep: string;
};

export type SaveSearchIndexLaneInput = {
  lane: string;
  status: SearchIndexLane["status"];
  indexedRecords: number;
  aliasGroups: number;
  typoProtectedRoutes: number;
  filterCoverage: string;
  nextStep: string;
};

export type AddSearchIndexLaneInput = SaveSearchIndexLaneInput;

export type RemoveSearchIndexLaneInput = {
  lane: string;
};

export type SearchBacklogLane = {
  lane: string;
  status: "Ready" | "In progress" | "Blocked" | "Planned";
  note: string;
};

type SearchIndexMemoryStore = {
  version: number;
  lanes: SearchIndexLane[];
  backlogLanes: SearchBacklogLane[];
};

export type SearchIndexMemory = {
  lanes: SearchIndexLane[];
  backlogLanes: SearchBacklogLane[];
  summary: {
    indexedRoutes: number;
    aliasGroups: number;
    typoProtectedRoutes: number;
    filterLanes: number;
    blockedBacklogLanes: number;
  };
};

const STORE_PATH = path.join(process.cwd(), "data", "search-index-memory.json");
const STORE_VERSION = 1;
const SEARCH_INDEX_MEMORY_CACHE_TTL_MS = 30_000;
let searchIndexMutationQueue = Promise.resolve();

type TimedCacheEntry<T> = {
  expiresAt: number;
  value: T;
};

let searchIndexStoreCache: TimedCacheEntry<SearchIndexMemoryStore> | null = null;
let searchIndexMemoryCache: TimedCacheEntry<SearchIndexMemory> | null = null;

function readTimedCache<T>(entry: TimedCacheEntry<T> | null) {
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    return null;
  }

  return entry.value;
}

async function buildDefaultStore(): Promise<SearchIndexMemoryStore> {
  const rows = await getSearchIndexRegistryRows();
  const assetRoutes = rows.filter((row) =>
    ["Stock", "Mutual Fund", "IPO", "Sector", "Fund Category", "Index"].includes(row.category),
  ).length;
  const compareRoutes = rows.filter((row) =>
    ["Compare", "Fund Compare"].includes(row.category),
  ).length;
  const workflowRoutes = rows.filter((row) =>
    ["Workflow", "Tool", "Hub", "Learn", "Course", "Chart"].includes(row.category),
  ).length;

  const lanes: SearchIndexLane[] = [
    {
      lane: "Canonical route index",
      status: "In progress",
      indexedRecords: rows.length,
      aliasGroups: 24,
      typoProtectedRoutes: 18,
      filterCoverage: "Route families, compare routes, and workflow routes now feed the Meilisearch document layer, but the lane still needs deeper canonical identity and relationship tables underneath the route graph.",
      lastRefreshAt: "2026-04-15T12:00:00.000Z",
      nextStep: "Keep route-backed search records flowing into the live engine while deeper canonical identity tables catch up underneath.",
    },
    {
      lane: "Asset and compare alias graph",
      status: "In progress",
      indexedRecords: assetRoutes + compareRoutes,
      aliasGroups: 31,
      typoProtectedRoutes: 12,
      filterCoverage: "The Meilisearch layer now carries aliases, typo tolerance, and compare-route coverage, but alias curation still starts from code and review queues rather than a canonical identity graph.",
      lastRefreshAt: "2026-04-15T12:10:00.000Z",
      nextStep: "Persist asset aliases, short names, symbols, and compare-intent edges outside the runtime route catalog so rebuilds stop depending on code-first curation.",
    },
    {
      lane: "Workflow and screener discovery",
      status: "Planned",
      indexedRecords: workflowRoutes,
      aliasGroups: 8,
      typoProtectedRoutes: 6,
      filterCoverage: "Workflow routes are discoverable, but the screener still lacks a durable filter index for scalable metric truth and rank-aware shortlist retrieval.",
      lastRefreshAt: "2026-04-14T18:30:00.000Z",
      nextStep: "Create a persistent screener filter and metric index layer so search and shortlist flows share the same backend truth.",
    },
  ];

  const backlogLanes: SearchBacklogLane[] = [
    {
      lane: "Typos and phonetic matching",
      status: "Planned",
      note: "The Meilisearch layer now handles typo tolerance, but phonetic handling, ticker shortcuts, and broader alias curation still need deeper identity-driven tuning.",
    },
    {
      lane: "Screener filter persistence",
      status: "Blocked",
      note: "The screener UI is strong, but source-backed metric ingestion and durable filter indexing still need a backend table design.",
    },
    {
      lane: "Search analytics feedback loop",
      status: "Planned",
      note: "Search quality still needs persistent query logs, zero-result audits, and ranking feedback before the live index can tune itself from real usage.",
    },
  ];

  return {
    version: STORE_VERSION,
    lanes,
    backlogLanes,
  };
}

async function readStore(): Promise<SearchIndexMemoryStore | null> {
  const cached = readTimedCache(searchIndexStoreCache);

  if (cached) {
    return cached;
  }

  try {
    const content = await readFile(STORE_PATH, "utf8");
    const store = JSON.parse(content) as SearchIndexMemoryStore;
    searchIndexStoreCache = {
      value: store,
      expiresAt: Date.now() + SEARCH_INDEX_MEMORY_CACHE_TTL_MS,
    };
    return store;
  } catch {
    return null;
  }
}

async function writeStore(store: SearchIndexMemoryStore) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  searchIndexStoreCache = {
    value: store,
    expiresAt: Date.now() + SEARCH_INDEX_MEMORY_CACHE_TTL_MS,
  };
  searchIndexMemoryCache = {
    value: toMemory(store),
    expiresAt: Date.now() + SEARCH_INDEX_MEMORY_CACHE_TTL_MS,
  };
}

async function ensureStore() {
  const storeExists = await access(STORE_PATH)
    .then(() => true)
    .catch(() => false);
  const store = await readStore();

  if (storeExists && store?.lanes?.length && store?.backlogLanes?.length) {
    return store;
  }

  const nextStore = await buildDefaultStore();
  await writeStore(nextStore);
  return nextStore;
}

function sanitizeCount(value: number) {
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;
}

function toMemory(store: SearchIndexMemoryStore): SearchIndexMemory {
  const indexedRoutes = store.lanes.reduce((sum, lane) => sum + lane.indexedRecords, 0);
  const aliasGroups = store.lanes.reduce((sum, lane) => sum + lane.aliasGroups, 0);
  const typoProtectedRoutes = store.lanes.reduce((sum, lane) => sum + lane.typoProtectedRoutes, 0);

  return {
    lanes: store.lanes,
    backlogLanes: store.backlogLanes,
    summary: {
      indexedRoutes,
      aliasGroups,
      typoProtectedRoutes,
      filterLanes: store.lanes.length,
      blockedBacklogLanes: store.backlogLanes.filter((lane) => lane.status === "Blocked").length,
    },
  };
}

export async function getSearchIndexMemory(): Promise<SearchIndexMemory> {
  const cached = readTimedCache(searchIndexMemoryCache);

  if (cached) {
    return cached;
  }

  const store = await ensureStore();
  const memory = toMemory(store);
  searchIndexMemoryCache = {
    value: memory,
    expiresAt: Date.now() + SEARCH_INDEX_MEMORY_CACHE_TTL_MS,
  };
  return memory;
}

export async function saveSearchIndexLane(input: SaveSearchIndexLaneInput): Promise<SearchIndexMemory> {
  const mutation = searchIndexMutationQueue.then(async () => {
    const store = await ensureStore();
    let matchedLane = false;

    const nextStore: SearchIndexMemoryStore = {
      ...store,
      lanes: store.lanes.map((lane) => {
        if (lane.lane !== input.lane) {
          return lane;
        }

        matchedLane = true;

        return {
          ...lane,
          status: input.status,
          indexedRecords: sanitizeCount(input.indexedRecords),
          aliasGroups: sanitizeCount(input.aliasGroups),
          typoProtectedRoutes: sanitizeCount(input.typoProtectedRoutes),
          filterCoverage: input.filterCoverage,
          nextStep: input.nextStep,
          lastRefreshAt: new Date().toISOString(),
        };
      }),
    };

    if (!matchedLane) {
      throw new Error(`Unknown search-index lane: ${input.lane}`);
    }

    await writeStore(nextStore);
    return toMemory(nextStore);
  });

  searchIndexMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function addSearchIndexLane(input: AddSearchIndexLaneInput): Promise<SearchIndexMemory> {
  const mutation = searchIndexMutationQueue.then(async () => {
    const store = await ensureStore();

    if (store.lanes.some((lane) => lane.lane === input.lane)) {
      throw new Error(`Search-index lane already exists: ${input.lane}`);
    }

    const nextStore: SearchIndexMemoryStore = {
      ...store,
      lanes: [
        ...store.lanes,
        {
          lane: input.lane,
          status: input.status,
          indexedRecords: sanitizeCount(input.indexedRecords),
          aliasGroups: sanitizeCount(input.aliasGroups),
          typoProtectedRoutes: sanitizeCount(input.typoProtectedRoutes),
          filterCoverage: input.filterCoverage,
          lastRefreshAt: new Date().toISOString(),
          nextStep: input.nextStep,
        },
      ],
    };

    await writeStore(nextStore);
    return toMemory(nextStore);
  });

  searchIndexMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function removeSearchIndexLane(input: RemoveSearchIndexLaneInput): Promise<SearchIndexMemory> {
  const mutation = searchIndexMutationQueue.then(async () => {
    const store = await ensureStore();
    const lane = input.lane.trim();

    if (!lane) {
      throw new Error("Lane is required.");
    }

    if (!store.lanes.some((item) => item.lane === lane)) {
      throw new Error(`Unknown search-index lane: ${lane}`);
    }

    const nextStore: SearchIndexMemoryStore = {
      ...store,
      lanes: store.lanes.filter((item) => item.lane !== lane),
    };

    await writeStore(nextStore);
    return toMemory(nextStore);
  });

  searchIndexMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}
