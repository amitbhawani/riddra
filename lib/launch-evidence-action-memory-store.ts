import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import {
  getLaunchEvidenceRegistryRows,
  type LaunchEvidenceRegistryRow,
} from "@/lib/launch-evidence-registry";
import { canUseFileFallback, getFileFallbackDisabledMessage } from "@/lib/durable-data-runtime";

export type LaunchEvidenceActionStatus =
  | "Not started"
  | "Working"
  | "Captured"
  | "Needs refresh";

type StoredLaunchEvidenceAction = {
  itemId: string;
  actionStatus: LaunchEvidenceActionStatus;
  owner: string;
  proof: string;
  nextStep: string;
  note: string;
  updatedAt: string;
};

type LaunchEvidenceActionStore = {
  version: number;
  actions: StoredLaunchEvidenceAction[];
};

export type LaunchEvidenceActionItem = LaunchEvidenceRegistryRow & {
  actionStatus: LaunchEvidenceActionStatus;
  owner: string;
  proof: string;
  nextStep: string;
  operatorNote: string;
  updatedAt: string;
};

export type SaveLaunchEvidenceActionInput = {
  itemId: string;
  actionStatus: LaunchEvidenceActionStatus;
  owner: string;
  proof: string;
  nextStep: string;
  operatorNote: string;
};

export type LaunchEvidenceActionMemory = {
  items: LaunchEvidenceActionItem[];
  summary: {
    total: number;
    ready: number;
    inProgress: number;
    blocked: number;
    notStarted: number;
    working: number;
    captured: number;
    needsRefresh: number;
    assigned: number;
    proofAttached: number;
  };
};

const STORE_PATH = path.join(
  process.cwd(),
  "data",
  "launch-evidence-actions.json",
);
const STORE_VERSION = 1;
let launchEvidenceActionMutationQueue = Promise.resolve();

function getDefaultActionStatus(
  row: LaunchEvidenceRegistryRow,
): LaunchEvidenceActionStatus {
  if (row.status === "Ready") {
    return "Captured";
  }

  if (row.status === "Blocked") {
    return "Needs refresh";
  }

  return "Working";
}

function getDefaultNextStep(row: LaunchEvidenceRegistryRow) {
  if (row.status === "Ready") {
    return `Keep ${row.label} current and attach the latest verification proof before cutover.`;
  }

  if (row.status === "Blocked") {
    return `Clear the blocking gap for ${row.label} and capture fresh launch proof.`;
  }

  return `Finish the active proof pass for ${row.label} and attach the verification result.`;
}

function sortItems(items: LaunchEvidenceActionItem[]) {
  const actionOrder: Record<LaunchEvidenceActionStatus, number> = {
    "Needs refresh": 0,
    Working: 1,
    "Not started": 2,
    Captured: 3,
  };
  const evidenceOrder: Record<LaunchEvidenceRegistryRow["status"], number> = {
    Blocked: 0,
    "In progress": 1,
    Ready: 2,
  };

  return [...items].sort((left, right) => {
    const actionDelta = actionOrder[left.actionStatus] - actionOrder[right.actionStatus];
    if (actionDelta !== 0) return actionDelta;

    const evidenceDelta = evidenceOrder[left.status] - evidenceOrder[right.status];
    if (evidenceDelta !== 0) return evidenceDelta;

    return left.label.localeCompare(right.label);
  });
}

function toActionItem(
  row: LaunchEvidenceRegistryRow,
  action?: StoredLaunchEvidenceAction,
): LaunchEvidenceActionItem {
  return {
    ...row,
    actionStatus: action?.actionStatus ?? getDefaultActionStatus(row),
    owner: action?.owner ?? "",
    proof: action?.proof ?? "",
    nextStep: action?.nextStep ?? getDefaultNextStep(row),
    operatorNote: action?.note ?? "",
    updatedAt: action?.updatedAt ?? new Date().toISOString(),
  };
}

async function readStore(): Promise<LaunchEvidenceActionStore | null> {
  if (!canUseFileFallback()) {
    return null;
  }

  try {
    const content = await readFile(STORE_PATH, "utf8");
    return JSON.parse(content) as LaunchEvidenceActionStore;
  } catch {
    return null;
  }
}

async function writeStore(store: LaunchEvidenceActionStore) {
  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Launch evidence action persistence"));
  }

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function buildDefaultStore(): Promise<LaunchEvidenceActionStore> {
  const rows = getLaunchEvidenceRegistryRows();

  return {
    version: STORE_VERSION,
    actions: rows.map((row) => ({
      itemId: row.id,
      actionStatus: getDefaultActionStatus(row),
      owner: "",
      proof: "",
      nextStep: getDefaultNextStep(row),
      note: "",
      updatedAt: new Date().toISOString(),
    })),
  };
}

