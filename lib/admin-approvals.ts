import { randomUUID } from "crypto";
import { mkdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";

import type { AdminFamilyKey } from "@/lib/admin-content-schema";
import type { AdminPublishState, SaveAdminRecordInput } from "@/lib/admin-operator-store";
import {
  hasDurableCmsStateStore,
  listDurableAdminPendingApprovals,
  saveDurableAdminPendingApproval,
} from "@/lib/cms-durable-state";
import { canUseFileFallback, getFileFallbackDisabledMessage } from "@/lib/durable-data-runtime";

export type AdminApprovalDecision = "pending" | "approved" | "rejected";

export type AdminPendingApproval = {
  id: string;
  family: AdminFamilyKey;
  slug: string;
  title: string;
  recordId: string | null;
  submittedByUserId: string | null;
  submittedByEmail: string;
  submittedAt: string;
  updatedAt: string;
  decision: AdminApprovalDecision;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  reviewedByEmail: string | null;
  reviewNote: string | null;
  actionType: string;
  targetStatus: AdminPublishState;
  summary: string;
  changedFields: string[];
  snapshot: SaveAdminRecordInput;
  baseRecordUpdatedAt: string | null;
};

export type SaveAdminPendingApprovalInput = {
  family: AdminFamilyKey;
  slug: string;
  title: string;
  recordId?: string | null;
  submittedByUserId?: string | null;
  submittedByEmail: string;
  actionType: string;
  targetStatus: AdminPublishState;
  summary: string;
  changedFields: string[];
  snapshot: SaveAdminRecordInput;
  baseRecordUpdatedAt?: string | null;
};

const STORE_PATH = path.join(process.cwd(), "data", "admin-pending-approvals.json");
const STORE_VERSION = 1;
let storeCache:
  | {
      mtimeMs: number;
      store: ApprovalStore;
    }
  | null = null;

type ApprovalStore = {
  version: number;
  items: AdminPendingApproval[];
  updatedAt: string | null;
};

type ApprovalLike = {
  id?: string | null;
  family?: AdminFamilyKey | string | null;
  slug?: string | null;
  title?: string | null;
  recordId?: string | null;
  submittedByUserId?: string | null;
  submittedByEmail?: string | null;
  submittedAt?: string | null;
  updatedAt?: string | null;
  decision?: AdminApprovalDecision | string | null;
  reviewedAt?: string | null;
  reviewedByUserId?: string | null;
  reviewedByEmail?: string | null;
  reviewNote?: string | null;
  actionType?: string | null;
  targetStatus?: AdminPublishState | string | null;
  summary?: string | null;
  changedFields?: unknown;
  snapshot?: SaveAdminRecordInput | Record<string, unknown> | null;
  baseRecordUpdatedAt?: string | null;
};

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeSlug(value: unknown) {
  return cleanString(value, 160).toLowerCase();
}

function cleanStringList(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => cleanString(item, 200)).filter(Boolean)
    : [];
}

function normalizeApproval(value: ApprovalLike, index: number): AdminPendingApproval {
  const now = new Date().toISOString();
  const snapshot =
    typeof value.snapshot === "object" && value.snapshot !== null
      ? (value.snapshot as SaveAdminRecordInput)
      : ({} as SaveAdminRecordInput);

  return {
    id: cleanString(value.id, 160) || `approval_${index + 1}_${randomUUID()}`,
    family: cleanString(value.family, 120) as AdminFamilyKey,
    slug: normalizeSlug(value.slug),
    title: cleanString(value.title, 240),
    recordId: cleanString(value.recordId, 160) || null,
    submittedByUserId: cleanString(value.submittedByUserId, 160) || null,
    submittedByEmail: cleanString(value.submittedByEmail, 240),
    submittedAt: cleanString(value.submittedAt, 120) || now,
    updatedAt: cleanString(value.updatedAt, 120) || cleanString(value.submittedAt, 120) || now,
    decision:
      value.decision === "approved" || value.decision === "rejected"
        ? value.decision
        : "pending",
    reviewedAt: cleanString(value.reviewedAt, 120) || null,
    reviewedByUserId: cleanString(value.reviewedByUserId, 160) || null,
    reviewedByEmail: cleanString(value.reviewedByEmail, 240) || null,
    reviewNote: cleanString(value.reviewNote, 2000) || null,
    actionType: cleanString(value.actionType, 120) || "content_change",
    targetStatus:
      value.targetStatus === "published" ||
      value.targetStatus === "archived" ||
      value.targetStatus === "ready_for_review" ||
      value.targetStatus === "needs_fix"
        ? value.targetStatus
        : "draft",
    summary: cleanString(value.summary, 2000),
    changedFields: cleanStringList(value.changedFields),
    snapshot,
    baseRecordUpdatedAt: cleanString(value.baseRecordUpdatedAt, 120) || null,
  };
}

