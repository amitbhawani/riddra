import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { canUseFileFallback, getFileFallbackDisabledMessage } from "@/lib/durable-data-runtime";
import { readDurableGlobalStateLane, writeDurableGlobalStateLane } from "@/lib/global-state-durable-store";

export type DerivativesChainSnapshot = {
  symbol: string;
  expiry: string;
  snapshotState: "Preview snapshot" | "Analytics ready" | "Awaiting source";
  strikeWindow: string;
  nextRefresh: string;
  note: string;
};

export type DerivativesAnalyticsLane = {
  lane: string;
  status: "In progress" | "Planned" | "Blocked";
  retainedSessions: number;
  nextJob: string;
  note: string;
};

export type DerivativesBacklogLane = {
  lane: string;
  status: "In progress" | "Planned" | "Blocked";
  note: string;
};

export type SaveDerivativesSnapshotInput = {
  symbol: string;
  expiry: string;
  snapshotState: DerivativesChainSnapshot["snapshotState"];
  strikeWindow: string;
  nextRefresh: string;
  note: string;
};

export type AddDerivativesSnapshotInput = SaveDerivativesSnapshotInput;

export type RemoveDerivativesSnapshotInput = {
  symbol: string;
  expiry: string;
};

export type SaveDerivativesAnalyticsLaneInput = {
  lane: string;
  status: DerivativesAnalyticsLane["status"];
  retainedSessions: number;
  nextJob: string;
  note: string;
};

export type AddDerivativesAnalyticsLaneInput = SaveDerivativesAnalyticsLaneInput;

export type RemoveDerivativesAnalyticsLaneInput = {
  lane: string;
};

type DerivativesMemoryStore = {
  version: number;
  snapshots: DerivativesChainSnapshot[];
  analyticsLanes: DerivativesAnalyticsLane[];
  backlogLanes: DerivativesBacklogLane[];
};

type DerivativesGlobalState = {
  updatedAt: string;
  snapshots: DerivativesChainSnapshot[];
  analyticsLanes: DerivativesAnalyticsLane[];
  backlogLanes: DerivativesBacklogLane[];
};

export type DerivativesMemory = {
  updatedAt: string;
  snapshots: DerivativesChainSnapshot[];
  analyticsLanes: DerivativesAnalyticsLane[];
  backlogLanes: DerivativesBacklogLane[];
  summary: {
    currentMode: string;
    derivativesFeed: string;
    nextActivation: string;
    retainedSnapshots: number;
    analyticsLanes: number;
    blockedBacklogLanes: number;
  };
  rules: string[];
};

const STORE_PATH = path.join(process.cwd(), "data", "derivatives-memory.json");
const STORE_VERSION = 1;
const DURABLE_GLOBAL_LANE = "derivatives_memory" as const;
let derivativesMutationQueue = Promise.resolve();

function buildDefaultStore(): DerivativesMemoryStore {
  return {
    version: STORE_VERSION,
    snapshots: [],
    analyticsLanes: [
      {
        lane: "OI history and strike-ladder snapshots",
        status: "In progress",
        retainedSessions: 3,
        nextJob: "Write expiry-aware strike snapshots into one durable store",
        note: "The first memory layer now tracks which strike windows and expiry clusters matter, but it still needs provider-backed OI history instead of preview-only posture.",
      },
      {
        lane: "PCR, max-pain, and dominance analytics",
        status: "In progress",
        retainedSessions: 2,
        nextJob: "Persist derived analytics alongside chain snapshots",
        note: "Interpretation should come from stored analytics tables rather than recalculating everything from transient page state.",
      },
      {
        lane: "IV and Greeks retention",
        status: "Planned",
        retainedSessions: 0,
        nextJob: "Persist volatility and Greeks fields once source licensing is clear",
        note: "Serious options workflows need volatility and Greeks continuity, but that still depends on source scope and payload design.",
      },
    ],
    backlogLanes: [
      {
        lane: "Derivatives refresh jobs",
        status: "Blocked",
        note: "Recurring option-chain refresh, expiry rollover, and replay jobs still need true worker execution outside the current preview layer.",
      },
      {
        lane: "Trader workstation linkage",
        status: "In progress",
        note: "Charts, indices, scanner presets, and option-chain reads should all point at one derivatives memory layer instead of keeping separate static interpretation copy.",
      },
      {
        lane: "Expiry and contract audit history",
        status: "Planned",
        note: "Operators still need durable expiry rotation history and contract-level auditability before derivatives can be trusted beyond a controlled preview.",
      },
    ],
  };
}

