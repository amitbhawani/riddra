import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { canUseFileFallback, getFileFallbackDisabledMessage } from "@/lib/durable-data-runtime";

export type ArchiveRefreshRun = {
  family: string;
  sourceClass: string;
  cadence: string;
  status: "Ready" | "In progress" | "Blocked" | "Planned";
  pendingWrites: number;
  documentBacklog: number;
  lastWriteAt: string;
  nextWindow: string;
  coveragePosture: string;
  nextStep: string;
};

export type ArchiveContinuityLane = {
  lane: string;
  continuityStatus: "Healthy" | "Partial" | "Cold";
  retainedEvents: number;
  note: string;
};

export type SaveArchiveRefreshRunInput = {
  family: string;
  status: "Ready" | "In progress" | "Blocked" | "Planned";
  pendingWrites: number;
  documentBacklog: number;
  nextWindow: string;
  nextStep: string;
};

export type AddArchiveRefreshRunInput = {
  family: string;
  sourceClass: string;
  cadence: string;
  status: "Ready" | "In progress" | "Blocked" | "Planned";
  pendingWrites: number;
  documentBacklog: number;
  nextWindow: string;
  coveragePosture: string;
  nextStep: string;
};

export type RemoveArchiveRefreshRunInput = {
  family: string;
};

type ArchiveRefreshStore = {
  version: number;
  runs: ArchiveRefreshRun[];
  continuityLanes: ArchiveContinuityLane[];
};

export type ArchiveRefreshMemory = {
  runs: ArchiveRefreshRun[];
  continuityLanes: ArchiveContinuityLane[];
  summary: {
    activeFamilies: number;
    blockedFamilies: number;
    pendingWrites: number;
    documentBacklog: number;
    healthyLanes: number;
  };
};

const STORE_PATH = path.join(process.cwd(), "data", "archive-refresh-memory.json");
const STORE_VERSION = 1;
let archiveRefreshMutationQueue = Promise.resolve();

const DEFAULT_RUNS: ArchiveRefreshRun[] = [
  {
    family: "Results archive",
    sourceClass: "NSE / BSE corporate actions",
    cadence: "Quarterly cadence",
    status: "In progress",
    pendingWrites: 6,
    documentBacklog: 4,
    lastWriteAt: "2026-04-15T09:10:00.000Z",
    nextWindow: "Next market close cycle",
    coveragePosture: "Results-calendar routes and event pages exist, but durable write-through archive history is still only partially automated.",
    nextStep: "Persist results-event entries as structured archive rows and link them into company and learn-event memory chains.",
  },
  {
    family: "FII / DII archive",
    sourceClass: "NSE FII/DII report",
    cadence: "Daily end-of-day",
    status: "In progress",
    pendingWrites: 3,
    documentBacklog: 0,
    lastWriteAt: "2026-04-15T10:00:00.000Z",
    nextWindow: "Next published daily report",
    coveragePosture: "The route is live, but recurring report ingestion and long-range archive tables are still not durable.",
    nextStep: "Promote daily FII/DII report snapshots into a retained archive chain with date-indexed rows and source metadata.",
  },
  {
    family: "Fund factsheets and commentary",
    sourceClass: "AMC factsheets / AMFI references",
    cadence: "Monthly plus event-driven",
    status: "Planned",
    pendingWrites: 5,
    documentBacklog: 8,
    lastWriteAt: "2026-04-12T08:30:00.000Z",
    nextWindow: "Next monthly factsheet cycle",
    coveragePosture: "Factsheet evidence is entering through source-entry, but recurring archive writes and historical commentary snapshots still need a dedicated backend pass.",
    nextStep: "Capture factsheet evidence, manager commentary, and allocation shifts as structured archive rows for fund detail and compare routes.",
  },
  {
    family: "IPO filings and lifecycle archive",
    sourceClass: "SEBI / exchange documents",
    cadence: "Event-driven",
    status: "Blocked",
    pendingWrites: 7,
    documentBacklog: 10,
    lastWriteAt: "2026-04-11T12:00:00.000Z",
    nextWindow: "On next DRHP/RHP publication",
    coveragePosture: "IPO route families are broad, but archive continuity still depends on manual seeding and needs durable filing-history persistence.",
    nextStep: "Connect official filing ingest and document archive persistence before IPO-to-listed-stock lifecycle memory can be considered durable.",
  },
];

