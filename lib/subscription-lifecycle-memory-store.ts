import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import type { User } from "@supabase/supabase-js";

import { readDurableAccountStateLane, writeDurableAccountStateLane } from "@/lib/account-state-durable-store";
import { buildAccountUserKey } from "@/lib/account-identity";
import { canUseFileFallback, getFileFallbackDisabledMessage } from "@/lib/durable-data-runtime";
import { getAccountBillingMemory, getBillingLedgerMemory } from "@/lib/billing-ledger-memory-store";
import { readDurableGlobalStateLane, writeDurableGlobalStateLane } from "@/lib/global-state-durable-store";

export type SubscriptionLifecycleJob = {
  id: string;
  title: string;
  triggerEvent: string;
  status: "Queued" | "Running" | "Waiting on support" | "Ready to rerun";
  accountScope: string;
  nextRun: string;
  note: string;
};

export type SubscriptionRecoveryAction = {
  title: string;
  status: "Queued" | "Subscriber review" | "Ready to send" | "Awaiting support";
  channel: string;
  dueAt: string;
  note: string;
};

type SubscriptionLifecycleAccountRecord = {
  userKey: string;
  email: string;
  updatedAt: string;
  jobs: SubscriptionLifecycleJob[];
  recoveryActions: SubscriptionRecoveryAction[];
};

type SubscriptionLifecycleStore = {
  version: number;
  accounts: SubscriptionLifecycleAccountRecord[];
  opsJobs: SubscriptionLifecycleJob[];
  opsRecoveryActions: SubscriptionRecoveryAction[];
};

type SubscriptionLifecycleOpsState = {
  updatedAt: string;
  opsJobs: SubscriptionLifecycleJob[];
  opsRecoveryActions: SubscriptionRecoveryAction[];
};

export type SubscriptionLifecycleAccountMemory = {
  userKey: string;
  email: string;
  updatedAt: string;
  storageMode: "file_backed_preview" | "supabase_private_beta";
  currentPlan: string;
  lifecycleState: string;
  jobs: SubscriptionLifecycleJob[];
  recoveryActions: SubscriptionRecoveryAction[];
  summary: {
    queuedJobs: number;
    supportTouches: number;
    recoveryActions: number;
  };
  rules: string[];
};

export type SubscriptionLifecycleOpsMemory = {
  updatedAt: string;
  jobs: SubscriptionLifecycleJob[];
  recoveryActions: SubscriptionRecoveryAction[];
  summary: {
    queuedJobs: number;
    runningJobs: number;
    supportTouches: number;
    accountsAtRisk: number;
    recoveryActions: number;
  };
  rules: string[];
};

export type SaveSubscriptionLifecycleJobInput = {
  id: string;
  title: string;
  triggerEvent: string;
  status: SubscriptionLifecycleJob["status"];
  accountScope: string;
  nextRun: string;
  note: string;
};

export type SaveSubscriptionRecoveryActionInput = {
  title: string;
  status: SubscriptionRecoveryAction["status"];
  channel: string;
  dueAt: string;
  note: string;
};

export type RemoveSubscriptionLifecycleJobInput = {
  id: string;
};

export type RemoveSubscriptionRecoveryActionInput = {
  title: string;
};

const STORE_PATH = path.join(process.cwd(), "data", "subscription-lifecycle-memory.json");
const STORE_VERSION = 1;
const DURABLE_ACCOUNT_LANE = "subscription_lifecycle" as const;
const DURABLE_GLOBAL_LANE = "subscription_lifecycle_ops" as const;
let subscriptionLifecycleMutationQueue = Promise.resolve();

function buildUserKey(user: Pick<User, "id" | "email">) {
  return buildAccountUserKey(user);
}

