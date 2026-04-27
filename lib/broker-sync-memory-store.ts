import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import type { User } from "@supabase/supabase-js";

import { getBrokerAdapterProfile } from "@/lib/broker-adapter-registry";
import { readDurableAccountStateLane, writeDurableAccountStateLane } from "@/lib/account-state-durable-store";
import { buildAccountUserKey } from "@/lib/account-identity";
import { canUseFileFallback, getFileFallbackDisabledMessage } from "@/lib/durable-data-runtime";

export type BrokerSyncTarget = {
  brokerName: string;
  status: "Priority" | "Planned" | "Later";
  tokenState: "Pending token" | "Sandbox token" | "Review required";
  syncMode: "CSV fallback" | "Approval-first API sync" | "Manual review queue";
  note: string;
};

export type BrokerSyncRun = {
  broker: string;
  queueState: "Queued" | "Reviewing" | "Ready to rerun";
  accountScope: string;
  nextWindow: string;
  note: string;
};

export type BrokerLinkedAccount = {
  brokerName: string;
  accountLabel: string;
  linkageState: "Sandbox linked" | "Needs verification" | "CSV fallback";
  lastSyncAt: string;
  note: string;
};

export type BrokerReviewItem = {
  broker: string;
  issue: string;
  action: string;
  reviewState: "Needs approval" | "Review manually" | "Keep existing";
  queueLane: string;
  sourceRef: string;
};

export type BrokerSyncActivityEntry = {
  id: string;
  scope: "broker_sync" | "sync_run" | "review_item" | "linked_account";
  title: string;
  detail: string;
  action: "Created" | "Updated" | "Logged" | "Removed";
  timestamp: string;
};

type BrokerSyncAccountRecord = {
  userKey: string;
  email: string;
  updatedAt: string;
  targets: BrokerSyncTarget[];
  syncRuns: BrokerSyncRun[];
  linkedAccounts: BrokerLinkedAccount[];
  reviewItems: BrokerReviewItem[];
  activityLog: BrokerSyncActivityEntry[];
};

type BrokerSyncStore = {
  version: number;
  accounts: BrokerSyncAccountRecord[];
};

export type BrokerSyncMemory = {
  userKey: string;
  email: string;
  updatedAt: string;
  storageMode: "file_backed_preview" | "supabase_private_beta";
  targets: BrokerSyncTarget[];
  syncRuns: BrokerSyncRun[];
  linkedAccounts: BrokerLinkedAccount[];
  reviewItems: BrokerReviewItem[];
  summary: {
    priorityBrokers: number;
    plannedBrokers: number;
    activeQueueLanes: number;
    linkedAccounts: number;
    reviewQueue: number;
    activityEntries: number;
  };
  activityLog: BrokerSyncActivityEntry[];
  rules: string[];
};

export type BrokerReviewDecisionInput = {
  broker: string;
  issue: string;
  reviewState: BrokerReviewItem["reviewState"];
};

export type AddBrokerSyncTargetInput = {
  brokerName: string;
  status: BrokerSyncTarget["status"];
  tokenState: BrokerSyncTarget["tokenState"];
  syncMode: BrokerSyncTarget["syncMode"];
  note: string;
};

export type CreateBrokerSyncRunInput = {
  broker: string;
  queueState: BrokerSyncRun["queueState"];
  accountScope: string;
  nextWindow: string;
  note: string;
};

export type AddBrokerReviewItemInput = {
  broker: string;
  issue: string;
  action: string;
  reviewState: BrokerReviewItem["reviewState"];
  queueLane: string;
  sourceRef: string;
};

export type AddBrokerLinkedAccountInput = {
  brokerName: string;
  accountLabel: string;
  linkageState: BrokerLinkedAccount["linkageState"];
  lastSyncAt: string;
  note: string;
};

export type RemoveBrokerSyncTargetInput = {
  brokerName: string;
};

export type RemoveBrokerReviewItemInput = {
  broker: string;
  issue: string;
};

export type RemoveBrokerSyncRunInput = {
  broker: string;
  accountScope: string;
};

export type RemoveBrokerLinkedAccountInput = {
  brokerName: string;
  accountLabel: string;
};

