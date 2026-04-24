import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasRuntimeSupabaseAdminEnv } from "@/lib/runtime-launch-config";

const GLOBAL_STATE_SNAPSHOTS_TABLE = "global_state_snapshots";
const GLOBAL_STATE_SNAPSHOTS_MIGRATION = "db/migrations/0013_global_state_snapshots.sql";
let globalStateSnapshotsKnownMissing = false;

export type GlobalStateLaneId =
  | "billing_ledger"
  | "contact_requests"
  | "derivatives_memory"
  | "entitlement_audit"
  | "ai_generation_memory"
  | "job_run_log"
  | "notification_event_bus"
  | "research_archive"
  | "source_jobs"
  | "subscription_lifecycle_ops";

type GlobalStateSnapshotRow<T> = {
  lane: GlobalStateLaneId;
  payload: T;
  updated_at: string;
};

export function hasDurableGlobalStateStore() {
  return hasRuntimeSupabaseAdminEnv() && !globalStateSnapshotsKnownMissing;
}

function isMissingGlobalStateSnapshotsTableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: string; message?: string };
  const message = candidate.message ?? "";

  return (
    candidate.code === "PGRST205" ||
    message.includes(`public.${GLOBAL_STATE_SNAPSHOTS_TABLE}`) ||
    message.includes(GLOBAL_STATE_SNAPSHOTS_TABLE)
  );
}

function markMissingTableIfNeeded(error: unknown) {
  if (isMissingGlobalStateSnapshotsTableError(error)) {
    globalStateSnapshotsKnownMissing = true;
    return true;
  }

  return false;
}

export async function readDurableGlobalStateLane<T>(
  lane: GlobalStateLaneId,
): Promise<T | null> {
  if (!hasDurableGlobalStateStore()) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(GLOBAL_STATE_SNAPSHOTS_TABLE)
      .select("lane, payload, updated_at")
      .eq("lane", lane)
      .maybeSingle();

    const row = data as GlobalStateSnapshotRow<T> | null;

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

export async function writeDurableGlobalStateLane<T>(
  lane: GlobalStateLaneId,
  payload: T,
): Promise<boolean> {
  if (!hasDurableGlobalStateStore()) {
    return false;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from(GLOBAL_STATE_SNAPSHOTS_TABLE).upsert(
      {
        lane,
        payload,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "lane",
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

export function getDurableGlobalStateStoreMigrationMessage() {
  return `Supabase is missing required table "${GLOBAL_STATE_SNAPSHOTS_TABLE}". Apply ${GLOBAL_STATE_SNAPSHOTS_MIGRATION} to the real project before treating shared operator state lanes as durable.`;
}
