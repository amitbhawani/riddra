import { cache } from "react";
import { unstable_noStore as noStore } from "next/cache";

import type { User } from "@supabase/supabase-js";

import {
  DurableMarketDataReadError,
  getDurableFundNavSnapshot,
  getDurableFundNavSnapshots,
  getDurableStockQuoteSnapshot,
  getDurableStockQuoteSnapshots,
} from "@/lib/market-data-durable-store";
import { getDurableFundFactsheetEntries } from "@/lib/fund-factsheet-store";
import { getDurableFundHoldingSnapshots } from "@/lib/fund-holding-store";
import {
  getPublishableCmsRecordBySlug,
  getPublishableCmsRecords,
  type PublishableCmsRecord,
} from "@/lib/publishable-content";
import { hasRuntimeSupabaseAdminEnv, hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import {
  type FundSnapshot,
  type IpoSnapshot,
  type StockSnapshot,
} from "@/lib/mock-data";
import { normalizeBenchmarkSlug } from "@/lib/benchmark-labels";
import { getEquitySnapshotPresentation } from "@/lib/market-session";
import { getStockResearchArchiveItems } from "@/lib/research-archive-memory-store";
import { getDurableFundSectorAllocationSnapshots } from "@/lib/fund-sector-allocation-store";
import { getDurableStockShareholdingEntries } from "@/lib/stock-shareholding-store";
import { getDurableStockFundamentalsEntries } from "@/lib/stock-fundamentals-store";
import { getSourceEntryStore } from "@/lib/source-entry-store";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type AdminManagedRecord, getAdminManagedRecord } from "@/lib/admin-operator-store";
import {
  getPublishedAdminManagedStockFallbackRecords,
  getRedirectingIpoSlugSet,
} from "@/lib/ipo-lifecycle";

export type SubscriptionSummary = {
  planCode: string;
  status: string;
  periodEnd: string | null;
};

export type EntitlementSummary = {
  featureCode: string;
  accessLevel: string;
};

const CONTENT_READ_CACHE_TTL_MS = 30_000;

type TimedCacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const stockCatalogCache = new Map<string, TimedCacheEntry<StockSnapshot[]>>();
const stockDetailCache = new Map<string, TimedCacheEntry<StockSnapshot | null>>();
const ipoCatalogCache = new Map<string, TimedCacheEntry<IpoSnapshot[]>>();
const ipoDetailCache = new Map<string, TimedCacheEntry<IpoSnapshot | null>>();
const fundCatalogCache = new Map<string, TimedCacheEntry<FundSnapshot[]>>();
const fundDetailCache = new Map<string, TimedCacheEntry<FundSnapshot | null>>();

const SUPPORTED_MUTUAL_FUND_BENCHMARK_SLUGS = new Set([
  "nifty50",
  "nifty100",
  "niftymidcap150",
  "sensex",
  "banknifty",
  "finnifty",
  "nifty_auto",
]);

const EXPLICIT_MUTUAL_FUND_BENCHMARK_FALLBACKS: Record<string, string> = {
  "hdfc-mid-cap-opportunities": "niftymidcap150",
  "sbi-bluechip-fund": "nifty100",
};

const EXPLICIT_STOCK_SECTOR_INDEX_FALLBACKS: Record<string, string> = {
  "tata-motors": "nifty_auto",
};

function readTimedCache<T>(cache: Map<string, TimedCacheEntry<T>>, key: string) {
  const cached = cache.get(key);

  if (!cached) {
    return { hit: false as const, value: null };
  }

  if (cached.expiresAt <= Date.now()) {
    cache.delete(key);
    return { hit: false as const, value: null };
  }

  return { hit: true as const, value: cached.value };
}

function writeTimedCache<T>(cache: Map<string, TimedCacheEntry<T>>, key: string, value: T) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + CONTENT_READ_CACHE_TTL_MS,
  });
}

export function invalidatePublicContentCachesForAdminRecord(
  family: "stocks" | "mutual-funds" | "ipos",
  slug?: string | null,
) {
  const normalizedSlug = slug?.trim().toLowerCase() || null;

  if (family === "stocks") {
    stockCatalogCache.clear();
    if (normalizedSlug) {
      stockDetailCache.delete(normalizedSlug);
    }
    return;
  }

  if (family === "mutual-funds") {
    fundCatalogCache.clear();
    if (normalizedSlug) {
      fundDetailCache.delete(normalizedSlug);
    }
    return;
  }

  ipoCatalogCache.clear();
  if (normalizedSlug) {
    ipoDetailCache.delete(normalizedSlug);
  }
}

type SourceSnapshotPayload = {
  source?: string | null;
  ingestMode?: string | null;
  price?: number | string | null;
  priceDisplay?: string | null;
  changePercent?: number | string | null;
  changeDisplay?: string | null;
  nav?: number | string | null;
  navDisplay?: string | null;
  returns1Y?: number | string | null;
  returns1YDisplay?: string | null;
  lastUpdated?: string | null;
  readFailureDetail?: string | null;
};

function formatCurrencyInr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatSnapshotTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function isVerifiedSnapshot(payload: SourceSnapshotPayload | null | undefined) {
  if (!payload) {
    return false;
  }

  if (typeof payload.readFailureDetail === "string" && payload.readFailureDetail.trim().length > 0) {
    return false;
  }

  const numericSignals = [
    parseNumericSnapshotValue(payload.price),
    parseNumericSnapshotValue(payload.changePercent),
    parseNumericSnapshotValue(payload.nav),
    parseNumericSnapshotValue(payload.returns1Y),
  ];
  const displaySignals = [
    payload.priceDisplay,
    payload.changeDisplay,
    payload.navDisplay,
    payload.returns1YDisplay,
  ];

  return (
    numericSignals.some((value) => value !== null) ||
    displaySignals.some((value) => typeof value === "string" && value.trim().length > 0)
  );
}

function isManualSnapshot(payload: SourceSnapshotPayload | null | undefined) {
  if (!payload) {
    return false;
  }

  if (payload.ingestMode === "admin_source_entry" || payload.ingestMode === "manual_entry") {
    return true;
  }

  return typeof payload.source === "string"
    ? payload.source.toLowerCase().includes("source-entry") ||
        payload.source.toLowerCase().includes("manual")
    : false;
}

function formatSnapshotValue(
  numericValue: number | null,
  displayValue: string | null | undefined,
  formatter: (value: number) => string,
) {
  if (typeof displayValue === "string" && displayValue.trim().length > 0) {
    return displayValue;
  }

  if (numericValue === null || Number.isNaN(numericValue)) {
    return null;
  }

  return formatter(numericValue);
}

function parseNumericSnapshotValue(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.+-]/g, "");
    const parsed = Number(cleaned);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function mapDurableQuoteToSnapshotPayload(
  snapshot: Awaited<ReturnType<typeof getDurableStockQuoteSnapshot>>,
): SourceSnapshotPayload | null {
  if (!snapshot) {
    return null;
  }

  return {
    source: snapshot.source,
    ingestMode: snapshot.ingestMode,
    price: snapshot.price,
    changePercent: snapshot.changePercent,
    lastUpdated: snapshot.lastUpdated,
  };
}

function mapDurableFundNavToSnapshotPayload(
  snapshot: Awaited<ReturnType<typeof getDurableFundNavSnapshot>>,
): SourceSnapshotPayload | null {
  if (!snapshot) {
    return null;
  }

  return {
    source: snapshot.source,
    ingestMode: snapshot.ingestMode,
    nav: snapshot.nav,
    returns1Y: snapshot.returns1Y,
    lastUpdated: snapshot.lastUpdated,
  };
}

function mapDurableReadFailureToSnapshotPayload(
  assetLabel: "stock" | "fund",
  error: unknown,
): SourceSnapshotPayload {
  const detail =
    error instanceof Error ? error.message : `Unknown ${assetLabel} market-data read failure.`;

  return {
    source:
      assetLabel === "stock"
        ? "Durable stock quote read failed"
        : "Durable fund NAV read failed",
    lastUpdated: null,
    readFailureDetail: detail,
  };
}

async function createSupabaseContentReadClient() {
  if (hasRuntimeSupabaseAdminEnv()) {
    return createSupabaseAdminClient();
  }

  return createSupabaseServerClient();
}

