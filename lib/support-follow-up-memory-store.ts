import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import type { User } from "@supabase/supabase-js";

import { buildAccountUserKey } from "@/lib/account-identity";
import { readDurableAccountStateLane, writeDurableAccountStateLane } from "@/lib/account-state-durable-store";
import { canUseFileFallback, getFileFallbackDisabledMessage } from "@/lib/durable-data-runtime";

export type SupportFollowUpRequest = {
  id: string;
  requestedBy: string;
  requestedAt: string;
  topic: string;
  lane: "Onboarding" | "Portfolio" | "Support" | "Billing" | "Research" | "Bug";
  preferredChannel: "Email" | "WhatsApp" | "Phone" | "In-app";
  urgency: "Today" | "Next business day" | "This week";
  status: "Queued" | "Scheduled" | "In progress" | "Needs review" | "Closed";
  nextTouchAt: string;
  note: string;
  lastJobRunId: string | null;
  acknowledgementEmailState: "Queued" | "Sent" | "Failed" | "Skipped";
  followUpEmailState: "Queued" | "Sent" | "Failed" | "Skipped";
  lastEmailError: string | null;
  lastEmailAt: string | null;
};

type SupportFollowUpRecord = {
  userKey: string;
  email: string;
  updatedAt: string;
  requests: SupportFollowUpRequest[];
};

type SupportFollowUpStore = {
  version: number;
  accounts: SupportFollowUpRecord[];
};

export type AccountSupportFollowUpMemory = {
  updatedAt: string;
  storageMode: "file_backed_private_beta" | "supabase_private_beta";
  requests: SupportFollowUpRequest[];
  summary: {
    total: number;
    queued: number;
    scheduled: number;
    inProgress: number;
    needsReview: number;
  };
};

export type CreateSupportFollowUpRequestInput = {
  topic: string;
  lane: SupportFollowUpRequest["lane"];
  preferredChannel: SupportFollowUpRequest["preferredChannel"];
  urgency: SupportFollowUpRequest["urgency"];
  note: string;
};

type UpdateSupportFollowUpRequestInput = {
  id: string;
  status?: SupportFollowUpRequest["status"];
  nextTouchAt?: string;
  note?: string;
  lastJobRunId?: string | null;
  acknowledgementEmailState?: SupportFollowUpRequest["acknowledgementEmailState"];
  followUpEmailState?: SupportFollowUpRequest["followUpEmailState"];
  lastEmailError?: string | null;
  lastEmailAt?: string | null;
};

const STORE_PATH = path.join(process.cwd(), "data", "support-follow-up-memory.json");
const STORE_VERSION = 1;
const DURABLE_LANE = "support_follow_up" as const;
let supportFollowUpMutationQueue = Promise.resolve();

function buildUserKey(user: Pick<User, "id" | "email">) {
  return buildAccountUserKey(user);
}

function createRequestId(userKey: string, topic: string) {
  const slug = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `support-follow-up-${userKey}-${slug || "request"}-${Date.now()}`;
}

function normalizeRequest(request: SupportFollowUpRequest): SupportFollowUpRequest {
  return {
    ...request,
    acknowledgementEmailState: request.acknowledgementEmailState ?? "Queued",
    followUpEmailState: request.followUpEmailState ?? "Queued",
    lastEmailError: request.lastEmailError ?? null,
    lastEmailAt: request.lastEmailAt ?? null,
  };
}

function cloneRequest(request: SupportFollowUpRequest): SupportFollowUpRequest {
  return { ...request };
}

function cloneRecord(record: SupportFollowUpRecord): SupportFollowUpRecord {
  return {
    ...record,
    requests: record.requests.map(cloneRequest),
  };
}

async function readStore(): Promise<SupportFollowUpStore | null> {
  if (!canUseFileFallback()) {
    return {
      version: STORE_VERSION,
      accounts: [],
    };
  }

  try {
    const content = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(content) as SupportFollowUpStore;
    return {
      ...parsed,
      accounts: (parsed.accounts ?? []).map((account) => ({
        ...account,
        requests: (account.requests ?? []).map(normalizeRequest),
      })),
    };
  } catch {
    return null;
  }
}

async function writeStore(store: SupportFollowUpStore) {
  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Support follow-up persistence"));
  }

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function removeSupportRecordFromFileStore(userKey: string) {
  const store = await readStore();

  if (!store?.accounts?.some((item) => item.userKey === userKey)) {
    return;
  }

  await writeStore({
    ...store,
    accounts: store.accounts.filter((item) => item.userKey !== userKey).map(cloneRecord),
  });
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

  const nextStore: SupportFollowUpStore = {
    version: STORE_VERSION,
    accounts: [],
  };
  await writeStore(nextStore);
  return nextStore;
}

async function readDurableSupportRecord(userKey: string) {
  const durableRecord = await readDurableAccountStateLane<SupportFollowUpRecord>(userKey, DURABLE_LANE);

  if (!durableRecord) {
    return null;
  }

  return cloneRecord({
    ...durableRecord,
    requests: (durableRecord.requests ?? []).map(normalizeRequest),
  });
}

