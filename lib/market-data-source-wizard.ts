import { TRACKED_INDEX_SLUGS, getIndexSnapshots } from "@/lib/index-content";
import { normalizeBenchmarkSlug } from "@/lib/benchmark-labels";
import { getFunds, getStocks } from "@/lib/content";
import { parseCsvText } from "@/lib/csv-import";
import {
  buildGoogleSheetCsvExportUrl,
  fetchGoogleSheetCsvText,
  normalizeYahooSymbolForStockLookup,
  runMarketDataIngestion,
  type MarketDataImportDuplicateMode,
  type MarketDataImportExecutionMode,
  type MarketDataImportPreview,
  type MarketDataImportSourceType,
  type MarketDataImportType,
} from "@/lib/market-data-imports";
import {
  findExistingMarketDataSourceByIdentity,
  type SaveMarketDataSourceInput,
} from "@/lib/market-data-source-registry";
import { getSourceEntryStore } from "@/lib/source-entry-store";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type MarketDataSourceWizardAssetType = "stock" | "benchmark" | "fund" | "auto";
export type MarketDataSourceWizardSourceType =
  | "auto"
  | Extract<MarketDataImportSourceType, "google_sheet" | "yahoo_finance" | "provider_api">;

export type MarketDataSourceMappingMethod =
  | "exact_symbol"
  | "alias_match"
  | "slug_match"
  | "fuzzy_name"
  | "manual_confirmation"
  | "benchmark_slug"
  | "fund_identifier";

export type MarketDataSourceMappingPreview = {
  inputValue: string | null;
  detectedSymbol: string | null;
  mappedSlug: string | null;
  mappedDisplayName: string | null;
  confidenceScore: number;
  confidenceLabel: "high" | "medium" | "low";
  method: MarketDataSourceMappingMethod;
  requiresConfirmation: boolean;
};

export type MarketDataSourceWizardPreview = {
  originalInput: string;
  detectedSourceType: Extract<
    MarketDataImportSourceType,
    "google_sheet" | "yahoo_finance" | "provider_api"
  >;
  assetType: Exclude<MarketDataSourceWizardAssetType, "auto">;
  importType: MarketDataImportType;
  normalizedSourceUrl: string;
  normalizedSymbol: string | null;
  mapping: MarketDataSourceMappingPreview | null;
  preview: MarketDataImportPreview;
  latestDate: string | null;
  latestStoredDate: string | null;
  latestSourceValue: number | null;
  latestStoredValue: number | null;
  rowCount: number;
  rowsAvailable: number;
  rowsReadyToImport: number;
  rowsThatWillImport: number;
  duplicateRows: number;
  futureDatedRows: number;
  missingColumns: string[];
  warnings: string[];
  dataQualityWarnings: string[];
  duplicateSourceDetected: boolean;
  existingSourceId: string | null;
  canSave: boolean;
  suggestedSource: SaveMarketDataSourceInput;
};

export type MarketDataSourceBulkPreviewRow = {
  rowNumber: number;
  status: "ready" | "warning" | "failed";
  sourceType: Extract<
    MarketDataImportSourceType,
    "google_sheet" | "yahoo_finance" | "provider_api"
  > | null;
  assetType: Exclude<MarketDataSourceWizardAssetType, "auto"> | null;
  normalizedSourceUrl: string | null;
  normalizedSymbol: string | null;
  mapping: MarketDataSourceMappingPreview | null;
  existingSourceId: string | null;
  duplicateSourceDetected: boolean;
  warnings: string[];
  errors: string[];
  suggestedSource: SaveMarketDataSourceInput | null;
};

type AssetMappingCandidate = {
  slug: string;
  label: string;
  symbol: string;
  normalizedName: string;
};

type SourceWizardPreviewInput = {
  sourceInput: string;
  assetType?: MarketDataSourceWizardAssetType;
  sourceType?: MarketDataSourceWizardSourceType;
  executionMode?: MarketDataImportExecutionMode;
  duplicateMode?: MarketDataImportDuplicateMode;
};

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function numericOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeLower(value: unknown) {
  return cleanString(value, 400).toLowerCase();
}

