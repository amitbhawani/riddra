import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import type { User } from "@supabase/supabase-js";

import { readDurableAccountStateLane, writeDurableAccountStateLane } from "@/lib/account-state-durable-store";
import { buildAccountUserKey } from "@/lib/account-identity";
import { canUseFileFallback, getFileFallbackDisabledMessage } from "@/lib/durable-data-runtime";
import { getAccountBillingMemory, getBillingLedgerMemory } from "@/lib/billing-ledger-memory-store";
import { readDurableGlobalStateLane, writeDurableGlobalStateLane } from "@/lib/global-state-durable-store";
import { type PlanTier, getPlanLabel } from "@/lib/plan-tiers";
import { subscriptionMatrixFeatures } from "@/lib/subscription-matrix";

export type EntitlementSyncHistoryRow = {
  id: string;
  userRef: string;
  featureCode: string;
  previousLevel: string;
  nextLevel: string;
  reason: string;
  actorType: string;
  actorRef: string;
  changedAt: string;
  syncState: "Synced" | "Needs review";
};

export type EntitlementSyncAccountItem = {
  featureCode: string;
  accessLevel: string;
  route: string;
  sourceEvent: string;
  syncState: "Synced" | "Needs review";
};

type EntitlementSyncAccountRecord = {
  userKey: string;
  email: string;
  updatedAt: string;
  plan: PlanTier;
  planLabel: string;
  lifecycleState: string;
  syncState: "Synced" | "Needs review";
  entitlements: EntitlementSyncAccountItem[];
  recentHistory: EntitlementSyncHistoryRow[];
};

type EntitlementSyncStore = {
  version: number;
  historyRows: EntitlementSyncHistoryRow[];
  accounts: EntitlementSyncAccountRecord[];
};

export type EntitlementSyncMemory = {
  updatedAt: string;
  historyRows: EntitlementSyncHistoryRow[];
  summary: {
    updatesToday: number;
    automatedChanges: number;
    manualOverrides: number;
    pendingSyncs: number;
    gracePeriodAccounts: number;
  };
  rules: string[];
};

export type AccountEntitlementSyncMemory = {
  userKey: string;
  email: string;
  updatedAt: string;
  planLabel: string;
  lifecycleState: string;
  syncState: "Synced" | "Needs review";
  entitlements: EntitlementSyncAccountItem[];
  recentHistory: EntitlementSyncHistoryRow[];
  storageMode: "file_backed_preview" | "supabase_private_beta";
  rules: string[];
};

export type SaveEntitlementOverrideInput = {
  featureCode: string;
  accessLevel: string;
  reason: string;
  route?: string;
  actorType?: "support" | "ops";
};

export type RecordEntitlementSyncChangeInput = {
  featureCode: string;
  nextLevel: string;
  reason: string;
  syncState: "Synced" | "Needs review";
  actorType?: "system" | "support" | "ops";
  actorRef?: string;
  route?: string;
};

export type RemoveEntitlementSyncHistoryInput = {
  id: string;
};

export type SyncAccountEntitlementsFromBillingInput = {
  reason?: string;
  actorType?: "system" | "ops";
  actorRef?: string;
};

const STORE_PATH = path.join(process.cwd(), "data", "entitlement-sync-memory.json");
const STORE_VERSION = 1;
const DURABLE_LANE = "entitlement_sync" as const;
const DURABLE_GLOBAL_LANE = "entitlement_audit" as const;
let entitlementSyncMutationQueue = Promise.resolve();

const featureRoutes = [
  "/markets",
  "/account/watchlists",
  "/portfolio",
  "/advanced-charts",
  "/account/alerts",
  "/trader-workstation",
] as const;

function buildUserKey(user: Pick<User, "id" | "email">) {
  return buildAccountUserKey(user);
}

