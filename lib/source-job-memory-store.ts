import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { canUseFileFallback, getFileFallbackDisabledMessage } from "@/lib/durable-data-runtime";
import { readDurableGlobalStateLane, writeDurableGlobalStateLane } from "@/lib/global-state-durable-store";
import { sourceJobSamples } from "@/lib/source-jobs";

export type SourceJobMemoryRun = {
  adapter: string;
  domain: string;
  cadence: string;
  status: "Ready" | "In progress" | "Blocked" | "Planned";
  queueDepth: number;
  retryBacklog: number;
  lastRunAt: string;
  nextRunWindow: string;
  cachePosture: string;
  nextStep: string;
};

export type SourceJobHotCacheLane = {
  lane: string;
  cacheStatus: "Warm" | "Partial" | "Cold";
  ttl: string;
  note: string;
};

export type SaveSourceJobRunInput = {
  adapter: string;
  status: "Ready" | "In progress" | "Blocked" | "Planned";
  queueDepth: number;
  retryBacklog: number;
  nextRunWindow: string;
  nextStep: string;
};

export type AddSourceJobRunInput = {
  adapter: string;
  domain: string;
  cadence: string;
  status: "Ready" | "In progress" | "Blocked" | "Planned";
  queueDepth: number;
  retryBacklog: number;
  nextRunWindow: string;
  cachePosture: string;
  nextStep: string;
};

export type RemoveSourceJobRunInput = {
  adapter: string;
};

type SourceJobMemoryStore = {
  version: number;
  runs: SourceJobMemoryRun[];
  hotCacheLanes: SourceJobHotCacheLane[];
};

type SourceJobGlobalState = {
  updatedAt: string;
  runs: SourceJobMemoryRun[];
  hotCacheLanes: SourceJobHotCacheLane[];
};

export type SourceJobMemory = {
  runs: SourceJobMemoryRun[];
  hotCacheLanes: SourceJobHotCacheLane[];
  summary: {
    activeAdapters: number;
    plannedJobs: number;
    blockedFeeds: number;
    queueDepth: number;
    retryBacklog: number;
    warmCaches: number;
  };
};

const STORE_PATH = path.join(process.cwd(), "data", "source-job-memory.json");
const STORE_VERSION = 1;
const DURABLE_GLOBAL_LANE = "source_jobs" as const;
let sourceJobMutationQueue = Promise.resolve();

const DEFAULT_RUNS: SourceJobMemoryRun[] = sourceJobSamples.map((item, index) => ({
  adapter: item.adapter,
  domain: item.domain,
  cadence: item.cadence,
  status: item.status === "In progress" || item.status === "Blocked" || item.status === "Planned" ? item.status : "Planned",
  queueDepth: item.adapter === "provider_sync_bridge" ? 4 : item.adapter === "index_snapshot_refresh" ? 3 : item.adapter === "amfi_nav_refresh" ? 2 : 1,
  retryBacklog: item.adapter === "provider_sync_bridge" ? 1 : 0,
  lastRunAt: `2026-04-15T0${Math.min(index + 6, 9)}:30:00.000Z`,
  nextRunWindow:
    item.cadence === "Daily"
      ? "Next market close"
      : item.cadence === "End of day"
        ? "Today after market close"
        : item.cadence === "Intraday-ready"
          ? "Every 15 minutes once provider sync is active"
          : "On next signed trigger",
  cachePosture:
    item.domain === "shared_market_data"
      ? "Shared delayed snapshot cache remains partial until real provider sync is verified."
      : item.domain === "indices"
        ? "Index cache can warm from the same delayed snapshot lane once verified writes are live."
        : "Preview cache exists only as route-level fallback until this job writes durable history.",
  nextStep: item.nextStep,
}));