function normalizeUpper(value: unknown) {
  return cleanString(value, 400).toUpperCase();
}

function normalizeSlugish(value: unknown) {
  return cleanString(value, 400)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function getPreviewRowValue(
  row: Pick<MarketDataImportPreview["rows"][number], "payload">,
  importType: MarketDataImportType,
) {
  if (importType === "fund_nav") {
    return numericOrNull(row.payload.nav);
  }

  return numericOrNull(row.payload.close);
}

function countFutureDatedRows(
  rows: Array<Pick<MarketDataImportPreview["rows"][number], "importDate" | "status">>,
) {
  const today = todayIsoDate();
  return rows.filter((row) => row.status !== "failed" && cleanString(row.importDate, 120) > today)
    .length;
}

async function loadLatestStoredSnapshot(input: {
  importType: MarketDataImportType;
  assetSlug: string | null;
  benchmarkSlug: string | null;
  timeframe: string;
}) {
  const supabase = createSupabaseAdminClient();

  if (input.importType === "stock_ohlcv") {
    const slug = cleanString(input.assetSlug, 160);
    if (!slug) {
      return { latestStoredDate: null, latestStoredValue: null };
    }

    const { data, error } = await supabase
      .from("stock_ohlcv_history")
      .select("bar_time, close")
      .eq("slug", slug)
      .eq("timeframe", input.timeframe)
      .order("bar_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Could not load the latest stored stock row. ${error.message}`);
    }

    return {
      latestStoredDate: cleanString(data?.bar_time, 120).slice(0, 10) || null,
      latestStoredValue: numericOrNull(data?.close),
    };
  }

  if (input.importType === "benchmark_ohlcv") {
    const benchmarkSlug = cleanString(input.benchmarkSlug, 160);
    if (!benchmarkSlug) {
      return { latestStoredDate: null, latestStoredValue: null };
    }

    const { data, error } = await supabase
      .from("benchmark_ohlcv_history")
      .select("date, close")
      .eq("index_slug", benchmarkSlug)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Could not load the latest stored benchmark row. ${error.message}`);
    }

    return {
      latestStoredDate: cleanString(data?.date, 120).slice(0, 10) || null,
      latestStoredValue: numericOrNull(data?.close),
    };
  }

  const slug = cleanString(input.assetSlug, 160);
  if (!slug) {
    return { latestStoredDate: null, latestStoredValue: null };
  }

  const { data, error } = await supabase
    .from("fund_nav_history")
    .select("nav_date, nav")
    .eq("slug", slug)
    .order("nav_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load the latest stored fund row. ${error.message}`);
  }

  return {
    latestStoredDate: cleanString(data?.nav_date, 120).slice(0, 10) || null,
    latestStoredValue: numericOrNull(data?.nav),
  };
}

function parseAssetType(
  value: unknown,
): MarketDataSourceWizardAssetType {
  const normalized = cleanString(value, 80);
  if (normalized === "stock" || normalized === "benchmark" || normalized === "fund") {
    return normalized;
  }
  return "auto";
}

function parseSourceType(
  value: unknown,
): MarketDataSourceWizardSourceType {
  const normalized = cleanString(value, 120);
  if (
    normalized === "google_sheet" ||
    normalized === "yahoo_finance" ||
    normalized === "provider_api"
  ) {
    return normalized;
  }
  return "auto";
}

function resolveImportTypeFromAssetType(
  assetType: Exclude<MarketDataSourceWizardAssetType, "auto">,
): MarketDataImportType {
  if (assetType === "benchmark") {
    return "benchmark_ohlcv";
  }
  if (assetType === "fund") {
    return "fund_nav";
  }
  return "stock_ohlcv";
}

function inferImportTypeFromHeaders(headers: string[]): MarketDataImportType | null {
  const normalized = new Set(headers.map((header) => normalizeLower(header)));
  const hasStockHeaders =
    normalized.has("symbol") &&
    normalized.has("date") &&
    normalized.has("open") &&
    normalized.has("high") &&
    normalized.has("low") &&
    normalized.has("close");
  if (hasStockHeaders) {
    return "stock_ohlcv";
  }

  const hasBenchmarkHeaders =
    normalized.has("benchmark_slug") &&
    normalized.has("date") &&
    normalized.has("open") &&
    normalized.has("high") &&
    normalized.has("low") &&
    normalized.has("close");
  if (hasBenchmarkHeaders) {
    return "benchmark_ohlcv";
  }

  const hasFundHeaders =
    normalized.has("scheme_code") &&
    normalized.has("date") &&
    normalized.has("nav");
  if (hasFundHeaders) {
    return "fund_nav";
  }

  return null;
}