function logPublicContentReadWarning(operation: string, error: unknown) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const detail = error instanceof Error ? error.message : String(error);
  console.warn(`[content] ${operation}: ${detail}`);
}

function isMissingColumnReadError(
  error: unknown,
  table: string,
  column: string,
) {
  const detail = error instanceof Error ? error.message : String(error);
  return (
    detail.includes(`column ${table}.${column} does not exist`) ||
    detail.includes(`Could not find the '${column}' column`)
  );
}

function readPublishableText(record: PublishableCmsRecord, ...keys: string[]) {
  const sources = [record.editorialPayload, record.sourcePayload, record.metadata];

  for (const key of keys) {
    for (const source of sources) {
      const value = source?.[key];

      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }

  return null;
}

function isPendingContentValue(value: string | null | undefined) {
  if (typeof value !== "string") {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  return (
    !normalized ||
    normalized === "pending" ||
    normalized.startsWith("awaiting verified") ||
    normalized.startsWith("awaiting provider-backed") ||
    normalized.startsWith("provider-backed") ||
    normalized.startsWith("fund house unavailable") ||
    normalized.startsWith("source unavailable") ||
    normalized.startsWith("unavailable")
  );
}

function pickRealContentValue(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (!isPendingContentValue(value)) {
      return value!.trim();
    }
  }

  return null;
}

function resolveStockSectorIndexSlug({
  stockSlug,
  tableSectorIndexSlug,
  cmsSectorIndexSlug,
}: {
  stockSlug: string;
  tableSectorIndexSlug?: string | null;
  cmsSectorIndexSlug?: string | null;
}) {
  const candidates = [
    { source: "instruments.sector_index_slug", value: tableSectorIndexSlug },
    { source: "CMS sector_index_slug", value: cmsSectorIndexSlug },
  ];

  for (const candidate of candidates) {
    if (!candidate.value) {
      continue;
    }

    const normalized = normalizeBenchmarkSlug(candidate.value);

    if (normalized && normalized !== "nse_equities") {
      return {
        sectorIndexSlug: normalized,
        mappingSource: candidate.source,
        usedFallback: false,
      };
    }
  }

  const explicitFallback = EXPLICIT_STOCK_SECTOR_INDEX_FALLBACKS[stockSlug];

  if (explicitFallback) {
    return {
      sectorIndexSlug: explicitFallback,
      mappingSource: "Explicit stock sector fallback",
      usedFallback: true,
    };
  }

  return {
    sectorIndexSlug: null,
    mappingSource: "Unmapped stock sector benchmark",
    usedFallback: false,
  };
}

function resolveMutualFundBenchmarkMapping({
  fundSlug,
  benchmarkLabel,
  tableBenchmarkIndexSlug,
  cmsBenchmarkIndexSlug,
  factsheetBenchmarkIndexSlug,
}: {
  fundSlug: string;
  benchmarkLabel?: string | null;
  tableBenchmarkIndexSlug?: string | null;
  cmsBenchmarkIndexSlug?: string | null;
  factsheetBenchmarkIndexSlug?: string | null;
}) {
  const candidates = [
    { source: "mutual_funds.benchmark_index_slug", value: tableBenchmarkIndexSlug },
    { source: "CMS benchmark_index_slug", value: cmsBenchmarkIndexSlug },
    { source: "Fund factsheet benchmark_index_slug", value: factsheetBenchmarkIndexSlug },
    { source: "Mutual-fund benchmark label", value: benchmarkLabel },
  ];

  for (const candidate of candidates) {
    if (!candidate.value) {
      continue;
    }

    const normalized = normalizeBenchmarkSlug(candidate.value);

    if (SUPPORTED_MUTUAL_FUND_BENCHMARK_SLUGS.has(normalized)) {
      return {
        benchmarkIndexSlug: normalized,
        mappingSource: candidate.source,
        usedFallback: false,
      };
    }
  }

  const explicitFallback = EXPLICIT_MUTUAL_FUND_BENCHMARK_FALLBACKS[fundSlug];

  if (explicitFallback) {
    return {
      benchmarkIndexSlug: explicitFallback,
      mappingSource: "Explicit mutual-fund benchmark fallback",
      usedFallback: true,
    };
  }

  return {
    benchmarkIndexSlug: null,
    mappingSource: "Unmapped benchmark",
    usedFallback: false,
  };
}

function buildPublishableStockRow(record: PublishableCmsRecord) {
  return {
    slug: record.canonicalSlug,
    name: record.title,
    symbol: record.canonicalSymbol,
    sector: readPublishableText(record, "sector", "category"),
    sector_index_slug: readPublishableText(record, "sector_index_slug"),
    hero_summary:
      readPublishableText(record, "hero_summary", "summary") ??
      "This stock route is published in the CMS, but its backing stock catalog row is currently unavailable.",
    seo_description:
      readPublishableText(record, "seo_description", "description", "summary") ??
      "Published stock record available through CMS truth while the backing source row is unavailable.",
  };
}

function buildPublishableFundRow(record: PublishableCmsRecord) {
  return {
    slug: record.canonicalSlug,
    fund_name: record.title,
    category: readPublishableText(record, "category", "fund_category") ?? "Unclassified",
    amc_name: readPublishableText(record, "amc_name", "amc"),
    benchmark: readPublishableText(record, "benchmark"),
    benchmark_index_slug: readPublishableText(record, "benchmark_index_slug"),
    hero_summary:
      readPublishableText(record, "hero_summary", "summary") ??
      "This mutual-fund route is published in the CMS, but its backing fund catalog row is currently unavailable.",
    seo_description:
      readPublishableText(record, "seo_description", "description", "summary") ??
      "Published mutual-fund record available through CMS truth while the backing source row is unavailable.",
  };
}

function readAdminManagedTextField(
  value: Record<string, string> | undefined,
  key: string,
) {
  const resolved = String(value?.[key] ?? "").trim();
  return resolved || null;
}

async function getPublishedAdminManagedContentOverride(
  family: "stocks" | "mutual-funds",
  slug: string,
) {
  const record = await getAdminManagedRecord(family, slug, null);
  if (!record || record.status !== "published") {
    return null;
  }

  return {
    summary:
      readAdminManagedTextField(record.sections.frontend_fields?.values, "summary") ??
      readAdminManagedTextField(record.sections.frontend_fields?.values, "manualNotes"),
    seoDescription: readAdminManagedTextField(record.sections.seo?.values, "metaDescription"),
    benchmarkMapping: record.benchmarkMapping ?? null,
  };
}

function parseMultilineValues(value: string | null | undefined) {
  return String(value ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLabelValuePairs(value: string | null | undefined) {
  return parseMultilineValues(value)
    .map((line) => line.split("|").map((item) => item.trim()))
    .filter((parts) => parts[0] && parts[1])
    .map(([label, pairValue]) => ({ label, value: pairValue }));
}

function parseLabelValueNotePairs(value: string | null | undefined) {
  return parseMultilineValues(value)
    .map((line) => line.split("|").map((item) => item.trim()))
    .filter((parts) => parts[0] && parts[1])
    .map(([label, pairValue, note = ""]) => ({ label, value: pairValue, note }));
}

function parseNewsItems(value: string | null | undefined) {
  return parseMultilineValues(value)
    .map((line) => line.split("|").map((item) => item.trim()))
    .filter((parts) => parts[0])
    .map(([title, source = "Manual editorial", type = "News watch"]) => ({
      title,
      source,
      type,
    }));
}

function parseFaqItems(value: string | null | undefined) {
  return parseMultilineValues(value)
    .map((line) => line.split("|").map((item) => item.trim()))
    .filter((parts) => parts[0] && parts[1])
    .map(([question, answer]) => ({ question, answer }));
}

function readAdminSectionText(
  record: AdminManagedRecord,
  sectionKey: string,
  fieldKey: string,
) {
  return readAdminManagedTextField(record.sections[sectionKey]?.values, fieldKey);
}

function buildAdminManagedStockFallback(record: AdminManagedRecord): StockSnapshot {
  const identityCompanyName =
    readAdminSectionText(record, "identity", "companyName") ?? record.title;
  const sector =
    readAdminSectionText(record, "identity", "sector") ?? "Unclassified";
  const sectorIndexSlug =
    readAdminSectionText(record, "identity", "sectorIndexSlug") ??
    record.benchmarkMapping ??
    null;
  const frontendSummary = readAdminSectionText(record, "frontend_fields", "summary");
  const frontendManualNotes = readAdminSectionText(record, "frontend_fields", "manualNotes");
  const baseSnapshot = mapStockRow({
    slug: record.slug,
    name: identityCompanyName,
    symbol: readAdminSectionText(record, "identity", "symbol") ?? record.symbol,
    sector,
    sector_index_slug: sectorIndexSlug,
    hero_summary: frontendSummary,
    seo_description: frontendManualNotes,
  });
  const quickStats = parseLabelValuePairs(
    readAdminSectionText(record, "frontend_fields", "quickStatsText"),
  );
  const fundamentals = parseLabelValueNotePairs(
    readAdminSectionText(record, "frontend_fields", "fundamentalsText"),
  );
  const shareholding = parseLabelValueNotePairs(
    readAdminSectionText(record, "frontend_fields", "shareholdingText"),
  );
  const newsItems = parseNewsItems(
    readAdminSectionText(record, "frontend_fields", "newsItemsText"),
  );
  const faqItems = parseFaqItems(readAdminSectionText(record, "frontend_fields", "faqText"));

  return {
    ...baseSnapshot,
    name: identityCompanyName,
    symbol:
      readAdminSectionText(record, "identity", "symbol") ??
      record.symbol ??
      baseSnapshot.symbol,
    sector,
    sectorIndexSlug,
    primarySourceCode:
      readAdminSectionText(record, "data_sources", "primarySourceCode") ??
      record.sourceLabel ??
      baseSnapshot.primarySourceCode,
    summary: frontendSummary ?? frontendManualNotes ?? baseSnapshot.summary,
    thesis:
      readAdminSectionText(record, "frontend_fields", "thesis") ?? baseSnapshot.thesis,
    momentumLabel:
      readAdminSectionText(record, "frontend_fields", "momentumLabel") ??
      baseSnapshot.momentumLabel,
    keyPoints: (() => {
      const values = parseMultilineValues(
        readAdminSectionText(record, "frontend_fields", "keyPointsText"),
      );
      return values.length ? values : baseSnapshot.keyPoints;
    })(),
    stats: quickStats.length ? quickStats : baseSnapshot.stats,
    fundamentals: fundamentals.length ? fundamentals : baseSnapshot.fundamentals,
    shareholding: shareholding.length ? shareholding : baseSnapshot.shareholding,
    newsItems: newsItems.length ? newsItems : baseSnapshot.newsItems,
    faqItems: faqItems.length ? faqItems : baseSnapshot.faqItems,
  };
}

async function getPublishedAdminManagedStockFallback(
  slug: string,
): Promise<StockSnapshot | null> {
  const record = await getAdminManagedRecord("stocks", slug, null);

  if (!record || record.status !== "published") {
    return null;
  }

  return buildAdminManagedStockFallback(record);
}

type StockCatalogSourceRow = {
  slug: string;
  name: string;
  symbol: string | null;
  sector_index_slug?: string | null;
  companies: Array<{ sector: string | null }> | null;
  stock_pages: Array<{ hero_summary: string | null; seo_description: string | null }> | null;
};

type StockDetailSourceRow = {
  slug: string;
  name: string;
  symbol: string | null;
  sector_index_slug?: string | null;
  companies: Array<{ sector: string | null }> | null;
  stock_pages: Array<{ hero_summary: string | null; seo_description: string | null }> | null;
};

type FundCatalogSourceRow = {
  slug: string;
  fund_name: string;
  category: string;
  amc_name: string | null;
  benchmark: string | null;
  benchmark_index_slug?: string | null;
  mutual_fund_pages: Array<{ hero_summary: string | null; seo_description: string | null }> | null;
};

async function readStockCatalogSourceRows(
  publishableSlugs: string[],
): Promise<StockCatalogSourceRow[]> {
  const supabase = await createSupabaseContentReadClient();

  try {
    const { data, error } = await supabase
      .from("instruments")
      .select(
        `
          slug,
          name,
          symbol,
          sector_index_slug,
          companies (sector),
          stock_pages (hero_summary, seo_description)
        `,
      )
      .eq("instrument_type", "stock")
      .in("slug", publishableSlugs);

    if (error) {
      throw new Error(`Public stock catalog read failed: ${error.message}`);
    }

    return data ?? [];
  } catch (error) {
    if (!isMissingColumnReadError(error, "instruments", "sector_index_slug")) {
      throw error;
    }

    const { data, error: fallbackError } = await supabase
      .from("instruments")
      .select(
        `
          slug,
          name,
          symbol,
          companies (sector),
          stock_pages (hero_summary, seo_description)
        `,
      )
      .eq("instrument_type", "stock")
      .in("slug", publishableSlugs);

    if (fallbackError) {
      throw new Error(`Public stock catalog read failed: ${fallbackError.message}`);
    }

    logPublicContentReadWarning(
      "stock sector_index_slug read failed; keeping source rows with CMS mapping fallback",
      error,
    );

    return (data ?? []).map((row) => ({
      ...row,
      sector_index_slug: null,
    }));
  }
}

async function readStockDetailSourceRow(slug: string): Promise<StockDetailSourceRow | null> {
  const supabase = await createSupabaseContentReadClient();

  try {
    const result = await supabase
      .from("instruments")
      .select(
        `
          slug,
          name,
          symbol,
          sector_index_slug,
          companies (sector),
          stock_pages (hero_summary, seo_description)
        `,
      )
      .eq("instrument_type", "stock")
      .eq("slug", slug)
      .maybeSingle();

    if (result.error) {
      throw new Error(`Public stock detail read failed for "${slug}": ${result.error.message}`);
    }

    return result.data;
  } catch (error) {
    if (!isMissingColumnReadError(error, "instruments", "sector_index_slug")) {
      throw error;
    }

    const result = await supabase
      .from("instruments")
      .select(
        `
          slug,
          name,
          symbol,
          companies (sector),
          stock_pages (hero_summary, seo_description)
        `,
      )
      .eq("instrument_type", "stock")
      .eq("slug", slug)
      .maybeSingle();

    if (result.error) {
      throw new Error(`Public stock detail read failed for "${slug}": ${result.error.message}`);
    }

    logPublicContentReadWarning(
      `stock sector_index_slug read failed for ${slug}; keeping source row with CMS mapping fallback`,
      error,
    );

    return result.data
      ? {
          ...result.data,
          sector_index_slug: null,
        }
      : null;
  }
}

async function readFundCatalogSourceRows(
  publishableSlugs: string[],
): Promise<FundCatalogSourceRow[]> {
  const supabase = await createSupabaseContentReadClient();

  try {
    const { data, error } = await supabase
      .from("mutual_funds")
      .select(
        `
          slug,
          fund_name,
          category,
          amc_name,
          benchmark,
          benchmark_index_slug,
          mutual_fund_pages (hero_summary, seo_description)
        `,
      )
      .in("slug", publishableSlugs);

    if (error) {
      throw new Error(`Public fund catalog read failed: ${error.message}`);
    }

    return data ?? [];
  } catch (error) {
    if (!isMissingColumnReadError(error, "mutual_funds", "benchmark_index_slug")) {
      throw error;
    }

    const { data, error: fallbackError } = await supabase
      .from("mutual_funds")
      .select(
        `
          slug,
          fund_name,
          category,
          amc_name,
          benchmark,
          mutual_fund_pages (hero_summary, seo_description)
        `,
      )
      .in("slug", publishableSlugs);

    if (fallbackError) {
      throw new Error(`Public fund catalog read failed: ${fallbackError.message}`);
    }

    logPublicContentReadWarning(
      "fund benchmark_index_slug read failed; keeping source rows with CMS and factsheet benchmark fallback",
      error,
    );

    return (data ?? []).map((row) => ({
      ...row,
      benchmark_index_slug: null,
    }));
  }
}

function buildPublishableIpoRow(record: PublishableCmsRecord) {
  return {
    slug: record.canonicalSlug,
    company_name: record.title,
    status: readPublishableText(record, "status", "ipo_status") ?? "Published",
    open_date: readPublishableText(record, "open_date"),
    listing_date: readPublishableText(record, "listing_date"),
    price_band: readPublishableText(record, "price_band"),
    hero_summary:
      readPublishableText(record, "hero_summary", "summary") ??
      "This IPO route is published in the CMS, but its backing issue row is currently unavailable.",
    seo_description:
      readPublishableText(record, "seo_description", "description", "summary") ??
      "Published IPO record available through CMS truth while the backing source row is unavailable.",
  };
}

function mapStockRow(row: {
  slug: string;
  name: string;
  symbol: string | null;
  sector: string | null;
  sector_index_slug?: string | null;
  hero_summary: string | null;
  seo_description: string | null;
}, liveSnapshot?: SourceSnapshotPayload | null): StockSnapshot {
  const verifiedSnapshot = isVerifiedSnapshot(liveSnapshot);
  const manualSnapshot = isManualSnapshot(liveSnapshot);
  const marketPresentation = getEquitySnapshotPresentation(verifiedSnapshot && !manualSnapshot);
  const livePrice = formatSnapshotValue(
    parseNumericSnapshotValue(liveSnapshot?.price),
    liveSnapshot?.priceDisplay,
    formatCurrencyInr,
  );
  const liveChange = formatSnapshotValue(
    parseNumericSnapshotValue(liveSnapshot?.changePercent),
    liveSnapshot?.changeDisplay,
    formatPercent,
  );
  const sectorMapping = resolveStockSectorIndexSlug({
    stockSlug: row.slug,
    tableSectorIndexSlug: row.sector_index_slug,
    cmsSectorIndexSlug: row.sector_index_slug,
  });

  return {
    slug: row.slug,
    name: row.name,
    symbol: row.symbol ?? row.slug.toUpperCase(),
    sector: row.sector ?? "Sector pending",
    sectorIndexSlug: sectorMapping.sectorIndexSlug,
    primarySourceCode: "nse_equities",
    price: verifiedSnapshot
      ? livePrice ?? "Quote data pending"
      : "Quote data pending",
    change: verifiedSnapshot
      ? liveChange ?? "Move data pending"
      : "Move data pending",
    thesis: verifiedSnapshot
      ? manualSnapshot
        ? "This stock route is reading a retained manual close. It stays useful for continuity while the automated quote lane catches up."
        : "This stock route is now reading a durable delayed quote. Financial depth and ratio coverage can still expand separately."
      : "This stock route is catalog-ready. Quote, range, and financial details will appear here once available.",
    summary:
      row.hero_summary ??
      row.seo_description ??
      (liveSnapshot?.readFailureDetail
        ? "This stock route found the real catalog record, but the durable quote read failed so the page is staying explicit about that backend problem."
        : verifiedSnapshot
        ? manualSnapshot
          ? "This stock route is live with a retained manual close while the automated quote lane is still being hardened."
          : "This stock route is live with a durable delayed quote from the retained market-data path."
        : "This stock route exists in the catalog. Additional market data will appear here once available."),
    momentumLabel:
      verifiedSnapshot && manualSnapshot
        ? "Manual retained close"
        : verifiedSnapshot
          ? "Delayed snapshot connected"
          : "Quote data pending",
    keyPoints: [
      verifiedSnapshot
        ? "This route is now reading retained market data instead of sample or seeded quote context."
        : "This route will show fresh market data here once available.",
      verifiedSnapshot
        ? manualSnapshot
          ? "The current quote is retained and stored, but it still carries a manual-source truth label."
          : "The quote lane is now connected through the durable delayed-snapshot path."
        : "If the latest quote is not ready yet, the page keeps the market view conservative instead of guessing.",
      "Range, ratio, and event blocks will become more useful as durable market and financial sources expand.",
    ],
    stats: [
      { label: "Market Cap", value: "Data pending" },
      { label: "52W Range", value: "Data pending" },
      { label: "ROE", value: "Data pending" },
      { label: "Debt / Equity", value: "Data pending" },
    ],
    fundamentals: [
      {
        label: "Sales growth",
        value: "Data pending",
        note: "Quarterly trend blocks will appear here once structured financial data is available.",
      },
      {
        label: "Profit growth",
        value: "Data pending",
        note: "Profit trend details will appear here once the financial dataset is connected.",
      },
    ],
    shareholding: [
      {
        label: "Promoters",
        value: "Data pending",
        note: "Ownership mix will appear here once shareholding data is available.",
      },
      {
        label: "Public",
        value: "Data pending",
        note: "Retail and institutional participation will appear here once the holdings layer is ready.",
      },
    ],
    newsItems: [
      {
        title: "Research watch activates once verified market and filing feeds are attached",
        source: "Pending evidence",
        type: "News watch",
      },
    ],
    faqItems: [
      {
        question: "Why does this page not show a live-looking quote yet?",
        answer:
          liveSnapshot?.readFailureDetail
            ? `The durable quote read failed for this stock route, so the page is staying explicit instead of pretending no quote exists. ${liveSnapshot.readFailureDetail}`
            : verifiedSnapshot
            ? manualSnapshot
              ? "This route is using a retained manual close. It is stored and visible while the automated quote lane catches up."
              : "This route is using a retained durable delayed snapshot from the live market-data path."
            : "This route keeps the market view conservative until quote data is available here.",
      },
    ],
    snapshotMeta: verifiedSnapshot
      ? manualSnapshot
        ? {
            mode: "manual_close",
            source: liveSnapshot?.source ?? "Manual retained close",
            lastUpdated:
              formatSnapshotTimestamp(liveSnapshot?.lastUpdated) ?? "Recent manual retained close",
            marketLabel: "Manual retained close",
            marketDetail:
              "This stock route is using a manually-entered or retained close. It is stored, but it is not the same as the regular delayed quote feed.",
          }
        : {
            mode: "delayed_snapshot",
            source: liveSnapshot?.source ?? "Retained delayed quote",
            lastUpdated:
              formatSnapshotTimestamp(liveSnapshot?.lastUpdated) ?? "Recent delayed snapshot",
            marketLabel: marketPresentation.marketLabel,
            marketDetail: marketPresentation.marketDetail,
          }
      : {
          mode: "fallback",
          source: liveSnapshot?.source ?? "Quote data pending",
          lastUpdated: liveSnapshot?.readFailureDetail ? "Quote read failed" : "Data update pending",
          marketLabel: liveSnapshot?.readFailureDetail ? "Quote read failed" : "Quote data pending",
          marketDetail: liveSnapshot?.readFailureDetail ??
            "Quote data will appear here once available.",
        },
  };
}

function upsertStockStat(
  stats: StockSnapshot["stats"],
  label: string,
  value: string | null | undefined,
) {
  if (!value || value.trim().length === 0) {
    return stats;
  }

  const nextStats = [...stats];
  const existingIndex = nextStats.findIndex((item) => item.label === label);

  if (existingIndex >= 0) {
    nextStats[existingIndex] = { label, value };
    return nextStats;
  }

  nextStats.push({ label, value });
  return nextStats;
}

async function applyDurableStockFundamentals(stocks: StockSnapshot[]): Promise<StockSnapshot[]> {
  const entries = await getDurableStockFundamentalsEntries();

  if (!entries.length) {
    return stocks;
  }

  const entryMap = new Map(entries.map((entry) => [entry.slug, entry]));

  return stocks.map((stock) => {
    const entry = entryMap.get(stock.slug);

    if (!entry) {
      return stock;
    }

    let nextStats = upsertStockStat(stock.stats, "Market Cap", entry.marketCap);
    nextStats = upsertStockStat(nextStats, "P/E", entry.peRatio);
    nextStats = upsertStockStat(nextStats, "P/B", entry.pbRatio);
    nextStats = upsertStockStat(nextStats, "ROE", entry.roe);
    nextStats = upsertStockStat(nextStats, "ROCE", entry.roce);

    if (entry.dividendYield) {
      nextStats = upsertStockStat(nextStats, "Dividend Yield", entry.dividendYield);
    }

    return {
      ...stock,
      stats: nextStats,
      fundamentalsMeta: {
        source: entry.source,
        sourceDate: entry.sourceDate,
        sourceUrl: entry.sourceUrl,
      },
    };
  });
}

async function applyDurableStockShareholding(stocks: StockSnapshot[]): Promise<StockSnapshot[]> {
  const entries = await getDurableStockShareholdingEntries();

  if (!entries.length) {
    return stocks;
  }

  const entryMap = new Map(entries.map((entry) => [entry.slug, entry]));

  return stocks.map((stock) => {
    const entry = entryMap.get(stock.slug);

    if (!entry) {
      return stock;
    }

    return {
      ...stock,
      shareholding: [
        {
          label: "Promoters",
          value: entry.promoterPercent,
          note: `Latest routed shareholding snapshot dated ${entry.sourceDate}.`,
        },
        {
          label: "FIIs",
          value: entry.fiiPercent,
          note: `Latest routed shareholding snapshot dated ${entry.sourceDate}.`,
        },
        {
          label: "DIIs",
          value: entry.diiPercent,
          note: `Latest routed shareholding snapshot dated ${entry.sourceDate}.`,
        },
        {
          label: "Public",
          value: entry.publicPercent,
          note: `Latest routed shareholding snapshot dated ${entry.sourceDate}.`,
        },
      ],
      shareholdingMeta: {
        source: entry.source,
        sourceDate: entry.sourceDate,
        sourceUrl: entry.sourceUrl,
      },
    };
  });
}

async function applySourceEntryStockCloses(stocks: StockSnapshot[]): Promise<StockSnapshot[]> {
  const sourceStore = await getSourceEntryStore();

  if (!sourceStore.stockCloseEntries.length) {
    return stocks;
  }

  const closeMap = new Map(sourceStore.stockCloseEntries.map((entry) => [entry.slug, entry]));

  return stocks.map((stock) => {
    if (
      stock.snapshotMeta?.mode === "delayed_snapshot" ||
      stock.snapshotMeta?.mode === "manual_close" ||
      stock.snapshotMeta?.marketLabel === "Durable quote read failed"
    ) {
      return stock;
    }

    const sourceEntry = closeMap.get(stock.slug);

    if (!sourceEntry) {
      return stock;
    }

    return {
      ...stock,
      price: formatCurrencyInr(sourceEntry.price),
      change: formatPercent(sourceEntry.changePercent),
      momentumLabel: "Source-entry close loaded",
      snapshotMeta: {
        mode: "manual_close",
        source: sourceEntry.source,
        lastUpdated: sourceEntry.sourceDate,
        marketLabel: "Source-entry close loaded",
        marketDetail:
          "This route is using a source-entry delayed close from the admin console while the canonical quote snapshot feed is still being connected.",
      },
    };
  });
}

async function applySourceEntryFundNavs(funds: FundSnapshot[]): Promise<FundSnapshot[]> {
  const sourceStore = await getSourceEntryStore();

  if (!sourceStore.fundNavEntries.length) {
    return funds;
  }

  const navMap = new Map(sourceStore.fundNavEntries.map((entry) => [entry.slug, entry]));

  return funds.map((fund) => {
    if (
      fund.snapshotMeta?.mode === "delayed_snapshot" ||
      fund.snapshotMeta?.mode === "manual_nav" ||
      fund.snapshotMeta?.marketLabel === "Durable NAV read failed"
    ) {
      return fund;
    }

    const sourceEntry = navMap.get(fund.slug);

    if (!sourceEntry) {
      return fund;
    }

    return {
      ...fund,
      nav: formatCurrencyInr(sourceEntry.nav),
      returns1Y: formatPercent(sourceEntry.returns1Y),
      riskLabel: "Source-entry NAV loaded",
      snapshotMeta: {
        mode: "manual_nav",
        source: sourceEntry.source,
        lastUpdated: sourceEntry.sourceDate,
        marketLabel: "Source-entry NAV loaded",
        marketDetail:
          "This route is using a source-entry delayed NAV from the admin console while the canonical fund snapshot feed is still being connected.",
      },
    };
  });
}

async function applySourceEntryFundFactsheets(funds: FundSnapshot[]): Promise<FundSnapshot[]> {
  const sourceStore = await getSourceEntryStore();

  if (!sourceStore.fundFactsheetEntries.length) {
    return funds;
  }

  const factsheetMap = new Map(sourceStore.fundFactsheetEntries.map((entry) => [entry.slug, entry]));

  return funds.map((fund) => {
    const sourceEntry = factsheetMap.get(fund.slug);

    if (!sourceEntry) {
      return fund;
    }

    return {
      ...fund,
      factsheetMeta: {
        amcName: pickRealContentValue(fund.factsheetMeta?.amcName, sourceEntry.amcName) ?? "Fund house unavailable",
        documentLabel:
          pickRealContentValue(fund.factsheetMeta?.documentLabel, sourceEntry.documentLabel) ??
          sourceEntry.documentLabel,
        source: pickRealContentValue(fund.factsheetMeta?.source, sourceEntry.source) ?? sourceEntry.source,
        sourceDate:
          pickRealContentValue(fund.factsheetMeta?.sourceDate, sourceEntry.sourceDate) ??
          sourceEntry.sourceDate,
        referenceUrl: fund.factsheetMeta?.referenceUrl ?? sourceEntry.referenceUrl,
      },
    };
  });
}

async function applyDurableFundFactsheets(funds: FundSnapshot[]): Promise<FundSnapshot[]> {
  const entries = await getDurableFundFactsheetEntries();

  if (!entries.length) {
    return funds;
  }

  const factsheetMap = new Map(entries.map((entry) => [entry.slug, entry]));

  return funds.map((fund) => {
    const entry = factsheetMap.get(fund.slug);

    if (!entry) {
      return fund;
    }

    const benchmarkLabel =
      pickRealContentValue(fund.benchmark, entry.benchmarkLabel) ?? "Awaiting verified benchmark mapping";
    const benchmarkMapping = resolveMutualFundBenchmarkMapping({
      fundSlug: fund.slug,
      benchmarkLabel,
      tableBenchmarkIndexSlug: fund.benchmarkIndexSlug,
      factsheetBenchmarkIndexSlug: entry.benchmarkIndexSlug,
    });

    return {
      ...fund,
      benchmark: benchmarkLabel,
      benchmarkIndexSlug: benchmarkMapping.benchmarkIndexSlug,
      benchmarkMappingMeta: {
        source: benchmarkMapping.mappingSource,
        usedFallback: benchmarkMapping.usedFallback,
      },
      aum: pickRealContentValue(fund.aum, entry.aum) ?? entry.aum,
      expenseRatio: pickRealContentValue(fund.expenseRatio, entry.expenseRatio) ?? entry.expenseRatio,
      fundManager: {
        ...fund.fundManager,
        name: pickRealContentValue(fund.fundManager.name, entry.fundManagerName) ?? entry.fundManagerName,
      },
      factsheetMeta: {
        amcName: pickRealContentValue(fund.factsheetMeta?.amcName, entry.amcName) ?? entry.amcName,
        documentLabel:
          pickRealContentValue(fund.factsheetMeta?.documentLabel, entry.documentLabel) ??
          entry.documentLabel,
        source: pickRealContentValue(fund.factsheetMeta?.source, entry.source) ?? entry.source,
        sourceDate:
          pickRealContentValue(fund.factsheetMeta?.sourceDate, entry.sourceDate) ?? entry.sourceDate,
        referenceUrl: fund.factsheetMeta?.referenceUrl ?? entry.referenceUrl,
      },
    };
  });
}

async function applyDurableFundComposition(funds: FundSnapshot[]): Promise<FundSnapshot[]> {
  const [holdingEntries, allocationEntries] = await Promise.all([
    getDurableFundHoldingSnapshots(),
    getDurableFundSectorAllocationSnapshots(),
  ]);

  if (!holdingEntries.length && !allocationEntries.length) {
    return funds;
  }

  const holdingMap = new Map(holdingEntries.map((entry) => [entry.fundSlug, entry]));
  const allocationMap = new Map(allocationEntries.map((entry) => [entry.fundSlug, entry]));

  return funds.map((fund) => {
    const holdingEntry = holdingMap.get(fund.slug);
    const allocationEntry = allocationMap.get(fund.slug);

    if (!holdingEntry && !allocationEntry) {
      return fund;
    }

    return {
      ...fund,
      holdings:
        holdingEntry?.rows.length
          ? holdingEntry.rows.map((row) => ({
              name: row.name,
              sector: row.sector ?? "Sector unavailable",
              weight: row.weight,
            }))
          : fund.holdings,
      sectorAllocation:
        allocationEntry?.rows.length
          ? allocationEntry.rows.map((row) => ({
              name: row.name,
              weight: row.weight,
            }))
          : fund.sectorAllocation,
      holdingsMeta: holdingEntry
        ? {
            source: holdingEntry.sourceLabel,
            sourceDate: holdingEntry.sourceDate,
            referenceUrl: holdingEntry.referenceUrl,
          }
        : fund.holdingsMeta,
      allocationMeta: allocationEntry
        ? {
            source: allocationEntry.sourceLabel,
            sourceDate: allocationEntry.sourceDate,
            referenceUrl: allocationEntry.referenceUrl,
          }
        : fund.allocationMeta,
    };
  });
}

function mapIpoRow(row: {
  slug: string;
  company_name: string;
  status: string;
  open_date: string | null;
  listing_date: string | null;
  price_band: string | null;
  hero_summary: string | null;
  seo_description: string | null;
}): IpoSnapshot {
  return {
    slug: row.slug,
    name: `${row.company_name}${row.company_name.toLowerCase().includes("ipo") ? "" : " IPO"}`,
    status: row.status,
    primarySourceCode: "sebi_filings",
    openDate: row.open_date ?? "Awaiting verified IPO timeline",
    listingDate: row.listing_date ?? "Awaiting verified IPO timeline",
    priceBand: row.price_band ?? "Awaiting verified price band",
    ipoType: "IPO",
    issueSize: "Awaiting verified issue size",
    faceValue: "Awaiting verified face value",
    lotSize: "Awaiting verified lot size",
    minInvestment: "Awaiting verified minimum application size",
    gmp: "Awaiting verified GMP / listing signal",
    expectedListingPrice: "Awaiting verified listing outlook",
    allotmentDate: "Awaiting verified allotment timeline",
    refundDate: "Awaiting verified refund timeline",
    dematCreditDate: "Awaiting verified demat credit timeline",
    registrar: "Awaiting verified registrar",
    leadManagers: ["Awaiting verified book runners"],
    marketMaker: "Awaiting verified market maker",
    issueBreakup: [
      { label: "Fresh issue", value: "Awaiting verified issue breakup" },
      { label: "Offer for sale", value: "Awaiting verified issue breakup" },
    ],
    companyDetails: [
      { label: "Sector", value: "Awaiting verified issuer profile" },
      { label: "Exchange", value: "Awaiting verified listing venue" },
    ],
    strengths: ["Awaiting verified issuer strengths"],
    risks: ["Awaiting verified issuer risks"],
    issueObjectives: ["Awaiting verified use-of-proceeds detail"],
    angle:
      "IPO lifecycle page driven from a reusable structured content system, with timeline fields shown conservatively until verified issue records are attached.",
    summary:
      row.hero_summary ??
      row.seo_description ??
      "This IPO route exists, but its issue metrics stay conservative until verified issue records and supporting documents are attached.",
    keyPoints: [
      "This route now avoids borrowing seeded GMP and issue-size content to look further along than the underlying records really are.",
      "Official issue documents and lifecycle dates should drive the public IPO story.",
      "The page remains useful for route continuity, even while verified IPO detail is still being assembled.",
    ],
    subscriptionWatch: [
      {
        label: "Retail demand",
        value: "Awaiting verified subscription data",
        note: "Official subscription signals will appear here once the issue feed is wired in.",
      },
      {
        label: "QIB demand",
        value: "Awaiting verified subscription data",
        note: "Institutional demand should come from stored issue coverage, not sample subscription cards.",
      },
    ],
    allotmentChecklist: [
      "Allotment workflow guidance appears once verified registrar, application, and timeline details are attached.",
    ],
    listingWatch: [
      { label: "Estimated listing tone", value: "Awaiting verified listing posture" },
      { label: "Post-listing handoff", value: "Awaiting verified stock-route handoff" },
    ],
    documents: [{ title: "Issue document evidence pending", label: "Pending" }],
    faqItems: [
      {
        question: "Why do some IPO metrics still look unavailable?",
        answer:
          "This route no longer fills missing IPO market fields with sample content. Public issue metrics stay unavailable until verified records are attached.",
      },
    ],
  };
}

function mapFundRow(row: {
  slug: string;
  fund_name: string;
  category: string;
  amc_name?: string | null;
  benchmark?: string | null;
  benchmark_index_slug?: string | null;
  cms_benchmark_index_slug?: string | null;
  hero_summary: string | null;
  seo_description: string | null;
}, liveSnapshot?: SourceSnapshotPayload | null): FundSnapshot {
  const verifiedSnapshot = isVerifiedSnapshot(liveSnapshot);
  const manualSnapshot = isManualSnapshot(liveSnapshot);
  const marketPresentation = getEquitySnapshotPresentation(verifiedSnapshot && !manualSnapshot);
  const liveNav = formatSnapshotValue(
    parseNumericSnapshotValue(liveSnapshot?.nav),
    liveSnapshot?.navDisplay,
    formatCurrencyInr,
  );
  const liveReturns1Y = formatSnapshotValue(
    parseNumericSnapshotValue(liveSnapshot?.returns1Y),
    liveSnapshot?.returns1YDisplay,
    formatPercent,
  );
  const fallbackAmcName = pickRealContentValue(row.amc_name);
  const benchmarkLabel = pickRealContentValue(row.benchmark) ?? "Benchmark mapping pending";
  const benchmarkMapping = resolveMutualFundBenchmarkMapping({
    fundSlug: row.slug,
    benchmarkLabel,
    tableBenchmarkIndexSlug: row.benchmark_index_slug,
    cmsBenchmarkIndexSlug: row.cms_benchmark_index_slug,
  });

  return {
    slug: row.slug,
    name: row.fund_name,
    category: row.category,
    primarySourceCode: "amfi_nav",
    nav: verifiedSnapshot
      ? liveNav ?? "NAV data pending"
      : "NAV data pending",
    returns1Y: verifiedSnapshot
      ? liveReturns1Y ?? "Returns data pending"
      : "Returns data pending",
    returnsTable: [
      { label: "1M", value: "Data pending" },
      { label: "1Y", value: "Data pending" },
      { label: "3Y CAGR", value: "Data pending" },
    ],
    riskLabel: manualSnapshot
      ? "Manual retained NAV"
      : verifiedSnapshot && liveNav
        ? "Delayed NAV snapshot connected"
        : "NAV data pending",
    benchmark: benchmarkLabel,
    benchmarkIndexSlug: benchmarkMapping.benchmarkIndexSlug,
    benchmarkMappingMeta: {
      source: benchmarkMapping.mappingSource,
      usedFallback: benchmarkMapping.usedFallback,
    },
    aum: "Data pending",
    expenseRatio: "Data pending",
    holdings: [{ name: "Data pending", sector: "Pending", weight: "Pending" }],
    sectorAllocation: [{ name: "Data pending", weight: "Pending" }],
    fundManager: {
      name: "Data pending",
      since: "Pending",
      experience: "Pending",
      style: "Manager details appear here once the factsheet and fund profile are attached.",
    },
    angle:
      "Mutual fund page driven from a reusable structured content system, with NAV and return evidence shown conservatively until more data is available.",
    summary:
      row.hero_summary ??
      row.seo_description ??
      (liveSnapshot?.readFailureDetail
        ? "This fund route found the real catalog record, but the durable NAV read failed so the page is staying explicit about that backend problem."
        : "This fund route exists in the catalog. NAV and return data will appear here once available."),
    keyPoints: [
      "This route will show fund NAV and return data here once available.",
      liveSnapshot?.readFailureDetail
        ? "If the durable NAV read fails, the page now says so explicitly instead of implying the scheme simply has no stored NAV."
        : "If the latest NAV is not ready yet, the public route stays intentionally conservative.",
      "Factsheet evidence can still be attached explicitly without pretending the NAV layer is already live.",
    ],
    factsheetMeta: fallbackAmcName
      ? {
          amcName: fallbackAmcName,
          source: "CMS / fund catalog",
          referenceUrl: undefined,
        }
      : undefined,
    snapshotMeta: verifiedSnapshot
      ? manualSnapshot
        ? {
            mode: "manual_nav",
            source: liveSnapshot?.source ?? "Manual retained NAV",
            lastUpdated:
              formatSnapshotTimestamp(liveSnapshot?.lastUpdated) ?? "Recent manual retained NAV",
            marketLabel: "Manual retained NAV",
            marketDetail:
              "This fund route is using a manually-entered or retained NAV. It is stored, but it is not the same as the regular delayed NAV feed.",
          }
        : {
            mode: "delayed_snapshot",
            source: liveSnapshot?.source ?? "Retained delayed NAV",
            lastUpdated:
              formatSnapshotTimestamp(liveSnapshot?.lastUpdated) ?? "Recent delayed snapshot",
            marketLabel: marketPresentation.marketLabel,
            marketDetail: marketPresentation.marketDetail,
          }
      : {
          mode: "fallback",
          source: liveSnapshot?.source ?? "NAV data pending",
          lastUpdated: liveSnapshot?.readFailureDetail ? "NAV read failed" : "Data update pending",
          marketLabel: liveSnapshot?.readFailureDetail ? "NAV read failed" : "NAV data pending",
          marketDetail: liveSnapshot?.readFailureDetail ??
            "NAV data will appear here once available.",
        },
  };
}

async function applyResearchArchiveStockItems(stocks: StockSnapshot[]): Promise<StockSnapshot[]> {
  return Promise.all(
    stocks.map(async (stock) => {
      const archiveItems = await getStockResearchArchiveItems(stock.slug);

      if (!archiveItems.length) {
        return stock;
      }

      return {
        ...stock,
        newsItems: archiveItems.slice(0, 3).map((item) => ({
          title: item.title,
          source: `${item.sourceLabel} · ${item.publishedAt}`,
          type:
            item.sourceType === "official_filing"
              ? "Filings watch"
              : item.sourceType === "results_watch"
                ? "Results watch"
                : item.sourceType === "editorial_note"
                  ? "Research watch"
                  : "Archive watch",
        })),
      };
    }),
  );
}

export const getStocks = cache(async (): Promise<StockSnapshot[]> => {
  noStore();
  const cached = readTimedCache(stockCatalogCache, "all");
  if (cached.hit) {
    return cached.value;
  }

  if (!hasRuntimeSupabaseEnv()) {
    const stocks: StockSnapshot[] = [];
    writeTimedCache(stockCatalogCache, "all", stocks);
    return stocks;
  }

  try {
    const publishableRecords = await getPublishableCmsRecords("stock");
    const publishableSlugs = publishableRecords.map((record) => record.canonicalSlug);
    let rawRows: StockCatalogSourceRow[] = [];

    if (publishableSlugs.length > 0) {
      try {
        rawRows = await readStockCatalogSourceRows(publishableSlugs);
      } catch (error) {
        logPublicContentReadWarning("stock catalog source read failed; using CMS publishable fallback rows", error);
      }
    }

    const rawRowMap = new Map(rawRows.map((row) => [row.slug, row]));
    const durableSnapshots =
      publishableSlugs.length > 0
        ? await getDurableStockQuoteSnapshots(publishableSlugs)
        : { snapshots: new Map<string, Awaited<ReturnType<typeof getDurableStockQuoteSnapshot>>>(), readFailures: new Map<string, unknown>() };
    const mappedStocks = publishableRecords.map((record) => {
      const row = rawRowMap.get(record.canonicalSlug);
      const publishableRow = buildPublishableStockRow(record);
      const readFailure = durableSnapshots.readFailures.get(record.canonicalSlug);
      const liveSnapshot = readFailure
        ? mapDurableReadFailureToSnapshotPayload("stock", readFailure)
        : mapDurableQuoteToSnapshotPayload(
            durableSnapshots.snapshots.get(record.canonicalSlug) ?? null,
          );

      return mapStockRow(
        row
          ? {
              slug: row.slug,
              name: row.name,
              symbol: row.symbol,
              sector_index_slug: row.sector_index_slug ?? publishableRow.sector_index_slug,
              sector: row.companies?.[0]?.sector ?? null,
              hero_summary: row.stock_pages?.[0]?.hero_summary ?? null,
              seo_description: row.stock_pages?.[0]?.seo_description ?? null,
            }
          : publishableRow,
        liveSnapshot,
      );
    });
    const stocks = await applySourceEntryStockCloses(
      await applyDurableStockShareholding(await applyDurableStockFundamentals(mappedStocks)),
    );
    const adminFallbackRecords = await getPublishedAdminManagedStockFallbackRecords();
    const adminFallbackStocks = adminFallbackRecords
      .filter((record) => !publishableSlugs.includes(record.slug))
      .map((record) => buildAdminManagedStockFallback(record));
    const mergedStocks = [...stocks, ...adminFallbackStocks].sort((left, right) =>
      left.name.localeCompare(right.name),
    );
    writeTimedCache(stockCatalogCache, "all", mergedStocks);
    return mergedStocks;
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error("Public stock catalog read failed.");
  }
});

export const getStock = cache(async (slug: string): Promise<StockSnapshot | null> => {
  noStore();
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) {
    return null;
  }

  const cached = readTimedCache(stockDetailCache, normalizedSlug);
  if (cached.hit) {
    return cached.value;
  }

  if (!hasRuntimeSupabaseEnv()) {
    throw new Error(
      `Public stock detail read is unavailable because Supabase content runtime is not configured for "${normalizedSlug}".`,
    );
  }

  try {
    const publishableRecord = await getPublishableCmsRecordBySlug("stock", normalizedSlug);

    if (!publishableRecord) {
      const fallbackStock = await getPublishedAdminManagedStockFallback(normalizedSlug);

      if (!fallbackStock) {
        writeTimedCache(stockDetailCache, normalizedSlug, null);
        return null;
      }

      const [sourceEntryAppliedStock] = await applySourceEntryStockCloses([fallbackStock]);
      const [enrichedFallbackStock] = await applyResearchArchiveStockItems([
        sourceEntryAppliedStock ?? fallbackStock,
      ]);
      const fallbackResult = enrichedFallbackStock ?? fallbackStock;
      writeTimedCache(stockDetailCache, normalizedSlug, fallbackResult);
      return fallbackResult;
    }

    let liveSnapshot: SourceSnapshotPayload | null = null;

    try {
      liveSnapshot = mapDurableQuoteToSnapshotPayload(
        await getDurableStockQuoteSnapshot(normalizedSlug),
      );
    } catch (error) {
      liveSnapshot = mapDurableReadFailureToSnapshotPayload("stock", error);
    }

    let data: StockDetailSourceRow | null = null;

    try {
      data = await readStockDetailSourceRow(normalizedSlug);
    } catch (error) {
      logPublicContentReadWarning(`stock detail source read failed for ${normalizedSlug}; using CMS publishable fallback row`, error);
    }

    const publishableRow = buildPublishableStockRow(publishableRecord);
    const mappedStock = data
      ? mapStockRow(
          {
            slug: data.slug,
            name: data.name,
            symbol: data.symbol,
            sector_index_slug: data.sector_index_slug ?? publishableRow.sector_index_slug,
            sector: data.companies?.[0]?.sector ?? null,
            hero_summary: data.stock_pages?.[0]?.hero_summary ?? null,
            seo_description: data.stock_pages?.[0]?.seo_description ?? null,
          },
          liveSnapshot,
        )
      : mapStockRow(publishableRow, liveSnapshot);

    const managedOverride = await getPublishedAdminManagedContentOverride("stocks", normalizedSlug);
    const stockWithOverrides =
      mappedStock && managedOverride
        ? {
            ...mappedStock,
            summary: managedOverride.summary ?? mappedStock.summary,
            sectorIndexSlug: managedOverride.benchmarkMapping ?? mappedStock.sectorIndexSlug,
          }
        : mappedStock;

    if (!stockWithOverrides) {
      writeTimedCache(stockDetailCache, normalizedSlug, null);
      return null;
    }

    const [sourceEntryAppliedStock] = await applySourceEntryStockCloses([stockWithOverrides]);
    const [enrichedStock] = await applyResearchArchiveStockItems([
      sourceEntryAppliedStock ?? stockWithOverrides,
    ]);
    const stock = enrichedStock ?? null;
    writeTimedCache(stockDetailCache, normalizedSlug, stock);
    return stock;
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error(`Public stock detail read failed for "${normalizedSlug}".`);
  }
});

export const getIpos = cache(async (): Promise<IpoSnapshot[]> => {
  noStore();
  const cached = readTimedCache(ipoCatalogCache, "all");
  if (cached.hit) {
    return cached.value;
  }

  if (!hasRuntimeSupabaseEnv()) {
    const ipos: IpoSnapshot[] = [];
    writeTimedCache(ipoCatalogCache, "all", ipos);
    return ipos;
  }

  try {
    const publishableRecords = await getPublishableCmsRecords("ipo");

    if (publishableRecords.length === 0) {
      const ipos: IpoSnapshot[] = [];
      writeTimedCache(ipoCatalogCache, "all", ipos);
      return ipos;
    }

    const publishableSlugs = publishableRecords.map((record) => record.canonicalSlug);
    let rawRows: Array<{
      slug: string;
      company_name: string;
      status: string;
      open_date: string | null;
      listing_date: string | null;
      price_band: string | null;
      ipo_pages: Array<{ hero_summary: string | null; seo_description: string | null }> | null;
    }> = [];

    try {
      const supabase = await createSupabaseContentReadClient();
      const { data, error } = await supabase
        .from("ipos")
        .select(
          `
            slug,
            company_name,
            status,
            open_date,
            listing_date,
            price_band,
            ipo_pages (hero_summary, seo_description)
          `,
        )
        .in("slug", publishableSlugs);

      if (error) {
        throw new Error(`Public IPO catalog read failed: ${error.message}`);
      }

      rawRows = data ?? [];
    } catch (error) {
      logPublicContentReadWarning("IPO catalog source read failed; using CMS publishable fallback rows", error);
    }

    const rawRowMap = new Map(rawRows.map((row) => [row.slug, row]));
    const redirectingIpoSlugs = await getRedirectingIpoSlugSet();
    const ipos = publishableRecords.map((record) => {
      const row = rawRowMap.get(record.canonicalSlug);

      return mapIpoRow(
        row
          ? {
              slug: row.slug,
              company_name: row.company_name,
              status: row.status,
              open_date: row.open_date,
              listing_date: row.listing_date,
              price_band: row.price_band,
              hero_summary: row.ipo_pages?.[0]?.hero_summary ?? null,
              seo_description: row.ipo_pages?.[0]?.seo_description ?? null,
            }
          : buildPublishableIpoRow(record),
      );
    }).filter((ipo) => !redirectingIpoSlugs.has(ipo.slug));
    writeTimedCache(ipoCatalogCache, "all", ipos);
    return ipos;
  } catch (error) {
    throw error instanceof Error ? error : new Error("Public IPO catalog read failed.");
  }
});

export const getIpo = cache(async (slug: string): Promise<IpoSnapshot | null> => {
  noStore();
  const normalizedSlug = slug.trim().toLowerCase();

  if (!normalizedSlug) {
    return null;
  }

  const cached = readTimedCache(ipoDetailCache, normalizedSlug);
  if (cached.hit) {
    return cached.value;
  }

  if (!hasRuntimeSupabaseEnv()) {
    throw new Error(
      `Public IPO detail read is unavailable because Supabase content runtime is not configured for "${normalizedSlug}".`,
    );
  }

  const ipos = await getIpos();
  const ipo = ipos.find((item) => item.slug === normalizedSlug) ?? null;
  writeTimedCache(ipoDetailCache, normalizedSlug, ipo);
  return ipo;
});

export const getFunds = cache(async (): Promise<FundSnapshot[]> => {
  noStore();
  const cached = readTimedCache(fundCatalogCache, "all");
  if (cached.hit) {
    return cached.value;
  }

  if (!hasRuntimeSupabaseEnv()) {
    const funds: FundSnapshot[] = [];
    writeTimedCache(fundCatalogCache, "all", funds);
    return funds;
  }

  try {
    const publishableRecords = await getPublishableCmsRecords("mutual_fund");

    if (publishableRecords.length === 0) {
      const funds: FundSnapshot[] = [];
      writeTimedCache(fundCatalogCache, "all", funds);
      return funds;
    }

    const publishableSlugs = publishableRecords.map((record) => record.canonicalSlug);
    let rawRows: FundCatalogSourceRow[] = [];

    try {
      rawRows = await readFundCatalogSourceRows(publishableSlugs);
    } catch (error) {
      logPublicContentReadWarning("fund catalog source read failed; using CMS publishable fallback rows", error);
    }

    const rawRowMap = new Map(rawRows.map((row) => [row.slug, row]));
    const durableSnapshots = await getDurableFundNavSnapshots(
      publishableSlugs,
    );
    const mappedFunds = publishableRecords.map((record) => {
      const row = rawRowMap.get(record.canonicalSlug);
      const readFailure = durableSnapshots.readFailures.get(record.canonicalSlug);
      const liveSnapshot = readFailure
        ? mapDurableReadFailureToSnapshotPayload("fund", readFailure)
        : mapDurableFundNavToSnapshotPayload(
            durableSnapshots.snapshots.get(record.canonicalSlug) ?? null,
          );

      return mapFundRow(
        row
          ? {
              slug: row.slug,
              fund_name: row.fund_name,
              category: row.category,
              amc_name: row.amc_name,
              benchmark: row.benchmark,
              benchmark_index_slug: row.benchmark_index_slug ?? null,
              cms_benchmark_index_slug: readPublishableText(record, "benchmark_index_slug"),
              hero_summary: row.mutual_fund_pages?.[0]?.hero_summary ?? null,
              seo_description: row.mutual_fund_pages?.[0]?.seo_description ?? null,
            }
          : buildPublishableFundRow(record),
        liveSnapshot,
      );
    });
    const funds = await applyDurableFundComposition(
      await applySourceEntryFundFactsheets(
        await applyDurableFundFactsheets(await applySourceEntryFundNavs(mappedFunds)),
      ),
    );
    writeTimedCache(fundCatalogCache, "all", funds);
    return funds;
  } catch (error) {
    throw error instanceof Error ? error : new Error("Public fund catalog read failed.");
  }
});

export const getFund = cache(async (slug: string): Promise<FundSnapshot | null> => {
  noStore();
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) {
    return null;
  }

  if (!hasRuntimeSupabaseEnv()) {
    throw new Error(
      `Public fund detail read is unavailable because Supabase content runtime is not configured for "${normalizedSlug}".`,
    );
  }

  const cached = readTimedCache(fundDetailCache, normalizedSlug);
  if (cached.hit) {
    return cached.value;
  }

  const funds = await getFunds();
  const fund = funds.find((item) => item.slug === normalizedSlug) ?? null;
  const managedOverride = fund
    ? await getPublishedAdminManagedContentOverride("mutual-funds", normalizedSlug)
    : null;
  const resolvedFund =
    fund && managedOverride
      ? {
          ...fund,
          summary: managedOverride.summary ?? fund.summary,
          benchmarkIndexSlug: managedOverride.benchmarkMapping ?? fund.benchmarkIndexSlug,
        }
      : fund;
  writeTimedCache(fundDetailCache, normalizedSlug, resolvedFund);
  return resolvedFund;
});

export const getUserSubscriptionSummary = cache(
  async (user: User): Promise<SubscriptionSummary | null> => {
    if (!hasRuntimeSupabaseEnv()) {
      return null;
    }

    try {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase
        .from("subscriptions")
        .select("plan_code, status, current_period_end")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) {
        return null;
      }

      return {
        planCode: data.plan_code,
        status: data.status,
        periodEnd: data.current_period_end,
      };
    } catch {
      return null;
    }
  },
);

export const getUserEntitlements = cache(
  async (user: User): Promise<EntitlementSummary[]> => {
    if (!hasRuntimeSupabaseEnv()) {
      return [];
    }

    try {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase
        .from("entitlements")
        .select("feature_code, access_level")
        .eq("user_id", user.id)
        .order("feature_code", { ascending: true });

      return (
        data?.map((item) => ({
          featureCode: item.feature_code,
          accessLevel: item.access_level,
        })) ?? []
      );
    } catch {
      return [];
    }
  },
);