const DEFAULT_HOT_CACHE_LANES: SourceJobHotCacheLane[] = [
  {
    lane: "Stock delayed snapshots",
    cacheStatus: "Partial",
    ttl: "15 minutes target",
    note: "Source-entry and delayed snapshot fallbacks exist, but the shared cache still needs real provider-fed quote and OHLCV writes.",
  },
  {
    lane: "Index snapshots",
    cacheStatus: "Partial",
    ttl: "5 minutes target",
    note: "Native index charts are stronger now, but the hot-cache lane still needs provider-backed intraday snapshot persistence.",
  },
  {
    lane: "Fund NAV snapshots",
    cacheStatus: "Partial",
    ttl: "End-of-day target",
    note: "File-backed NAV fallback exists, but AMFI-backed recurring refresh still needs durable cache and archive writes.",
  },
  {
    lane: "IPO and filings archive",
    cacheStatus: "Cold",
    ttl: "Event-driven",
    note: "Archive routes exist, but recurring official-source archive jobs and cached history views are still pending.",
  },
];

const DEFAULT_STORE: SourceJobMemoryStore = {
  version: STORE_VERSION,
  runs: DEFAULT_RUNS,
  hotCacheLanes: DEFAULT_HOT_CACHE_LANES,
};

async function readStore(): Promise<SourceJobMemoryStore> {
  if (!canUseFileFallback()) {
    return DEFAULT_STORE;
  }

  try {
    const content = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(content) as Partial<SourceJobMemoryStore>;

    return {
      version: typeof parsed.version === "number" ? parsed.version : STORE_VERSION,
      runs: Array.isArray(parsed.runs) && parsed.runs.length ? (parsed.runs as SourceJobMemoryRun[]) : DEFAULT_RUNS,
      hotCacheLanes:
        Array.isArray(parsed.hotCacheLanes) && parsed.hotCacheLanes.length
          ? (parsed.hotCacheLanes as SourceJobHotCacheLane[])
          : DEFAULT_HOT_CACHE_LANES,
    };
  } catch {
    return DEFAULT_STORE;
  }
}

async function writeStore(store: SourceJobMemoryStore) {
  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Source job memory"));
  }

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function readDurableSourceJobState() {
  const payload = await readDurableGlobalStateLane<SourceJobGlobalState>(DURABLE_GLOBAL_LANE);
  if (!payload) {
    return null;
  }

  return {
    updatedAt: payload.updatedAt,
    runs: (payload.runs ?? []).map((run) => ({ ...run })),
    hotCacheLanes: (payload.hotCacheLanes ?? []).map((lane) => ({ ...lane })),
  };
}

async function writeDurableSourceJobState(store: SourceJobMemoryStore) {
  return writeDurableGlobalStateLane(DURABLE_GLOBAL_LANE, {
    updatedAt: new Date().toISOString(),
    runs: store.runs.map((run) => ({ ...run })),
    hotCacheLanes: store.hotCacheLanes.map((lane) => ({ ...lane })),
  });
}

async function persistStore(store: SourceJobMemoryStore) {
  const wroteDurableState = await writeDurableSourceJobState(store);

  if (wroteDurableState) {
    return;
  }

  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Source job memory"));
  }

  await writeStore(store);
}

async function ensureStore() {
  const store = await readStore();
  const durableState = await readDurableSourceJobState();

  if (durableState) {
    return {
      version: store?.version ?? STORE_VERSION,
      runs: durableState.runs,
      hotCacheLanes: durableState.hotCacheLanes,
    };
  }

  if (!canUseFileFallback()) {
    return DEFAULT_STORE;
  }

  const storeExists = await access(STORE_PATH)
    .then(() => true)
    .catch(() => false);

  if (storeExists && store.runs.length && store.hotCacheLanes.length) {
    await writeDurableSourceJobState(store);
    return store;
  }

  await persistStore(DEFAULT_STORE);
  return DEFAULT_STORE;
}

export async function getSourceJobMemory(): Promise<SourceJobMemory> {
  const store = await ensureStore();
  const queueDepth = store.runs.reduce((sum, item) => sum + item.queueDepth, 0);
  const retryBacklog = store.runs.reduce((sum, item) => sum + item.retryBacklog, 0);
  const warmCaches = store.hotCacheLanes.filter((item) => item.cacheStatus === "Warm").length;

  return {
    runs: store.runs,
    hotCacheLanes: store.hotCacheLanes,
    summary: {
      activeAdapters: store.runs.filter((item) => item.status === "In progress" || item.status === "Ready").length,
      plannedJobs: store.runs.filter((item) => item.status === "Planned").length,
      blockedFeeds: store.runs.filter((item) => item.status === "Blocked").length,
      queueDepth,
      retryBacklog,
      warmCaches,
    },
  };
}