function featureCodeFromLabel(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toHistorySlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function resolveRoute(index: number) {
  return featureRoutes[index] ?? "/account/access";
}

function resolveAccessLevel(plan: PlanTier, featureIndex: number, lifecycleState: string) {
  const item = subscriptionMatrixFeatures[featureIndex];
  const planCell = plan === "elite" ? item.elite : plan === "pro" ? item.pro : item.starter;

  if (lifecycleState.toLowerCase().includes("grace")) {
    if (planCell === "Included") return "grace_period";
    if (planCell === "Planned") return "planned";
    return "locked";
  }

  if (planCell === "Included") {
    return plan;
  }

  if (planCell === "Planned") {
    return "planned";
  }

  return "locked";
}

function buildAccountEntitlements(plan: PlanTier, lifecycleState: string, lastEvent: string) {
  return subscriptionMatrixFeatures.map((item, index) => ({
    featureCode: featureCodeFromLabel(item.feature),
    accessLevel: resolveAccessLevel(plan, index, lifecycleState),
    route: resolveRoute(index),
    sourceEvent: lastEvent,
    syncState: lifecycleState.toLowerCase().includes("grace") ? ("Needs review" as const) : ("Synced" as const),
  }));
}

function cloneEntitlementAccountRecord(record: EntitlementSyncAccountRecord): EntitlementSyncAccountRecord {
  return {
    ...record,
    entitlements: record.entitlements.map((item) => ({ ...item })),
    recentHistory: (record.recentHistory ?? []).map((item) => ({ ...item })),
  };
}

function buildAccountRecentHistory(historyRows: EntitlementSyncHistoryRow[], email: string) {
  return historyRows
    .filter((item) => item.userRef === email)
    .slice(0, 8)
    .map((item) => ({ ...item }));
}

async function buildDefaultHistoryRows(): Promise<EntitlementSyncHistoryRow[]> {
  const billingLedger = await getBillingLedgerMemory();

  return billingLedger.eventRows.slice(0, 4).map((item, index) => {
    if (item.event === "subscription.activated") {
      return {
        id: `ent_sync_${index + 1}`,
        userRef: item.userRef,
        featureCode: "advanced_charts_and_proprietary_indicator",
        previousLevel: "build_mode",
        nextLevel: "elite",
        reason: item.event,
        actorType: "system",
        actorRef: item.id,
        changedAt: item.occurredAt,
        syncState: "Synced" as const,
      };
    }

    if (item.event === "subscription.halted") {
      return {
        id: `ent_sync_${index + 1}`,
        userRef: item.userRef,
        featureCode: "priority_alerts_and_ai_summaries",
        previousLevel: "pro",
        nextLevel: "grace_period",
        reason: item.event,
        actorType: "system",
        actorRef: item.id,
        changedAt: item.occurredAt,
        syncState: "Needs review" as const,
      };
    }

    if (item.event === "subscription.cancelled") {
      return {
        id: `ent_sync_${index + 1}`,
        userRef: item.userRef,
        featureCode: "derivatives_oi_and_trader_workstation_tools",
        previousLevel: "elite",
        nextLevel: "locked",
        reason: item.event,
        actorType: "system",
        actorRef: item.id,
        changedAt: item.occurredAt,
        syncState: "Needs review" as const,
      };
    }

    return {
      id: `ent_sync_${index + 1}`,
      userRef: item.userRef,
      featureCode: "portfolio_tracker_and_import_review",
      previousLevel: "starter",
      nextLevel: "pro",
      reason: item.event,
      actorType: "system",
      actorRef: item.id,
      changedAt: item.occurredAt,
      syncState: item.status === "Processed" ? ("Synced" as const) : ("Needs review" as const),
    };
  });
}

async function buildDefaultStore(): Promise<EntitlementSyncStore> {
  return {
    version: STORE_VERSION,
    historyRows: await buildDefaultHistoryRows(),
    accounts: [],
  };
}

async function readStore(): Promise<EntitlementSyncStore | null> {
  if (!canUseFileFallback()) {
    return await buildDefaultStore();
  }

  try {
    const content = await readFile(STORE_PATH, "utf8");
    return JSON.parse(content) as EntitlementSyncStore;
  } catch {
    return null;
  }
}

async function writeStore(store: EntitlementSyncStore) {
  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Entitlement sync persistence"));
  }

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function readDurableEntitlementHistoryRows() {
  const payload = await readDurableGlobalStateLane<{
    updatedAt: string;
    historyRows: EntitlementSyncHistoryRow[];
  }>(DURABLE_GLOBAL_LANE);

  return payload?.historyRows?.map((item) => ({ ...item })) ?? null;
}

async function writeDurableEntitlementHistoryRows(historyRows: EntitlementSyncHistoryRow[]) {
  return writeDurableGlobalStateLane(DURABLE_GLOBAL_LANE, {
    updatedAt: new Date().toISOString(),
    historyRows: historyRows.map((item) => ({ ...item })),
  });
}

async function removeEntitlementAccountRecordFromFileStore(userKey: string) {
  if (!canUseFileFallback()) {
    return;
  }

  const store = await readStore();

  if (!store?.accounts?.some((item) => item.userKey === userKey)) {
    return;
  }

  await writeStore({
    ...store,
    accounts: store.accounts
      .filter((item) => item.userKey !== userKey)
      .map(cloneEntitlementAccountRecord),
  });
}

async function readDurableEntitlementAccountRecord(userKey: string) {
  const payload = await readDurableAccountStateLane<EntitlementSyncAccountRecord>(userKey, DURABLE_LANE);
  return payload ? cloneEntitlementAccountRecord(payload) : null;
}

async function ensureStore() {
  const store = await readStore();
  const durableHistoryRows = await readDurableEntitlementHistoryRows();

  if (durableHistoryRows) {
    return {
      version: store?.version ?? STORE_VERSION,
      historyRows: durableHistoryRows,
      accounts: Array.isArray(store?.accounts) ? store.accounts.map(cloneEntitlementAccountRecord) : [],
    };
  }

  if (!canUseFileFallback()) {
    const nextStore = await buildDefaultStore();
    return {
      ...nextStore,
      historyRows: durableHistoryRows ?? nextStore.historyRows,
    };
  }

  const storeExists = await access(STORE_PATH)
    .then(() => true)
    .catch(() => false);

  if (storeExists && store?.historyRows?.length) {
    await writeDurableEntitlementHistoryRows(store.historyRows);
    return store;
  }

  const nextStore = await buildDefaultStore();
  await writeStore(nextStore);
  await writeDurableEntitlementHistoryRows(nextStore.historyRows);
  return nextStore;
}

async function persistEntitlementState(
  store: EntitlementSyncStore,
  accountRecord?: EntitlementSyncAccountRecord,
) {
  const [wroteHistoryRows, wroteAccountRecord] = await Promise.all([
    writeDurableEntitlementHistoryRows(store.historyRows),
    accountRecord
      ? writeDurableAccountStateLane(
          accountRecord.userKey,
          accountRecord.email,
          DURABLE_LANE,
          cloneEntitlementAccountRecord(accountRecord),
        )
      : Promise.resolve(true),
  ]);

  if (wroteHistoryRows && wroteAccountRecord) {
    if (canUseFileFallback()) {
      await writeStore(store);
    }
    return "supabase_private_beta" as const;
  }

  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Entitlement sync persistence"));
  }

  await writeStore(store);
  return "file_backed_preview" as const;
}