function normalizeStore(parsed: Partial<ApprovalStore>): ApprovalStore {
  return {
    version: typeof parsed.version === "number" ? parsed.version : STORE_VERSION,
    items: Array.isArray(parsed.items)
      ? parsed.items.map((item, index) => normalizeApproval(item, index))
      : [],
    updatedAt: cleanString(parsed.updatedAt, 120) || null,
  };
}

const EMPTY_STORE: ApprovalStore = {
  version: STORE_VERSION,
  items: [],
  updatedAt: null,
};

async function readFallbackStore() {
  if (!canUseFileFallback()) {
    return EMPTY_STORE;
  }

  try {
    const fileStats = await stat(STORE_PATH);
    if (storeCache && storeCache.mtimeMs === fileStats.mtimeMs) {
      return storeCache.store;
    }

    const parsed = JSON.parse(await readFile(STORE_PATH, "utf8")) as Partial<ApprovalStore>;
    const normalized = normalizeStore(parsed);
    storeCache = {
      mtimeMs: fileStats.mtimeMs,
      store: normalized,
    };
    return normalized;
  } catch {
    return EMPTY_STORE;
  }
}

async function writeFallbackStore(store: ApprovalStore) {
  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Admin approvals persistence"));
  }

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  try {
    const fileStats = await stat(STORE_PATH);
    storeCache = {
      mtimeMs: fileStats.mtimeMs,
      store,
    };
  } catch {
    storeCache = {
      mtimeMs: Date.now(),
      store,
    };
  }
}

async function seedDurableFromFallback(store: ApprovalStore) {
  await Promise.all(store.items.map((item) => saveDurableAdminPendingApproval(item)));
}

async function readStore(): Promise<ApprovalStore> {
  const fallbackStore = await readFallbackStore();

  if (!hasDurableCmsStateStore()) {
    return fallbackStore;
  }

  const durableItems = await listDurableAdminPendingApprovals();
  if (!durableItems) {
    return fallbackStore;
  }

  if (durableItems.length === 0 && fallbackStore.items.length > 0) {
    await seedDurableFromFallback(fallbackStore);
    const seededItems = await listDurableAdminPendingApprovals();
    if (seededItems) {
      return {
        version: STORE_VERSION,
        items: seededItems.map((item, index) => normalizeApproval(item, index)),
        updatedAt:
          seededItems.map((item) => item.updatedAt || item.submittedAt).sort().at(-1) ?? null,
      };
    }
  }

  return {
    version: STORE_VERSION,
    items: durableItems.map((item, index) => normalizeApproval(item, index)),
    updatedAt:
      durableItems.map((item) => item.updatedAt || item.submittedAt).sort().at(-1) ?? null,
  };
}

async function mirrorApprovalToFallback(approval: AdminPendingApproval) {
  if (!canUseFileFallback()) {
    return;
  }

  const fallbackStore = await readFallbackStore();
  const existingIndex = fallbackStore.items.findIndex((item) => item.id === approval.id);
  const nextItems =
    existingIndex >= 0
      ? fallbackStore.items.map((item, index) => (index === existingIndex ? approval : item))
      : [approval, ...fallbackStore.items];
  await writeFallbackStore({
    ...fallbackStore,
    items: nextItems.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    updatedAt: approval.updatedAt,
  });
}