export type ApplyBrokerSyncExecutionInput = {
  broker: string;
  accountScope: string;
  nextWindow: string;
  trigger: string;
  note: string;
  executionState?: "Reviewing" | "Ready to rerun";
};

const STORE_PATH = path.join(process.cwd(), "data", "broker-sync-memory.json");
const STORE_VERSION = 1;
const DURABLE_LANE = "broker_sync" as const;
let brokerSyncMutationQueue = Promise.resolve();

function buildUserKey(user: Pick<User, "id" | "email">) {
  return buildAccountUserKey(user);
}

function toActivitySlug(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "entry";
}

function buildBrokerSyncActivityEntry(input: Omit<BrokerSyncActivityEntry, "id">): BrokerSyncActivityEntry {
  return {
    ...input,
    id: `${input.scope}-${toActivitySlug(input.title)}-${input.timestamp}`,
  };
}

function appendBrokerSyncActivityLog(entries: BrokerSyncActivityEntry[], entry: BrokerSyncActivityEntry) {
  return [entry, ...entries.filter((item) => item.id !== entry.id)].slice(0, 18);
}

function cloneAccountRecord(record: BrokerSyncAccountRecord): BrokerSyncAccountRecord {
  return {
    ...record,
    targets: Array.isArray(record.targets) ? record.targets.map((item) => ({ ...item })) : [],
    syncRuns: Array.isArray(record.syncRuns) ? record.syncRuns.map((item) => ({ ...item })) : [],
    linkedAccounts: Array.isArray(record.linkedAccounts)
      ? record.linkedAccounts.map((item) => ({ ...item }))
      : [],
    reviewItems: Array.isArray(record.reviewItems) ? record.reviewItems.map((item) => ({ ...item })) : [],
    activityLog: Array.isArray(record.activityLog) ? record.activityLog.map((item) => ({ ...item })) : [],
  };
}

function buildEmptyBrokerRecord(user: Pick<User, "id" | "email">, updatedAt = new Date().toISOString()): BrokerSyncAccountRecord {
  return {
    userKey: buildUserKey(user),
    email: user.email ?? `${user.id}@local-preview.riddra`,
    updatedAt,
    targets: [],
    syncRuns: [],
    linkedAccounts: [],
    reviewItems: [],
    activityLog: [
      buildBrokerSyncActivityEntry({
        scope: "broker_sync",
        title: "Broker workspace initialized",
        detail: "This account starts with an empty persisted broker state until the user adds a broker target, linked account, sync run, or review row.",
        action: "Logged",
        timestamp: updatedAt,
      }),
    ],
  };
}

function isLegacySeededBrokerRecord(record: BrokerSyncAccountRecord) {
  return (
    record.targets.length === 3 &&
    record.syncRuns.length === 3 &&
    record.linkedAccounts.length === 3 &&
    record.reviewItems.length === 3 &&
    record.activityLog.some(
      (item) =>
        item.scope === "broker_sync" &&
        item.detail === "Seeded connection targets, sync runs, and review rows were attached to the signed-in preview broker workspace.",
    )
  );
}

function normalizeLegacySeededBrokerRecord(record: BrokerSyncAccountRecord): BrokerSyncAccountRecord {
  const normalized = buildEmptyBrokerRecord({ id: record.userKey, email: record.email }, new Date().toISOString());

  return {
    ...normalized,
    userKey: record.userKey,
    email: record.email,
    activityLog: [
      buildBrokerSyncActivityEntry({
        scope: "broker_sync",
        title: "Legacy broker preview cleared",
        detail: "Seeded broker targets, sync runs, linked accounts, and review rows were removed so this workspace now starts from real user data only.",
        action: "Removed",
        timestamp: normalized.updatedAt,
      }),
      ...normalized.activityLog,
    ].slice(0, 18),
  };
}

async function readStore(): Promise<BrokerSyncStore | null> {
  if (!canUseFileFallback()) {
    return {
      version: STORE_VERSION,
      accounts: [],
    };
  }

  try {
    const content = await readFile(STORE_PATH, "utf8");
    return JSON.parse(content) as BrokerSyncStore;
  } catch {
    return null;
  }
}

