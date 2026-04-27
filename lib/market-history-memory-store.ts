import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { canUseFileFallback, getFileFallbackDisabledMessage } from "@/lib/durable-data-runtime";
import { getDurableJobSystemReadiness } from "@/lib/durable-jobs";
import { getDurableMarketHistoryTelemetry } from "@/lib/market-data-durable-store";
import { getMarketDataTargetStatuses } from "@/lib/market-data-targets";

export type MarketHistoryLane = {
  lane: string;
  status: "Ready" | "In progress" | "Blocked" | "Planned";
  retainedSeries: number;
  verifiedSeries: number;
  previewSeries: number;
  refreshWindow: string;
  continuityNote: string;
  nextStep: string;
};

export type SaveMarketHistoryLaneInput = {
  lane: string;
  status: MarketHistoryLane["status"];
  retainedSeries: number;
  verifiedSeries: number;
  previewSeries: number;
  refreshWindow: string;
  continuityNote: string;
  nextStep: string;
};

export type AddMarketHistoryLaneInput = SaveMarketHistoryLaneInput;

export type RemoveMarketHistoryLaneInput = {
  lane: string;
};

export type MarketHistoryBacklogLane = {
  lane: string;
  status: "Ready" | "In progress" | "Blocked" | "Planned";
  note: string;
};

type MarketHistoryMemoryStore = {
  version: number;
  lanes: MarketHistoryLane[];
  backlogLanes: MarketHistoryBacklogLane[];
};

export type MarketHistoryMemory = {
  lanes: MarketHistoryLane[];
  backlogLanes: MarketHistoryBacklogLane[];
  summary: {
    retainedSeries: number;
    verifiedSeries: number;
    previewSeries: number;
    activeHistoryLanes: number;
    blockedBacklogLanes: number;
  };
};

const STORE_PATH = path.join(process.cwd(), "data", "market-history-memory.json");
const STORE_VERSION = 1;
let marketHistoryMutationQueue = Promise.resolve();

async function buildDefaultStore(): Promise<MarketHistoryMemoryStore> {
  const targetStatuses = await getMarketDataTargetStatuses();
  const stockQuoteRows = targetStatuses.filter((item) => item.type === "stock_quote");
  const stockChartRows = targetStatuses.filter((item) => item.type === "stock_chart");
  const fundRows = targetStatuses.filter((item) => item.type === "fund_nav");
  const indexRows = targetStatuses.filter((item) => item.type === "index_snapshot");

  const lanes: MarketHistoryLane[] = [
    {
      lane: "Stock delayed quote and OHLCV history",
      status: "In progress",
      retainedSeries: stockQuoteRows.length + stockChartRows.length,
      verifiedSeries: stockChartRows.filter((item) => item.status === "verified").length,
      previewSeries: stockChartRows.filter((item) => item.status !== "verified").length,
      refreshWindow: "End-of-day plus verified provider sync",
      continuityNote:
        "Dedicated stock chart routes now have a clearer history posture, but retained OHLCV still depends on source-entry or partial provider writes instead of a durable market-history table.",
      nextStep:
        "Write stock quote snapshots and OHLCV bars into a durable history table so public stock routes stop depending on seed bars and preview-only series continuity.",
    },
    {
      lane: "Index snapshot and chart continuity",
      status: "In progress",
      retainedSeries: indexRows.length,
      verifiedSeries: indexRows.filter((item) => item.status === "verified").length,
      previewSeries: indexRows.filter((item) => item.status !== "verified").length,
      refreshWindow: "Intraday-ready once provider sync is active",
      continuityNote:
        "Native index chart presentation is stronger now, but retained index breadth and chart continuity still need a durable snapshot history layer.",
      nextStep:
        "Persist tracked index snapshots and breadth history into a reusable table that can feed both charts and report-style archive routes.",
    },
    {
      lane: "Fund NAV and factsheet chronology",
      status: "Planned",
      retainedSeries: fundRows.length,
      verifiedSeries: fundRows.filter((item) => item.status === "verified").length,
      previewSeries: fundRows.filter((item) => item.status !== "verified").length,
      refreshWindow: "End-of-day NAV refresh",
      continuityNote:
        "Fund pages now have delayed NAV and factsheet fallback, but retained NAV series and commentary chronology still need durable history persistence.",
      nextStep:
        "Write fund NAV snapshots and factsheet-linked chronology into a reusable history store for detail, compare, and archive routes.",
    },
  ];

  const backlogLanes: MarketHistoryBacklogLane[] = [
    {
      lane: "Market-history retention policy",
      status: "Planned",
      note: "The platform still needs explicit retention rules for quote bars, index breadth, fund NAV, and archive snapshots so chart continuity stays predictable.",
    },
    {
      lane: "Backfill and replay jobs",
      status: "Blocked",
      note: "Worker-backed replay jobs are still missing, so history backfills and gap repair cannot run automatically yet.",
    },
    {
      lane: "Cross-route chart cache reuse",
      status: "Planned",
      note: "The same history series should eventually feed homepage, markets, detail routes, and admin audit surfaces from one durable cache layer.",
    },
  ];

  return {
    version: STORE_VERSION,
    lanes,
    backlogLanes,
  };
}

