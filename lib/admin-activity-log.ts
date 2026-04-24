import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import {
  appendDurableAdminActivityLog,
  hasDurableCmsStateStore,
  listDurableAdminActivityLog,
} from "@/lib/cms-durable-state";
import { listUserProductProfiles } from "@/lib/user-product-store";

export type AdminActivityLogEntry = {
  id: string;
  actorUserId: string | null;
  actorEmail: string;
  actionType: string;
  targetType: string;
  targetId: string | null;
  targetFamily: string | null;
  targetSlug: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type AdminActivityGroupBy = "day" | "user" | "page" | "action";

type AdminActivityLogStore = {
  entries: AdminActivityLogEntry[];
};

const STORE_PATH = path.join(process.cwd(), "data", "admin-activity-log.json");
const MAX_FALLBACK_ENTRIES = 500;
const SYSTEM_ACTOR_LABEL = "System";
const LOCAL_BYPASS_ACTOR_ID = "local-admin-bypass";

function cleanString(value: string | null | undefined, maxLength = 2000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeEntry(
  value: Partial<AdminActivityLogEntry>,
  index = 0,
): AdminActivityLogEntry {
  const normalized = {
    id: cleanString(value.id, 120) || `admin_activity_${index + 1}_${randomUUID()}`,
    actorUserId: cleanString(value.actorUserId, 120) || null,
    actorEmail: cleanString(value.actorEmail, 240),
    actionType: cleanString(value.actionType, 160),
    targetType: cleanString(value.targetType, 160),
    targetId: cleanString(value.targetId, 160) || null,
    targetFamily: cleanString(value.targetFamily, 120) || null,
    targetSlug: cleanString(value.targetSlug, 160) || null,
    summary: cleanString(value.summary, 2000),
    metadata:
      value.metadata && typeof value.metadata === "object" && !Array.isArray(value.metadata)
        ? value.metadata
        : {},
    createdAt: cleanString(value.createdAt, 120) || new Date().toISOString(),
  };

  return normalizeSystemActorEntry(normalized);
}

function normalizeSystemActorEntry(entry: AdminActivityLogEntry): AdminActivityLogEntry {
  if (cleanString(entry.actorUserId, 120) === LOCAL_BYPASS_ACTOR_ID) {
    return {
      ...entry,
      actorUserId: null,
      actorEmail: SYSTEM_ACTOR_LABEL,
    };
  }

  return entry;
}

async function resolveAdminActivityActor(input: {
  actorUserId: string | null;
  actorEmail: string;
}) {
  const actorUserId = cleanString(input.actorUserId, 120) || null;
  const actorEmail = cleanString(input.actorEmail, 240);

  if (actorUserId === LOCAL_BYPASS_ACTOR_ID) {
    return {
      actorUserId: null,
      actorEmail: SYSTEM_ACTOR_LABEL,
    };
  }

  if (!actorUserId && (!actorEmail || actorEmail.toLowerCase() === SYSTEM_ACTOR_LABEL.toLowerCase())) {
    return {
      actorUserId: null,
      actorEmail: SYSTEM_ACTOR_LABEL,
    };
  }

  if (!actorEmail) {
    return {
      actorUserId,
      actorEmail: "Unknown user",
    };
  }

  try {
    const profiles = await listUserProductProfiles();
    const matchedProfile =
      profiles.find((profile) => actorUserId && profile.authUserId === actorUserId) ??
      profiles.find((profile) => profile.email.toLowerCase() === actorEmail.toLowerCase()) ??
      null;

    if (!matchedProfile) {
      return {
        actorUserId,
        actorEmail,
      };
    }

    const profileName = cleanString(matchedProfile.name, 160);
    const profileEmail = cleanString(matchedProfile.email, 240);
    const displayLabel =
      profileName && profileEmail && profileName.toLowerCase() !== profileEmail.toLowerCase()
        ? `${profileName} · ${profileEmail}`
        : profileEmail || profileName || actorEmail;

    return {
      actorUserId,
      actorEmail: displayLabel || actorEmail,
    };
  } catch {
    return {
      actorUserId,
      actorEmail,
    };
  }
}

async function readFallbackStore(): Promise<AdminActivityLogStore> {
  try {
    const content = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(content) as Partial<AdminActivityLogStore>;
    return {
      entries: Array.isArray(parsed.entries)
        ? parsed.entries
            .map((entry, index) => normalizeEntry(entry, index))
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        : [],
    };
  } catch {
    return { entries: [] };
  }
}

async function writeFallbackStore(store: AdminActivityLogStore) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(
    STORE_PATH,
    JSON.stringify(
      {
        entries: store.entries.slice(0, MAX_FALLBACK_ENTRIES),
      },
      null,
      2,
    ),
    "utf8",
  );
}

async function seedDurableFromFallback(entries: AdminActivityLogEntry[]) {
  await Promise.all(entries.map((entry) => appendDurableAdminActivityLog(entry)));
}

function mergeActivityEntries(...entrySets: AdminActivityLogEntry[][]) {
  const merged = new Map<string, AdminActivityLogEntry>();

  for (const entries of entrySets) {
    for (const entry of entries) {
      const existing = merged.get(entry.id);
      const normalizedEntry = normalizeSystemActorEntry(entry);
      if (!existing || normalizedEntry.createdAt.localeCompare(existing.createdAt) > 0) {
        merged.set(entry.id, normalizedEntry);
      }
    }
  }

  return Array.from(merged.values()).sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

function isDebugOnlyActivityEntry(entry: AdminActivityLogEntry) {
  const summary = cleanString(entry.summary, 2000).toLowerCase();
  return summary.startsWith("manual test activity entry");
}

export async function listAdminActivityLog(limit = 100) {
  const fallbackStore = await readFallbackStore();

  if (!hasDurableCmsStateStore()) {
    return fallbackStore.entries.slice(0, limit);
  }

  const durableEntries = await listDurableAdminActivityLog(limit);
  if (!durableEntries) {
    return fallbackStore.entries.slice(0, limit);
  }

  if (!durableEntries.length && fallbackStore.entries.length) {
    await seedDurableFromFallback(fallbackStore.entries.slice(0, limit));
    const seededEntries = await listDurableAdminActivityLog(limit);
    if (!seededEntries) {
      return fallbackStore.entries.slice(0, limit);
    }

    return mergeActivityEntries(seededEntries, fallbackStore.entries)
      .filter((entry) => !isDebugOnlyActivityEntry(entry))
      .slice(0, limit);
  }

  return mergeActivityEntries(durableEntries, fallbackStore.entries)
    .filter((entry) => !isDebugOnlyActivityEntry(entry))
    .slice(0, limit);
}

export async function appendAdminActivityLog(input: Omit<AdminActivityLogEntry, "id" | "createdAt"> & {
  createdAt?: string | null;
}) {
  const resolvedActor = await resolveAdminActivityActor({
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
  });
  const entry = normalizeEntry({
    ...input,
    actorUserId: resolvedActor.actorUserId,
    actorEmail: resolvedActor.actorEmail,
    createdAt: input.createdAt ?? new Date().toISOString(),
  });

  const fallbackStore = await readFallbackStore();
  await writeFallbackStore({
    entries: [entry, ...fallbackStore.entries.filter((item) => item.id !== entry.id)],
  });

  if (hasDurableCmsStateStore()) {
    const durableEntry = await appendDurableAdminActivityLog(entry);
    if (durableEntry) {
      await writeFallbackStore({
        entries: [
          durableEntry,
          ...fallbackStore.entries.filter(
            (item) => item.id !== durableEntry.id && item.id !== entry.id,
          ),
        ],
      });
      return durableEntry;
    }
  }

  return entry;
}

export function formatAdminActivityTarget(entry: AdminActivityLogEntry) {
  if (entry.targetType === "content_record") {
    return [entry.targetFamily, entry.targetSlug].filter(Boolean).join(" / ");
  }

  if (entry.targetType === "user_profile") {
    return entry.targetId || entry.targetSlug || "User profile";
  }

  if (entry.targetType === "refresh_job") {
    return entry.targetId || entry.targetSlug || "Refresh job";
  }

  if (entry.targetType === "membership_tier") {
    return entry.targetSlug || entry.targetId || "Membership tier";
  }

  if (entry.targetType === "system_settings") {
    return "System settings";
  }

  return entry.targetId || entry.targetSlug || entry.targetType;
}

export function getAdminActivityTargetHref(entry: AdminActivityLogEntry) {
  if (entry.targetType === "content_record" && entry.targetFamily && entry.targetSlug) {
    return `/admin/content/${entry.targetFamily}/${entry.targetSlug}`;
  }

  if (entry.targetType === "user_profile") {
    return "/admin/users";
  }

  if (entry.targetType === "refresh_job") {
    return "/admin/refresh-jobs";
  }

  if (entry.targetType === "membership_tier") {
    return entry.targetSlug ? `/admin/memberships/${entry.targetSlug}` : "/admin/memberships";
  }

  if (entry.targetType === "system_settings") {
    return "/admin/settings";
  }

  return null;
}

export function getAdminActivityRevertHref(entry: AdminActivityLogEntry) {
  if (entry.targetType === "content_record" && entry.targetFamily && entry.targetSlug) {
    return `/admin/content/${entry.targetFamily}/${entry.targetSlug}#version-history`;
  }

  return null;
}

export function getAdminActivityActorLabel(
  entry: Pick<AdminActivityLogEntry, "actorEmail" | "actorUserId">,
) {
  return cleanString(entry.actorEmail, 240) || (entry.actorUserId ? "Unknown user" : SYSTEM_ACTOR_LABEL);
}

export function getAdminActivityActorContext(
  entry: Pick<AdminActivityLogEntry, "actorEmail" | "actorUserId">,
) {
  if (getAdminActivityActorLabel(entry) === SYSTEM_ACTOR_LABEL) {
    return "Automatic or approval-generated action";
  }

  return cleanString(entry.actorUserId, 120) || "No user ID";
}

export function getAdminActivityActionTone(actionType: string) {
  if (actionType.includes("publish") || actionType.includes("created")) {
    return "success" as const;
  }

  if (
    actionType.includes("archive") ||
    actionType.includes("role") ||
    actionType.includes("failed")
  ) {
    return "danger" as const;
  }

  if (
    actionType.includes("retry") ||
    actionType.includes("review") ||
    actionType.includes("needs_fix")
  ) {
    return "warning" as const;
  }

  return "info" as const;
}
