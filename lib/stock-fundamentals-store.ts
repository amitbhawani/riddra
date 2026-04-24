import { readFile } from "fs/promises";
import path from "path";

import { cache } from "react";

import { isHostedDbRuntime } from "@/lib/durable-data-runtime";
import { sampleStocks } from "@/lib/mock-data";
import { hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import { createSupabaseReadClient } from "@/lib/supabase/admin";

export type DurableStockFundamentalsEntry = {
  slug: string;
  companyName: string;
  marketCap: string;
  peRatio: string;
  pbRatio: string;
  roe: string;
  roce: string;
  dividendYield: string | null;
  source: string;
  sourceDate: string;
  sourceUrl: string;
};

type StockFundamentalsStore = {
  entries: DurableStockFundamentalsEntry[];
};

type StockFundamentalRow = {
  stock_slug: string;
  company_name: string;
  market_cap: string;
  pe_ratio: string;
  pb_ratio: string;
  roe: string;
  roce: string;
  dividend_yield: string | null;
  source_label: string;
  source_date: string;
  reference_url: string;
};

const STORE_PATH = path.join(process.cwd(), "data", "stock-fundamentals.json");
const LOCAL_SEED_SOURCE_DATE = "2026-04-23";

const DEFAULT_SECTOR_FUNDAMENTALS: Array<{
  matcher: RegExp;
  peRatio: string;
  pbRatio: string;
  roce: string;
  dividendYield: string | null;
}> = [
  { matcher: /bank|housing finance/i, peRatio: "15.80", pbRatio: "2.18", roce: "6.38%", dividendYield: "0.74%" },
  { matcher: /nbfc|financial services|insurance|capital markets/i, peRatio: "19.40", pbRatio: "3.12", roce: "14.80%", dividendYield: "0.62%" },
  { matcher: /it services|technology|internet/i, peRatio: "24.60", pbRatio: "6.10", roce: "26.40%", dividendYield: "1.10%" },
  { matcher: /auto|auto ancillary/i, peRatio: "28.40", pbRatio: "4.36", roce: "19.80%", dividendYield: "0.58%" },
  { matcher: /pharma|pharmaceutical/i, peRatio: "31.20", pbRatio: "5.20", roce: "22.60%", dividendYield: "0.78%" },
  { matcher: /power|energy|oil|gas|mining|metals/i, peRatio: "14.20", pbRatio: "1.84", roce: "15.40%", dividendYield: "2.10%" },
  { matcher: /consumer|staples|discretionary|electricals|retail/i, peRatio: "52.60", pbRatio: "11.20", roce: "27.40%", dividendYield: "1.28%" },
  { matcher: /capital goods|industrials|industrial|defen[sc]e|logistics|airlines/i, peRatio: "39.80", pbRatio: "8.10", roce: "21.90%", dividendYield: "0.46%" },
];

const DEFAULT_FUNDAMENTAL_FALLBACK = {
  peRatio: "22.40",
  pbRatio: "3.60",
  roce: "18.20%",
  dividendYield: "0.82%",
};

function isValidEntry(entry: Partial<DurableStockFundamentalsEntry>): entry is DurableStockFundamentalsEntry {
  return (
    typeof entry?.slug === "string" &&
    typeof entry?.companyName === "string" &&
    typeof entry?.marketCap === "string" &&
    typeof entry?.peRatio === "string" &&
    typeof entry?.pbRatio === "string" &&
    typeof entry?.roe === "string" &&
    typeof entry?.roce === "string" &&
    typeof entry?.source === "string" &&
    typeof entry?.sourceDate === "string" &&
    typeof entry?.sourceUrl === "string"
  );
}

function mapRows(rows: StockFundamentalRow[]): DurableStockFundamentalsEntry[] {
  return rows
    .map((row) => ({
      slug: row.stock_slug,
      companyName: row.company_name,
      marketCap: row.market_cap,
      peRatio: row.pe_ratio,
      pbRatio: row.pb_ratio,
      roe: row.roe,
      roce: row.roce,
      dividendYield: row.dividend_yield,
      source: row.source_label,
      sourceDate: row.source_date,
      sourceUrl: row.reference_url,
    }))
    .filter(isValidEntry);
}

function getSeedDefaultsForSector(sector: string) {
  return (
    DEFAULT_SECTOR_FUNDAMENTALS.find((entry) => entry.matcher.test(sector)) ??
    DEFAULT_FUNDAMENTAL_FALLBACK
  );
}

function readStockStatValue(
  stats: Array<{ label: string; value: string }>,
  label: string,
) {
  return stats.find((entry) => entry.label === label)?.value ?? null;
}

function buildLocalSeedEntries() {
  return sampleStocks
    .map((stock) => {
      const sectorDefaults = getSeedDefaultsForSector(stock.sector);
      const marketCap = readStockStatValue(stock.stats, "Market Cap");
      const roe = readStockStatValue(stock.stats, "ROE");

      if (!marketCap || !roe) {
        return null;
      }

      return {
        slug: stock.slug,
        companyName: stock.name,
        marketCap,
        peRatio: sectorDefaults.peRatio,
        pbRatio: sectorDefaults.pbRatio,
        roe,
        roce: sectorDefaults.roce,
        dividendYield: sectorDefaults.dividendYield,
        source: "Local stock coverage seed",
        sourceDate: LOCAL_SEED_SOURCE_DATE,
        sourceUrl: `/stocks/${stock.slug}`,
      } satisfies DurableStockFundamentalsEntry;
    })
    .filter((entry): entry is DurableStockFundamentalsEntry => Boolean(entry));
}

async function readLocalStockFundamentalsEntries(): Promise<DurableStockFundamentalsEntry[]> {
  const content = await readFile(STORE_PATH, "utf8");
  const parsed = JSON.parse(content) as Partial<StockFundamentalsStore>;
  const persisted = Array.isArray(parsed.entries) ? parsed.entries.filter(isValidEntry) : [];
  const merged = new Map<string, DurableStockFundamentalsEntry>();

  for (const entry of buildLocalSeedEntries()) {
    merged.set(entry.slug, entry);
  }

  for (const entry of persisted) {
    merged.set(entry.slug, entry);
  }

  return Array.from(merged.values());
}

async function readHostedStockFundamentalsEntries(): Promise<DurableStockFundamentalsEntry[]> {
  if (!hasRuntimeSupabaseEnv()) {
    return [];
  }

  const supabase = createSupabaseReadClient();
  const { data, error } = await supabase
    .from("stock_fundamental_snapshots")
    .select(
      "stock_slug, company_name, market_cap, pe_ratio, pb_ratio, roe, roce, dividend_yield, source_label, source_date, reference_url",
    )
    .order("source_date", { ascending: false });

  if (error || !data?.length) {
    return [];
  }

  const deduped = new Map<string, DurableStockFundamentalsEntry>();
  for (const entry of mapRows(data as StockFundamentalRow[])) {
    if (!deduped.has(entry.slug)) {
      deduped.set(entry.slug, entry);
    }
  }
  return Array.from(deduped.values());
}

export const getDurableStockFundamentalsEntries = cache(async (): Promise<DurableStockFundamentalsEntry[]> => {
  try {
    if (isHostedDbRuntime()) {
      return readHostedStockFundamentalsEntries();
    }

    return readLocalStockFundamentalsEntries();
  } catch {
    return [];
  }
});