export async function listAdminPendingApprovals(filters?: {
  decision?: AdminApprovalDecision | "all";
  family?: AdminFamilyKey | null;
  slug?: string | null;
  submittedByEmail?: string | null;
}) {
  const store = await readStore();
  return store.items
    .filter((item) =>
      !filters?.decision || filters.decision === "all" ? true : item.decision === filters.decision,
    )
    .filter((item) => (!filters?.family ? true : item.family === filters.family))
    .filter((item) => (!filters?.slug ? true : item.slug === normalizeSlug(filters.slug)))
    .filter((item) =>
      !filters?.submittedByEmail
        ? true
        : item.submittedByEmail.toLowerCase() === cleanString(filters.submittedByEmail, 240).toLowerCase(),
    )
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function getAdminPendingApproval(id: string) {
  const items = await listAdminPendingApprovals();
  return items.find((item) => item.id === cleanString(id, 160)) ?? null;
}

export async function getActivePendingApprovalForRecord(
  family: AdminFamilyKey,
  slug: string,
  submittedByEmail?: string | null,
) {
  const items = await listAdminPendingApprovals({
    decision: "pending",
    family,
    slug,
    submittedByEmail: submittedByEmail ?? null,
  });
  return items[0] ?? null;
}

export async function saveAdminPendingApproval(input: SaveAdminPendingApprovalInput) {
  const store = await readStore();
  const now = new Date().toISOString();
  const existing = store.items.find(
    (item) =>
      item.decision === "pending" &&
      item.family === input.family &&
      item.slug === normalizeSlug(input.slug) &&
      item.submittedByEmail.toLowerCase() === input.submittedByEmail.trim().toLowerCase(),
  );

  const approval = normalizeApproval(
    {
      ...existing,
      family: input.family,
      slug: input.slug,
      title: input.title,
      recordId: input.recordId ?? existing?.recordId ?? null,
      submittedByUserId: input.submittedByUserId ?? existing?.submittedByUserId ?? null,
      submittedByEmail: input.submittedByEmail,
      submittedAt: existing?.submittedAt ?? now,
      updatedAt: now,
      decision: "pending",
      reviewedAt: null,
      reviewedByUserId: null,
      reviewedByEmail: null,
      reviewNote: null,
      actionType: input.actionType,
      targetStatus: input.targetStatus,
      summary: input.summary,
      changedFields: input.changedFields,
      snapshot: input.snapshot,
      baseRecordUpdatedAt: input.baseRecordUpdatedAt ?? existing?.baseRecordUpdatedAt ?? null,
    },
    0,
  );

  if (hasDurableCmsStateStore()) {
    const durableSaved = await saveDurableAdminPendingApproval(approval);
    if (durableSaved) {
      const normalized = normalizeApproval(durableSaved, 0);
      await mirrorApprovalToFallback(normalized);
      return normalized;
    }
  }

  const existingIndex = store.items.findIndex((item) => item.id === approval.id);
  const nextItems =
    existingIndex >= 0
      ? store.items.map((item, index) => (index === existingIndex ? approval : item))
      : [approval, ...store.items];
  await writeFallbackStore({
    ...store,
    items: nextItems.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    updatedAt: approval.updatedAt,
  });
  return approval;
}

export async function reviewAdminPendingApproval(input: {
  id: string;
  decision: "approved" | "rejected";
  reviewedByEmail: string;
  reviewedByUserId?: string | null;
  reviewNote?: string | null;
}) {
  const approval = await getAdminPendingApproval(input.id);
  if (!approval) {
    return null;
  }

  const reviewed = normalizeApproval(
    {
      ...approval,
      decision: input.decision,
      reviewedAt: new Date().toISOString(),
      reviewedByUserId: input.reviewedByUserId ?? null,
      reviewedByEmail: input.reviewedByEmail,
      reviewNote: input.reviewNote ?? null,
      updatedAt: new Date().toISOString(),
    },
    0,
  );

  if (hasDurableCmsStateStore()) {
    const durableSaved = await saveDurableAdminPendingApproval(reviewed);
    if (durableSaved) {
      const normalized = normalizeApproval(durableSaved, 0);
      await mirrorApprovalToFallback(normalized);
      return normalized;
    }
  }

  const store = await readStore();
  const nextItems = store.items.map((item) => (item.id === reviewed.id ? reviewed : item));
  await writeFallbackStore({
    ...store,
    items: nextItems.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    updatedAt: reviewed.updatedAt,
  });
  return reviewed;
}
