import type { Metadata } from "next";

import {
  AdminActionLink,
  AdminPageFrame,
  AdminPageHeader,
  AdminSectionCard,
} from "@/components/admin/admin-primitives";
import { AdminStockImportDashboardClient } from "@/components/admin/admin-stock-import-dashboard-client";
import {
  getAdminStockImportDashboardData,
  type AdminStockImportDashboardData,
} from "@/lib/admin-stock-import-dashboard";
import { requireOperator } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Stock Import Dashboard",
  description:
    "Monitor Yahoo stock import coverage, failures, and missing fields for every imported Riddra stock.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminMarketDataStocksPage() {
  await requireOperator();

  let initialData: AdminStockImportDashboardData = {
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
      limit: 50,
      total: 0,
      hasMore: false,
    },
    warnings: [],
  };

  try {
    initialData = await getAdminStockImportDashboardData({
      stockOffset: 0,
      stockLimit: 50,
      includeStockRows: true,
    });
  } catch (error) {
    initialData = {
      ...initialData,
      warnings: [
        error instanceof Error
          ? error.message
          : "The durable stock import dashboard could not be loaded right now.",
      ],
    };
  }

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Market Data Ops", href: "/admin/market-data" },
          { label: "Stock Imports", href: "/admin/market-data/stocks" },
        ]}
        eyebrow="Yahoo stock import desk"
        title="Stock Import Dashboard"
        description="Track which stocks have full Yahoo historical, snapshot, valuation, and financial coverage. Run one stock, selected stocks, or the full pending queue from here."
        actions={
          <>
            <AdminActionLink href="/admin/market-data" label="Back to market data ops" />
            <AdminActionLink href="/admin/market-data/import-control-center" label="Import control center" />
            <AdminActionLink href="/admin/market-data/sources" label="Open source registry" />
            <AdminActionLink href="/admin/market-data/yahoo-import-guide" label="Yahoo import guide" />
            <AdminActionLink href="/admin/activity-log" label="Activity log" />
          </>
        }
      />

      <AdminSectionCard
        title="How this dashboard works"
        description="Import progress is derived from durable Yahoo job, coverage, snapshot, valuation, and financial statement tables."
      >
        <div className="grid gap-3 xl:grid-cols-4">
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Coverage</p>
            <p className="mt-1 text-[13px] leading-5 text-[#4b5563]">
              Historical prices, latest snapshot, valuation, and financials each contribute to the stock-level import percentage.
            </p>
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Bulk actions</p>
            <p className="mt-1 text-[13px] leading-5 text-[#4b5563]">
              Use selected rows, all pending stocks, or failed stocks without calling any POST API manually.
            </p>
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Missing fields</p>
            <p className="mt-1 text-[13px] leading-5 text-[#4b5563]">
              Coverage rows surface which Yahoo buckets are still incomplete and which exact fields are missing.
            </p>
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Raw proof</p>
            <p className="mt-1 text-[13px] leading-5 text-[#4b5563]">
              Raw Yahoo responses stay visible so admin and editor users can inspect upstream payloads before trusting the public stock page.
            </p>
          </div>
        </div>
      </AdminSectionCard>

      <AdminStockImportDashboardClient initialData={initialData} />
    </AdminPageFrame>
  );
}
