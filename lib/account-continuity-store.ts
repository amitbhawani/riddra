import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import type { User } from "@supabase/supabase-js";

import { readDurableAccountStateLane, writeDurableAccountStateLane } from "@/lib/account-state-durable-store";
import { buildAccountFallbackEmail, buildAccountUserKey } from "@/lib/account-identity";
import { getAccountBillingMemory } from "@/lib/billing-ledger-memory-store";
import { getBrokerSyncMemory } from "@/lib/broker-sync-memory-store";
import { getAccountEntitlementSyncMemory } from "@/lib/entitlement-sync-memory-store";
import { getAuthContinuityState } from "@/lib/local-auth-bypass";
import { getAccountNotificationEventMemory } from "@/lib/notification-event-memory-store";
import { normalizePlanTier } from "@/lib/plan-tiers";
import { getPortfolioMemory } from "@/lib/portfolio-memory-store";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";
import { getAccountSupportFollowUpMemory } from "@/lib/support-follow-up-memory-store";
import { getSubscriberWorkspaceRegistrySummary } from "@/lib/subscriber-workspace-registry";
import { getSubscriberWorkspaceMemory } from "@/lib/subscriber-workspace-store";

export type AccountContinuityLaneId =
  | "workspace"
  | "portfolio"
  | "broker"
  | "billing"
  | "entitlements"
  | "delivery"
  | "support";

export type AccountContinuityLaneSnapshot = {
  id: AccountContinuityLaneId;
  title: string;
  href: string;
  storageMode: "file_backed_preview" | "file_backed_private_beta" | "supabase_private_beta";
  metric: string;
  totalRows: number;
  attentionCount: number;
  healthyCount: number;
  lastUpdatedAt: string;
  note: string;
};

export type AccountContinuityRecord = {
  userKey: string;
  userId: string;
  email: string;
  updatedAt: string;
  firstSeenAt: string;
  lastSeenAt: string;
  lastRoute: string;
  lastAction: string;
  storageMode: "file_backed_private_beta" | "supabase_private_beta";
  auth: ReturnType<typeof getAuthContinuityState>;
  preferences: {
    watchlists: number;
    savedScreens: number;
    alertPreferences: number;
    alertFeedRows: number;
    inboxItems: number;
    consentItems: number;
    consentChannels: number;
  };
  supportAndDelivery: {
    supportRequests: number;
    openSupportRequests: number;
    deliveryRoutes: number;
    deliveryEvents: number;
    emailEvents: number;
  };
  entitlements: {
    currentPlan: string;
    planLabel: string;
    lifecycleState: string;
    syncState: string;
    entitlementCount: number;
    placeholderSource: "billing_placeholder_without_razorpay";
  };
  lanes: AccountContinuityLaneSnapshot[];
  blockers: string[];
};

type AccountContinuityStore = {
  version: number;
  accounts: AccountContinuityRecord[];
};

type SyncAccountContinuityOptions = {
  route?: string;
  action?: string;
};

const STORE_PATH = path.join(process.cwd(), "data", "account-continuity-memory.json");
const STORE_VERSION = 1;
const DURABLE_LANE = "account_continuity" as const;
let accountContinuityMutationQueue = Promise.resolve();

function buildLaneSnapshot(input: Omit<AccountContinuityLaneSnapshot, "storageMode"> & { storageMode?: AccountContinuityLaneSnapshot["storageMode"] }) {
  return {
    storageMode: input.storageMode ?? "file_backed_preview",
    ...input,
  };
}

function cloneLaneSnapshot(item: AccountContinuityLaneSnapshot): AccountContinuityLaneSnapshot {
  return { ...item };
}

function cloneAccountContinuityRecord(record: AccountContinuityRecord): AccountContinuityRecord {
  return {
    ...record,
    auth: { ...record.auth },
    preferences: { ...record.preferences },
    supportAndDelivery: { ...record.supportAndDelivery },
    entitlements: { ...record.entitlements },
    lanes: record.lanes.map(cloneLaneSnapshot),
    blockers: [...record.blockers],
  };
}

async function readStore(): Promise<AccountContinuityStore | null> {
  try {
    const content = await readFile(STORE_PATH, "utf8");
    return JSON.parse(content) as AccountContinuityStore;
  } catch {
    return null;
  }
}