function buildDefaultOpsJobs(): SubscriptionLifecycleJob[] {
  return [
    {
      id: "renewal_audit_001",
      title: "Renewal continuity audit",
      triggerEvent: "subscription.charged",
      status: "Queued",
      accountScope: "All active subscribers",
      nextRun: "Apr 15, 2026 · 8:00 PM",
      note: "Renewal events should confirm invoice continuity, entitlement health, and subscriber-facing account state before lifecycle truth is treated as durable.",
    },
    {
      id: "failure_warning_002",
      title: "Failed-charge warning queue",
      triggerEvent: "payment.failed",
      status: "Running",
      accountScope: "Grace-period accounts",
      nextRun: "Apr 15, 2026 · 5:30 PM",
      note: "Failure warnings should queue support handoff, reminder timing, and downgrade review together instead of relying on one-off billing notes.",
    },
    {
      id: "grace_review_003",
      title: "Grace-period downgrade review",
      triggerEvent: "subscription.halted",
      status: "Waiting on support",
      accountScope: "At-risk paid accounts",
      nextRun: "Support-confirmed",
      note: "Grace-period accounts should keep a review window before fallback access changes are applied or recovery promises are sent.",
    },
    {
      id: "fallback_access_004",
      title: "Fallback-access cleanup run",
      triggerEvent: "subscription.cancelled",
      status: "Ready to rerun",
      accountScope: "Cancelled subscriptions",
      nextRun: "Operator-triggered",
      note: "Cancellation should preserve invoice history and entitlement traceability while fallback access is applied deliberately.",
    },
  ];
}

function buildDefaultOpsRecoveryActions(): SubscriptionRecoveryAction[] {
  return [
    {
      title: "Failed-charge reminder sequence",
      status: "Ready to send",
      channel: "Email + account banner",
      dueAt: "Apr 15, 2026 · 6:30 PM",
      note: "Reminder sequencing should stay tied to payment-event truth so billing retries, subscriber messaging, and support timing stay aligned.",
    },
    {
      title: "Support rescue handoff",
      status: "Awaiting support",
      channel: "Billing support",
      dueAt: "Apr 15, 2026 · 7:00 PM",
      note: "High-risk failed-charge accounts should create one deliberate support handoff instead of relying on ad-hoc payment follow-up.",
    },
    {
      title: "Fallback access review",
      status: "Subscriber review",
      channel: "Account billing workspace",
      dueAt: "Before grace window ends",
      note: "Fallback access changes should remain reviewable until provider-backed retries and entitlement sync are fully production-grade.",
    },
  ];
}

function buildDefaultAccountJobs(email: string, lifecycleState: string): SubscriptionLifecycleJob[] {
  const lowerEmail = email.toLowerCase();

  if (lifecycleState === "Grace period" || lowerEmail.includes("review")) {
    return [
      {
        id: "account_failure_review_001",
        title: "Failure reminder window",
        triggerEvent: "payment.failed",
        status: "Running",
        accountScope: "Current subscriber",
        nextRun: "Apr 15, 2026 · 6:15 PM",
        note: "This account is in a grace-style posture, so payment retry messaging and support escalation should stay visible until the next retry outcome is known.",
      },
      {
        id: "account_grace_review_002",
        title: "Grace-period review",
        triggerEvent: "subscription.halted",
        status: "Waiting on support",
        accountScope: "Current subscriber",
        nextRun: "Support-confirmed",
        note: "Fallback access and downgrade timing should wait for support review instead of silently removing access.",
      },
    ];
  }

  return [
    {
      id: "account_renewal_audit_001",
      title: "Renewal confirmation",
      triggerEvent: "subscription.charged",
      status: "Queued",
      accountScope: "Current subscriber",
      nextRun: "Next renewal window",
      note: "Successful renewals should still queue a continuity check so invoice truth, entitlement posture, and lifecycle messaging stay aligned.",
    },
    {
      id: "account_receipt_followup_002",
      title: "Receipt and lifecycle follow-up",
      triggerEvent: "subscription.activated",
      status: "Ready to rerun",
      accountScope: "Current subscriber",
      nextRun: "Operator-triggered",
      note: "Activation should later trigger receipt, lifecycle confirmation, and recovery-safe fallback instructions from one durable backend lane.",
    },
  ];
}