async function writeStore(store: BrokerSyncStore) {
  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Broker sync persistence"));
  }

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function removeBrokerRecordFromFileStore(userKey: string) {
  const store = await readStore();

  if (!store?.accounts?.some((item) => item.userKey === userKey)) {
    return;
  }

  await writeStore({
    ...store,
    accounts: store.accounts.filter((item) => item.userKey !== userKey).map(cloneAccountRecord),
  });
}

async function readDurableBrokerRecord(userKey: string) {
  const payload = await readDurableAccountStateLane<BrokerSyncAccountRecord>(userKey, DURABLE_LANE);
  return payload ? cloneAccountRecord(payload) : null;
}

async function ensureStore() {
  if (!canUseFileFallback()) {
    return {
      version: STORE_VERSION,
      accounts: [],
    };
  }

  const storeExists = await access(STORE_PATH)
    .then(() => true)
    .catch(() => false);
  const store = await readStore();

  if (storeExists && store?.accounts) {
    return store;
  }

  const nextStore: BrokerSyncStore = {
    version: STORE_VERSION,
    accounts: [],
  };
  await writeStore(nextStore);
  return nextStore;
}

function ensureAccountRecordInStore(store: BrokerSyncStore, user: Pick<User, "id" | "email">) {
  const userKey = buildUserKey(user);
  const existing = store.accounts.find((item) => item.userKey === userKey);

  if (existing) {
    return { record: cloneAccountRecord(existing), store };
  }

  const record = buildEmptyBrokerRecord(user);
  return {
    record: cloneAccountRecord(record),
    store: {
      ...store,
      accounts: [...store.accounts, record],
    },
  };
}

async function ensureAccountRecord(user: Pick<User, "id" | "email">) {
  const userKey = buildUserKey(user);
  const durableRecord = await readDurableBrokerRecord(userKey);

  if (durableRecord) {
    if (isLegacySeededBrokerRecord(durableRecord)) {
      const normalizedRecord = normalizeLegacySeededBrokerRecord(durableRecord);
      const storageMode = await saveAccountRecord(normalizedRecord);
      return {
        record: normalizedRecord,
        storageMode,
      };
    }

    return {
      record: durableRecord,
      storageMode: "supabase_private_beta" as const,
    };
  }

  const store = await readStore();
  const existing = store?.accounts?.find((item) => item.userKey === userKey);
  const baseRecord = existing ? cloneAccountRecord(existing) : buildEmptyBrokerRecord(user);
  const normalizedRecord = isLegacySeededBrokerRecord(baseRecord)
    ? normalizeLegacySeededBrokerRecord(baseRecord)
    : baseRecord;
  const storageMode = await saveAccountRecord(normalizedRecord);

  return {
    record: normalizedRecord,
    storageMode,
  };
}

async function saveAccountRecord(record: BrokerSyncAccountRecord): Promise<BrokerSyncMemory["storageMode"]> {
  const wroteDurableRecord = await writeDurableAccountStateLane(record.userKey, record.email, DURABLE_LANE, cloneAccountRecord(record));

  if (wroteDurableRecord) {
    await removeBrokerRecordFromFileStore(record.userKey);
    return "supabase_private_beta";
  }

  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Broker sync persistence"));
  }

  const store = await ensureStore();
  const nextAccounts = store.accounts.some((item) => item.userKey === record.userKey)
    ? store.accounts.map((item) => (item.userKey === record.userKey ? cloneAccountRecord(record) : cloneAccountRecord(item)))
    : [...store.accounts.map(cloneAccountRecord), cloneAccountRecord(record)];

  await writeStore({
    ...store,
    accounts: nextAccounts,
  });

  return "file_backed_preview";
}

