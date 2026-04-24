import Link from "next/link";

import { SharedMarketSidebarRail } from "@/components/shared-market-sidebar-rail";
import { UserContentActionCard } from "@/components/user-content-action-card";
import {
  AnnualReturnsBlock,
  ProductBulletListCard,
  CtaBlock,
  ProductDataTableCard,
  ExposureStrip,
  HeroPriceBlock,
  ProductInsightGridCard,
  MainChartContainer,
  ProductCard,
  ProductRouteGrid,
  ProductRouteRailCard,
  ProductResearchStrip,
  ProductEditorialCluster,
  ProductPageShell,
  ProductPageTwoColumnLayout,
  ProductReadingStrip,
  ProductSectionTitle,
  QuickStatsCard,
  SimilarAssetsRow,
  StickyTabBar,
  TrailingReturnsTable,
} from "@/components/product-page-system";
import { getFundPortfolioLens, getFundReturnValue, getFundRollingReturnLens } from "@/lib/fund-research";
import {
  AWAITING_EXTENDED_HISTORY,
  AWAITING_ANNUAL_HISTORY,
  SCHEME_HISTORY_NOT_CONNECTED,
  SCHEME_HISTORY_READ_FAILED,
  type FundAnnualReturnRow,
  type FundHistoryReturnLabel,
  type FundHistoryState,
} from "@/lib/mutual-fund-history";
import type { FundSnapshot } from "@/lib/mock-data";
import { formatProductPercent, parseDesignNumericValue, type ProductTruthState } from "@/lib/product-page-design";
import type { SharedSidebarRailData } from "@/lib/shared-sidebar-config";

type SimilarFundCard = {
  name: string;
  change1Y: string;
  ratioLabel: string;
  ratioValue: string;
  sparklinePoints?: number[];
  href: string;
  hrefLabel: string;
};

type PerformanceContext = {
  selectedRange: string;
  comparisonWindow: FundHistoryReturnLabel;
  timeframes: Array<{
    id: string;
    label: string;
    href: string;
    active?: boolean;
  }>;
  chartPoints: Array<{
    label: string;
    value: number;
    changeFromStart: number;
  }>;
  chartState: FundHistoryState;
  availableReturns: Partial<Record<FundHistoryReturnLabel, number | null>>;
  annualReturns: FundAnnualReturnRow[];
  sourceLabel: string;
  sourceDate: string | null;
  statusLabel: string;
  annualReturnsEmptyLabel: string | null;
};

function getFundTruthState(fund: FundSnapshot): ProductTruthState {
  if (fund.snapshotMeta?.mode === "delayed_snapshot") {
    return "delayed_snapshot";
  }

  if (fund.snapshotMeta?.mode === "manual_nav") {
    return "delayed_snapshot";
  }

  if (fund.snapshotMeta?.marketDetail?.toLowerCase().includes("failed")) {
    return "read_failed";
  }

  return "unavailable";
}

function getFundChartTruthState(fund: FundSnapshot, chartState: FundHistoryState): ProductTruthState {
  if (chartState === "source_read_failed") {
    return "read_failed";
  }

  if (chartState === "not_connected") {
    return "unavailable";
  }

  if (chartState === "awaiting_extended_history") {
    return "delayed_snapshot";
  }

  if (fund.snapshotMeta?.mode === "delayed_snapshot" || fund.snapshotMeta?.mode === "manual_nav") {
    return "delayed_snapshot";
  }

  return "partial";
}

function averagePercent(values: string[]) {
  const parsed = values
    .map((value) => parseDesignNumericValue(value))
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (!parsed.length) {
    return "Unavailable";
  }

  const average = parsed.reduce((sum, value) => sum + value, 0) / parsed.length;
  return `${average >= 0 ? "+" : ""}${average.toFixed(2)}%`;
}

function normalizeFundValue(value: string) {
  const normalized = value.trim();

  if (!normalized || /^pending/i.test(normalized)) {
    return "Unavailable";
  }

  return normalized;
}

function formatHistoryReturnValue(value: number | null | undefined) {
  return formatProductPercent(value === null || value === undefined ? null : value * 100, 2, AWAITING_EXTENDED_HISTORY);
}