function resolveConfidenceLabel(score: number): "high" | "medium" | "low" {
  if (score >= 0.9) {
    return "high";
  }
  if (score >= 0.7) {
    return "medium";
  }
  return "low";
}

async function loadStockMappingCandidates() {
  const [stocks, sourceEntryStore] = await Promise.all([getStocks(), getSourceEntryStore()]);
  const exactSymbolMap = new Map<string, AssetMappingCandidate>();
  const aliasMap = new Map<string, AssetMappingCandidate>();
  const slugMap = new Map<string, AssetMappingCandidate>();
  const candidates: AssetMappingCandidate[] = [];

  const register = (entry: AssetMappingCandidate) => {
    candidates.push(entry);
    if (entry.symbol) {
      exactSymbolMap.set(normalizeUpper(entry.symbol), entry);
      aliasMap.set(normalizeYahooSymbolForStockLookup(entry.symbol), entry);
      aliasMap.set(`${normalizeYahooSymbolForStockLookup(entry.symbol)}.NS`, entry);
      aliasMap.set(`${normalizeYahooSymbolForStockLookup(entry.symbol)}.BO`, entry);
    }
    slugMap.set(normalizeSlugish(entry.slug), entry);
    slugMap.set(normalizeSlugish(entry.label), entry);
  };

  for (const stock of stocks) {
    register({
      slug: stock.slug,
      label: stock.name,
      symbol: cleanString(stock.symbol, 80),
      normalizedName: normalizeSlugish(stock.name),
    });
  }

  for (const entry of sourceEntryStore.stockCloseEntries) {
    const normalizedSymbol = cleanString(entry.symbol, 80);
    const key = normalizeUpper(normalizedSymbol);
    if (key && exactSymbolMap.has(key)) {
      continue;
    }

    register({
      slug: entry.slug,
      label: entry.companyName,
      symbol: normalizedSymbol,
      normalizedName: normalizeSlugish(entry.companyName),
    });
  }

  return {
    exactSymbolMap,
    aliasMap,
    slugMap,
    candidates,
  };
}

async function loadFundMappings() {
  const [funds, sourceEntryStore] = await Promise.all([getFunds(), getSourceEntryStore()]);
  const fundMap = new Map<string, { slug: string; label: string }>();

  for (const fund of funds) {
    const aliases = [
      normalizeLower(fund.slug),
      normalizeSlugish(fund.name),
      normalizeSlugish(fund.name).replace(/-fund$/, ""),
    ].filter(Boolean);
    for (const alias of aliases) {
      fundMap.set(alias, { slug: fund.slug, label: fund.name });
    }
  }

  for (const entry of sourceEntryStore.fundNavEntries) {
    const aliases = [
      normalizeLower(entry.slug),
      normalizeSlugish(entry.fundName),
      normalizeSlugish(entry.fundName).replace(/-fund$/, ""),
    ].filter(Boolean);
    for (const alias of aliases) {
      if (!fundMap.has(alias)) {
        fundMap.set(alias, { slug: entry.slug, label: entry.fundName });
      }
    }
  }

  return fundMap;
}

async function loadBenchmarkMappings() {
  const snapshots = await getIndexSnapshots();
  const benchmarkMap = new Map<string, { slug: string; label: string }>();

  for (const snapshot of snapshots) {
    if (!TRACKED_INDEX_SLUGS.includes(snapshot.slug)) {
      continue;
    }
    benchmarkMap.set(normalizeBenchmarkSlug(snapshot.slug), {
      slug: snapshot.slug,
      label: snapshot.title,
    });
    benchmarkMap.set(normalizeBenchmarkSlug(snapshot.title), {
      slug: snapshot.slug,
      label: snapshot.title,
    });
  }

  for (const slug of TRACKED_INDEX_SLUGS) {
    if (!benchmarkMap.has(normalizeBenchmarkSlug(slug))) {
      benchmarkMap.set(normalizeBenchmarkSlug(slug), {
        slug,
        label: slug.toUpperCase(),
      });
    }
  }

  return benchmarkMap;
}