const DEFAULT_CONTINUITY_LANES: ArchiveContinuityLane[] = [
  {
    lane: "Results and event history",
    continuityStatus: "Partial",
    retainedEvents: 9,
    note: "Event routes now exist, but historical write-through still needs recurring source refresh plus retained archive rows.",
  },
  {
    lane: "FII / DII daily tape",
    continuityStatus: "Partial",
    retainedEvents: 1,
    note: "The first report route exists, but daily report retention and search-ready history still need durable writes.",
  },
  {
    lane: "Fund factsheet memory",
    continuityStatus: "Partial",
    retainedEvents: 6,
    note: "Factsheet evidence lanes are present, but monthly archive continuity still depends on manual evidence entry.",
  },
  {
    lane: "IPO filing archive",
    continuityStatus: "Cold",
    retainedEvents: 4,
    note: "IPO issue pages exist, but recurring filing capture and document archive writes are still not automated.",
  },
];

const DEFAULT_STORE: ArchiveRefreshStore = {
  version: STORE_VERSION,
  runs: DEFAULT_RUNS,
  continuityLanes: DEFAULT_CONTINUITY_LANES,
};

async function readStore(): Promise<ArchiveRefreshStore> {
  if (!canUseFileFallback()) {
    return DEFAULT_STORE;
  }

  try {
    const content = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(content) as Partial<ArchiveRefreshStore>;

    return {
      version: typeof parsed.version === "number" ? parsed.version : STORE_VERSION,
      runs: Array.isArray(parsed.runs) && parsed.runs.length ? (parsed.runs as ArchiveRefreshRun[]) : DEFAULT_RUNS,
      continuityLanes:
        Array.isArray(parsed.continuityLanes) && parsed.continuityLanes.length
          ? (parsed.continuityLanes as ArchiveContinuityLane[])
          : DEFAULT_CONTINUITY_LANES,
    };
  } catch {
    return DEFAULT_STORE;
  }
}

async function writeStore(store: ArchiveRefreshStore) {
  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Archive refresh memory"));
  }

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function ensureStore() {
  if (!canUseFileFallback()) {
    return DEFAULT_STORE;
  }

  const storeExists = await access(STORE_PATH)
    .then(() => true)
    .catch(() => false);
  const store = await readStore();

  if (storeExists && store.runs.length && store.continuityLanes.length) {
    return store;
  }

  await writeStore(DEFAULT_STORE);
  return DEFAULT_STORE;
}

export async function getArchiveRefreshMemory(): Promise<ArchiveRefreshMemory> {
  const store = await ensureStore();
  const pendingWrites = store.runs.reduce((sum, item) => sum + item.pendingWrites, 0);
  const documentBacklog = store.runs.reduce((sum, item) => sum + item.documentBacklog, 0);

  return {
    runs: store.runs,
    continuityLanes: store.continuityLanes,
    summary: {
      activeFamilies: store.runs.filter((item) => item.status === "Ready" || item.status === "In progress").length,
      blockedFamilies: store.runs.filter((item) => item.status === "Blocked").length,
      pendingWrites,
      documentBacklog,
      healthyLanes: store.continuityLanes.filter((item) => item.continuityStatus === "Healthy").length,
    },
  };
}

