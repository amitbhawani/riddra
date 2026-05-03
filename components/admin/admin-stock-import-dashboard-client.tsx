"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AdminBadge,
  AdminCard,
  AdminEmptyState,
  AdminSectionCard,
  AdminSimpleTable,
  AdminStatGrid,
} from "@/components/admin/admin-primitives";
import {
  AdminStockImportMissingFieldsReport,
  AdminStockImportRawResponsePanel,
} from "@/components/admin/admin-stock-import-tabs";
import type {
  AdminStockImportDashboardData,
  AdminStockImportDashboardRow,
  AdminStockImportDetails,
} from "@/lib/admin-stock-import-dashboard";
import { getInternalLinkProps } from "@/lib/link-utils";

type BannerState = {
  tone: "success" | "danger";
  text: string;
  detail?: string;
};

type DetailView = "missing_fields" | "raw_yahoo";

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  return `${value.toFixed(1)}%`;
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("en-IN").format(Number.isFinite(value) ? value : 0);
}

function getResultTone(result: AdminStockImportDashboardRow["latestResult"]) {
  if (result === "completed") {
    return "success" as const;
  }
  if (result === "error") {
    return "danger" as const;
  }
  if (result === "pending") {
    return "warning" as const;
  }
  return "default" as const;
}

function getBatchStatusTone(
  status:
    | "running"
    | "paused"
    | "cooling_down"
    | "failed"
    | "completed"
    | "stopped"
    | "not_started",
) {
  if (status === "completed") {
    return "success" as const;
  }
  if (status === "failed") {
    return "danger" as const;
  }
  if (status === "paused" || status === "cooling_down") {
    return "warning" as const;
  }
  if (status === "running") {
    return "info" as const;
  }
  return "default" as const;
}

function getActivityStatusTone(status: string) {
  if (status === "completed") {
    return "success" as const;
  }
  if (status === "failed") {
    return "danger" as const;
  }
  if (status === "warning" || status === "running") {
    return "warning" as const;
  }
  return "default" as const;
}

function getReconciliationTone(status: string) {
  if (status === "completed") {
    return "success" as const;
  }
  if (status === "failed") {
    return "danger" as const;
  }
  if (status === "completed_with_warnings" || status === "no_data") {
    return "warning" as const;
  }
  return "default" as const;
}

function summarizeActionResponse(data: Record<string, unknown>) {
  const importedCount = Number(data.importedCount ?? 0);
  const failedCount = Number(data.failedCount ?? 0);
  const warnings = Array.isArray(data.warnings)
    ? data.warnings.map((item) => cleanString(item, 240)).filter(Boolean)
    : [];

  return {
    importedCount,
    failedCount,
    warnings,
    summary:
      importedCount > 0
        ? `Imported ${importedCount} stock${importedCount === 1 ? "" : "s"}${failedCount ? ` with ${failedCount} failure${failedCount === 1 ? "" : "s"}` : ""}.`
        : `No stock imports completed successfully${failedCount ? ` and ${failedCount} failed` : ""}.`,
  };
}