async function resolveStockMapping(inputValue: string) {
  const normalizedInput = cleanString(inputValue, 160);
  const exactInput = normalizeUpper(normalizedInput);
  const aliasInput = normalizeUpper(normalizeYahooSymbolForStockLookup(normalizedInput));
  const slugInput = normalizeSlugish(normalizedInput);
  const { exactSymbolMap, aliasMap, slugMap, candidates } = await loadStockMappingCandidates();

  if (exactInput && exactSymbolMap.has(exactInput)) {
    const match = exactSymbolMap.get(exactInput)!;
    return {
      inputValue: normalizedInput,
      detectedSymbol: match.symbol,
      mappedSlug: match.slug,
      mappedDisplayName: match.label,
      confidenceScore: 1,
      confidenceLabel: "high" as const,
      method: "exact_symbol" as const,
      requiresConfirmation: false,
    };
  }

  if (aliasInput && aliasMap.has(aliasInput)) {
    const match = aliasMap.get(aliasInput)!;
    return {
      inputValue: normalizedInput,
      detectedSymbol: match.symbol,
      mappedSlug: match.slug,
      mappedDisplayName: match.label,
      confidenceScore: 0.95,
      confidenceLabel: "high" as const,
      method: "alias_match" as const,
      requiresConfirmation: false,
    };
  }

  if (slugInput && slugMap.has(slugInput)) {
    const match = slugMap.get(slugInput)!;
    return {
      inputValue: normalizedInput,
      detectedSymbol: match.symbol,
      mappedSlug: match.slug,
      mappedDisplayName: match.label,
      confidenceScore: 0.9,
      confidenceLabel: "high" as const,
      method: "slug_match" as const,
      requiresConfirmation: false,
    };
  }

  const fuzzyMatches = candidates.filter((candidate) => {
    const candidateSlug = normalizeSlugish(candidate.slug);
    return (
      candidate.normalizedName.includes(slugInput) ||
      slugInput.includes(candidate.normalizedName) ||
      candidateSlug.includes(slugInput) ||
      slugInput.includes(candidateSlug)
    );
  });

  if (fuzzyMatches.length === 1) {
    const match = fuzzyMatches[0];
    const confidenceScore = 0.72;
    return {
      inputValue: normalizedInput,
      detectedSymbol: match.symbol,
      mappedSlug: match.slug,
      mappedDisplayName: match.label,
      confidenceScore,
      confidenceLabel: resolveConfidenceLabel(confidenceScore),
      method: "fuzzy_name" as const,
      requiresConfirmation: true,
    };
  }

  return {
    inputValue: normalizedInput || null,
    detectedSymbol: aliasInput || exactInput || null,
    mappedSlug: null,
    mappedDisplayName: null,
    confidenceScore: 0,
    confidenceLabel: "low" as const,
    method: "manual_confirmation" as const,
    requiresConfirmation: true,
  };
}

async function resolveFundMapping(inputValue: string) {
  const fundMap = await loadFundMappings();
  const normalized = normalizeSlugish(inputValue);
  const match = fundMap.get(normalized);

  return match
    ? {
        inputValue: cleanString(inputValue, 160),
        detectedSymbol: cleanString(inputValue, 160),
        mappedSlug: match.slug,
        mappedDisplayName: match.label,
        confidenceScore: 0.95,
        confidenceLabel: "high" as const,
        method: "fund_identifier" as const,
        requiresConfirmation: false,
      }
    : {
        inputValue: cleanString(inputValue, 160) || null,
        detectedSymbol: cleanString(inputValue, 160) || null,
        mappedSlug: null,
        mappedDisplayName: null,
        confidenceScore: 0,
        confidenceLabel: "low" as const,
        method: "manual_confirmation" as const,
        requiresConfirmation: true,
      };
}

