import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import type { User } from "@supabase/supabase-js";

import { readDurableAccountStateLane, writeDurableAccountStateLane } from "@/lib/account-state-durable-store";
import { buildAccountUserKey } from "@/lib/account-identity";
import { alertFeedItems, alertPreferences, type AlertFeedItem, type AlertPreference } from "@/lib/alerts";
import { inboxItems, type InboxItem } from "@/lib/account-inbox";
import { consentOpsItems, consentOpsRules, consentOpsSummary } from "@/lib/consent-ops";
import {
  canUseFileFallback,
  getFileFallbackDisabledMessage,
} from "@/lib/durable-data-runtime";
import { savedScreenSamples, watchlistSamples } from "@/lib/subscriber-workspace";

type WorkspaceWatchlist = {
  title: string;
  assetCount: number;
  linkedAlerts: number;
  note: string;
  createdAt: string;
  updatedAt: string;
};

type WorkspaceSavedScreen = {
  title: string;
  type: string;
  note: string;
  repeatRunCapable: boolean;
  sharedLayout: boolean;
  createdAt: string;
  updatedAt: string;
};

type WorkspaceConsentSummary = {
  consentChannels: number;
  lifecycleScopes: number;
  userControls: number;
};

type WorkspaceConsentItem = {
  title: string;
  status: string;
  summary: string;
};

export type WorkspaceActivityEntry = {
  id: string;
  scope: "workspace" | "watchlist" | "screen" | "alert_preference" | "alert_feed" | "inbox" | "consent";
  title: string;
  detail: string;
  action: "Created" | "Removed" | "Updated" | "Logged";
  timestamp: string;
};

type SubscriberWorkspaceRecord = {
  userKey: string;
  email: string;
  updatedAt: string;
  watchlists: WorkspaceWatchlist[];
  alertPreferences: AlertPreference[];
  alertFeed: AlertFeedItem[];
  savedScreens: WorkspaceSavedScreen[];
  inboxItems: InboxItem[];
  consentSummary: WorkspaceConsentSummary;
  consentItems: WorkspaceConsentItem[];
  consentRules: string[];
  activityLog: WorkspaceActivityEntry[];
};

type SubscriberWorkspaceStore = {
  version: number;
  accounts: SubscriberWorkspaceRecord[];
};

export type SubscriberWorkspaceMemory = {
  userKey: string;
  email: string;
  updatedAt: string;
  storageMode: "file_backed_preview" | "supabase_private_beta";
  watchlists: WorkspaceWatchlist[];
  watchlistSummary: {
    activeLists: number;
    trackedAssets: number;
    alertsAttached: number;
  };
  alertPreferences: AlertPreference[];
  alertFeed: AlertFeedItem[];
  savedScreens: WorkspaceSavedScreen[];
  savedScreenSummary: {
    savedScreens: number;
    repeatRuns: number;
    sharedLayouts: number;
  };
  inboxItems: InboxItem[];
  consentSummary: WorkspaceConsentSummary;
  consentItems: WorkspaceConsentItem[];
  consentRules: string[];
  activityLog: WorkspaceActivityEntry[];
  activitySummary: {
    entries: number;
  };
};

export type CreateWorkspaceWatchlistInput = {
  title: string;
  assetCount: number;
  linkedAlerts: number;
  note: string;
};

export type CreateWorkspaceSavedScreenInput = {
  title: string;
  type: string;
  note: string;
  repeatRunCapable: boolean;
  sharedLayout: boolean;
};

export type SaveWorkspaceAlertPreferenceInput = {
  label: string;
  defaultState: AlertPreference["defaultState"];
  note: string;
};

export type RemoveWorkspaceAlertPreferenceInput = {
  label: string;
};

export type SaveWorkspaceAlertFeedItemInput = {
  title: string;
  timestamp: string;
  channel: string;
  status: AlertFeedItem["status"];
  summary: string;
};

export type SaveWorkspaceInboxItemInput = {
  title: string;
  source: string;
  timestamp: string;
  priority: InboxItem["priority"];
  status: InboxItem["status"];
  summary: string;
  actionLabel: string;
  actionHref: string;
};

export type SaveWorkspaceConsentItemInput = {
  title: string;
  status: string;
  summary: string;
};

export type RemoveWorkspaceWatchlistInput = {
  title: string;
};

export type RemoveWorkspaceSavedScreenInput = {
  title: string;
};

export type RemoveWorkspaceAlertFeedItemInput = {
  title: string;
};

export type RemoveWorkspaceInboxItemInput = {
  title: string;
};

