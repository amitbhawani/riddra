import { readFile } from "fs/promises";
import path from "path";

import { cache } from "react";

import { isHostedDbRuntime } from "@/lib/durable-data-runtime";
import { hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import { createSupabaseReadClient } from "@/lib/supabase/admin";

export type DurableStockShareholdingEntry = {
  slug: string;
  companyName: string;
  promoterPercent: string;
  fiiPercent: string;
  diiPercent: string;
  publicPercent: string;
  source: string;
  sourceDate: string;
  sourceUrl: string;
};

type StockShareholdingStore = {
  entries: DurableStockShareholdingEntry[];
};

type StockShareholdingRow = {
  stock_slug: string;
  company_name: string;
  promoter_percent: string;
  fii_percent: string;
  dii_percent: string;
  public_percent: string;
  source_label: string;
  source_date: string;
  reference_url: string;
};

const STORE_PATH = path.join(process.cwd(), "data", "stock-shareholding.json");

function isValidEntry(entry: Partial<DurableStockShareholdingEntry>): entry is DurableStockShareholdingEntry {
  return (
    typeof entry?.slug === "string" &&
    typeof entry?.companyName === "string" &&
    typeof entry?.promoterPercent === "string" &&
    typeof entry?.fiiPercent === "string" &&
    typeof entry?.diiPercent === "string" &&
    typeof entry?.publicPercent === "string" &&
    typeof entry?.source === "string" &&
    typeof entry?.sourceDate === "string" &&
    typeof entry?.sourceUrl === "string"
  );
}

function mapRows(rows: StockShareholdingRow[]): DurableStockShareholdingEntry[] {
  return rows
    .map((row) => ({
      slug: row.stock_slug,
      companyName: row.company_name,
      promoterPercent: row.promoter_percent,
      fiiPercent: row.fii_percent,
      diiPercent: row.dii_percent,
      publicPercent: row.public_percent,
      source: row.source_label,
      sourceDate: row.source_date,
      sourceUrl: row.reference_url,
    }))
    .filter(isValidEntry);
}

async function readLocalStockShareholdingEntries(): Promise<DurableStockShareholdingEntry[]> {
  const content = await readFile(STORE_PATH, "utf8");
  const parsed = JSON.parse(content) as Partial<StockShareholdingStore>;
  return Array.isArray(parsed.entries) ? parsed.entries.filter(isValidEntry) : [];
}

async function readHostedStockShareholdingEntries(): Promise<DurableStockShareholdingEntry[]> {
  if (!hasRuntimeSupabaseEnv()) {
    return [];
  }

  const supabase = createSupabaseReadClient();
  const { data, error } = await supabase
    .from("stock_shareholding_snapshots")
    .select(
      "stock_slug, company_name, promoter_percent, fii_percent, dii_percent, public_percent, source_label, source_date, reference_url",
    )
    .order("created_at", { ascending: false });

  if (error || !data?.length) {
    return [];
  }

  const deduped = new Map<string, DurableStockShareholdingEntry>();
  for (const entry of mapRows(data as StockShareholdingRow[])) {
    if (!deduped.has(entry.slug)) {
      deduped.set(entry.slug, entry);
    }
  }
  return Array.from(deduped.values());
}

export const getDurableStockShareholdingEntries = cache(async (): Promise<DurableStockShareholdingEntry[]> => {
  try {
    if (isHostedDbRuntime()) {
      return readHostedStockShareholdingEntries();
    }

    return readLocalStockShareholdingEntries();
  } catch {
    return [];
  }
});