async function readStore(): Promise<DerivativesMemoryStore | null> {
  if (!canUseFileFallback()) {
    return buildDefaultStore();
  }

  try {
    const content = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(content) as Partial<DerivativesMemoryStore>;
    return {
      version: typeof parsed.version === "number" ? parsed.version : STORE_VERSION,
      snapshots: Array.isArray(parsed.snapshots)
        ? (parsed.snapshots as DerivativesChainSnapshot[]).map((snapshot) => ({ ...snapshot }))
        : [],
      analyticsLanes: Array.isArray(parsed.analyticsLanes)
        ? (parsed.analyticsLanes as DerivativesAnalyticsLane[]).map((lane) => ({ ...lane }))
        : [],
      backlogLanes: Array.isArray(parsed.backlogLanes)
        ? (parsed.backlogLanes as DerivativesBacklogLane[]).map((lane) => ({ ...lane }))
        : [],
    };
  } catch {
    return null;
  }
}

async function writeStore(store: DerivativesMemoryStore) {
  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Derivatives memory persistence"));
  }

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function readDurableDerivativesState() {
  const payload = await readDurableGlobalStateLane<DerivativesGlobalState>(DURABLE_GLOBAL_LANE);
  if (!payload) {
    return null;
  }

  return {
    updatedAt: payload.updatedAt,
    snapshots: (payload.snapshots ?? []).map((snapshot) => ({ ...snapshot })),
    analyticsLanes: (payload.analyticsLanes ?? []).map((lane) => ({ ...lane })),
    backlogLanes: (payload.backlogLanes ?? []).map((lane) => ({ ...lane })),
  };
}

async function writeDurableDerivativesState(store: DerivativesMemoryStore) {
  return writeDurableGlobalStateLane(DURABLE_GLOBAL_LANE, {
    updatedAt: new Date().toISOString(),
    snapshots: store.snapshots.map((snapshot) => ({ ...snapshot })),
    analyticsLanes: store.analyticsLanes.map((lane) => ({ ...lane })),
    backlogLanes: store.backlogLanes.map((lane) => ({ ...lane })),
  });
}

async function persistStore(store: DerivativesMemoryStore) {
  const wroteDurableState = await writeDurableDerivativesState(store);

  if (wroteDurableState) {
    if (canUseFileFallback()) {
      await writeStore(store);
    }
    return;
  }

  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Derivatives memory persistence"));
  }

  await writeStore(store);
}