export type RemoveWorkspaceConsentItemInput = {
  title: string;
};

const STORE_PATH = path.join(process.cwd(), "data", "subscriber-workspace-memory.json");
const STORE_VERSION = 1;
const DURABLE_LANE = "workspace" as const;
let workspaceMutationQueue = Promise.resolve();
const SUBSCRIBER_WORKSPACE_FALLBACK_SCOPE = "Subscriber workspace";

const LEGACY_WATCHLIST_BLUEPRINT = [
  {
    title: watchlistSamples[0]?.title ?? "High-conviction stocks",
    assetCount: 8,
    linkedAlerts: 3,
    note: watchlistSamples[0]?.note ?? "Long-term watchlist for core Indian stocks with follow-up alerts and chart shortcuts.",
  },
  {
    title: watchlistSamples[1]?.title ?? "IPO radar",
    assetCount: 5,
    linkedAlerts: 2,
    note: watchlistSamples[1]?.note ?? "Upcoming and active IPOs tracked for GMP, subscription, allotment, and listing follow-up.",
  },
  {
    title: watchlistSamples[2]?.title ?? "Funds to compare",
    assetCount: 5,
    linkedAlerts: 2,
    note: watchlistSamples[2]?.note ?? "Mutual funds grouped for return-table review, allocation checks, and eventual overlap analysis.",
  },
];

const LEGACY_SAVED_SCREEN_BLUEPRINT = [
  {
    title: savedScreenSamples[0]?.title ?? "Momentum shortlist",
    type: savedScreenSamples[0]?.type ?? "Stock screener",
    note: savedScreenSamples[0]?.note ?? "Repeatable stock scan for price strength, sector support, and chart follow-up.",
    repeatRunCapable: true,
    sharedLayout: true,
  },
  {
    title: savedScreenSamples[1]?.title ?? "IPO quality filter",
    type: savedScreenSamples[1]?.type ?? "IPO workflow",
    note: savedScreenSamples[1]?.note ?? "Tracks issue size, GMP, lot size, and subscription momentum in one reusable view.",
    repeatRunCapable: true,
    sharedLayout: false,
  },
  {
    title: savedScreenSamples[2]?.title ?? "Fund benchmark review",
    type: savedScreenSamples[2]?.type ?? "Mutual fund compare",
    note: savedScreenSamples[2]?.note ?? "Reusable workspace for category, benchmark, risk, and top-holdings review.",
    repeatRunCapable: false,
    sharedLayout: true,
  },
];

const DEFAULT_CONSENT_SUMMARY: WorkspaceConsentSummary = {
  consentChannels: consentOpsSummary.consentChannels,
  lifecycleScopes: consentOpsSummary.lifecycleScopes,
  userControls: consentOpsSummary.userControls,
};

const DEFAULT_STORE: SubscriberWorkspaceStore = {
  version: STORE_VERSION,
  accounts: [],
};

function buildUserKey(user: Pick<User, "id" | "email">) {
  return buildAccountUserKey(user);
}

function cloneAlertPreference(item: AlertPreference): AlertPreference {
  return { ...item };
}

function cloneAlertFeedItem(item: AlertFeedItem): AlertFeedItem {
  return { ...item };
}

function cloneInboxItem(item: InboxItem): InboxItem {
  return { ...item };
}

function cloneConsentItem(item: WorkspaceConsentItem): WorkspaceConsentItem {
  return { ...item };
}

function cloneWorkspaceActivityEntry(item: WorkspaceActivityEntry): WorkspaceActivityEntry {
  return { ...item };
}

function toActivitySlug(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "entry";
}

function buildWorkspaceActivityEntry(input: Omit<WorkspaceActivityEntry, "id">): WorkspaceActivityEntry {
  return {
    ...input,
    id: `${input.scope}-${toActivitySlug(input.title)}-${input.timestamp}`,
  };
}

function appendWorkspaceActivityLog(
  entries: WorkspaceActivityEntry[],
  entry: WorkspaceActivityEntry,
): WorkspaceActivityEntry[] {
  return [entry, ...entries.filter((item) => item.id !== entry.id)].slice(0, 18);
}

