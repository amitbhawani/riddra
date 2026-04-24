import { readFile } from "fs/promises";
import path from "path";

import { cache } from "react";

import { isHostedDbRuntime } from "@/lib/durable-data-runtime";
import { hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import { createSupabaseReadClient } from "@/lib/supabase/admin";

export type SectorPerformanceSnapshot = {
  sectorSlug: string;
  sectorName: string;
  return1D: number;
  sourceLabel: string;
  sourceDate: string;
  referenceUrl?: string;
};

type SectorPerformanceStore = {
  entries: SectorPerformanceSnapshot[];
};

type SectorPerformanceRow = {
  sector_slug: string;
  sector_name: string;
  return_1d: number | string;
  source_label: string;
  source_date: string;
  reference_url: string | null;
};

const STORE_PATH = path.join(process.cwd(), "data", "sector-performance-snapshots.json");

function isValidEntry(entry: Partial<SectorPerformanceSnapshot>): entry is SectorPerformanceSnapshot {
  return (
    typeof entry?.sectorSlug === "string" &&
    typeof entry?.sectorName === "string" &&
    typeof entry?.return1D === "number" &&
    typeof entry?.sourceLabel === "string" &&
    typeof entry?.sourceDate === "string" &&
    (typeof entry?.referenceUrl === "string" || typeof entry?.referenceUrl === "undefined")
  );
}

function mapRows(rows: SectorPerformanceRow[]): SectorPerformanceSnapshot[] {
  return rows
    .map((row) => ({
      sectorSlug: row.sector_slug,
      sectorName: row.sector_name,
      return1D: Number(row.return_1d),
      sourceLabel: row.source_label,
      sourceDate: row.source_date,
      referenceUrl: row.reference_url ?? undefined,
    }))
    .filter(isValidEntry);
}

async function readLocalSectorPerformanceSnapshots(): Promise<SectorPerformanceSnapshot[]> {
  const content = await readFile(STORE_PATH, "utf8");
  const parsed = JSON.parse(content) as Partial<SectorPerformanceStore>;
  return Array.isArray(parsed.entries) ? parsed.entries.filter(isValidEntry) : [];
}

async function readHostedSectorPerformanceSnapshots(): Promise<SectorPerformanceSnapshot[]> {
  if (!hasRuntimeSupabaseEnv()) {
    return [];
  }

  const supabase = createSupabaseReadClient();
  const { data, error } = await supabase
    .from("sector_performance_snapshots")
    .select("sector_slug, sector_name, return_1d, source_label, source_date, reference_url")
    .order("source_date", { ascending: false });

  if (error || !data?.length) {
    return [];
  }

  const deduped = new Map<string, SectorPerformanceSnapshot>();
  for (const entry of mapRows(data as SectorPerformanceRow[])) {
    if (!deduped.has(entry.sectorSlug)) {
      deduped.set(entry.sectorSlug, entry);
    }
  }
  return Array.from(deduped.values());
}

export const getDurableSectorPerformanceSnapshots = cache(async (): Promise<SectorPerformanceSnapshot[]> => {
  try {
    if (isHostedDbRuntime()) {
      return readHostedSectorPerformanceSnapshots();
    }

    return readLocalSectorPerformanceSnapshots();
  } catch {
    return [];
  }
});