async function ensureStore() {
  const store = await readStore();
  const durableState = await readDurableDerivativesState();

  if (durableState) {
    return {
      version: store?.version ?? STORE_VERSION,
      snapshots: durableState.snapshots,
      analyticsLanes: durableState.analyticsLanes,
      backlogLanes: durableState.backlogLanes,
    };
  }

  if (!canUseFileFallback()) {
    return buildDefaultStore();
  }

  const storeExists = await access(STORE_PATH)
    .then(() => true)
    .catch(() => false);

  if (storeExists && store?.analyticsLanes?.length && store?.backlogLanes?.length) {
    const legacySeededSnapshots: DerivativesChainSnapshot[] = [
      {
        symbol: "Nifty 50",
        expiry: "Apr 30, 2026 weekly",
        snapshotState: "Analytics ready",
        strikeWindow: "24,100 - 24,700",
        nextRefresh: "End-of-day provider sync",
        note: "The first derivatives lane should keep ATM-to-OTM strike posture, max-pain context, and OI clustering visible even before live chain activation is complete.",
      },
      {
        symbol: "Bank Nifty",
        expiry: "Apr 30, 2026 weekly",
        snapshotState: "Preview snapshot",
        strikeWindow: "52,000 - 53,200",
        nextRefresh: "Provider plus analytics replay",
        note: "High-volatility index options need a persisted strike window and analytics handoff so workstation reads do not reset into generic preview text.",
      },
      {
        symbol: "Fin Nifty",
        expiry: "Apr 30, 2026 weekly",
        snapshotState: "Awaiting source",
        strikeWindow: "24,250 - 24,900",
        nextRefresh: "Awaiting verified derivatives source",
        note: "This chain still needs a cleaner payload source before Riddra can trust expiry, strike, and OI continuity outside a preview shell.",
      },
    ];

    const nextSnapshots = (store.snapshots ?? []).filter(
      (snapshot) =>
        !legacySeededSnapshots.some(
          (seeded) =>
            snapshot.symbol === seeded.symbol &&
            snapshot.expiry === seeded.expiry &&
            snapshot.snapshotState === seeded.snapshotState &&
            snapshot.strikeWindow === seeded.strikeWindow &&
            snapshot.nextRefresh === seeded.nextRefresh &&
            snapshot.note === seeded.note,
        ),
    );

    if (nextSnapshots.length !== (store.snapshots ?? []).length) {
      const nextStore = {
        ...store,
        snapshots: nextSnapshots,
      };
      await persistStore(nextStore);
      return nextStore;
    }

    await writeDurableDerivativesState(store);
    return {
      ...store,
      snapshots: store.snapshots ?? [],
    };
  }

  const nextStore = buildDefaultStore();
  await persistStore(nextStore);
  return nextStore;
}

export async function getDerivativesMemory(): Promise<DerivativesMemory> {
  const store = await ensureStore();

  return {
    updatedAt: new Date().toISOString(),
    snapshots: store.snapshots,
    analyticsLanes: store.analyticsLanes,
    backlogLanes: store.backlogLanes,
    summary: {
      currentMode:
        store.snapshots.length > 0
          ? "Premium preview with retained snapshots"
          : "Premium preview with no live chain snapshots yet",
      derivativesFeed:
        store.snapshots.length > 0 ? "Retained derivatives snapshot store" : "Awaiting verified derivatives source",
      nextActivation: "Verified OI and expiry source",
      retainedSnapshots: store.snapshots.length,
      analyticsLanes: store.analyticsLanes.filter((lane) => lane.status !== "Planned").length,
      blockedBacklogLanes: store.backlogLanes.filter((lane) => lane.status === "Blocked").length,
    },
    rules: [
      "Derivatives storage should preserve expiry, strike-window, and OI context together so the workstation can reason across sessions instead of page loads.",
      "Option analytics should be stored as traceable derived outputs, not only recalculated on the client from temporary preview state.",
      "Expiry rollover, chain refresh, and fallback-access logic should remain auditable before any live derivatives promise is made to subscribers.",
    ],
  };
}