function cloneWorkspaceRecord(record: SubscriberWorkspaceRecord): SubscriberWorkspaceRecord {
  return {
    ...record,
    watchlists: record.watchlists.map((item) => ({ ...item })),
    alertPreferences: record.alertPreferences.map(cloneAlertPreference),
    alertFeed: record.alertFeed.map(cloneAlertFeedItem),
    savedScreens: record.savedScreens.map((item) => ({ ...item })),
    inboxItems: record.inboxItems.map(cloneInboxItem),
    consentSummary: { ...record.consentSummary },
    consentItems: record.consentItems.map(cloneConsentItem),
    consentRules: [...record.consentRules],
    activityLog: Array.isArray(record.activityLog) ? record.activityLog.map(cloneWorkspaceActivityEntry) : [],
  };
}

function isLegacySeededWatchlist(item: WorkspaceWatchlist) {
  return LEGACY_WATCHLIST_BLUEPRINT.some(
    (blueprint) =>
      item.title === blueprint.title &&
      item.assetCount === blueprint.assetCount &&
      item.linkedAlerts === blueprint.linkedAlerts &&
      item.note === blueprint.note,
  );
}

function isLegacySeededSavedScreen(item: WorkspaceSavedScreen) {
  return LEGACY_SAVED_SCREEN_BLUEPRINT.some(
    (blueprint) =>
      item.title === blueprint.title &&
      item.type === blueprint.type &&
      item.note === blueprint.note &&
      item.repeatRunCapable === blueprint.repeatRunCapable &&
      item.sharedLayout === blueprint.sharedLayout,
  );
}

function isLegacySeededAlertFeedItem(item: AlertFeedItem) {
  return alertFeedItems.some(
    (seeded) =>
      item.title === seeded.title &&
      item.timestamp === seeded.timestamp &&
      item.channel === seeded.channel &&
      item.status === seeded.status &&
      item.summary === seeded.summary,
  );
}

function isLegacySeededInboxItem(item: InboxItem) {
  return inboxItems.some(
    (seeded) =>
      item.title === seeded.title &&
      item.source === seeded.source &&
      item.timestamp === seeded.timestamp &&
      item.priority === seeded.priority &&
      item.status === seeded.status &&
      item.summary === seeded.summary &&
      item.actionLabel === seeded.actionLabel &&
      item.actionHref === seeded.actionHref,
  );
}

function normalizeLegacySeededWorkspaceRecord(
  record: SubscriberWorkspaceRecord,
): { record: SubscriberWorkspaceRecord; changed: boolean } {
  const nextWatchlists = record.watchlists.filter((item) => !isLegacySeededWatchlist(item));
  const nextSavedScreens = record.savedScreens.filter((item) => !isLegacySeededSavedScreen(item));
  const nextAlertFeed = record.alertFeed.filter((item) => !isLegacySeededAlertFeedItem(item));
  const nextInboxItems = record.inboxItems.filter((item) => !isLegacySeededInboxItem(item));
  const seededWorkspaceLogRemoved = record.activityLog.filter(
    (item) =>
      !(
        item.scope === "workspace" &&
        item.title === "Workspace snapshot ready" &&
        item.detail.includes("Seeded watchlists, screens, alerts, inbox state, and consent posture")
      ),
  );

  const changed =
    nextWatchlists.length !== record.watchlists.length ||
    nextSavedScreens.length !== record.savedScreens.length ||
    nextAlertFeed.length !== record.alertFeed.length ||
    nextInboxItems.length !== record.inboxItems.length ||
    seededWorkspaceLogRemoved.length !== record.activityLog.length;

  if (!changed) {
    return {
      record,
      changed: false,
    };
  }

  return {
    changed: true,
    record: {
      ...record,
      updatedAt: new Date().toISOString(),
      watchlists: nextWatchlists,
      alertFeed: nextAlertFeed,
      savedScreens: nextSavedScreens,
      inboxItems: nextInboxItems,
      activityLog: seededWorkspaceLogRemoved,
    },
  };
}

function buildDefaultWorkspaceRecord(user: Pick<User, "id" | "email">): SubscriberWorkspaceRecord {
  const createdAt = new Date().toISOString();

  return {
    userKey: buildUserKey(user),
    email: user.email ?? `${user.id}@local-preview.riddra`,
    updatedAt: createdAt,
    watchlists: [],
    alertPreferences: alertPreferences.map(cloneAlertPreference),
    alertFeed: [],
    savedScreens: [],
    inboxItems: [],
    consentSummary: { ...DEFAULT_CONSENT_SUMMARY },
    consentItems: consentOpsItems.map((item) => ({
      title: item.title,
      status: item.status,
      summary: item.summary,
    })),
    consentRules: [...consentOpsRules],
    activityLog: [],
  };
}

