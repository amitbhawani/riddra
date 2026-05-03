import type { Metadata } from "next";

import {
  AdminActionLink,
  AdminBadge,
  AdminPageFrame,
  AdminPageHeader,
  AdminSectionCard,
} from "@/components/admin/admin-primitives";
import { AdminImportControlCenterClient } from "@/components/admin/admin-import-control-center-client";
import {
  getAdminImportControlCenterOverviewData,
  type AdminImportControlCenterData,
} from "@/lib/admin-import-control-center";
import { requireOperator } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Yahoo Import Control Center",
  description:
    "Executive overview of Yahoo import coverage, safety, quality, activity, and safe operator actions.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function createEmptyData(errorMessage?: string): AdminImportControlCenterData {
  return {
    projectStatus: {
      totalActiveStocks: 0,
      stocksWithHistoricalData: 0,
      stocksWithLatestSnapshot: 0,
      stocksWithValuationData: 0,
      stocksWithFinancialStatements: 0,
      overallImportCompletionPercentage: 0,
    },
    dataSourceStatus: [
      {
        label: "Yahoo historical",
        status: "active",
        summary: "Active",
        note: "Daily chart and OHLCV history imports are the live durable Yahoo lane.",
      },
      {
        label: "Yahoo quote/statistics",
        status: "degraded",
        summary: "Degraded snapshot-only mode",
        note: "Latest snapshot can stay live even while valuation and statistics modules are partially blocked.",
      },
      {
        label: "Yahoo financial statements",
        status: "disabled",
        summary: "Disabled for batch",
        note: "Batch financial statements remain intentionally disabled because Yahoo still blocks those protected modules.",
      },
      {
        label: "NSE provider lane",
        status: "future",
        summary: "Not active",
        note: "NSE stays as a backup or future lane and is not part of the current live Yahoo batch rollout.",
      },
    ],
    importSafetyStatus: {
      currentThrottle: "1 req/sec cap · 0/1 workers active",
      requestsThisHour: 0,
      requestsToday: 0,
      cooldownStatus: "No cooldown active",
      concurrentWorkerSetting: "0/1 active workers",
      disabledModules: ["financial_statements: manual_single_stock_only"],
      savedRequestsAvoided: 0,
      existingDataReused: 0,
      latestBatchStatus: "not_started",
      lastYahooError: null,
    },
    dataQuality: {
      historicalRowsCount: 0,
      snapshotRowsCount: 0,
      missingModulesCount: 0,
      warningCount: 0,
      errorCount: 0,
      reconciliationPassCount: 0,
      reconciliationFailCount: 0,
      averageDataQualityScore: 0,
      stocksAbove75: 0,
      stocksBelow50: 0,
      missingSnapshotCount: 0,
      scoreModelNote:
        "Data quality score is price-data-focused for now: historical prices, latest snapshot, limited valuation signal, limited financials signal, and recent error posture.",
      worstStocks: [],
    },
    recentActivity: {
      latestEvents: [],
      latestFailedImports: [],
      latestSkippedImports: [],
      latestReusedDataEvents: [],
    },
    systemHealthMonitor: {
      importHealth: {
        lastSuccessfulJobTime: null,
        lastFailedJobTime: null,
        totalJobsToday: 0,
        totalFailuresToday: 0,
        failureRatePercentage: 0,
      },
      dataHealth: {
        stocksWithFullHistoricalData: 0,
        stocksMissingRecentUpdates: 0,
        stocksWithStaleSnapshot: 0,
        stocksWithRepeatedWarnings: 0,
      },
      systemLoad: {
        requestsLastHour: 0,
        requestsToday: 0,
        currentThrottleRate: "1 req/sec cap · 0/1 workers active",
        currentWorkerCount: "0/1",
      },
      alerts: [
        {
          key: "yahoo_cooldown_active",
          label: "Yahoo cooldown active",
          status: "green",
          active: false,
          detail: "No Yahoo cooldown is active right now.",
        },
        {
          key: "abnormal_error_spike",
          label: "Abnormal error spike",
          status: "green",
          active: false,
          detail: "No durable import error spike is currently visible.",
        },
        {
          key: "missing_updates_spike",
          label: "Missing updates spike",
          status: "green",
          active: false,
          detail: "No missing-update spike can be confirmed in fallback mode.",
        },
        {
          key: "db_write_failures",
          label: "DB write failures",
          status: "green",
          active: false,
          detail: "No durable write-failure signal is visible in fallback mode.",
        },
      ],
      durableAlerts: [],
      quarantine: {
        activeRowCount: 0,
        affectedStockCount: 0,
        latestReason: null,
        rows: [],
      },
      freshness: {
        staleStockCount: 0,
        acceptedExceptionCount: 0,
        checkedAt: null,
        staleStocks: [],
        acceptedExceptions: [],
        reasonCounts: {
          fresh: 0,
          stale_missing_price: 0,
          stale_missing_snapshot: 0,
          provider_no_data: 0,
          provider_lag: 0,
          market_not_closed: 0,
          holiday_or_weekend: 0,
          symbol_issue: 0,
        },
        expectedTradingDate: null,
        evaluationDate: null,
        source: "runtime_fallback",
      },
      indicators: {
        ingestion: "yellow",
        dataFreshness: "yellow",
        errorRate: "yellow",
      },
    },
    productionReadiness: {
      checklist: [
        {
          key: "historical_coverage_complete",
          label: "Historical coverage complete",
          status: "in_progress",
          summary: "In Progress",
          detail: "Durable coverage data is not available in this fallback state.",
        },
        {
          key: "snapshot_coverage_complete",
          label: "Snapshot coverage complete",
          status: "in_progress",
          summary: "In Progress",
          detail: "Durable snapshot coverage data is not available in this fallback state.",
        },
        {
          key: "data_quality_generated",
          label: "Data quality generated",
          status: "in_progress",
          summary: "In Progress",
          detail: "Durable quality summary data is not available in this fallback state.",
        },
        {
          key: "daily_update_cli_working",
          label: "Daily update CLI working",
          status: "degraded",
          summary: "Degraded",
          detail: "The control center fallback cannot verify the latest CLI execution state.",
        },
        {
          key: "cron_enabled_or_disabled",
          label: "Cron enabled or disabled",
          status: "complete",
          summary: "Enabled",
          detail: "Yahoo strict same-day-only cron is enabled for the post-close lane and retry window.",
        },
        {
          key: "yahoo_protected_modules_disabled",
          label: "Yahoo protected modules disabled",
          status: "complete",
          summary: "Complete",
          detail: "Protected Yahoo fundamentals remain intentionally disabled for batch use.",
        },
        {
          key: "last_import_job_status",
          label: "Last import job status",
          status: "degraded",
          summary: "Unknown",
          detail: "The fallback state could not confirm the latest durable daily update job outcome.",
        },
        {
          key: "recent_errors",
          label: "Recent errors",
          status: "degraded",
          summary: "Unknown",
          detail: "The fallback state could not confirm recent durable import error pressure.",
        },
      ],
      latestDailyUpdateJobStatus: "unknown",
      recentErrorCount: 0,
      cronStatus: "enabled",
      lastCronRunTime: null,
      lastCronResult: "scheduled",
      activeCronJobProgress: null,
      currentRecommendation: "Not Ready",
      recommendationNote:
        "The control center is in fallback mode, so production readiness cannot be confirmed from durable import state.",
    },
    statusLegend: [
      {
        key: "complete",
        label: "Complete",
        explanation: "This lane is healthy right now and does not need more migration work before normal use.",
      },
      {
        key: "in_progress",
        label: "In Progress",
        explanation: "This lane is working, but more imports or coverage expansion are still needed before it is considered complete.",
      },
      {
        key: "degraded",
        label: "Degraded",
        explanation: "This lane has a safe fallback, but some upstream Yahoo data is blocked or incomplete so the result is only partially complete.",
      },
      {
        key: "disabled_by_design",
        label: "Disabled by Design",
        explanation: "This lane is intentionally disabled in batch mode to prevent repeated Yahoo failures, request waste, and noisy broken imports.",
      },
      {
        key: "needs_migration",
        label: "Needs Migration",
        explanation: "This lane still depends on an older data model or route layer, so it must be migrated before legacy data can be safely removed.",
      },
    ],
    whatNeedsFixingNext: [
      {
        key: "historical_prices",
        label: "Historical prices",
        status: "complete",
        summary: "Complete and healthy.",
        detail: "Historical prices are the healthiest Yahoo lane and are already the durable baseline for the stock universe.",
      },
      {
        key: "latest_snapshots",
        label: "Latest snapshots",
        status: "in_progress",
        summary: "Partially complete, action needed to import missing snapshots.",
        detail: "Snapshot imports are still mid-rollout, so operators should keep using the safe missing-snapshot refresh flow.",
      },
      {
        key: "yahoo_protected_fundamentals",
        label: "Yahoo protected fundamentals",
        status: "disabled_by_design",
        summary: "Disabled for batch due to Yahoo 401 and 429 behavior.",
        detail: "Protected fundamentals should stay out of batch mode until a reliable upstream path exists.",
      },
      {
        key: "valuation_share_highlights",
        label: "Valuation, share statistics, and financial highlights",
        status: "degraded",
        summary: "Not reliable from Yahoo currently.",
        detail: "Pilot data can exist, but it should not be treated as broad reliable coverage yet.",
      },
      {
        key: "financial_statements",
        label: "Financial statements",
        status: "disabled_by_design",
        summary: "Manual single-stock test only.",
        detail: "Batch financial statements remain intentionally disabled while Yahoo blocks that lane.",
      },
      {
        key: "canonical_stock_universe",
        label: "Canonical stock universe",
        status: "complete",
        summary: "stocks_master is now the import source of truth.",
        detail: "New imports should anchor to stocks_master rather than older ad hoc stock sets.",
      },
      {
        key: "legacy_instruments_layer",
        label: "Legacy instruments layer",
        status: "needs_migration",
        summary: "Still used by public stock pages and must not be deleted yet.",
        detail: "Legacy route dependencies must be migrated first so cleanup does not break public stock pages.",
      },
    ],
    progressByModule: [],
    actionScope: {
      safeDryRunSymbol: "RELIANCE.NS",
      boundedWorkerSlice: 10,
      missingHistoricalStocks: 0,
      snapshotRefreshStocks: 0,
      retrySafeModuleStocks: 0,
    },
    dashboard: {
      summary: {
        totalStocks: 0,
        stocksWithHistoricalDataCompleted: 0,
        stocksWithLatestSnapshotCompleted: 0,
        stocksWithValuationDataCompleted: 0,
        stocksWithFinancialsCompleted: 0,
        failedImports: 0,
        pendingImports: 0,
        lastSuccessfulImportDate: null,
      },
      yahooOperations: {
        latestBatchStatus: "not_started",
        currentRequestPace: "1 req/sec cap · 0/1 workers active",
        requestsUsedCurrentHour: 0,
        maxRequestsPerHour: 2000,
        requestsUsedToday: 0,
        maxRequestsPerDay: 15000,
        savedRequestsAvoided: 0,
        existingDataReused: 0,
        skipBreakdown: {
          skippedExistingHistory: 0,
          skippedExistingSnapshot: 0,
          skippedBlockedModule: 0,
          skippedDuplicateRawResponse: 0,
        },
        disabledModules: {
          financial_statements: "manual_single_stock_only",
        },
        cooldownStatus: "No cooldown active",
        cooldownUntil: null,
        lastYahooError: null,
        activeWorkers: 0,
        maxConcurrentWorkers: 1,
      },
      stocks: [],
      latestActivity: [],
      pagination: {
        offset: 0,
        limit: 0,
        total: 0,
        hasMore: false,
      },
      warnings: errorMessage ? [errorMessage] : [],
    },
    warnings: errorMessage ? [errorMessage] : [],
  };
}