export function AdminStockImportDashboardClient({
  initialData,
}: {
  initialData: AdminStockImportDashboardData;
}) {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState(initialData);
  const [selectedStockIds, setSelectedStockIds] = useState<string[]>([]);
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [detailView, setDetailView] = useState<DetailView>("missing_fields");
  const [detailStock, setDetailStock] = useState<AdminStockImportDashboardRow | null>(null);
  const [detailData, setDetailData] = useState<AdminStockImportDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadingMoreStocks, setLoadingMoreStocks] = useState(false);

  useEffect(() => {
    setDashboardData(initialData);
  }, [initialData]);

  useEffect(() => {
    setSelectedStockIds((current) =>
      current.filter((stockId) => dashboardData.stocks.some((stock) => stock.stockId === stockId)),
    );
  }, [dashboardData.stocks]);

  const selectableStockIds = useMemo(
    () => dashboardData.stocks.filter((stock) => stock.importable).map((stock) => stock.stockId),
    [dashboardData.stocks],
  );
  const allSelected =
    selectableStockIds.length > 0 && selectableStockIds.every((stockId) => selectedStockIds.includes(stockId));

  async function refreshDetailsIfOpen() {
    if (!detailStock) {
      return;
    }
    await loadStockDetails(detailStock, detailView, true);
  }

  async function loadMoreStocks() {
    if (loadingMoreStocks || !dashboardData.pagination.hasMore) {
      return;
    }

    setLoadingMoreStocks(true);
    try {
      const nextOffset = dashboardData.pagination.offset + dashboardData.stocks.length;
      const response = await fetch(
        `/api/admin/market-data/stocks?offset=${nextOffset}&limit=${dashboardData.pagination.limit}`,
        {
          cache: "no-store",
        },
      );
      const data = (await response.json().catch(() => null)) as AdminStockImportDashboardData | null;
      if (!response.ok || !data) {
        setBanner({
          tone: "danger",
          text: "Could not load more stock import rows right now.",
        });
        return;
      }

      setDashboardData((current) => ({
        ...data,
        stocks: [...current.stocks, ...data.stocks],
        pagination: {
          ...data.pagination,
          offset: current.pagination.offset,
          total: data.pagination.total,
          hasMore: current.stocks.length + data.stocks.length < data.pagination.total,
        },
      }));
    } finally {
      setLoadingMoreStocks(false);
    }
  }

  async function runImportAction(
    action: "import_one" | "import_selected" | "import_all_pending" | "retry_failed_imports",
    stockIds: string[] = [],
  ) {
    setPendingAction(action);
    setBanner(null);

    try {
      const response = await fetch("/api/admin/market-data/stocks/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          stockIds,
        }),
      });
      const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;

      if (!response.ok || !data) {
        setBanner({
          tone: "danger",
          text:
            cleanString(data?.error, 4000) ||
            "The stock import dashboard action could not complete right now.",
        });
        return;
      }

      const summary = summarizeActionResponse(data);
      setBanner({
        tone: summary.importedCount > 0 ? "success" : "danger",
        text: summary.summary,
        detail: summary.warnings.length ? summary.warnings.join(" ") : undefined,
      });
      setSelectedStockIds((current) =>
        action === "import_selected" || action === "import_one" ? current.filter((id) => !stockIds.includes(id)) : current,
      );
      router.refresh();
      await refreshDetailsIfOpen();
    } finally {
      setPendingAction(null);
    }
  }

  async function loadStockDetails(
    stock: AdminStockImportDashboardRow,
    nextView: DetailView,
    silent = false,
  ) {
    setDetailView(nextView);
    setDetailStock(stock);
    setDetailLoading(true);
    if (!silent) {
      setBanner(null);
    }

    try {
      const response = await fetch(`/api/admin/market-data/stocks/${stock.stockId}/details`, {
        cache: "no-store",
      });
      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            details?: AdminStockImportDetails;
          }
        | null;

      if (!response.ok || !data?.details) {
        if (!silent) {
          setBanner({
            tone: "danger",
            text:
              cleanString(data?.error, 4000) ||
              "The durable stock import details could not be loaded right now.",
          });
        }
        setDetailData(null);
        return;
      }

      setDetailData(data.details);
    } finally {
      setDetailLoading(false);
    }
  }

  const stats = [
    {
      label: "Total stocks",
      value: String(dashboardData.summary.totalStocks),
      note: "Stocks master rows currently available to the Yahoo import desk.",
    },
    {
      label: "Historical complete",
      value: String(dashboardData.summary.stocksWithHistoricalDataCompleted),
      note: "Stocks with durable daily history coverage.",
    },
    {
      label: "Snapshot complete",
      value: String(dashboardData.summary.stocksWithLatestSnapshotCompleted),
      note: "Stocks with latest market snapshot coverage.",
    },
    {
      label: "Valuation complete",
      value: String(dashboardData.summary.stocksWithValuationDataCompleted),
      note: "Stocks with valuation, share statistics, and highlights coverage.",
    },
    {
      label: "Financials complete",
      value: String(dashboardData.summary.stocksWithFinancialsCompleted),
      note: "Stocks with annual/quarterly statement coverage.",
    },
    {
      label: "Failed imports",
      value: String(dashboardData.summary.failedImports),
      note: "Stocks whose latest durable Yahoo job or coverage lane is in error.",
    },
    {
      label: "Pending imports",
      value: String(dashboardData.summary.pendingImports),
      note: "Importable stocks that still have missing Yahoo bucket coverage.",
    },
    {
      label: "Last success",
      value: dashboardData.summary.lastSuccessfulImportDate ? formatDateTime(dashboardData.summary.lastSuccessfulImportDate) : "Never",
      note: "Newest completed Yahoo stock import detected in durable job rows.",
    },
  ];

  return (
    <div className="space-y-3">
      {banner ? (
        <AdminCard tone={banner.tone === "success" ? "primary" : "warning"} className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <AdminBadge
              label={banner.tone === "success" ? "Import action completed" : "Import action failed"}
              tone={banner.tone === "success" ? "success" : "danger"}
            />
            <p className="text-sm text-[#111827]">{banner.text}</p>
          </div>
          {banner.detail ? <p className="text-[12px] leading-5 text-[#6b7280]">{banner.detail}</p> : null}
        </AdminCard>
      ) : null}

      {dashboardData.warnings.length ? (
        <AdminCard tone="warning" className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <AdminBadge label="Durable read warnings" tone="warning" />
            <p className="text-sm text-[#9a3412]">
              Some dashboard buckets could not be read cleanly in this environment.
            </p>
          </div>
          <ul className="space-y-1 text-[12px] leading-5 text-[#9a3412]">
            {dashboardData.warnings.map((warning, index) => (
              <li key={`dashboard-warning-${index + 1}`}>{warning}</li>
            ))}
          </ul>
        </AdminCard>
      ) : null}

      <AdminStatGrid stats={stats} className="xl:grid-cols-4" />

      <AdminSectionCard
        title="Yahoo guardrails"
        description="These controls show the live Yahoo usage pace, request budget, and cooldown state that protect the importer from aggressive runs."
      >
        <div className="grid gap-3 xl:grid-cols-5">
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Current request pace</p>
            <p className="mt-1 text-[13px] font-medium text-[#111827]">{dashboardData.yahooOperations.currentRequestPace}</p>
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Requests this hour</p>
            <p className="mt-1 text-[13px] font-medium text-[#111827]">
              {dashboardData.yahooOperations.requestsUsedCurrentHour} / {dashboardData.yahooOperations.maxRequestsPerHour}
            </p>
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Requests today</p>
            <p className="mt-1 text-[13px] font-medium text-[#111827]">
              {dashboardData.yahooOperations.requestsUsedToday} / {dashboardData.yahooOperations.maxRequestsPerDay}
            </p>
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Cooldown status</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <AdminBadge
                label={dashboardData.yahooOperations.latestBatchStatus.replaceAll("_", " ")}
                tone={getBatchStatusTone(dashboardData.yahooOperations.latestBatchStatus)}
              />
              <p className="text-[12px] leading-5 text-[#4b5563]">{dashboardData.yahooOperations.cooldownStatus}</p>
            </div>
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Last Yahoo error</p>
            <p className="mt-1 text-[12px] leading-5 text-[#4b5563]">
              {dashboardData.yahooOperations.lastYahooError || "No recent Yahoo error recorded."}
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-3 xl:grid-cols-4">
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Saved requests avoided</p>
            <p className="mt-1 text-[13px] font-medium text-[#111827]">
              {formatInteger(dashboardData.yahooOperations.savedRequestsAvoided)}
            </p>
            <p className="mt-1 text-[12px] leading-5 text-[#4b5563]">
              Requests skipped because current data or duplicate failed raw responses were reused.
            </p>
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Existing data reused</p>
            <p className="mt-1 text-[13px] font-medium text-[#111827]">
              {formatInteger(dashboardData.yahooOperations.existingDataReused)}
            </p>
            <p className="mt-1 text-[12px] leading-5 text-[#4b5563]">
              Existing normalized rows that were kept instead of re-importing the same data.
            </p>
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Skip breakdown</p>
            <p className="mt-1 text-[12px] leading-5 text-[#4b5563]">
              History: {formatInteger(dashboardData.yahooOperations.skipBreakdown.skippedExistingHistory)} · Snapshot: {formatInteger(dashboardData.yahooOperations.skipBreakdown.skippedExistingSnapshot)}
            </p>
            <p className="text-[12px] leading-5 text-[#4b5563]">
              Blocked modules: {formatInteger(dashboardData.yahooOperations.skipBreakdown.skippedBlockedModule)} · Duplicate raw failures: {formatInteger(dashboardData.yahooOperations.skipBreakdown.skippedDuplicateRawResponse)}
            </p>
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Module policy</p>
            <div className="mt-1 space-y-1">
              {Object.entries(dashboardData.yahooOperations.disabledModules).map(([moduleName, reason]) => (
                <p key={moduleName} className="text-[12px] leading-5 text-[#4b5563]">
                  <span className="font-medium text-[#111827]">{moduleName.replaceAll("_", " ")}:</span>{" "}
                  {reason.replaceAll("_", " ")}
                </p>
              ))}
            </div>
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="Import actions"
        description="Run one stock, selected stocks, all pending stocks, or just retry the failed stocks without calling any API manually."
      >
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void runImportAction("import_selected", selectedStockIds)}
            disabled={pendingAction !== null || selectedStockIds.length === 0}
            className="inline-flex h-9 items-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-3 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendingAction === "import_selected"
              ? "Importing selected..."
              : `Import selected stocks${selectedStockIds.length ? ` (${selectedStockIds.length})` : ""}`}
          </button>
          <button
            type="button"
            onClick={() => void runImportAction("import_all_pending")}
            disabled={pendingAction !== null || dashboardData.summary.pendingImports === 0}
            className="inline-flex h-9 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] font-medium text-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendingAction === "import_all_pending" ? "Importing pending..." : "Import all pending stocks"}
          </button>
          <button
            type="button"
            onClick={() => void runImportAction("retry_failed_imports")}
            disabled={pendingAction !== null || dashboardData.summary.failedImports === 0}
            className="inline-flex h-9 items-center rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 text-[13px] font-medium text-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendingAction === "retry_failed_imports" ? "Retrying failed..." : "Retry failed imports"}
          </button>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="Latest import activity"
        description="These are the newest durable Yahoo import steps across all stocks, sorted newest first."
      >
        {dashboardData.latestActivity.length ? (
          <AdminSimpleTable
            columns={["Stock / symbol", "Module", "Step", "Status", "Rows", "Fill", "Message", "Started"]}
            rows={dashboardData.latestActivity.slice(0, 12).map((row) => [
              row.yahooSymbol || "Unknown symbol",
              row.moduleName.replaceAll("_", " "),
              row.stepName.replaceAll("_", " "),
              <AdminBadge
                key={`${row.id}-status`}
                label={row.status.replaceAll("_", " ")}
                tone={getActivityStatusTone(row.status)}
              />,
              `F ${formatInteger(row.rowsFetched)} · I ${formatInteger(row.rowsInserted)} · U ${formatInteger(row.rowsUpdated)} · S ${formatInteger(row.rowsSkipped)}`,
              row.fillPercentage > 0 ? formatPercent(row.fillPercentage) : "Not tracked",
              row.errorMessage || row.message || "No activity message",
              formatDateTime(row.startedAt),
            ])}
          />
        ) : (
          <AdminEmptyState
            title="No durable activity rows yet"
            description="Once the Yahoo importer writes activity checkpoints, the newest steps will appear here."
          />
        )}
      </AdminSectionCard>

      <AdminSectionCard
        title="Per-stock import status"
        description="Use the action buttons on each stock to import one name, inspect raw Yahoo payloads, or open the editor and public route."
      >
        {dashboardData.stocks.length ? (
          <div className="overflow-x-auto rounded-lg border border-[#d1d5db] bg-white shadow-sm">
            <table className="min-w-full text-left">
              <thead className="bg-[#f3f4f6]">
                <tr>
                  <th className="border-b border-[#d1d5db] px-3 py-2 text-[12px] font-medium text-[#6b7280]">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() =>
                        setSelectedStockIds(allSelected ? [] : selectableStockIds)
                      }
                    />
                  </th>
                  {[
                    "Stock",
                    "Yahoo symbol",
                    "Import %",
                    "Coverage",
                    "Last result",
                    "Last success",
                    "Rows imported",
                    "Latest error",
                    "Actions",
                  ].map((column) => (
                    <th
                      key={column}
                      className="border-b border-[#d1d5db] px-3 py-2 text-[12px] font-medium text-[#6b7280]"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb]">
                {dashboardData.stocks.map((stock) => (
                  <tr key={stock.stockId} className="align-top transition hover:bg-[#f9fafb]">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedStockIds.includes(stock.stockId)}
                        disabled={!stock.importable}
                        onChange={() =>
                          setSelectedStockIds((current) =>
                            current.includes(stock.stockId)
                              ? current.filter((id) => id !== stock.stockId)
                              : [...current, stock.stockId],
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-3 text-[13px] text-[#111827]">
                      <div className="space-y-1">
                        <p className="font-medium">{stock.companyName}</p>
                        <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#6b7280]">
                          <span>{stock.symbol}</span>
                          <span>•</span>
                          <Link href={stock.editorHref} {...getInternalLinkProps()} className="underline">
                            Edit stock
                          </Link>
                          <span>•</span>
                          <Link href={stock.route} {...getInternalLinkProps()} className="underline">
                            Open stock page
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[13px] text-[#111827]">
                      {stock.yahooSymbol || <span className="text-[#9ca3af]">Missing</span>}
                    </td>
                    <td className="px-3 py-3 text-[13px] font-medium text-[#111827]">
                      {formatPercent(stock.importPercentage)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <AdminBadge
                          label={`History ${stock.historicalCompleted ? "done" : "pending"}`}
                          tone={stock.historicalCompleted ? "success" : "warning"}
                        />
                        <AdminBadge
                          label={`Snapshot ${stock.latestSnapshotCompleted ? "done" : "pending"}`}
                          tone={stock.latestSnapshotCompleted ? "success" : "warning"}
                        />
                        <AdminBadge
                          label={`Valuation ${stock.valuationCompleted ? "done" : "pending"}`}
                          tone={stock.valuationCompleted ? "success" : "warning"}
                        />
                        <AdminBadge
                          label={`Financials ${stock.financialsCompleted ? "done" : "pending"}`}
                          tone={stock.financialsCompleted ? "success" : "warning"}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="space-y-1">
                        <AdminBadge label={stock.latestResult.replaceAll("_", " ")} tone={getResultTone(stock.latestResult)} />
                        <p className="text-[12px] leading-5 text-[#6b7280]">{stock.nextRecommendedAction}</p>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[13px] text-[#111827]">
                      {formatDateTime(stock.lastSuccessfulImportAt)}
                    </td>
                    <td className="px-3 py-3 text-[13px] text-[#111827]">
                      {stock.rowsImportedInLatestSuccess}
                    </td>
                    <td className="px-3 py-3 text-[12px] leading-5 text-[#6b7280]">
                      {stock.latestError || "No durable Yahoo error recorded."}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex min-w-[220px] flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => void runImportAction("import_one", [stock.stockId])}
                          disabled={pendingAction !== null || !stock.importable}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-3 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {pendingAction === "import_one" ? "Importing..." : "Import one stock"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void loadStockDetails(stock, "missing_fields")}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827]"
                        >
                          View missing fields report
                        </button>
                        <button
                          type="button"
                          onClick={() => void loadStockDetails(stock, "raw_yahoo")}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827]"
                        >
                          View raw Yahoo response
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmptyState
            title="No stocks found"
            description="Once stocks_master contains Yahoo-importable stocks, they will appear in this dashboard."
          />
        )}
        {dashboardData.pagination.hasMore ? (
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[12px] text-[#6b7280]">
              Showing {formatInteger(dashboardData.stocks.length)} of {formatInteger(dashboardData.pagination.total)} stock rows.
            </p>
            <button
              type="button"
              onClick={() => void loadMoreStocks()}
              disabled={loadingMoreStocks}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingMoreStocks ? "Loading more..." : "Load more"}
            </button>
          </div>
        ) : null}
      </AdminSectionCard>

      {detailStock ? (
        <AdminSectionCard
          title={`${detailView === "missing_fields" ? "Missing fields report" : "Raw Yahoo responses"} · ${detailStock.companyName}`}
          description={`Stock import percentage ${formatPercent(detailStock.importPercentage)} • Public route ${detailStock.route}`}
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadStockDetails(detailStock, "missing_fields", true)}
              className={`inline-flex h-8 items-center rounded-lg border px-3 text-[12px] font-medium ${
                detailView === "missing_fields"
                  ? "border-[#0f172a] bg-[#0f172a] text-white"
                  : "border-[#d1d5db] bg-white text-[#111827]"
              }`}
            >
              Missing fields
            </button>
            <button
              type="button"
              onClick={() => void loadStockDetails(detailStock, "raw_yahoo", true)}
              className={`inline-flex h-8 items-center rounded-lg border px-3 text-[12px] font-medium ${
                detailView === "raw_yahoo"
                  ? "border-[#0f172a] bg-[#0f172a] text-white"
                  : "border-[#d1d5db] bg-white text-[#111827]"
              }`}
            >
              Raw Yahoo
            </button>
            <Link
              href={detailStock.editorHref}
              {...getInternalLinkProps()}
              className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827]"
            >
              Open stock editor
            </Link>
            <Link
              href={detailStock.route}
              {...getInternalLinkProps()}
              className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827]"
            >
              Open stock page
            </Link>
          </div>

          {detailLoading ? (
            <AdminCard tone="compact">
              <p className="text-sm text-[#4b5563]">Loading durable stock import details...</p>
            </AdminCard>
          ) : detailView === "missing_fields" ? (
            <div className="space-y-3">
              <AdminStockImportMissingFieldsReport details={detailData} />
              {detailData?.warnings.length ? (
                <AdminSimpleTable
                  columns={["Durable read warnings"]}
                  rows={detailData.warnings.map((warning) => [warning])}
                />
              ) : null}
            </div>
          ) : (
            <AdminStockImportRawResponsePanel details={detailData} />
          )}
        </AdminSectionCard>
      ) : null}

      {detailStock && detailData ? (
        <AdminSectionCard
          title={`Activity timeline · ${detailStock.companyName}`}
          description={detailData.retryRecommendation}
        >
          {detailData.activityTimeline.length ? (
            <AdminSimpleTable
              columns={["When", "Module", "Step", "Status", "Rows", "Fill", "Message"]}
              rows={detailData.activityTimeline.map((row) => [
                formatDateTime(row.completedAt || row.startedAt),
                row.moduleName.replaceAll("_", " "),
                row.stepName.replaceAll("_", " "),
                <AdminBadge
                  key={`${row.id}-timeline-status`}
                  label={row.status.replaceAll("_", " ")}
                  tone={getActivityStatusTone(row.status)}
                />,
                `F ${formatInteger(row.rowsFetched)} · I ${formatInteger(row.rowsInserted)} · U ${formatInteger(row.rowsUpdated)} · S ${formatInteger(row.rowsSkipped)}`,
                row.fillPercentage > 0 ? formatPercent(row.fillPercentage) : "Not tracked",
                row.errorMessage || row.message || "No detail recorded",
              ])}
            />
          ) : (
            <AdminEmptyState
              title="No import activity recorded yet"
              description="This stock does not yet have durable Yahoo activity checkpoints in this environment."
            />
          )}
        </AdminSectionCard>
      ) : null}

      {detailStock && detailData ? (
        <AdminSectionCard
          title={`Reconciliation status · ${detailStock.companyName}`}
          description="Compare raw Yahoo record counts, normalized rows, missing fields, and retry signals per module."
        >
          <div className="mb-3 rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">
              Retry recommendation
            </p>
            <p className="mt-1 text-[13px] leading-5 text-[#111827]">
              {detailData.retryRecommendation}
            </p>
          </div>
          {detailData.reconciliationRows.length ? (
            <AdminSimpleTable
              columns={[
                "Module",
                "Target table",
                "Status",
                "Raw vs normalized",
                "Unmapped",
                "Missing required",
                "Missing optional",
                "Notes",
              ]}
              rows={detailData.reconciliationRows.map((row) => [
                row.moduleName.replaceAll("_", " "),
                row.targetTable,
                <AdminBadge
                  key={`${row.id}-recon-status`}
                  label={row.reconciliationStatus.replaceAll("_", " ")}
                  tone={getReconciliationTone(row.reconciliationStatus)}
                />,
                `${formatInteger(row.rawRecordsCount)} raw / ${formatInteger(row.normalizedRecordsCount)} normalized`,
                formatInteger(row.unmappedRecordsCount),
                row.missingRequiredFields.length ? row.missingRequiredFields.join(", ") : "None",
                row.missingOptionalFields.length ? row.missingOptionalFields.join(", ") : "None",
                row.reconciliationNotes || "No reconciliation notes",
              ])}
            />
          ) : (
            <AdminEmptyState
              title="No reconciliation rows yet"
              description="Once the Yahoo importer completes module reconciliation, raw-versus-normalized counts will appear here."
            />
          )}
        </AdminSectionCard>
      ) : null}
    </div>
  );
}
