import { readFile } from "fs/promises";
import path from "path";

import { cache } from "react";

import { isHostedDbRuntime } from "@/lib/durable-data-runtime";
import { hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import { createSupabaseReadClient } from "@/lib/supabase/admin";

export type DurableFundHoldingRow = {
  name: string;
  weight: string;
  sector?: string;
};

export type DurableFundHoldingSnapshot = {
  fundSlug: string;
  sourceLabel: string;
  sourceDate: string;
  referenceUrl?: string;
  rows: DurableFundHoldingRow[];
};

type FundHoldingStore = {
  entries: DurableFundHoldingSnapshot[];
};

type FundHoldingSnapshotRow = {
  fund_slug: string;
  source_label: string;
  source_date: string;
  reference_url: string | null;
  payload_json: unknown;
};

const STORE_PATH = path.join(process.cwd(), "data", "fund-holding-snapshots.json");

function isValidHoldingRow(row: Partial<DurableFundHoldingRow>): row is DurableFundHoldingRow {
  return (
    typeof row?.name === "string" &&
    typeof row?.weight === "string" &&
    (typeof row?.sector === "string" || typeof row?.sector === "undefined")
  );
}

function isValidSnapshot(entry: Partial<DurableFundHoldingSnapshot>): entry is DurableFundHoldingSnapshot {
  return (
    typeof entry?.fundSlug === "string" &&
    typeof entry?.sourceLabel === "string" &&
    typeof entry?.sourceDate === "string" &&
    Array.isArray(entry?.rows) &&
    entry.rows.every(isValidHoldingRow)
  );
}

function mapPayloadRows(payload: unknown): DurableFundHoldingRow[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.filter(isValidHoldingRow);
}

async function readLocalFundHoldingSnapshots(): Promise<DurableFundHoldingSnapshot[]> {
  const content = await readFile(STORE_PATH, "utf8");
  const parsed = JSON.parse(content) as Partial<FundHoldingStore>;
  return Array.isArray(parsed.entries) ? parsed.entries.filter(isValidSnapshot) : [];
}

async function readHostedFundHoldingSnapshots(): Promise<DurableFundHoldingSnapshot[]> {
  if (!hasRuntimeSupabaseEnv()) {
    return [];
  }

  const supabase = createSupabaseReadClient();
  const { data, error } = await supabase
    .from("fund_holding_snapshots")
    .select("fund_slug, source_label, source_date, reference_url, payload_json")
    .order("source_date", { ascending: false });

  if (error || !data?.length) {
    return [];
  }

  const deduped = new Map<string, DurableFundHoldingSnapshot>();

  for (const row of data as FundHoldingSnapshotRow[]) {
    if (deduped.has(row.fund_slug)) {
      continue;
    }

    const snapshot: DurableFundHoldingSnapshot = {
      fundSlug: row.fund_slug,
      sourceLabel: row.source_label,
      sourceDate: row.source_date,
      referenceUrl: row.reference_url ?? undefined,
      rows: mapPayloadRows(row.payload_json),
    };

    if (isValidSnapshot(snapshot)) {
      deduped.set(snapshot.fundSlug, snapshot);
    }
  }

  return Array.from(deduped.values());
}

export const getDurableFundHoldingSnapshots = cache(async (): Promise<DurableFundHoldingSnapshot[]> => {
  try {
    if (isHostedDbRuntime()) {
      return readHostedFundHoldingSnapshots();
    }

    return readLocalFundHoldingSnapshots();
  } catch {
    return [];
  }
});
