import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { readDurableGlobalStateLane, writeDurableGlobalStateLane } from "@/lib/global-state-durable-store";

export type JobRunLane = "source_jobs" | "archive_refresh";
export type JobRunOutcome = "Succeeded" | "Queued" | "Needs review";

export type JobRunRecord = {
  id: string;
  lane: JobRunLane;
  target: string;
  outcome: JobRunOutcome;
  trigger: string;
  affectedRows: number;
  startedAt: string;
  finishedAt: string;
  nextWindow: string;
  resultSummary: string;
};

type JobRunStore = {
  version: number;
  runs: JobRunRecord[];
};

type JobRunGlobalState = {
  updatedAt: string;
  runs: JobRunRecord[];
};

export type JobRunMemory = {
  runs: JobRunRecord[];
  summary: {
    totalRuns: number;
    sourceRuns: number;
    archiveRuns: number;
    succeeded: number;
    queued: number;
    needsReview: number;
  };
};

export type RecordJobRunInput = {
  lane: JobRunLane;
  target: string;
  outcome: JobRunOutcome;
  trigger: string;
  affectedRows: number;
  nextWindow: string;
  resultSummary: string;
};

export type RemoveJobRunInput = {
  id: string;
  lane?: JobRunLane;
};

const STORE_PATH = path.join(process.cwd(), "data", "job-run-memory.json");
const STORE_VERSION = 1;
const DURABLE_GLOBAL_LANE = "job_run_log" as const;
let jobRunMutationQueue = Promise.resolve();
const LEGACY_PREVIEW_MARKERS = [
  "backend closure verification",
  "backend closure.",
  "preview provider-sync bridge verification",
] as const;

const DEFAULT_RUNS: JobRunRecord[] = [];

const DEFAULT_STORE: JobRunStore = {
  version: STORE_VERSION,
  runs: DEFAULT_RUNS,
};

function createRunId(lane: JobRunLane, target: string) {
  const slug = target
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `${lane}_${slug}_${Date.now()}`;
}

async function readStore(): Promise<JobRunStore> {
  try {
    const content = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(content) as Partial<JobRunStore>;
    const parsedRuns = Array.isArray(parsed.runs) ? (parsed.runs as JobRunRecord[]) : DEFAULT_RUNS;
    const sanitizedRuns = parsedRuns.filter(
      (run) => !LEGACY_PREVIEW_MARKERS.some((marker) => run.resultSummary.toLowerCase().includes(marker)),
    );

    return {
      version: typeof parsed.version === "number" ? parsed.version : STORE_VERSION,
      runs: sanitizedRuns.length ? sanitizedRuns : [],
    };
  } catch {
    return DEFAULT_STORE;
  }
}

async function writeStore(store: JobRunStore) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function readDurableJobRunState() {
  const payload = await readDurableGlobalStateLane<JobRunGlobalState>(DURABLE_GLOBAL_LANE);
  if (!payload) {
    return null;
  }

  return {
    updatedAt: payload.updatedAt,
    runs: (payload.runs ?? []).map((run) => ({ ...run })),
  };
}

async function writeDurableJobRunState(store: JobRunStore) {
  return writeDurableGlobalStateLane(DURABLE_GLOBAL_LANE, {
    updatedAt: new Date().toISOString(),
    runs: store.runs.map((run) => ({ ...run })),
  });
}

async function persistStore(store: JobRunStore) {
  await writeStore(store);
  await writeDurableJobRunState(store);
}

async function ensureStore() {
  const store = await readStore();
  const durableState = await readDurableJobRunState();

  if (durableState) {
    return {
      version: store.version ?? STORE_VERSION,
      runs: durableState.runs,
    };
  }

  const storeExists = await access(STORE_PATH)
    .then(() => true)
    .catch(() => false);

  if (storeExists && Array.isArray(store.runs)) {
    await writeDurableJobRunState(store);
    return store;
  }

  await persistStore(DEFAULT_STORE);
  return DEFAULT_STORE;
}

export async function getJobRunMemory(lane?: JobRunLane): Promise<JobRunMemory> {
  const store = await ensureStore();
  const runs = lane ? store.runs.filter((item) => item.lane === lane) : store.runs;

  return {
    runs: runs.sort((left, right) => Date.parse(right.finishedAt) - Date.parse(left.finishedAt)),
    summary: {
      totalRuns: runs.length,
      sourceRuns: runs.filter((item) => item.lane === "source_jobs").length,
      archiveRuns: runs.filter((item) => item.lane === "archive_refresh").length,
      succeeded: runs.filter((item) => item.outcome === "Succeeded").length,
      queued: runs.filter((item) => item.outcome === "Queued").length,
      needsReview: runs.filter((item) => item.outcome === "Needs review").length,
    },
  };
}

export async function recordJobRun(input: RecordJobRunInput): Promise<JobRunMemory> {
  const mutation = jobRunMutationQueue.then(async () => {
    const store = await ensureStore();
    const startedAt = new Date().toISOString();
    const record: JobRunRecord = {
      id: createRunId(input.lane, input.target),
      lane: input.lane,
      target: input.target,
      outcome: input.outcome,
      trigger: input.trigger,
      affectedRows: input.affectedRows,
      startedAt,
      finishedAt: startedAt,
      nextWindow: input.nextWindow,
      resultSummary: input.resultSummary,
    };

    const nextStore: JobRunStore = {
      ...store,
      runs: [record, ...store.runs].slice(0, 24),
    };

    await persistStore(nextStore);
    return getJobRunMemory(input.lane);
  });

  jobRunMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}

export async function removeJobRun(input: RemoveJobRunInput): Promise<JobRunMemory> {
  const mutation = jobRunMutationQueue.then(async () => {
    const store = await ensureStore();
    const id = input.id.trim();

    if (!id) {
      throw new Error("Run id is required.");
    }

    const removedRun = store.runs.find((item) => item.id === id && (!input.lane || item.lane === input.lane));

    if (!removedRun) {
      throw new Error(`Unknown run id: ${id}`);
    }

    const nextStore: JobRunStore = {
      ...store,
      runs: store.runs.filter((item) => item.id !== id),
    };

    await persistStore(nextStore);
    return getJobRunMemory(input.lane);
  });

  jobRunMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}