export async function getBrokerSyncMemory(user: Pick<User, "id" | "email">): Promise<BrokerSyncMemory> {
  const { record, storageMode } = await ensureAccountRecord(user);

  return {
    userKey: record.userKey,
    email: record.email,
    updatedAt: record.updatedAt,
    storageMode,
    targets: record.targets,
    syncRuns: record.syncRuns,
    linkedAccounts: record.linkedAccounts,
    reviewItems: record.reviewItems,
    summary: {
      priorityBrokers: record.targets.filter((item) => item.status === "Priority").length,
      plannedBrokers: record.targets.filter((item) => item.status !== "Priority").length,
      activeQueueLanes: new Set(record.syncRuns.map((item) => item.queueState)).size,
      linkedAccounts: record.linkedAccounts.length,
      reviewQueue: record.reviewItems.length,
      activityEntries: record.activityLog.length,
    },
    activityLog: record.activityLog,
    rules: [
      "Broker sync should stay provider-agnostic so the review queue does not hardcode one broker family into portfolio continuity.",
      "Token state, sync mode, and review decisions should remain auditable backend records, not one-off UI choices.",
      "Approval-first review should always win over silent portfolio overwrite when quantity, symbol, or cost-basis confidence is weak.",
    ],
  };
}

export async function createBrokerSyncRun(
  user: Pick<User, "id" | "email">,
  input: CreateBrokerSyncRunInput,
): Promise<BrokerSyncMemory> {
  const mutation = brokerSyncMutationQueue.then(async () => {
    const { record } = await ensureAccountRecord(user);
    const timestamp = new Date().toISOString();
    const nextRun: BrokerSyncRun = {
      broker: input.broker.trim(),
      queueState: input.queueState,
      accountScope: input.accountScope.trim(),
      nextWindow: input.nextWindow.trim(),
      note: input.note.trim(),
    };

    const nextRecord: BrokerSyncAccountRecord = {
      ...record,
      updatedAt: timestamp,
      syncRuns: [nextRun, ...record.syncRuns].slice(0, 12),
      activityLog: appendBrokerSyncActivityLog(
        record.activityLog,
        buildBrokerSyncActivityEntry({
          scope: "sync_run",
          title: `${nextRun.broker} sync window`,
          detail: `${nextRun.queueState} · ${nextRun.accountScope} · ${nextRun.nextWindow}`,
          action: "Created",
          timestamp,
        }),
      ),
    };

    await saveAccountRecord(nextRecord);
  });

  brokerSyncMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getBrokerSyncMemory(user);
}

export async function applyBrokerSyncExecution(
  user: Pick<User, "id" | "email">,
  input: ApplyBrokerSyncExecutionInput,
): Promise<BrokerSyncMemory> {
  const mutation = brokerSyncMutationQueue.then(async () => {
    const { record } = await ensureAccountRecord(user);
    const timestamp = new Date().toISOString();
    const adapterProfile = getBrokerAdapterProfile(input.broker);
    const queueState = input.executionState ?? "Reviewing";
    const accountScope = input.accountScope.trim();
    const broker = input.broker.trim();
    const nextWindow = input.nextWindow.trim();
    const executionNote = input.note.trim();
    const adapterSourceRef = adapterProfile ? `adapter:${adapterProfile.adapterKey}` : "adapter:manual";
    const reviewIssue = `${accountScope} sync diff ready for approval`;
    const reviewAction = adapterProfile
      ? `Review ${adapterProfile.syncCoverage.toLowerCase()} before applying ${broker} sync output.`
      : `Review imported holdings and account changes before applying ${broker} sync output.`;
    const reviewQueueLane = adapterProfile ? `${adapterProfile.adapterKey}-approval-first` : "manual-approval-first";
    const linkedAccountNote = adapterProfile
      ? `${executionNote} Internal adapter lane ${adapterProfile.adapterKey} prepared this link for approval-first review.`
      : `${executionNote} Internal sync execution prepared this link for approval-first review.`;

    const nextRun: BrokerSyncRun = {
      broker,
      queueState,
      accountScope,
      nextWindow,
      note: executionNote,
    };

    const nextReviewItem: BrokerReviewItem = {
      broker,
      issue: reviewIssue,
      action: reviewAction,
      reviewState: queueState === "Ready to rerun" ? "Review manually" : "Needs approval",
      queueLane: reviewQueueLane,
      sourceRef: adapterSourceRef,
    };

    const nextLinkedAccount: BrokerLinkedAccount = {
      brokerName: broker,
      accountLabel: accountScope,
      linkageState: "Needs verification",
      lastSyncAt: timestamp,
      note: linkedAccountNote,
    };

    const nextRecord: BrokerSyncAccountRecord = {
      ...record,
      updatedAt: timestamp,
      syncRuns: [
        nextRun,
        ...record.syncRuns.filter((item) => !(item.broker === broker && item.accountScope === accountScope)),
      ].slice(0, 12),
      linkedAccounts: [
        nextLinkedAccount,
        ...record.linkedAccounts.filter(
          (item) => !(item.brokerName === nextLinkedAccount.brokerName && item.accountLabel === nextLinkedAccount.accountLabel),
        ),
      ].slice(0, 16),
      reviewItems: [
        nextReviewItem,
        ...record.reviewItems.filter((item) => !(item.broker === nextReviewItem.broker && item.issue === nextReviewItem.issue)),
      ].slice(0, 20),
      activityLog: appendBrokerSyncActivityLog(
        appendBrokerSyncActivityLog(
          record.activityLog,
          buildBrokerSyncActivityEntry({
            scope: "sync_run",
            title: `${broker} sync execution`,
            detail: `${queueState} · ${accountScope} · ${input.trigger}`,
            action: "Updated",
            timestamp,
          }),
        ),
        buildBrokerSyncActivityEntry({
          scope: "review_item",
          title: `${broker} review`,
          detail: `${reviewIssue} · ${nextReviewItem.reviewState} · ${reviewQueueLane}`,
          action: "Created",
          timestamp,
        }),
      ),
    };

    await saveAccountRecord(nextRecord);
  });

  brokerSyncMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getBrokerSyncMemory(user);
}