async function resolveBenchmarkMapping(inputValue: string) {
  const benchmarkMap = await loadBenchmarkMappings();
  const normalized = normalizeBenchmarkSlug(inputValue);
  const match = benchmarkMap.get(normalized);

  return match
    ? {
        inputValue: cleanString(inputValue, 160),
        detectedSymbol: cleanString(inputValue, 160),
        mappedSlug: match.slug,
        mappedDisplayName: match.label,
        confidenceScore: 0.95,
        confidenceLabel: "high" as const,
        method: "benchmark_slug" as const,
        requiresConfirmation: false,
      }
    : {
        inputValue: cleanString(inputValue, 160) || null,
        detectedSymbol: cleanString(inputValue, 160) || null,
        mappedSlug: null,
        mappedDisplayName: null,
        confidenceScore: 0,
        confidenceLabel: "low" as const,
        method: "manual_confirmation" as const,
        requiresConfirmation: true,
      };
}

function detectSourceType(
  sourceInput: string,
  preferredSourceType: MarketDataSourceWizardSourceType,
) {
  if (preferredSourceType !== "auto") {
    return preferredSourceType;
  }

  const trimmed = cleanString(sourceInput, 2000);
  const normalizedLower = trimmed.toLowerCase();

  if (
    normalizedLower.includes("docs.google.com/spreadsheets/") ||
    normalizedLower.includes("docs.google.com/spreadsheets/d/")
  ) {
    return "google_sheet";
  }

  if (normalizedLower.includes("finance.yahoo.com/quote/")) {
    return "yahoo_finance";
  }

  if (/^[a-z0-9._-]+\.(ns|bo|nse|bse)$/i.test(trimmed)) {
    return "yahoo_finance";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return "provider_api";
  }

  throw new Error("Enter a Google Sheet URL, Yahoo Finance URL or symbol, or a provider API URL.");
}

function normalizeYahooInput(sourceInput: string) {
  const trimmed = cleanString(sourceInput, 2000);
  if (/^https?:\/\//i.test(trimmed)) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmed);
    } catch {
      throw new Error("Enter a valid Yahoo Finance URL or symbol.");
    }

    if (!/yahoo\.com$/i.test(parsedUrl.hostname)) {
      throw new Error("Yahoo Finance sources need a finance.yahoo.com URL or a direct symbol.");
    }

    const segments = parsedUrl.pathname.split("/").filter(Boolean);
    const quoteIndex = segments.findIndex((segment) => segment === "quote" || segment === "chart");
    const extracted = quoteIndex >= 0 ? cleanString(segments[quoteIndex + 1], 80) : "";
    if (!extracted) {
      throw new Error("Could not read the Yahoo Finance symbol from that URL.");
    }

    const normalizedSymbol = normalizeUpper(extracted);
    return {
      normalizedSymbol,
      normalizedSourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(normalizedSymbol)}`,
    };
  }

  const normalizedSymbol = normalizeUpper(trimmed);
  if (!normalizedSymbol) {
    throw new Error("Enter a Yahoo Finance symbol such as RELIANCE.NS.");
  }

  return {
    normalizedSymbol,
    normalizedSourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(normalizedSymbol)}`,
  };
}

async function inferImportTypeForSource(
  detectedSourceType: Extract<
    MarketDataImportSourceType,
    "google_sheet" | "yahoo_finance" | "provider_api"
  >,
  sourceInput: string,
  normalizedSourceUrl: string,
  assetType: MarketDataSourceWizardAssetType,
) {
  if (assetType !== "auto") {
    return resolveImportTypeFromAssetType(assetType);
  }

  if (detectedSourceType === "yahoo_finance") {
    return "stock_ohlcv" as const;
  }

  const csvText =
    detectedSourceType === "google_sheet"
      ? (await fetchGoogleSheetCsvText(sourceInput)).csvText
      : await fetchProviderSourceText(normalizedSourceUrl);
  const parsed = parseCsvText(csvText);
  const detected = inferImportTypeFromHeaders(parsed.headers);

  if (!detected) {
    throw new Error(
      "Could not infer the asset type from the source headers. Choose stock, benchmark, or fund before previewing.",
    );
  }

  return detected;
}

