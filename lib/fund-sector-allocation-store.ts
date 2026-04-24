import { readFile } from "fs/promises";
import path from "path";

import { cache } from "react";

import { isHostedDbRuntime } from "@/lib/durable-data-runtime";
import { hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import { createSupabaseReadClient } from "@/lib/supabase/admin";

export type DurableFundSectorAllocationRow = {
  name: string;
  weight: string;
};

export type DurableFundSectorAllocationSnapshot = {
  fundSlug: string;
  sourceLabel: string;
  sourceDate: string;
  referenceUrl?: string;
  rows: DurableFundSectorAllocationRow[];
};

type FundSectorAllocationStore = {
  entries: DurableFundSectorAllocationSnapshot[];
};

type FundSectorAllocationSnapshotRow = {
  fund_slug: string;
  source_label: string;
  source_date: string;
  reference_url: string | null;
  payload_json: unknown;
};

const STORE_PATH = path.join(process.cwd(), "data", "fund-sector-allocation-snapshots.json");

function isValidAllocationRow(row: Partial<DurableFundSectorAllocationRow>): row is DurableFundSectorAllocationRow {
  return typeof row?.name === "string" && typeof row?.weight === "string";
}

function isValidSnapshot(
  entry: Partial<DurableFundSectorAllocationSnapshot>,
): entry is DurableFundSectorAllocationSnapshot {
  return (
    typeof entry?.fundSlug === "string" &&
    typeof entry?.sourceLabel === "string" &&
    typeof entry?.sourceDate === "string" &&
    Array.isArray(entry?.rows) &&
    entry.rows.every(isValidAllocationRow)
  );
}

function mapPayloadRows(payload: unknown): DurableFundSectorAllocationRow[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.filter(isValidAllocationRow);
}

async function readLocalFundSectorAllocationSnapshots(): Promise<DurableFundSectorAllocationSnapshot[]> {
  const content = await readFile(STORE_PATH, "utf8");
  const parsed = JSON.parse(content) as Partial<FundSectorAllocationStore>;
  return Array.isArray(parsed.entries) ? parsed.entries.filter(isValidSnapshot) : [];
}

async function readHostedFundSectorAllocationSnapshots(): Promise<DurableFundSectorAllocationSnapshot[]> {
  if (!hasRuntimeSupabaseEnv()) {
    return [];
  }

  const supabase = createSupabaseReadClient();
  const { data, error } = await supabase
    .from("fund_sector_allocation_snapshots")
    .select("fund_slug, source_label, source_date, reference_url, payload_json")
    .order("source_date", { ascending: false });

  if (error || !data?.length) {
    return [];
  }

  const deduped = new Map<string, DurableFundSectorAllocationSnapshot>();

  for (const row of data as FundSectorAllocationSnapshotRow[]) {
    if (deduped.has(row.fund_slug)) {
      continue;
    }

    const snapshot: DurableFundSectorAllocationSnapshot = {
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

export const getDurableFundSectorAllocationSnapshots = cache(
  async (): Promise<DurableFundSectorAllocationSnapshot[]> => {
    try {
      if (isHostedDbRuntime()) {
        return readHostedFundSectorAllocationSnapshots();
      }

      return readLocalFundSectorAllocationSnapshots();
    } catch {
      return [];
    }
  },
);