async function writeStore(store: AccountContinuityStore) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function removeAccountContinuityRecordFromFileStore(userKey: string) {
  const store = await readStore();

  if (!store?.accounts?.some((item) => item.userKey === userKey)) {
    return;
  }

  await writeStore({
    ...store,
    accounts: store.accounts.filter((item) => item.userKey !== userKey).map(cloneAccountContinuityRecord),
  });
}

async function ensureStore() {
  const storeExists = await access(STORE_PATH)
    .then(() => true)
    .catch(() => false);
  const store = await readStore();

  if (storeExists && store?.accounts) {
    return store;
  }

  const nextStore: AccountContinuityStore = {
    version: STORE_VERSION,
    accounts: [],
  };
  await writeStore(nextStore);
  return nextStore;
}

function buildBlockers(input: {
  auth: ReturnType<typeof getAuthContinuityState>;
  brokerReviewCount: number;
  deliveryAttentionCount: number;
  supportOpenRequests: number;
  entitlementSyncState: string;
  supportRegistryBlocked: number;
}) {
  const blockers: string[] = [];

  if (input.auth.mode === "local_bypass") {
    blockers.push("Local auth bypass is still active, so the signed-in state is not yet validated against a real Supabase session.");
  } else if (input.auth.mode === "auth_unconfigured") {
    blockers.push("Supabase auth configuration is missing, so refresh and reload continuity cannot be verified for real user sessions.");
  }

  if (input.brokerReviewCount > 0) {
    blockers.push(`${input.brokerReviewCount} broker continuity rows still need manual review before broker-linked state can be treated as trustworthy.`);
  }

  if (input.deliveryAttentionCount > 0) {
    blockers.push(`${input.deliveryAttentionCount} delivery rows are still queued, retrying, blocked, or awaiting consent reconfirmation.`);
  }

  if (input.supportOpenRequests > 0) {
    blockers.push(`${input.supportOpenRequests} support follow-up requests are still open and need completion or scheduling.`);
  }

  if (input.entitlementSyncState !== "Synced") {
    blockers.push("Entitlement placeholders are persisted, but some access rows still need review because billing is not live yet.");
  }

  if (input.supportRegistryBlocked > 0) {
    blockers.push(`${input.supportRegistryBlocked} support delivery lanes are still blocked at the ops layer, so subscriber help posture is not fully hardened.`);
  }

  return blockers;
}

function toAccountContinuityMemory(record: AccountContinuityRecord) {
  return cloneAccountContinuityRecord(record);
}

async function saveAccountContinuityRecord(
  record: AccountContinuityRecord,
): Promise<AccountContinuityRecord["storageMode"]> {
  const wroteDurableRecord = await writeDurableAccountStateLane(
    record.userKey,
    record.email,
    DURABLE_LANE,
    cloneAccountContinuityRecord(record),
  );

  if (wroteDurableRecord) {
    await removeAccountContinuityRecordFromFileStore(record.userKey);
    return "supabase_private_beta";
  }

  const store = await ensureStore();
  const nextStore: AccountContinuityStore = {
    ...store,
    accounts: store.accounts.some((item) => item.userKey === record.userKey)
      ? store.accounts.map((item) =>
          item.userKey === record.userKey ? cloneAccountContinuityRecord(record) : cloneAccountContinuityRecord(item),
        )
      : [...store.accounts.map(cloneAccountContinuityRecord), cloneAccountContinuityRecord(record)],
  };

  await writeStore(nextStore);
  return "file_backed_private_beta";
}