function importTypeToAssetType(
  importType: MarketDataImportType,
): Exclude<MarketDataSourceWizardAssetType, "auto"> {
  if (importType === "benchmark_ohlcv") {
    return "benchmark";
  }
  if (importType === "fund_nav") {
    return "fund";
  }
  return "stock";
}

async function fetchProviderSourceText(url: string) {
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: {
      Accept: "text/csv,text/plain,application/json;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Provider API fetch failed with status ${response.status}. Ensure the endpoint is reachable and returns CSV-shaped rows.`,
    );
  }

  return response.text();
}

function createSourceMetadata(input: {
  preview: MarketDataImportPreview;
  mapping: MarketDataSourceMappingPreview | null;
  detectedSourceType: Extract<
    MarketDataImportSourceType,
    "google_sheet" | "yahoo_finance" | "provider_api"
  >;
  normalizedSourceUrl: string;
  originalInput: string;
}) {
  return {
    detected_source_type: input.detectedSourceType,
    mapping_confidence: input.mapping?.confidenceScore ?? 0,
    mapping_method: input.mapping?.method ?? "manual_confirmation",
    source_name: input.mapping?.mappedDisplayName ?? null,
    mapped_display_name: input.mapping?.mappedDisplayName ?? null,
    detected_symbol: input.mapping?.detectedSymbol ?? null,
    normalized_url: input.normalizedSourceUrl,
    original_url: input.originalInput,
    column_mapping: input.preview.columnMapping,
    importType: input.preview.type,
    sourceLabel:
      input.preview.sourceLabel ||
      `${input.detectedSourceType}_${input.preview.type}`,
    duplicateMode: input.preview.duplicateMode,
    executionMode: input.preview.executionMode,
  } satisfies Record<string, unknown>;
}

