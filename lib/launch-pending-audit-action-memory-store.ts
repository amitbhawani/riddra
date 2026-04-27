import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import {
  getLaunchPendingAuditItems,
  type LaunchPendingAuditItem,
  type LaunchPendingAuditPerspective,
} from "@/lib/launch-pending-audit";
import { canUseFileFallback, getFileFallbackDisabledMessage } from "@/lib/durable-data-runtime";

export type LaunchPendingAuditActionStatus =
  | "Open"
  | "Working"
  | "Waiting"
  | "Closed";

type StoredLaunchPendingAuditAction = {
  itemId: string;
  actionStatus: LaunchPendingAuditActionStatus;
  owner: string;
  nextStep: string;
  note: string;
  updatedAt: string;
};

type LaunchPendingAuditActionStore = {
  version: number;
  actions: StoredLaunchPendingAuditAction[];
};

export type LaunchPendingAuditActionItem = LaunchPendingAuditItem & {
  actionStatus: LaunchPendingAuditActionStatus;
  owner: string;
  nextStep: string;
  note: string;
  updatedAt: string;
};

export type SaveLaunchPendingAuditActionInput = {
  itemId: string;
  actionStatus: LaunchPendingAuditActionStatus;
  owner: string;
  nextStep: string;
  note: string;
};

export type LaunchPendingAuditActionGroup = {
  lane: string;
  perspective: LaunchPendingAuditPerspective;
  items: LaunchPendingAuditActionItem[];
};

export type LaunchPendingAuditActionMemory = {
  items: LaunchPendingAuditActionItem[];
  groups: LaunchPendingAuditActionGroup[];
  summary: {
    total: number;
    blocked: number;
    inProgress: number;
    queued: number;
    viewer: number;
    developer: number;
    operator: number;
    open: number;
    working: number;
    waiting: number;
    closed: number;
    assigned: number;
    unassigned: number;
  };
};

const STORE_PATH = path.join(
  process.cwd(),
  "data",
  "launch-pending-audit-actions.json",
);
const STORE_VERSION = 1;
let launchPendingAuditActionMutationQueue = Promise.resolve();

function getDefaultActionStatus(
  item: LaunchPendingAuditItem,
): LaunchPendingAuditActionStatus {
  if (item.status === "Queued") {
    return "Waiting";
  }

  return "Open";
}

function getDefaultNextStep(item: LaunchPendingAuditItem) {
  if (item.status === "Blocked") {
    return `Unblock ${item.title} and move it into verified execution.`;
  }

  if (item.status === "Queued") {
    return `Promote ${item.title} from queue into active execution planning.`;
  }

  return `Move ${item.title} from active backlog into a verified result.`;
}

function sortItems(
  items: LaunchPendingAuditActionItem[],
): LaunchPendingAuditActionItem[] {
  const actionOrder: Record<LaunchPendingAuditActionStatus, number> = {
    Open: 0,
    Working: 1,
    Waiting: 2,
    Closed: 3,
  };
  const auditOrder: Record<LaunchPendingAuditItem["status"], number> = {
    Blocked: 0,
    "In progress": 1,
    Queued: 2,
  };

  return [...items].sort((left, right) => {
    const actionDelta = actionOrder[left.actionStatus] - actionOrder[right.actionStatus];
    if (actionDelta !== 0) return actionDelta;

    const auditDelta = auditOrder[left.status] - auditOrder[right.status];
    if (auditDelta !== 0) return auditDelta;

    return left.title.localeCompare(right.title);
  });
}

function toActionItem(
  item: LaunchPendingAuditItem,
  action?: StoredLaunchPendingAuditAction,
): LaunchPendingAuditActionItem {
  return {
    ...item,
    actionStatus: action?.actionStatus ?? getDefaultActionStatus(item),
    owner: action?.owner ?? "",
    nextStep: action?.nextStep ?? getDefaultNextStep(item),
    note: action?.note ?? "",
    updatedAt: action?.updatedAt ?? new Date().toISOString(),
  };
}

async function readStore(): Promise<LaunchPendingAuditActionStore | null> {
  if (!canUseFileFallback()) {
    return null;
  }

  try {
    const content = await readFile(STORE_PATH, "utf8");
    return JSON.parse(content) as LaunchPendingAuditActionStore;
  } catch {
    return null;
  }
}

