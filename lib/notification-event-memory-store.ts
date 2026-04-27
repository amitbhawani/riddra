import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import type { User } from "@supabase/supabase-js";

import { buildAccountUserKey } from "@/lib/account-identity";
import { readDurableAccountStateLane, writeDurableAccountStateLane } from "@/lib/account-state-durable-store";
import { canUseFileFallback, getFileFallbackDisabledMessage } from "@/lib/durable-data-runtime";
import { readDurableGlobalStateLane, writeDurableGlobalStateLane } from "@/lib/global-state-durable-store";
import { getSubscriberWorkspaceMemory } from "@/lib/subscriber-workspace-store";

export type NotificationEventRow = {
  id: string;
  title: string;
  channel: "Email" | "WhatsApp" | "SMS" | "Push" | "In-app";
  audienceScope: string;
  triggeredBy: string;
  consentState: "Allowed" | "Needs reconfirmation" | "Blocked";
  deliveryState: "Queued" | "Delivered" | "Retrying" | "Suppressed";
  emailDeliveryState: "Queued" | "Sent" | "Failed" | "Skipped";
  emailMessageId: string | null;
  emailError: string | null;
  nextAttempt: string;
  note: string;
};

export type NotificationChannelRoute = {
  channel: "Email" | "WhatsApp" | "SMS" | "Push" | "In-app";
  mappedScopes: string;
  consentStatus: "Allowed" | "Needs reconfirmation" | "Blocked";
  deliveryState: "Healthy" | "Retry watch" | "Suppressed";
  preferenceSource: string;
  note: string;
};

type NotificationAccountRecord = {
  userKey: string;
  email: string;
  updatedAt: string;
  channelRoutes: NotificationChannelRoute[];
  recentEvents: NotificationEventRow[];
};

type NotificationEventStore = {
  version: number;
  sharedEvents: NotificationEventRow[];
  accounts: NotificationAccountRecord[];
};

type NotificationEventBusState = {
  updatedAt: string;
  sharedEvents: NotificationEventRow[];
};

export type NotificationEventBusMemory = {
  updatedAt: string;
  sharedEvents: NotificationEventRow[];
  summary: {
    mappedChannels: number;
    queuedEvents: number;
    retryingEvents: number;
    blockedByConsent: number;
    deliveredEvents: number;
  };
  rules: string[];
};

export type AccountNotificationEventMemory = {
  userKey: string;
  email: string;
  updatedAt: string;
  channelRoutes: NotificationChannelRoute[];
  recentEvents: NotificationEventRow[];
  storageMode: "file_backed_preview" | "supabase_private_beta";
  rules: string[];
};

export type SaveNotificationChannelRouteInput = {
  channel: NotificationChannelRoute["channel"];
  mappedScopes: string;
  consentStatus: NotificationChannelRoute["consentStatus"];
  deliveryState: NotificationChannelRoute["deliveryState"];
  preferenceSource: string;
  note: string;
};

export type SaveNotificationEventInput = {
  title: string;
  channel: NotificationEventRow["channel"];
  audienceScope: string;
  triggeredBy: string;
  consentState: NotificationEventRow["consentState"];
  deliveryState: NotificationEventRow["deliveryState"];
  nextAttempt: string;
  note: string;
};

export type RemoveNotificationChannelRouteInput = {
  channel: NotificationChannelRoute["channel"];
};

export type RemoveNotificationEventInput = {
  id: string;
};

export type UpdateNotificationEventInput = {
  id: string;
  deliveryState?: NotificationEventRow["deliveryState"];
  emailDeliveryState?: NotificationEventRow["emailDeliveryState"];
  emailMessageId?: string | null;
  emailError?: string | null;
  nextAttempt?: string;
  note?: string;
};

const STORE_PATH = path.join(process.cwd(), "data", "notification-event-memory.json");
const STORE_VERSION = 1;
const DURABLE_LANE = "notification_delivery" as const;
const DURABLE_GLOBAL_LANE = "notification_event_bus" as const;
let notificationEventMutationQueue = Promise.resolve();