function buildTelemetryMemory(telemetry: NonNullable<Awaited<ReturnType<typeof getDurableMarketHistoryTelemetry>>>): MarketHistoryMemory {
  const durableJobs = getDurableJobSystemReadiness();
  const lanes: MarketHistoryLane[] = [
    {
      lane: "Stock delayed quote and OHLCV history",
      status: telemetry.stockHistory.retainedSeries > 0 ? "Ready" : "In progress",
      retainedSeries: telemetry.stockHistory.retainedSeries,
      verifiedSeries: telemetry.stockHistory.verifiedSeries,
      previewSeries: telemetry.stockHistory.previewSeries,
      refreshWindow: "Provider-backed refresh plus retained OHLCV cadence",
      continuityNote:
        telemetry.stockHistory.retainedSeries > 0
          ? "This lane now derives directly from durable stock quote and OHLCV telemetry instead of an operator-maintained memory card."
          : "Durable stock quote and OHLCV history is wired, but live retained rows still need to arrive through the provider-backed refresh path.",
      nextStep:
        telemetry.stockHistory.retainedSeries > 0
          ? "Keep the provider-backed refresh healthy and extend retained stock history coverage as more symbols move into verified execution."
          : "Run a provider-backed refresh that writes durable stock quote and OHLCV rows.",
    },
    {
      lane: "Index snapshot and chart continuity",
      status: telemetry.indexHistory.retainedSeries > 0 ? "Ready" : "In progress",
      retainedSeries: telemetry.indexHistory.retainedSeries,
      verifiedSeries: telemetry.indexHistory.verifiedSeries,
      previewSeries: telemetry.indexHistory.previewSeries,
      refreshWindow: "Index snapshot refresh plus stored roster continuity",
      continuityNote:
        telemetry.indexHistory.retainedSeries > 0
          ? "This lane now reads durable index snapshot telemetry directly from the retained status tables."
          : "Index history plumbing exists, but retained index snapshots still need to be written through the provider-backed refresh path.",
      nextStep:
        telemetry.indexHistory.retainedSeries > 0
          ? "Keep durable index snapshot refresh healthy and expand verified index coverage."
          : "Persist the first verified index snapshots into the durable tables.",
    },
    {
      lane: "Fund NAV and factsheet chronology",
      status: telemetry.fundHistory.retainedSeries > 0 ? "Ready" : "In progress",
      retainedSeries: telemetry.fundHistory.retainedSeries,
      verifiedSeries: telemetry.fundHistory.verifiedSeries,
      previewSeries: telemetry.fundHistory.previewSeries,
      refreshWindow: "End-of-day NAV refresh and factsheet retention",
      continuityNote:
        telemetry.fundHistory.retainedSeries > 0
          ? "This lane now derives directly from durable fund NAV telemetry instead of a hand-edited chronology desk."
          : "Fund chronology plumbing exists, but retained NAV history still needs to be written through the real refresh path.",
      nextStep:
        telemetry.fundHistory.retainedSeries > 0
          ? "Keep durable fund NAV refresh healthy and attach richer factsheet chronology as source activation expands."
          : "Persist the first verified fund NAV rows into the durable tables.",
    },
  ];

  const backlogLanes: MarketHistoryBacklogLane[] = [
    {
      lane: "History telemetry source",
      status: "Ready",
      note: "The market-history desk now derives retained and verified counts from the durable market tables instead of accepting manual lane edits.",
    },
    {
      lane: "Backfill and replay jobs",
      status: durableJobs.configured ? "In progress" : "Blocked",
      note: durableJobs.configured
        ? "Trigger-backed refresh execution exists. Dedicated gap-repair and backfill orchestration still belongs to provider activation, not manual history cards."
        : "Trigger-backed refresh execution is still missing, so dedicated history backfill and replay cannot be trusted yet.",
    },
    {
      lane: "Cross-route chart cache reuse",
      status: "In progress",
      note: "Public stock, fund, and index routes already share durable history readers; broader cache reuse can keep hardening as verified provider coverage expands.",
    },
  ];

  return toMemory({
    version: STORE_VERSION,
    lanes,
    backlogLanes,
  });
}

