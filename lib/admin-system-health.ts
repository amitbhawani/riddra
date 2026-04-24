import { formatBenchmarkLabel, getBenchmarkHistory } from "@/lib/benchmark-history";
import { getFunds, getFund, getStock, getStocks } from "@/lib/content";
import { hasDurableCmsStateStore } from "@/lib/cms-durable-state";
import { isProductionMode } from "@/lib/durable-data-runtime";
import { getAdminOperatorStore } from "@/lib/admin-operator-store";
import { getDurableFundHoldingSnapshots } from "@/lib/fund-holding-store";
import { getDurableFundSectorAllocationSnapshots } from "@/lib/fund-sector-allocation-store";
import { TRACKED_INDEX_SLUGS, getIndexSnapshot, getIndexSnapshots } from "@/lib/index-content";
import { getDurableIndexComponentSnapshots } from "@/lib/index-component-store";
import { getMarketOverview } from "@/lib/market-overview";
import { getDurableFundNavSnapshots } from "@/lib/market-data-durable-store";
import { getMediaStorageSummary } from "@/lib/media-storage";
import { getHostedRuntimeRequirements } from "@/lib/runtime-launch-config";
import { hasRuntimeSupabaseEnv } from "@/lib/runtime-launch-config";
import { getDurableStockFundamentalsEntries } from "@/lib/stock-fundamentals-store";
import { getDurableStockShareholdingEntries } from "@/lib/stock-shareholding-store";
import { createSupabaseReadClient } from "@/lib/supabase/admin";

type AdminHealthStatus = "healthy" | "warning" | "critical";
type AdminHealthTone = "info" | "warning" | "danger";

export type AdminHealthWarning = {
  id: string;
  tone: AdminHealthTone;
  message: string;
  href: string;
};

export type AdminHealthIssue = {
  id: string;
  title: string;
  status: AdminHealthStatus;
  affectedCount: number;
  summary: string;
  detail?: string;
  href?: string;
  examples?: string[];
};

export type AdminFlagshipPageHealth = {
  route: string;
  title: string;
  status: AdminHealthStatus;
  summary: string;
  warnings: string[];
};

export type AdminSystemHealthReport = {
  generatedAt: string;
  isProductionMode: boolean;
  usesDurableOperatorState: boolean;
  mediaStorage: ReturnType<typeof getMediaStorageSummary>;
  hostedRuntimeRequirements: ReturnType<typeof getHostedRuntimeRequirements>;
  stalePublishedRecordCount: number;
  staleDataLanes: AdminHealthIssue[];
  failedRefreshJobs: AdminHealthIssue[];
  missingCriticalRows: AdminHealthIssue[];
  globalStateChecks: AdminHealthIssue[];
  incompleteFlagshipPages: AdminFlagshipPageHealth[];
  warnings: AdminHealthWarning[];
};

const HEALTH_CACHE_TTL_MS = 60_000;
const FLAGSHIP_STOCK_SLUG = "tata-motors";
const FLAGSHIP_FUND_SLUG = "hdfc-mid-cap-opportunities";
const FLAGSHIP_INDEX_SLUG = "nifty50";
const CRITICAL_REFRESH_LANES = [
  "benchmark_history",
  "stock_fundamentals",
  "mutual_fund_nav_history",
  "index_composition",
] as const;

let cachedHealthReport:
  | {
      expiresAt: number;
      value: AdminSystemHealthReport;
    }
  | null = null;

function readCachedHealthReport() {
  if (!cachedHealthReport) {
    return null;
  }

  if (cachedHealthReport.expiresAt <= Date.now()) {
    cachedHealthReport = null;
    return null;
  }

  return cachedHealthReport.value;
}

async function safeRead<T>(fallback: T, reader: () => Promise<T>) {
  try {
    return await reader();
  } catch {
    return fallback;
  }
}

function statusFromMissing(total: number, missing: number): AdminHealthStatus {
  if (missing <= 0) {
    return "healthy";
  }

  if (total <= 0) {
    return "critical";
  }

  return missing / total >= 0.5 ? "critical" : "warning";
}

function summarizeExamples(values: string[], max = 4) {
  return values.slice(0, max);
}