function buildDefaultRecoveryActions(email: string, lifecycleState: string): SubscriptionRecoveryAction[] {
  const lowerEmail = email.toLowerCase();

  if (lifecycleState === "Grace period" || lowerEmail.includes("review")) {
    return [
      {
        title: "Retry reminder",
        status: "Ready to send",
        channel: "Email + account banner",
        dueAt: "Apr 15, 2026 · 6:15 PM",
        note: "Retry messaging should explain what still works, when access changes, and how support can intervene before fallback is applied.",
      },
      {
        title: "Support escalation",
        status: "Awaiting support",
        channel: "Billing support",
        dueAt: "Apr 15, 2026 · 7:00 PM",
        note: "Billing recovery should create one support handoff instead of leaving a failed-charge account to discover access loss alone.",
      },
      {
        title: "Fallback access review",
        status: "Subscriber review",
        channel: "Account billing workspace",
        dueAt: "Before grace window ends",
        note: "Access changes should stay reviewable until recovery automation and entitlement syncing are production-grade.",
      },
    ];
  }

  return [
    {
      title: "Renewal confirmation",
      status: "Queued",
      channel: "Email + billing workspace",
      dueAt: "Next renewal window",
      note: "Renewal continuity should later confirm invoice, lifecycle, and entitlement state together from one backend automation lane.",
    },
    {
      title: "Lifecycle fallback drill",
      status: "Subscriber review",
      channel: "Billing workspace",
      dueAt: "Before next plan change",
      note: "Even healthy accounts should keep a visible fallback path until lifecycle automation is driven by real provider events.",
    },
  ];
}

function buildDefaultAccountRecord(user: Pick<User, "id" | "email">, currentPlan: string, lifecycleState: string) {
  const email = user.email ?? `${user.id}@local-preview.riddra`;

  return {
    userKey: buildUserKey(user),
    email,
    updatedAt: new Date().toISOString(),
    jobs: buildDefaultAccountJobs(email, lifecycleState === "Healthy" ? currentPlan : lifecycleState),
    recoveryActions: buildDefaultRecoveryActions(email, lifecycleState),
  };
}

function cloneLifecycleJob(item: SubscriptionLifecycleJob): SubscriptionLifecycleJob {
  return { ...item };
}

function cloneRecoveryAction(item: SubscriptionRecoveryAction): SubscriptionRecoveryAction {
  return { ...item };
}

function cloneLifecycleAccountRecord(
  record: SubscriptionLifecycleAccountRecord,
): SubscriptionLifecycleAccountRecord {
  return {
    ...record,
    jobs: record.jobs.map(cloneLifecycleJob),
    recoveryActions: record.recoveryActions.map(cloneRecoveryAction),
  };
}

function cloneLifecycleOpsState(
  state: SubscriptionLifecycleOpsState,
): SubscriptionLifecycleOpsState {
  return {
    updatedAt: state.updatedAt,
    opsJobs: state.opsJobs.map(cloneLifecycleJob),
    opsRecoveryActions: state.opsRecoveryActions.map(cloneRecoveryAction),
  };
}

function toLifecycleOpsState(store: SubscriptionLifecycleStore): SubscriptionLifecycleOpsState {
  return {
    updatedAt: new Date().toISOString(),
    opsJobs: store.opsJobs.map(cloneLifecycleJob),
    opsRecoveryActions: store.opsRecoveryActions.map(cloneRecoveryAction),
  };
}

async function readStore(): Promise<SubscriptionLifecycleStore | null> {
  if (!canUseFileFallback()) {
    return {
      version: STORE_VERSION,
      accounts: [],
      opsJobs: buildDefaultOpsJobs(),
      opsRecoveryActions: buildDefaultOpsRecoveryActions(),
    };
  }

  try {
    const content = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(content) as SubscriptionLifecycleStore;
    return {
      ...parsed,
      accounts: (parsed.accounts ?? []).map(cloneLifecycleAccountRecord),
      opsJobs: (parsed.opsJobs ?? []).map(cloneLifecycleJob),
      opsRecoveryActions: (parsed.opsRecoveryActions ?? []).map(cloneRecoveryAction),
    };
  } catch {
    return null;
  }
}

async function writeStore(store: SubscriptionLifecycleStore) {
  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Subscription lifecycle persistence"));
  }

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function readDurableLifecycleAccountRecord(userKey: string) {
  const payload = await readDurableAccountStateLane<SubscriptionLifecycleAccountRecord>(
    userKey,
    DURABLE_ACCOUNT_LANE,
  );
  return payload ? cloneLifecycleAccountRecord(payload) : null;
}

async function readDurableLifecycleOpsState() {
  const payload = await readDurableGlobalStateLane<SubscriptionLifecycleOpsState>(
    DURABLE_GLOBAL_LANE,
  );
  return payload ? cloneLifecycleOpsState(payload) : null;
}

