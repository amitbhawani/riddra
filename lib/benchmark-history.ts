import { getDurableBenchmarkHistoryEntries, type BenchmarkHistoryEntry } from "@/lib/benchmark-history-store";
import { formatProductPercent } from "@/lib/product-page-design";

export const AWAITING_BENCHMARK_HISTORY = "Awaiting benchmark history";

export type BenchmarkReturnKey = "1D" | "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y";

export type BenchmarkReturnMap = Record<BenchmarkReturnKey, number | null>;

const BENCHMARK_LABELS: Record<string, string> = {
  nifty50: "Nifty 50",
  nifty_auto: "Nifty Auto",
  nifty_it: "Nifty IT",
  nifty_bank: "Nifty Bank",
  banknifty: "Bank Nifty",
  sensex: "Sensex",
  finnifty: "Fin Nifty",
  nifty100: "Nifty 100",
  niftymidcap150: "Nifty Midcap 150",
};

const BENCHMARK_DAY_WINDOWS: Record<Exclude<BenchmarkReturnKey, "1D">, number> = {
  "1M": 22,
  "3M": 66,
  "6M": 132,
  "1Y": 252,
  "3Y": 756,
  "5Y": 1260,
};

const benchmarkHistoryCache = new Map<string, Promise<BenchmarkHistoryEntry[]>>();

const BENCHMARK_SLUG_ALIASES: Record<string, string> = {
  nifty50: "nifty50",
  "nifty 50": "nifty50",
  "nifty 50 tri": "nifty50",
  "nifty50 tri": "nifty50",
  nifty_auto: "nifty_auto",
  niftyauto: "nifty_auto",
  "nifty auto": "nifty_auto",
  "nifty auto tri": "nifty_auto",
  nifty_it: "nifty_it",
  niftyit: "nifty_it",
  "nifty it": "nifty_it",
  "nifty it tri": "nifty_it",
  nifty_bank: "nifty_bank",
  niftybank: "nifty_bank",
  "nifty bank sector": "nifty_bank",
  "nifty bank sector tri": "nifty_bank",
  sensex: "sensex",
  "s&p bse sensex": "sensex",
  "s&p bse sensex tri": "sensex",
  "bse sensex": "sensex",
  banknifty: "banknifty",
  "bank nifty": "banknifty",
  "nifty bank": "banknifty",
  "nifty bank tri": "banknifty",
  finnifty: "finnifty",
  "fin nifty": "finnifty",
  "nifty financial services": "finnifty",
  "nifty financial services tri": "finnifty",
  nifty100: "nifty100",
  "nifty 100": "nifty100",
  "nifty 100 tri": "nifty100",
  niftymidcap150: "niftymidcap150",
  "nifty midcap 150": "niftymidcap150",
  "nifty midcap 150 tri": "niftymidcap150",
};

function normalizeBenchmarkSlug(value: string) {
  const normalized = value.trim().toLowerCase();
  return BENCHMARK_SLUG_ALIASES[normalized] ?? normalized.replace(/[^a-z0-9]+/g, "");
}

export function formatBenchmarkLabel(indexSlugOrLabel: string) {
  const normalized = normalizeBenchmarkSlug(indexSlugOrLabel);

  if (!normalized) {
    return "";
  }

  return (
    BENCHMARK_LABELS[normalized] ??
    normalized
      .split("_")
      .join(" ")
      .replace(/([a-z])(\d)/g, "$1 $2")
      .replace(/\b\w/g, (value) => value.toUpperCase())
  );
}

async function loadBenchmarkHistory(indexSlug: string) {
  const entries = await getDurableBenchmarkHistoryEntries();
  return entries.filter((entry) => entry.indexSlug === indexSlug);
}

export async function getBenchmarkHistory(indexSlugOrLabel: string): Promise<BenchmarkHistoryEntry[]> {
  const indexSlug = normalizeBenchmarkSlug(indexSlugOrLabel);

  if (!indexSlug) {
    return [];
  }

  const cached = benchmarkHistoryCache.get(indexSlug);

  if (cached) {
    return cached;
  }

  const promise = loadBenchmarkHistory(indexSlug);
  benchmarkHistoryCache.set(indexSlug, promise);
  return promise;
}

function computeReturnFromOffset(rows: BenchmarkHistoryEntry[], sessions: number) {
  if (rows.length <= sessions) {
    return null;
  }

  const current = rows[rows.length - 1]?.close;
  const previous = rows[rows.length - 1 - sessions]?.close;

  if (
    typeof current !== "number" ||
    !Number.isFinite(current) ||
    typeof previous !== "number" ||
    !Number.isFinite(previous) ||
    previous === 0
  ) {
    return null;
  }

  return ((current / previous) - 1) * 100;
}

export async function getBenchmarkReturns(indexSlugOrLabel: string): Promise<BenchmarkReturnMap> {
  const rows = await getBenchmarkHistory(indexSlugOrLabel);

  return {
    "1D": computeReturnFromOffset(rows, 1),
    "1M": computeReturnFromOffset(rows, BENCHMARK_DAY_WINDOWS["1M"]),
    "3M": computeReturnFromOffset(rows, BENCHMARK_DAY_WINDOWS["3M"]),
    "6M": computeReturnFromOffset(rows, BENCHMARK_DAY_WINDOWS["6M"]),
    "1Y": computeReturnFromOffset(rows, BENCHMARK_DAY_WINDOWS["1Y"]),
    "3Y": computeReturnFromOffset(rows, BENCHMARK_DAY_WINDOWS["3Y"]),
    "5Y": computeReturnFromOffset(rows, BENCHMARK_DAY_WINDOWS["5Y"]),
  };
}

export async function getFormattedBenchmarkReturns(indexSlugOrLabel: string) {
  const returns = await getBenchmarkReturns(indexSlugOrLabel);

  return {
    "1D": formatProductPercent(returns["1D"], 2, AWAITING_BENCHMARK_HISTORY),
    "1M": formatProductPercent(returns["1M"], 2, AWAITING_BENCHMARK_HISTORY),
    "3M": formatProductPercent(returns["3M"], 2, AWAITING_BENCHMARK_HISTORY),
    "6M": formatProductPercent(returns["6M"], 2, AWAITING_BENCHMARK_HISTORY),
    "1Y": formatProductPercent(returns["1Y"], 2, AWAITING_BENCHMARK_HISTORY),
    "3Y": formatProductPercent(returns["3Y"], 2, AWAITING_BENCHMARK_HISTORY),
    "5Y": formatProductPercent(returns["5Y"], 2, AWAITING_BENCHMARK_HISTORY),
  };
}

export async function getBenchmarkLatestClose(indexSlugOrLabel: string) {
  const rows = await getBenchmarkHistory(indexSlugOrLabel);
  return rows[rows.length - 1]?.close ?? null;
}

export async function getBenchmarkLatestDate(indexSlugOrLabel: string) {
  const rows = await getBenchmarkHistory(indexSlugOrLabel);
  return rows[rows.length - 1]?.date ?? null;
}
