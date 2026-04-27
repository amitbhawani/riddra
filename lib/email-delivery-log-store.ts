import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { canUseFileFallback, getFileFallbackDisabledMessage } from "@/lib/durable-data-runtime";

export type EmailDeliveryFamily =
  | "support_acknowledgement"
  | "support_follow_up"
  | "support_inbox_notification"
  | "contact_acknowledgement"
  | "contact_inbox_notification"
  | "notification_summary"
  | "account_change_alert";

export type EmailDeliveryStatus = "Queued" | "Sent" | "Failed" | "Skipped";

export type EmailDeliveryLogEntry = {
  id: string;
  family: EmailDeliveryFamily;
  status: EmailDeliveryStatus;
  provider: "resend";
  recipients: string[];
  subject: string;
  attemptedAt: string;
  relatedEntityId: string | null;
  userEmail: string | null;
  routeTarget: string | null;
  messageId: string | null;
  error: string | null;
};

export type EmailDeliveryLogSummary = {
  total: number;
  queued: number;
  sent: number;
  failed: number;
  skipped: number;
};

type EmailDeliveryLogStore = {
  version: number;
  entries: EmailDeliveryLogEntry[];
};

const STORE_PATH = path.join(process.cwd(), "data", "email-delivery-log.json");
const STORE_VERSION = 1;
let mutationQueue = Promise.resolve();

function createEntryId(family: EmailDeliveryFamily) {
  return `${family}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function readStore(): Promise<EmailDeliveryLogStore | null> {
  if (!canUseFileFallback()) {
    return {
      version: STORE_VERSION,
      entries: [],
    };
  }

  try {
    const content = await readFile(STORE_PATH, "utf8");
    return JSON.parse(content) as EmailDeliveryLogStore;
  } catch {
    return null;
  }
}

async function writeStore(store: EmailDeliveryLogStore) {
  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Email delivery log"));
  }

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function ensureStore() {
  if (!canUseFileFallback()) {
    return {
      version: STORE_VERSION,
      entries: [],
    };
  }

  const exists = await access(STORE_PATH)
    .then(() => true)
    .catch(() => false);
  const store = await readStore();

  if (exists && store?.entries) {
    return store;
  }

  const nextStore: EmailDeliveryLogStore = {
    version: STORE_VERSION,
    entries: [],
  };
  await writeStore(nextStore);
  return nextStore;
}

export async function recordEmailDeliveryAttempt(input: {
  family: EmailDeliveryFamily;
  status: EmailDeliveryStatus;
  recipients: string[];
  subject: string;
  relatedEntityId?: string | null;
  userEmail?: string | null;
  routeTarget?: string | null;
  messageId?: string | null;
  error?: string | null;
}) {
  const mutation = mutationQueue.then(async () => {
    const store = await ensureStore();
    const entry: EmailDeliveryLogEntry = {
      id: createEntryId(input.family),
      family: input.family,
      status: input.status,
      provider: "resend",
      recipients: input.recipients,
      subject: input.subject,
      attemptedAt: new Date().toISOString(),
      relatedEntityId: input.relatedEntityId ?? null,
      userEmail: input.userEmail ?? null,
      routeTarget: input.routeTarget ?? null,
      messageId: input.messageId ?? null,
      error: input.error ?? null,
    };

    const nextStore: EmailDeliveryLogStore = {
      ...store,
      entries: [entry, ...store.entries].slice(0, 250),
    };
    await writeStore(nextStore);
    return entry;
  });

  mutationQueue = mutation.then(() => undefined, () => undefined);
  return mutation;
}

export async function recordQueuedEmailDelivery(input: {
  family: EmailDeliveryFamily;
  recipients: string[];
  subject: string;
  relatedEntityId?: string | null;
  userEmail?: string | null;
  routeTarget?: string | null;
}) {
  return recordEmailDeliveryAttempt({
    ...input,
    status: "Queued",
  });
}

export async function getEmailDeliveryLog(options: { family?: EmailDeliveryFamily; limit?: number } = {}) {
  const store = await ensureStore();
  const filtered = store.entries.filter((entry) => !options.family || entry.family === options.family);
  return filtered.slice(0, Math.max(1, options.limit ?? 50));
}

export function summarizeEmailDeliveryLog(entries: EmailDeliveryLogEntry[]): EmailDeliveryLogSummary {
  return {
    total: entries.length,
    queued: entries.filter((entry) => entry.status === "Queued").length,
    sent: entries.filter((entry) => entry.status === "Sent").length,
    failed: entries.filter((entry) => entry.status === "Failed").length,
    skipped: entries.filter((entry) => entry.status === "Skipped").length,
  };
}

export function toEmailDeliveryLogCsv(entries: EmailDeliveryLogEntry[]) {
  const header = [
    "id",
    "family",
    "status",
    "provider",
    "recipients",
    "subject",
    "attempted_at",
    "related_entity_id",
    "user_email",
    "route_target",
    "message_id",
    "error",
  ];
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const rows = entries.map((entry) =>
    [
      entry.id,
      entry.family,
      entry.status,
      entry.provider,
      entry.recipients.join(", "),
      entry.subject,
      entry.attemptedAt,
      entry.relatedEntityId ?? "",
      entry.userEmail ?? "",
      entry.routeTarget ?? "",
      entry.messageId ?? "",
      entry.error ?? "",
    ].map((value) => escape(String(value))).join(","),
  );

  return [header.join(","), ...rows].join("\n");
}