async function writeDurableLifecycleAccountRecord(
  record: SubscriptionLifecycleAccountRecord,
) {
  return writeDurableAccountStateLane(
    record.userKey,
    record.email,
    DURABLE_ACCOUNT_LANE,
    cloneLifecycleAccountRecord(record),
  );
}

async function writeDurableLifecycleOpsState(store: SubscriptionLifecycleStore) {
  return writeDurableGlobalStateLane(
    DURABLE_GLOBAL_LANE,
    toLifecycleOpsState(store),
  );
}

async function persistLifecycleState(
  store: SubscriptionLifecycleStore,
  accountRecord?: SubscriptionLifecycleAccountRecord,
) {
  const [wroteAccountRecord, wroteOpsState] = await Promise.all([
    accountRecord ? writeDurableLifecycleAccountRecord(accountRecord) : Promise.resolve(true),
    writeDurableLifecycleOpsState(store),
  ]);

  if (wroteAccountRecord && wroteOpsState) {
    if (canUseFileFallback()) {
      await writeStore(store);
    }
    return "supabase_private_beta" as const;
  }

  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Subscription lifecycle persistence"));
  }

  await writeStore(store);
  return "file_backed_preview" as const;
}

async function ensureStore() {
  const store = await readStore();
  const durableOpsState = await readDurableLifecycleOpsState();

  if (durableOpsState) {
    return {
      version: store?.version ?? STORE_VERSION,
      accounts: Array.isArray(store?.accounts) ? store.accounts.map(cloneLifecycleAccountRecord) : [],
      opsJobs: durableOpsState.opsJobs.map(cloneLifecycleJob),
      opsRecoveryActions: durableOpsState.opsRecoveryActions.map(cloneRecoveryAction),
    };
  }

  if (!canUseFileFallback()) {
    return {
      version: STORE_VERSION,
      accounts: [],
      opsJobs: buildDefaultOpsJobs(),
      opsRecoveryActions: buildDefaultOpsRecoveryActions(),
    };
  }

  const storeExists = await access(STORE_PATH)
    .then(() => true)
    .catch(() => false);

  if (storeExists && store?.opsJobs?.length) {
    if (store.opsRecoveryActions?.length) {
      await writeDurableLifecycleOpsState(store);
      return store;
    }

    const nextStore: SubscriptionLifecycleStore = {
      ...store,
      opsRecoveryActions: buildDefaultOpsRecoveryActions(),
    };
    await writeStore(nextStore);
    await writeDurableLifecycleOpsState(nextStore);
    return nextStore;
  }

  const nextStore: SubscriptionLifecycleStore = {
    version: STORE_VERSION,
    accounts: [],
    opsJobs: buildDefaultOpsJobs(),
    opsRecoveryActions: buildDefaultOpsRecoveryActions(),
  };
  await writeStore(nextStore);
  await writeDurableLifecycleOpsState(nextStore);
  return nextStore;
}

async function ensureAccountRecordInStore(
  store: SubscriptionLifecycleStore,
  user: Pick<User, "id" | "email">,
  accountBilling: Awaited<ReturnType<typeof getAccountBillingMemory>>,
) {
  const userKey = buildUserKey(user);
  const existing = store.accounts.find((item) => item.userKey === userKey);

  if (existing) {
    return { record: existing, store };
  }

  const record = buildDefaultAccountRecord(user, accountBilling.currentPlan, accountBilling.lifecycleState);
  return {
    record,
    store: {
      ...store,
      accounts: [...store.accounts, record],
    },
  };
}

async function ensureAccountRecordForMutation(
  store: SubscriptionLifecycleStore,
  user: Pick<User, "id" | "email">,
  accountBilling: Awaited<ReturnType<typeof getAccountBillingMemory>>,
) {
  const durableRecord = await readDurableLifecycleAccountRecord(buildUserKey(user));

  if (durableRecord) {
    return { record: durableRecord, store };
  }

  return ensureAccountRecordInStore(store, user, accountBilling);
}