async function readStore(): Promise<SubscriberWorkspaceStore> {
  if (!canUseFileFallback()) {
    return DEFAULT_STORE;
  }

  try {
    const content = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(content) as Partial<SubscriberWorkspaceStore>;

    return {
      version: typeof parsed.version === "number" ? parsed.version : STORE_VERSION,
      accounts: Array.isArray(parsed.accounts)
        ? parsed.accounts.map((item) => cloneWorkspaceRecord(item as SubscriberWorkspaceRecord))
        : [],
    };
  } catch {
    return DEFAULT_STORE;
  }
}

async function writeStore(store: SubscriberWorkspaceStore) {
  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage(SUBSCRIBER_WORKSPACE_FALLBACK_SCOPE));
  }

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function removeWorkspaceRecordFromFileStore(userKey: string) {
  const store = await readStore();

  if (!store.accounts.some((item) => item.userKey === userKey)) {
    return;
  }

  await writeStore({
    ...store,
    accounts: store.accounts.filter((item) => item.userKey !== userKey).map(cloneWorkspaceRecord),
  });
}

async function readDurableWorkspaceRecord(userKey: string) {
  const payload = await readDurableAccountStateLane<SubscriberWorkspaceRecord>(userKey, DURABLE_LANE);
  return payload ? cloneWorkspaceRecord(payload) : null;
}

async function ensureWorkspaceRecordInStore(store: SubscriberWorkspaceStore, user: Pick<User, "id" | "email">) {
  const userKey = buildUserKey(user);
  const existing = store.accounts.find((item) => item.userKey === userKey);

  if (existing) {
    return { record: cloneWorkspaceRecord(existing), store };
  }

  const nextRecord = buildDefaultWorkspaceRecord(user);
  return {
    record: cloneWorkspaceRecord(nextRecord),
    store: {
      ...store,
      accounts: [...store.accounts, nextRecord],
    },
  };
}

async function saveWorkspaceRecord(record: SubscriberWorkspaceRecord): Promise<SubscriberWorkspaceMemory["storageMode"]> {
  const wroteDurableRecord = await writeDurableAccountStateLane(record.userKey, record.email, DURABLE_LANE, cloneWorkspaceRecord(record));

  if (wroteDurableRecord) {
    await removeWorkspaceRecordFromFileStore(record.userKey);
    return "supabase_private_beta";
  }

  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage(SUBSCRIBER_WORKSPACE_FALLBACK_SCOPE));
  }

  const store = await readStore();
  const nextAccounts = store.accounts.some((item) => item.userKey === record.userKey)
    ? store.accounts.map((item) => (item.userKey === record.userKey ? cloneWorkspaceRecord(record) : cloneWorkspaceRecord(item)))
    : [...store.accounts.map(cloneWorkspaceRecord), cloneWorkspaceRecord(record)];

  await writeStore({
    ...store,
    accounts: nextAccounts,
  });

  return "file_backed_preview";
}

async function ensureWorkspaceRecord(user: Pick<User, "id" | "email">) {
  const userKey = buildUserKey(user);
  const durableRecord = await readDurableWorkspaceRecord(userKey);

  if (durableRecord) {
    const normalized = normalizeLegacySeededWorkspaceRecord(durableRecord);

    if (normalized.changed) {
      const storageMode = await saveWorkspaceRecord(normalized.record);
      return {
        record: normalized.record,
        storageMode,
      };
    }

    return {
      record: durableRecord,
      storageMode: "supabase_private_beta" as const,
    };
  }

  if (!canUseFileFallback()) {
    return {
      record: buildDefaultWorkspaceRecord(user),
      storageMode: "supabase_private_beta" as const,
    };
  }

  const store = await readStore();
  const existing = store.accounts.find((item) => item.userKey === userKey);
  const baseRecord = existing ? cloneWorkspaceRecord(existing) : buildDefaultWorkspaceRecord(user);
  const normalized = normalizeLegacySeededWorkspaceRecord(baseRecord);
  const record = normalized.record;
  const storageMode = await saveWorkspaceRecord(record);

  return {
    record,
    storageMode,
  };
}

