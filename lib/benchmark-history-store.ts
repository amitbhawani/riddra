import { readFile } from "fs/promises";
import path from "path";

import { cache } from "react";

import { isHostedDbRuntime } from "@/lib/durable-data-runtime";
import { hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import { createSupabaseReadClient } from "@/lib/supabase/admin";

export type BenchmarkHistoryEntry = {
  indexSlug: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

type BenchmarkHistoryStore = {
  entries: BenchmarkHistoryEntry[];
};

type BenchmarkHistoryRow = {
  index_slug: string;
  date: string;
  open: number | string;
  high: number | string;
  low: number | string;
  close: number | string;
  volume: number | string | null;
};

const STORE_PATH = path.join(process.cwd(), "data", "benchmark-ohlcv-history.json");

function mapSupabaseRows(rows: BenchmarkHistoryRow[]): BenchmarkHistoryEntry[] {
  return rows
    .map((row) => ({
      indexSlug: row.index_slug,
      date: row.date,
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: row.volume === null ? null : Number(row.volume),
    }))
    .filter(
      (row) =>
        row.indexSlug &&
        row.date &&
        Number.isFinite(row.open) &&
        Number.isFinite(row.high) &&
        Number.isFinite(row.low) &&
        Number.isFinite(row.close) &&
        (row.volume === null || Number.isFinite(row.volume)),
    );
}

async function readLocalBenchmarkHistoryEntries(): Promise<BenchmarkHistoryEntry[]> {
  const content = await readFile(STORE_PATH, "utf8");
  const parsed = JSON.parse(content) as Partial<BenchmarkHistoryStore>;

  return Array.isArray(parsed.entries)
    ? parsed.entries.filter(
        (entry): entry is BenchmarkHistoryEntry =>
          typeof entry?.indexSlug === "string" &&
          typeof entry?.date === "string" &&
          typeof entry?.open === "number" &&
          typeof entry?.high === "number" &&
          typeof entry?.low === "number" &&
          typeof entry?.close === "number" &&
          (typeof entry?.volume === "number" || entry?.volume === null),
      )
    : [];
}

async function readHostedBenchmarkHistoryEntries(): Promise<BenchmarkHistoryEntry[]> {
  if (!hasRuntimeSupabaseEnv()) {
    return [];
  }

  const supabase = createSupabaseReadClient();
  const { data, error } = await supabase
    .from("benchmark_ohlcv_history")
    .select("index_slug, date, open, high, low, close, volume")
    .order("date", { ascending: true });

  if (error || !data?.length) {
    return [];
  }

  return mapSupabaseRows(data as BenchmarkHistoryRow[]);
}

export const getDurableBenchmarkHistoryEntries = cache(async (): Promise<BenchmarkHistoryEntry[]> => {
  try {
    if (isHostedDbRuntime()) {
      return readHostedBenchmarkHistoryEntries();
    }

    return readLocalBenchmarkHistoryEntries();
  } catch {
    return [];
  }
});
