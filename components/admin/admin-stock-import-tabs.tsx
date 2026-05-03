import Link from "next/link";
import type { ReactNode } from "react";

import {
  AdminBadge,
  AdminEmptyState,
  AdminSectionCard,
  AdminSimpleTable,
} from "@/components/admin/admin-primitives";
import { getInternalLinkProps } from "@/lib/link-utils";
import type { AdminStockImportDetails } from "@/lib/admin-stock-import-dashboard";

export type StockImportEditorTabKey =
  | "basic_info"
  | "price_history"
  | "market_snapshot"
  | "valuation"
  | "financials"
  | "dividends_splits"
  | "earnings_analyst"
  | "holders"
  | "options"
  | "news"
  | "import_logs"
  | "raw_yahoo_data";

export const stockImportEditorTabs: Array<{
  key: StockImportEditorTabKey;
  label: string;
}> = [
  { key: "basic_info", label: "Basic Info" },
  { key: "price_history", label: "Price History" },
  { key: "market_snapshot", label: "Market Snapshot" },
  { key: "valuation", label: "Valuation" },
  { key: "financials", label: "Financials" },
  { key: "dividends_splits", label: "Dividends/Splits" },
  { key: "earnings_analyst", label: "Earnings/Analyst" },
  { key: "holders", label: "Holders" },
  { key: "options", label: "Options" },
  { key: "news", label: "News" },
  { key: "import_logs", label: "Import Logs" },
  { key: "raw_yahoo_data", label: "Raw Yahoo Data" },
];

type JsonRecord = Record<string, unknown>;

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function formatDateTime(value: unknown) {
  const normalized = cleanString(value, 120);
  if (!normalized) {
    return "Not available";
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return normalized;
  }

  return parsed.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDate(value: unknown) {
  const normalized = cleanString(value, 120);
  if (!normalized) {
    return "Not available";
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return normalized;
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatNumber(value: unknown, options?: Intl.NumberFormatOptions) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-IN", options).format(parsed);
}

function formatPercent(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "0%";
  }

  return `${parsed.toFixed(1)}%`;
}

function hasMeaningfulValue(value: unknown) {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }
  return true;
}