async function saveSupportRecord(record: SupportFollowUpRecord): Promise<AccountSupportFollowUpMemory["storageMode"]> {
  const wroteDurableRecord = await writeDurableAccountStateLane(
    record.userKey,
    record.email,
    DURABLE_LANE,
    cloneRecord(record),
  );

  if (wroteDurableRecord) {
    await removeSupportRecordFromFileStore(record.userKey);
    return "supabase_private_beta";
  }

  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Support follow-up persistence"));
  }

  const store = await ensureStore();
  const nextStore: SupportFollowUpStore = {
    ...store,
    accounts: store.accounts.some((item) => item.userKey === record.userKey)
      ? store.accounts.map((item) => (item.userKey === record.userKey ? cloneRecord(record) : cloneRecord(item)))
      : [...store.accounts.map(cloneRecord), cloneRecord(record)],
  };

  await writeStore(nextStore);

  return "file_backed_private_beta";
}

function toMemory(
  record?: SupportFollowUpRecord,
  storageMode: AccountSupportFollowUpMemory["storageMode"] = "file_backed_private_beta",
): AccountSupportFollowUpMemory {
  const requests = (record?.requests ?? []).map(normalizeRequest);

  return {
    updatedAt: record?.updatedAt ?? new Date(0).toISOString(),
    storageMode,
    requests,
    summary: {
      total: requests.length,
      queued: requests.filter((item) => item.status === "Queued").length,
      scheduled: requests.filter((item) => item.status === "Scheduled").length,
      inProgress: requests.filter((item) => item.status === "In progress").length,
      needsReview: requests.filter((item) => item.status === "Needs review").length,
    },
  };
}

export async function getAccountSupportFollowUpMemory(user: Pick<User, "id" | "email">) {
  const userKey = buildUserKey(user);
  const durableRecord = await readDurableSupportRecord(userKey);

  if (durableRecord) {
    return toMemory(durableRecord, "supabase_private_beta");
  }

  const store = await readStore();
  const record = store?.accounts.find((item) => item.userKey === userKey);

  if (!record) {
    return toMemory(undefined, "file_backed_private_beta");
  }

  const storageMode = await saveSupportRecord(record);

  return toMemory(record, storageMode);
}

export async function createSupportFollowUpRequest(
  user: Pick<User, "id" | "email">,
  input: CreateSupportFollowUpRequestInput,
) {
  const mutation = supportFollowUpMutationQueue.then(async () => {
    const userKey = buildUserKey(user);
    const durableRecord = await readDurableSupportRecord(userKey);
    const store = durableRecord ? null : await readStore();
    const existing = durableRecord ?? store?.accounts.find((item) => item.userKey === userKey);
    const updatedAt = new Date().toISOString();
    const nextTouchAt =
      input.urgency === "Today"
        ? "Today by 6:00 PM"
        : input.urgency === "Next business day"
          ? "Next business day by 12:00 PM"
          : "This week during the next support review";
    const request: SupportFollowUpRequest = {
      id: createRequestId(userKey, input.topic),
      requestedBy: user.email ?? "local-preview-user",
      requestedAt: updatedAt,
      topic: input.topic.trim(),
      lane: input.lane,
      preferredChannel: input.preferredChannel,
      urgency: input.urgency,
      status: "Queued",
      nextTouchAt,
      note: input.note.trim(),
      lastJobRunId: null,
      acknowledgementEmailState: "Queued",
      followUpEmailState: "Queued",
      lastEmailError: null,
      lastEmailAt: null,
    };

    const nextRecord: SupportFollowUpRecord = existing
      ? {
          ...existing,
          updatedAt,
          requests: [request, ...existing.requests.filter((item) => item.id !== request.id)].slice(0, 12),
        }
      : {
          userKey,
          email: user.email ?? "local-preview-user",
          updatedAt,
          requests: [request],
        };

    const storageMode = await saveSupportRecord(nextRecord);

    return {
      request,
      memory: toMemory(nextRecord, storageMode),
    };
  });

  supportFollowUpMutationQueue = mutation.then(() => undefined, () => undefined);
  return mutation;
}

export async function updateSupportFollowUpRequest(
  user: Pick<User, "id" | "email">,
  input: UpdateSupportFollowUpRequestInput,
) {
  const mutation = supportFollowUpMutationQueue.then(async () => {
    const userKey = buildUserKey(user);
    const durableRecord = await readDurableSupportRecord(userKey);
    const store = durableRecord ? null : await readStore();
    const existing = durableRecord ?? store?.accounts.find((item) => item.userKey === userKey);

    if (!existing) {
      throw new Error("Support follow-up account lane was not found.");
    }

    let matchedRequest = false;
    const updatedAt = new Date().toISOString();
    const nextRecord: SupportFollowUpRecord = {
      ...existing,
      updatedAt,
      requests: existing.requests.map((request) => {
        if (request.id !== input.id) {
          return request;
        }

        matchedRequest = true;
        return {
          ...request,
          status: input.status ?? request.status,
          nextTouchAt: input.nextTouchAt ?? request.nextTouchAt,
          note: input.note ?? request.note,
          lastJobRunId: input.lastJobRunId ?? request.lastJobRunId,
          acknowledgementEmailState: input.acknowledgementEmailState ?? request.acknowledgementEmailState,
          followUpEmailState: input.followUpEmailState ?? request.followUpEmailState,
          lastEmailError:
            input.lastEmailError !== undefined ? input.lastEmailError : request.lastEmailError,
          lastEmailAt: input.lastEmailAt !== undefined ? input.lastEmailAt : request.lastEmailAt,
        };
      }),
    };

    if (!matchedRequest) {
      throw new Error(`Unknown support follow-up request: ${input.id}`);
    }

    const storageMode = await saveSupportRecord(nextRecord);
    return toMemory(nextRecord, storageMode);
  });

  supportFollowUpMutationQueue = mutation.then(() => undefined, () => undefined);
  return mutation;
}