async function ensureAccountRecord(user: Pick<User, "id" | "email">) {
  const accountBilling = await getAccountBillingMemory(user);
  const store = await ensureStore();
  const durableRecord = await readDurableLifecycleAccountRecord(buildUserKey(user));

  if (durableRecord) {
    return {
      record: durableRecord,
      store,
      accountBilling,
      storageMode: (await readDurableLifecycleOpsState())
        ? ("supabase_private_beta" as const)
        : ("file_backed_preview" as const),
    };
  }

  const ensured = await ensureAccountRecordInStore(store, user, accountBilling);

  if (ensured.store !== store) {
    if (canUseFileFallback()) {
      await writeStore(ensured.store);
    }
  }

  const storageMode =
    await persistLifecycleState(ensured.store, ensured.record);

  return { ...ensured, accountBilling, storageMode };
}

export async function getSubscriptionLifecycleAccountMemory(
  user: Pick<User, "id" | "email">,
): Promise<SubscriptionLifecycleAccountMemory> {
  const { record, accountBilling, storageMode } = await ensureAccountRecord(user);

  return {
    userKey: record.userKey,
    email: record.email,
    updatedAt: record.updatedAt,
    storageMode,
    currentPlan: accountBilling.currentPlan,
    lifecycleState: accountBilling.lifecycleState,
    jobs: record.jobs.map(cloneLifecycleJob),
    recoveryActions: record.recoveryActions.map(cloneRecoveryAction),
    summary: {
      queuedJobs: record.jobs.filter((item) => item.status === "Queued" || item.status === "Running").length,
      supportTouches: record.jobs.filter((item) => item.status === "Waiting on support").length + record.recoveryActions.filter((item) => item.status === "Awaiting support").length,
      recoveryActions: record.recoveryActions.length,
    },
    rules: [
      "Lifecycle automation should remain visible to the subscriber until checkout, webhook handling, and entitlement sync all agree.",
      "Failed-charge recovery should queue support, reminder timing, and fallback-access review together instead of scattering those decisions across unrelated pages.",
      "Cancellation and downgrade jobs should preserve invoice history and entitlement traceability before access changes are applied.",
    ],
  };
}

export async function getSubscriptionLifecycleOpsMemory(): Promise<SubscriptionLifecycleOpsMemory> {
  const store = await ensureStore();
  const billingLedger = await getBillingLedgerMemory();

  return {
    updatedAt: new Date().toISOString(),
    jobs: store.opsJobs.map(cloneLifecycleJob),
    recoveryActions: store.opsRecoveryActions.map(cloneRecoveryAction),
    summary: {
      queuedJobs: store.opsJobs.filter((item) => item.status === "Queued").length,
      runningJobs: store.opsJobs.filter((item) => item.status === "Running").length,
      supportTouches:
        store.opsJobs.filter((item) => item.status === "Waiting on support").length +
        store.opsRecoveryActions.filter((item) => item.status === "Awaiting support").length,
      accountsAtRisk: billingLedger.summary.failuresNeedReview,
      recoveryActions: store.opsRecoveryActions.length,
    },
    rules: [
      "Renewal automation should only be treated as trustworthy when payment events, invoice continuity, and entitlement updates agree.",
      "Recovery queues should preserve a visible support checkpoint instead of converting payment failure into silent downgrade logic.",
      "Lifecycle jobs should stay auditable so operators can trace what changed access and when.",
    ],
  };
}

function toLifecycleJob(input: SaveSubscriptionLifecycleJobInput): SubscriptionLifecycleJob {
  return {
    id: input.id.trim(),
    title: input.title.trim(),
    triggerEvent: input.triggerEvent.trim(),
    status: input.status,
    accountScope: input.accountScope.trim(),
    nextRun: input.nextRun.trim(),
    note: input.note.trim(),
  };
}

function toRecoveryAction(input: SaveSubscriptionRecoveryActionInput): SubscriptionRecoveryAction {
  return {
    title: input.title.trim(),
    status: input.status,
    channel: input.channel.trim(),
    dueAt: input.dueAt.trim(),
    note: input.note.trim(),
  };
}

