import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasRuntimeSupabaseAdminEnv } from "@/lib/runtime-launch-config";

const ACCOUNT_STATE_SNAPSHOTS_TABLE = "account_state_snapshots";
const ACCOUNT_STATE_SNAPSHOTS_MIGRATION = "db/migrations/0012_account_state_snapshots.sql";
let accountStateSnapshotsKnownMissing = false;

export type AccountStateLaneId =
  | "workspace"
  | "account_continuity"
  | "billing"
  | "broker_sync"
  | "portfolio"
  | "entitlement_sync"
  | "notification_delivery"
  | "support_follow_up"
  | "subscription_lifecycle";

type AccountStateSnapshotRow<T> = {
  user_key: string;
  user_email: string;
  lane: AccountStateLaneId;
  payload: T;
  updated_at: string;
};

export function hasDurableAccountStateStore() {
  return hasRuntimeSupabaseAdminEnv() && !accountStateSnapshotsKnownMissing;
}

function isMissingAccountStateSnapshotsTableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: string; message?: string };
  const message = candidate.message ?? "";

  return (
    candidate.code === "PGRST205" ||
    message.includes(`public.${ACCOUNT_STATE_SNAPSHOTS_TABLE}`) ||
    message.includes(ACCOUNT_STATE_SNAPSHOTS_TABLE)
  );
}

function markMissingTableIfNeeded(error: unknown) {
  if (isMissingAccountStateSnapshotsTableError(error)) {
    accountStateSnapshotsKnownMissing = true;
    return true;
  }

  return false;
}

export async function readDurableAccountStateLane<T>(
  userKey: string,
  lane: AccountStateLaneId,
): Promise<T | null> {
  if (!hasDurableAccountStateStore()) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(ACCOUNT_STATE_SNAPSHOTS_TABLE)
      .select("user_key, user_email, lane, payload, updated_at")
      .eq("user_key", userKey)
      .eq("lane", lane)
      .maybeSingle();

    const row = data as AccountStateSnapshotRow<T> | null;

    if (error) {
      markMissingTableIfNeeded(error);
      return null;
    }

    if (!row?.payload) {
      return null;
    }

    return row.payload;
  } catch {
    return null;
  }
}

export async function writeDurableAccountStateLane<T>(
  userKey: string,
  userEmail: string,
  lane: AccountStateLaneId,
  payload: T,
): Promise<boolean> {
  if (!hasDurableAccountStateStore()) {
    return false;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from(ACCOUNT_STATE_SNAPSHOTS_TABLE).upsert(
      {
        user_key: userKey,
        user_email: userEmail,
        lane,
        payload,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_key,lane",
      },
    );

    if (error) {
      markMissingTableIfNeeded(error);
      return false;
    }

    return !error;
  } catch {
    return false;
  }
}

export function getDurableAccountStateStoreMigrationMessage() {
  return `Supabase is missing required table "${ACCOUNT_STATE_SNAPSHOTS_TABLE}". Apply ${ACCOUNT_STATE_SNAPSHOTS_MIGRATION} to the real project before treating account-state lanes as durable.`;
}