export async function getSubscriberWorkspaceMemory(user: Pick<User, "id" | "email">): Promise<SubscriberWorkspaceMemory> {
  const { record, storageMode } = await ensureWorkspaceRecord(user);
  const trackedAssets = record.watchlists.reduce((sum, item) => sum + item.assetCount, 0);
  const alertsAttached = record.watchlists.reduce((sum, item) => sum + item.linkedAlerts, 0);
  const repeatRuns = record.savedScreens.filter((item) => item.repeatRunCapable).length;
  const sharedLayouts = record.savedScreens.filter((item) => item.sharedLayout).length;

  return {
    userKey: record.userKey,
    email: record.email,
    updatedAt: record.updatedAt,
    storageMode,
    watchlists: record.watchlists,
    watchlistSummary: {
      activeLists: record.watchlists.length,
      trackedAssets,
      alertsAttached,
    },
    alertPreferences: record.alertPreferences,
    alertFeed: record.alertFeed,
    savedScreens: record.savedScreens,
    savedScreenSummary: {
      savedScreens: record.savedScreens.length,
      repeatRuns,
      sharedLayouts,
    },
    inboxItems: record.inboxItems,
    consentSummary: record.consentSummary,
    consentItems: record.consentItems,
    consentRules: record.consentRules,
    activityLog: record.activityLog,
    activitySummary: {
      entries: record.activityLog.length,
    },
  };
}