const DEFAULT_SHARED_EVENTS: NotificationEventRow[] = [
  {
    id: "notif_evt_001",
    title: "Priority alert delivery rehearsal",
    channel: "Push",
    audienceScope: "Priority alerts",
    triggeredBy: "alerts.priority_signal",
    consentState: "Allowed",
    deliveryState: "Queued",
    emailDeliveryState: "Skipped",
    emailMessageId: null,
    emailError: null,
    nextAttempt: "Apr 15, 2026 · 3:10 PM",
    note: "Queue this for push and in-app once the subscriber route confirms alert eligibility and channel preference together.",
  },
  {
    id: "notif_evt_002",
    title: "Billing recovery reminder",
    channel: "Email",
    audienceScope: "Billing lifecycle",
    triggeredBy: "billing.recovery_day_1",
    consentState: "Allowed",
    deliveryState: "Retrying",
    emailDeliveryState: "Queued",
    emailMessageId: null,
    emailError: null,
    nextAttempt: "Apr 15, 2026 · 4:00 PM",
    note: "Email delivery should retry after payment recovery state and support posture are checked again.",
  },
  {
    id: "notif_evt_003",
    title: "WhatsApp re-engagement campaign",
    channel: "WhatsApp",
    audienceScope: "Lifecycle campaigns",
    triggeredBy: "campaign.win_back",
    consentState: "Needs reconfirmation",
    deliveryState: "Suppressed",
    emailDeliveryState: "Skipped",
    emailMessageId: null,
    emailError: null,
    nextAttempt: "Awaiting consent refresh",
    note: "Do not re-enable WhatsApp until the subscriber consent center confirms campaign scope again.",
  },
  {
    id: "notif_evt_004",
    title: "Portfolio mismatch escalation",
    channel: "In-app",
    audienceScope: "Portfolio review",
    triggeredBy: "portfolio.reconciliation_gap",
    consentState: "Allowed",
    deliveryState: "Delivered",
    emailDeliveryState: "Skipped",
    emailMessageId: null,
    emailError: null,
    nextAttempt: "Delivered",
    note: "In-app delivery remains the safest default for high-urgency workspace review notices.",
  },
  {
    id: "notif_evt_005",
    title: "SMS listing-day fallback",
    channel: "SMS",
    audienceScope: "IPO lifecycle",
    triggeredBy: "ipo.listing_watch",
    consentState: "Blocked",
    deliveryState: "Suppressed",
    emailDeliveryState: "Skipped",
    emailMessageId: null,
    emailError: null,
    nextAttempt: "Blocked by consent",
    note: "SMS should stay blocked until the user explicitly opts into time-sensitive fallback delivery.",
  },
];

function resolveEmailDeliveryState(
  channel: NotificationEventRow["channel"],
  consentState: NotificationEventRow["consentState"],
) {
  if (channel !== "Email") {
    return "Skipped" as const;
  }

  if (consentState === "Blocked" || consentState === "Needs reconfirmation") {
    return "Skipped" as const;
  }

  return "Queued" as const;
}

function normalizeNotificationEvent(event: NotificationEventRow): NotificationEventRow {
  return {
    ...event,
    emailDeliveryState: event.emailDeliveryState ?? resolveEmailDeliveryState(event.channel, event.consentState),
    emailMessageId: event.emailMessageId ?? null,
    emailError: event.emailError ?? null,
  };
}

function cloneNotificationChannelRoute(route: NotificationChannelRoute): NotificationChannelRoute {
  return { ...route };
}

function cloneNotificationEvent(event: NotificationEventRow): NotificationEventRow {
  return { ...event };
}

function cloneNotificationAccountRecord(record: NotificationAccountRecord): NotificationAccountRecord {
  return {
    ...record,
    channelRoutes: record.channelRoutes.map(cloneNotificationChannelRoute),
    recentEvents: record.recentEvents.map(cloneNotificationEvent),
  };
}

function buildUserKey(user: Pick<User, "id" | "email">) {
  return buildAccountUserKey(user);
}

function normalizeConsentStatus(summary: string): "Allowed" | "Needs reconfirmation" | "Blocked" {
  const lower = summary.toLowerCase();
  if (lower.includes("reconfirm")) return "Needs reconfirmation";
  if (lower.includes("blocked") || lower.includes("hold")) return "Blocked";
  return "Allowed";
}