export default async function AdminImportControlCenterPage() {
  await requireOperator();

  let data = createEmptyData();
  try {
    const overview = await getAdminImportControlCenterOverviewData();
    data = {
      ...data,
      projectStatus: overview.projectStatus,
      importSafetyStatus: overview.importSafetyStatus,
      dataQuality: overview.dataQuality,
      recentActivity: overview.recentActivity,
      systemHealthMonitor: overview.systemHealthMonitor,
      productionReadiness: overview.productionReadiness,
      progressByModule: overview.progressByModule,
      warnings: overview.warnings,
    };
  } catch (error) {
    data = createEmptyData(
      error instanceof Error
        ? error.message
        : "The Yahoo import control center could not load durable data right now.",
    );
  }

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Market Data Ops", href: "/admin/market-data" },
          { label: "Import control center", href: "/admin/market-data/import-control-center" },
        ]}
        eyebrow="Yahoo executive overview"
        title="Yahoo Import Control Center"
        description="This is the fast executive view for Yahoo import readiness, coverage, safety, activity, and safe operator actions. It does not auto-run imports on load."
        actions={
          <>
            <AdminActionLink href="/admin/market-data" label="Back to market data ops" />
            <AdminActionLink href="/admin/market-data/stocks" label="Open stock import dashboard" />
            <AdminActionLink href="/admin/market-data/yahoo-import-guide" label="Open Yahoo guide" />
          </>
        }
      />

      <AdminSectionCard
        title="What this page is for"
        description="Use this page when you need one honest snapshot of the whole Yahoo import project before deciding whether to run a safe action, open the full dashboard, or pause because the fundamentals lane is still degraded."
      >
        <div className="grid gap-3 xl:grid-cols-3">
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
            <p className="text-sm font-semibold text-[#111827]">Project status</p>
            <p className="mt-1 text-sm leading-6 text-[#4b5563]">
              Active-stock coverage, historical completion, snapshot readiness, valuation truth, and financial-statement completion are summarized here first.
            </p>
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
            <p className="text-sm font-semibold text-[#111827]">Safety and quality</p>
            <p className="mt-1 text-sm leading-6 text-[#4b5563]">
              Throttle, request budget, cooldown, warnings, errors, reconciliation, and reuse signals stay visible so import volume never outruns safety.
            </p>
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-[#111827]">Intentional batch limit</p>
              <AdminBadge label="Financial statements disabled for batch" tone="warning" />
            </div>
            <p className="mt-1 text-sm leading-6 text-[#4b5563]">
              The control center keeps the upstream truth visible: history is active, quote/statistics is snapshot-safe but degraded, and financial statements stay manual single-stock only.
            </p>
          </div>
        </div>
      </AdminSectionCard>

      <AdminImportControlCenterClient data={data} />
    </AdminPageFrame>
  );
}