async function writeStore(store: LaunchPendingAuditActionStore) {
  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Launch pending audit persistence"));
  }

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function buildDefaultStore(): Promise<LaunchPendingAuditActionStore> {
  const items = getLaunchPendingAuditItems();

  return {
    version: STORE_VERSION,
    actions: items.map((item) => ({
      itemId: item.id,
      actionStatus: getDefaultActionStatus(item),
      owner: "",
      nextStep: getDefaultNextStep(item),
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
  const items = getLaunchPendingAuditItems();

  if (!storeExists || !store?.actions?.length) {
    const nextStore = await buildDefaultStore();
    await writeStore(nextStore);
    return nextStore;
  }

  const storedActions = new Map(store.actions.map((action) => [action.itemId, action]));
  const nextStore: LaunchPendingAuditActionStore = {
    version: STORE_VERSION,
    actions: items.map((item) => {
      const existing = storedActions.get(item.id);

      if (!existing) {
        return {
          itemId: item.id,
          actionStatus: getDefaultActionStatus(item),
          owner: "",
          nextStep: getDefaultNextStep(item),
          note: "",
          updatedAt: new Date().toISOString(),
        };
      }

      return {
        ...existing,
        nextStep: existing.nextStep || getDefaultNextStep(item),
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

function groupItems(
  items: LaunchPendingAuditActionItem[],
): LaunchPendingAuditActionGroup[] {
  const groups = new Map<string, LaunchPendingAuditActionGroup>();

  for (const item of items) {
    const key = `${item.perspective}:${item.lane}`;
    const existing = groups.get(key);

    if (existing) {
      existing.items.push(item);
      continue;
    }

    groups.set(key, {
      lane: item.lane,
      perspective: item.perspective,
      items: [item],
    });
  }

  return [...groups.values()];
}

function toMemory(store: LaunchPendingAuditActionStore): LaunchPendingAuditActionMemory {
  const auditItems = getLaunchPendingAuditItems();
  const actionMap = new Map(store.actions.map((action) => [action.itemId, action]));
  const items = sortItems(
    auditItems.map((item) => toActionItem(item, actionMap.get(item.id))),
  );

  return {
    items,
    groups: groupItems(items),
    summary: {
      total: items.length,
      blocked: items.filter((item) => item.status === "Blocked").length,
      inProgress: items.filter((item) => item.status === "In progress").length,
      queued: items.filter((item) => item.status === "Queued").length,
      viewer: items.filter((item) => item.perspective === "Viewer").length,
      developer: items.filter((item) => item.perspective === "Developer").length,
      operator: items.filter((item) => item.perspective === "Operator").length,
      open: items.filter((item) => item.actionStatus === "Open").length,
      working: items.filter((item) => item.actionStatus === "Working").length,
      waiting: items.filter((item) => item.actionStatus === "Waiting").length,
      closed: items.filter((item) => item.actionStatus === "Closed").length,
      assigned: items.filter((item) => Boolean(item.owner.trim())).length,
      unassigned: items.filter((item) => !item.owner.trim()).length,
    },
  };
}

export async function getLaunchPendingAuditActionMemory(): Promise<LaunchPendingAuditActionMemory> {
  const store = await ensureStore();
  return toMemory(store);
}

export async function saveLaunchPendingAuditAction(
  input: SaveLaunchPendingAuditActionInput,
): Promise<LaunchPendingAuditActionMemory> {
  const mutation = launchPendingAuditActionMutationQueue.then(async () => {
    const store = await ensureStore();
    let matchedItem = false;

    const nextStore: LaunchPendingAuditActionStore = {
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
          nextStep:
            input.nextStep.trim() ||
            "Operator update saved without a concrete next step yet.",
          note: input.note.trim(),
          updatedAt: new Date().toISOString(),
        };
      }),
    };

    if (!matchedItem) {
      throw new Error(`Unknown launch-pending audit item: ${input.itemId}`);
    }

    await writeStore(nextStore);
    return toMemory(nextStore);
  });

  launchPendingAuditActionMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );

  return mutation;
}
