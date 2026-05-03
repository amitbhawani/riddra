"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ProductCard, ProductSectionTitle } from "@/components/product-page-system";
import { getExternalLinkProps } from "@/lib/link-utils";
import type {
  NormalizedStatementRow,
  NormalizedStockDataStatus,
  NormalizedStockDetailData,
} from "@/lib/stock-normalized-detail";

type StockNormalizedDataSectionsProps = {
  stockName: string;
  stockSymbol: string;
  stockSlug: string;
  normalizedData: NormalizedStockDetailData | null;
};

type FinancialViewId = "annual" | "quarterly";

const statementLabels = {
  incomeStatement: {
    total_revenue: "Revenue",
    gross_profit: "Gross profit",
    operating_income: "Operating income",
    net_income: "Net income",
    basic_eps: "EPS",
  },
  balanceSheet: {
    total_assets: "Total assets",
    total_liabilities: "Total liabilities",
    stockholders_equity: "Equity",
    cash_and_equivalents: "Cash",
    long_term_debt: "Long-term debt",
  },
  cashFlow: {
    operating_cash_flow: "Operating cash flow",
    investing_cash_flow: "Investing cash flow",
    financing_cash_flow: "Financing cash flow",
    capital_expenditure: "Capex",
    free_cash_flow: "Free cash flow",
  },
} as const;

function formatCurrency(value: number | null | undefined, options?: Intl.NumberFormatOptions) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: value >= 100 ? 0 : 2,
    ...options,
  }).format(value);
}

function formatCompactCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCompactNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number | null | undefined, fractionDigits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Not available";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(fractionDigits)}%`;
}