async function ensureAccountRecordInStore(store: EntitlementSyncStore, user: Pick<User, "id" | "email">, plan: PlanTier) {
  const userKey = buildUserKey(user);
  const existing = store.accounts.find((item) => item.userKey === userKey);

  if (existing) {
    if (existing.plan === plan) {
      return { record: existing, store };
    }

    const updatedRecord: EntitlementSyncAccountRecord = {
      ...existing,
      updatedAt: new Date().toISOString(),
      plan,
      planLabel: getPlanLabel(plan),
    };

    return {
      record: updatedRecord,
      store: {
        ...store,
        accounts: store.accounts.map((item) => (item.userKey === userKey ? updatedRecord : item)),
      },
    };
  }

  const billingMemory = await getAccountBillingMemory(user);
  const lastHistory = store.historyRows.find((item) => item.userRef === billingMemory.email) ?? store.historyRows[0];
  const lifecycleState = billingMemory.lifecycleState;
  const syncState = lifecycleState.toLowerCase().includes("grace") ? ("Needs review" as const) : ("Synced" as const);
  const record: EntitlementSyncAccountRecord = {
    userKey,
    email: billingMemory.email,
    updatedAt: new Date().toISOString(),
    plan,
    planLabel: getPlanLabel(plan),
    lifecycleState,
    syncState,
    entitlements: buildAccountEntitlements(plan, lifecycleState, lastHistory?.reason ?? "subscription.charged"),
    recentHistory: [],
  };

  const historyRows =
    store.historyRows.find((item) => item.userRef === record.email) || !record.entitlements.length
      ? store.historyRows
      : [
          {
            id: `ent_sync_${store.historyRows.length + 1}`,
            userRef: record.email,
            featureCode: record.entitlements[0]?.featureCode ?? "workspace_memory",
            previousLevel: "preview_only",
            nextLevel: record.entitlements[0]?.accessLevel ?? plan,
            reason: billingMemory.lifecycleState.toLowerCase().includes("grace") ? "subscription.halted" : "subscription.charged",
            actorType: "system",
            actorRef: `acct_${record.userKey}`,
            changedAt: billingMemory.updatedAt,
            syncState,
          },
          ...store.historyRows,
        ];

  record.recentHistory = buildAccountRecentHistory(historyRows, record.email);

  return {
    record,
    store: {
      ...store,
      accounts: [...store.accounts, record],
      historyRows,
    },
  };
}