function mapDeliveryState(consentStatus: NotificationChannelRoute["consentStatus"], channel: NotificationChannelRoute["channel"]) {
  if (consentStatus === "Blocked") return "Suppressed" as const;
  if (consentStatus === "Needs reconfirmation") return "Retry watch" as const;
  if (channel === "Push" || channel === "In-app") return "Healthy" as const;
  return "Retry watch" as const;
}

function buildDefaultChannelRoutes(consentItems: Awaited<ReturnType<typeof getSubscriberWorkspaceMemory>>["consentItems"]): NotificationChannelRoute[] {
  const scopes = consentItems.map((item) => item.title).join(", ");
  return [
    {
      channel: "Email",
      mappedScopes: scopes,
      consentStatus: "Allowed",
      deliveryState: "Healthy",
      preferenceSource: "Consent center + billing recovery",
      note: "Email stays the primary lifecycle, billing, and research delivery lane.",
    },
    {
      channel: "WhatsApp",
      mappedScopes: "Lifecycle campaigns, urgent nudges",
      consentStatus: normalizeConsentStatus(consentItems[0]?.summary ?? "Needs reconfirmation"),
      deliveryState: mapDeliveryState(normalizeConsentStatus(consentItems[0]?.summary ?? "Needs reconfirmation"), "WhatsApp"),
      preferenceSource: "Consent center preview scope",
      note: "WhatsApp should remain permission-sensitive and never outrun explicit subscriber consent.",
    },
    {
      channel: "SMS",
      mappedScopes: "Fallback urgency only",
      consentStatus: "Blocked",
      deliveryState: "Suppressed",
      preferenceSource: "Consent center fallback policy",
      note: "SMS should be reserved for high-urgency fallback moments once consent is explicit.",
    },
    {
      channel: "Push",
      mappedScopes: "Priority alerts, watchlists, portfolio reviews",
      consentStatus: "Allowed",
      deliveryState: "Healthy",
      preferenceSource: "Alert preferences + workspace routing",
      note: "Push and in-app should coordinate so subscribers are not spammed across multiple urgent surfaces.",
    },
    {
      channel: "In-app",
      mappedScopes: "Workspace notices, portfolio reviews, account recovery",
      consentStatus: "Allowed",
      deliveryState: "Healthy",
      preferenceSource: "Workspace continuity rules",
      note: "In-app should remain the safest route for context-heavy review tasks before external delivery broadens.",
    },
  ];
}

function buildRecentEvents(email: string): NotificationEventRow[] {
  return DEFAULT_SHARED_EVENTS.map((item) => normalizeNotificationEvent({ ...item, id: `${item.id}_${email}` }));
}

