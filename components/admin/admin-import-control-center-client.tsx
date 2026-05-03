"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  AdminBadge,
  AdminCard,
  AdminEmptyState,
  AdminSectionCard,
  AdminSimpleTable,
  AdminStatGrid,
} from "@/components/admin/admin-primitives";
import type {
  AdminImportControlCenterActivityItem,
  AdminImportControlCenterData,
  AdminImportControlCenterHealthStatus,
  AdminImportControlCenterModuleProgress,
  AdminImportControlCenterQuarantineItem,
  AdminImportControlCenterStateLabel,
  AdminImportControlCenterWorstStockItem,
} from "@/lib/admin-import-control-center";

type ActionKey =
  | "run_safe_dry_run"
  | "run_daily_chart_update"
  | "import_missing_historical_data"
  | "refresh_todays_snapshots"
  | "retry_failed_safe_modules";

type BannerState = {
  tone: "success" | "danger";
  text: string;
  detail?: string;
};

type SortDirection = "asc" | "desc";

type SortOption<T extends string> = {
  value: T;
  label: string;
};

type ActivitySortKey = "date" | "stock" | "module" | "step" | "status" | "fill" | "inserted" | "skipped";
type ModuleSortKey = "module" | "status" | "stocksCovered" | "coverage" | "fill" | "warnings" | "errors" | "latestImport";
type WorstStockSortKey = "stock" | "score" | "missingModules" | "warnings" | "errors" | "lastImport";
type FreshnessSortKey =
  | "stock"
  | "symbol"
  | "lastPriceDate"
  | "lastSnapshotDate"
  | "expectedTradingDate"
  | "reason"
  | "hasTodayPrice"
  | "hasTodaySnapshot";
type AlertSortKey = "date" | "severity" | "type" | "scope";
type QuarantineSortKey = "date" | "stock" | "table" | "reason";

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

function formatInteger(value: number) {
  return new Intl.NumberFormat("en-IN").format(Number.isFinite(value) ? value : 0);
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }
  return `${value.toFixed(1)}%`;
}

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function formatFreshnessReasonLabel(reason: string) {
  switch (reason) {
    case "fresh":
      return "Fresh";
    case "stale_missing_price":
      return "Missing price";
    case "stale_missing_snapshot":
      return "Missing snapshot";
    case "provider_no_data":
      return "Provider no data";
    case "provider_lag":
      return "Provider lag";
    case "market_not_closed":
      return "Market not closed";
    case "holiday_or_weekend":
      return "Holiday / weekend";
    case "symbol_issue":
      return "Symbol issue";
    default:
      return reason.replaceAll("_", " ");
  }
}

function formatQuarantineTableLabel(tableName: string) {
  if (tableName === "stock_price_history") {
    return "Price history";
  }
  if (tableName === "stock_market_snapshot") {
    return "Market snapshot";
  }
  return tableName.replaceAll("_", " ");
}

function compareText(left: string | null | undefined, right: string | null | undefined) {
  return cleanString(left, 4000).localeCompare(cleanString(right, 4000), "en-IN", {
    sensitivity: "base",
    numeric: true,
  });
}

function compareNumber(left: number, right: number) {
  return left - right;
}

function compareDate(left: string | null | undefined, right: string | null | undefined) {
  const leftTime = left ? new Date(left).getTime() : 0;
  const rightTime = right ? new Date(right).getTime() : 0;
  return compareNumber(leftTime, rightTime);
}

function applyDirection(value: number, direction: SortDirection) {
  return direction === "asc" ? value : value * -1;
}

function SortControls<T extends string>({
  label,
  value,
  direction,
  options,
  onChange,
  onDirectionChange,
}: {
  label: string;
  value: T;
  direction: SortDirection;
  options: SortOption<T>[];
  onChange: (value: T) => void;
  onDirectionChange: (direction: SortDirection) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-8 rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] text-[#111827]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onDirectionChange(direction === "asc" ? "desc" : "asc")}
        className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] font-medium text-[#111827] transition hover:bg-[#f9fafb]"
      >
        {direction === "asc" ? "Ascending" : "Descending"}
      </button>
    </div>
  );
}

function getStatusTone(status: string) {
  if (status === "complete") {
    return "success" as const;
  }
  if (status === "in_progress") {
    return "info" as const;
  }
  if (status === "disabled_by_design") {
    return "danger" as const;
  }
  if (status === "needs_migration") {
    return "warning" as const;
  }
  if (status === "completed" || status === "active") {
    return "success" as const;
  }
  if (status === "degraded") {
    return "warning" as const;
  }
  if (status === "disabled") {
    return "danger" as const;
  }
  if (status === "future") {
    return "info" as const;
  }
  if (status === "failed" || status === "error") {
    return "danger" as const;
  }
  if (status === "cooling_down" || status === "paused" || status === "running") {
    return "warning" as const;
  }
  return "default" as const;
}