export async function addBrokerLinkedAccount(
  user: Pick<User, "id" | "email">,
  input: AddBrokerLinkedAccountInput,
): Promise<BrokerSyncMemory> {
  const mutation = brokerSyncMutationQueue.then(async () => {
    const { record } = await ensureAccountRecord(user);
    const timestamp = new Date().toISOString();
    const nextAccount: BrokerLinkedAccount = {
      brokerName: input.brokerName.trim(),
      accountLabel: input.accountLabel.trim(),
      linkageState: input.linkageState,
      lastSyncAt: input.lastSyncAt.trim(),
      note: input.note.trim(),
    };

    const nextRecord: BrokerSyncAccountRecord = {
      ...record,
      updatedAt: timestamp,
      linkedAccounts: [
        nextAccount,
        ...record.linkedAccounts.filter(
          (item) =>
            !(
              item.brokerName === nextAccount.brokerName &&
              item.accountLabel === nextAccount.accountLabel
            ),
        ),
      ].slice(0, 16),
      activityLog: appendBrokerSyncActivityLog(
        record.activityLog,
        buildBrokerSyncActivityEntry({
          scope: "linked_account",
          title: `${nextAccount.brokerName} linkage`,
          detail: `${nextAccount.accountLabel} · ${nextAccount.linkageState} · ${nextAccount.lastSyncAt}`,
          action: "Created",
          timestamp,
        }),
      ),
    };

    await saveAccountRecord(nextRecord);
  });

  brokerSyncMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getBrokerSyncMemory(user);
}

export async function removeBrokerSyncRun(
  user: Pick<User, "id" | "email">,
  input: RemoveBrokerSyncRunInput,
): Promise<BrokerSyncMemory> {
  const mutation = brokerSyncMutationQueue.then(async () => {
    const { record } = await ensureAccountRecord(user);
    const broker = input.broker.trim();
    const accountScope = input.accountScope.trim();

    if (!broker || !accountScope) {
      throw new Error("Broker and account scope are required.");
    }

    const removedRun = record.syncRuns.find((item) => item.broker === broker && item.accountScope === accountScope);

    if (!removedRun) {
      throw new Error(`Unknown broker sync run: ${broker}`);
    }

    const timestamp = new Date().toISOString();
    const nextRecord: BrokerSyncAccountRecord = {
      ...record,
      updatedAt: timestamp,
      syncRuns: record.syncRuns.filter((item) => !(item.broker === broker && item.accountScope === accountScope)),
      activityLog: appendBrokerSyncActivityLog(
        record.activityLog,
        buildBrokerSyncActivityEntry({
          scope: "sync_run",
          title: `${broker} sync window`,
          detail: `${removedRun.queueState} · ${removedRun.accountScope} removed from broker sync history.`,
          action: "Removed",
          timestamp,
        }),
      ),
    };

    await saveAccountRecord(nextRecord);
  });

  brokerSyncMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getBrokerSyncMemory(user);
}