function applyHistoryReturnsToFund(
  fund: FundSnapshot,
  availableReturns: Partial<Record<FundHistoryReturnLabel, number | null>>,
  fallbackLabel: string,
) {
  const overrides = new Map<string, string>();
  const managedLabels = new Set<FundHistoryReturnLabel>(["1M", "3M", "6M", "1Y", "3Y", "5Y"]);

  for (const [label, value] of Object.entries(availableReturns) as Array<[FundHistoryReturnLabel, number | null | undefined]>) {
    overrides.set(label, formatHistoryReturnValue(value));
  }

  const existingRows = fund.returnsTable.map((row) => {
    if (row.label === "3Y CAGR") {
      return { label: "3Y", value: overrides.get("3Y") ?? fallbackLabel };
    }

    if (row.label === "5Y CAGR") {
      return { label: "5Y", value: overrides.get("5Y") ?? fallbackLabel };
    }

    if (managedLabels.has(row.label as FundHistoryReturnLabel)) {
      return {
        ...row,
        value: overrides.get(row.label as FundHistoryReturnLabel) ?? fallbackLabel,
      };
    }

    return row;
  });

  const rowMap = new Map(existingRows.map((row) => [row.label, row]));

  for (const label of ["1M", "3M", "6M", "1Y", "3Y", "5Y"] as FundHistoryReturnLabel[]) {
    if (!rowMap.has(label)) {
      rowMap.set(label, {
        label,
        value: overrides.get(label) ?? fallbackLabel,
      });
    }
  }

  const orderedRows = ["1M", "3M", "6M", "1Y", "3Y", "5Y", "Since Inception"]
    .map((label) => rowMap.get(label))
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  return {
    ...fund,
    returns1Y: overrides.get("1Y") ?? fund.returns1Y,
    returnsTable: orderedRows,
  };
}

function isPendingFundCompositionValue(value: string | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";

  return (
    !normalized ||
    normalized === "pending" ||
    normalized.startsWith("awaiting verified") ||
    normalized.startsWith("awaiting allocation") ||
    normalized.startsWith("awaiting holdings") ||
    normalized === "unavailable"
  );
}

function buildTrailingRows(
  fund: FundSnapshot,
  peers: FundSnapshot[],
  benchmarkReturns?: Partial<Record<"1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y", string>> | null,
) {
  const labels = [
    { period: "1 Month", fundLabel: "1M" },
    { period: "3 Month", fundLabel: "3M" },
    { period: "6 Month", fundLabel: "6M" },
    { period: "1 Year", fundLabel: "1Y" },
    { period: "3 Year", fundLabel: "3Y" },
    { period: "5 Year", fundLabel: "5Y" },
    { period: "Since Inception", fundLabel: "Since Inception" },
  ];

  return labels.map(({ period, fundLabel }) => {
    const fundValue = getFundReturnValue(fund, fundLabel);
    const categoryAverage = averagePercent(peers.map((peer) => getFundReturnValue(peer, fundLabel)));

    return {
      period,
      asset: fundValue,
      categoryAverage,
      benchmarkIndex:
        fundLabel === "1M"
          ? benchmarkReturns?.["1M"] ?? "Awaiting benchmark history"
          : fundLabel === "3M"
            ? benchmarkReturns?.["3M"] ?? "Awaiting benchmark history"
            : fundLabel === "6M"
              ? benchmarkReturns?.["6M"] ?? "Awaiting benchmark history"
              : fundLabel === "1Y"
                ? benchmarkReturns?.["1Y"] ?? "Awaiting benchmark history"
                : fundLabel === "3Y"
                  ? benchmarkReturns?.["3Y"] ?? "Awaiting benchmark history"
                  : fundLabel === "5Y"
                    ? benchmarkReturns?.["5Y"] ?? "Awaiting benchmark history"
                    : "Awaiting benchmark history",
      outperform:
        parseDesignNumericValue(fundValue) !== null &&
        parseDesignNumericValue(categoryAverage) !== null &&
        (parseDesignNumericValue(fundValue) ?? 0) > (parseDesignNumericValue(categoryAverage) ?? 0),
    };
  });
}

function buildFundChartEmptyState(chartState: FundHistoryState, selectedRange: string) {
  if (chartState === "awaiting_extended_history") {
    return {
      state: "delayed_snapshot" as const,
      title: "Awaiting extended history",
      description:
        `This route does not yet retain enough NAV history to fully support the ${selectedRange} window. The visible chart stays grounded in available scheme history only.`,
    };
  }

  if (chartState === "source_read_failed") {
    return {
      state: "read_failed" as const,
      title: "Scheme history read failed",
      description:
        "The fund route found the identity and support data, but the retained scheme-history read failed. The chart stays withheld until that history lane reads cleanly again.",
    };
  }

  if (chartState === "not_connected") {
    return {
      state: "unavailable" as const,
      title: "Scheme history not connected yet",
      description:
        "This fund route does not have a retained scheme-history source connected yet, so the chart stays withheld instead of inferring NAV history.",
    };
  }

  return {
    state: "unavailable" as const,
    title: "Fund chart unavailable",
    description:
      "This fund route does not have verified scheme-history chart data yet, so the page refuses to draw a chart from incomplete or summary-only values.",
  };
}

