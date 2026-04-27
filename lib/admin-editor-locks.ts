import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import {
  deleteDurableAdminEditorLock,
  hasDurableCmsStateStore,
  listDurableAdminEditorLocks,
  saveDurableAdminEditorLock,
} from "@/lib/cms-durable-state";
import { canUseFileFallback, getFileFallbackDisabledMessage } from "@/lib/durable-data-runtime";

export type AdminEditorLock = {
  id: string;
  family: string;
  slug: string;
  editorUserId: string | null;
  editorEmail: string;
  startedAt: string;
  lastHeartbeatAt: string;
  expiresAt: string;
};

type AdminEditorLockStore = {
  locks: AdminEditorLock[];
};

const STORE_PATH = path.join(process.cwd(), "data", "admin-editor-locks.json");
const LOCK_TTL_MS = 2 * 60 * 1000;

function cleanString(value: string | null | undefined, maxLength = 240) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeLock(value: Partial<AdminEditorLock>, index = 0): AdminEditorLock {
  const now = new Date().toISOString();
  const lastHeartbeatAt = cleanString(value.lastHeartbeatAt, 120) || now;
  const expiresAt =
    cleanString(value.expiresAt, 120) ||
    new Date(new Date(lastHeartbeatAt).getTime() + LOCK_TTL_MS).toISOString();

  return {
    id: cleanString(value.id, 120) || `editor_lock_${index + 1}_${randomUUID()}`,
    family: cleanString(value.family, 120),
    slug: cleanString(value.slug, 160).toLowerCase(),
    editorUserId: cleanString(value.editorUserId, 120) || null,
    editorEmail: cleanString(value.editorEmail, 240),
    startedAt: cleanString(value.startedAt, 120) || lastHeartbeatAt,
    lastHeartbeatAt,
    expiresAt,
  };
}

function isActiveLock(lock: AdminEditorLock) {
  const expiresAt = new Date(lock.expiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

async function readFallbackStore(): Promise<AdminEditorLockStore> {
  if (!canUseFileFallback()) {
    return { locks: [] };
  }

  try {
    const content = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(content) as Partial<AdminEditorLockStore>;
    const locks = Array.isArray(parsed.locks)
      ? parsed.locks
          .map((lock, index) => normalizeLock(lock, index))
          .filter((lock) => lock.family && lock.slug && lock.editorEmail)
          .filter(isActiveLock)
          .sort((left, right) => right.lastHeartbeatAt.localeCompare(left.lastHeartbeatAt))
      : [];

    return { locks };
  } catch {
    return { locks: [] };
  }
}

async function writeFallbackStore(store: AdminEditorLockStore) {
  if (!canUseFileFallback()) {
    throw new Error(getFileFallbackDisabledMessage("Admin editor lock persistence"));
  }

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(
    STORE_PATH,
    JSON.stringify({ locks: store.locks.filter(isActiveLock) }, null, 2),
    "utf8",
  );
}

async function syncFallbackLock(lock: AdminEditorLock) {
  if (!canUseFileFallback()) {
    return;
  }

  const store = await readFallbackStore();
  await writeFallbackStore({
    locks: [
      lock,
      ...store.locks.filter(
        (item) =>
          !(
            item.family === lock.family &&
            item.slug === lock.slug &&
            item.editorEmail.toLowerCase() === lock.editorEmail.toLowerCase()
          ),
      ),
    ],
  });
}

export async function listAdminEditorLocks(family: string, slug: string) {
  const normalizedFamily = cleanString(family, 120);
  const normalizedSlug = cleanString(slug, 160).toLowerCase();
  const fallback = await readFallbackStore();

  if (!hasDurableCmsStateStore()) {
    return fallback.locks.filter(
      (lock) => lock.family === normalizedFamily && lock.slug === normalizedSlug,
    );
  }

  const durableLocks = await listDurableAdminEditorLocks(normalizedFamily, normalizedSlug);
  if (!durableLocks) {
    return fallback.locks.filter(
      (lock) => lock.family === normalizedFamily && lock.slug === normalizedSlug,
    );
  }

  if (!durableLocks.length) {
    return fallback.locks.filter(
      (lock) => lock.family === normalizedFamily && lock.slug === normalizedSlug,
    );
  }

  return durableLocks;
}

export async function heartbeatAdminEditorLock(input: {
  family: string;
  slug: string;
  editorUserId?: string | null;
  editorEmail: string;
}) {
  const now = new Date();
  const family = cleanString(input.family, 120);
  const slug = cleanString(input.slug, 160).toLowerCase();
  const editorEmail = cleanString(input.editorEmail, 240);
  const existingLocks = await listAdminEditorLocks(family, slug);
  const existing = existingLocks.find(
    (lock) => lock.editorEmail.toLowerCase() === editorEmail.toLowerCase(),
  );

  const lock = normalizeLock({
    id: existing?.id,
    family,
    slug,
    editorUserId: cleanString(input.editorUserId, 120) || null,
    editorEmail,
    startedAt: existing?.startedAt ?? now.toISOString(),
    lastHeartbeatAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + LOCK_TTL_MS).toISOString(),
  });

  if (hasDurableCmsStateStore()) {
    const durableSaved = await saveDurableAdminEditorLock(lock);
    if (durableSaved) {
      if (canUseFileFallback()) {
        await syncFallbackLock(durableSaved);
      }
    } else {
      if (!canUseFileFallback()) {
        throw new Error(getFileFallbackDisabledMessage("Admin editor lock persistence"));
      }
      await syncFallbackLock(lock);
    }
  } else {
    if (!canUseFileFallback()) {
      throw new Error(getFileFallbackDisabledMessage("Admin editor lock persistence"));
    }
    await syncFallbackLock(lock);
  }

  return {
    lock,
    locks: await listAdminEditorLocks(family, slug),
  };
}

export async function releaseAdminEditorLock(input: {
  family: string;
  slug: string;
  editorEmail: string;
}) {
  const family = cleanString(input.family, 120);
  const slug = cleanString(input.slug, 160).toLowerCase();
  const editorEmail = cleanString(input.editorEmail, 240);
  if (canUseFileFallback()) {
    const store = await readFallbackStore();

    await writeFallbackStore({
      locks: store.locks.filter(
        (lock) =>
          !(
            lock.family === family &&
            lock.slug === slug &&
            lock.editorEmail.toLowerCase() === editorEmail.toLowerCase()
          ),
      ),
    });
  }

  if (hasDurableCmsStateStore()) {
    await deleteDurableAdminEditorLock(family, slug, editorEmail);
  }

  return {
    ok: true,
    locks: await listAdminEditorLocks(family, slug),
  };
}
