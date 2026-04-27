import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import type { User } from "@supabase/supabase-js";

import { readDurableAccountStateLane, writeDurableAccountStateLane } from "@/lib/account-state-durable-store";
import { buildAccountUserKey } from "@/lib/account-identity";
import { canUseFileFallback, getFileFallbackDisabledMessage } from "@/lib/durable-data-runtime";
import { readDurableGlobalStateLane, writeDurableGlobalStateLane } from "@/lib/global-state-durable-store";
import { accountInvoiceSamples, billingLedgerRules, billingLedgerSamples } from "@/lib/billing-ledger";
import { paymentOpsRules, recentPaymentEventSamples } from "@/lib/payment-ops";
import { normalizePlanTier } from "@/lib/plan-tiers";

export type BillingInvoiceMemoryRow = {
  invoiceId: string;
  planName: string;
  amount: string;
  status: string;
  billedAt: string;
  paidAt: string;
  note: string;
};

export type BillingLedgerMemoryRow = {
  userRef: string;
  planName: string;
  status: string;
  renewalState: string;
  latestInvoice: string;
  note: string;
};

export type BillingEventMemoryRow = {
  id: string;
  event: string;
  status: string;
  subject: string;
  userRef: string;
  occurredAt: string;
  note: string;
};

export type AddBillingInvoiceInput = {
  invoiceId: string;
  planName: string;
  amount: string;
  status: "Paid" | "Failed" | "Upcoming";
  note: string;
};

export type RemoveBillingInvoiceInput = {
  invoiceId: string;
};

export type AddBillingEventInput = {
  event: string;
  status: string;
  subject: string;
  note: string;
};

export type RemoveBillingEventInput = {
  id: string;
};

type BillingLedgerAccountRecord = {
  userKey: string;
  email: string;
  updatedAt: string;
  invoices: BillingInvoiceMemoryRow[];
  currentPlan: string;
  lifecycleState: string;
};

type BillingLedgerMemoryStore = {
  version: number;
  accounts: BillingLedgerAccountRecord[];
  ledgerRows: BillingLedgerMemoryRow[];
  eventRows: BillingEventMemoryRow[];
};

type BillingLedgerGlobalState = {
  updatedAt: string;
  ledgerRows: BillingLedgerMemoryRow[];
  eventRows: BillingEventMemoryRow[];
};

export type BillingLedgerMemory = {
  updatedAt: string;
  ledgerRows: BillingLedgerMemoryRow[];
  eventRows: BillingEventMemoryRow[];
  summary: {
    activeSubscriptions: number;
    renewalsThisWeek: number;
    failuresNeedReview: number;
    verifiedInvoices: number;
    eventFollowUp: number;
  };
  rules: string[];
};

export type AccountBillingMemory = {
  userKey: string;
  email: string;
  updatedAt: string;
  currentPlan: string;
  lifecycleState: string;
  invoices: BillingInvoiceMemoryRow[];
  relatedEvents: BillingEventMemoryRow[];
  storageMode: "file_backed_preview" | "supabase_private_beta";
  rules: string[];
};

const STORE_PATH = path.join(process.cwd(), "data", "billing-ledger-memory.json");
const STORE_VERSION = 1;
const DURABLE_ACCOUNT_LANE = "billing" as const;
const DURABLE_GLOBAL_LANE = "billing_ledger" as const;
let billingLedgerMutationQueue = Promise.resolve();

const DEFAULT_LEDGER_ROWS: BillingLedgerMemoryRow[] = billingLedgerSamples.map((item) => ({ ...item }));
const DEFAULT_EVENT_ROWS: BillingEventMemoryRow[] = recentPaymentEventSamples.map((item) => ({ ...item }));

function buildUserKey(user: Pick<User, "id" | "email">) {
  return buildAccountUserKey(user);
}

