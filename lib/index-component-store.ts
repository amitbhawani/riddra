import { readFile } from "fs/promises";
import path from "path";

import { cache } from "react";

import { isHostedDbRuntime } from "@/lib/durable-data-runtime";
import { hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import { createSupabaseReadClient } from "@/lib/supabase/admin";

export type DurableIndexComponentRow = {
  symbol: string;
  name: string;
  weight: number;
  dailyReturnPercent?: number | null;
  contribution?: number | null;
};

export type DurableIndexComponentSnapshot = {
  indexSlug: string;
  sourceLabel: string;
  sourceDate: string;
  referenceUrl?: string;
  indexSize?: number;
  rows: DurableIndexComponentRow[];
};

type IndexComponentStore = {
  entries: DurableIndexComponentSnapshot[];
};

type IndexComponentSnapshotRow = {
  index_slug: string;
  source_label: string;
  source_date: string;
  reference_url: string | null;
  payload_json: unknown;
};

const STORE_PATH = path.join(process.cwd(), "data", "index-component-weight-snapshots.json");

function isValidComponentRow(row: Partial<DurableIndexComponentRow>): row is DurableIndexComponentRow {
  return (
    typeof row?.symbol === "string" &&
    typeof row?.name === "string" &&
    typeof row?.weight === "number" &&
    (typeof row?.dailyReturnPercent === "number" ||
      typeof row?.dailyReturnPercent === "undefined" ||
      row?.dailyReturnPercent === null) &&
    (typeof row?.contribution === "number" || typeof row?.contribution === "undefined" || row?.contribution === null)
  );
}

function isValidSnapshot(entry: Partial<DurableIndexComponentSnapshot>): entry is DurableIndexComponentSnapshot {
  return (
    typeof entry?.indexSlug === "string" &&
    typeof entry?.sourceLabel === "string" &&
    typeof entry?.sourceDate === "string" &&
    (typeof entry?.referenceUrl === "string" || typeof entry?.referenceUrl === "undefined") &&
    (typeof entry?.indexSize === "number" || typeof entry?.indexSize === "undefined") &&
    Array.isArray(entry?.rows) &&
    entry.rows.every(isValidComponentRow)
  );
}

function mapPayload(
  payload: unknown,
): Pick<DurableIndexComponentSnapshot, "indexSize" | "rows"> {
  if (typeof payload !== "object" || payload === null) {
    return { rows: [] };
  }

  const record = payload as { indexSize?: unknown; rows?: unknown };
  const indexSize = typeof record.indexSize === "number" ? record.indexSize : undefined;
  const rows = Array.isArray(record.rows) ? record.rows.filter(isValidComponentRow) : [];

  return {
    indexSize,
    rows,
  };
}

async function readLocalIndexComponentSnapshots(): Promise<DurableIndexComponentSnapshot[]> {
  const content = await readFile(STORE_PATH, "utf8");
  const parsed = JSON.parse(content) as Partial<IndexComponentStore>;
  return Array.isArray(parsed.entries) ? parsed.entries.filter(isValidSnapshot) : [];
}

async function readHostedIndexComponentSnapshots(): Promise<DurableIndexComponentSnapshot[]> {
  if (!hasRuntimeSupabaseEnv()) {
    return [];
  }

  const supabase = createSupabaseReadClient();
  const { data, error } = await supabase
    .from("index_component_weight_snapshots")
    .select("index_slug, source_label, source_date, reference_url, payload_json")
    .order("source_date", { ascending: false });

  if (error || !data?.length) {
    return [];
  }

  const deduped = new Map<string, DurableIndexComponentSnapshot>();

  for (const row of data as IndexComponentSnapshotRow[]) {
    if (deduped.has(row.index_slug)) {
      continue;
    }

    const payload = mapPayload(row.payload_json);
    const snapshot: DurableIndexComponentSnapshot = {
      indexSlug: row.index_slug,
      sourceLabel: row.source_label,
      sourceDate: row.source_date,
      referenceUrl: row.reference_url ?? undefined,
      indexSize: payload.indexSize,
      rows: payload.rows,
    };

    if (isValidSnapshot(snapshot)) {
      deduped.set(snapshot.indexSlug, snapshot);
    }
  }

  return Array.from(deduped.values());
}

export const getDurableIndexComponentSnapshots = cache(async (): Promise<DurableIndexComponentSnapshot[]> => {
  try {
    if (isHostedDbRuntime()) {
      return readHostedIndexComponentSnapshots();
    }

    return readLocalIndexComponentSnapshots();
  } catch {
    return [];
  }
});
