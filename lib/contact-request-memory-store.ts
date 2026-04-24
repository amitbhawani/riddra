import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { readDurableGlobalStateLane, writeDurableGlobalStateLane } from "@/lib/global-state-durable-store";

export type ContactRequestStatus = "Queued" | "Acknowledged" | "Needs review" | "Closed";
export type ContactEmailState = "Queued" | "Sent" | "Failed" | "Skipped";

export type ContactRequestRecord = {
  id: string;
  requestedAt: string;
  name: string;
  email: string;
  topic: string;
  note: string;
  source: string;
  status: ContactRequestStatus;
  lastJobRunId: string | null;
  acknowledgementEmailState: ContactEmailState;
  inboxEmailState: ContactEmailState;
  lastEmailError: string | null;
  lastEmailAt: string | null;
};

type ContactRequestStore = {
  version: number;
  requests: ContactRequestRecord[];
};

type ContactRequestGlobalState = {
  updatedAt: string;
  requests: ContactRequestRecord[];
};

const STORE_PATH = path.join(process.cwd(), "data", "contact-request-memory.json");
const STORE_VERSION = 1;
const DURABLE_GLOBAL_LANE = "contact_requests" as const;
let mutationQueue = Promise.resolve();

function createContactRequestId(email: string, topic: string) {
  const slug = `${email}-${topic}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `contact-request-${slug || "request"}-${Date.now()}`;
}

async function readStore(): Promise<ContactRequestStore | null> {
  try {
    const content = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(content) as Partial<ContactRequestStore>;
    return {
      version: typeof parsed.version === "number" ? parsed.version : STORE_VERSION,
      requests: Array.isArray(parsed.requests) ? (parsed.requests as ContactRequestRecord[]).map((request) => ({ ...request })) : [],
    };
  } catch {
    return null;
  }
}

async function writeStore(store: ContactRequestStore) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function readDurableContactRequestState() {
  const payload = await readDurableGlobalStateLane<ContactRequestGlobalState>(DURABLE_GLOBAL_LANE);
  if (!payload) {
    return null;
  }

  return {
    updatedAt: payload.updatedAt,
    requests: (payload.requests ?? []).map((request) => ({ ...request })),
  };
}

async function writeDurableContactRequestState(store: ContactRequestStore) {
  return writeDurableGlobalStateLane(DURABLE_GLOBAL_LANE, {
    updatedAt: new Date().toISOString(),
    requests: store.requests.map((request) => ({ ...request })),
  });
}

async function persistStore(store: ContactRequestStore) {
  await writeStore(store);
  await writeDurableContactRequestState(store);
}

async function ensureStore() {
  const store = await readStore();
  const durableState = await readDurableContactRequestState();

  if (durableState) {
    return {
      version: store?.version ?? STORE_VERSION,
      requests: durableState.requests,
    };
  }

  const exists = await access(STORE_PATH)
    .then(() => true)
    .catch(() => false);

  if (exists && store && Array.isArray(store.requests)) {
    await writeDurableContactRequestState(store);
    return store;
  }

  const nextStore: ContactRequestStore = {
    version: STORE_VERSION,
    requests: [],
  };
  await persistStore(nextStore);
  return nextStore;
}

export async function createContactRequest(input: {
  name: string;
  email: string;
  topic: string;
  note: string;
  source: string;
}) {
  const mutation = mutationQueue.then(async () => {
    const store = await ensureStore();
    const requestedAt = new Date().toISOString();
    const request: ContactRequestRecord = {
      id: createContactRequestId(input.email, input.topic),
      requestedAt,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      topic: input.topic.trim(),
      note: input.note.trim(),
      source: input.source.trim(),
      status: "Queued",
      lastJobRunId: null,
      acknowledgementEmailState: "Queued",
      inboxEmailState: "Queued",
      lastEmailError: null,
      lastEmailAt: null,
    };

    const nextStore: ContactRequestStore = {
      ...store,
      requests: [request, ...store.requests].slice(0, 60),
    };
    await persistStore(nextStore);
    return request;
  });

  mutationQueue = mutation.then(() => undefined, () => undefined);
  return mutation;
}

export async function updateContactRequest(
  id: string,
  patch: Partial<Pick<ContactRequestRecord, "status" | "lastJobRunId" | "acknowledgementEmailState" | "inboxEmailState" | "lastEmailError" | "lastEmailAt">>,
) {
  const mutation = mutationQueue.then(async () => {
    const store = await ensureStore();
    let matched = false;

    const nextStore: ContactRequestStore = {
      ...store,
      requests: store.requests.map((request) => {
        if (request.id !== id) {
          return request;
        }

        matched = true;
        return {
          ...request,
          ...patch,
        };
      }),
    };

    if (!matched) {
      throw new Error(`Unknown contact request: ${id}`);
    }

    await persistStore(nextStore);
    return nextStore.requests.find((request) => request.id === id)!;
  });

  mutationQueue = mutation.then(() => undefined, () => undefined);
  return mutation;
}

export async function getRecentContactRequests(limit = 20) {
  const store = await ensureStore();
  return store.requests.slice(0, Math.max(1, limit));
}