export async function saveArchiveRefreshRun(input: SaveArchiveRefreshRunInput): Promise<ArchiveRefreshMemory> {
  const mutation = archiveRefreshMutationQueue.then(async () => {
    const store = await ensureStore();
    const runIndex = store.runs.findIndex((item) => item.family === input.family);

    if (runIndex === -1) {
      return getArchiveRefreshMemory();
    }

    const existing = store.runs[runIndex];
    const updatedRun: ArchiveRefreshRun = {
      ...existing,
      status: input.status,
      pendingWrites: input.pendingWrites,
      documentBacklog: input.documentBacklog,
      lastWriteAt: new Date().toISOString(),
      nextWindow: input.nextWindow,
      nextStep: input.nextStep,
    };

    const nextContinuityLanes = store.continuityLanes.map((lane) => {
      const familyKey = input.family.toLowerCase();
      const laneKey = lane.lane.toLowerCase();
      const matches =
        (familyKey.includes("results") && laneKey.includes("results")) ||
        (familyKey.includes("fii / dii") && laneKey.includes("fii / dii")) ||
        (familyKey.includes("factsheets") && laneKey.includes("factsheet")) ||
        (familyKey.includes("ipo") && laneKey.includes("ipo"));

      if (!matches) {
        return lane;
      }

      return {
        ...lane,
        continuityStatus:
          input.status === "Ready" ? "Healthy" : input.status === "In progress" ? "Partial" : input.status === "Blocked" ? "Cold" : lane.continuityStatus,
        retainedEvents: Math.max(lane.retainedEvents, lane.retainedEvents + (input.status === "Ready" ? 2 : 1)),
        note:
          input.status === "Ready"
            ? "Operator-updated archive run now treats this lane as healthier preview continuity while official-source automation is still being hardened."
            : lane.note,
      };
    });

    const nextStore: ArchiveRefreshStore = {
      ...store,
      runs: store.runs.map((item, index) => (index === runIndex ? updatedRun : item)),
      continuityLanes: nextContinuityLanes,
    };

    await writeStore(nextStore);
    return getArchiveRefreshMemory();
  });

  archiveRefreshMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function addArchiveRefreshRun(input: AddArchiveRefreshRunInput): Promise<ArchiveRefreshMemory> {
  const mutation = archiveRefreshMutationQueue.then(async () => {
    const store = await ensureStore();

    if (store.runs.some((item) => item.family === input.family)) {
      throw new Error(`Archive-refresh family already exists: ${input.family}`);
    }

    const nextContinuityLaneLabel = `${input.family} continuity`;
    const nextStore: ArchiveRefreshStore = {
      ...store,
      runs: [
        ...store.runs,
        {
          family: input.family,
          sourceClass: input.sourceClass,
          cadence: input.cadence,
          status: input.status,
          pendingWrites: input.pendingWrites,
          documentBacklog: input.documentBacklog,
          lastWriteAt: new Date().toISOString(),
          nextWindow: input.nextWindow,
          coveragePosture: input.coveragePosture,
          nextStep: input.nextStep,
        },
      ],
      continuityLanes: store.continuityLanes.some((lane) => lane.lane === nextContinuityLaneLabel)
        ? store.continuityLanes
        : [
            ...store.continuityLanes,
            {
              lane: nextContinuityLaneLabel,
              continuityStatus:
                input.status === "Ready" ? "Healthy" : input.status === "In progress" ? "Partial" : "Cold",
              retainedEvents: Math.max(input.pendingWrites, 0),
              note: input.coveragePosture,
            },
          ],
    };

    await writeStore(nextStore);
    return getArchiveRefreshMemory();
  });

  archiveRefreshMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function removeArchiveRefreshRun(input: RemoveArchiveRefreshRunInput): Promise<ArchiveRefreshMemory> {
  const mutation = archiveRefreshMutationQueue.then(async () => {
    const store = await ensureStore();

    if (!store.runs.some((item) => item.family === input.family)) {
      throw new Error(`Unknown archive-refresh family: ${input.family}`);
    }

    const nextStore: ArchiveRefreshStore = {
      ...store,
      runs: store.runs.filter((item) => item.family !== input.family),
    };

    await writeStore(nextStore);
    return getArchiveRefreshMemory();
  });

  archiveRefreshMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}