async function ensureAccountRecord(user: Pick<User, "id" | "email">, plan: PlanTier) {
  const store = await ensureStore();
  const durableRecord = await readDurableEntitlementAccountRecord(buildUserKey(user));

  if (durableRecord) {
    const nextRecentHistory =
      durableRecord.recentHistory.length > 0
        ? durableRecord.recentHistory
        : buildAccountRecentHistory(store.historyRows, durableRecord.email);
    const nextRecord =
      durableRecord.plan === plan && nextRecentHistory === durableRecord.recentHistory
        ? durableRecord
        : {
            ...durableRecord,
            updatedAt: new Date().toISOString(),
            plan,
            planLabel: getPlanLabel(plan),
            recentHistory: nextRecentHistory,
          };

    if (nextRecord !== durableRecord) {
      await writeDurableAccountStateLane(nextRecord.userKey, nextRecord.email, DURABLE_LANE, cloneEntitlementAccountRecord(nextRecord));
    }

    await removeEntitlementAccountRecordFromFileStore(nextRecord.userKey);

    return {
      record: nextRecord,
      store,
      storageMode: "supabase_private_beta" as const,
    };
  }

  const ensured = await ensureAccountRecordInStore(store, user, plan);
  let storageMode: AccountEntitlementSyncMemory["storageMode"] = "file_backed_preview";

  if (ensured.store !== store) {
    if (canUseFileFallback()) {
      await writeStore(ensured.store);
    }
  }

  storageMode = await persistEntitlementState(ensured.store, ensured.record);

  if (storageMode === "supabase_private_beta") {
    await removeEntitlementAccountRecordFromFileStore(ensured.record.userKey);
  }

  return {
    ...ensured,
    storageMode,
  };
}

function deriveAccountSyncState(entitlements: EntitlementSyncAccountItem[]) {
  return entitlements.every((item) => item.syncState === "Synced") ? ("Synced" as const) : ("Needs review" as const);
}

function buildEntitlementHistoryRows(input: {
  record: EntitlementSyncAccountRecord;
  nextEntitlements: EntitlementSyncAccountItem[];
  reason: string;
  actorType: "system" | "ops";
  actorRef: string;
  changedAt: string;
}): EntitlementSyncHistoryRow[] {
  const previousByFeature = new Map(input.record.entitlements.map((item) => [item.featureCode, item]));

  return input.nextEntitlements
    .filter((item) => {
      const previous = previousByFeature.get(item.featureCode);

      return (
        !previous ||
        previous.accessLevel !== item.accessLevel ||
        previous.syncState !== item.syncState ||
        previous.sourceEvent !== item.sourceEvent
      );
    })
    .map((item, index) => {
      const previous = previousByFeature.get(item.featureCode);

      return {
        id: `ent_sync_${input.record.userKey}_${toHistorySlug(item.featureCode)}_${index + 1}_${input.changedAt}`,
        userRef: input.record.email,
        featureCode: item.featureCode,
        previousLevel: previous?.accessLevel ?? "preview_only",
        nextLevel: item.accessLevel,
        reason: input.reason,
        actorType: input.actorType,
        actorRef: input.actorRef,
        changedAt: input.changedAt,
        syncState: item.syncState,
      };
    });
}