export async function saveSourceJobRun(input: SaveSourceJobRunInput): Promise<SourceJobMemory> {
  const mutation = sourceJobMutationQueue.then(async () => {
    const store = await ensureStore();
    const nextRunIndex = store.runs.findIndex((item) => item.adapter === input.adapter);

    if (nextRunIndex === -1) {
      return getSourceJobMemory();
    }

    const existing = store.runs[nextRunIndex];
    const updatedRun: SourceJobMemoryRun = {
      ...existing,
      status: input.status,
      queueDepth: input.queueDepth,
      retryBacklog: input.retryBacklog,
      nextRunWindow: input.nextRunWindow,
      nextStep: input.nextStep,
      lastRunAt: new Date().toISOString(),
    };

    const nextHotCacheLanes = store.hotCacheLanes.map((lane) => {
      if (existing.domain === "shared_market_data" && lane.lane === "Stock delayed snapshots") {
        return {
          ...lane,
          cacheStatus: input.status === "Ready" ? "Warm" : input.status === "In progress" ? "Partial" : lane.cacheStatus,
          note:
            input.status === "Ready"
              ? "Operator-updated queue posture now treats this stock snapshot lane as warm preview cache while live provider sync is still pending."
              : lane.note,
        };
      }

      if (existing.domain === "indices" && lane.lane === "Index snapshots") {
        return {
          ...lane,
          cacheStatus: input.status === "Ready" ? "Warm" : input.status === "In progress" ? "Partial" : lane.cacheStatus,
        };
      }

      if (existing.domain === "funds" && lane.lane === "Fund NAV snapshots") {
        return {
          ...lane,
          cacheStatus: input.status === "Ready" ? "Warm" : input.status === "In progress" ? "Partial" : lane.cacheStatus,
        };
      }

      if (existing.domain === "ipo_archive" && lane.lane === "IPO and filings archive") {
        return {
          ...lane,
          cacheStatus: input.status === "Ready" ? "Partial" : input.status === "Blocked" ? "Cold" : lane.cacheStatus,
        };
      }

      return lane;
    });

    const nextStore: SourceJobMemoryStore = {
      ...store,
      runs: store.runs.map((item, index) => (index === nextRunIndex ? updatedRun : item)),
      hotCacheLanes: nextHotCacheLanes,
    };

    await persistStore(nextStore);
    return getSourceJobMemory();
  });

  sourceJobMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function addSourceJobRun(input: AddSourceJobRunInput): Promise<SourceJobMemory> {
  const mutation = sourceJobMutationQueue.then(async () => {
    const store = await ensureStore();

    if (store.runs.some((item) => item.adapter === input.adapter)) {
      throw new Error(`Source-job adapter already exists: ${input.adapter}`);
    }

    const nextStore: SourceJobMemoryStore = {
      ...store,
      runs: [
        ...store.runs,
        {
          adapter: input.adapter,
          domain: input.domain,
          cadence: input.cadence,
          status: input.status,
          queueDepth: input.queueDepth,
          retryBacklog: input.retryBacklog,
          lastRunAt: new Date().toISOString(),
          nextRunWindow: input.nextRunWindow,
          cachePosture: input.cachePosture,
          nextStep: input.nextStep,
        },
      ],
    };

    await persistStore(nextStore);
    return getSourceJobMemory();
  });

  sourceJobMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function removeSourceJobRun(input: RemoveSourceJobRunInput): Promise<SourceJobMemory> {
  const mutation = sourceJobMutationQueue.then(async () => {
    const store = await ensureStore();

    if (!store.runs.some((item) => item.adapter === input.adapter)) {
      throw new Error(`Unknown source-job adapter: ${input.adapter}`);
    }

    const nextStore: SourceJobMemoryStore = {
      ...store,
      runs: store.runs.filter((item) => item.adapter !== input.adapter),
    };

    await persistStore(nextStore);
    return getSourceJobMemory();
  });

  sourceJobMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}