export async function saveSubscriptionLifecycleAccountJob(
  user: Pick<User, "id" | "email">,
  input: SaveSubscriptionLifecycleJobInput,
): Promise<SubscriptionLifecycleAccountMemory> {
  const mutation = subscriptionLifecycleMutationQueue.then(async () => {
    const accountBilling = await getAccountBillingMemory(user);
    const baseStore = await ensureStore();
    const { record, store } = await ensureAccountRecordForMutation(baseStore, user, accountBilling);
    const updatedAt = new Date().toISOString();
    const nextJob = toLifecycleJob(input);
    const existingIndex = record.jobs.findIndex((item) => item.id === nextJob.id);
    const jobs =
      existingIndex >= 0 ? record.jobs.map((item, index) => (index === existingIndex ? nextJob : item)) : [...record.jobs, nextJob];

    const nextRecord: SubscriptionLifecycleAccountRecord = {
      ...record,
      updatedAt,
      jobs,
    };
    const nextStore: SubscriptionLifecycleStore = {
      ...store,
      accounts: store.accounts.map((item) => (item.userKey === record.userKey ? nextRecord : item)),
    };

    await persistLifecycleState(nextStore, nextRecord);
  });

  subscriptionLifecycleMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getSubscriptionLifecycleAccountMemory(user);
}

export async function saveSubscriptionRecoveryAction(
  user: Pick<User, "id" | "email">,
  input: SaveSubscriptionRecoveryActionInput,
): Promise<SubscriptionLifecycleAccountMemory> {
  const mutation = subscriptionLifecycleMutationQueue.then(async () => {
    const accountBilling = await getAccountBillingMemory(user);
    const baseStore = await ensureStore();
    const { record, store } = await ensureAccountRecordForMutation(baseStore, user, accountBilling);
    const updatedAt = new Date().toISOString();
    const nextAction = toRecoveryAction(input);
    const existingIndex = record.recoveryActions.findIndex((item) => item.title === nextAction.title);
    const recoveryActions =
      existingIndex >= 0
        ? record.recoveryActions.map((item, index) => (index === existingIndex ? nextAction : item))
        : [...record.recoveryActions, nextAction];

    const nextRecord: SubscriptionLifecycleAccountRecord = {
      ...record,
      updatedAt,
      recoveryActions,
    };
    const nextStore: SubscriptionLifecycleStore = {
      ...store,
      accounts: store.accounts.map((item) => (item.userKey === record.userKey ? nextRecord : item)),
    };

    await persistLifecycleState(nextStore, nextRecord);
  });

  subscriptionLifecycleMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getSubscriptionLifecycleAccountMemory(user);
}

export async function saveSubscriptionLifecycleOpsJob(
  input: SaveSubscriptionLifecycleJobInput,
): Promise<SubscriptionLifecycleOpsMemory> {
  const mutation = subscriptionLifecycleMutationQueue.then(async () => {
    const store = await ensureStore();
    const nextJob = toLifecycleJob(input);
    const existingIndex = store.opsJobs.findIndex((item) => item.id === nextJob.id);
    const opsJobs =
      existingIndex >= 0 ? store.opsJobs.map((item, index) => (index === existingIndex ? nextJob : item)) : [...store.opsJobs, nextJob];
    const nextStore: SubscriptionLifecycleStore = {
      ...store,
      opsJobs,
    };

    await persistLifecycleState(nextStore);
  });

  subscriptionLifecycleMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getSubscriptionLifecycleOpsMemory();
}

export async function saveSubscriptionRecoveryOpsAction(
  input: SaveSubscriptionRecoveryActionInput,
): Promise<SubscriptionLifecycleOpsMemory> {
  const mutation = subscriptionLifecycleMutationQueue.then(async () => {
    const store = await ensureStore();
    const nextAction = toRecoveryAction(input);
    const existingIndex = store.opsRecoveryActions.findIndex((item) => item.title === nextAction.title);
    const opsRecoveryActions =
      existingIndex >= 0
        ? store.opsRecoveryActions.map((item, index) => (index === existingIndex ? nextAction : item))
        : [...store.opsRecoveryActions, nextAction];

    const nextStore: SubscriptionLifecycleStore = {
      ...store,
      opsRecoveryActions,
    };

    await persistLifecycleState(nextStore);
  });

  subscriptionLifecycleMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getSubscriptionLifecycleOpsMemory();
}