export async function previewMarketDataSourceCandidate(
  input: SourceWizardPreviewInput,
): Promise<MarketDataSourceWizardPreview> {
  const originalInput = cleanString(input.sourceInput, 2000);
  if (!originalInput) {
    throw new Error("Paste a source URL or Yahoo Finance symbol before previewing.");
  }

  const preferredAssetType = parseAssetType(input.assetType);
  const preferredSourceType = parseSourceType(input.sourceType);
  const detectedSourceType = detectSourceType(originalInput, preferredSourceType);
  const executionMode = input.executionMode ?? "import_valid_rows";
  const duplicateMode = input.duplicateMode ?? "replace_matching_dates";
  const warnings: string[] = [];

  let normalizedSourceUrl = originalInput;
  let normalizedSymbol: string | null = null;

  if (detectedSourceType === "google_sheet") {
    normalizedSourceUrl = buildGoogleSheetCsvExportUrl(originalInput).exportUrl;
  } else if (detectedSourceType === "yahoo_finance") {
    const normalized = normalizeYahooInput(originalInput);
    normalizedSourceUrl = normalized.normalizedSourceUrl;
    normalizedSymbol = normalized.normalizedSymbol;
  } else {
    if (!/^https?:\/\//i.test(originalInput)) {
      throw new Error("Provider API sources need a valid URL.");
    }
    normalizedSourceUrl = originalInput;
  }

  const importType = await inferImportTypeForSource(
    detectedSourceType,
    originalInput,
    normalizedSourceUrl,
    preferredAssetType,
  );
  const assetType = importTypeToAssetType(importType);

  const preview =
    detectedSourceType === "google_sheet"
      ? ((await runMarketDataIngestion("google_sheet", {
          mode: "preview",
          type: importType,
          googleSheetUrl: normalizedSourceUrl,
          executionMode,
          duplicateMode,
          fileName: `${importType}-source-wizard.csv`,
          sourceUrl: normalizedSourceUrl,
          sourceLabel: `${detectedSourceType}_${importType}`,
        })) as MarketDataImportPreview)
      : detectedSourceType === "yahoo_finance"
        ? ((await runMarketDataIngestion("yahoo_finance", {
            mode: "preview",
            type: "stock_ohlcv",
            yahooSymbol: normalizedSymbol ?? "",
            executionMode,
            duplicateMode,
            fileName: `${normalizedSymbol ?? "unknown"}-source-wizard.csv`,
            sourceUrl: normalizedSourceUrl,
            sourceLabel: `${detectedSourceType}_${importType}`,
          })) as MarketDataImportPreview)
        : ((await runMarketDataIngestion("provider_api", {
            mode: "preview",
            type: importType,
            sourceUrl: normalizedSourceUrl,
            executionMode,
            duplicateMode,
            fileName: `${importType}-provider-api.csv`,
            sourceLabel: `${detectedSourceType}_${importType}`,
          })) as MarketDataImportPreview);

  const importableRows = preview.rows.filter((row) => row.status !== "failed");
  const sortedImportableRows = [...importableRows].sort((left, right) =>
    cleanString(right.importDate, 120).localeCompare(cleanString(left.importDate, 120)),
  );
  const latestDate =
    [...new Set(sortedImportableRows.map((row) => cleanString(row.importDate, 120)).filter(Boolean))]
      .sort((left, right) => right.localeCompare(left))[0] ?? null;
  const firstMappedRow = sortedImportableRows.find((row) => row.mappedSlug || row.identifier);

  const mapping =
    assetType === "stock"
      ? await resolveStockMapping(normalizedSymbol ?? firstMappedRow?.identifier ?? "")
      : assetType === "benchmark"
        ? await resolveBenchmarkMapping(firstMappedRow?.identifier ?? "")
        : await resolveFundMapping(firstMappedRow?.identifier ?? "");

  if (mapping.requiresConfirmation) {
    warnings.push(
      "The source could not be mapped with high confidence. Review the suggested asset before saving.",
    );
  }

  const metadata = createSourceMetadata({
    preview,
    mapping,
    detectedSourceType,
    normalizedSourceUrl,
    originalInput,
  });

  const suggestedSource: SaveMarketDataSourceInput = {
    sourceType: detectedSourceType,
    sourceUrl: normalizedSourceUrl,
    assetSlug: assetType === "stock" || assetType === "fund" ? mapping.mappedSlug : null,
    symbol:
      assetType === "stock"
        ? normalizedSymbol ?? mapping.detectedSymbol ?? firstMappedRow?.identifier ?? null
        : null,
    schemeCode: assetType === "fund" ? firstMappedRow?.identifier ?? null : null,
    benchmarkSlug: assetType === "benchmark" ? mapping.mappedSlug : null,
    timeframe: "1D",
    syncStatus: "active",
    metadata,
  };

  const existingSource = await findExistingMarketDataSourceByIdentity({
    sourceType: detectedSourceType,
    sourceUrl: normalizedSourceUrl,
    timeframe: suggestedSource.timeframe || "1D",
    assetSlug: suggestedSource.assetSlug ?? null,
    symbol: suggestedSource.symbol ?? null,
    schemeCode: suggestedSource.schemeCode ?? null,
    benchmarkSlug: suggestedSource.benchmarkSlug ?? null,
  });

  if (existingSource) {
    warnings.push(
      `This source already exists in the registry and will update the existing source instead of creating a duplicate.`,
    );
  }

  const { latestStoredDate, latestStoredValue } = await loadLatestStoredSnapshot({
    importType,
    assetSlug: suggestedSource.assetSlug ?? null,
    benchmarkSlug: suggestedSource.benchmarkSlug ?? null,
    timeframe: suggestedSource.timeframe || "1D",
  });

  const rowsThatWillImport = importableRows.filter((row) => {
    const importDate = cleanString(row.importDate, 120);
    if (!importDate) {
      return false;
    }
    if (!latestStoredDate) {
      return true;
    }
    return importDate > latestStoredDate;
  }).length;

  if (latestStoredDate && latestDate && latestDate < latestStoredDate) {
    warnings.push(
      `The source latest date (${latestDate}) is older than the latest stored DB date (${latestStoredDate}).`,
    );
  }

  const futureDatedRows = countFutureDatedRows(preview.rows);
  if (futureDatedRows > 0) {
    warnings.push(
      `${futureDatedRows} row(s) are future-dated compared with today and should be treated as test or explicitly confirmed before live sync.`,
    );
  }

  const dataQualityWarnings = Array.from(
    new Set([
      ...preview.rows.flatMap((row) => row.warnings),
      ...warnings.filter((warning) => warning.includes("older than") || warning.includes("future-dated")),
    ]),
  );

  const latestSourceRow = sortedImportableRows[0] ?? null;
  const latestSourceValue = latestSourceRow ? getPreviewRowValue(latestSourceRow, importType) : null;
  const canSave =
    preview.canImport &&
    !preview.missingColumns.length &&
    !!(
      suggestedSource.assetSlug ||
      suggestedSource.benchmarkSlug ||
      suggestedSource.schemeCode
    ) &&
    !mapping.requiresConfirmation;

  return {
    originalInput,
    detectedSourceType,
    assetType,
    importType,
    normalizedSourceUrl,
    normalizedSymbol,
    mapping,
    preview,
    latestDate,
    latestStoredDate,
    latestSourceValue,
    latestStoredValue,
    rowCount: preview.totalRows,
    rowsAvailable: importableRows.length,
    rowsReadyToImport: preview.validRows + preview.warningRows,
    rowsThatWillImport,
    duplicateRows: preview.duplicateRows,
    futureDatedRows,
    missingColumns: preview.missingColumns,
    warnings,
    dataQualityWarnings,
    duplicateSourceDetected: !!existingSource,
    existingSourceId: existingSource?.id ?? null,
    canSave,
    suggestedSource,
  };
}

