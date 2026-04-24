import { readFile } from "fs/promises";
import path from "path";

import { cache } from "react";

import { isHostedDbRuntime } from "@/lib/durable-data-runtime";
import { hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import { createSupabaseReadClient } from "@/lib/supabase/admin";

export type DurableFundFactsheetEntry = {
  slug: string;
  fundName: string;
  amcName: string;
  benchmarkLabel?: string;
  benchmarkIndexSlug?: string;
  aum: string;
  expenseRatio: string;
  fundManagerName: string;
  source: string;
  sourceDate: string;
  referenceUrl: string;
  documentLabel: string;
};

type FundFactsheetStore = {
  entries: DurableFundFactsheetEntry[];
};

type FundFactsheetRow = {
  fund_slug: string;
  fund_name: string;
  amc_name: string;
  benchmark_label: string | null;
  benchmark_index_slug: string | null;
  aum: string;
  expense_ratio: string;
  fund_manager_name: string;
  source_label: string;
  source_date: string;
  reference_url: string | null;
  document_label: string;
};

const STORE_PATH = path.join(process.cwd(), "data", "fund-factsheets.json");

function isValidEntry(entry: Partial<DurableFundFactsheetEntry>): entry is DurableFundFactsheetEntry {
  return (
    typeof entry?.slug === "string" &&
    typeof entry?.fundName === "string" &&
    typeof entry?.amcName === "string" &&
    (typeof entry?.benchmarkLabel === "string" || typeof entry?.benchmarkLabel === "undefined") &&
    (typeof entry?.benchmarkIndexSlug === "string" || typeof entry?.benchmarkIndexSlug === "undefined") &&
    typeof entry?.aum === "string" &&
    typeof entry?.expenseRatio === "string" &&
    typeof entry?.fundManagerName === "string" &&
    typeof entry?.source === "string" &&
    typeof entry?.sourceDate === "string" &&
    typeof entry?.referenceUrl === "string" &&
    typeof entry?.documentLabel === "string"
  );
}

function mapFactsheetRows(rows: FundFactsheetRow[]): DurableFundFactsheetEntry[] {
  return rows
    .map((row) => ({
      slug: row.fund_slug,
      fundName: row.fund_name,
      amcName: row.amc_name,
      benchmarkLabel: row.benchmark_label ?? undefined,
      benchmarkIndexSlug: row.benchmark_index_slug ?? undefined,
      aum: row.aum,
      expenseRatio: row.expense_ratio,
      fundManagerName: row.fund_manager_name,
      source: row.source_label,
      sourceDate: row.source_date,
      referenceUrl: row.reference_url ?? "",
      documentLabel: row.document_label,
    }))
    .filter(isValidEntry);
}

async function readLocalFundFactsheetEntries(): Promise<DurableFundFactsheetEntry[]> {
  const content = await readFile(STORE_PATH, "utf8");
  const parsed = JSON.parse(content) as Partial<FundFactsheetStore>;
  return Array.isArray(parsed.entries) ? parsed.entries.filter(isValidEntry) : [];
}

async function readHostedFundFactsheetEntries(): Promise<DurableFundFactsheetEntry[]> {
  if (!hasRuntimeSupabaseEnv()) {
    return [];
  }

  const supabase = createSupabaseReadClient();
  const { data, error } = await supabase
    .from("fund_factsheet_snapshots")
    .select(
      "fund_slug, fund_name, amc_name, benchmark_label, benchmark_index_slug, aum, expense_ratio, fund_manager_name, source_label, source_date, reference_url, document_label",
    )
    .order("source_date", { ascending: false });

  if (error || !data?.length) {
    return [];
  }

  const deduped = new Map<string, DurableFundFactsheetEntry>();
  for (const entry of mapFactsheetRows(data as FundFactsheetRow[])) {
    if (!deduped.has(entry.slug)) {
      deduped.set(entry.slug, entry);
    }
  }
  return Array.from(deduped.values());
}

export const getDurableFundFactsheetEntries = cache(async (): Promise<DurableFundFactsheetEntry[]> => {
  try {
    if (isHostedDbRuntime()) {
      return readHostedFundFactsheetEntries();
    }

    return readLocalFundFactsheetEntries();
  } catch {
    return [];
  }
});