export async function addBrokerSyncTarget(
  user: Pick<User, "id" | "email">,
  input: AddBrokerSyncTargetInput,
): Promise<BrokerSyncMemory> {
  const mutation = brokerSyncMutationQueue.then(async () => {
    const { record } = await ensureAccountRecord(user);
    const timestamp = new Date().toISOString();
    const nextTarget: BrokerSyncTarget = {
      brokerName: input.brokerName.trim(),
      status: input.status,
      tokenState: input.tokenState,
      syncMode: input.syncMode,
      note: input.note.trim(),
    };

    const nextRecord: BrokerSyncAccountRecord = {
      ...record,
      updatedAt: timestamp,
      targets: [nextTarget, ...record.targets.filter((item) => item.brokerName !== nextTarget.brokerName)].slice(0, 16),
      activityLog: appendBrokerSyncActivityLog(
        record.activityLog,
        buildBrokerSyncActivityEntry({
          scope: "broker_sync",
          title: nextTarget.brokerName,
          detail: `${nextTarget.status} · ${nextTarget.tokenState} · ${nextTarget.syncMode}`,
          action: "Created",
          timestamp,
        }),
      ),
    };

    await saveAccountRecord(nextRecord);
  });

  brokerSyncMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getBrokerSyncMemory(user);
}

export async function saveBrokerReviewDecision(
  user: Pick<User, "id" | "email">,
  input: BrokerReviewDecisionInput,
): Promise<BrokerSyncMemory> {
  const mutation = brokerSyncMutationQueue.then(async () => {
    const { record } = await ensureAccountRecord(user);
    const timestamp = new Date().toISOString();
    const nextReviewItems = record.reviewItems.map((item) =>
      item.broker === input.broker && item.issue === input.issue ? { ...item, reviewState: input.reviewState } : { ...item },
    );

    const nextRecord: BrokerSyncAccountRecord = {
      ...record,
      updatedAt: timestamp,
      reviewItems: nextReviewItems,
      activityLog: appendBrokerSyncActivityLog(
        record.activityLog,
        buildBrokerSyncActivityEntry({
          scope: "review_item",
          title: `${input.broker} review`,
          detail: `${input.issue} · decision set to ${input.reviewState}`,
          action: "Updated",
          timestamp,
        }),
      ),
    };

    await saveAccountRecord(nextRecord);
  });

  brokerSyncMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getBrokerSyncMemory(user);
}

export async function addBrokerReviewItem(
  user: Pick<User, "id" | "email">,
  input: AddBrokerReviewItemInput,
): Promise<BrokerSyncMemory> {
  const mutation = brokerSyncMutationQueue.then(async () => {
    const { record } = await ensureAccountRecord(user);
    const timestamp = new Date().toISOString();
    const nextReviewItem: BrokerReviewItem = {
      broker: input.broker.trim(),
      issue: input.issue.trim(),
      action: input.action.trim(),
      reviewState: input.reviewState,
      queueLane: input.queueLane.trim(),
      sourceRef: input.sourceRef.trim(),
    };

    const nextRecord: BrokerSyncAccountRecord = {
      ...record,
      updatedAt: timestamp,
      reviewItems: [
        nextReviewItem,
        ...record.reviewItems.filter((item) => !(item.broker === nextReviewItem.broker && item.issue === nextReviewItem.issue)),
      ].slice(0, 20),
      activityLog: appendBrokerSyncActivityLog(
        record.activityLog,
        buildBrokerSyncActivityEntry({
          scope: "review_item",
          title: `${nextReviewItem.broker} review`,
          detail: `${nextReviewItem.issue} · ${nextReviewItem.reviewState} · ${nextReviewItem.queueLane}`,
          action: "Created",
          timestamp,
        }),
      ),
    };

    await saveAccountRecord(nextRecord);
  });

  brokerSyncMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getBrokerSyncMemory(user);
}