function buildIssue(input: AdminHealthIssue) {
  return input;
}

function hasResolvedStatValue(
  stats: Array<{ label: string; value: string }>,
  label: string,
) {
  const value = stats.find((item) => item.label === label)?.value?.trim();

  if (!value) {
    return false;
  }

  return !/^Awaiting verified/i.test(value);
}

function hasResolvedStockFundamentals(
  stock:
    | Awaited<ReturnType<typeof getStock>>
    | Awaited<ReturnType<typeof getStocks>>[number]
    | null,
  fundamentalsBySlug: Set<string>,
) {
  if (!stock) {
    return false;
  }

  if (fundamentalsBySlug.has(stock.slug)) {
    return true;
  }

  if (!isProductionMode()) {
    return (
      hasResolvedStatValue(stock.stats, "Market Cap") &&
      hasResolvedStatValue(stock.stats, "ROE")
    );
  }

  return false;
}

function isMissingSchemaColumnError(error: unknown, table: string, column: string) {
  const detail = error instanceof Error ? error.message : String(error);
  return (
    detail.includes(`column ${table}.${column} does not exist`) ||
    detail.includes(`Could not find the '${column}' column`)
  );
}

async function getSchemaAlignmentIssues({
  flagshipStock,
  flagshipFund,
}: {
  flagshipStock: Awaited<ReturnType<typeof getStock>>;
  flagshipFund: Awaited<ReturnType<typeof getFund>>;
}): Promise<AdminHealthIssue[]> {
  if (!hasRuntimeSupabaseEnv()) {
    return [];
  }

  const supabase = createSupabaseReadClient();
  const issues: AdminHealthIssue[] = [];
  const stockMappingResolved = Boolean(flagshipStock?.sectorIndexSlug?.trim());
  const fundMappingResolved = Boolean(flagshipFund?.benchmarkIndexSlug?.trim());

  if (!isProductionMode()) {
    if (!stockMappingResolved) {
      issues.push(
        buildIssue({
          id: "stock-schema-alignment",
          title: "Stock data field alignment",
          status: "warning",
          affectedCount: 1,
          summary: "The flagship stock route still does not resolve a sector benchmark mapping.",
          detail: `Expected a usable sector comparison index for "${FLAGSHIP_STOCK_SLUG}" such as "nifty_auto".`,
          href: `/admin/content/stocks/${FLAGSHIP_STOCK_SLUG}`,
          examples: [FLAGSHIP_STOCK_SLUG],
        }),
      );
    }

    if (!fundMappingResolved) {
      issues.push(
        buildIssue({
          id: "fund-schema-alignment",
          title: "Mutual-fund data field alignment",
          status: "warning",
          affectedCount: 1,
          summary: "The flagship mutual-fund route still does not resolve a benchmark mapping.",
          detail: `Expected a usable benchmark index for "${FLAGSHIP_FUND_SLUG}" such as "niftymidcap150".`,
          href: `/admin/content/mutual-funds/${FLAGSHIP_FUND_SLUG}`,
          examples: [FLAGSHIP_FUND_SLUG],
        }),
      );
    }

    return issues;
  }

  try {
    const result = await supabase
      .from("instruments")
      .select("slug, sector_index_slug")
      .eq("instrument_type", "stock")
      .eq("slug", FLAGSHIP_STOCK_SLUG)
      .maybeSingle();

    if (result.error) {
      throw new Error(result.error.message);
    }

    if (!result.data) {
      issues.push(
        buildIssue({
          id: "stock-schema-alignment",
          title: "Stock data field alignment",
          status: "critical",
          affectedCount: 1,
          summary: "The flagship stock record is missing from the live stock database.",
          detail: `Expected instruments.slug = "${FLAGSHIP_STOCK_SLUG}" with a readable sector_index_slug.`,
          href: `/admin/content/stocks/${FLAGSHIP_STOCK_SLUG}`,
          examples: [FLAGSHIP_STOCK_SLUG],
        }),
      );
    } else if (!result.data.sector_index_slug?.trim()) {
      issues.push(
        buildIssue({
          id: "stock-schema-alignment",
          title: "Stock data field alignment",
          status: "warning",
          affectedCount: 1,
          summary: "The flagship stock record is still missing its saved sector benchmark mapping.",
          detail: `instruments.sector_index_slug is now the system-of-record field for sector benchmark mapping on "${FLAGSHIP_STOCK_SLUG}".`,
          href: `/admin/content/stocks/${FLAGSHIP_STOCK_SLUG}`,
          examples: [FLAGSHIP_STOCK_SLUG],
        }),
      );
    }
  } catch (error) {
    if (!(isMissingSchemaColumnError(error, "instruments", "sector_index_slug") && stockMappingResolved)) {
      issues.push(
        buildIssue({
          id: "stock-schema-alignment",
          title: "Stock data field alignment",
          status: isMissingSchemaColumnError(error, "instruments", "sector_index_slug")
            ? "critical"
            : "warning",
          affectedCount: 1,
          summary: isMissingSchemaColumnError(error, "instruments", "sector_index_slug")
            ? "The live stock database is missing the saved sector benchmark field."
            : "The stock database-field check could not verify the sector benchmark field cleanly.",
          detail: error instanceof Error ? error.message : String(error),
          href: `/admin/content/stocks/${FLAGSHIP_STOCK_SLUG}`,
          examples: [FLAGSHIP_STOCK_SLUG],
        }),
      );
    }
  }

  try {
    const result = await supabase
      .from("mutual_funds")
      .select("slug, benchmark_index_slug")
      .eq("slug", FLAGSHIP_FUND_SLUG)
      .maybeSingle();

    if (result.error) {
      throw new Error(result.error.message);
    }

    if (!result.data) {
      issues.push(
        buildIssue({
          id: "fund-schema-alignment",
          title: "Mutual-fund data field alignment",
          status: "critical",
          affectedCount: 1,
          summary: "The flagship mutual-fund record is missing from the live fund database.",
          detail: `Expected mutual_funds.slug = "${FLAGSHIP_FUND_SLUG}" with a readable benchmark_index_slug.`,
          href: `/admin/content/mutual-funds/${FLAGSHIP_FUND_SLUG}`,
          examples: [FLAGSHIP_FUND_SLUG],
        }),
      );
    } else if (!result.data.benchmark_index_slug?.trim()) {
      issues.push(
        buildIssue({
          id: "fund-schema-alignment",
          title: "Mutual-fund data field alignment",
          status: "warning",
          affectedCount: 1,
          summary: "The flagship mutual-fund record is still missing its saved benchmark mapping.",
          detail: `mutual_funds.benchmark_index_slug is now the system-of-record field for benchmark mapping on "${FLAGSHIP_FUND_SLUG}".`,
          href: `/admin/content/mutual-funds/${FLAGSHIP_FUND_SLUG}`,
          examples: [FLAGSHIP_FUND_SLUG],
        }),
      );
    }
  } catch (error) {
    if (
      !(isMissingSchemaColumnError(error, "mutual_funds", "benchmark_index_slug") && fundMappingResolved)
    ) {
      issues.push(
        buildIssue({
          id: "fund-schema-alignment",
          title: "Mutual-fund data field alignment",
          status: isMissingSchemaColumnError(error, "mutual_funds", "benchmark_index_slug")
            ? "critical"
            : "warning",
          affectedCount: 1,
          summary: isMissingSchemaColumnError(error, "mutual_funds", "benchmark_index_slug")
            ? "The live fund database is missing the saved benchmark field."
            : "The fund database-field check could not verify the benchmark field cleanly.",
          detail: error instanceof Error ? error.message : String(error),
          href: `/admin/content/mutual-funds/${FLAGSHIP_FUND_SLUG}`,
          examples: [FLAGSHIP_FUND_SLUG],
        }),
      );
    }
  }

  return issues;
}