export async function previewBulkMarketDataSources(csvText: string) {
  const parsed = parseCsvText(csvText);
  const headers = new Set(parsed.headers.map((header) => normalizeLower(header)));
  const requiredHeaders = ["source_type", "source_url", "symbol", "asset_slug", "timeframe"];
  const missingHeaders = requiredHeaders.filter((header) => !headers.has(header));
  if (missingHeaders.length) {
    throw new Error(`Missing required columns: ${missingHeaders.join(", ")}.`);
  }

  const rows = await Promise.all(
    parsed.rows.map(async (row, index) => {
      const warnings: string[] = [];
      const errors: string[] = [];
      const sourceType = parseSourceType(row.source_type);
      const sourceInput = cleanString(row.source_url, 2000);
      const assetSlug = cleanString(row.asset_slug, 160) || null;
      const symbol = cleanString(row.symbol, 160) || null;
      const timeframe = cleanString(row.timeframe, 40).toUpperCase() || "1D";

      if (!sourceInput) {
        errors.push("Source URL is required.");
      }

      let preview: MarketDataSourceWizardPreview | null = null;
      if (!errors.length) {
        try {
          preview = await previewMarketDataSourceCandidate({
            sourceInput: sourceInput || symbol || assetSlug || "",
            sourceType,
            assetType: assetSlug ? "stock" : "auto",
          });
        } catch (error) {
          errors.push(error instanceof Error ? error.message : "Could not preview this source.");
        }
      }

      const suggestedSource = preview
        ? {
            ...preview.suggestedSource,
            assetSlug: assetSlug || preview.suggestedSource.assetSlug,
            symbol: symbol || preview.suggestedSource.symbol,
            timeframe,
          }
        : null;

      if (!preview?.mapping?.mappedSlug && !assetSlug) {
        warnings.push("No confident asset mapping was found. Add asset_slug before saving.");
      }

      if (preview?.duplicateSourceDetected) {
        warnings.push("This source already exists in the registry and will be skipped during bulk save.");
      }

      return {
        rowNumber: index + 2,
        status: errors.length
          ? "failed"
          : warnings.length || preview?.mapping?.requiresConfirmation
            ? "warning"
            : "ready",
        sourceType: preview?.detectedSourceType ?? (sourceType === "auto" ? null : sourceType),
        assetType: preview?.assetType ?? null,
        normalizedSourceUrl: preview?.normalizedSourceUrl ?? null,
        normalizedSymbol: preview?.normalizedSymbol ?? symbol,
        mapping: preview?.mapping ?? null,
        existingSourceId: preview?.existingSourceId ?? null,
        duplicateSourceDetected: preview?.duplicateSourceDetected ?? false,
        warnings,
        errors,
        suggestedSource,
      } satisfies MarketDataSourceBulkPreviewRow;
    }),
  );

  return rows;
}