function formatValue(value: unknown): ReactNode {
  if (!hasMeaningfulValue(value)) {
    return <span className="text-[#9ca3af]">Not available</span>;
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return formatNumber(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => cleanString(item, 120)).filter(Boolean).join(", ");
  }

  if (typeof value === "object") {
    return (
      <pre className="max-h-56 overflow-auto rounded-lg bg-[#0f172a] p-3 text-[11px] leading-5 text-[#e2e8f0]">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  const text = cleanString(value, 4000);
  if (!text) {
    return <span className="text-[#9ca3af]">Not available</span>;
  }

  if (text.length > 180) {
    return <span className="whitespace-pre-wrap break-words">{text}</span>;
  }

  return text;
}

function humanizeKey(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function summarizeMissingFields(details: AdminStockImportDetails | null) {
  if (!details) {
    return [];
  }

  return details.coverageRows
    .filter((row) => row.missingFieldKeys.length > 0 || row.warningCount > 0 || row.errorCount > 0)
    .map((row) => ({
      bucket: humanizeKey(row.bucketKey),
      coverageStatus: row.coverageStatus,
      fillPercentage: row.fillPercentage || row.completionPercentage,
      missingFields: row.missingFieldKeys,
      warningCount: row.warningCount,
      errorCount: row.errorCount,
      coverageNotes: row.coverageNotes,
    }));
}

function renderMetricRecordCard(title: string, record: JsonRecord | null, preferredKeys: string[]) {
  if (!record || !Object.keys(record).length) {
    return (
      <AdminEmptyState
        title={`No ${title.toLowerCase()} yet`}
        description={`Yahoo has not filled the ${title.toLowerCase()} bucket for this stock yet.`}
      />
    );
  }

  const filteredEntries = preferredKeys
    .map((key) => [key, record[key]] as const)
    .filter(([, value]) => hasMeaningfulValue(value));
  const fallbackEntries =
    filteredEntries.length > 0
      ? filteredEntries
      : Object.entries(record).filter(
          ([key, value]) =>
            !["id", "stock_id", "raw_payload", "normalized_payload"].includes(key) &&
            hasMeaningfulValue(value),
        );

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {fallbackEntries.map(([key, value]) => (
        <div key={`${title}-${key}`} className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">
            {humanizeKey(key)}
          </p>
          <div className="mt-1 text-[13px] leading-5 text-[#111827]">{formatValue(value)}</div>
        </div>
      ))}
    </div>
  );
}

function renderJsonTable(
  rows: JsonRecord[],
  preferredKeys: string[],
  emptyTitle: string,
  emptyDescription: string,
) {
  if (!rows.length) {
    return <AdminEmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const keys = preferredKeys.filter((key) => rows.some((row) => hasMeaningfulValue(row[key])));
  const activeKeys =
    keys.length > 0
      ? keys
      : Object.keys(rows[0] ?? {}).filter(
          (key) => !["id", "stock_id", "raw_payload", "normalized_payload"].includes(key),
        );

  return (
    <AdminSimpleTable
      columns={activeKeys.map(humanizeKey)}
      rows={rows.map((row) =>
        activeKeys.map((key) => {
          if (key.endsWith("_at")) {
            return formatDateTime(row[key]);
          }
          if (key.includes("date")) {
            return formatDate(row[key]);
          }
          return formatValue(row[key]);
        }),
      )}
    />
  );
}

function CoverageSummary({
  details,
  bucketKeys,
}: {
  details: AdminStockImportDetails | null;
  bucketKeys: string[];
}) {
  if (!details) {
    return null;
  }

  const rows = details.coverageRows.filter((row) => bucketKeys.includes(row.bucketKey));
  if (!rows.length) {
    return (
      <AdminEmptyState
        title="No coverage report yet"
        description="Coverage percentages and missing-field reports will appear here after the Yahoo import jobs finish."
      />
    );
  }

  return (
    <AdminSimpleTable
      columns={["Bucket", "Status", "Completion", "Fill", "Rows", "Latest date", "Missing fields"]}
      rows={rows.map((row) => [
        humanizeKey(row.bucketKey),
        <AdminBadge
          key={`${row.bucketKey}-status`}
          label={row.coverageStatus}
          tone={
            row.coverageStatus === "current"
              ? "success"
              : row.coverageStatus === "error"
                ? "danger"
                : "warning"
          }
        />,
        formatPercent(row.completionPercentage),
        formatPercent(row.fillPercentage),
        `${row.rowsImported || row.rowCount} / ${row.rowsAvailable || row.rowCount || 0}`,
        row.latestTradeDate || row.latestFiscalDate
          ? formatDate(row.latestTradeDate || row.latestFiscalDate)
          : "Not available",
        row.missingFieldKeys.length ? row.missingFieldKeys.join(", ") : "None",
      ])}
    />
  );
}

export function AdminStockImportMissingFieldsReport({
  details,
}: {
  details: AdminStockImportDetails | null;
}) {
  const rows = summarizeMissingFields(details);

  if (!rows.length) {
    return (
      <AdminEmptyState
        title="No missing-field gaps recorded"
        description="This stock does not currently show missing Yahoo field warnings in the durable coverage report."
      />
    );
  }

  return (
    <AdminSimpleTable
      columns={["Bucket", "Status", "Fill", "Warnings / errors", "Missing fields", "Notes"]}
      rows={rows.map((row) => [
        row.bucket,
        <AdminBadge
          key={`${row.bucket}-status`}
          label={row.coverageStatus}
          tone={
            row.coverageStatus === "current"
              ? "success"
              : row.coverageStatus === "error"
                ? "danger"
                : "warning"
          }
        />,
        formatPercent(row.fillPercentage),
        `${row.warningCount} warning${row.warningCount === 1 ? "" : "s"} / ${row.errorCount} error${row.errorCount === 1 ? "" : "s"}`,
        row.missingFields.length ? row.missingFields.join(", ") : "None",
        row.coverageNotes || "No extra notes",
      ])}
    />
  );
}

export function AdminStockImportRawResponsePanel({
  details,
}: {
  details: AdminStockImportDetails | null;
}) {
  if (!details?.rawImports.length) {
    return (
      <AdminEmptyState
        title="No raw Yahoo responses yet"
        description="Raw Yahoo payloads are stored before normalization and will appear here once this stock has been imported."
      />
    );
  }

  return (
    <div className="space-y-3">
      {details.rawImports.map((row, index) => (
        <AdminSectionCard
          key={cleanString(row.id, 160) || `raw-import-${index + 1}`}
          title={`${cleanString(row.source_bucket, 240) || "Yahoo bucket"} • ${cleanString(row.module_name, 240) || cleanString(row.request_type, 240) || "raw response"}`}
          description={`${cleanString(row.request_url, 400) || "Request URL unavailable"} • Imported ${formatDateTime(row.imported_at)}`}
          collapsible
          defaultOpen={index === 0}
        >
          <div className="grid gap-3 xl:grid-cols-2">
            <div className="space-y-2 rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
              <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Status</p>
              <div className="flex flex-wrap items-center gap-2">
                <AdminBadge
                  label={cleanString(row.status, 120) || "unknown"}
                  tone={cleanString(row.status, 120) === "succeeded" ? "success" : "warning"}
                />
                <span className="text-[13px] text-[#4b5563]">
                  Response status {cleanString(row.response_status, 80) || "n/a"}
                </span>
              </div>
              <p className="text-[13px] leading-5 text-[#4b5563]">
                {cleanString(row.error_message, 4000) || "No provider error recorded for this raw capture."}
              </p>
            </div>
            <div className="space-y-2 rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
              <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Normalized payload</p>
              <div className="text-[13px] leading-5 text-[#111827]">
                {formatValue(row.normalized_payload)}
              </div>
            </div>
          </div>
          <div className="mt-3">
            <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">
              Raw payload
            </p>
            <div className="text-[13px] leading-5 text-[#111827]">{formatValue(row.raw_payload)}</div>
          </div>
        </AdminSectionCard>
      ))}
    </div>
  );
}

export function AdminStockImportTabs({
  activeTab,
  details,
}: {
  activeTab: Exclude<StockImportEditorTabKey, "basic_info">;
  details: AdminStockImportDetails | null;
}) {
  if (!details) {
    return (
      <AdminEmptyState
        title="No stock import data yet"
        description="This stock does not have durable Yahoo import data available in this environment yet."
      />
    );
  }

  const route = details.stock.route;

  if (activeTab === "price_history") {
    return (
      <div className="space-y-3">
        <AdminSectionCard
          title="Historical daily price coverage"
          description="Latest imported Yahoo daily OHLCV rows and coverage status for this stock."
        >
          <CoverageSummary details={details} bucketKeys={["historical_prices"]} />
        </AdminSectionCard>
        <AdminSectionCard
          title="Latest daily rows"
          description={`Public route: ${route}`}
        >
          {renderJsonTable(
            details.latestPriceHistoryRows,
            ["trade_date", "open", "high", "low", "close", "adj_close", "volume", "source_name", "imported_at"],
            "No historical rows yet",
            "Run the Yahoo historical importer for this stock to populate stock_price_history.",
          )}
        </AdminSectionCard>
      </div>
    );
  }

  if (activeTab === "market_snapshot") {
    return (
      <div className="space-y-3">
        <AdminSectionCard
          title="Latest market snapshot coverage"
          description="Live price, change, day range, volume, and market-cap level fields from the latest Yahoo quote import."
        >
          <CoverageSummary details={details} bucketKeys={["latest_market_snapshot"]} />
        </AdminSectionCard>
        <AdminSectionCard title="Recent snapshot rows" description="Latest stored market snapshots for this stock.">
          {renderJsonTable(
            details.latestMarketSnapshotRows,
            ["trade_date", "snapshot_at", "price", "previous_close", "open", "day_high", "day_low", "change_absolute", "change_percent", "volume", "market_cap", "imported_at"],
            "No market snapshot rows yet",
            "Run the Yahoo quote/statistics importer to populate stock_market_snapshot.",
          )}
        </AdminSectionCard>
      </div>
    );
  }

  if (activeTab === "valuation") {
    return (
      <div className="space-y-3">
        <AdminSectionCard
          title="Valuation coverage"
          description="Field-fill coverage for valuation metrics, share statistics, and financial highlights."
        >
          <CoverageSummary
            details={details}
            bucketKeys={["valuation_metrics", "share_statistics", "financial_highlights"]}
          />
        </AdminSectionCard>
        <AdminSectionCard title="Valuation metrics" description="Latest normalized valuation metrics row.">
          {renderMetricRecordCard("Valuation metrics", details.latestValuationMetrics, [
            "trade_date",
            "market_cap",
            "enterprise_value",
            "trailing_pe",
            "forward_pe",
            "peg_ratio",
            "price_to_book",
            "enterprise_to_revenue",
            "enterprise_to_ebitda",
            "source_name",
            "imported_at",
          ])}
        </AdminSectionCard>
        <AdminSectionCard title="Share statistics" description="Latest normalized share statistics row.">
          {renderMetricRecordCard("Share statistics", details.latestShareStatistics, [
            "trade_date",
            "shares_outstanding",
            "float_shares",
            "held_percent_insiders",
            "held_percent_institutions",
            "shares_short",
            "short_ratio",
            "short_percent_of_float",
            "source_name",
            "imported_at",
          ])}
        </AdminSectionCard>
        <AdminSectionCard title="Financial highlights" description="Latest normalized financial highlights row.">
          {renderMetricRecordCard("Financial highlights", details.latestFinancialHighlights, [
            "fiscal_date",
            "revenue",
            "gross_profit",
            "ebitda",
            "net_income",
            "diluted_eps",
            "operating_cash_flow",
            "free_cash_flow",
            "total_debt",
            "source_name",
            "imported_at",
          ])}
        </AdminSectionCard>
      </div>
    );
  }

  if (activeTab === "financials") {
    return (
      <div className="space-y-3">
        <AdminSectionCard
          title="Financial statement coverage"
          description="Annual and quarterly statement coverage from the Yahoo financial statement import."
        >
          <CoverageSummary
            details={details}
            bucketKeys={[
              "income_statement_annual",
              "income_statement_quarterly",
              "balance_sheet_annual",
              "balance_sheet_quarterly",
              "cash_flow_annual",
              "cash_flow_quarterly",
            ]}
          />
        </AdminSectionCard>
        <AdminSectionCard title="Income statement" description="Annual and quarterly income statement rows.">
          <div className="space-y-3">
            {renderJsonTable(
              details.incomeStatementAnnualRows,
              ["period_type", "fiscal_date", "total_revenue", "gross_profit", "operating_income", "net_income", "diluted_eps", "source_name", "imported_at"],
              "No annual income statement rows yet",
              "Yahoo has not imported annual income statement rows for this stock yet.",
            )}
            {renderJsonTable(
              details.incomeStatementQuarterlyRows,
              ["period_type", "fiscal_date", "total_revenue", "gross_profit", "operating_income", "net_income", "diluted_eps", "source_name", "imported_at"],
              "No quarterly income statement rows yet",
              "Yahoo has not imported quarterly income statement rows for this stock yet.",
            )}
          </div>
        </AdminSectionCard>
        <AdminSectionCard title="Balance sheet" description="Annual and quarterly balance sheet rows.">
          <div className="space-y-3">
            {renderJsonTable(
              details.balanceSheetAnnualRows,
              ["period_type", "fiscal_date", "total_assets", "total_liabilities_net_minority_interest", "stockholders_equity", "cash_and_cash_equivalents", "total_debt", "source_name", "imported_at"],
              "No annual balance-sheet rows yet",
              "Yahoo has not imported annual balance-sheet rows for this stock yet.",
            )}
            {renderJsonTable(
              details.balanceSheetQuarterlyRows,
              ["period_type", "fiscal_date", "total_assets", "total_liabilities_net_minority_interest", "stockholders_equity", "cash_and_cash_equivalents", "total_debt", "source_name", "imported_at"],
              "No quarterly balance-sheet rows yet",
              "Yahoo has not imported quarterly balance-sheet rows for this stock yet.",
            )}
          </div>
        </AdminSectionCard>
        <AdminSectionCard title="Cash flow" description="Annual and quarterly cash-flow rows.">
          <div className="space-y-3">
            {renderJsonTable(
              details.cashFlowAnnualRows,
              ["period_type", "fiscal_date", "operating_cash_flow", "investing_cash_flow", "financing_cash_flow", "free_cash_flow", "capital_expenditure", "source_name", "imported_at"],
              "No annual cash-flow rows yet",
              "Yahoo has not imported annual cash-flow rows for this stock yet.",
            )}
            {renderJsonTable(
              details.cashFlowQuarterlyRows,
              ["period_type", "fiscal_date", "operating_cash_flow", "investing_cash_flow", "financing_cash_flow", "free_cash_flow", "capital_expenditure", "source_name", "imported_at"],
              "No quarterly cash-flow rows yet",
              "Yahoo has not imported quarterly cash-flow rows for this stock yet.",
            )}
          </div>
        </AdminSectionCard>
      </div>
    );
  }

  if (activeTab === "dividends_splits") {
    return (
      <div className="space-y-3">
        <AdminSectionCard title="Dividend history" description="Latest normalized dividend rows imported from Yahoo.">
          {renderJsonTable(
            details.dividendRows,
            ["ex_dividend_date", "payment_date", "record_date", "dividend_amount", "currency_code", "source_name", "imported_at"],
            "No dividends yet",
            "Yahoo has not imported dividend rows for this stock yet.",
          )}
        </AdminSectionCard>
        <AdminSectionCard title="Split history" description="Latest normalized split rows imported from Yahoo.">
          {renderJsonTable(
            details.splitRows,
            ["split_date", "split_ratio", "from_factor", "to_factor", "source_name", "imported_at"],
            "No stock splits yet",
            "Yahoo has not imported split rows for this stock yet.",
          )}
        </AdminSectionCard>
      </div>
    );
  }

  if (activeTab === "earnings_analyst") {
    return (
      <div className="space-y-3">
        <AdminSectionCard title="Earnings events" description="Latest earnings event rows.">
          {renderJsonTable(
            details.earningsEventRows,
            ["event_date", "start_date", "end_date", "eps_estimate", "eps_actual", "surprise_percent", "source_name", "imported_at"],
            "No earnings events yet",
            "Yahoo has not imported earnings event rows for this stock yet.",
          )}
        </AdminSectionCard>
        <AdminSectionCard title="Earnings trend" description="Latest annual and forward earnings-trend rows.">
          {renderJsonTable(
            details.earningsTrendRows,
            ["period_type", "fiscal_date", "earnings_estimate", "revenue_estimate", "growth_percent", "source_name", "imported_at"],
            "No earnings trend rows yet",
            "Yahoo has not imported earnings trend rows for this stock yet.",
          )}
        </AdminSectionCard>
        <AdminSectionCard title="Analyst ratings" description="Latest analyst recommendation rows.">
          {renderJsonTable(
            details.analystRatingRows,
            ["fiscal_date", "rating_mean", "rating_recommendation", "target_mean_price", "target_high_price", "target_low_price", "number_of_analysts", "source_name", "imported_at"],
            "No analyst ratings yet",
            "Yahoo has not imported analyst rating rows for this stock yet.",
          )}
        </AdminSectionCard>
      </div>
    );
  }

  if (activeTab === "holders") {
    return (
      <div className="space-y-3">
        <AdminSectionCard title="Holder summary" description="Latest normalized ownership summary rows.">
          {renderJsonTable(
            details.holdersSummaryRows,
            ["fiscal_date", "insider_percent_held", "institution_percent_held", "institution_count", "float_shares", "shares_outstanding", "source_name", "imported_at"],
            "No holder summary yet",
            "Yahoo has not imported holder summary rows for this stock yet.",
          )}
        </AdminSectionCard>
        <AdminSectionCard title="Holder detail" description="Latest normalized holder detail rows.">
          {renderJsonTable(
            details.holdersDetailRows,
            ["fiscal_date", "holder_name", "holder_type", "shares_held", "percent_out", "value", "source_name", "imported_at"],
            "No holder detail yet",
            "Yahoo has not imported holder detail rows for this stock yet.",
          )}
        </AdminSectionCard>
      </div>
    );
  }

  if (activeTab === "options") {
    return (
      <AdminSectionCard title="Options contracts" description="Latest imported options rows for this stock.">
        {renderJsonTable(
          details.optionsRows,
          ["expiry_date", "contract_symbol", "option_type", "strike", "last_price", "bid", "ask", "volume", "open_interest", "implied_volatility", "source_name", "imported_at"],
          "No options rows yet",
          "Yahoo has not imported options data for this stock yet.",
        )}
      </AdminSectionCard>
    );
  }

  if (activeTab === "news") {
    return (
      <AdminSectionCard title="Stock news" description="Latest imported Yahoo news rows for this stock.">
        {renderJsonTable(
          details.newsRows,
          ["published_at", "headline", "publisher", "canonical_url", "external_news_id", "source_name", "imported_at"],
          "No stock news yet",
          "Yahoo has not imported stock news rows for this stock yet.",
        )}
      </AdminSectionCard>
    );
  }

  if (activeTab === "import_logs") {
    return (
      <div className="space-y-3">
        <AdminSectionCard
          title="Coverage and missing-field report"
          description="Durable import coverage, fill percentage, and missing-field gaps for every imported Yahoo bucket."
        >
          <AdminStockImportMissingFieldsReport details={details} />
        </AdminSectionCard>
        <AdminSectionCard title="Import jobs" description="Latest durable Yahoo import jobs for this stock.">
          {renderJsonTable(
            details.importJobs,
            ["started_at", "completed_at", "status", "job_kind", "import_scope", "source_symbol", "requested_by", "imported_items", "updated_items", "skipped_items", "failed_items", "warning_items"],
            "No import jobs yet",
            "This stock has not recorded any durable stock import jobs yet.",
          )}
        </AdminSectionCard>
        <AdminSectionCard title="Import errors" description="Latest durable Yahoo import errors for this stock.">
          {renderJsonTable(
            details.importErrors,
            ["imported_at", "bucket_key", "error_stage", "error_code", "error_message", "trade_date", "fiscal_date"],
            "No import errors recorded",
            "This stock does not currently have durable Yahoo import errors recorded.",
          )}
        </AdminSectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AdminSectionCard
        title="Latest raw Yahoo responses"
        description="Inspect the latest stored Yahoo raw payloads and normalized snapshots for this stock."
      >
        {route ? (
          <p className="mb-3 text-[13px] leading-5 text-[#4b5563]">
            Open the public stock route at{" "}
            <Link href={route} {...getInternalLinkProps()} className="font-medium text-[#111827] underline">
              {route}
            </Link>{" "}
            to compare the rendered page with the provider payloads below.
          </p>
        ) : null}
        <AdminStockImportRawResponsePanel details={details} />
      </AdminSectionCard>
    </div>
  );
}