async function readStore(): Promise<MarketHistoryMemoryStore | null> {
  if (!canUseFileFallback()) {
    return null;
  }

  try {
    const content = await readFile(STORE_PATH, "utf8");
    return JSON.parse(content) as MarketHistoryMemoryStore;
  } catch {
    return null;
  }
}

async function writeStore(store: MarketHistoryMemoryStore) {
  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Market history persistence"));
  }

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function ensureStore() {
  if (!canUseFileFallback()) {
    return buildDefaultStore();
  }

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

function toMemory(store: MarketHistoryMemoryStore): MarketHistoryMemory {
  const retainedSeries = store.lanes.reduce((sum, lane) => sum + lane.retainedSeries, 0);
  const verifiedSeries = store.lanes.reduce((sum, lane) => sum + lane.verifiedSeries, 0);
  const previewSeries = store.lanes.reduce((sum, lane) => sum + lane.previewSeries, 0);

  return {
    lanes: store.lanes,
    backlogLanes: store.backlogLanes,
    summary: {
      retainedSeries,
      verifiedSeries,
      previewSeries,
      activeHistoryLanes: store.lanes.filter((lane) => lane.status === "Ready" || lane.status === "In progress").length,
      blockedBacklogLanes: store.backlogLanes.filter((lane) => lane.status === "Blocked").length,
    },
  };
}

export async function getMarketHistoryMemory(): Promise<MarketHistoryMemory> {
  const telemetry = await getDurableMarketHistoryTelemetry();

  if (telemetry) {
    return buildTelemetryMemory(telemetry);
  }

  const store = await ensureStore();
  return toMemory(store);
}

export async function saveMarketHistoryLane(input: SaveMarketHistoryLaneInput): Promise<MarketHistoryMemory> {
  if (await getDurableMarketHistoryTelemetry()) {
    throw new Error("Market-history lanes now derive from durable table telemetry and no longer accept manual edits.");
  }

  const mutation = marketHistoryMutationQueue.then(async () => {
    const store = await ensureStore();
    let matchedLane = false;

    const nextStore: MarketHistoryMemoryStore = {
      ...store,
      lanes: store.lanes.map((lane) => {
        if (lane.lane !== input.lane) {
          return lane;
        }

        matchedLane = true;

        return {
          ...lane,
          status: input.status,
          retainedSeries: sanitizeCount(input.retainedSeries),
          verifiedSeries: sanitizeCount(input.verifiedSeries),
          previewSeries: sanitizeCount(input.previewSeries),
          refreshWindow: input.refreshWindow,
          continuityNote: input.continuityNote,
          nextStep: input.nextStep,
        };
      }),
    };

    if (!matchedLane) {
      throw new Error(`Unknown market-history lane: ${input.lane}`);
    }

    await writeStore(nextStore);
    return toMemory(nextStore);
  });

  marketHistoryMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function addMarketHistoryLane(input: AddMarketHistoryLaneInput): Promise<MarketHistoryMemory> {
  if (await getDurableMarketHistoryTelemetry()) {
    throw new Error("Market-history lanes now derive from durable table telemetry and no longer accept manual edits.");
  }

  const mutation = marketHistoryMutationQueue.then(async () => {
    const store = await ensureStore();

    if (store.lanes.some((lane) => lane.lane === input.lane)) {
      throw new Error(`Market-history lane already exists: ${input.lane}`);
    }

    const nextStore: MarketHistoryMemoryStore = {
      ...store,
      lanes: [
        ...store.lanes,
        {
          lane: input.lane,
          status: input.status,
          retainedSeries: sanitizeCount(input.retainedSeries),
          verifiedSeries: sanitizeCount(input.verifiedSeries),
          previewSeries: sanitizeCount(input.previewSeries),
          refreshWindow: input.refreshWindow,
          continuityNote: input.continuityNote,
          nextStep: input.nextStep,
        },
      ],
    };

    await writeStore(nextStore);
    return toMemory(nextStore);
  });

  marketHistoryMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function removeMarketHistoryLane(input: RemoveMarketHistoryLaneInput): Promise<MarketHistoryMemory> {
  if (await getDurableMarketHistoryTelemetry()) {
    throw new Error("Market-history lanes now derive from durable table telemetry and no longer accept manual edits.");
  }

  const mutation = marketHistoryMutationQueue.then(async () => {
    const store = await ensureStore();

    if (!store.lanes.some((lane) => lane.lane === input.lane)) {
      throw new Error(`Unknown market-history lane: ${input.lane}`);
    }

    const nextStore: MarketHistoryMemoryStore = {
      ...store,
      lanes: store.lanes.filter((lane) => lane.lane !== input.lane),
    };

    await writeStore(nextStore);
    return toMemory(nextStore);
  });

  marketHistoryMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}