async function ensureStore() {
  if (!canUseFileFallback()) {
    return buildDefaultStore();
  }

  const storeExists = await access(STORE_PATH)
    .then(() => true)
    .catch(() => false);
  const store = await readStore();
  const rows = getLaunchEvidenceRegistryRows();

  if (!storeExists || !store?.actions?.length) {
    const nextStore = await buildDefaultStore();
    await writeStore(nextStore);
    return nextStore;
  }

  const storedActions = new Map(store.actions.map((action) => [action.itemId, action]));
  const nextStore: LaunchEvidenceActionStore = {
    version: STORE_VERSION,
    actions: rows.map((row) => {
      const existing = storedActions.get(row.id);

      if (!existing) {
        return {
          itemId: row.id,
          actionStatus: getDefaultActionStatus(row),
          owner: "",
          proof: "",
          nextStep: getDefaultNextStep(row),
          note: "",
          updatedAt: new Date().toISOString(),
        };
      }

      return {
        ...existing,
        nextStep: existing.nextStep || getDefaultNextStep(row),
      };
    }),
  };

  const needsRewrite =
    nextStore.actions.length !== store.actions.length ||
    nextStore.actions.some((action, index) => {
      const previous = store.actions[index];
      return (
        !previous ||
        previous.itemId !== action.itemId ||
        previous.nextStep !== action.nextStep
      );
    });

  if (needsRewrite) {
    await writeStore(nextStore);
  }

  return nextStore;
}

function toMemory(store: LaunchEvidenceActionStore): LaunchEvidenceActionMemory {
  const rows = getLaunchEvidenceRegistryRows();
  const actionMap = new Map(store.actions.map((action) => [action.itemId, action]));
  const items = sortItems(rows.map((row) => toActionItem(row, actionMap.get(row.id))));

  return {
    items,
    summary: {
      total: items.length,
      ready: items.filter((item) => item.status === "Ready").length,
      inProgress: items.filter((item) => item.status === "In progress").length,
      blocked: items.filter((item) => item.status === "Blocked").length,
      notStarted: items.filter((item) => item.actionStatus === "Not started").length,
      working: items.filter((item) => item.actionStatus === "Working").length,
      captured: items.filter((item) => item.actionStatus === "Captured").length,
      needsRefresh: items.filter((item) => item.actionStatus === "Needs refresh").length,
      assigned: items.filter((item) => Boolean(item.owner.trim())).length,
      proofAttached: items.filter((item) => Boolean(item.proof.trim())).length,
    },
  };
}

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export function toLaunchEvidenceActionCsv(items: LaunchEvidenceActionItem[]) {
  const header = [
    "id",
    "lane",
    "label",
    "status",
    "href",
    "note",
    "source",
    "actionStatus",
    "owner",
    "proof",
    "nextStep",
    "operatorNote",
    "updatedAt",
  ];
  const lines = items.map((item) =>
    [
      item.id,
      item.lane,
      item.label,
      item.status,
      item.href,
      item.note,
      item.source,
      item.actionStatus,
      item.owner,
      item.proof,
      item.nextStep,
      item.operatorNote,
      item.updatedAt,
    ]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}

export async function getLaunchEvidenceActionMemory(): Promise<LaunchEvidenceActionMemory> {
  const store = await ensureStore();
  return toMemory(store);
}

export async function saveLaunchEvidenceAction(
  input: SaveLaunchEvidenceActionInput,
): Promise<LaunchEvidenceActionMemory> {
  const mutation = launchEvidenceActionMutationQueue.then(async () => {
    const store = await ensureStore();
    let matchedItem = false;

    const nextStore: LaunchEvidenceActionStore = {
      ...store,
      actions: store.actions.map((action) => {
        if (action.itemId !== input.itemId) {
          return action;
        }

        matchedItem = true;

        return {
          ...action,
          actionStatus: input.actionStatus,
          owner: input.owner.trim(),
          proof: input.proof.trim(),
          nextStep:
            input.nextStep.trim() ||
            "Evidence update saved without a concrete next step yet.",
          note: input.operatorNote.trim(),
          updatedAt: new Date().toISOString(),
        };
      }),
    };

    if (!matchedItem) {
      throw new Error(`Unknown launch evidence item: ${input.itemId}`);
    }

    await writeStore(nextStore);
    return toMemory(nextStore);
  });

  launchEvidenceActionMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}