function buildDefaultInvoices(email: string | undefined): BillingInvoiceMemoryRow[] {
  const lowerEmail = email?.toLowerCase() ?? "";

  if (lowerEmail.includes("review")) {
    return [
      {
        invoiceId: "inv_riddra_0978",
        planName: "Pro Monthly",
        amount: "Rs. 499",
        status: "Failed",
        billedAt: "Apr 12, 2026",
        paidAt: "Pending retry",
        note: "Grace-period account waiting for retry, support review, and downgrade decision if the next attempt also fails.",
      },
    ];
  }

  if (lowerEmail.includes("subscriber")) {
    return [
      {
        invoiceId: "inv_riddra_0992",
        planName: "Elite Monthly",
        amount: "Rs. 999",
        status: "Paid",
        billedAt: "Apr 12, 2026",
        paidAt: "Apr 12, 2026",
        note: "Renewal completed successfully and account access should stay uninterrupted.",
      },
      {
        invoiceId: "inv_riddra_1031",
        planName: "Elite Monthly",
        amount: "Rs. 999",
        status: "Upcoming",
        billedAt: "May 12, 2026",
        paidAt: "Pending",
        note: "Next scheduled renewal remains in preview mode until live checkout and webhook verification are fully active.",
      },
    ];
  }

  return accountInvoiceSamples.map((item) => ({ ...item }));
}

function buildDefaultAccountRecord(user: Pick<User, "id" | "email">): BillingLedgerAccountRecord {
  const updatedAt = new Date().toISOString();
  const email = user.email ?? `${user.id}@local-preview.riddra`;
  const invoices = buildDefaultInvoices(user.email);
  const latestInvoice = invoices[0];
  const currentPlan = latestInvoice?.planName ?? "Elite Monthly";
  const lifecycleState = latestInvoice?.status === "Failed" ? "Grace period" : latestInvoice?.status === "Upcoming" ? "Renewal scheduled" : "Healthy";

  return {
    userKey: buildUserKey(user),
    email,
    updatedAt,
    invoices,
    currentPlan,
    lifecycleState,
  };
}

function cloneBillingInvoice(item: BillingInvoiceMemoryRow): BillingInvoiceMemoryRow {
  return { ...item };
}

function cloneBillingLedgerRow(item: BillingLedgerMemoryRow): BillingLedgerMemoryRow {
  return { ...item };
}

function cloneBillingEventRow(item: BillingEventMemoryRow): BillingEventMemoryRow {
  return { ...item };
}

function cloneBillingAccountRecord(record: BillingLedgerAccountRecord): BillingLedgerAccountRecord {
  return {
    ...record,
    invoices: record.invoices.map(cloneBillingInvoice),
  };
}

function cloneBillingGlobalState(state: BillingLedgerGlobalState): BillingLedgerGlobalState {
  return {
    updatedAt: state.updatedAt,
    ledgerRows: state.ledgerRows.map(cloneBillingLedgerRow),
    eventRows: state.eventRows.map(cloneBillingEventRow),
  };
}

function toBillingGlobalState(store: BillingLedgerMemoryStore): BillingLedgerGlobalState {
  return {
    updatedAt: new Date().toISOString(),
    ledgerRows: store.ledgerRows.map(cloneBillingLedgerRow),
    eventRows: store.eventRows.map(cloneBillingEventRow),
  };
}

