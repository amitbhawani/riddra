import { hasRuntimeSupabaseAdminEnv } from "@/lib/runtime-launch-config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type DurabilityStatus = "Ready" | "In progress" | "Blocked";

type DurabilityMigrationGroup = {
  title: string;
  migration: string;
  tables: string[];
  summary: string;
};

type DurabilityTableCheck = {
  table: string;
  exists: boolean;
  error: string | null;
};

export type SupabaseDurabilityGroupCheck = DurabilityMigrationGroup & {
  status: DurabilityStatus;
  missingTables: string[];
  error: string | null;
};

export type SupabaseDurabilityCheck = {
  configured: boolean;
  connectionError: string | null;
  status: DurabilityStatus;
  groups: SupabaseDurabilityGroupCheck[];
  missingTables: string[];
  migrationOrder: string[];
};

const DURABILITY_GROUPS: DurabilityMigrationGroup[] = [
  {
    title: "Core foundation prerequisite",
    migration: "db/migrations/0001_phase_0_1_foundation.sql",
    tables: ["data_sources"],
    summary: "Creates public.data_sources, which 0003 depends on for tracked index source linkage.",
  },
  {
    title: "Index tracker foundation",
    migration: "db/migrations/0003_index_tracker_foundation.sql",
    tables: ["tracked_indexes", "index_tracker_snapshots", "index_component_snapshots"],
    summary: "Creates the tracked index and component snapshot tables that 0011 extends for index durability.",
  },
  {
    title: "Market-data durability",
    migration: "db/migrations/0011_market_data_durability.sql",
    tables: [
      "market_refresh_runs",
      "market_series_status",
      "stock_quote_history",
      "stock_ohlcv_history",
      "fund_nav_history",
    ],
    summary: "Creates retained market-data run metadata and quote, chart, and fund history tables for the durable refresh path.",
  },
  {
    title: "Account-state durability",
    migration: "db/migrations/0012_account_state_snapshots.sql",
    tables: ["account_state_snapshots"],
    summary: "Creates the durable account continuity lane used by workspace, portfolio, broker, support, and notification state.",
  },
];

function isMissingTableError(error: unknown, table: string) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: string; message?: string };
  const message = candidate.message ?? "";

  return (
    candidate.code === "PGRST205" ||
    message.includes(`public.${table}`) ||
    message.includes(`relation "${table}"`) ||
    message.includes(`table "${table}"`) ||
    message.includes(table)
  );
}

async function checkTable(table: string): Promise<DurabilityTableCheck> {
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from(table).select("*", { head: true, count: "exact" }).limit(1);

    if (!error) {
      return {
        table,
        exists: true,
        error: null,
      };
    }

    return {
      table,
      exists: !isMissingTableError(error, table),
      error: error.message ?? "Unknown table check error.",
    };
  } catch (error) {
    return {
      table,
      exists: false,
      error: error instanceof Error ? error.message : "Unknown connection error.",
    };
  }
}

export async function getSupabaseDurabilityCheck(): Promise<SupabaseDurabilityCheck> {
  if (!hasRuntimeSupabaseAdminEnv()) {
    return {
      configured: false,
      connectionError: "Supabase admin environment variables are missing.",
      status: "Blocked",
      groups: DURABILITY_GROUPS.map((group) => ({
        ...group,
        status: "Blocked",
        missingTables: [...group.tables],
        error: "Supabase admin environment variables are missing.",
      })),
      missingTables: DURABILITY_GROUPS.flatMap((group) => group.tables),
      migrationOrder: DURABILITY_GROUPS.map((group) => group.migration),
    };
  }

  const tableChecks = await Promise.all(
    DURABILITY_GROUPS.flatMap((group) => group.tables).map((table) => checkTable(table)),
  );
  const tableMap = new Map(tableChecks.map((check) => [check.table, check] as const));
  const connectionError =
    tableChecks.find((check) => check.error && !isMissingTableError({ message: check.error }, check.table))?.error ?? null;

  const groups = DURABILITY_GROUPS.map((group) => {
    const checks = group.tables.map((table) => tableMap.get(table)!);
    const missingTables = checks.filter((check) => !check.exists).map((check) => check.table);
    const error = checks.find((check) => check.error)?.error ?? null;
    const status: DurabilityStatus =
      missingTables.length === 0 ? "Ready" : missingTables.length === group.tables.length ? "Blocked" : "In progress";

    return {
      ...group,
      status,
      missingTables,
      error,
    };
  });

  const missingTables = groups.flatMap((group) => group.missingTables);
  const status: DurabilityStatus =
    missingTables.length === 0 ? "Ready" : groups.some((group) => group.status === "In progress") ? "In progress" : "Blocked";

  return {
    configured: true,
    connectionError,
    status,
    groups,
    missingTables,
    migrationOrder: DURABILITY_GROUPS.map((group) => group.migration),
  };
}