export async function addWorkspaceWatchlist(
  user: Pick<User, "id" | "email">,
  input: CreateWorkspaceWatchlistInput,
): Promise<SubscriberWorkspaceMemory> {
  const mutation = workspaceMutationQueue.then(async () => {
    const { record } = await ensureWorkspaceRecord(user);
    const timestamp = new Date().toISOString();
    const nextWatchlist = {
      title: input.title.trim(),
      assetCount: Math.max(0, input.assetCount),
      linkedAlerts: Math.max(0, input.linkedAlerts),
      note: input.note.trim(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const nextRecord: SubscriberWorkspaceRecord = {
      ...record,
      updatedAt: timestamp,
      watchlists: [nextWatchlist, ...record.watchlists].slice(0, 10),
      activityLog: appendWorkspaceActivityLog(
        record.activityLog,
        buildWorkspaceActivityEntry({
          scope: "watchlist",
          title: nextWatchlist.title,
          detail: `${nextWatchlist.assetCount} assets · ${nextWatchlist.linkedAlerts} linked alerts · ${nextWatchlist.note}`,
          action: "Created",
          timestamp,
        }),
      ),
    };

    await saveWorkspaceRecord(nextRecord);
  });

  workspaceMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getSubscriberWorkspaceMemory(user);
}

export async function addWorkspaceSavedScreen(
  user: Pick<User, "id" | "email">,
  input: CreateWorkspaceSavedScreenInput,
): Promise<SubscriberWorkspaceMemory> {
  const mutation = workspaceMutationQueue.then(async () => {
    const { record } = await ensureWorkspaceRecord(user);
    const timestamp = new Date().toISOString();
    const nextScreen = {
      title: input.title.trim(),
      type: input.type.trim(),
      note: input.note.trim(),
      repeatRunCapable: input.repeatRunCapable,
      sharedLayout: input.sharedLayout,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const nextRecord: SubscriberWorkspaceRecord = {
      ...record,
      updatedAt: timestamp,
      savedScreens: [nextScreen, ...record.savedScreens].slice(0, 10),
      activityLog: appendWorkspaceActivityLog(
        record.activityLog,
        buildWorkspaceActivityEntry({
          scope: "screen",
          title: nextScreen.title,
          detail: `${nextScreen.type} · ${nextScreen.repeatRunCapable ? "Repeat-capable" : "Manual"} · ${
            nextScreen.sharedLayout ? "Shared" : "Private"
          } layout`,
          action: "Created",
          timestamp,
        }),
      ),
    };

    await saveWorkspaceRecord(nextRecord);
  });

  workspaceMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getSubscriberWorkspaceMemory(user);
}

export async function removeWorkspaceWatchlist(
  user: Pick<User, "id" | "email">,
  input: RemoveWorkspaceWatchlistInput,
): Promise<SubscriberWorkspaceMemory> {
  const mutation = workspaceMutationQueue.then(async () => {
    const { record } = await ensureWorkspaceRecord(user);
    const title = input.title.trim();

    if (!title) {
      throw new Error("Watchlist title is required.");
    }

    const nextWatchlists = record.watchlists.filter((item) => item.title !== title);

    if (nextWatchlists.length === record.watchlists.length) {
      throw new Error(`Unknown watchlist: ${title}`);
    }

    const removedWatchlist = record.watchlists.find((item) => item.title === title);
    const timestamp = new Date().toISOString();
    const nextRecord: SubscriberWorkspaceRecord = {
      ...record,
      updatedAt: timestamp,
      watchlists: nextWatchlists,
      activityLog: appendWorkspaceActivityLog(
        record.activityLog,
        buildWorkspaceActivityEntry({
          scope: "watchlist",
          title,
          detail: removedWatchlist
            ? `${removedWatchlist.assetCount} assets · ${removedWatchlist.linkedAlerts} linked alerts removed from workspace memory.`
            : "Watchlist removed from workspace memory.",
          action: "Removed",
          timestamp,
        }),
      ),
    };

    await saveWorkspaceRecord(nextRecord);
  });

  workspaceMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getSubscriberWorkspaceMemory(user);
}

export async function removeWorkspaceSavedScreen(
  user: Pick<User, "id" | "email">,
  input: RemoveWorkspaceSavedScreenInput,
): Promise<SubscriberWorkspaceMemory> {
  const mutation = workspaceMutationQueue.then(async () => {
    const { record } = await ensureWorkspaceRecord(user);
    const title = input.title.trim();

    if (!title) {
      throw new Error("Saved screen title is required.");
    }

    const nextScreens = record.savedScreens.filter((item) => item.title !== title);

    if (nextScreens.length === record.savedScreens.length) {
      throw new Error(`Unknown saved screen: ${title}`);
    }

    const removedScreen = record.savedScreens.find((item) => item.title === title);
    const timestamp = new Date().toISOString();
    const nextRecord: SubscriberWorkspaceRecord = {
      ...record,
      updatedAt: timestamp,
      savedScreens: nextScreens,
      activityLog: appendWorkspaceActivityLog(
        record.activityLog,
        buildWorkspaceActivityEntry({
          scope: "screen",
          title,
          detail: removedScreen
            ? `${removedScreen.type} · ${removedScreen.sharedLayout ? "Shared" : "Private"} layout removed from workspace memory.`
            : "Saved screen removed from workspace memory.",
          action: "Removed",
          timestamp,
        }),
      ),
    };

    await saveWorkspaceRecord(nextRecord);
  });

  workspaceMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getSubscriberWorkspaceMemory(user);
}

export async function removeWorkspaceAlertFeedItem(
  user: Pick<User, "id" | "email">,
  input: RemoveWorkspaceAlertFeedItemInput,
): Promise<SubscriberWorkspaceMemory> {
  const mutation = workspaceMutationQueue.then(async () => {
    const { record } = await ensureWorkspaceRecord(user);
    const title = input.title.trim();

    if (!title) {
      throw new Error("Alert feed title is required.");
    }

    const nextFeed = record.alertFeed.filter((item) => item.title !== title);

    if (nextFeed.length === record.alertFeed.length) {
      throw new Error(`Unknown alert feed item: ${title}`);
    }

    const removedItem = record.alertFeed.find((item) => item.title === title);
    const timestamp = new Date().toISOString();
    const nextRecord: SubscriberWorkspaceRecord = {
      ...record,
      updatedAt: timestamp,
      alertFeed: nextFeed,
      activityLog: appendWorkspaceActivityLog(
        record.activityLog,
        buildWorkspaceActivityEntry({
          scope: "alert_feed",
          title,
          detail: removedItem
            ? `${removedItem.channel} · ${removedItem.status} alert removed from workspace memory.`
            : "Alert feed item removed from workspace memory.",
          action: "Removed",
          timestamp,
        }),
      ),
    };

    await saveWorkspaceRecord(nextRecord);
  });

  workspaceMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getSubscriberWorkspaceMemory(user);
}

export async function removeWorkspaceInboxItem(
  user: Pick<User, "id" | "email">,
  input: RemoveWorkspaceInboxItemInput,
): Promise<SubscriberWorkspaceMemory> {
  const mutation = workspaceMutationQueue.then(async () => {
    const { record } = await ensureWorkspaceRecord(user);
    const title = input.title.trim();

    if (!title) {
      throw new Error("Inbox item title is required.");
    }

    const nextInbox = record.inboxItems.filter((item) => item.title !== title);

    if (nextInbox.length === record.inboxItems.length) {
      throw new Error(`Unknown inbox item: ${title}`);
    }

    const removedItem = record.inboxItems.find((item) => item.title === title);
    const timestamp = new Date().toISOString();
    const nextRecord: SubscriberWorkspaceRecord = {
      ...record,
      updatedAt: timestamp,
      inboxItems: nextInbox,
      activityLog: appendWorkspaceActivityLog(
        record.activityLog,
        buildWorkspaceActivityEntry({
          scope: "inbox",
          title,
          detail: removedItem
            ? `${removedItem.priority} priority · ${removedItem.status} item removed from workspace memory.`
            : "Inbox item removed from workspace memory.",
          action: "Removed",
          timestamp,
        }),
      ),
    };

    await saveWorkspaceRecord(nextRecord);
  });

  workspaceMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getSubscriberWorkspaceMemory(user);
}

export async function removeWorkspaceConsentItem(
  user: Pick<User, "id" | "email">,
  input: RemoveWorkspaceConsentItemInput,
): Promise<SubscriberWorkspaceMemory> {
  const mutation = workspaceMutationQueue.then(async () => {
    const { record } = await ensureWorkspaceRecord(user);
    const title = input.title.trim();

    if (!title) {
      throw new Error("Consent item title is required.");
    }

    const nextConsentItems = record.consentItems.filter((item) => item.title !== title);

    if (nextConsentItems.length === record.consentItems.length) {
      throw new Error(`Unknown consent item: ${title}`);
    }

    const removedItem = record.consentItems.find((item) => item.title === title);
    const timestamp = new Date().toISOString();
    const nextRecord: SubscriberWorkspaceRecord = {
      ...record,
      updatedAt: timestamp,
      consentItems: nextConsentItems,
      activityLog: appendWorkspaceActivityLog(
        record.activityLog,
        buildWorkspaceActivityEntry({
          scope: "consent",
          title,
          detail: removedItem
            ? `${removedItem.status} consent item removed from workspace memory.`
            : "Consent item removed from workspace memory.",
          action: "Removed",
          timestamp,
        }),
      ),
    };

    await saveWorkspaceRecord(nextRecord);
  });

  workspaceMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getSubscriberWorkspaceMemory(user);
}

export async function saveWorkspaceAlertPreference(
  user: Pick<User, "id" | "email">,
  input: SaveWorkspaceAlertPreferenceInput,
): Promise<SubscriberWorkspaceMemory> {
  const mutation = workspaceMutationQueue.then(async () => {
    const { record } = await ensureWorkspaceRecord(user);
    const label = input.label.trim();

    if (!label) {
      throw new Error("Alert preference label is required.");
    }

    let previousDefaultState = "Unknown";
    let matched = false;
    const nextPreferences = record.alertPreferences.map((item) => {
      if (item.label !== label) {
        return item;
      }

      matched = true;
      previousDefaultState = item.defaultState;
      return {
        ...item,
        defaultState: input.defaultState,
        note: input.note.trim(),
      };
    });

    if (!matched) {
      throw new Error(`Unknown alert preference: ${label}`);
    }

    const timestamp = new Date().toISOString();
    const nextRecord: SubscriberWorkspaceRecord = {
      ...record,
      updatedAt: timestamp,
      alertPreferences: nextPreferences,
      activityLog: appendWorkspaceActivityLog(
        record.activityLog,
        buildWorkspaceActivityEntry({
          scope: "alert_preference",
          title: label,
          detail: `${previousDefaultState} → ${input.defaultState} · ${input.note.trim()}`,
          action: "Updated",
          timestamp,
        }),
      ),
    };

    await saveWorkspaceRecord(nextRecord);
  });

  workspaceMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getSubscriberWorkspaceMemory(user);
}

export async function removeWorkspaceAlertPreference(
  user: Pick<User, "id" | "email">,
  input: RemoveWorkspaceAlertPreferenceInput,
): Promise<SubscriberWorkspaceMemory> {
  const mutation = workspaceMutationQueue.then(async () => {
    const { record } = await ensureWorkspaceRecord(user);
    const label = input.label.trim();

    if (!label) {
      throw new Error("Alert preference label is required.");
    }

    const nextPreferences = record.alertPreferences.filter((item) => item.label !== label);

    if (nextPreferences.length === record.alertPreferences.length) {
      throw new Error(`Unknown alert preference: ${label}`);
    }

    const removedItem = record.alertPreferences.find((item) => item.label === label);
    const timestamp = new Date().toISOString();
    const nextRecord: SubscriberWorkspaceRecord = {
      ...record,
      updatedAt: timestamp,
      alertPreferences: nextPreferences,
      activityLog: appendWorkspaceActivityLog(
        record.activityLog,
        buildWorkspaceActivityEntry({
          scope: "alert_preference",
          title: label,
          detail: removedItem
            ? `${removedItem.defaultState} preference removed from workspace memory.`
            : "Alert preference removed from workspace memory.",
          action: "Removed",
          timestamp,
        }),
      ),
    };

    await saveWorkspaceRecord(nextRecord);
  });

  workspaceMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getSubscriberWorkspaceMemory(user);
}

export async function saveWorkspaceAlertFeedItem(
  user: Pick<User, "id" | "email">,
  input: SaveWorkspaceAlertFeedItemInput,
): Promise<SubscriberWorkspaceMemory> {
  const mutation = workspaceMutationQueue.then(async () => {
    const { record } = await ensureWorkspaceRecord(user);
    const title = input.title.trim();

    if (!title) {
      throw new Error("Alert feed title is required.");
    }

    const nextItem: AlertFeedItem = {
      title,
      timestamp: input.timestamp.trim(),
      channel: input.channel.trim(),
      status: input.status,
      summary: input.summary.trim(),
    };

    const existingItem = record.alertFeed.find((item) => item.title === title);
    const nextFeed = [nextItem, ...record.alertFeed.filter((item) => item.title !== title)].slice(0, 12);
    const timestamp = new Date().toISOString();
    const nextRecord: SubscriberWorkspaceRecord = {
      ...record,
      updatedAt: timestamp,
      alertFeed: nextFeed,
      activityLog: appendWorkspaceActivityLog(
        record.activityLog,
        buildWorkspaceActivityEntry({
          scope: "alert_feed",
          title,
          detail: `${nextItem.channel} · ${nextItem.status} · ${nextItem.timestamp} · ${nextItem.summary}`,
          action: existingItem ? "Updated" : "Logged",
          timestamp,
        }),
      ),
    };

    await saveWorkspaceRecord(nextRecord);
  });

  workspaceMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getSubscriberWorkspaceMemory(user);
}

export async function saveWorkspaceInboxItem(
  user: Pick<User, "id" | "email">,
  input: SaveWorkspaceInboxItemInput,
): Promise<SubscriberWorkspaceMemory> {
  const mutation = workspaceMutationQueue.then(async () => {
    const { record } = await ensureWorkspaceRecord(user);
    const title = input.title.trim();

    if (!title) {
      throw new Error("Inbox item title is required.");
    }

    const nextItem: InboxItem = {
      title,
      source: input.source.trim(),
      timestamp: input.timestamp.trim(),
      priority: input.priority,
      status: input.status,
      summary: input.summary.trim(),
      actionLabel: input.actionLabel.trim(),
      actionHref: input.actionHref.trim(),
    };

    const existingItem = record.inboxItems.find((item) => item.title === title);
    const nextInbox = [nextItem, ...record.inboxItems.filter((item) => item.title !== title)].slice(0, 16);
    const timestamp = new Date().toISOString();
    const nextRecord: SubscriberWorkspaceRecord = {
      ...record,
      updatedAt: timestamp,
      inboxItems: nextInbox,
      activityLog: appendWorkspaceActivityLog(
        record.activityLog,
        buildWorkspaceActivityEntry({
          scope: "inbox",
          title,
          detail: `${nextItem.priority} priority · ${nextItem.status} · ${nextItem.source} · ${nextItem.summary}`,
          action: existingItem ? "Updated" : "Logged",
          timestamp,
        }),
      ),
    };

    await saveWorkspaceRecord(nextRecord);
  });

  workspaceMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getSubscriberWorkspaceMemory(user);
}

export async function saveWorkspaceConsentItem(
  user: Pick<User, "id" | "email">,
  input: SaveWorkspaceConsentItemInput,
): Promise<SubscriberWorkspaceMemory> {
  const mutation = workspaceMutationQueue.then(async () => {
    const { record } = await ensureWorkspaceRecord(user);
    const title = input.title.trim();

    if (!title) {
      throw new Error("Consent item title is required.");
    }

    const nextItem: WorkspaceConsentItem = {
      title,
      status: input.status.trim(),
      summary: input.summary.trim(),
    };

    const existingItem = record.consentItems.find((item) => item.title === title);
    const nextConsentItems = [nextItem, ...record.consentItems.filter((item) => item.title !== title)].slice(0, 12);
    const timestamp = new Date().toISOString();
    const nextRecord: SubscriberWorkspaceRecord = {
      ...record,
      updatedAt: timestamp,
      consentItems: nextConsentItems,
      activityLog: appendWorkspaceActivityLog(
        record.activityLog,
        buildWorkspaceActivityEntry({
          scope: "consent",
          title,
          detail: `${nextItem.status} · ${nextItem.summary}`,
          action: existingItem ? "Updated" : "Logged",
          timestamp,
        }),
      ),
    };

    await saveWorkspaceRecord(nextRecord);
  });

  workspaceMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getSubscriberWorkspaceMemory(user);
}