function formatBillingTimestamp(value: Date) {
  return value.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function resolveLifecycleStateFromInvoiceStatus(status: AddBillingInvoiceInput["status"]) {
  if (status === "Failed") {
    return "Grace period";
  }

  if (status === "Upcoming") {
    return "Renewal scheduled";
  }

  return "Healthy";
}

function buildBillingEventFromInvoice(input: AddBillingInvoiceInput, userRef: string): BillingEventMemoryRow {
  const occurredAt = formatBillingTimestamp(new Date());
  const event =
    input.status === "Failed"
      ? "payment.failed"
      : input.status === "Upcoming"
        ? "subscription.renewal_scheduled"
        : "subscription.charged";
  const status =
    input.status === "Failed"
      ? "Needs review"
      : input.status === "Upcoming"
        ? "Pending"
        : "Processed";

  return {
    id: `evt_${input.invoiceId.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    event,
    status,
    subject: `${input.planName} · ${input.invoiceId}`,
    userRef,
    occurredAt,
    note: input.note,
  };
}

function buildBillingEventId(input: AddBillingEventInput) {
  return `evt_${input.event}_${input.subject}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function resolveLifecycleStateFromEvent(event: string, fallback: string) {
  const normalized = event.toLowerCase();

  if (normalized.includes("failed") || normalized.includes("halted")) {
    return "Grace period";
  }

  if (normalized.includes("renewal_scheduled")) {
    return "Renewal scheduled";
  }

  if (normalized.includes("cancel")) {
    return "Cancelled";
  }

  if (normalized.includes("charged") || normalized.includes("activated") || normalized.includes("paid")) {
    return "Healthy";
  }

  return fallback;
}

async function syncBillingStateToEntitlements(
  user: Pick<User, "id" | "email">,
  reason: string,
) {
  const billingMemory = await getAccountBillingMemory(user);
  const { syncAccountEntitlementsFromBilling } = await import("@/lib/entitlement-sync-memory-store");

  await syncAccountEntitlementsFromBilling(user, normalizePlanTier(billingMemory.currentPlan), {
    reason,
    actorType: "system",
    actorRef: `billing_${buildUserKey(user)}`,
  });
}

async function buildDefaultStore(): Promise<BillingLedgerMemoryStore> {
  return {
    version: STORE_VERSION,
    accounts: [],
    ledgerRows: DEFAULT_LEDGER_ROWS,
    eventRows: DEFAULT_EVENT_ROWS,
  };
}

async function readStore(): Promise<BillingLedgerMemoryStore | null> {
  if (!canUseFileFallback()) {
    return await buildDefaultStore();
  }

  try {
    const content = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(content) as BillingLedgerMemoryStore;
    return {
      ...parsed,
      accounts: (parsed.accounts ?? []).map(cloneBillingAccountRecord),
      ledgerRows: (parsed.ledgerRows ?? []).map(cloneBillingLedgerRow),
      eventRows: (parsed.eventRows ?? []).map(cloneBillingEventRow),
    };
  } catch {
    return null;
  }
}

async function writeStore(store: BillingLedgerMemoryStore) {
  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Billing ledger persistence"));
  }

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function readDurableBillingAccountRecord(userKey: string) {
  const payload = await readDurableAccountStateLane<BillingLedgerAccountRecord>(
    userKey,
    DURABLE_ACCOUNT_LANE,
  );
  return payload ? cloneBillingAccountRecord(payload) : null;
}

async function readDurableBillingGlobalState() {
  const payload = await readDurableGlobalStateLane<BillingLedgerGlobalState>(
    DURABLE_GLOBAL_LANE,
  );
  return payload ? cloneBillingGlobalState(payload) : null;
}

async function writeDurableBillingAccountRecord(record: BillingLedgerAccountRecord) {
  return writeDurableAccountStateLane(
    record.userKey,
    record.email,
    DURABLE_ACCOUNT_LANE,
    cloneBillingAccountRecord(record),
  );
}

async function writeDurableBillingGlobalState(store: BillingLedgerMemoryStore) {
  return writeDurableGlobalStateLane(
    DURABLE_GLOBAL_LANE,
    toBillingGlobalState(store),
  );
}

async function persistBillingState(
  store: BillingLedgerMemoryStore,
  accountRecord?: BillingLedgerAccountRecord,
) {
  const results = await Promise.all([
    accountRecord ? writeDurableBillingAccountRecord(accountRecord) : Promise.resolve(true),
    writeDurableBillingGlobalState(store),
  ]);
  const [wroteAccountRecord, wroteGlobalState] = results;

  if (wroteAccountRecord && wroteGlobalState) {
    if (canUseFileFallback()) {
      await writeStore(store);
    }
    return "supabase_private_beta" as const;
  }

  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Billing ledger persistence"));
  }

  await writeStore(store);
  return "file_backed_preview" as const;
}

async function ensureStore(): Promise<BillingLedgerMemoryStore> {
  const store = await readStore();
  const durableGlobalState = await readDurableBillingGlobalState();

  if (durableGlobalState) {
    return {
      version: store?.version ?? STORE_VERSION,
      accounts: Array.isArray(store?.accounts) ? store.accounts.map(cloneBillingAccountRecord) : [],
      ledgerRows: durableGlobalState.ledgerRows.map(cloneBillingLedgerRow),
      eventRows: durableGlobalState.eventRows.map(cloneBillingEventRow),
    };
  }

  if (!canUseFileFallback()) {
    const nextStore = await buildDefaultStore();
    return nextStore;
  }

  const storeExists = await access(STORE_PATH)
    .then(() => true)
    .catch(() => false);

  if (storeExists && store?.ledgerRows?.length && store?.eventRows?.length) {
    await writeDurableBillingGlobalState(store);
    return store;
  }

  const nextStore = await buildDefaultStore();
  await writeStore(nextStore);
  await writeDurableBillingGlobalState(nextStore);
  return nextStore;
}

function ensureAccountRecordInStore(store: BillingLedgerMemoryStore, user: Pick<User, "id" | "email">) {
  const userKey = buildUserKey(user);
  const existing = store.accounts.find((item) => item.userKey === userKey);

  if (existing) {
    return { record: existing, store };
  }

  const record = buildDefaultAccountRecord(user);
  return {
    record,
    store: {
      ...store,
      accounts: [...store.accounts, record],
      ledgerRows:
        store.ledgerRows.find((row) => row.userRef === record.email) ?? !record.invoices.length
          ? store.ledgerRows
          : [
              {
                userRef: record.email,
                planName: record.currentPlan,
                status: record.invoices[0]?.status === "Failed" ? "Grace period" : "Active",
                renewalState: record.lifecycleState,
                latestInvoice: record.invoices[0]?.invoiceId ?? "Pending",
                note: record.invoices[0]?.note ?? "Local preview billing ledger row.",
              },
              ...store.ledgerRows,
            ],
    },
  };
}

async function ensureAccountRecordForMutation(
  store: BillingLedgerMemoryStore,
  user: Pick<User, "id" | "email">,
) {
  const durableRecord = await readDurableBillingAccountRecord(buildUserKey(user));

  if (durableRecord) {
    return { record: durableRecord, store };
  }

  return ensureAccountRecordInStore(store, user);
}

async function ensureAccountRecord(user: Pick<User, "id" | "email">) {
  const store = await ensureStore();
  const durableRecord = await readDurableBillingAccountRecord(buildUserKey(user));

  if (durableRecord) {
    return {
      record: durableRecord,
      store,
      storageMode: (await readDurableBillingGlobalState()) ? ("supabase_private_beta" as const) : ("file_backed_preview" as const),
    };
  }

  const ensured = ensureAccountRecordInStore(store, user);

  if (ensured.store !== store) {
    if (canUseFileFallback()) {
      await writeStore(ensured.store);
    }
  }

  const storageMode =
    await persistBillingState(ensured.store, ensured.record);

  return { ...ensured, storageMode };
}

export async function getBillingLedgerMemory(): Promise<BillingLedgerMemory> {
  const store = await ensureStore();
  const verifiedInvoices = store.accounts.reduce((sum, account) => sum + account.invoices.length, 0);
  const eventFollowUp = store.eventRows.filter((item) => item.status !== "Processed").length;

  return {
    updatedAt: new Date().toISOString(),
    ledgerRows: store.ledgerRows.map(cloneBillingLedgerRow),
    eventRows: store.eventRows.map(cloneBillingEventRow),
    summary: {
      activeSubscriptions: store.ledgerRows.filter((item) => item.status === "Active").length,
      renewalsThisWeek: store.eventRows.filter((item) => item.event === "subscription.charged").length,
      failuresNeedReview: store.ledgerRows.filter((item) => item.renewalState !== "Healthy").length,
      verifiedInvoices,
      eventFollowUp,
    },
    rules: [...billingLedgerRules, ...paymentOpsRules],
  };
}

export async function getAccountBillingMemory(user: Pick<User, "id" | "email">): Promise<AccountBillingMemory> {
  const { record, store, storageMode } = await ensureAccountRecord(user);

  return {
    userKey: record.userKey,
    email: record.email,
    updatedAt: record.updatedAt,
    currentPlan: record.currentPlan,
    lifecycleState: record.lifecycleState,
    invoices: record.invoices.map(cloneBillingInvoice),
    relatedEvents: store.eventRows.filter((item) => item.userRef === record.email).map(cloneBillingEventRow),
    storageMode,
    rules: [...billingLedgerRules, ...paymentOpsRules],
  };
}

export async function addBillingInvoice(
  user: Pick<User, "id" | "email">,
  input: AddBillingInvoiceInput,
): Promise<AccountBillingMemory> {
  const mutation = billingLedgerMutationQueue.then(async () => {
    const baseStore = await ensureStore();
    const { record, store } = await ensureAccountRecordForMutation(baseStore, user);
    const now = new Date();
    const billedAt = formatBillingTimestamp(now);
    const nextInvoice: BillingInvoiceMemoryRow = {
      invoiceId: input.invoiceId,
      planName: input.planName,
      amount: input.amount,
      status: input.status,
      billedAt,
      paidAt: input.status === "Paid" ? billedAt : input.status === "Upcoming" ? "Scheduled" : "Pending retry",
      note: input.note,
    };
    const lifecycleState = resolveLifecycleStateFromInvoiceStatus(input.status);
    const updatedRecord: BillingLedgerAccountRecord = {
      ...record,
      updatedAt: now.toISOString(),
      currentPlan: input.planName,
      lifecycleState,
      invoices: [nextInvoice, ...record.invoices.filter((item) => item.invoiceId !== input.invoiceId)],
    };
    const nextEvent = buildBillingEventFromInvoice(input, record.email);
    const nextLedgerRow: BillingLedgerMemoryRow = {
      userRef: record.email,
      planName: input.planName,
      status: input.status === "Failed" ? "Grace period" : "Active",
      renewalState: lifecycleState,
      latestInvoice: input.invoiceId,
      note: input.note,
    };
    const nextStore: BillingLedgerMemoryStore = {
      ...store,
      accounts: store.accounts.map((item) => (item.userKey === record.userKey ? updatedRecord : item)),
      ledgerRows: [nextLedgerRow, ...store.ledgerRows.filter((item) => item.userRef !== record.email)],
      eventRows: [nextEvent, ...store.eventRows.filter((item) => item.id !== nextEvent.id)],
    };

    await persistBillingState(nextStore, updatedRecord);
  });

  billingLedgerMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  await syncBillingStateToEntitlements(
    user,
    input.status === "Failed"
      ? "payment.failed"
      : input.status === "Upcoming"
        ? "subscription.renewal_scheduled"
        : "subscription.charged",
  );
  return getAccountBillingMemory(user);
}

export async function removeBillingInvoice(
  user: Pick<User, "id" | "email">,
  input: RemoveBillingInvoiceInput,
): Promise<AccountBillingMemory> {
  const mutation = billingLedgerMutationQueue.then(async () => {
    const baseStore = await ensureStore();
    const { record, store } = await ensureAccountRecordForMutation(baseStore, user);
    const invoiceId = input.invoiceId.trim();

    if (!invoiceId) {
      throw new Error("Invoice id is required.");
    }

    const nextInvoices = record.invoices.filter((item) => item.invoiceId !== invoiceId);

    if (nextInvoices.length === record.invoices.length) {
      throw new Error(`Unknown invoice: ${invoiceId}`);
    }

    const nextPrimaryInvoice = nextInvoices[0];
    const currentPlan = nextPrimaryInvoice?.planName ?? "No active preview plan";
    const lifecycleState =
      nextPrimaryInvoice?.status === "Failed"
        ? "Grace period"
        : nextPrimaryInvoice?.status === "Upcoming"
          ? "Renewal scheduled"
          : nextPrimaryInvoice?.status === "Paid"
            ? "Healthy"
            : "No preview invoice";

    const updatedRecord: BillingLedgerAccountRecord = {
      ...record,
      updatedAt: new Date().toISOString(),
      currentPlan,
      lifecycleState,
      invoices: nextInvoices,
    };

    const nextLedgerRow: BillingLedgerMemoryRow = {
      userRef: record.email,
      planName: currentPlan,
      status: nextPrimaryInvoice ? (nextPrimaryInvoice.status === "Failed" ? "Grace period" : "Active") : "Preview only",
      renewalState: lifecycleState,
      latestInvoice: nextPrimaryInvoice?.invoiceId ?? "None",
      note: nextPrimaryInvoice?.note ?? "All preview invoice rows have been archived for this account.",
    };

    const sanitizedInvoiceId = invoiceId.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const nextStore: BillingLedgerMemoryStore = {
      ...store,
      accounts: store.accounts.map((item) => (item.userKey === record.userKey ? updatedRecord : item)),
      ledgerRows: [nextLedgerRow, ...store.ledgerRows.filter((item) => item.userRef !== record.email)],
      eventRows: store.eventRows.filter(
        (item) => item.id !== `evt_${sanitizedInvoiceId}` && !item.subject.includes(invoiceId),
      ),
    };

    await persistBillingState(nextStore, updatedRecord);
  });

  billingLedgerMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  await syncBillingStateToEntitlements(user, "billing.invoice.removed");
  return getAccountBillingMemory(user);
}

export async function addBillingEvent(
  user: Pick<User, "id" | "email">,
  input: AddBillingEventInput,
): Promise<AccountBillingMemory> {
  const mutation = billingLedgerMutationQueue.then(async () => {
    const baseStore = await ensureStore();
    const { record, store } = await ensureAccountRecordForMutation(baseStore, user);
    const occurredAt = formatBillingTimestamp(new Date());
    const lifecycleState = resolveLifecycleStateFromEvent(input.event, record.lifecycleState);
    const nextEvent: BillingEventMemoryRow = {
      id: buildBillingEventId(input),
      event: input.event,
      status: input.status,
      subject: input.subject,
      userRef: record.email,
      occurredAt,
      note: input.note,
    };
    const updatedRecord: BillingLedgerAccountRecord = {
      ...record,
      updatedAt: new Date().toISOString(),
      lifecycleState,
    };
    const existingLedgerRow = store.ledgerRows.find((item) => item.userRef === record.email);
    const nextLedgerRow: BillingLedgerMemoryRow = {
      userRef: record.email,
      planName: existingLedgerRow?.planName ?? record.currentPlan,
      status:
        lifecycleState === "Grace period"
          ? "Grace period"
          : lifecycleState === "Cancelled"
            ? "Cancelled"
            : existingLedgerRow?.status ?? "Active",
      renewalState: lifecycleState,
      latestInvoice: existingLedgerRow?.latestInvoice ?? record.invoices[0]?.invoiceId ?? "Pending",
      note: input.note,
    };
    const nextStore: BillingLedgerMemoryStore = {
      ...store,
      accounts: store.accounts.map((item) => (item.userKey === record.userKey ? updatedRecord : item)),
      ledgerRows: [nextLedgerRow, ...store.ledgerRows.filter((item) => item.userRef !== record.email)],
      eventRows: [nextEvent, ...store.eventRows.filter((item) => item.id !== nextEvent.id)],
    };

    await persistBillingState(nextStore, updatedRecord);
  });

  billingLedgerMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  await syncBillingStateToEntitlements(user, input.event);
  return getAccountBillingMemory(user);
}

export async function removeBillingEvent(
  user: Pick<User, "id" | "email">,
  input: RemoveBillingEventInput,
): Promise<AccountBillingMemory> {
  const mutation = billingLedgerMutationQueue.then(async () => {
    const baseStore = await ensureStore();
    const { record, store } = await ensureAccountRecordForMutation(baseStore, user);
    const id = input.id.trim();

    if (!id) {
      throw new Error("Billing event id is required.");
    }

    const removedEvent = store.eventRows.find((item) => item.id === id && item.userRef === record.email);

    if (!removedEvent) {
      throw new Error(`Unknown billing event: ${id}`);
    }

    const remainingEvents = store.eventRows.filter((item) => item.id !== id);
    const nextAccountEvent = remainingEvents.find((item) => item.userRef === record.email);
    const fallbackLifecycleState =
      record.invoices[0]?.status === "Failed"
        ? "Grace period"
        : record.invoices[0]?.status === "Upcoming"
          ? "Renewal scheduled"
          : record.invoices[0]?.status === "Paid"
            ? "Healthy"
            : "No preview invoice";
    const lifecycleState = nextAccountEvent
      ? resolveLifecycleStateFromEvent(nextAccountEvent.event, fallbackLifecycleState)
      : fallbackLifecycleState;
    const updatedRecord: BillingLedgerAccountRecord = {
      ...record,
      updatedAt: new Date().toISOString(),
      lifecycleState,
    };
    const nextLedgerRow: BillingLedgerMemoryRow = {
      userRef: record.email,
      planName: record.currentPlan,
      status:
        lifecycleState === "Grace period"
          ? "Grace period"
          : lifecycleState === "Cancelled"
            ? "Cancelled"
            : record.invoices.length > 0
              ? "Active"
              : "Preview only",
      renewalState: lifecycleState,
      latestInvoice: record.invoices[0]?.invoiceId ?? "None",
      note: nextAccountEvent?.note ?? record.invoices[0]?.note ?? "Billing event removal recalculated lifecycle posture from the remaining preview billing history.",
    };

    const nextStore: BillingLedgerMemoryStore = {
      ...store,
      accounts: store.accounts.map((item) => (item.userKey === record.userKey ? updatedRecord : item)),
      ledgerRows: [nextLedgerRow, ...store.ledgerRows.filter((item) => item.userRef !== record.email)],
      eventRows: remainingEvents,
    };

    await persistBillingState(nextStore, updatedRecord);
  });

  billingLedgerMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  await syncBillingStateToEntitlements(user, "billing.event.removed");
  return getAccountBillingMemory(user);
}