export async function saveEntitlementOverride(
  user: Pick<User, "id" | "email">,
  plan: PlanTier,
  input: SaveEntitlementOverrideInput,
): Promise<AccountEntitlementSyncMemory> {
  const mutation = entitlementSyncMutationQueue.then(async () => {
    const { record, store } = await ensureAccountRecord(user, plan);
    const existingItem = record.entitlements.find((item) => item.featureCode === input.featureCode);
    const nextEntitlement: EntitlementSyncAccountItem = {
      featureCode: input.featureCode,
      accessLevel: input.accessLevel,
      route: input.route?.trim() || existingItem?.route || "/account/access",
      sourceEvent: input.reason,
      syncState: "Needs review",
    };
    const nextHistory: EntitlementSyncHistoryRow = {
      id: `ent_sync_${store.historyRows.length + 1}`,
      userRef: record.email,
      featureCode: input.featureCode,
      previousLevel: existingItem?.accessLevel ?? "preview_only",
      nextLevel: input.accessLevel,
      reason: input.reason,
      actorType: input.actorType ?? "support",
      actorRef: `manual_${buildUserKey(user)}`,
      changedAt: new Date().toISOString(),
      syncState: "Needs review",
    };
    const updatedRecord: EntitlementSyncAccountRecord = {
      ...record,
      updatedAt: new Date().toISOString(),
      syncState: "Needs review",
      entitlements: [nextEntitlement, ...record.entitlements.filter((item) => item.featureCode !== input.featureCode)],
      recentHistory: [nextHistory, ...record.recentHistory.filter((item) => item.id !== nextHistory.id)].slice(0, 8),
    };
    const nextStore: EntitlementSyncStore = {
      ...store,
      accounts: [...store.accounts.filter((item) => item.userKey !== record.userKey), updatedRecord],
      historyRows: [nextHistory, ...store.historyRows],
    };

    await persistEntitlementState(nextStore, updatedRecord);
  });

  entitlementSyncMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getAccountEntitlementSyncMemory(user, plan);
}

export async function recordEntitlementSyncChange(
  user: Pick<User, "id" | "email">,
  plan: PlanTier,
  input: RecordEntitlementSyncChangeInput,
): Promise<AccountEntitlementSyncMemory> {
  const mutation = entitlementSyncMutationQueue.then(async () => {
    const { record, store } = await ensureAccountRecord(user, plan);
    const existingItem = record.entitlements.find((item) => item.featureCode === input.featureCode);
    const nextEntitlement: EntitlementSyncAccountItem = {
      featureCode: input.featureCode,
      accessLevel: input.nextLevel,
      route: input.route?.trim() || existingItem?.route || "/account/access",
      sourceEvent: input.reason,
      syncState: input.syncState,
    };
    const nextEntitlements = [nextEntitlement, ...record.entitlements.filter((item) => item.featureCode !== input.featureCode)];
    const nextHistory: EntitlementSyncHistoryRow = {
      id: `ent_sync_${store.historyRows.length + 1}`,
      userRef: record.email,
      featureCode: input.featureCode,
      previousLevel: existingItem?.accessLevel ?? "preview_only",
      nextLevel: input.nextLevel,
      reason: input.reason,
      actorType: input.actorType ?? "system",
      actorRef: input.actorRef?.trim() || `sync_${buildUserKey(user)}`,
      changedAt: new Date().toISOString(),
      syncState: input.syncState,
    };
    const updatedRecord: EntitlementSyncAccountRecord = {
      ...record,
      updatedAt: new Date().toISOString(),
      syncState: deriveAccountSyncState(nextEntitlements),
      entitlements: nextEntitlements,
      recentHistory: [nextHistory, ...record.recentHistory.filter((item) => item.id !== nextHistory.id)].slice(0, 8),
    };
    const nextStore: EntitlementSyncStore = {
      ...store,
      accounts: [...store.accounts.filter((item) => item.userKey !== record.userKey), updatedRecord],
      historyRows: [nextHistory, ...store.historyRows],
    };

    await persistEntitlementState(nextStore, updatedRecord);
  });

  entitlementSyncMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getAccountEntitlementSyncMemory(user, plan);
}

export async function removeEntitlementSyncHistoryRow(
  user: Pick<User, "id" | "email">,
  plan: PlanTier,
  input: RemoveEntitlementSyncHistoryInput,
): Promise<AccountEntitlementSyncMemory> {
  const mutation = entitlementSyncMutationQueue.then(async () => {
    const { record, store } = await ensureAccountRecord(user, plan);
    const id = input.id.trim();

    if (!id) {
      throw new Error("History row id is required.");
    }

    const removedRow = store.historyRows.find((item) => item.id === id);

    if (!removedRow) {
      throw new Error(`Unknown entitlement history row: ${id}`);
    }

    const updatedRecord: EntitlementSyncAccountRecord = {
      ...record,
      updatedAt: new Date().toISOString(),
      recentHistory: record.recentHistory.filter((item) => item.id !== id),
    };
    const nextStore: EntitlementSyncStore = {
      ...store,
      accounts: [
        ...store.accounts.filter((item) => item.userKey !== record.userKey),
        updatedRecord,
      ],
      historyRows: store.historyRows.filter((item) => item.id !== id),
    };

    await persistEntitlementState(nextStore, updatedRecord);
  });

  entitlementSyncMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getAccountEntitlementSyncMemory(user, plan);
}