export async function syncAccountContinuityRecord(
  user: Pick<User, "id" | "email">,
  options: SyncAccountContinuityOptions = {},
) {
  const mutation = accountContinuityMutationQueue.then(async () => {
    const userKey = buildAccountUserKey(user);
    const durableExisting = await readDurableAccountStateLane<AccountContinuityRecord>(userKey, DURABLE_LANE);
    const store = durableExisting ? null : await readStore();
    const existing =
      durableExisting ??
      store?.accounts.find((item) => item.userKey === userKey) ??
      null;
    const auth = getAuthContinuityState();
    const now = new Date().toISOString();
    const route = options.route?.trim() || existing?.lastRoute || "/account";
    const action = options.action?.trim() || "Synced account continuity";

    const [
      workspace,
      workspaceRegistry,
      portfolio,
      broker,
      billing,
      delivery,
      support,
    ] = await Promise.all([
      getSubscriberWorkspaceMemory(user),
      getSubscriberWorkspaceRegistrySummary(user),
      getPortfolioMemory(user),
      getBrokerSyncMemory(user),
      getAccountBillingMemory(user),
      getAccountNotificationEventMemory(user),
      getAccountSupportFollowUpMemory(user),
    ]);

    const entitlementPlan = normalizePlanTier(billing.currentPlan);
    const [entitlements, supportRegistry] = await Promise.all([
      getAccountEntitlementSyncMemory(user, entitlementPlan),
      Promise.resolve(getSupportOpsRegistrySummary("account")),
    ]);

    const lanes: AccountContinuityLaneSnapshot[] = [
      buildLaneSnapshot({
        id: "workspace",
        title: "Workspace continuity",
        href: "/account/workspace",
        storageMode: workspace.storageMode,
        metric: `${workspaceRegistry.totalRows} stored workspace rows`,
        totalRows: workspaceRegistry.totalRows,
        attentionCount: 0,
        healthyCount: workspaceRegistry.totalRows,
        lastUpdatedAt: workspace.updatedAt,
        note: `${workspace.watchlists.length} watchlists, ${workspace.savedScreens.length} saved screens, ${workspace.alertPreferences.length} alert preferences, and ${workspace.inboxItems.length} inbox rows now resolve under one persisted workspace record.`,
      }),
      buildLaneSnapshot({
        id: "portfolio",
        title: "Portfolio continuity",
        href: "/portfolio/import",
        storageMode: portfolio.storageMode,
        metric: `${portfolio.importRuns.length} runs · ${portfolio.portfolioSnapshot.length} holdings`,
        totalRows:
          portfolio.importRuns.length +
          portfolio.reconciliations.length +
          portfolio.reviewQueue.length +
          portfolio.portfolioSnapshot.length +
          1 +
          portfolio.activityLog.length,
        attentionCount: portfolio.summary.unresolvedRows,
        healthyCount: Math.max(portfolio.portfolioSnapshot.length + portfolio.reconciliations.length - portfolio.summary.unresolvedRows, 0),
        lastUpdatedAt: portfolio.updatedAt,
        note: `${portfolio.importRuns.length} import runs, ${portfolio.reconciliations.length} checkpoints, and ${portfolio.portfolioSnapshot.length} holdings persist across reloads instead of only living in portfolio UI cards.`,
      }),
      buildLaneSnapshot({
        id: "broker",
        title: "Broker continuity",
        href: "/account/brokers",
        storageMode: broker.storageMode,
        metric: `${broker.linkedAccounts.length} linked accounts · ${broker.syncRuns.length} sync runs`,
        totalRows:
          broker.targets.length +
          broker.syncRuns.length +
          broker.linkedAccounts.length +
          broker.reviewItems.length +
          broker.activityLog.length,
        attentionCount: broker.reviewItems.length + broker.syncRuns.filter((item) => item.queueState !== "Ready to rerun").length,
        healthyCount: broker.linkedAccounts.length,
        lastUpdatedAt: broker.updatedAt,
        note: `${broker.linkedAccounts.length} linked accounts, ${broker.syncRuns.length} sync runs, and ${broker.reviewItems.length} broker-review rows now share one persisted broker account record.`,
      }),
      buildLaneSnapshot({
        id: "billing",
        title: "Billing placeholder continuity",
        href: "/account/billing",
        storageMode: billing.storageMode,
        metric: `${billing.invoices.length} invoices · ${billing.relatedEvents.length} billing events`,
        totalRows: billing.invoices.length + billing.relatedEvents.length,
        attentionCount:
          billing.invoices.filter((item) => item.status !== "Paid").length +
          billing.relatedEvents.filter((item) => item.status !== "Processed").length,
        healthyCount: billing.invoices.filter((item) => item.status === "Paid").length,
        lastUpdatedAt: billing.updatedAt,
        note: `${billing.currentPlan} and ${billing.lifecycleState} are now explained from stored invoice and event rows, even though Razorpay remains deferred.`,
      }),
      buildLaneSnapshot({
        id: "entitlements",
        title: "Entitlement continuity",
        href: "/account/access/entitlements",
        storageMode: entitlements.storageMode,
        metric: `${entitlements.entitlements.length} entitlement rows`,
        totalRows: entitlements.entitlements.length + entitlements.recentHistory.length,
        attentionCount: entitlements.syncState === "Needs review" ? entitlements.recentHistory.length || 1 : 0,
        healthyCount: entitlements.entitlements.filter((item) => item.syncState === "Synced").length,
        lastUpdatedAt: entitlements.updatedAt,
        note: `${entitlements.entitlements.length} entitlement rows and ${entitlements.recentHistory.length} recent sync records explain access posture without needing live billing coupling yet.`,
      }),
      buildLaneSnapshot({
        id: "delivery",
        title: "Support and delivery continuity",
        href: "/account/consents",
        storageMode: delivery.storageMode,
        metric: `${delivery.channelRoutes.length} channel routes · ${delivery.recentEvents.length} delivery events`,
        totalRows: delivery.channelRoutes.length + delivery.recentEvents.length,
        attentionCount:
          delivery.channelRoutes.filter((item) => item.consentStatus !== "Allowed" || item.deliveryState !== "Healthy").length +
          delivery.recentEvents.filter((item) => item.deliveryState !== "Delivered" && item.deliveryState !== "Suppressed").length,
        healthyCount:
          delivery.channelRoutes.filter((item) => item.deliveryState === "Healthy").length +
          delivery.recentEvents.filter((item) => item.deliveryState === "Delivered").length,
        lastUpdatedAt: delivery.updatedAt,
        note: `${delivery.channelRoutes.length} channel routes and ${delivery.recentEvents.length} delivery events are persisted with consent-aware state and email delivery outcomes.`,
      }),
      buildLaneSnapshot({
        id: "support",
        title: "Support continuity",
        href: "/account/support",
        storageMode: support.storageMode,
        metric: `${support.requests.length} support requests`,
        totalRows: support.requests.length,
        attentionCount: support.summary.queued + support.summary.scheduled + support.summary.inProgress + support.summary.needsReview,
        healthyCount: Math.max(support.requests.length - (support.summary.queued + support.summary.scheduled + support.summary.inProgress + support.summary.needsReview), 0),
        lastUpdatedAt: support.updatedAt,
        note: `${support.requests.length} support requests are stored per account, while ${supportRegistry.ready} support ops rows are already configured behind the help surface.`,
      }),
    ];

    const blockers = buildBlockers({
      auth,
      brokerReviewCount: lanes.find((lane) => lane.id === "broker")?.attentionCount ?? 0,
      deliveryAttentionCount: lanes.find((lane) => lane.id === "delivery")?.attentionCount ?? 0,
      supportOpenRequests: lanes.find((lane) => lane.id === "support")?.attentionCount ?? 0,
      entitlementSyncState: entitlements.syncState,
      supportRegistryBlocked: supportRegistry.blocked,
    });

    const nextRecord: AccountContinuityRecord = {
      userKey: buildAccountUserKey(user),
      userId: user.id,
      email: buildAccountFallbackEmail(user),
      updatedAt: now,
      firstSeenAt: existing?.firstSeenAt ?? now,
      lastSeenAt: now,
      lastRoute: route,
      lastAction: action,
      storageMode: "file_backed_private_beta",
      auth,
      preferences: {
        watchlists: workspace.watchlists.length,
        savedScreens: workspace.savedScreens.length,
        alertPreferences: workspace.alertPreferences.length,
        alertFeedRows: workspace.alertFeed.length,
        inboxItems: workspace.inboxItems.length,
        consentItems: workspace.consentItems.length,
        consentChannels: delivery.channelRoutes.length,
      },
      supportAndDelivery: {
        supportRequests: support.requests.length,
        openSupportRequests: support.summary.queued + support.summary.scheduled + support.summary.inProgress + support.summary.needsReview,
        deliveryRoutes: delivery.channelRoutes.length,
        deliveryEvents: delivery.recentEvents.length,
        emailEvents: delivery.recentEvents.filter((item) => item.channel === "Email").length,
      },
      entitlements: {
        currentPlan: billing.currentPlan,
        planLabel: entitlements.planLabel,
        lifecycleState: entitlements.lifecycleState,
        syncState: entitlements.syncState,
        entitlementCount: entitlements.entitlements.length,
        placeholderSource: "billing_placeholder_without_razorpay",
      },
      lanes,
      blockers,
    };

    nextRecord.storageMode = await saveAccountContinuityRecord(nextRecord);

    return toAccountContinuityMemory(nextRecord);
  });

  accountContinuityMutationQueue = mutation.then(() => undefined, () => undefined);
  return mutation;
}

export async function getAccountContinuityRecord(
  user: Pick<User, "id" | "email">,
  options: SyncAccountContinuityOptions = {},
) {
  return syncAccountContinuityRecord(user, options);
}
