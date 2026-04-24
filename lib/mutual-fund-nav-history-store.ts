import { readFile } from "node:fs/promises";
import path from "node:path";

import { cache } from "react";

import { isHostedDbRuntime } from "@/lib/durable-data-runtime";
import { hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import { createSupabaseReadClient } from "@/lib/supabase/admin";

const LOCAL_HISTORY_PATH = path.join(process.cwd(), "data", "mutual-fund-nav-history.json");

export type MutualFundNavHistoryPoint = {
  date: string;
  nav: number;
};

export type MutualFundNavHistoryEntry = {
  fundSlug: string;
  sourceLabel: string;
  sourceDate: string | null;
  referenceUrl: string | null;
  points: MutualFundNavHistoryPoint[];
};

export type MutualFundNavHistoryAvailability = "available" | "insufficient" | "not_connected" | "read_failed";

export type MutualFundNavHistoryDiagnostics = {
  status: MutualFundNavHistoryAvailability;
  totalRows: number;
  validRows: number;
  invalidDateRows: number;
  invalidNavRows: number;
  duplicateDatesRemoved: number;
  errorMessage: string | null;
};

export type MutualFundNavHistoryLookup = {
  status: MutualFundNavHistoryAvailability;
  entry: MutualFundNavHistoryEntry | null;
  diagnostics: MutualFundNavHistoryDiagnostics;
};

type LocalHistoryStore = {
  entries?: Array<{
    fundSlug?: string;
    sourceLabel?: string;
    sourceDate?: string | null;
    referenceUrl?: string | null;
    payloadJson?: Array<{
      date?: string;
      nav?: number | string;
    }>;
  }>;
};

type SupabaseHistoryRow = {
  date?: string;
  nav?: number | string | null;
};

function normalizeFundSlug(value: string) {
  return value.trim().toLowerCase();
}

function createDiagnostics(
  status: MutualFundNavHistoryAvailability,
  overrides: Partial<Omit<MutualFundNavHistoryDiagnostics, "status">> = {},
): MutualFundNavHistoryDiagnostics {
  return {
    status,
    totalRows: overrides.totalRows ?? 0,
    validRows: overrides.validRows ?? 0,
    invalidDateRows: overrides.invalidDateRows ?? 0,
    invalidNavRows: overrides.invalidNavRows ?? 0,
    duplicateDatesRemoved: overrides.duplicateDatesRemoved ?? 0,
    errorMessage: overrides.errorMessage ?? null,
  };
}

function parseIsoDate(value: string) {
  const trimmed = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  const parsed = new Date(`${trimmed}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== trimmed) {
    return null;
  }

  return trimmed;
}

function parseNav(value: number | string | null | undefined) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Number(parsed.toFixed(5));
}

function sanitizeHistoryRows(rows: Array<{ date?: string; nav?: number | string | null }>) {
  const deduped = new Map<string, MutualFundNavHistoryPoint>();
  let invalidDateRows = 0;
  let invalidNavRows = 0;

  for (const row of rows) {
    const date = typeof row.date === "string" ? parseIsoDate(row.date) : null;

    if (!date) {
      invalidDateRows += 1;
      continue;
    }

    const nav = parseNav(row.nav);

    if (nav === null) {
      invalidNavRows += 1;
      continue;
    }

    // Keep the last valid row for a date so duplicate handling is deterministic.
    deduped.set(date, { date, nav });
  }

  const points = Array.from(deduped.values()).sort((left, right) => left.date.localeCompare(right.date));
  const diagnostics = createDiagnostics(points.length >= 2 ? "available" : "insufficient", {
    totalRows: rows.length,
    validRows: points.length,
    invalidDateRows,
    invalidNavRows,
    duplicateDatesRemoved: Math.max(rows.length - invalidDateRows - invalidNavRows - points.length, 0),
  });

  return {
    points,
    diagnostics,
  };
}

const readLocalHistoryStore = cache(async (): Promise<LocalHistoryStore> => {
  const raw = await readFile(LOCAL_HISTORY_PATH, "utf8");
  return JSON.parse(raw) as LocalHistoryStore;
});

async function readHostedHistoryLookup(fundSlug: string): Promise<MutualFundNavHistoryLookup> {
  const normalizedSlug = normalizeFundSlug(fundSlug);

  if (!hasRuntimeSupabaseEnv()) {
    return {
      status: "not_connected",
      entry: null,
      diagnostics: createDiagnostics("not_connected"),
    };
  }

  const supabase = createSupabaseReadClient();
  const { data: rows, error: rowsError } = await supabase
    .from("mutual_fund_nav_history")
    .select("date, nav")
    .eq("fund_slug", normalizedSlug)
    .order("date", { ascending: true });

  if (rowsError) {
    return {
      status: "read_failed",
      entry: null,
      diagnostics: createDiagnostics("read_failed", {
        errorMessage: `mutual_fund_nav_history read failed for ${normalizedSlug}: ${rowsError.message}`,
      }),
    };
  }

  if (!rows?.length) {
    return {
      status: "not_connected",
      entry: null,
      diagnostics: createDiagnostics("not_connected"),
    };
  }

  const { points, diagnostics } = sanitizeHistoryRows(rows as SupabaseHistoryRow[]);

  let sourceLabel = "Retained mutual-fund NAV history";
  let sourceDate = points[points.length - 1]?.date ?? null;

  try {
    const { data: statusRows, error: statusError } = await supabase
      .from("market_series_status")
      .select("source_label, latest_point_at")
      .eq("series_type", "fund_nav")
      .eq("asset_slug", normalizedSlug)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (!statusError) {
      const status = statusRows?.[0] ?? null;

      if (typeof status?.source_label === "string" && status.source_label.trim()) {
        sourceLabel = status.source_label.trim();
      }

      if (typeof status?.latest_point_at === "string" && status.latest_point_at.trim()) {
        sourceDate = status.latest_point_at.slice(0, 10);
      }
    }
  } catch {
    // Metadata failure should not collapse a valid retained NAV history lane.
  }

  return {
    status: diagnostics.status,
    entry: {
      fundSlug: normalizedSlug,
      sourceLabel,
      sourceDate,
      referenceUrl: null,
      points,
    },
    diagnostics,
  };
}

async function readLocalHistoryLookup(fundSlug: string): Promise<MutualFundNavHistoryLookup> {
  const normalizedSlug = normalizeFundSlug(fundSlug);
  const store = await readLocalHistoryStore();
  const rawEntry = (store.entries ?? []).find((entry) => normalizeFundSlug(entry.fundSlug ?? "") === normalizedSlug);

  if (!rawEntry) {
    return {
      status: "not_connected",
      entry: null,
      diagnostics: createDiagnostics("not_connected"),
    };
  }

  const { points, diagnostics } = sanitizeHistoryRows(rawEntry.payloadJson ?? []);

  return {
    status: diagnostics.status,
    entry: {
      fundSlug: normalizedSlug,
      sourceLabel: rawEntry.sourceLabel?.trim() || "MFAPI scheme history",
      sourceDate: rawEntry.sourceDate?.trim() || points[points.length - 1]?.date || null,
      referenceUrl: rawEntry.referenceUrl?.trim() || null,
      points,
    },
    diagnostics,
  };
}

export const getMutualFundNavHistoryLookup = cache(async (fundSlug: string): Promise<MutualFundNavHistoryLookup> => {
  try {
    if (isHostedDbRuntime()) {
      return readHostedHistoryLookup(fundSlug);
    }

    return readLocalHistoryLookup(fundSlug);
  } catch (error) {
    return {
      status: "read_failed",
      entry: null,
      diagnostics: createDiagnostics("read_failed", {
        errorMessage: error instanceof Error ? error.message : "Unknown mutual fund history read error",
      }),
    };
  }
});

export const getMutualFundNavHistoryEntry = cache(async (fundSlug: string) => {
  const lookup = await getMutualFundNavHistoryLookup(fundSlug);
  return lookup.entry;
});