async function buildHealthReport(): Promise<AdminSystemHealthReport> {
  const generatedAt = new Date().toISOString();
  const [
    operatorStore,
    stocks,
    funds,
    indexSnapshots,
    flagshipStock,
    flagshipFund,
    flagshipIndex,
    marketOverview,
    fundamentalsEntries,
    shareholdingEntries,
    holdingSnapshots,
    allocationSnapshots,
    indexComponentSnapshots,
  ] = await Promise.all([
    getAdminOperatorStore(),
    safeRead([], () => getStocks()),
    safeRead([], () => getFunds()),
    safeRead([], () => getIndexSnapshots()),
    safeRead(null, () => getStock(FLAGSHIP_STOCK_SLUG)),
    safeRead(null, () => getFund(FLAGSHIP_FUND_SLUG)),
    safeRead(null, () => getIndexSnapshot(FLAGSHIP_INDEX_SLUG)),
    safeRead(
      {
        stats: [],
        discovery: [],
        topGainers: [],
        topLosers: [],
        topFundIdeas: [],
        topIpos: [],
        sectorPerformance: [],
      },
      () => getMarketOverview(),
    ),
    safeRead([], () => getDurableStockFundamentalsEntries()),
    safeRead([], () => getDurableStockShareholdingEntries()),
    safeRead([], () => getDurableFundHoldingSnapshots()),
    safeRead([], () => getDurableFundSectorAllocationSnapshots()),
    safeRead([], () => getDurableIndexComponentSnapshots()),
  ]);

  const schemaAlignmentIssues = await safeRead([], () =>
    getSchemaAlignmentIssues({
      flagshipStock,
      flagshipFund,
    }),
  );

  const benchmarkCandidates = new Set<string>(TRACKED_INDEX_SLUGS);
  for (const stock of stocks) {
    if (stock.sectorIndexSlug) {
      benchmarkCandidates.add(stock.sectorIndexSlug);
    }
  }
  for (const fund of funds) {
    if (fund.benchmarkIndexSlug) {
      benchmarkCandidates.add(fund.benchmarkIndexSlug);
    }
  }

  const benchmarkHistoryRows = await Promise.all(
    [...benchmarkCandidates].map(async (slug) => ({
      slug,
      rows: await safeRead([], () => getBenchmarkHistory(slug)),
    })),
  );
  const missingBenchmarkHistory = benchmarkHistoryRows.filter((item) => item.rows.length < 2);

  const navBatch = await safeRead(
    {
      snapshots: new Map<string, unknown>(),
      readFailures: new Map<string, Error>(),
    },
    () => getDurableFundNavSnapshots(funds.map((fund) => fund.slug)),
  );
  const missingNavFunds = funds.filter(
    (fund) => navBatch.readFailures.has(fund.slug) || !navBatch.snapshots.has(fund.slug),
  );

  const fundamentalsBySlug = new Set(fundamentalsEntries.map((entry) => entry.slug));
  const shareholdingBySlug = new Set(shareholdingEntries.map((entry) => entry.slug));
  const missingFundamentalStocks = stocks.filter(
    (stock) => !hasResolvedStockFundamentals(stock, fundamentalsBySlug),
  );

  const holdingsByFund = new Set(holdingSnapshots.map((snapshot) => snapshot.fundSlug));
  const allocationsByFund = new Set(allocationSnapshots.map((snapshot) => snapshot.fundSlug));
  const indexCompositionBySlug = new Set(indexComponentSnapshots.map((snapshot) => snapshot.indexSlug));
  const missingFundComposition = funds.filter(
    (fund) => !holdingsByFund.has(fund.slug) && !allocationsByFund.has(fund.slug),
  );
  const missingIndexComposition = TRACKED_INDEX_SLUGS.filter(
    (slug) => !indexCompositionBySlug.has(slug),
  );

  const globalStateChecks: AdminHealthIssue[] = [
    ...schemaAlignmentIssues,
    buildIssue({
      id: "benchmark-history",
      title: "Benchmark history coverage",
      status: statusFromMissing(benchmarkHistoryRows.length, missingBenchmarkHistory.length),
      affectedCount: missingBenchmarkHistory.length,
      summary:
        missingBenchmarkHistory.length > 0
          ? `${missingBenchmarkHistory.length} tracked benchmark lanes are still missing retained history.`
          : "Tracked benchmark history is present for the core public benchmark set.",
      detail: "This check covers tracked index routes plus benchmark links used by stock and fund detail pages.",
      href: "/admin/refresh-jobs",
      examples: summarizeExamples(
        missingBenchmarkHistory.map((item) => formatBenchmarkLabel(item.slug) || item.slug),
      ),
    }),
    buildIssue({
      id: "nav-history",
      title: "Mutual-fund NAV history coverage",
      status: statusFromMissing(funds.length, missingNavFunds.length),
      affectedCount: missingNavFunds.length,
      summary:
        missingNavFunds.length > 0
          ? `${missingNavFunds.length} tracked mutual-fund routes are missing durable NAV history.`
          : "Tracked mutual-fund routes have durable NAV coverage.",
      detail: "This checks the durable NAV snapshot lane that powers current NAV and return continuity.",
      href: "/admin/refresh-jobs",
      examples: summarizeExamples(missingNavFunds.map((fund) => fund.name)),
    }),
    buildIssue({
      id: "stock-fundamentals",
      title: "Stock fundamentals coverage",
      status: statusFromMissing(stocks.length, missingFundamentalStocks.length),
      affectedCount: missingFundamentalStocks.length,
      summary:
        missingFundamentalStocks.length > 0
          ? `${missingFundamentalStocks.length} tracked stock routes are missing durable fundamentals.`
          : "Tracked stock routes have durable fundamentals coverage.",
      detail: "This checks the fundamentals lane that powers public fundamentals cards and operator source truth.",
      href: "/admin/refresh-jobs",
      examples: summarizeExamples(missingFundamentalStocks.map((stock) => stock.name)),
    }),
    buildIssue({
      id: "composition",
      title: "Composition coverage",
      status: statusFromMissing(
        funds.length + TRACKED_INDEX_SLUGS.length,
        missingFundComposition.length + missingIndexComposition.length,
      ),
      affectedCount: missingFundComposition.length + missingIndexComposition.length,
      summary:
        missingFundComposition.length + missingIndexComposition.length > 0
          ? `${missingFundComposition.length + missingIndexComposition.length} tracked fund or index routes are missing composition coverage.`
          : "Tracked fund and index routes have composition coverage.",
      detail: "This checks fund holdings/allocation and tracked index component composition snapshots.",
      href: "/admin/refresh-jobs",
      examples: summarizeExamples([
        ...missingFundComposition.map((fund) => fund.name),
        ...missingIndexComposition.map((slug) => formatBenchmarkLabel(slug)),
      ]),
    }),
  ];

  const staleDataLanes = globalStateChecks.filter((item) => item.status !== "healthy");
  const failedRefreshJobs = operatorStore.refreshJobs
    .filter((job) => job.latestStatus === "failed")
    .map((job) =>
      buildIssue({
        id: job.key,
        title: job.name,
        status: "critical",
        affectedCount: job.affectedRecordsCount ?? 0,
        summary: job.latestError || "This refresh lane is currently failing.",
        detail: `${job.family} / ${job.lane}`,
        href: "/admin/refresh-jobs",
        examples: summarizeExamples([job.sourceDependency]),
      }),
    );

  const criticalJobMap = new Map(operatorStore.refreshJobs.map((job) => [job.key, job]));
  const missingCriticalRows: AdminHealthIssue[] = [];

  if (!flagshipStock) {
    missingCriticalRows.push(
      buildIssue({
        id: "missing-flagship-stock",
        title: "Flagship stock route record missing",
        status: "critical",
        affectedCount: 1,
        summary: "The Tata Motors public stock route could not be resolved from the current content/runtime state.",
        href: "/admin/content/stocks",
        examples: ["/stocks/tata-motors"],
      }),
    );
  }

  if (!flagshipFund) {
    missingCriticalRows.push(
      buildIssue({
        id: "missing-flagship-fund",
        title: "Flagship mutual-fund route record missing",
        status: "critical",
        affectedCount: 1,
        summary: "The HDFC Mid-Cap Opportunities public fund route could not be resolved from the current content/runtime state.",
        href: "/admin/content/mutual-funds",
        examples: ["/mutual-funds/hdfc-mid-cap-opportunities"],
      }),
    );
  }

  if (!flagshipIndex) {
    missingCriticalRows.push(
      buildIssue({
        id: "missing-flagship-index",
        title: "Flagship index route record missing",
        status: "critical",
        affectedCount: 1,
        summary: "The Nifty 50 public benchmark route could not be resolved from the current content/runtime state.",
        href: "/admin/content/indices",
        examples: ["/nifty50"],
      }),
    );
  }

  for (const key of CRITICAL_REFRESH_LANES) {
    if (!criticalJobMap.has(key)) {
      missingCriticalRows.push(
        buildIssue({
          id: `missing-job-${key}`,
          title: "Critical refresh lane missing",
          status: "critical",
          affectedCount: 1,
          summary: `The ${key.replaceAll("_", " ")} refresh lane is missing from the operator registry.`,
          href: "/admin/refresh-jobs",
          examples: [key],
        }),
      );
    }
  }

  if (isProductionMode() && !hasDurableCmsStateStore()) {
    missingCriticalRows.push(
      buildIssue({
        id: "missing-durable-operator-store",
        title: "Durable operator state unavailable in production mode",
        status: "critical",
        affectedCount: 1,
        summary: "Production mode is active but the durable CMS admin store is unavailable, so JSON fallback would be unsafe.",
        href: "/admin/settings",
        examples: ["Supabase admin environment missing"],
      }),
    );
  }

  const benchmarkRowsBySlug = new Map(
    benchmarkHistoryRows.map((item) => [item.slug, item.rows.length]),
  );
  const incompleteFlagshipPages: AdminFlagshipPageHealth[] = [];

  const stockWarnings: string[] = [];
  if (flagshipStock) {
    const benchmarkSlug = flagshipStock.sectorIndexSlug || "nifty50";
    if ((benchmarkRowsBySlug.get(benchmarkSlug) ?? 0) < 2) {
      stockWarnings.push(`Benchmark history is missing for ${formatBenchmarkLabel(benchmarkSlug)}.`);
    }
    if (!hasResolvedStockFundamentals(flagshipStock, fundamentalsBySlug)) {
      stockWarnings.push("Durable fundamentals coverage is missing.");
    }
    if (!shareholdingBySlug.has(flagshipStock.slug)) {
      stockWarnings.push("Durable shareholding coverage is missing.");
    }
  } else {
    stockWarnings.push("The public route does not currently resolve.");
  }
  incompleteFlagshipPages.push({
    route: "/stocks/tata-motors",
    title: "Stock detail · Tata Motors",
    status: !flagshipStock ? "critical" : stockWarnings.length >= 2 ? "critical" : stockWarnings.length ? "warning" : "healthy",
    summary:
      stockWarnings.length > 0
        ? stockWarnings.join(" ")
        : "Core stock route is resolving with benchmark, fundamentals, and shareholding support.",
    warnings: stockWarnings,
  });

  const fundWarnings: string[] = [];
  if (flagshipFund) {
    const benchmarkSlug = flagshipFund.benchmarkIndexSlug || "";
    if (benchmarkSlug && (benchmarkRowsBySlug.get(benchmarkSlug) ?? 0) < 2) {
      fundWarnings.push(`Benchmark history is missing for ${formatBenchmarkLabel(benchmarkSlug)}.`);
    }
    if (missingNavFunds.some((fund) => fund.slug === flagshipFund.slug)) {
      fundWarnings.push("Durable NAV history is missing.");
    }
    if (
      !holdingsByFund.has(flagshipFund.slug) &&
      !allocationsByFund.has(flagshipFund.slug)
    ) {
      fundWarnings.push("Holdings and sector-allocation composition are both missing.");
    }
  } else {
    fundWarnings.push("The public route does not currently resolve.");
  }
  incompleteFlagshipPages.push({
    route: "/mutual-funds/hdfc-mid-cap-opportunities",
    title: "Mutual-fund detail · HDFC Mid-Cap Opportunities",
    status: !flagshipFund ? "critical" : fundWarnings.length >= 2 ? "critical" : fundWarnings.length ? "warning" : "healthy",
    summary:
      fundWarnings.length > 0
        ? fundWarnings.join(" ")
        : "Core fund route is resolving with NAV, benchmark, and composition support.",
    warnings: fundWarnings,
  });

  const indexWarnings: string[] = [];
  if (flagshipIndex) {
    if (!flagshipIndex.historyBars?.length) {
      indexWarnings.push("Benchmark history bars are missing.");
    }
    if (!flagshipIndex.compositionMeta || flagshipIndex.components.length === 0) {
      indexWarnings.push("Index composition support is missing.");
    }
  } else {
    indexWarnings.push("The public route does not currently resolve.");
  }
  incompleteFlagshipPages.push({
    route: "/nifty50",
    title: "Index detail · Nifty 50",
    status: !flagshipIndex ? "critical" : indexWarnings.length >= 2 ? "critical" : indexWarnings.length ? "warning" : "healthy",
    summary:
      indexWarnings.length > 0
        ? indexWarnings.join(" ")
        : "Core index route is resolving with history and composition support.",
    warnings: indexWarnings,
  });

  const marketsWarnings: string[] = [];
  if (indexSnapshots.length < 3) {
    marketsWarnings.push("Less than three tracked benchmark snapshots are currently resolving.");
  }
  if (marketOverview.topGainers.length === 0 || marketOverview.topLosers.length === 0) {
    marketsWarnings.push("Market movers are currently thin or empty.");
  }
  if (marketOverview.sectorPerformance.length === 0) {
    marketsWarnings.push("Sector-performance support is missing.");
  }
  incompleteFlagshipPages.push({
    route: "/markets",
    title: "Markets overview",
    status: marketsWarnings.length >= 2 ? "critical" : marketsWarnings.length ? "warning" : "healthy",
    summary:
      marketsWarnings.length > 0
        ? marketsWarnings.join(" ")
        : "Markets overview is resolving with benchmark, mover, and sector support.",
    warnings: marketsWarnings,
  });

  const stalePublishedRecordCount = operatorStore.records.filter(
    (record) =>
      record.status === "published" &&
      record.visibility === "public" &&
      ["stale", "overdue"].includes(record.sourceState.freshnessState),
  ).length;

  const warnings: AdminHealthWarning[] = [];

  if (failedRefreshJobs.length > 0) {
    warnings.push({
      id: "failed-refresh-jobs",
      tone: "danger",
      message: `${failedRefreshJobs.length} refresh job${failedRefreshJobs.length === 1 ? "" : "s"} failing.`,
      href: "/admin/refresh-jobs",
    });
  }

  if (staleDataLanes.length > 0 || stalePublishedRecordCount > 0) {
    warnings.push({
      id: "stale-data",
      tone: "warning",
      message:
        stalePublishedRecordCount > 0
          ? `${stalePublishedRecordCount} published record${stalePublishedRecordCount === 1 ? "" : "s"} show stale source freshness.`
          : `${staleDataLanes.length} tracked data lane${staleDataLanes.length === 1 ? "" : "s"} need attention.`,
      href: "/admin/system-health",
    });
  }

  const incompleteFlagshipCount = incompleteFlagshipPages.filter(
    (item) => item.status !== "healthy",
  ).length;
  if (incompleteFlagshipCount > 0) {
    warnings.push({
      id: "incomplete-flagship-pages",
      tone: "warning",
      message: `${incompleteFlagshipCount} flagship page${incompleteFlagshipCount === 1 ? "" : "s"} still have incomplete data.`,
      href: "/admin/system-health",
    });
  }

  return {
    generatedAt,
    isProductionMode: isProductionMode(),
    usesDurableOperatorState: hasDurableCmsStateStore(),
    mediaStorage: getMediaStorageSummary(),
    hostedRuntimeRequirements: getHostedRuntimeRequirements(),
    stalePublishedRecordCount,
    staleDataLanes,
    failedRefreshJobs,
    missingCriticalRows,
    globalStateChecks,
    incompleteFlagshipPages,
    warnings,
  };
}

export async function getAdminSystemHealthReport() {
  const cached = readCachedHealthReport();
  if (cached) {
    return cached;
  }

  const value = await buildHealthReport();
  cachedHealthReport = {
    value,
    expiresAt: Date.now() + HEALTH_CACHE_TTL_MS,
  };
  return value;
}

export async function getAdminSystemWarnings() {
  return (await getAdminSystemHealthReport()).warnings;
}