function formatPlainNumber(value: number | null | undefined, fractionDigits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

function formatDate(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return "Not available";
  }

  const parsed = new Date(normalized.includes("T") ? normalized : `${normalized}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime())) {
    return normalized;
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDateTime(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return "Not available";
  }

  const parsed = new Date(normalized);
  if (!Number.isFinite(parsed.getTime())) {
    return normalized;
  }

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

function formatRatio(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Not available";
  }
  return value.toFixed(2);
}

function buildStatementTableRows(rows: NormalizedStatementRow[], labels: Record<string, string>) {
  const columns = rows.slice(0, 4);
  return Object.entries(labels).map(([fieldKey, label]) => ({
    label,
    values: columns.map((row) => row.fields[fieldKey] ?? null),
  }));
}

function formatFreshnessReason(status: NormalizedStockDataStatus | null | undefined) {
  if (!status) {
    return "Not available";
  }

  switch (status.reasonCategory) {
    case "fresh":
      return `Fresh for ${status.expectedTradingDate ?? "expected trading date"}`;
    case "holiday_or_weekend":
      return `Fresh for latest trading day (${status.expectedTradingDate ?? "not available"})`;
    case "market_not_closed":
      return `Waiting for market close (${status.expectedTradingDate ?? "not available"})`;
    case "provider_lag":
      return `Provider lag on ${status.expectedTradingDate ?? "expected trading date"}`;
    case "provider_no_data":
      return "Accepted provider exception";
    case "stale_missing_price":
      return "Missing latest stored price";
    case "stale_missing_snapshot":
      return "Missing latest stored snapshot";
    case "symbol_issue":
      return "Symbol needs review";
    default:
      return "Not available";
  }
}

function formatFreshnessTone(status: NormalizedStockDataStatus | null | undefined) {
  if (!status) {
    return {
      borderColor: "rgba(203,213,225,0.9)",
      backgroundColor: "rgba(248,250,252,0.9)",
      color: "#475569",
    };
  }

  if (status.reasonCategory === "provider_no_data") {
    return {
      borderColor: "rgba(245,158,11,0.18)",
      backgroundColor: "rgba(255,251,235,0.96)",
      color: "#B45309",
    };
  }

  if (status.isStale) {
    return {
      borderColor: "rgba(220,38,38,0.18)",
      backgroundColor: "rgba(254,242,242,0.96)",
      color: "#B91C1C",
    };
  }

  return {
    borderColor: "rgba(21,128,61,0.18)",
    backgroundColor: "rgba(240,253,244,0.96)",
    color: "#166534",
  };
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[13px] border border-[rgba(226,222,217,0.82)] bg-white px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[rgba(107,114,128,0.72)]">
        {label}
      </p>
      <p className="mt-1 text-[0.98rem] font-semibold text-[#1F2937]">{value}</p>
    </div>
  );
}

function hasFiniteMetric(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function HolderList({
  title,
  rows,
}: {
  title: string;
  rows: NormalizedStockDetailData["holders"]["major"];
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-[13px] font-semibold text-[#1F2937]">{title}</h4>
      {rows.length ? (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={`${title}-${row.name}`}
              className="rounded-[11px] border border-[rgba(226,222,217,0.82)] bg-white px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#1F2937]">{row.name}</p>
                  <p className="mt-0.5 text-[11px] text-[rgba(107,114,128,0.8)]">
                    As of {formatDate(row.asOfDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-semibold text-[#1B3A6B]">
                    {formatPercent(row.percentOut)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[rgba(107,114,128,0.78)]">
                    {formatCompactNumber(row.sharesHeld)} shares
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-[11px] border border-dashed border-[rgba(203,213,225,0.9)] bg-white px-3 py-3 text-[13px] text-[rgba(107,114,128,0.82)]">
          No holder rows are stored for this bucket yet.
        </p>
      )}
    </div>
  );
}

export function StockNormalizedDataSections({
  stockName,
  stockSymbol,
  stockSlug,
  normalizedData: initialNormalizedData,
}: StockNormalizedDataSectionsProps) {
  const [financialView, setFinancialView] = useState<FinancialViewId>("annual");
  const [remoteNormalizedData, setRemoteNormalizedData] =
    useState<NormalizedStockDetailData | null>(initialNormalizedData);
  const normalizedData = remoteNormalizedData ?? initialNormalizedData;

  useEffect(() => {
    if (initialNormalizedData || !stockSlug.trim()) {
      return;
    }

    const controller = new AbortController();

    const loadNormalizedData = async () => {
      try {
        const response = await fetch(`/api/stocks/${encodeURIComponent(stockSlug)}/normalized`, {
          method: "GET",
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          data?: NormalizedStockDetailData | null;
        };

        if (!controller.signal.aborted) {
          setRemoteNormalizedData(payload.data ?? null);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("[stock-normalized-data-sections] normalized data fetch failed", {
            stockSlug,
            error,
          });
        }
      }
    };

    void loadNormalizedData();

    return () => controller.abort();
  }, [initialNormalizedData, stockSlug]);

  const headerName = normalizedData?.companyName ?? stockName;
  const headerSymbol = normalizedData?.symbol ?? stockSymbol;
  const latestSnapshot = normalizedData?.latestSnapshot ?? null;
  const latestHistoryRow = normalizedData?.priceHistory.at(-1) ?? null;
  const previousHistoryRow =
    (normalizedData?.priceHistory?.length ?? 0) > 1
      ? normalizedData?.priceHistory[normalizedData.priceHistory.length - 2] ?? null
      : null;
  const keyStatistics = normalizedData?.keyStatistics ?? null;
  const performance = normalizedData?.performance ?? null;
  const scoreSummary = normalizedData?.riddraScores ?? null;
  const dataStatus = normalizedData?.dataStatus ?? null;
  const historicalPreviewRows = useMemo(
    () => (normalizedData?.priceHistory ?? []).slice(-10).reverse(),
    [normalizedData?.priceHistory],
  );
  const performanceMetricCards = useMemo(
    () =>
      [
        { label: "7D return", value: performance?.sevenDay },
        { label: "1M return", value: performance?.oneMonth },
        { label: "6M return", value: performance?.sixMonth },
        { label: "1Y return", value: performance?.oneYear },
        { label: "5Y return", value: performance?.fiveYear },
        { label: "From 52W high", value: performance?.fromWeek52High },
        { label: "From 52W low", value: performance?.fromWeek52Low },
      ].filter((item) => hasFiniteMetric(item.value)),
    [
      performance?.fiveYear,
      performance?.fromWeek52High,
      performance?.fromWeek52Low,
      performance?.oneMonth,
      performance?.oneYear,
      performance?.sevenDay,
      performance?.sixMonth,
    ],
  );

  const displayedFinancials =
    financialView === "annual"
      ? normalizedData?.financials.annual
      : normalizedData?.financials.quarterly;

  const hasAnyFinancialRows = useMemo(() => {
    const annual = normalizedData?.financials.annual;
    const quarterly = normalizedData?.financials.quarterly;
    return Boolean(
      annual?.incomeStatement.length ||
        annual?.balanceSheet.length ||
        annual?.cashFlow.length ||
        quarterly?.incomeStatement.length ||
        quarterly?.balanceSheet.length ||
        quarterly?.cashFlow.length,
    );
  }, [normalizedData?.financials]);

  const displayExchange = normalizedData?.exchange?.trim() || "Exchange not synced yet";
  const displayPrice = latestSnapshot?.price ?? latestHistoryRow?.close ?? null;
  const displayOpen = latestSnapshot?.open ?? latestHistoryRow?.open ?? null;
  const displayHigh = latestSnapshot?.dayHigh ?? latestHistoryRow?.high ?? null;
  const displayLow = latestSnapshot?.dayLow ?? latestHistoryRow?.low ?? null;
  const displayClose = latestSnapshot?.price ?? latestHistoryRow?.close ?? null;
  const displayPreviousClose =
    latestSnapshot?.previousClose ?? previousHistoryRow?.close ?? null;
  const displayVolume = latestSnapshot?.volume ?? latestHistoryRow?.volume ?? null;
  const displayTradeDate =
    latestSnapshot?.tradeDate ??
    latestHistoryRow?.tradeDate ??
    dataStatus?.expectedTradingDate ??
    null;
  const displaySource =
    latestSnapshot?.sourceName?.trim() ||
    (latestHistoryRow ? "Stored price history" : "Stored market snapshot");
  const displayChangeAbsolute =
    latestSnapshot?.changeAbsolute ??
    (hasFiniteMetric(displayPrice) && hasFiniteMetric(displayPreviousClose)
      ? displayPrice - displayPreviousClose
      : null);
  const displayChangePercent =
    latestSnapshot?.changePercent ??
    (hasFiniteMetric(displayPrice) &&
    hasFiniteMetric(displayPreviousClose) &&
    displayPreviousClose !== 0
      ? ((displayPrice - displayPreviousClose) / displayPreviousClose) * 100
      : null);

  const lastUpdatedLabel =
    formatDateTime(
      latestSnapshot?.importedAt ??
        latestSnapshot?.snapshotAt ??
        dataStatus?.lastSuccessfulImportAt ??
        latestSnapshot?.tradeDate ??
        latestHistoryRow?.tradeDate ??
        null,
    ) ?? "Not available";
  const freshnessTone = formatFreshnessTone(dataStatus);

  return (
    <>
      <section id="summary" className="space-y-3 scroll-mt-[104px] lg:scroll-mt-[148px]">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,1fr)] xl:items-start">
          <ProductCard tone="secondary" className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <ProductSectionTitle
                title="Stock header"
                description="Stored Riddra identity, quote, and timestamp data."
                eyebrow="Overview"
              />
              <div className="flex flex-wrap justify-end gap-1.5">
                <span className="rounded-full border border-[rgba(27,58,107,0.12)] bg-white px-3 py-1 text-[11px] font-semibold text-[#1B3A6B]">
                  {headerSymbol}
                </span>
                <span className="rounded-full border border-[rgba(27,58,107,0.12)] bg-white px-3 py-1 text-[11px] font-semibold text-[#1F2937]">
                  {displayExchange}
                </span>
              </div>
            </div>

            <div className="rounded-[13px] border border-[rgba(27,58,107,0.12)] bg-white px-3.5 py-3">
              <p className="text-[1.22rem] font-semibold text-[#1F2937]">{headerName}</p>
              <p className="mt-1 text-[13px] text-[rgba(107,114,128,0.82)]">
                {normalizedData?.exchange ? `Exchange: ${normalizedData.exchange}` : "Exchange not synced yet"}
                {normalizedData?.sector ? ` • Sector: ${normalizedData.sector}` : ""}
                {normalizedData?.industry ? ` • Industry: ${normalizedData.industry}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[rgba(107,114,128,0.72)]">
                    Latest price
                  </p>
                  <p className="mt-1 text-[1.6rem] font-semibold text-[#111827]">
                    {formatCurrency(displayPrice)}
                  </p>
                </div>
                <div>
                  <p
                    className="rounded-full border px-3 py-1 text-[12px] font-semibold"
                    style={{
                      color:
                        (displayChangeAbsolute ?? 0) < 0 ? "#DC2626" : "#15803D",
                      borderColor:
                        (displayChangeAbsolute ?? 0) < 0
                          ? "rgba(220,38,38,0.18)"
                          : "rgba(21,128,61,0.18)",
                      backgroundColor:
                        (displayChangeAbsolute ?? 0) < 0
                          ? "rgba(254,242,242,0.92)"
                          : "rgba(240,253,244,0.92)",
                    }}
                  >
                    {formatCurrency(displayChangeAbsolute, {
                      maximumFractionDigits: 2,
                    })}{" "}
                    ({formatPercent(displayChangePercent)})
                  </p>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <MetricCard label="Symbol" value={headerSymbol} />
                <MetricCard label="Exchange" value={displayExchange} />
                <MetricCard label="Last updated" value={lastUpdatedLabel} />
              </div>
              <p className="mt-3 text-[12px] text-[rgba(107,114,128,0.82)]">
                Last updated: {lastUpdatedLabel}
              </p>
            </div>
          </ProductCard>

          <ProductCard tone="secondary" className="space-y-3">
            <ProductSectionTitle
              title="Market snapshot"
              description="Latest stored same-day market snapshot row."
              eyebrow="Snapshot"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <MetricCard label="Open" value={formatCurrency(displayOpen)} />
              <MetricCard label="High" value={formatCurrency(displayHigh)} />
              <MetricCard label="Low" value={formatCurrency(displayLow)} />
              <MetricCard label="Close" value={formatCurrency(displayClose)} />
              <MetricCard label="Previous close" value={formatCurrency(displayPreviousClose)} />
              <MetricCard label="Volume" value={formatCompactNumber(displayVolume)} />
              <MetricCard
                label="Source"
                value={displaySource}
              />
              <MetricCard label="Trade date" value={formatDate(displayTradeDate)} />
            </div>
          </ProductCard>
        </div>

        <ProductCard tone="secondary" className="space-y-3">
          <ProductSectionTitle
            title="Historical data preview"
            description="Latest 10 stored `stock_price_history` daily rows."
            eyebrow="History"
          />
          {historicalPreviewRows.length ? (
            <div className="overflow-x-auto rounded-[13px] border border-[rgba(226,222,217,0.82)] bg-white">
              <table className="min-w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[rgba(226,222,217,0.82)] bg-[rgba(248,250,252,0.86)]">
                    {["Date", "Open", "High", "Low", "Close", "Volume"].map((heading) => (
                      <th
                        key={heading}
                        className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgba(107,114,128,0.72)]"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historicalPreviewRows.map((row) => (
                    <tr
                      key={`preview-${row.tradeDate}`}
                      className="border-b border-[rgba(238,238,238,0.9)] last:border-b-0"
                    >
                      <td className="px-3 py-2.5 text-[13px] font-semibold text-[#1F2937]">
                        {formatDate(row.tradeDate)}
                      </td>
                      <td className="px-3 py-2.5 text-[13px] text-[#374151]">{formatCurrency(row.open)}</td>
                      <td className="px-3 py-2.5 text-[13px] text-[#374151]">{formatCurrency(row.high)}</td>
                      <td className="px-3 py-2.5 text-[13px] text-[#374151]">{formatCurrency(row.low)}</td>
                      <td className="px-3 py-2.5 text-[13px] font-semibold text-[#1B3A6B]">
                        {formatCurrency(row.close)}
                      </td>
                      <td className="px-3 py-2.5 text-[13px] text-[#374151]">
                        {formatCompactNumber(row.volume)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-[12px] border border-dashed border-[rgba(203,213,225,0.9)] bg-white px-3 py-3 text-[13px] text-[rgba(107,114,128,0.82)]">
              Historical price rows have not been imported into `stock_price_history` for this stock yet.
            </p>
          )}
        </ProductCard>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
          <ProductCard tone="secondary" className="space-y-3">
            <ProductSectionTitle
              title="Key statistics"
              description="Stored market statistics derived from imported Yahoo/Riddra rows."
              eyebrow="Stats"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <MetricCard
                label="Market cap"
                value={formatCompactCurrency(keyStatistics?.marketCap ?? latestSnapshot?.marketCap)}
              />
              <MetricCard label="P/E" value={formatRatio(keyStatistics?.pe)} />
              <MetricCard label="EPS" value={formatRatio(keyStatistics?.eps)} />
              <MetricCard label="Book value" value={formatRatio(keyStatistics?.bookValue)} />
              <MetricCard label="Price to book" value={formatRatio(keyStatistics?.priceToBook)} />
              <MetricCard label="Dividend yield" value={formatPercent(keyStatistics?.dividendYield)} />
              <MetricCard label="52W high" value={formatCurrency(keyStatistics?.week52High)} />
              <MetricCard label="52W low" value={formatCurrency(keyStatistics?.week52Low)} />
            </div>
          </ProductCard>

          <ProductCard tone="secondary" className="space-y-3">
            <ProductSectionTitle
              title="Fundamentals"
              description="Protected Yahoo fundamentals stay disabled in this phase."
              eyebrow="Unavailable"
            />
            <div className="rounded-[13px] border border-dashed border-[rgba(203,213,225,0.9)] bg-white px-3.5 py-3.5">
              <p className="text-[14px] font-semibold text-[#1F2937]">
                Fundamentals are not available from the current data provider yet.
              </p>
            </div>
          </ProductCard>
        </div>

        <ProductCard tone="secondary" className="space-y-2">
          <ProductSectionTitle
            title="Data quality note"
            description="Stored-market-data disclosure"
            eyebrow="Note"
          />
          <p className="rounded-[13px] border border-[rgba(226,222,217,0.82)] bg-white px-3.5 py-3 text-[13px] leading-6 text-[rgba(55,65,81,0.9)]">
            Price data is powered by stored Riddra market history. Fundamentals will be added in a later phase.
          </p>
        </ProductCard>
      </section>

      <section id="financials" className="space-y-3 scroll-mt-[104px] lg:scroll-mt-[148px]">
        <ProductCard tone="secondary" className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <ProductSectionTitle
              title="Financial statements"
              description="Stored income statement, balance sheet, and cash flow rows."
              eyebrow="Statements"
            />
            {hasAnyFinancialRows ? (
              <div className="flex gap-1.5">
                {(["annual", "quarterly"] as FinancialViewId[]).map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setFinancialView(view)}
                    className={[
                      "inline-flex h-9 items-center justify-center rounded-[10px] border px-3 text-[12px] font-semibold capitalize transition",
                      financialView === view
                        ? "border-[rgba(27,58,107,0.16)] bg-[#1B3A6B] text-white"
                        : "border-[rgba(226,222,217,0.82)] bg-white text-[#1F2937]",
                    ].join(" ")}
                  >
                    {view}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {!hasAnyFinancialRows ? (
            <p className="rounded-[12px] border border-dashed border-[rgba(203,213,225,0.9)] bg-white px-3 py-3 text-[13px] text-[rgba(107,114,128,0.82)]">
              Financial statements are not available from the current data provider yet.
            </p>
          ) : (
            (["incomeStatement", "balanceSheet", "cashFlow"] as const).map((statementKey) => {
              const rows = displayedFinancials?.[statementKey] ?? [];
              const label =
                statementKey === "incomeStatement"
                  ? "Income statement"
                  : statementKey === "balanceSheet"
                    ? "Balance sheet"
                    : "Cash flow";
              const tableRows = buildStatementTableRows(rows, statementLabels[statementKey]);

              return (
                <div key={statementKey} className="space-y-2">
                  <h4 className="text-[14px] font-semibold text-[#1F2937]">{label}</h4>
                  {rows.length ? (
                    <div className="overflow-x-auto rounded-[13px] border border-[rgba(226,222,217,0.82)] bg-white">
                      <table className="min-w-full border-collapse text-left">
                        <thead>
                          <tr className="border-b border-[rgba(226,222,217,0.82)] bg-[rgba(248,250,252,0.86)]">
                            <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgba(107,114,128,0.72)]">
                              Metric
                            </th>
                            {rows.map((row) => (
                              <th
                                key={`${statementKey}-${row.fiscalDate}`}
                                className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgba(107,114,128,0.72)]"
                              >
                                {row.periodLabel}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableRows.map((tableRow) => (
                            <tr
                              key={`${statementKey}-${tableRow.label}`}
                              className="border-b border-[rgba(238,238,238,0.9)] last:border-b-0"
                            >
                              <td className="px-3 py-2.5 text-[13px] font-semibold text-[#1F2937]">
                                {tableRow.label}
                              </td>
                              {tableRow.values.map((value, index) => (
                                <td
                                  key={`${statementKey}-${tableRow.label}-${index}`}
                                  className="px-3 py-2.5 text-[13px] text-[#374151]"
                                >
                                  {statementKey === "incomeStatement" && tableRow.label === "EPS"
                                    ? formatRatio(value)
                                    : formatCompactCurrency(value)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="rounded-[12px] border border-dashed border-[rgba(203,213,225,0.9)] bg-white px-3 py-3 text-[13px] text-[rgba(107,114,128,0.82)]">
                      No {financialView} {label.toLowerCase()} rows are available yet.
                    </p>
                  )}
                </div>
              );
            })
          )}
        </ProductCard>
      </section>

      <section id="performance" className="space-y-3 scroll-mt-[104px] lg:scroll-mt-[148px]">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.08fr)_minmax(280px,0.92fr)]">
          <ProductCard tone="secondary" className="space-y-3">
            <ProductSectionTitle
              title="Price performance"
              description="Calculated from stored `stock_price_history` daily candles."
              eyebrow="Returns"
            />
            <p className="text-[13px] text-[rgba(107,114,128,0.82)]">
              The native chart above is powered by `/api/stocks/[slug]/chart` using stored Riddra price history only.
            </p>
            {performanceMetricCards.length ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {performanceMetricCards.map((item) => (
                  <MetricCard
                    key={item.label}
                    label={item.label}
                    value={formatPercent(item.value)}
                  />
                ))}
              </div>
            ) : null}
          </ProductCard>

          <ProductCard tone="secondary" className="space-y-3">
            <ProductSectionTitle
              title="Data status"
              description="Stored history, snapshot, freshness, and import-state summary."
              eyebrow="Status"
            />
            <div className="rounded-[13px] border bg-white px-3.5 py-3" style={freshnessTone}>
              <p className="text-[11px] font-medium uppercase tracking-[0.12em]">Freshness</p>
              <p className="mt-1 text-[0.98rem] font-semibold">{formatFreshnessReason(dataStatus)}</p>
              {dataStatus?.acceptedProviderException ? (
                <p className="mt-2 text-[12px]">
                  Some low-liquidity stocks may not have daily data from provider.
                </p>
              ) : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <MetricCard
                label="Historical coverage"
                value={
                  dataStatus
                    ? `${dataStatus.historicalRowCount.toLocaleString("en-IN")} rows`
                    : "Not available"
                }
              />
              <MetricCard
                label="Coverage range"
                value={
                  dataStatus?.historicalFirstDate && dataStatus?.historicalLastDate
                    ? `${formatDate(dataStatus.historicalFirstDate)} → ${formatDate(dataStatus.historicalLastDate)}`
                    : "Not available"
                }
              />
              <MetricCard
                label="Latest snapshot"
                value={
                  dataStatus?.latestSnapshotStatus === "available"
                    ? `Available (${formatDate(dataStatus.latestSnapshotTradeDate)})`
                    : "Missing"
                }
              />
              <MetricCard
                label="Expected trading date"
                value={formatDate(dataStatus?.expectedTradingDate)}
              />
              <MetricCard
                label="Last successful import"
                value={formatDateTime(dataStatus?.lastSuccessfulImportAt)}
              />
              <MetricCard
                label="Market session"
                value={dataStatus?.marketSessionState?.replaceAll("_", " ") ?? "Not available"}
              />
            </div>
          </ProductCard>
        </div>
      </section>

      <section id="corporate-actions" className="space-y-3 scroll-mt-[104px] lg:scroll-mt-[148px]">
        <ProductCard tone="secondary" className="space-y-3">
          <ProductSectionTitle
            title="Corporate actions"
            description="Latest normalized dividend and split rows."
            eyebrow="Actions"
          />
          <div className="grid gap-3 lg:grid-cols-2">
            {[
              {
                title: "Dividends",
                rows: normalizedData?.corporateActions.dividends ?? [],
              },
              {
                title: "Splits",
                rows: normalizedData?.corporateActions.splits ?? [],
              },
            ].map((group) => (
              <div key={group.title} className="space-y-2">
                <h4 className="text-[13px] font-semibold text-[#1F2937]">{group.title}</h4>
                {group.rows.length ? (
                  <div className="overflow-hidden rounded-[13px] border border-[rgba(226,222,217,0.82)] bg-white">
                    {group.rows.map((row) => (
                      <div
                        key={`${group.title}-${row.date}-${row.details ?? ""}`}
                        className="border-b border-[rgba(238,238,238,0.9)] px-3 py-2.5 last:border-b-0"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[13px] font-semibold text-[#1F2937]">{formatDate(row.date)}</p>
                            <p className="mt-0.5 text-[11px] text-[rgba(107,114,128,0.8)]">
                              {row.details ?? row.label}
                            </p>
                          </div>
                          <p className="text-[13px] font-semibold text-[#1B3A6B]">
                            {row.amount !== null ? formatCurrency(row.amount) : row.details ?? row.label}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-[12px] border border-dashed border-[rgba(203,213,225,0.9)] bg-white px-3 py-3 text-[13px] text-[rgba(107,114,128,0.82)]">
                    No {group.title.toLowerCase()} rows have been imported yet.
                  </p>
                )}
              </div>
            ))}
          </div>
        </ProductCard>
      </section>

      <section id="ownership" className="space-y-3 scroll-mt-[104px] lg:scroll-mt-[148px]">
        <ProductCard tone="secondary" className="space-y-3">
          <ProductSectionTitle
            title="Holders"
            description="Normalized holder summary and latest available holder-detail buckets."
            eyebrow="Ownership"
          />
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              {
                label: "Institutional held",
                value: formatPercent(normalizedData?.holders.summary?.institutionPercentHeld),
              },
              {
                label: "Mutual funds held",
                value: formatPercent(normalizedData?.holders.summary?.mutualFundPercentHeld),
              },
              {
                label: "Insider held",
                value: formatPercent(normalizedData?.holders.summary?.insiderPercentHeld),
              },
            ].map((item) => (
              <MetricCard key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <HolderList title="Major holders" rows={normalizedData?.holders.major ?? []} />
            <HolderList title="Institutional holders" rows={normalizedData?.holders.institutional ?? []} />
            <HolderList title="Mutual fund holders" rows={normalizedData?.holders.mutualFund ?? []} />
          </div>
        </ProductCard>
      </section>

      <section id="latest-news" className="space-y-3 scroll-mt-[104px] lg:scroll-mt-[148px]">
        <ProductCard tone="secondary" className="space-y-3">
          <ProductSectionTitle
            title="News"
            description="Latest normalized stock news rows already stored in Riddra."
            eyebrow="News"
          />
          {normalizedData?.news.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {normalizedData.news.map((article) => (
                <article
                  key={article.id}
                  className="rounded-[13px] border border-[rgba(226,222,217,0.82)] bg-white px-3.5 py-3"
                >
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[rgba(107,114,128,0.72)]">
                    {article.publisher ?? "Yahoo Finance"} • {formatDate(article.publishedAt)}
                  </p>
                  <h4 className="mt-2 text-[15px] font-semibold leading-6 text-[#1F2937]">
                    {article.title}
                  </h4>
                  <p className="mt-2 text-[13px] leading-6 text-[rgba(107,114,128,0.86)]">
                    {article.summary ?? "Summary not stored for this article yet."}
                  </p>
                  {article.linkUrl ? (
                    <a
                      href={article.linkUrl}
                      {...getExternalLinkProps()}
                      className="mt-3 inline-flex text-[12px] font-semibold text-[#1B3A6B]"
                    >
                      Open source
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-[12px] border border-dashed border-[rgba(203,213,225,0.9)] bg-white px-3 py-3 text-[13px] text-[rgba(107,114,128,0.82)]">
              No normalized stock news rows are stored for this stock yet.
            </p>
          )}
        </ProductCard>
      </section>

      <section id="riddra-score" className="space-y-3 scroll-mt-[104px] lg:scroll-mt-[148px]">
        <ProductCard tone="secondary" className="space-y-3">
          <ProductSectionTitle
            title="Riddra score"
            description={scoreSummary?.note ?? "Score buckets are empty for this stock right now."}
            eyebrow="Scores"
          />
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { label: "Overall", value: scoreSummary?.overall },
              { label: "Valuation", value: scoreSummary?.valuation },
              { label: "Growth", value: scoreSummary?.growth },
              { label: "Profitability", value: scoreSummary?.profitability },
              { label: "Risk", value: scoreSummary?.risk },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[13px] border border-[rgba(226,222,217,0.82)] bg-white px-3 py-3 text-center"
              >
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[rgba(107,114,128,0.72)]">
                  {item.label}
                </p>
                <p className="mt-2 text-[1.45rem] font-semibold text-[#1B3A6B]">
                  {item.value !== null && item.value !== undefined ? item.value.toFixed(1) : "—"}
                </p>
                <p className="mt-1 text-[11px] text-[rgba(107,114,128,0.78)]">out of 100</p>
              </div>
            ))}
          </div>
          {normalizedData?.slug ? (
            <div className="pt-1">
              <Link
                href={`/stocks/${normalizedData.slug}`}
                className="inline-flex text-[12px] font-semibold text-[#1B3A6B]"
              >
                Open the canonical stock route
              </Link>
            </div>
          ) : null}
        </ProductCard>
      </section>
    </>
  );
}