export async function removeBrokerSyncTarget(
  user: Pick<User, "id" | "email">,
  input: RemoveBrokerSyncTargetInput,
): Promise<BrokerSyncMemory> {
  const mutation = brokerSyncMutationQueue.then(async () => {
    const { record } = await ensureAccountRecord(user);
    const brokerName = input.brokerName.trim();

    if (!brokerName) {
      throw new Error("Broker name is required.");
    }

    const removedTarget = record.targets.find((item) => item.brokerName === brokerName);

    if (!removedTarget) {
      throw new Error(`Unknown broker target: ${brokerName}`);
    }

    const timestamp = new Date().toISOString();
    const nextRecord: BrokerSyncAccountRecord = {
      ...record,
      updatedAt: timestamp,
      targets: record.targets.filter((item) => item.brokerName !== brokerName),
      activityLog: appendBrokerSyncActivityLog(
        record.activityLog,
        buildBrokerSyncActivityEntry({
          scope: "broker_sync",
          title: brokerName,
          detail: `${removedTarget.status} · ${removedTarget.syncMode} removed from broker rollout targets.`,
          action: "Removed",
          timestamp,
        }),
      ),
    };

    await saveAccountRecord(nextRecord);
  });

  brokerSyncMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getBrokerSyncMemory(user);
}

export async function removeBrokerLinkedAccount(
  user: Pick<User, "id" | "email">,
  input: RemoveBrokerLinkedAccountInput,
): Promise<BrokerSyncMemory> {
  const mutation = brokerSyncMutationQueue.then(async () => {
    const { record } = await ensureAccountRecord(user);
    const brokerName = input.brokerName.trim();
    const accountLabel = input.accountLabel.trim();

    if (!brokerName || !accountLabel) {
      throw new Error("Broker name and account label are required.");
    }

    const removedAccount = record.linkedAccounts.find(
      (item) => item.brokerName === brokerName && item.accountLabel === accountLabel,
    );

    if (!removedAccount) {
      throw new Error(`Unknown broker linked account: ${brokerName}`);
    }

    const timestamp = new Date().toISOString();
    const nextRecord: BrokerSyncAccountRecord = {
      ...record,
      updatedAt: timestamp,
      linkedAccounts: record.linkedAccounts.filter(
        (item) => !(item.brokerName === brokerName && item.accountLabel === accountLabel),
      ),
      activityLog: appendBrokerSyncActivityLog(
        record.activityLog,
        buildBrokerSyncActivityEntry({
          scope: "linked_account",
          title: `${brokerName} linkage`,
          detail: `${accountLabel} removed from the linked-account lane.`,
          action: "Removed",
          timestamp,
        }),
      ),
    };

    await saveAccountRecord(nextRecord);
  });

  brokerSyncMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getBrokerSyncMemory(user);
}

export async function removeBrokerReviewItem(
  user: Pick<User, "id" | "email">,
  input: RemoveBrokerReviewItemInput,
): Promise<BrokerSyncMemory> {
  const mutation = brokerSyncMutationQueue.then(async () => {
    const { record } = await ensureAccountRecord(user);
    const broker = input.broker.trim();
    const issue = input.issue.trim();

    if (!broker || !issue) {
      throw new Error("Broker and issue are required.");
    }

    const removedItem = record.reviewItems.find((item) => item.broker === broker && item.issue === issue);

    if (!removedItem) {
      throw new Error(`Unknown broker review row: ${broker}`);
    }

    const timestamp = new Date().toISOString();
    const nextRecord: BrokerSyncAccountRecord = {
      ...record,
      updatedAt: timestamp,
      reviewItems: record.reviewItems.filter((item) => !(item.broker === broker && item.issue === issue)),
      activityLog: appendBrokerSyncActivityLog(
        record.activityLog,
        buildBrokerSyncActivityEntry({
          scope: "review_item",
          title: `${broker} review`,
          detail: `${issue} removed from the approval-first review queue.`,
          action: "Removed",
          timestamp,
        }),
      ),
    };

    await saveAccountRecord(nextRecord);
  });

  brokerSyncMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getBrokerSyncMemory(user);
}