function formatStateLabel(status: AdminImportControlCenterStateLabel) {
  if (status === "disabled_by_design") {
    return "Disabled by Design";
  }
  if (status === "needs_migration") {
    return "Needs Migration";
  }
  if (status === "in_progress") {
    return "In Progress";
  }
  return status
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function getHealthTone(status: AdminImportControlCenterHealthStatus) {
  if (status === "green") {
    return "success" as const;
  }
  if (status === "yellow") {
    return "warning" as const;
  }
  return "danger" as const;
}

function formatHealthLabel(status: AdminImportControlCenterHealthStatus) {
  if (status === "green") {
    return "Green";
  }
  if (status === "yellow") {
    return "Yellow";
  }
  return "Red";
}

function renderActivityRows(rows: AdminImportControlCenterActivityItem[]) {
  if (!rows.length) {
    return (
      <AdminEmptyState
        title="No activity yet"
        description="This list will populate as Yahoo imports fetch, normalize, skip, reconcile, or fail."
      />
    );
  }

  return (
    <AdminSimpleTable
      columns={["When", "Stock", "Module", "Step", "Status", "Rows", "Message"]}
      rows={rows.map((row) => [
        <div key={`${row.id}-when`} className="space-y-1">
          <p className="font-medium text-[#111827]">{formatDateTime(row.completedAt ?? row.startedAt)}</p>
          <p className="text-[12px] text-[#6b7280]">{row.affectedTable ?? "No table recorded"}</p>
        </div>,
        <div key={`${row.id}-stock`} className="space-y-1">
          <p className="font-medium text-[#111827]">{row.stockLabel}</p>
          <p className="text-[12px] text-[#6b7280]">{row.yahooSymbol ?? "No Yahoo symbol"}</p>
        </div>,
        <div key={`${row.id}-module`} className="space-y-1">
          <p className="font-medium text-[#111827]">{row.moduleName}</p>
          <p className="text-[12px] text-[#6b7280]">Fill {formatPercent(row.fillPercentage)}</p>
        </div>,
        <span key={`${row.id}-step`} className="text-[#111827]">
          {row.stepName}
        </span>,
        <AdminBadge
          key={`${row.id}-status`}
          label={row.status.replaceAll("_", " ")}
          tone={getStatusTone(row.status)}
        />,
        <div key={`${row.id}-rows`} className="space-y-1 text-[12px] text-[#4b5563]">
          <p>Fetched {formatInteger(row.rowsFetched)}</p>
          <p>Inserted {formatInteger(row.rowsInserted)}</p>
          <p>Updated {formatInteger(row.rowsUpdated)}</p>
          <p>Skipped {formatInteger(row.rowsSkipped)}</p>
        </div>,
        <div key={`${row.id}-message`} className="space-y-1">
          <p className="text-[#111827]">{row.message ?? "No message recorded."}</p>
          {row.errorMessage ? (
            <p className="text-[12px] text-[#b91c1c]">{row.errorMessage}</p>
          ) : null}
        </div>,
      ])}
    />
  );
}

function renderModuleRows(rows: AdminImportControlCenterModuleProgress[]) {
  return (
    <AdminSimpleTable
      columns={["Module", "Status", "Stocks covered", "Coverage", "Field fill", "Warnings", "Errors", "Latest import"]}
      rows={rows.map((row) => [
        <div key={`${row.key}-module`} className="space-y-1">
          <p className="font-medium text-[#111827]">{row.label}</p>
          <p className="text-[12px] text-[#6b7280]">{row.key}</p>
        </div>,
        <AdminBadge
          key={`${row.key}-status`}
          label={row.status.replaceAll("_", " ")}
          tone={getStatusTone(row.status)}
        />,
        <span key={`${row.key}-covered`}>{formatInteger(row.stocksCovered)}</span>,
        <span key={`${row.key}-coverage`}>{formatPercent(row.coveragePercentage)}</span>,
        <span key={`${row.key}-fill`}>{formatPercent(row.fillPercentage)}</span>,
        <span key={`${row.key}-warnings`}>{formatInteger(row.warningCount)}</span>,
        <span key={`${row.key}-errors`}>{formatInteger(row.errorCount)}</span>,
        <span key={`${row.key}-latest`}>{formatDateTime(row.latestImportedAt)}</span>,
      ])}
    />
  );
}

function renderWorstStockRows(rows: AdminImportControlCenterWorstStockItem[]) {
  if (!rows.length) {
    return (
      <AdminEmptyState
        title="No low-score stocks right now"
        description="This list will populate when durable stock quality scoring finds weaker coverage or higher error pressure."
      />
    );
  }

  return (
    <AdminSimpleTable
      columns={["Stock", "Score", "Coverage", "Warnings / Errors", "Last import", "Next action"]}
      rows={rows.map((row) => [
        <div key={`${row.stockId}-stock`} className="space-y-1">
          <p className="font-medium text-[#111827]">{row.companyName}</p>
          <p className="text-[12px] text-[#6b7280]">
            {row.symbol}
            {row.yahooSymbol ? ` · ${row.yahooSymbol}` : ""}
          </p>
        </div>,
        <div key={`${row.stockId}-score`} className="space-y-1">
          <p className="font-medium text-[#111827]">{formatInteger(row.dataQualityScore)} / 100</p>
          <p className="text-[12px] text-[#6b7280]">Price-data-focused for now</p>
        </div>,
        <div key={`${row.stockId}-coverage`} className="space-y-1 text-[12px] text-[#4b5563]">
          <p>Historical: {row.historicalCompleted ? "Yes" : "No"}</p>
          <p>Snapshot: {row.latestSnapshotCompleted ? "Yes" : "No"}</p>
          <p>Missing modules: {formatInteger(row.missingModuleCount)}</p>
        </div>,
        <div key={`${row.stockId}-issues`} className="space-y-1 text-[12px] text-[#4b5563]">
          <p>Warnings {formatInteger(row.warningCount)}</p>
          <p>Errors {formatInteger(row.errorCount)}</p>
        </div>,
        <div key={`${row.stockId}-import`} className="space-y-1">
          <p className="text-[#111827]">{formatDateTime(row.lastSuccessfulImportAt)}</p>
          <Link href={row.route} className="text-[12px] text-[#1d4ed8] hover:underline">
            Open stock page
          </Link>
        </div>,
        <p key={`${row.stockId}-action`} className="text-[#111827]">
          {row.nextRecommendedAction}
        </p>,
      ])}
    />
  );
}

export function AdminImportControlCenterClient({
  data,
}: {
  data: AdminImportControlCenterData;
}) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<ActionKey | null>(null);
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [activitySortKey, setActivitySortKey] = useState<ActivitySortKey>("date");
  const [activitySortDirection, setActivitySortDirection] = useState<SortDirection>("desc");
  const [failedSortKey, setFailedSortKey] = useState<ActivitySortKey>("date");
  const [failedSortDirection, setFailedSortDirection] = useState<SortDirection>("desc");
  const [skippedSortKey, setSkippedSortKey] = useState<ActivitySortKey>("date");
  const [skippedSortDirection, setSkippedSortDirection] = useState<SortDirection>("desc");
  const [reusedSortKey, setReusedSortKey] = useState<ActivitySortKey>("date");
  const [reusedSortDirection, setReusedSortDirection] = useState<SortDirection>("desc");
  const [moduleSortKey, setModuleSortKey] = useState<ModuleSortKey>("coverage");
  const [moduleSortDirection, setModuleSortDirection] = useState<SortDirection>("desc");
  const [worstStockSortKey, setWorstStockSortKey] = useState<WorstStockSortKey>("score");
  const [worstStockSortDirection, setWorstStockSortDirection] = useState<SortDirection>("asc");
  const [freshnessSortKey, setFreshnessSortKey] = useState<FreshnessSortKey>("lastSnapshotDate");
  const [freshnessSortDirection, setFreshnessSortDirection] = useState<SortDirection>("asc");
  const [alertSortKey, setAlertSortKey] = useState<AlertSortKey>("date");
  const [alertSortDirection, setAlertSortDirection] = useState<SortDirection>("desc");
  const [quarantineSortKey, setQuarantineSortKey] = useState<QuarantineSortKey>("date");
  const [quarantineSortDirection, setQuarantineSortDirection] = useState<SortDirection>("desc");

  const activitySortOptions: SortOption<ActivitySortKey>[] = [
    { value: "date", label: "Date" },
    { value: "fill", label: "Fill %" },
    { value: "status", label: "Status" },
    { value: "stock", label: "Stock" },
    { value: "module", label: "Module" },
    { value: "step", label: "Step" },
    { value: "inserted", label: "Inserted rows" },
    { value: "skipped", label: "Skipped rows" },
  ];
  const moduleSortOptions: SortOption<ModuleSortKey>[] = [
    { value: "coverage", label: "Coverage %" },
    { value: "fill", label: "Fill %" },
    { value: "latestImport", label: "Latest import" },
    { value: "status", label: "Status" },
    { value: "module", label: "Module" },
    { value: "stocksCovered", label: "Stocks covered" },
    { value: "warnings", label: "Warnings" },
    { value: "errors", label: "Errors" },
  ];
  const worstStockSortOptions: SortOption<WorstStockSortKey>[] = [
    { value: "score", label: "Score" },
    { value: "lastImport", label: "Last import" },
    { value: "missingModules", label: "Missing modules" },
    { value: "errors", label: "Errors" },
    { value: "warnings", label: "Warnings" },
    { value: "stock", label: "Stock" },
  ];
  const freshnessSortOptions: SortOption<FreshnessSortKey>[] = [
    { value: "reason", label: "Reason" },
    { value: "expectedTradingDate", label: "Expected trading date" },
    { value: "lastSnapshotDate", label: "Last snapshot date" },
    { value: "lastPriceDate", label: "Last price date" },
    { value: "hasTodaySnapshot", label: "Has today snapshot" },
    { value: "hasTodayPrice", label: "Has today price" },
    { value: "stock", label: "Company name" },
    { value: "symbol", label: "Symbol" },
  ];
  const alertSortOptions: SortOption<AlertSortKey>[] = [
    { value: "date", label: "Date" },
    { value: "severity", label: "Severity" },
    { value: "type", label: "Alert type" },
    { value: "scope", label: "Scope" },
  ];
  const quarantineSortOptions: SortOption<QuarantineSortKey>[] = [
    { value: "date", label: "Date" },
    { value: "reason", label: "Reason" },
    { value: "table", label: "Table" },
    { value: "stock", label: "Stock" },
  ];

  function sortActivityRows(rows: AdminImportControlCenterActivityItem[], sortKey: ActivitySortKey, direction: SortDirection) {
    return [...rows].sort((left, right) => {
      let value = 0;
      switch (sortKey) {
        case "date":
          value = compareDate(left.completedAt ?? left.startedAt, right.completedAt ?? right.startedAt);
          break;
        case "stock":
          value = compareText(left.stockLabel, right.stockLabel);
          break;
        case "module":
          value = compareText(left.moduleName, right.moduleName);
          break;
        case "step":
          value = compareText(left.stepName, right.stepName);
          break;
        case "status":
          value = compareText(left.status, right.status);
          break;
        case "fill":
          value = compareNumber(left.fillPercentage, right.fillPercentage);
          break;
        case "inserted":
          value = compareNumber(left.rowsInserted, right.rowsInserted);
          break;
        case "skipped":
          value = compareNumber(left.rowsSkipped, right.rowsSkipped);
          break;
      }
      return applyDirection(value, direction);
    });
  }

  const sortedLatestEvents = useMemo(
    () => sortActivityRows(data.recentActivity.latestEvents, activitySortKey, activitySortDirection),
    [activitySortDirection, activitySortKey, data.recentActivity.latestEvents],
  );
  const sortedLatestFailedImports = useMemo(
    () => sortActivityRows(data.recentActivity.latestFailedImports, failedSortKey, failedSortDirection),
    [data.recentActivity.latestFailedImports, failedSortDirection, failedSortKey],
  );
  const sortedLatestSkippedImports = useMemo(
    () => sortActivityRows(data.recentActivity.latestSkippedImports, skippedSortKey, skippedSortDirection),
    [data.recentActivity.latestSkippedImports, skippedSortDirection, skippedSortKey],
  );
  const sortedLatestReusedDataEvents = useMemo(
    () => sortActivityRows(data.recentActivity.latestReusedDataEvents, reusedSortKey, reusedSortDirection),
    [data.recentActivity.latestReusedDataEvents, reusedSortDirection, reusedSortKey],
  );

  const sortedModuleProgress = useMemo(() => {
    return [...data.progressByModule].sort((left, right) => {
      let value = 0;
      switch (moduleSortKey) {
        case "module":
          value = compareText(left.label, right.label);
          break;
        case "status":
          value = compareText(left.status, right.status);
          break;
        case "stocksCovered":
          value = compareNumber(left.stocksCovered, right.stocksCovered);
          break;
        case "coverage":
          value = compareNumber(left.coveragePercentage, right.coveragePercentage);
          break;
        case "fill":
          value = compareNumber(left.fillPercentage, right.fillPercentage);
          break;
        case "warnings":
          value = compareNumber(left.warningCount, right.warningCount);
          break;
        case "errors":
          value = compareNumber(left.errorCount, right.errorCount);
          break;
        case "latestImport":
          value = compareDate(left.latestImportedAt, right.latestImportedAt);
          break;
      }
      return applyDirection(value, moduleSortDirection);
    });
  }, [data.progressByModule, moduleSortDirection, moduleSortKey]);

  const sortedWorstStocks = useMemo(() => {
    return [...data.dataQuality.worstStocks].sort((left, right) => {
      let value = 0;
      switch (worstStockSortKey) {
        case "stock":
          value = compareText(left.companyName, right.companyName);
          break;
        case "score":
          value = compareNumber(left.dataQualityScore, right.dataQualityScore);
          break;
        case "missingModules":
          value = compareNumber(left.missingModuleCount, right.missingModuleCount);
          break;
        case "warnings":
          value = compareNumber(left.warningCount, right.warningCount);
          break;
        case "errors":
          value = compareNumber(left.errorCount, right.errorCount);
          break;
        case "lastImport":
          value = compareDate(left.lastSuccessfulImportAt, right.lastSuccessfulImportAt);
          break;
      }
      return applyDirection(value, worstStockSortDirection);
    });
  }, [data.dataQuality.worstStocks, worstStockSortDirection, worstStockSortKey]);

  const sortedStaleStocks = useMemo(() => {
    return [...data.systemHealthMonitor.freshness.staleStocks].sort((left, right) => {
      let value = 0;
      switch (freshnessSortKey) {
        case "stock":
          value = compareText(left.companyName, right.companyName);
          break;
        case "symbol":
          value = compareText(left.symbol, right.symbol);
          break;
        case "reason":
          value = compareText(left.reasonCategory, right.reasonCategory);
          break;
        case "expectedTradingDate":
          value = compareDate(left.expectedTradingDate, right.expectedTradingDate);
          break;
        case "lastPriceDate":
          value = compareDate(left.lastPriceDate, right.lastPriceDate);
          break;
        case "lastSnapshotDate":
          value = compareDate(left.lastSnapshotDate, right.lastSnapshotDate);
          break;
        case "hasTodayPrice":
          value = compareNumber(Number(left.hasTodayPrice), Number(right.hasTodayPrice));
          break;
        case "hasTodaySnapshot":
          value = compareNumber(Number(left.hasTodaySnapshot), Number(right.hasTodaySnapshot));
          break;
      }
      return applyDirection(value, freshnessSortDirection);
    });
  }, [data.systemHealthMonitor.freshness.staleStocks, freshnessSortDirection, freshnessSortKey]);

  const sortedAcceptedExceptions = useMemo(() => {
    return [...data.systemHealthMonitor.freshness.acceptedExceptions].sort((left, right) => {
      let value = 0;
      switch (freshnessSortKey) {
        case "stock":
          value = compareText(left.companyName, right.companyName);
          break;
        case "symbol":
          value = compareText(left.symbol, right.symbol);
          break;
        case "reason":
          value = compareText(left.reasonCategory, right.reasonCategory);
          break;
        case "expectedTradingDate":
          value = compareDate(left.expectedTradingDate, right.expectedTradingDate);
          break;
        case "lastPriceDate":
          value = compareDate(left.lastPriceDate, right.lastPriceDate);
          break;
        case "lastSnapshotDate":
          value = compareDate(left.lastSnapshotDate, right.lastSnapshotDate);
          break;
        case "hasTodayPrice":
          value = compareNumber(Number(left.hasTodayPrice), Number(right.hasTodayPrice));
          break;
        case "hasTodaySnapshot":
          value = compareNumber(Number(left.hasTodaySnapshot), Number(right.hasTodaySnapshot));
          break;
      }
      return applyDirection(value, freshnessSortDirection);
    });
  }, [data.systemHealthMonitor.freshness.acceptedExceptions, freshnessSortDirection, freshnessSortKey]);

  const sortedDurableAlerts = useMemo(() => {
    return [...data.systemHealthMonitor.durableAlerts].sort((left, right) => {
      let value = 0;
      switch (alertSortKey) {
        case "date":
          value = compareDate(left.createdAt, right.createdAt);
          break;
        case "severity":
          value = compareText(left.severity, right.severity);
          break;
        case "type":
          value = compareText(left.alertType, right.alertType);
          break;
        case "scope":
          value = compareText(left.affectedScope, right.affectedScope);
          break;
      }
      return applyDirection(value, alertSortDirection);
    });
  }, [alertSortDirection, alertSortKey, data.systemHealthMonitor.durableAlerts]);

  const sortedQuarantineRows = useMemo(() => {
    return [...data.systemHealthMonitor.quarantine.rows].sort((left, right) => {
      let value = 0;
      switch (quarantineSortKey) {
        case "date":
          value = compareDate(left.createdAt, right.createdAt);
          break;
        case "stock":
          value = compareText(left.companyName, right.companyName);
          break;
        case "table":
          value = compareText(left.tableName, right.tableName);
          break;
        case "reason":
          value = compareText(left.reason, right.reason);
          break;
      }
      return applyDirection(value, quarantineSortDirection);
    });
  }, [data.systemHealthMonitor.quarantine.rows, quarantineSortDirection, quarantineSortKey]);

  const projectStats = [
    {
      label: "Active stocks",
      value: formatInteger(data.projectStatus.totalActiveStocks),
      note: "Active Yahoo-ready stocks currently tracked in stocks_master.",
    },
    {
      label: "Historical ready",
      value: formatInteger(data.projectStatus.stocksWithHistoricalData),
      note: "Stocks with durable historical price coverage.",
    },
    {
      label: "Latest snapshot ready",
      value: formatInteger(data.projectStatus.stocksWithLatestSnapshot),
      note: "Stocks with latest market snapshot coverage.",
    },
    {
      label: "Valuation ready",
      value: formatInteger(data.projectStatus.stocksWithValuationData),
      note: "Stocks with valuation, share statistics, and highlights coverage.",
    },
    {
      label: "Financial statements ready",
      value: formatInteger(data.projectStatus.stocksWithFinancialStatements),
      note: "Stocks with annual or quarterly financial statement coverage.",
    },
    {
      label: "Overall completion",
      value: formatPercent(data.projectStatus.overallImportCompletionPercentage),
      note: "Average stock-level Yahoo import completion across the active universe.",
    },
  ];

  const safetyStats = [
    {
      label: "Current throttle",
      value: data.importSafetyStatus.currentThrottle,
      note: "Live request pace and active worker count.",
    },
    {
      label: "Requests this hour",
      value: formatInteger(data.importSafetyStatus.requestsThisHour),
      note: "Raw Yahoo requests recorded in the current UTC hour.",
    },
    {
      label: "Requests today",
      value: formatInteger(data.importSafetyStatus.requestsToday),
      note: "Raw Yahoo requests recorded since UTC day start.",
    },
    {
      label: "Saved requests avoided",
      value: formatInteger(data.importSafetyStatus.savedRequestsAvoided),
      note: "Requests skipped because existing data was reused.",
    },
    {
      label: "Existing data reused",
      value: formatInteger(data.importSafetyStatus.existingDataReused),
      note: "Rows or modules reused instead of re-fetching from Yahoo.",
    },
    {
      label: "Latest batch status",
      value: data.importSafetyStatus.latestBatchStatus.replaceAll("_", " "),
      note: data.importSafetyStatus.cooldownStatus,
    },
  ];

  const qualityStats = [
    {
      label: "Average data quality score",
      value: `${formatInteger(data.dataQuality.averageDataQualityScore)} / 100`,
      note: "Price-data-focused score across the active stock universe.",
    },
    {
      label: "Stocks above 75",
      value: formatInteger(data.dataQuality.stocksAbove75),
      note: "Stocks with strong price-lane coverage and limited recent error pressure.",
    },
    {
      label: "Stocks below 50",
      value: formatInteger(data.dataQuality.stocksBelow50),
      note: "Stocks with weak or incomplete durable coverage right now.",
    },
    {
      label: "Missing snapshots",
      value: formatInteger(data.dataQuality.missingSnapshotCount),
      note: "Stocks still missing latest market snapshot coverage.",
    },
    {
      label: "Historical rows",
      value: formatInteger(data.dataQuality.historicalRowsCount),
      note: "Durable normalized rows in stock_price_history.",
    },
    {
      label: "Snapshot rows",
      value: formatInteger(data.dataQuality.snapshotRowsCount),
      note: "Durable normalized rows in stock_market_snapshot.",
    },
    {
      label: "Missing modules",
      value: formatInteger(data.dataQuality.missingModulesCount),
      note: "Incomplete module slots across the executive Yahoo coverage set.",
    },
    {
      label: "Warnings",
      value: formatInteger(data.dataQuality.warningCount),
      note: "Coverage warnings currently recorded across Yahoo module rows.",
    },
    {
      label: "Errors",
      value: formatInteger(data.dataQuality.errorCount),
      note: "Durable stock_import_errors rows currently recorded.",
    },
    {
      label: "Reconciliation pass / fail",
      value: `${formatInteger(data.dataQuality.reconciliationPassCount)} / ${formatInteger(data.dataQuality.reconciliationFailCount)}`,
      note: "Raw-vs-normalized reconciliation outcomes across all Yahoo modules.",
    },
  ];

  const productionChecklistStats = [
    {
      label: "Latest daily job",
      value: data.productionReadiness.latestDailyUpdateJobStatus.replaceAll("_", " "),
      note: "Most recent daily chart update job outcome from durable job history.",
    },
    {
      label: "Recent errors",
      value: formatInteger(data.productionReadiness.recentErrorCount),
      note: "stock_import_errors rows recorded in the last 24 hours.",
    },
    {
      label: "Cron status",
      value:
        data.productionReadiness.cronStatus === "disabled"
          ? "Disabled"
          : "Enabled",
      note: "Scheduler state for the daily chart update lane.",
    },
    {
      label: "Last cron run",
      value: formatDateTime(data.productionReadiness.lastCronRunTime),
      note: "Most recent scheduled run time. This stays empty while cron is disabled.",
    },
    {
      label: "Last cron result",
      value: data.productionReadiness.lastCronResult
        ? data.productionReadiness.lastCronResult.replaceAll("_", " ")
        : "Not available",
      note: "Most recent scheduled-run result. Manual runs do not count as cron runs.",
    },
    {
      label: "Active cron progress",
      value: data.productionReadiness.activeCronJobProgress
        ? `${formatInteger(data.productionReadiness.activeCronJobProgress.processedStocks)} / ${formatInteger(data.productionReadiness.activeCronJobProgress.totalStocks)}`
        : "No active cron job",
      note: data.productionReadiness.activeCronJobProgress
        ? `Job ${data.productionReadiness.activeCronJobProgress.jobId.slice(0, 8)} · next ${data.productionReadiness.activeCronJobProgress.nextPendingSymbol ?? "none"}`
        : "No queued or running same-day cron batch is currently in progress.",
    },
    {
      label: "Current recommendation",
      value: data.productionReadiness.currentRecommendation,
      note: data.productionReadiness.recommendationNote,
    },
  ];

  const systemHealthStats = [
    {
      label: "Last successful job",
      value: formatDateTime(data.systemHealthMonitor.importHealth.lastSuccessfulJobTime),
      note: "Most recent successful or completed-with-errors daily chart update job.",
    },
    {
      label: "Last failed job",
      value: formatDateTime(data.systemHealthMonitor.importHealth.lastFailedJobTime),
      note: "Most recent fully failed daily chart update job, if any.",
    },
    {
      label: "Jobs today",
      value: formatInteger(data.systemHealthMonitor.importHealth.totalJobsToday),
      note: "Recent daily chart update jobs counted in the current monitoring window.",
    },
    {
      label: "Failures today",
      value: formatInteger(data.systemHealthMonitor.importHealth.totalFailuresToday),
      note: "Daily chart update jobs that finished in failed state in the current monitoring window.",
    },
    {
      label: "Failure rate",
      value: formatPercent(data.systemHealthMonitor.importHealth.failureRatePercentage),
      note: "Failure share across recent daily chart update jobs.",
    },
    {
      label: "Requests last hour",
      value: formatInteger(data.systemHealthMonitor.systemLoad.requestsLastHour),
      note: "Raw Yahoo requests recorded in the last hour bucket.",
    },
    {
      label: "Stale stocks",
      value: formatInteger(data.systemHealthMonitor.freshness.staleStockCount),
      note: `Expected trading date: ${data.systemHealthMonitor.freshness.expectedTradingDate ?? "Not available"}. Freshness source: ${data.systemHealthMonitor.freshness.source === "durable" ? "durable daily validation" : "runtime fallback"}.`,
    },
  ];

  async function runAction(action: ActionKey) {
    setPendingAction(action);
    setBanner(null);

    try {
      const response = await fetch("/api/admin/market-data/import-control-center/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            message?: string;
            warnings?: string[];
          }
        | null;

      if (!response.ok || !payload) {
        setBanner({
          tone: "danger",
          text:
            cleanString(payload?.error, 4000) ||
            "The control-center import action could not complete right now.",
        });
        return;
      }

      setBanner({
        tone: "success",
        text: cleanString(payload.message, 4000) || "The control-center import action completed.",
        detail: Array.isArray(payload.warnings) && payload.warnings.length
          ? payload.warnings.map((warning) => cleanString(warning, 240)).join(" ")
          : undefined,
      });
      router.refresh();
    } finally {
      setPendingAction(null);
    }
  }

  const actionCards = [
    {
      key: "run_safe_dry_run" as const,
      title: "Run safe dry-run",
      note: `No Yahoo network call. Replays RELIANCE.NS through the full raw, normalize, coverage, activity, and reconciliation flow.`,
    },
    {
      key: "run_daily_chart_update" as const,
      title: "Run daily chart update",
      note: `Processes the next ${data.actionScope.boundedWorkerSlice} importable stocks through the safe daily Yahoo lane: recent historical update plus chart-only snapshot refresh, with protected modules disabled.`,
    },
    {
      key: "import_missing_historical_data" as const,
      title: "Import missing historical data",
      note: `Runs the next ${data.actionScope.boundedWorkerSlice} stocks missing historical coverage using safe missing-only mode.`,
    },
    {
      key: "refresh_todays_snapshots" as const,
      title: "Refresh today’s snapshots",
      note: `Runs the next ${data.actionScope.boundedWorkerSlice} importable stocks in safe snapshot mode. Existing same-day snapshots are skipped and logged.`,
    },
    {
      key: "retry_failed_safe_modules" as const,
      title: "Retry failed safe modules",
      note: `Retries historical and snapshot-safe modules only. Financial statements stay disabled for batch.`,
    },
  ];

  return (
    <div className="space-y-3">
      {banner ? (
        <AdminCard tone={banner.tone === "success" ? "primary" : "warning"} className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <AdminBadge
              label={banner.tone === "success" ? "Control-center action completed" : "Control-center action failed"}
              tone={banner.tone === "success" ? "success" : "danger"}
            />
            <p className="text-sm text-[#111827]">{banner.text}</p>
          </div>
          {banner.detail ? <p className="text-[12px] leading-5 text-[#6b7280]">{banner.detail}</p> : null}
        </AdminCard>
      ) : null}

      {data.warnings.length ? (
        <AdminCard tone="warning" className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <AdminBadge label="Durable read warnings" tone="warning" />
            <p className="text-sm text-[#9a3412]">
              The control center stayed up, but some Yahoo import tables could not be read cleanly.
            </p>
          </div>
          <ul className="space-y-1 text-[12px] leading-5 text-[#9a3412]">
            {data.warnings.map((warning, index) => (
              <li key={`control-center-warning-${index + 1}`}>{warning}</li>
            ))}
          </ul>
        </AdminCard>
      ) : null}

      <AdminStatGrid stats={projectStats} className="xl:grid-cols-3" />

      <AdminSectionCard
        title="What needs fixing next"
        description="This is the plain-language operator summary for the current Yahoo rollout. Read this first when you need to know what is healthy, what is partial, what is intentionally disabled, and what still needs a data-model migration before cleanup."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {data.whatNeedsFixingNext.map((item) => (
            <div key={item.key} className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[#111827]">{item.label}</p>
                <AdminBadge label={formatStateLabel(item.status)} tone={getStatusTone(item.status)} />
              </div>
              <p className="mt-1 text-sm font-medium text-[#111827]">{item.summary}</p>
              <p className="mt-1 text-sm leading-6 text-[#4b5563]">{item.detail}</p>
            </div>
          ))}
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="Status label guide"
        description="These labels are intentionally strict so operators know whether a lane is truly ready, partially usable, deliberately off, or blocked on migration work."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {data.statusLegend.map((item) => (
            <div key={item.key} className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <AdminBadge label={item.label} tone={getStatusTone(item.key)} />
              </div>
              <p className="mt-2 text-sm leading-6 text-[#4b5563]">{item.explanation}</p>
            </div>
          ))}
        </div>
      </AdminSectionCard>

      <AdminStatGrid stats={productionChecklistStats} className="xl:grid-cols-2" />

      <AdminSectionCard
        title="Production-readiness checklist"
        description="This is the operator go-live checklist for the daily Yahoo chart update lane. It summarizes whether coverage, quality, CLI execution, safety defaults, and recent error pressure are in a healthy enough state for unattended scheduling."
      >
        {data.productionReadiness.activeCronJobProgress ? (
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-[#111827]">Active cron job progress</p>
              <AdminBadge label={data.productionReadiness.activeCronJobProgress.status.replaceAll("_", " ")} tone="warning" />
            </div>
            <p className="mt-1 text-sm leading-6 text-[#4b5563]">
              Job {data.productionReadiness.activeCronJobProgress.jobId} is processing the {data.productionReadiness.activeCronJobProgress.cronWindow} lane for {data.productionReadiness.activeCronJobProgress.targetDate ?? "the current trading date"}.
              {` `}
              Processed {formatInteger(data.productionReadiness.activeCronJobProgress.processedStocks)} of {formatInteger(data.productionReadiness.activeCronJobProgress.totalStocks)} stocks, with {formatInteger(data.productionReadiness.activeCronJobProgress.pendingStocks)} still pending.
            </p>
            <p className="mt-1 text-sm leading-6 text-[#4b5563]">
              Last processed symbol {data.productionReadiness.activeCronJobProgress.lastProcessedSymbol ?? "Not available"}.
              {` `}
              Next pending symbol {data.productionReadiness.activeCronJobProgress.nextPendingSymbol ?? "None"}.
            </p>
          </div>
        ) : null}
        <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[#111827]">Current recommendation</p>
            <AdminBadge
              label={data.productionReadiness.currentRecommendation}
              tone={data.productionReadiness.currentRecommendation === "Ready" ? "success" : "warning"}
            />
          </div>
          <p className="mt-1 text-sm leading-6 text-[#4b5563]">
            {data.productionReadiness.recommendationNote}
          </p>
        </div>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          {data.productionReadiness.checklist.map((item) => (
            <div key={item.key} className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[#111827]">{item.label}</p>
                <AdminBadge label={formatStateLabel(item.status)} tone={getStatusTone(item.status)} />
              </div>
              <p className="mt-1 text-sm font-medium text-[#111827]">{item.summary}</p>
              <p className="mt-1 text-sm leading-6 text-[#4b5563]">{item.detail}</p>
            </div>
          ))}
        </div>
      </AdminSectionCard>

      <AdminStatGrid stats={systemHealthStats} className="xl:grid-cols-3" />

      <AdminSectionCard
        title="System Health Monitor"
        description="Live production-monitoring view for ingestion, data freshness, request load, and alert conditions. This is the operator surface for deciding whether the daily chart update lane is healthy enough to keep running as planned."
      >
        <div className="grid gap-3 xl:grid-cols-3">
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-[#111827]">Ingestion</p>
              <AdminBadge
                label={formatHealthLabel(data.systemHealthMonitor.indicators.ingestion)}
                tone={getHealthTone(data.systemHealthMonitor.indicators.ingestion)}
              />
            </div>
            <p className="mt-2 text-sm leading-6 text-[#4b5563]">
              Last successful job {formatDateTime(data.systemHealthMonitor.importHealth.lastSuccessfulJobTime)}. Failure rate {formatPercent(data.systemHealthMonitor.importHealth.failureRatePercentage)}.
            </p>
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-[#111827]">Data freshness</p>
              <AdminBadge
                label={formatHealthLabel(data.systemHealthMonitor.indicators.dataFreshness)}
                tone={getHealthTone(data.systemHealthMonitor.indicators.dataFreshness)}
              />
            </div>
            <p className="mt-2 text-sm leading-6 text-[#4b5563]">
              Missing recent updates {formatInteger(data.systemHealthMonitor.dataHealth.stocksMissingRecentUpdates)}. Stale snapshots {formatInteger(data.systemHealthMonitor.dataHealth.stocksWithStaleSnapshot)}.
            </p>
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-[#111827]">Error rate</p>
              <AdminBadge
                label={formatHealthLabel(data.systemHealthMonitor.indicators.errorRate)}
                tone={getHealthTone(data.systemHealthMonitor.indicators.errorRate)}
              />
            </div>
            <p className="mt-2 text-sm leading-6 text-[#4b5563]">
              Recent durable errors {formatInteger(data.productionReadiness.recentErrorCount)}. Repeated warnings {formatInteger(data.systemHealthMonitor.dataHealth.stocksWithRepeatedWarnings)}.
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-3">
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
            <p className="text-sm font-semibold text-[#111827]">Import health</p>
            <div className="mt-2 space-y-1 text-sm leading-6 text-[#4b5563]">
              <p>Last successful job: {formatDateTime(data.systemHealthMonitor.importHealth.lastSuccessfulJobTime)}</p>
              <p>Last failed job: {formatDateTime(data.systemHealthMonitor.importHealth.lastFailedJobTime)}</p>
              <p>Total jobs today: {formatInteger(data.systemHealthMonitor.importHealth.totalJobsToday)}</p>
              <p>Total failures today: {formatInteger(data.systemHealthMonitor.importHealth.totalFailuresToday)}</p>
              <p>Failure rate: {formatPercent(data.systemHealthMonitor.importHealth.failureRatePercentage)}</p>
            </div>
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
            <p className="text-sm font-semibold text-[#111827]">Data health</p>
            <div className="mt-2 space-y-1 text-sm leading-6 text-[#4b5563]">
              <p>Full historical coverage: {formatInteger(data.systemHealthMonitor.dataHealth.stocksWithFullHistoricalData)}</p>
              <p>Missing recent updates: {formatInteger(data.systemHealthMonitor.dataHealth.stocksMissingRecentUpdates)}</p>
              <p>Stale snapshots (&gt;24h): {formatInteger(data.systemHealthMonitor.dataHealth.stocksWithStaleSnapshot)}</p>
              <p>Repeated warnings: {formatInteger(data.systemHealthMonitor.dataHealth.stocksWithRepeatedWarnings)}</p>
            </div>
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
            <p className="text-sm font-semibold text-[#111827]">System load</p>
            <div className="mt-2 space-y-1 text-sm leading-6 text-[#4b5563]">
              <p>Requests in last hour: {formatInteger(data.systemHealthMonitor.systemLoad.requestsLastHour)}</p>
              <p>Requests today: {formatInteger(data.systemHealthMonitor.systemLoad.requestsToday)}</p>
              <p>Current throttle: {data.systemHealthMonitor.systemLoad.currentThrottleRate}</p>
              <p>Current worker count: {data.systemHealthMonitor.systemLoad.currentWorkerCount}</p>
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          {data.systemHealthMonitor.alerts.map((alert) => (
            <div key={alert.key} className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[#111827]">{alert.label}</p>
                <AdminBadge
                  label={alert.active ? formatHealthLabel(alert.status) : "Clear"}
                  tone={alert.active ? getHealthTone(alert.status) : "success"}
                />
              </div>
              <p className="mt-1 text-sm leading-6 text-[#4b5563]">{alert.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[#111827]">Durable critical alerts</p>
            <AdminBadge
              label={data.systemHealthMonitor.durableAlerts.length ? `${formatInteger(data.systemHealthMonitor.durableAlerts.length)} active` : "No active alerts"}
              tone={data.systemHealthMonitor.durableAlerts.length ? "danger" : "success"}
            />
            </div>
            {data.systemHealthMonitor.durableAlerts.length ? (
              <SortControls
                label="Sort alerts"
                value={alertSortKey}
                direction={alertSortDirection}
                options={alertSortOptions}
                onChange={setAlertSortKey}
                onDirectionChange={setAlertSortDirection}
              />
            ) : null}
          </div>
          {data.systemHealthMonitor.durableAlerts.length ? (
            <div className="mt-3 space-y-3">
              {sortedDurableAlerts.map((alert) => (
                <div key={alert.id} className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[#111827]">{alert.alertType.replaceAll("_", " ")}</p>
                    <AdminBadge
                      label={alert.severity}
                      tone={alert.severity === "critical" ? "danger" : "warning"}
                    />
                    <span className="text-[12px] text-[#6b7280]">{formatDateTime(alert.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[#4b5563]">{alert.message}</p>
                  <p className="mt-1 text-[12px] text-[#6b7280]">Scope: {alert.affectedScope}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm leading-6 text-[#4b5563]">
              No unresolved durable import alerts are active right now.
            </p>
          )}
        </div>

        <div className="mt-3 rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-[#111827]">Market-data quarantine</p>
              <AdminBadge
                label={
                  data.systemHealthMonitor.quarantine.activeRowCount
                    ? `${formatInteger(data.systemHealthMonitor.quarantine.activeRowCount)} active rows`
                    : "No active quarantine"
                }
                tone={data.systemHealthMonitor.quarantine.activeRowCount ? "warning" : "success"}
              />
              <span className="text-[12px] text-[#6b7280]">
                Affected stocks {formatInteger(data.systemHealthMonitor.quarantine.affectedStockCount)}
              </span>
            </div>
            {data.systemHealthMonitor.quarantine.rows.length ? (
              <SortControls
                label="Sort quarantine"
                value={quarantineSortKey}
                direction={quarantineSortDirection}
                options={quarantineSortOptions}
                onChange={setQuarantineSortKey}
                onDirectionChange={setQuarantineSortDirection}
              />
            ) : null}
          </div>
          <p className="mt-1 text-sm leading-6 text-[#4b5563]">
            Latest reason: {data.systemHealthMonitor.quarantine.latestReason ?? "No active quarantine reason recorded."}
          </p>
          {data.systemHealthMonitor.quarantine.rows.length ? (
            <div className="mt-3 space-y-3">
              {sortedQuarantineRows.map((row) => (
                <div key={row.id} className="rounded-lg border border-[#fde68a] bg-[#fffbeb] px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[#111827]">{row.companyName}</p>
                    {row.symbol ? <AdminBadge label={row.symbol} tone="default" /> : null}
                    {row.yahooSymbol ? <AdminBadge label={row.yahooSymbol} tone="info" /> : null}
                    <AdminBadge label={formatQuarantineTableLabel(row.tableName)} tone="warning" />
                    <AdminBadge label={row.status} tone="warning" />
                  </div>
                  <div className="mt-2 space-y-1 text-sm leading-6 text-[#4b5563]">
                    <p>Row date: {row.rowDate ?? "Not available"}</p>
                    <p>Reason: {row.reason}</p>
                    <p>Detected: {formatDateTime(row.createdAt)}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {row.route ? (
                      <Link href={row.route} className="text-[12px] text-[#1d4ed8] hover:underline">
                        Open stock page
                      </Link>
                    ) : null}
                    {Object.keys(row.evidence).length ? (
                      <p className="text-[12px] text-[#6b7280]">
                        Evidence keys: {Object.keys(row.evidence).slice(0, 5).join(", ")}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm leading-6 text-[#4b5563]">
              No market-data rows are actively quarantined right now.
            </p>
          )}
        </div>

        <div className="mt-3 rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[#111827]">Daily data freshness</p>
            <AdminBadge
              label={`${formatInteger(data.systemHealthMonitor.freshness.staleStockCount)} stale`}
              tone={data.systemHealthMonitor.freshness.staleStockCount > 0 ? "warning" : "success"}
            />
            {data.systemHealthMonitor.freshness.acceptedExceptionCount ? (
              <AdminBadge
                label={`${formatInteger(data.systemHealthMonitor.freshness.acceptedExceptionCount)} accepted exceptions`}
                tone="info"
              />
            ) : null}
            <span className="text-[12px] text-[#6b7280]">
              Checked {formatDateTime(data.systemHealthMonitor.freshness.checkedAt)}
            </span>
            <span className="text-[12px] text-[#6b7280]">
              Expected trading date {data.systemHealthMonitor.freshness.expectedTradingDate ?? "Not available"}
            </span>
            </div>
            {data.systemHealthMonitor.freshness.staleStocks.length ||
            data.systemHealthMonitor.freshness.acceptedExceptions.length ? (
              <SortControls
                label="Sort stale stocks"
                value={freshnessSortKey}
                direction={freshnessSortDirection}
                options={freshnessSortOptions}
                onChange={setFreshnessSortKey}
                onDirectionChange={setFreshnessSortDirection}
              />
            ) : null}
          </div>
          {data.systemHealthMonitor.freshness.staleStocks.length ||
          data.systemHealthMonitor.freshness.acceptedExceptions.length ? (
            <div className="mt-3 space-y-3">
              <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
                <p className="text-sm font-semibold text-[#111827]">Reason categories</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(data.systemHealthMonitor.freshness.reasonCounts).map(([reason, count]) => (
                    <AdminBadge
                      key={reason}
                      label={`${formatFreshnessReasonLabel(reason)}: ${formatInteger(count)}`}
                      tone={reason.startsWith("stale_") || reason === "symbol_issue" ? "warning" : "info"}
                    />
                  ))}
                </div>
              </div>
              <p className="text-[12px] leading-5 text-[#6b7280]">
                Some low-liquidity stocks may not have daily data from provider.
              </p>
              {sortedStaleStocks.map((stock) => (
                <div key={stock.stockId} className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[#111827]">{stock.companyName}</p>
                    <AdminBadge label={stock.symbol} tone="default" />
                    {stock.yahooSymbol ? <AdminBadge label={stock.yahooSymbol} tone="info" /> : null}
                    <AdminBadge label={formatFreshnessReasonLabel(stock.reasonCategory)} tone={stock.isStale ? "warning" : "info"} />
                  </div>
                  <div className="mt-2 space-y-1 text-sm leading-6 text-[#4b5563]">
                    <p>Expected trading date: {stock.expectedTradingDate ?? "Not available"}</p>
                    <p>Evaluation date: {stock.evaluationDate ?? "Not available"}</p>
                    <p>Has expected-date price: {stock.hasTodayPrice ? "Yes" : "No"}</p>
                    <p>Has expected-date snapshot: {stock.hasTodaySnapshot ? "Yes" : "No"}</p>
                    <p>Last price date: {stock.lastPriceDate ?? "Not available"}</p>
                    <p>Last snapshot date: {stock.lastSnapshotDate ?? "Not available"}</p>
                    <p>Market session: {stock.marketSessionState ?? "Not available"}</p>
                  </div>
                  <div className="mt-2">
                    <Link href={stock.route} className="text-[12px] text-[#1d4ed8] hover:underline">
                      Open stock page
                    </Link>
                  </div>
                </div>
              ))}
              {sortedAcceptedExceptions.length ? (
                <div className="rounded-lg border border-[#dbeafe] bg-[#eff6ff] px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[#111827]">Accepted Exceptions</p>
                    <AdminBadge
                      label={formatInteger(sortedAcceptedExceptions.length)}
                      tone="info"
                    />
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[#4b5563]">
                    These symbols are treated as acceptable provider exceptions and do not block freshness readiness.
                  </p>
                  <div className="mt-3 space-y-3">
                    {sortedAcceptedExceptions.map((stock) => (
                      <div key={stock.stockId} className="rounded-lg border border-[#bfdbfe] bg-white px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[#111827]">{stock.companyName}</p>
                          <AdminBadge label={stock.symbol} tone="default" />
                          {stock.yahooSymbol ? <AdminBadge label={stock.yahooSymbol} tone="info" /> : null}
                          <AdminBadge label={formatFreshnessReasonLabel(stock.reasonCategory)} tone="info" />
                        </div>
                        <div className="mt-2 space-y-1 text-sm leading-6 text-[#4b5563]">
                          <p>Expected trading date: {stock.expectedTradingDate ?? "Not available"}</p>
                          <p>Evaluation date: {stock.evaluationDate ?? "Not available"}</p>
                          <p>Has expected-date price: {stock.hasTodayPrice ? "Yes" : "No"}</p>
                          <p>Has expected-date snapshot: {stock.hasTodaySnapshot ? "Yes" : "No"}</p>
                          <p>Last price date: {stock.lastPriceDate ?? "Not available"}</p>
                          <p>Last snapshot date: {stock.lastSnapshotDate ?? "Not available"}</p>
                          <p>Market session: {stock.marketSessionState ?? "Not available"}</p>
                        </div>
                        <div className="mt-2">
                          <Link href={stock.route} className="text-[12px] text-[#1d4ed8] hover:underline">
                            Open stock page
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm leading-6 text-[#4b5563]">
              No stale stocks are currently flagged by the data freshness guard.
            </p>
          )}
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="Data source status"
        description="This keeps the executive source truth clear: what is live, what is degraded, what is intentionally disabled, and what stays future-only."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {data.dataSourceStatus.map((item) => (
            <div key={item.label} className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[#111827]">{item.label}</p>
                <AdminBadge label={item.summary} tone={getStatusTone(item.status)} />
              </div>
              <p className="mt-1 text-sm leading-6 text-[#4b5563]">{item.note}</p>
            </div>
          ))}
        </div>
      </AdminSectionCard>

      <AdminStatGrid stats={safetyStats} className="xl:grid-cols-3" />

      <AdminSectionCard
        title="Import safety status"
        description="Throttle, request budget, reuse, cooldown, and disabled-module signals that keep the Yahoo importer from drifting into wasteful behavior."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Cooldown and workers</p>
            <p className="mt-1 text-sm font-medium text-[#111827]">{data.importSafetyStatus.concurrentWorkerSetting}</p>
            <p className="mt-1 text-sm leading-6 text-[#4b5563]">{data.importSafetyStatus.cooldownStatus}</p>
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Disabled modules</p>
            {data.importSafetyStatus.disabledModules.length ? (
              <ul className="mt-1 space-y-1 text-sm leading-6 text-[#4b5563]">
                {data.importSafetyStatus.disabledModules.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm leading-6 text-[#4b5563]">No disabled modules are currently recorded.</p>
            )}
          </div>
        </div>
        {data.importSafetyStatus.lastYahooError ? (
          <div className="mt-3 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#b91c1c]">Last Yahoo error</p>
            <p className="mt-1 text-sm leading-6 text-[#991b1b]">{data.importSafetyStatus.lastYahooError}</p>
          </div>
        ) : null}
      </AdminSectionCard>

      <AdminStatGrid stats={qualityStats} className="xl:grid-cols-3" />

      <AdminSectionCard
        title="Data quality score"
        description="This score is intentionally price-data-focused for now. Historical prices and latest snapshots carry most of the weight because Yahoo protected fundamentals remain blocked or degraded at scale."
      >
        <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
          <p className="text-sm leading-6 text-[#4b5563]">{data.dataQuality.scoreModelNote}</p>
        </div>
        <div className="mt-3">
          <div className="mb-3 flex justify-end">
            <SortControls
              label="Sort worst stocks"
              value={worstStockSortKey}
              direction={worstStockSortDirection}
              options={worstStockSortOptions}
              onChange={setWorstStockSortKey}
              onDirectionChange={setWorstStockSortDirection}
            />
          </div>
          {renderWorstStockRows(sortedWorstStocks)}
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="Control-center actions"
        description="These one-click actions never start automatically on page load. They run bounded safe slices, keep the throttle at one worker, and leave financial statements disabled for batch."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {actionCards.map((card) => (
            <div key={card.key} className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[#111827]">{card.title}</p>
                  <p className="mt-1 text-sm leading-6 text-[#4b5563]">{card.note}</p>
                </div>
                <button
                  type="button"
                  onClick={() => runAction(card.key)}
                  disabled={pendingAction !== null}
                  className="inline-flex h-8 items-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-3 text-[13px] font-medium text-white transition hover:bg-[#111c33] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pendingAction === card.key ? "Running…" : "Run"}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/admin/market-data/stocks"
            className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] font-medium text-[#111827] transition hover:bg-[#f9fafb]"
          >
            Open full stock import dashboard
          </Link>
          <Link
            href="/admin/market-data/yahoo-import-guide"
            className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] font-medium text-[#111827] transition hover:bg-[#f9fafb]"
          >
            Open Yahoo operations guide
          </Link>
          <Link
            href="/admin/market-data/yahoo-import-guide#production-runbook"
            className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] font-medium text-[#111827] transition hover:bg-[#f9fafb]"
          >
            Open 2,000-stock runbook
          </Link>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="Recent activity"
        description="The latest durable Yahoo step logs, failures, skips, and reused-data signals across the import system."
      >
        <div className="mb-3 flex justify-end">
          <SortControls
            label="Sort activity"
            value={activitySortKey}
            direction={activitySortDirection}
            options={activitySortOptions}
            onChange={setActivitySortKey}
            onDirectionChange={setActivitySortDirection}
          />
        </div>
        {renderActivityRows(sortedLatestEvents)}
      </AdminSectionCard>

      <div className="grid gap-3 xl:grid-cols-3">
        <AdminSectionCard
          title="Latest failed imports"
          description="Newest failed Yahoo activity events. These should lead your root-cause review before any retry."
          collapsible
          defaultOpen
        >
          <div className="mb-3 flex justify-end">
            <SortControls
              label="Sort failed"
              value={failedSortKey}
              direction={failedSortDirection}
              options={activitySortOptions}
              onChange={setFailedSortKey}
              onDirectionChange={setFailedSortDirection}
            />
          </div>
          {renderActivityRows(sortedLatestFailedImports)}
        </AdminSectionCard>
        <AdminSectionCard
          title="Latest skipped imports"
          description="Newest skip events, including same-day snapshot skips and missing-only history skips."
          collapsible
          defaultOpen
        >
          <div className="mb-3 flex justify-end">
            <SortControls
              label="Sort skipped"
              value={skippedSortKey}
              direction={skippedSortDirection}
              options={activitySortOptions}
              onChange={setSkippedSortKey}
              onDirectionChange={setSkippedSortDirection}
            />
          </div>
          {renderActivityRows(sortedLatestSkippedImports)}
        </AdminSectionCard>
        <AdminSectionCard
          title="Latest reused-data events"
          description="Newest actions where the importer avoided Yahoo waste by reusing existing rows or skipping duplicate requests."
          collapsible
          defaultOpen
        >
          <div className="mb-3 flex justify-end">
            <SortControls
              label="Sort reused"
              value={reusedSortKey}
              direction={reusedSortDirection}
              options={activitySortOptions}
              onChange={setReusedSortKey}
              onDirectionChange={setReusedSortDirection}
            />
          </div>
          {renderActivityRows(sortedLatestReusedDataEvents)}
        </AdminSectionCard>
      </div>

      <AdminSectionCard
        title="Progress by module"
        description="Executive module view across historical prices, degraded snapshot-only quote mode, blocked fundamentals, and the currently disabled financial-statement batch lane."
      >
        <div className="mb-3 flex justify-end">
          <SortControls
            label="Sort modules"
            value={moduleSortKey}
            direction={moduleSortDirection}
            options={moduleSortOptions}
            onChange={setModuleSortKey}
            onDirectionChange={setModuleSortDirection}
          />
        </div>
        {renderModuleRows(sortedModuleProgress)}
      </AdminSectionCard>
    </div>
  );
}