export async function removeSubscriptionLifecycleAccountJob(
  user: Pick<User, "id" | "email">,
  input: RemoveSubscriptionLifecycleJobInput,
): Promise<SubscriptionLifecycleAccountMemory> {
  const mutation = subscriptionLifecycleMutationQueue.then(async () => {
    const accountBilling = await getAccountBillingMemory(user);
    const baseStore = await ensureStore();
    const { record, store } = await ensureAccountRecordForMutation(baseStore, user, accountBilling);
    const id = input.id.trim();

    if (!id) {
      throw new Error("Lifecycle job id is required.");
    }

    const jobs = record.jobs.filter((item) => item.id !== id);

    if (jobs.length === record.jobs.length) {
      throw new Error(`Unknown lifecycle job: ${input.id}`);
    }

    const nextRecord: SubscriptionLifecycleAccountRecord = {
      ...record,
      updatedAt: new Date().toISOString(),
      jobs,
    };
    const nextStore: SubscriptionLifecycleStore = {
      ...store,
      accounts: store.accounts.map((item) => (item.userKey === record.userKey ? nextRecord : item)),
    };

    await persistLifecycleState(nextStore, nextRecord);
  });

  subscriptionLifecycleMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getSubscriptionLifecycleAccountMemory(user);
}

export async function removeSubscriptionRecoveryAction(
  user: Pick<User, "id" | "email">,
  input: RemoveSubscriptionRecoveryActionInput,
): Promise<SubscriptionLifecycleAccountMemory> {
  const mutation = subscriptionLifecycleMutationQueue.then(async () => {
    const accountBilling = await getAccountBillingMemory(user);
    const baseStore = await ensureStore();
    const { record, store } = await ensureAccountRecordForMutation(baseStore, user, accountBilling);
    const title = input.title.trim();

    if (!title) {
      throw new Error("Recovery action title is required.");
    }

    const recoveryActions = record.recoveryActions.filter((item) => item.title !== title);

    if (recoveryActions.length === record.recoveryActions.length) {
      throw new Error(`Unknown recovery action: ${input.title}`);
    }

    const nextRecord: SubscriptionLifecycleAccountRecord = {
      ...record,
      updatedAt: new Date().toISOString(),
      recoveryActions,
    };
    const nextStore: SubscriptionLifecycleStore = {
      ...store,
      accounts: store.accounts.map((item) => (item.userKey === record.userKey ? nextRecord : item)),
    };

    await persistLifecycleState(nextStore, nextRecord);
  });

  subscriptionLifecycleMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getSubscriptionLifecycleAccountMemory(user);
}

export async function removeSubscriptionLifecycleOpsJob(
  input: RemoveSubscriptionLifecycleJobInput,
): Promise<SubscriptionLifecycleOpsMemory> {
  const mutation = subscriptionLifecycleMutationQueue.then(async () => {
    const store = await ensureStore();
    const id = input.id.trim();

    if (!id) {
      throw new Error("Lifecycle job id is required.");
    }

    const opsJobs = store.opsJobs.filter((item) => item.id !== id);

    if (opsJobs.length === store.opsJobs.length) {
      throw new Error(`Unknown ops lifecycle job: ${input.id}`);
    }

    const nextStore: SubscriptionLifecycleStore = {
      ...store,
      opsJobs,
    };

    await persistLifecycleState(nextStore);
  });

  subscriptionLifecycleMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getSubscriptionLifecycleOpsMemory();
}

export async function removeSubscriptionRecoveryOpsAction(
  input: RemoveSubscriptionRecoveryActionInput,
): Promise<SubscriptionLifecycleOpsMemory> {
  const mutation = subscriptionLifecycleMutationQueue.then(async () => {
    const store = await ensureStore();
    const title = input.title.trim();

    if (!title) {
      throw new Error("Recovery action title is required.");
    }

    const opsRecoveryActions = store.opsRecoveryActions.filter((item) => item.title !== title);

    if (opsRecoveryActions.length === store.opsRecoveryActions.length) {
      throw new Error(`Unknown ops recovery action: ${input.title}`);
    }

    const nextStore: SubscriptionLifecycleStore = {
      ...store,
      opsRecoveryActions,
    };

    await persistLifecycleState(nextStore);
  });

  subscriptionLifecycleMutationQueue = mutation.then(() => undefined, () => undefined);
  await mutation;
  return getSubscriptionLifecycleOpsMemory();
}