export async function saveDerivativesSnapshot(input: SaveDerivativesSnapshotInput): Promise<DerivativesMemory> {
  const mutation = derivativesMutationQueue.then(async () => {
    const store = await ensureStore();
    let matchedSnapshot = false;

    const nextStore: DerivativesMemoryStore = {
      ...store,
      snapshots: store.snapshots.map((snapshot) => {
        if (snapshot.symbol !== input.symbol || snapshot.expiry !== input.expiry) {
          return snapshot;
        }

        matchedSnapshot = true;
        return {
          ...snapshot,
          snapshotState: input.snapshotState,
          strikeWindow: input.strikeWindow,
          nextRefresh: input.nextRefresh,
          note: input.note,
        };
      }),
    };

    if (!matchedSnapshot) {
      throw new Error(`Unknown derivatives snapshot: ${input.symbol} · ${input.expiry}`);
    }

    await persistStore(nextStore);
    return getDerivativesMemory();
  });

  derivativesMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function addDerivativesSnapshot(input: AddDerivativesSnapshotInput): Promise<DerivativesMemory> {
  const mutation = derivativesMutationQueue.then(async () => {
    const store = await ensureStore();

    if (store.snapshots.some((snapshot) => snapshot.symbol === input.symbol && snapshot.expiry === input.expiry)) {
      throw new Error(`Derivatives snapshot already exists: ${input.symbol} · ${input.expiry}`);
    }

    const nextStore: DerivativesMemoryStore = {
      ...store,
      snapshots: [
        ...store.snapshots,
        {
          symbol: input.symbol,
          expiry: input.expiry,
          snapshotState: input.snapshotState,
          strikeWindow: input.strikeWindow,
          nextRefresh: input.nextRefresh,
          note: input.note,
        },
      ],
    };

    await persistStore(nextStore);
    return getDerivativesMemory();
  });

  derivativesMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function saveDerivativesAnalyticsLane(
  input: SaveDerivativesAnalyticsLaneInput,
): Promise<DerivativesMemory> {
  const mutation = derivativesMutationQueue.then(async () => {
    const store = await ensureStore();
    let matchedLane = false;

    const nextStore: DerivativesMemoryStore = {
      ...store,
      analyticsLanes: store.analyticsLanes.map((lane) => {
        if (lane.lane !== input.lane) {
          return lane;
        }

        matchedLane = true;
        return {
          ...lane,
          status: input.status,
          retainedSessions: Number.isFinite(input.retainedSessions) && input.retainedSessions >= 0 ? Math.round(input.retainedSessions) : lane.retainedSessions,
          nextJob: input.nextJob,
          note: input.note,
        };
      }),
    };

    if (!matchedLane) {
      throw new Error(`Unknown derivatives analytics lane: ${input.lane}`);
    }

    await persistStore(nextStore);
    return getDerivativesMemory();
  });

  derivativesMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function addDerivativesAnalyticsLane(
  input: AddDerivativesAnalyticsLaneInput,
): Promise<DerivativesMemory> {
  const mutation = derivativesMutationQueue.then(async () => {
    const store = await ensureStore();

    if (store.analyticsLanes.some((lane) => lane.lane === input.lane)) {
      throw new Error(`Derivatives analytics lane already exists: ${input.lane}`);
    }

    const nextStore: DerivativesMemoryStore = {
      ...store,
      analyticsLanes: [
        ...store.analyticsLanes,
        {
          lane: input.lane,
          status: input.status,
          retainedSessions:
            Number.isFinite(input.retainedSessions) && input.retainedSessions >= 0
              ? Math.round(input.retainedSessions)
              : 0,
          nextJob: input.nextJob,
          note: input.note,
        },
      ],
    };

    await persistStore(nextStore);
    return getDerivativesMemory();
  });

  derivativesMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function removeDerivativesSnapshot(input: RemoveDerivativesSnapshotInput): Promise<DerivativesMemory> {
  const mutation = derivativesMutationQueue.then(async () => {
    const store = await ensureStore();

    if (!store.snapshots.some((snapshot) => snapshot.symbol === input.symbol && snapshot.expiry === input.expiry)) {
      throw new Error(`Unknown derivatives snapshot: ${input.symbol} · ${input.expiry}`);
    }

    const nextStore: DerivativesMemoryStore = {
      ...store,
      snapshots: store.snapshots.filter(
        (snapshot) => snapshot.symbol !== input.symbol || snapshot.expiry !== input.expiry,
      ),
    };

    await persistStore(nextStore);
    return getDerivativesMemory();
  });

  derivativesMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function removeDerivativesAnalyticsLane(
  input: RemoveDerivativesAnalyticsLaneInput,
): Promise<DerivativesMemory> {
  const mutation = derivativesMutationQueue.then(async () => {
    const store = await ensureStore();

    if (!store.analyticsLanes.some((lane) => lane.lane === input.lane)) {
      throw new Error(`Unknown derivatives analytics lane: ${input.lane}`);
    }

    const nextStore: DerivativesMemoryStore = {
      ...store,
      analyticsLanes: store.analyticsLanes.filter((lane) => lane.lane !== input.lane),
    };

    await persistStore(nextStore);
    return getDerivativesMemory();
  });

  derivativesMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}