export async function syncAccountEntitlementsFromBilling(
  user: Pick<User, "id" | "email">,
  plan: PlanTier,
  input: SyncAccountEntitlementsFromBillingInput = {},
): Promise<AccountEntitlementSyncMemory> {
  const mutation = entitlementSyncMutationQueue.then(async () => {
    const { record, store } = await ensureAccountRecord(user, plan);
    const billingMemory = await getAccountBillingMemory(user);
    const changedAt = new Date().toISOString();
    const reason = input.reason?.trim() || billingMemory.relatedEvents[0]?.event || "subscription.charged";
    const actorType = input.actorType ?? "system";
    const actorRef = input.actorRef?.trim() || `billing_${record.userKey}`;
    const nextEntitlements = buildAccountEntitlements(plan, billingMemory.lifecycleState, reason);
    const nextHistoryRows = buildEntitlementHistoryRows({
      record,
      nextEntitlements,
      reason,
      actorType,
      actorRef,
      changedAt,
    });
    const updatedRecord: EntitlementSyncAccountRecord = {
      ...record,
      updatedAt: changedAt,
      plan,
      planLabel: getPlanLabel(plan),
      lifecycleState: billingMemory.lifecycleState,
      syncState: deriveAccountSyncState(nextEntitlements),
      entitlements: nextEntitlements,
      recentHistory: buildAccountRecentHistory(
        nextHistoryRows.length > 0 ? [...nextHistoryRows, ...store.historyRows] : store.historyRows,
        record.email,
      ),
    };
    const nextStore: EntitlementSyncStore = {
      ...store,
      accounts: [...store.accounts.filter((item) => item.userKey !== record.userKey), updatedRecord],
      historyRows: nextHistoryRows.length > 0 ? [...nextHistoryRows, ...store.historyRows] : store.historyRows,
    };

    await persistEntitlementState(nextStore, updatedRecord);
  });

  entitlementSyncMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getAccountEntitlementSyncMemory(user, plan);
}

export async function getEntitlementSyncMemory(): Promise<EntitlementSyncMemory> {
  const store = await ensureStore();

  return {
    updatedAt: new Date().toISOString(),
    historyRows: store.historyRows,
    summary: {
      updatesToday: store.historyRows.length,
      automatedChanges: store.historyRows.filter((item) => item.actorType === "system").length,
      manualOverrides: store.historyRows.filter((item) => item.actorType !== "system").length,
      pendingSyncs: store.historyRows.filter((item) => item.syncState !== "Synced").length,
      gracePeriodAccounts: store.accounts.filter((item) => item.lifecycleState.toLowerCase().includes("grace")).length,
    },
    rules: [
      "Billing events should update account-facing entitlements and admin audit history together, not as separate truths.",
      "Grace-period access should be visible as a temporary state instead of pretending the account is fully healthy or fully cancelled.",
      "Manual overrides should carry support or ops context so access decisions remain explainable later.",
      "Subscriber-facing entitlement views should prefer synced records when live database entitlements are still missing.",
    ],
  };
}

export async function getAccountEntitlementSyncMemory(
  user: Pick<User, "id" | "email">,
  plan: PlanTier,
): Promise<AccountEntitlementSyncMemory> {
  const { record, storageMode } = await ensureAccountRecord(user, plan);

  return {
    userKey: record.userKey,
    email: record.email,
    updatedAt: record.updatedAt,
    planLabel: record.planLabel,
    lifecycleState: record.lifecycleState,
    syncState: record.syncState,
    entitlements: record.entitlements,
    recentHistory: record.recentHistory.slice(0, 3),
    storageMode,
    rules: [
      "Synced entitlements should explain why access exists, not only which features are theoretically included in the plan.",
      "Grace-period or recovery posture should remain visible inside the account until billing state becomes fully healthy again.",
      storageMode === "supabase_private_beta"
        ? "Per-account entitlement posture now persists in the shared private-beta account-state store, and the cross-account entitlement audit now reads from the shared durable operator snapshot lane."
        : "This account still falls back to file-backed entitlement persistence because the shared private-beta account-state store is unavailable.",
    ],
  };
}