function buildNotificationEventId(input: Pick<SaveNotificationEventInput, "title" | "channel">, email: string) {
  return `notif_evt_${input.channel}_${input.title}_${email}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function limitNotificationEvents(events: NotificationEventRow[], limit = 8) {
  return events.slice(0, limit);
}

function getNotificationRules() {
  return [
    "Consent-aware delivery should explain which channels are allowed, suppressed, or waiting for reconfirmation.",
    "Subscriber-facing delivery history should stay tied to actual workspace and billing workflows, not generic campaign assumptions.",
    "Preview storage is useful for backend progress, but real provider delivery and preference mutation still need to replace this local layer later.",
  ];
}

async function buildDefaultAccountRecord(user: Pick<User, "id" | "email">): Promise<NotificationAccountRecord> {
  const workspace = await getSubscriberWorkspaceMemory(user);
  const updatedAt = new Date().toISOString();
  const email = user.email ?? `${user.id}@local-preview.riddra`;

  return {
    userKey: buildUserKey(user),
    email,
    updatedAt,
    channelRoutes: buildDefaultChannelRoutes(workspace.consentItems),
    recentEvents: buildRecentEvents(email),
  };
}

async function buildDefaultStore(): Promise<NotificationEventStore> {
  return {
    version: STORE_VERSION,
    sharedEvents: DEFAULT_SHARED_EVENTS,
    accounts: [],
  };
}

async function readStore(): Promise<NotificationEventStore | null> {
  if (!canUseFileFallback()) {
    return await buildDefaultStore();
  }

  try {
    const content = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(content) as NotificationEventStore;
    return {
      ...parsed,
      sharedEvents: (parsed.sharedEvents ?? []).map(normalizeNotificationEvent),
      accounts: (parsed.accounts ?? []).map((account) => ({
        ...account,
        recentEvents: (account.recentEvents ?? []).map(normalizeNotificationEvent),
      })),
    };
  } catch {
    return null;
  }
}

async function writeStore(store: NotificationEventStore) {
  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Notification event persistence"));
  }

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function readDurableNotificationEventBusState() {
  const payload = await readDurableGlobalStateLane<NotificationEventBusState>(
    DURABLE_GLOBAL_LANE,
  );

  return payload
    ? {
        updatedAt: payload.updatedAt,
        sharedEvents: (payload.sharedEvents ?? []).map(normalizeNotificationEvent),
      }
    : null;
}

async function writeDurableNotificationEventBusState(store: NotificationEventStore) {
  return writeDurableGlobalStateLane(DURABLE_GLOBAL_LANE, {
    updatedAt: new Date().toISOString(),
    sharedEvents: store.sharedEvents.map(cloneNotificationEvent),
  });
}

async function persistNotificationEventBusState(store: NotificationEventStore) {
  const wroteEventBusState = await writeDurableNotificationEventBusState(store);

  if (wroteEventBusState) {
    if (canUseFileFallback()) {
      await writeStore(store);
    }
    return;
  }

  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Notification event persistence"));
  }

  await writeStore(store);
}

async function ensureStore(): Promise<NotificationEventStore> {
  const store = await readStore();
  const durableEventBusState = await readDurableNotificationEventBusState();

  if (durableEventBusState) {
    return {
      version: store?.version ?? STORE_VERSION,
      sharedEvents: durableEventBusState.sharedEvents.map(cloneNotificationEvent),
      accounts: Array.isArray(store?.accounts) ? store.accounts.map(cloneNotificationAccountRecord) : [],
    };
  }

  if (!canUseFileFallback()) {
    const nextStore = await buildDefaultStore();
    return nextStore;
  }

  const storeExists = await access(STORE_PATH)
    .then(() => true)
    .catch(() => false);

  if (storeExists && store?.sharedEvents?.length) {
    await writeDurableNotificationEventBusState(store);
    return store;
  }

  const nextStore = await buildDefaultStore();
  await writeStore(nextStore);
  await writeDurableNotificationEventBusState(nextStore);
  return nextStore;
}

async function ensureAccountRecordInStore(store: NotificationEventStore, user: Pick<User, "id" | "email">) {
  const userKey = buildUserKey(user);
  const existing = store.accounts.find((item) => item.userKey === userKey);

  if (existing) {
    return { record: existing, store };
  }

  const record = await buildDefaultAccountRecord(user);
  return {
    record,
    store: {
      ...store,
      accounts: [...store.accounts, record],
    },
  };
}

async function ensureAccountRecordForMutation(store: NotificationEventStore, user: Pick<User, "id" | "email">) {
  const durableRecord = await readDurableAccountStateLane<NotificationAccountRecord>(buildUserKey(user), DURABLE_LANE);

  if (durableRecord) {
    return {
      record: cloneNotificationAccountRecord({
        ...durableRecord,
        recentEvents: (durableRecord.recentEvents ?? []).map(normalizeNotificationEvent),
      }),
      store,
    };
  }

  return ensureAccountRecordInStore(store, user);
}

async function ensureAccountRecord(user: Pick<User, "id" | "email">) {
  const userKey = buildUserKey(user);
  const durableRecord = await readDurableAccountStateLane<NotificationAccountRecord>(userKey, DURABLE_LANE);

  if (durableRecord) {
    return {
      record: cloneNotificationAccountRecord({
        ...durableRecord,
        recentEvents: (durableRecord.recentEvents ?? []).map(normalizeNotificationEvent),
      }),
      storageMode: "supabase_private_beta" as const,
    };
  }

  const store = (await readStore()) ?? (await buildDefaultStore());
  const existing = store.accounts.find((item) => item.userKey === userKey);
  const record = existing ? cloneNotificationAccountRecord(existing) : await buildDefaultAccountRecord(user);
  const storageMode = await saveAccountRecord(record, store);

  return {
    record: cloneNotificationAccountRecord(record),
    storageMode,
  };
}

async function saveAccountRecord(
  record: NotificationAccountRecord,
  store: NotificationEventStore,
): Promise<AccountNotificationEventMemory["storageMode"]> {
  const nextStore: NotificationEventStore = {
    ...store,
    accounts: store.accounts.some((item) => item.userKey === record.userKey)
      ? store.accounts.map((item) => (item.userKey === record.userKey ? cloneNotificationAccountRecord(record) : cloneNotificationAccountRecord(item)))
      : [...store.accounts.map(cloneNotificationAccountRecord), cloneNotificationAccountRecord(record)],
  };

  const wroteDurableRecord = await writeDurableAccountStateLane(
    record.userKey,
    record.email,
    DURABLE_LANE,
    cloneNotificationAccountRecord(record),
  );

  if (wroteDurableRecord) {
    if (canUseFileFallback()) {
      await writeStore({
        ...nextStore,
        accounts: nextStore.accounts.filter((item) => item.userKey !== record.userKey).map(cloneNotificationAccountRecord),
      });
    }
    return "supabase_private_beta";
  }

  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Notification event persistence"));
  }

  await writeStore(nextStore);
  return "file_backed_preview";
}

export async function getNotificationEventBusMemory(): Promise<NotificationEventBusMemory> {
  const store = await ensureStore();
  const mappedChannels = new Set(store.accounts.flatMap((item) => item.channelRoutes.map((route) => route.channel))).size || 5;

  return {
    updatedAt: new Date().toISOString(),
    sharedEvents: store.sharedEvents,
    summary: {
      mappedChannels,
      queuedEvents: store.sharedEvents.filter((item) => item.deliveryState === "Queued").length,
      retryingEvents: store.sharedEvents.filter((item) => item.deliveryState === "Retrying").length,
      blockedByConsent: store.sharedEvents.filter((item) => item.consentState === "Blocked" || item.consentState === "Needs reconfirmation").length,
      deliveredEvents: store.sharedEvents.filter((item) => item.deliveryState === "Delivered").length,
    },
    rules: [
      "Every delivery event should carry a consent state, a delivery state, and the upstream workflow that triggered it.",
      "Channel mapping belongs to the backend lane, not just the consent copy layer, so retries and suppression decisions stay explainable.",
      "In-app, push, email, WhatsApp, and SMS should coordinate through one event bus instead of each surface inventing its own delivery logic.",
    ],
  };
}

export async function getAccountNotificationEventMemory(user: Pick<User, "id" | "email">): Promise<AccountNotificationEventMemory> {
  const { record, storageMode } = await ensureAccountRecord(user);

  return {
    userKey: record.userKey,
    email: record.email,
    updatedAt: record.updatedAt,
    channelRoutes: record.channelRoutes,
    recentEvents: record.recentEvents,
    storageMode,
    rules: getNotificationRules(),
  };
}

export async function saveNotificationChannelRoute(
  user: Pick<User, "id" | "email">,
  input: SaveNotificationChannelRouteInput,
): Promise<AccountNotificationEventMemory> {
  const mutation = notificationEventMutationQueue.then(async () => {
    const baseStore = await ensureStore();
    const { record, store } = await ensureAccountRecordForMutation(baseStore, user);
    const updatedAt = new Date().toISOString();
    const nextRoute: NotificationChannelRoute = {
      channel: input.channel,
      mappedScopes: input.mappedScopes.trim(),
      consentStatus: input.consentStatus,
      deliveryState: input.deliveryState,
      preferenceSource: input.preferenceSource.trim(),
      note: input.note.trim(),
    };
    const existingIndex = record.channelRoutes.findIndex((item) => item.channel === input.channel);
    const channelRoutes =
      existingIndex >= 0
        ? record.channelRoutes.map((item, index) => (index === existingIndex ? nextRoute : item))
        : [...record.channelRoutes, nextRoute];

    const nextRecord: NotificationAccountRecord = {
      ...record,
      updatedAt,
      channelRoutes,
    };
    const storageMode = await saveAccountRecord(nextRecord, {
      ...store,
      accounts: store.accounts.map((item) => (item.userKey === record.userKey ? nextRecord : item)),
    });

    return {
      userKey: nextRecord.userKey,
      email: nextRecord.email,
      updatedAt: nextRecord.updatedAt,
      channelRoutes: nextRecord.channelRoutes,
      recentEvents: nextRecord.recentEvents,
      storageMode,
      rules: getNotificationRules(),
    };
  });

  notificationEventMutationQueue = mutation.then(() => undefined, () => undefined);
  return mutation;
}

export async function removeNotificationChannelRoute(
  user: Pick<User, "id" | "email">,
  input: RemoveNotificationChannelRouteInput,
): Promise<AccountNotificationEventMemory> {
  const mutation = notificationEventMutationQueue.then(async () => {
    const baseStore = await ensureStore();
    const { record, store } = await ensureAccountRecordForMutation(baseStore, user);
    const updatedAt = new Date().toISOString();
    const channel = input.channel;
    const channelRoutes = record.channelRoutes.filter((item) => item.channel !== channel);

    if (channelRoutes.length === record.channelRoutes.length) {
      throw new Error(`Unknown consent channel route: ${channel}`);
    }

    const nextRecord: NotificationAccountRecord = {
      ...record,
      updatedAt,
      channelRoutes,
    };
    const storageMode = await saveAccountRecord(nextRecord, {
      ...store,
      accounts: store.accounts.map((item) => (item.userKey === record.userKey ? nextRecord : item)),
    });

    return {
      userKey: nextRecord.userKey,
      email: nextRecord.email,
      updatedAt: nextRecord.updatedAt,
      channelRoutes: nextRecord.channelRoutes,
      recentEvents: nextRecord.recentEvents,
      storageMode,
      rules: getNotificationRules(),
    };
  });

  notificationEventMutationQueue = mutation.then(() => undefined, () => undefined);
  return mutation;
}

export async function saveNotificationEvent(
  user: Pick<User, "id" | "email">,
  input: SaveNotificationEventInput,
): Promise<AccountNotificationEventMemory> {
  const mutation = notificationEventMutationQueue.then(async () => {
    const baseStore = await ensureStore();
    const { record, store } = await ensureAccountRecordForMutation(baseStore, user);
    const updatedAt = new Date().toISOString();
    const nextEvent: NotificationEventRow = {
      id: buildNotificationEventId({ title: input.title, channel: input.channel }, record.email),
      title: input.title.trim(),
      channel: input.channel,
      audienceScope: input.audienceScope.trim(),
      triggeredBy: input.triggeredBy.trim(),
      consentState: input.consentState,
      deliveryState: input.deliveryState,
      emailDeliveryState: resolveEmailDeliveryState(input.channel, input.consentState),
      emailMessageId: null,
      emailError: null,
      nextAttempt: input.nextAttempt.trim(),
      note: input.note.trim(),
    };
    const nextRecord: NotificationAccountRecord = {
      ...record,
      updatedAt,
      recentEvents: limitNotificationEvents([nextEvent, ...record.recentEvents.filter((item) => item.id !== nextEvent.id)]),
    };
    const nextStore: NotificationEventStore = {
      ...store,
      sharedEvents: limitNotificationEvents([nextEvent, ...store.sharedEvents.filter((item) => item.id !== nextEvent.id)]),
      accounts: store.accounts.map((item) => (item.userKey === record.userKey ? nextRecord : item)),
    };
    const storageMode = await saveAccountRecord(nextRecord, nextStore);
    await persistNotificationEventBusState(nextStore);

    return {
      userKey: nextRecord.userKey,
      email: nextRecord.email,
      updatedAt: nextRecord.updatedAt,
      channelRoutes: nextRecord.channelRoutes,
      recentEvents: nextRecord.recentEvents,
      storageMode,
      rules: getNotificationRules(),
    };
  });

  notificationEventMutationQueue = mutation.then(() => undefined, () => undefined);
  return mutation;
}

export async function removeNotificationEvent(
  user: Pick<User, "id" | "email">,
  input: RemoveNotificationEventInput,
): Promise<AccountNotificationEventMemory> {
  const mutation = notificationEventMutationQueue.then(async () => {
    const baseStore = await ensureStore();
    const { record, store } = await ensureAccountRecordForMutation(baseStore, user);
    const updatedAt = new Date().toISOString();
    const id = input.id.trim();

    if (!id) {
      throw new Error("Notification event id is required.");
    }

    const nextRecord: NotificationAccountRecord = {
      ...record,
      updatedAt,
      recentEvents: record.recentEvents.filter((item) => item.id !== id),
    };
    const nextStore: NotificationEventStore = {
      ...store,
      sharedEvents: store.sharedEvents.filter((item) => item.id !== id),
      accounts: store.accounts.map((item) => (item.userKey === record.userKey ? nextRecord : item)),
    };

    if (
      nextRecord.recentEvents.length === record.recentEvents.length &&
      nextStore.sharedEvents.length === store.sharedEvents.length
    ) {
      throw new Error(`Unknown notification event: ${id}`);
    }

    const storageMode = await saveAccountRecord(nextRecord, nextStore);
    await persistNotificationEventBusState(nextStore);

    return {
      userKey: nextRecord.userKey,
      email: nextRecord.email,
      updatedAt: nextRecord.updatedAt,
      channelRoutes: nextRecord.channelRoutes,
      recentEvents: nextRecord.recentEvents,
      storageMode,
      rules: getNotificationRules(),
    };
  });

  notificationEventMutationQueue = mutation.then(() => undefined, () => undefined);
  return mutation;
}

export async function updateNotificationEvent(
  user: Pick<User, "id" | "email">,
  input: UpdateNotificationEventInput,
): Promise<AccountNotificationEventMemory> {
  const mutation = notificationEventMutationQueue.then(async () => {
    const baseStore = await ensureStore();
    const { record, store } = await ensureAccountRecordForMutation(baseStore, user);
    const updatedAt = new Date().toISOString();
    const id = input.id.trim();

    if (!id) {
      throw new Error("Notification event id is required.");
    }

    let matchedEvent = false;
    const patchEvent = (event: NotificationEventRow): NotificationEventRow => {
      if (event.id !== id) {
        return event;
      }

      matchedEvent = true;
      return {
        ...event,
        deliveryState: input.deliveryState ?? event.deliveryState,
        emailDeliveryState: input.emailDeliveryState ?? event.emailDeliveryState,
        emailMessageId: input.emailMessageId !== undefined ? input.emailMessageId : event.emailMessageId,
        emailError: input.emailError !== undefined ? input.emailError : event.emailError,
        nextAttempt: input.nextAttempt ?? event.nextAttempt,
        note: input.note ?? event.note,
      };
    };

    const nextRecord: NotificationAccountRecord = {
      ...record,
      updatedAt,
      recentEvents: record.recentEvents.map(patchEvent),
    };
    const nextStore: NotificationEventStore = {
      ...store,
      sharedEvents: store.sharedEvents.map(patchEvent),
      accounts: store.accounts.map((item) => (item.userKey === record.userKey ? nextRecord : item)),
    };

    if (!matchedEvent) {
      throw new Error(`Unknown notification event: ${id}`);
    }

    const storageMode = await saveAccountRecord(nextRecord, nextStore);
    await persistNotificationEventBusState(nextStore);

    return {
      userKey: nextRecord.userKey,
      email: nextRecord.email,
      updatedAt: nextRecord.updatedAt,
      channelRoutes: nextRecord.channelRoutes,
      recentEvents: nextRecord.recentEvents,
      storageMode,
      rules: getNotificationRules(),
    };
  });

  notificationEventMutationQueue = mutation.then(() => undefined, () => undefined);
  return mutation;
}