function slugifyRouteToken(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function MutualFundDetailBriefPage({
  fund,
  peerFunds,
  similarAssets,
  benchmarkReturns,
  benchmarkContext,
  sharedSidebarRailData,
  viewerSignedIn,
  premiumAnalyticsUnlocked,
  performanceContext,
}: {
  fund: FundSnapshot;
  peerFunds: FundSnapshot[];
  similarAssets: SimilarFundCard[];
  benchmarkReturns?: Partial<Record<"1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y", string>> | null;
  benchmarkContext: {
    label: string;
    sourceLabel: string;
    sourceDate: string | null;
    mappingSource: string;
  };
  sharedSidebarRailData: SharedSidebarRailData;
  viewerSignedIn: boolean;
  premiumAnalyticsUnlocked: boolean;
  performanceContext: PerformanceContext;
}) {
  const historyFallbackLabel =
    performanceContext.chartState === "source_read_failed"
      ? SCHEME_HISTORY_READ_FAILED
      : performanceContext.chartState === "not_connected"
        ? SCHEME_HISTORY_NOT_CONNECTED
        : AWAITING_EXTENDED_HISTORY;
  const displayFund = applyHistoryReturnsToFund(fund, performanceContext.availableReturns, historyFallbackLabel);
  const truthState = getFundTruthState(fund);
  const chartTruthState = getFundChartTruthState(fund, performanceContext.chartState);
  const portfolioLens = getFundPortfolioLens(displayFund);
  const rollingLens = getFundRollingReturnLens(displayFund);
  const trailingRows = buildTrailingRows(displayFund, peerFunds, benchmarkReturns);
  const annualRows =
    performanceContext.annualReturns.length > 0
      ? performanceContext.annualReturns.map((row) => ({
          year: row.year,
          value: `${row.value >= 0 ? "+" : ""}${row.value.toFixed(2)}%`,
        }))
      : [];
  const primaryPeer = similarAssets[0] ?? null;
  const displayHoldings = displayFund.holdings
    .filter((holding) => !isPendingFundCompositionValue(holding.name) && !isPendingFundCompositionValue(holding.weight))
    .slice(0, 5);
  const displayAllocation = displayFund.sectorAllocation
    .filter((item) => !isPendingFundCompositionValue(item.name) && !isPendingFundCompositionValue(item.weight))
    .slice(0, 5);
  const hasHoldingsData = displayHoldings.length >= 5;
  const hasAllocationData = displayAllocation.length >= 5;
  const hasCompositionCoverage = hasHoldingsData || hasAllocationData;
  const hasFullCompositionCoverage = hasHoldingsData && hasAllocationData;
  const holdingsSourceLine = fund.holdingsMeta
    ? `${fund.holdingsMeta.source} • ${fund.holdingsMeta.sourceDate}`
    : "Awaiting holdings data";
  const allocationSourceLine = fund.allocationMeta
    ? `${fund.allocationMeta.source} • ${fund.allocationMeta.sourceDate}`
    : "Awaiting allocation data";
  const fundReturnRows = ["1M", "3M", "6M", "1Y", "3Y", "5Y"].map((label) => ({
    label,
    value: normalizeFundValue(getFundReturnValue(displayFund, label)),
    helper: "Scheme-history-derived return where retained NAV history exists.",
  }));
  const defaultComparisonWindow = performanceContext.comparisonWindow;
  const fundSelectedReturn = performanceContext.availableReturns[defaultComparisonWindow] ?? null;
  const fundSelectedReturnPercent = fundSelectedReturn === null ? null : fundSelectedReturn * 100;
  const benchmarkSelectedReturn = parseDesignNumericValue(benchmarkReturns?.[defaultComparisonWindow]);
  const benchmarkOutperformance =
    fundSelectedReturnPercent !== null && benchmarkSelectedReturn !== null
      ? fundSelectedReturnPercent - benchmarkSelectedReturn
      : null;
  const benchmarkMetricsHelper =
    benchmarkContext.sourceDate
      ? `${benchmarkContext.sourceLabel} • ${benchmarkContext.sourceDate}`
      : benchmarkContext.sourceLabel;
  const fundAllocationRows = [
    {
      label: "Top holdings concentration",
      value: portfolioLens.topHoldingsConcentration,
      helper: portfolioLens.concentrationLabel,
    },
    {
      label: "Dominant sector",
      value: portfolioLens.dominantSector,
      helper: portfolioLens.dominantSectorWeight,
    },
    {
      label: "Sector breadth",
      value: portfolioLens.sectorBreadth,
      helper: "Spread visible across the top holdings currently disclosed on the route.",
    },
    {
      label: "Benchmark",
      value: displayFund.benchmark,
      helper: `${benchmarkContext.mappingSource}.`,
    },
  ];
  const fundManagerRows = [
    {
      label: "Fund manager",
      value: displayFund.fundManager.name,
      helper: `${displayFund.fundManager.experience} • since ${displayFund.fundManager.since}`,
    },
    {
      label: "Manager style",
      value: displayFund.fundManager.style,
      helper: "Visible manager posture carried into the route.",
    },
    {
      label: "Factsheet",
      value: displayFund.factsheetMeta?.documentLabel ?? "Unavailable",
      helper: displayFund.factsheetMeta?.sourceDate
        ? `Source date: ${displayFund.factsheetMeta.sourceDate}`
        : "Factsheet source date unavailable.",
    },
    {
      label: "AMC",
      value: displayFund.factsheetMeta?.amcName ?? "Unavailable",
      helper: displayFund.factsheetMeta?.source ?? "Fund house source label unavailable.",
    },
  ];
  const fundChecklistItems = [
    {
      title: "Return consistency",
      body: `${rollingLens.consistencyLabel}. Visible spread: ${rollingLens.consistencySpread}.`,
      meta: "Performance read",
    },
    {
      title: "Portfolio concentration",
      body: `Top disclosed holdings account for ${portfolioLens.topHoldingsConcentration}. ${portfolioLens.concentrationLabel}.`,
      meta: "Holdings",
    },
    {
      title: "Category context",
      body: primaryPeer
        ? `${primaryPeer.name} is the closest visible peer route for a same-category cross-check.`
        : "A direct peer route is not available yet for this fund.",
      meta: "Peer check",
      href: primaryPeer?.href ?? "/mutual-funds",
      hrefLabel: primaryPeer ? "Open peer fund" : "Open fund hub",
    },
    {
      title: "Document freshness",
      body: displayFund.factsheetMeta?.sourceDate
        ? `The route is anchored to the ${displayFund.factsheetMeta?.sourceDate} factsheet snapshot.`
        : "Factsheet freshness is not available on this route yet.",
      meta: "Document check",
      href: displayFund.factsheetMeta?.referenceUrl,
      hrefLabel: displayFund.factsheetMeta?.referenceUrl ? "Open factsheet" : undefined,
    },
  ];
  const fundRouteLinks = [
    {
      eyebrow: "Category",
      title: `${fund.category} hub`,
      description:
        "Step into the full category route when the fund needs shortlist context, adjacent options, and grouped discovery instead of a single-scheme read.",
      href: `/fund-categories/${slugifyRouteToken(fund.category)}`,
      hrefLabel: "Open category hub",
      meta: fund.category,
    },
    {
      eyebrow: "Peer route",
      title: primaryPeer?.name ?? "Peer funds",
      description: primaryPeer
        ? "Open the strongest adjacent peer when you want a quicker same-category handoff before deeper compare work."
        : "Peer routes will appear here once another live same-category fund route is available.",
      href: primaryPeer?.href ?? "/mutual-funds",
      hrefLabel: primaryPeer ? "Open peer fund" : "Open fund hub",
      meta: primaryPeer?.ratioLabel ?? "Peers",
    },
    {
      eyebrow: "Market board",
      title: "Market intelligence",
      description:
        "Move up to the market board when the fund read should be grounded in index, metals, currency, and broader market posture.",
      href: "/markets",
      hrefLabel: "Open markets",
      meta: "Context",
    },
    {
      eyebrow: "Learning",
      title: "Fund learning and clinics",
      description:
        "Use the education layer for framework-style context around fund selection, category fit, and shortlist discipline.",
      href: "/courses",
      hrefLabel: "Open courses",
      meta: "Education",
    },
    {
      eyebrow: "Live sessions",
      title: "Webinars and replays",
      description:
        "Open the approved webinar layer when the user needs creator-led walkthroughs and deeper context beyond the route itself.",
      href: "/webinars",
      hrefLabel: "Open webinars",
      meta: "Replay",
    },
  ];
  const fundRouteRailLinks = fundRouteLinks.slice(0, 3);
  const summaryResearchGroups = [
    {
      eyebrow: "Daily info",
      title: "NAV and freshness",
      note: "Keep the fund opening dense and allocator-readable.",
      items: [
        { label: "NAV", value: displayFund.nav },
        { label: "1Y return", value: displayFund.returns1Y },
        { label: "Updated", value: displayFund.snapshotMeta?.lastUpdated ?? "Unavailable" },
      ],
    },
    {
      eyebrow: "Risk",
      title: "Rolling-return view",
      note: "The first scan should already show quality and stability.",
      items: [
        { label: "Best", value: rollingLens.bestWindowValue },
        { label: "Weakest", value: rollingLens.weakestWindowValue },
        { label: "Consistency", value: rollingLens.consistencySpread },
      ],
    },
    {
      eyebrow: "Fees & size",
      title: "Allocator basics",
      note: "Core shortlist numbers stay visible above the fold.",
      items: [
        { label: "AUM", value: displayFund.aum },
        { label: "Expense", value: displayFund.expenseRatio },
        { label: "Benchmark", value: displayFund.benchmark },
      ],
    },
    {
      eyebrow: "Category",
      title: "Context",
      note: "Keep category fit and concentration visible.",
      items: [
        { label: "Category", value: fund.category },
        { label: "Dominant", value: portfolioLens.dominantSector },
        { label: "Top concentration", value: portfolioLens.topHoldingsConcentration },
      ],
    },
  ];
  const fundOpeningStripItems = [
    {
      label: "Data trust",
      value:
        truthState === "delayed_snapshot"
          ? "Delayed snapshot"
          : truthState === "partial"
            ? "Partial"
            : truthState === "read_failed"
              ? "Read failed"
              : "Unavailable",
      helper: `${fund.snapshotMeta?.source ?? "Source unavailable"} • ${fund.snapshotMeta?.lastUpdated ?? "Update unavailable"}`,
    },
    {
      label: "Chart focus",
      value: "NAV history",
      helper: "Read the scheme path first, then compare it with the visible return windows.",
    },
    {
      label: "Read next",
      value: "Performance & risk",
      helper: "Continue into the return ladder, annual texture, and rolling-return posture.",
    },
  ];
  const fundDetailRows = [
    { label: "AMC", value: displayFund.factsheetMeta?.amcName ?? "Unavailable" },
    { label: "Benchmark", value: displayFund.benchmark },
    { label: "AUM", value: displayFund.aum },
    { label: "Expense Ratio", value: displayFund.expenseRatio },
    { label: "Risk Level", value: displayFund.riskLabel },
    { label: "Best Window", value: `${rollingLens.bestWindowLabel} • ${rollingLens.bestWindowValue}` },
    { label: "Factsheet Date", value: displayFund.factsheetMeta?.sourceDate ?? "Unavailable" },
    { label: "Truth State", value: truthState === "delayed_snapshot" ? "Delayed Snapshot" : truthState === "partial" ? "Partial" : truthState === "read_failed" ? "Read Failed" : "Unavailable" },
  ];

  return (
    <ProductPageShell
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Mutual Funds", href: "/mutual-funds" },
        { label: fund.name, href: `/mutual-funds/${fund.slug}` },
      ]}
      hero={
        <HeroPriceBlock
          title={fund.name}
          categoryBadge={displayFund.category}
          subtitle={`${displayFund.benchmark} benchmark`}
          metaLine={displayFund.factsheetMeta?.amcName ?? displayFund.snapshotMeta?.source ?? "Verified source unavailable"}
          price={displayFund.nav}
          change={displayFund.returns1Y}
          asOf={displayFund.snapshotMeta?.lastUpdated ?? "Unavailable"}
          truthState={truthState}
          supportingNote={displayFund.snapshotMeta?.marketDetail ?? displayFund.summary}
          cta={
            <div className="space-y-3">
              <CtaBlock
                title="Actions"
                description="Keep the investor route practical and right-column driven."
                actions={[
                  { label: "Invest Now", href: "/signup", tone: "primary" },
                  { label: "Add to Watchlist", href: "/account/watchlists", tone: "secondary" },
                  { label: "Download Factsheet", href: displayFund.factsheetMeta?.referenceUrl ?? "#docs", tone: "ghost" },
                ]}
              />
              <UserContentActionCard
                pageType="mutual_fund"
                slug={fund.slug}
                title={fund.name}
                href={`/mutual-funds/${fund.slug}`}
                isSignedIn={viewerSignedIn}
                allowWatchlist
                watchlistPageType="mutual_fund"
                featureGate={{
                  label: "Premium analytics",
                  enabled: premiumAnalyticsUnlocked,
                  lockedReason:
                    "Advanced fund analytics stay on the higher tier while benchmark, NAV, and category basics remain visible here.",
                  ctaHref: "/pricing",
                  ctaLabel: "Upgrade for premium analytics",
                }}
              />
            </div>
          }
        />
      }
      stickyTabs={
        <StickyTabBar
          tabs={[
            { id: "summary", label: "Summary", href: "#summary", active: true },
            { id: "performance", label: "Performance & Risk", href: "#performance" },
            { id: "composition", label: "Composition", href: "#composition" },
            { id: "ratings", label: "Quality & Routes", href: "#ratings" },
            { id: "docs", label: "Actions", href: "#docs" },
          ]}
        />
      }
      summary={
        <ProductPageTwoColumnLayout
          left={
            <>
              <ProductEditorialCluster
                id="summary"
                title="Summary"
                description="The opening chapter should establish NAV, risk posture, fund context, and the scheme-history chart before the deeper read."
                summaryNote={
                  <p className="riddra-product-body text-sm leading-6 text-[rgba(107,114,128,0.86)]">
                    Start here for the shortlist brief: NAV truth, category context, and chart context before the allocator chapters.
                  </p>
                }
                variant="opening"
              >
                <ProductResearchStrip
                  title="Opening brief"
                  description="The fund page opens with NAV, risk posture, scale, and category context before the deeper sections."
                  groups={summaryResearchGroups}
                  signatureLabel="Fund opening brief"
                  signatureNote="The first scan brings NAV, category fit, size, and risk posture together before the allocation and shortlist chapters begin."
                />
                <ProductReadingStrip items={fundOpeningStripItems} />
                <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)] xl:items-start">
                  <ProductDataTableCard
                    title="Fund details"
                    description="Keep the core fund identifiers, freshness, and allocator details visible without inventing missing data."
                    rows={fundDetailRows}
                    variant="analysis"
                  />
                  <MainChartContainer
                    chartId={`fund-${fund.slug}`}
                    title={`${fund.name} NAV chart`}
                    description="Use the chart to anchor the scheme path before stepping into returns, rolling windows, and allocation."
                    attribution={{
                      label: "NAV source",
                      value: performanceContext.sourceDate
                        ? `${performanceContext.sourceLabel} • ${performanceContext.sourceDate}`
                        : performanceContext.sourceLabel,
                    }}
                    timeframes={performanceContext.timeframes}
                    points={performanceContext.chartPoints}
                    supportingStats={[
                      { label: "Latest NAV", value: displayFund.nav },
                      {
                        label: "Fund return",
                        value: formatProductPercent(
                          fundSelectedReturnPercent,
                          2,
                          AWAITING_EXTENDED_HISTORY,
                        ),
                        helper: `${performanceContext.statusLabel} • ${defaultComparisonWindow} comparison window.`,
                      },
                      {
                        label: "Benchmark return",
                        value: benchmarkReturns?.[defaultComparisonWindow] ?? "Awaiting benchmark history",
                        helper: `${displayFund.benchmark} • ${benchmarkMetricsHelper}`,
                      },
                      {
                        label: "Outperformance",
                        value: formatProductPercent(
                          benchmarkOutperformance,
                          2,
                          benchmarkReturns?.[defaultComparisonWindow] === undefined
                            ? "Awaiting benchmark history"
                            : AWAITING_EXTENDED_HISTORY,
                        ),
                        helper: `${defaultComparisonWindow} fund return minus benchmark return.`,
                      },
                    ]}
                    truthState={chartTruthState}
                    emptyState={buildFundChartEmptyState(performanceContext.chartState, performanceContext.selectedRange)}
                  />
                </div>
              </ProductEditorialCluster>

              <ProductEditorialCluster
                id="performance"
                title="Performance & Risk"
                description="Use this chapter to confirm returns, consistency, and whether the visible windows justify shortlist attention."
                summaryNote={
                  <p className="riddra-product-body text-sm leading-6 text-[rgba(107,114,128,0.86)]">
                    Read the trailing table first, then confirm the return ladder and rolling windows before moving into composition.
                  </p>
                }
                variant="performance"
              >
                <TrailingReturnsTable
                  title="Trailing returns"
                  description={`Fund returns are compared against same-category live routes where they exist, with ${displayFund.benchmark} benchmark history used wherever the mapped benchmark lane is available.`}
                  rows={trailingRows}
                  assetLabel="Fund Return"
                  categoryLabel="Category Average"
                  benchmarkLabel="Benchmark"
                />
                <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div className="space-y-4">
                    <ProductDataTableCard
                      title="Return ladder"
                      description="Use the visible return ladder to compare the route’s available windows quickly."
                      rows={fundReturnRows}
                      variant="analysis"
                    />
                    {annualRows.length > 0 ? (
                      <AnnualReturnsBlock
                        title="Annual returns"
                        description="Annual return rows appear only when verified year-wise scheme returns are attached."
                        rows={annualRows}
                      />
                    ) : (
                      <ProductCard tone="secondary" className="space-y-3">
                        <ProductSectionTitle
                          title="Annual returns"
                          description="Annual return rows appear only when verified year-wise scheme returns are attached."
                        />
                        <p className="riddra-product-body text-sm leading-7 text-[rgba(107,114,128,0.92)]">
                          {performanceContext.annualReturnsEmptyLabel ?? AWAITING_ANNUAL_HISTORY}
                        </p>
                      </ProductCard>
                    )}
                  </div>
                  <ProductInsightGridCard
                    title="Rolling-return lens"
                    description="Use the rolling-return lens to see how the visible windows line up without leaving the whole risk read in the sidebar."
                    items={rollingLens.windows.map((window) => ({
                      label: window.label,
                      value: window.value,
                      note: window.detail,
                    }))}
                    columns={3}
                    variant="analysis"
                  />
                </div>
                <ProductCard tone="compact" className="space-y-2">
                  <p className="riddra-product-body text-sm leading-7 text-[rgba(107,114,128,0.9)]">
                    {rollingLens.summary}
                  </p>
                </ProductCard>
              </ProductEditorialCluster>

              <ProductEditorialCluster
                id="composition"
                title="Composition / Holdings / Exposure"
                description="This chapter turns the fund from a return series into an allocation decision."
                summaryNote={
                  <p className="riddra-product-body text-sm leading-6 text-[rgba(107,114,128,0.86)]">
                    Use this chapter to judge where the weight sits, how concentrated it is, and what the top holdings imply.
                  </p>
                }
                variant="composition"
              >
                {!hasCompositionCoverage ? (
                  <ProductCard tone="secondary" className="space-y-4">
                    <ProductSectionTitle
                      title="Composition data is still hidden"
                      description="This chapter stays compact until actual holdings or sector-allocation snapshots are available on the public fund page."
                    />
                    <p className="riddra-product-body text-sm leading-7 text-[rgba(107,114,128,0.9)]">
                      This fund already has identity, returns, and risk context, but the composition chapter stays out of the way until there is enough real holdings or allocation data to make it useful.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[8px] border border-[#E2DED9] bg-white px-4 py-3">
                        <p className="riddra-product-body text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.76)]">
                          Allocation source
                        </p>
                        <p className="riddra-product-body mt-2 text-sm font-medium text-[#1B3A6B]">
                          {allocationSourceLine}
                        </p>
                      </div>
                      <div className="rounded-[8px] border border-[#E2DED9] bg-white px-4 py-3">
                        <p className="riddra-product-body text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.76)]">
                          Holdings source
                        </p>
                        <p className="riddra-product-body mt-2 text-sm font-medium text-[#1B3A6B]">
                          {holdingsSourceLine}
                        </p>
                      </div>
                    </div>
                  </ProductCard>
                ) : (
                  <>
                    {hasAllocationData ? (
                      <div className="space-y-2">
                        <ExposureStrip
                          title="Portfolio exposure strip"
                          description="This uses the latest sector allocation available on this route."
                          items={displayAllocation.map((item) => ({
                            label: item.name,
                            value: item.weight,
                          }))}
                        />
                        <p className="riddra-product-body px-1 text-[11px] text-[rgba(107,114,128,0.76)]">
                          Allocation source: {allocationSourceLine}
                        </p>
                        {displayFund.allocationMeta?.referenceUrl ? (
                          <Link
                            href={displayFund.allocationMeta.referenceUrl}
                            className="riddra-product-body px-1 text-[11px] font-medium text-[#1B3A6B] transition hover:text-[#D4853B]"
                          >
                            Open allocation reference
                          </Link>
                        ) : null}
                      </div>
                    ) : null}
                    {hasHoldingsData ? (
                      <ProductCard tone="secondary" className="space-y-4">
                        <ProductSectionTitle
                          title="Top holdings"
                          description="Keep the holdings block inline with the composition read so the page behaves like a real fund note."
                        />
                        <div className="space-y-3">
                          {displayHoldings.map((holding) => (
                            <div key={holding.name} className="rounded-[8px] border border-[#E2DED9] px-4 py-4">
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <p className="riddra-product-body text-base font-medium text-[#1B3A6B]">{holding.name}</p>
                                  <p className="riddra-product-body mt-1 text-sm text-[rgba(107,114,128,0.88)]">{holding.sector || "Sector unavailable"}</p>
                                </div>
                                <p className="riddra-product-number text-sm font-medium text-[#1B3A6B]">{holding.weight}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="riddra-product-body text-[11px] text-[rgba(107,114,128,0.76)]">
                          Holdings source: {holdingsSourceLine}
                        </p>
                        {displayFund.holdingsMeta?.referenceUrl ? (
                          <Link
                            href={displayFund.holdingsMeta.referenceUrl}
                            className="riddra-product-body text-[11px] font-medium text-[#1B3A6B] transition hover:text-[#D4853B]"
                          >
                            Open holdings reference
                          </Link>
                        ) : null}
                      </ProductCard>
                    ) : null}
                    {hasFullCompositionCoverage ? (
                      <>
                        <ProductInsightGridCard
                          title="Portfolio concentration lens"
                          description="This turns the visible allocation data into a decision-friendly read instead of leaving the section as a thin holdings list."
                          items={[
                            {
                              label: "Top holdings concentration",
                              value: portfolioLens.topHoldingsConcentration,
                              note: portfolioLens.concentrationLabel,
                            },
                            {
                              label: "Dominant sector",
                              value: portfolioLens.dominantSector,
                              note: portfolioLens.dominantSectorWeight,
                            },
                            {
                              label: "Sector breadth",
                              value: portfolioLens.sectorBreadth,
                              note: "Visible spread across the top disclosed holdings.",
                            },
                            {
                              label: "Benchmark posture",
                              value: displayFund.benchmark,
                              note: benchmarkMetricsHelper,
                            },
                          ]}
                          variant="composition"
                        />
                        <ProductDataTableCard
                          title="Allocation cues"
                          description="These are the allocation facts that matter most when deciding whether this fund fits an existing shortlist."
                          rows={fundAllocationRows}
                          variant="composition"
                        />
                      </>
                    ) : (
                      <ProductCard tone="compact" className="space-y-2">
                        <p className="riddra-product-body text-sm leading-7 text-[rgba(107,114,128,0.9)]">
                          Composition coverage is only partial right now, so the page sticks to the connected data instead of stretching a half-filled concentration view across the whole section.
                        </p>
                      </ProductCard>
                    )}
                  </>
                )}
              </ProductEditorialCluster>

              <ProductEditorialCluster
                id="ratings"
                title="Ratings / Quality / Related routes"
                description="Close with the fund angle, manager context, and the most useful next routes."
                summaryNote={
                  <p className="riddra-product-body text-sm leading-6 text-[rgba(107,114,128,0.86)]">
                    Close with what the fund is trying to do, who is running it, what to validate next, and where to go next.
                  </p>
                }
                variant="routes"
              >
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
                  <ProductCard tone="secondary" className="space-y-4">
                    <ProductSectionTitle
                      title="Fund objective / strategy"
                      description="Plain-language, slightly indented, and kept inline."
                    />
                    <blockquote className="border-l-2 border-[#E2DED9] pl-5">
                      <p className="riddra-product-body italic text-base leading-8 text-[rgba(107,114,128,0.95)]">
                        {displayFund.angle}
                      </p>
                      <p className="riddra-product-body mt-4 italic text-base leading-8 text-[rgba(107,114,128,0.95)]">
                        {displayFund.summary}
                      </p>
                    </blockquote>
                  </ProductCard>
                  <ProductBulletListCard
                    title="Selection watchpoints"
                    description="Use these checks to decide what still needs validation before leaving the page."
                    items={fundChecklistItems}
                    variant="watchpoints"
                  />
                </div>
                <ProductDataTableCard
                  title="Manager and document context"
                  description="Keep the closing chapter grounded in who runs the fund, what document anchors the route, and how fresh it is."
                  rows={fundManagerRows}
                  tone="secondary"
                  variant="context"
                />
                <ProductRouteGrid
                  title="Related routes and context"
                  description="Use these handoffs to stay inside one connected research flow."
                  items={fundRouteLinks}
                />
              </ProductEditorialCluster>
            </>
          }
          right={
            <>
              <QuickStatsCard
                title="Quick stats"
                description="Keep this rail open while reading the opening brief and the performance chapter."
                attribution={{
                  label: "NAV source",
                  value: performanceContext.sourceDate
                    ? `${performanceContext.sourceLabel} • ${performanceContext.sourceDate}`
                    : performanceContext.sourceLabel,
                }}
                items={[
                  { label: "AUM", value: displayFund.aum },
                  { label: "Expense Ratio", value: displayFund.expenseRatio },
                  { label: "Category", value: displayFund.category },
                  { label: "Risk Level", value: displayFund.riskLabel, withDot: true, dotTone: "accent" },
                  { label: "Benchmark", value: displayFund.benchmark },
                  { label: "Best Window", value: `${rollingLens.bestWindowLabel} • ${rollingLens.bestWindowValue}` },
                  { label: "Consistency", value: rollingLens.consistencySpread },
                  { label: "Factsheet Date", value: displayFund.factsheetMeta?.sourceDate ?? "Unavailable" },
                ]}
                brand={{
                  name: displayFund.factsheetMeta?.amcName ?? "Fund house unavailable",
                }}
              />
              {sharedSidebarRailData.enabledOnPageType ? (
                <SharedMarketSidebarRail
                  visibleBlocks={sharedSidebarRailData.visibleBlocks}
                  marketSnapshotItems={sharedSidebarRailData.marketSnapshotItems}
                  topGainers={sharedSidebarRailData.topGainers}
                  topLosers={sharedSidebarRailData.topLosers}
                  popularStocks={sharedSidebarRailData.popularStocks}
                />
              ) : null}
              <ProductRouteRailCard
                title="Research handoffs"
                description="These are the most useful next routes after the core fund read."
                items={fundRouteRailLinks}
                variant="routes"
              />
              <ProductCard tone="compact" className="space-y-2" id="docs">
                <p className="riddra-product-body text-[11px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.84)]">
                  Fees & docs
                </p>
                <p className="riddra-product-body text-sm leading-7 text-[rgba(107,114,128,0.9)]">
                  Factsheet: {displayFund.factsheetMeta?.documentLabel ?? "Unavailable"}
                </p>
                <p className="riddra-product-body text-sm leading-7 text-[rgba(107,114,128,0.9)]">
                  Source date: {displayFund.factsheetMeta?.sourceDate ?? "Unavailable"}
                </p>
                {displayFund.factsheetMeta?.referenceUrl ? (
                  <Link href={displayFund.factsheetMeta.referenceUrl} className="riddra-product-body inline-flex text-sm font-medium text-[#1B3A6B] transition hover:text-[#D4853B]">
                    Open factsheet reference
                  </Link>
                ) : null}
              </ProductCard>
              <ProductCard tone="compact" className="space-y-2">
                <p className="riddra-product-body text-[11px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.84)]">
                  Fund manager
                </p>
                <p className="riddra-product-body text-base font-medium text-[#1B3A6B]">{displayFund.fundManager.name}</p>
                <p className="riddra-product-body text-sm leading-7 text-[rgba(107,114,128,0.9)]">
                  Since {displayFund.fundManager.since} • {displayFund.fundManager.experience}
                </p>
                <p className="riddra-product-body text-sm leading-7 text-[rgba(107,114,128,0.9)]">
                  {displayFund.fundManager.style}
                </p>
              </ProductCard>
            </>
          }
        />
      }
      similarAssets={
        <SimilarAssetsRow
          title="Similar funds you may consider"
          description="The peer row uses real approved fund routes only. Sparkline slots stay empty until verified scheme-history lines exist."
          items={similarAssets}
        />
      }
    />
  );
}
