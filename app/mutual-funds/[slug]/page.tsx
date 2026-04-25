import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  AWAITING_BENCHMARK_HISTORY,
  getBenchmarkLatestDate,
  getFormattedBenchmarkReturns,
} from "@/lib/benchmark-history";
import { EntityNewsSection } from "@/components/entity-news-section";
import { JsonLd } from "@/components/json-ld";
import { MutualFundDetailBriefPage } from "@/components/mutual-fund-detail-brief-page";
import { getCurrentUser } from "@/lib/auth";
import { getFund, getFunds } from "@/lib/content";
import { getFundReturnValue } from "@/lib/fund-research";
import { getLatestMarketNewsForEntity } from "@/lib/market-news/queries";
import {
  getFundHistoryTimeframes,
  getFundPerformanceContext,
  normalizeFundHistoryTimeframe,
  type FundHistoryReturnLabel,
} from "@/lib/mutual-fund-history";
import { formatProductDate } from "@/lib/product-page-design";
import { isStockFirstLaunchPlaceholderFamily } from "@/lib/public-launch-scope";
import { buildManagedRouteMetadata } from "@/lib/public-route-seo";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";
import { getSharedSidebarRailData } from "@/lib/shared-sidebar-config";
import { getMembershipFeatureStatus, getUserProductProfile } from "@/lib/user-product-store";
import { StockFirstLaunchPlaceholderPage } from "@/components/stock-first-launch-placeholder-page";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ range?: string | string[] }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const fund = await getFund(slug);

  if (!fund) {
    return { title: "Fund not found" };
  }

  return buildManagedRouteMetadata({
    family: "mutual-funds",
    slug: fund.slug,
    title: fund.name,
    summary: fund.summary,
    symbol: null,
    publicHref: `/mutual-funds/${fund.slug}`,
    benchmarkMapping: fund.benchmarkIndexSlug ?? null,
    seoContext: {
      price: fund.nav,
      category: fund.category,
      benchmark: fund.benchmark ?? fund.benchmarkIndexSlug ?? null,
    },
  });
}

export default async function MutualFundDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const currentUser = await getCurrentUser();
  const viewerProfile = currentUser ? await getUserProductProfile(currentUser) : null;
  const premiumAnalyticsUnlocked = viewerProfile
    ? await getMembershipFeatureStatus(viewerProfile, "premium_analytics")
    : false;
  const selectedRange = normalizeFundHistoryTimeframe(
    Array.isArray(resolvedSearchParams.range) ? resolvedSearchParams.range[0] : resolvedSearchParams.range,
  );
  const fund = await getFund(slug);

  if (!fund) {
    notFound();
  }

  if (isStockFirstLaunchPlaceholderFamily("mutual_funds")) {
    return (
      <StockFirstLaunchPlaceholderPage
        family="mutual_funds"
        variant="detail"
        pageCategory="mutual_funds"
        assetName={fund.name}
      />
    );
  }

  const [allFunds, sharedSidebarRailData] = await Promise.all([
    getFunds(),
    getSharedSidebarRailData({ pageCategory: "mutual_funds" }),
  ]);

  const peerFunds = allFunds
    .filter((item) => item.slug !== fund.slug && item.category === fund.category)
    .slice(0, 4);

  const benchmarkReturns = fund.benchmarkIndexSlug
    ? await getFormattedBenchmarkReturns(fund.benchmarkIndexSlug)
    : null;
  const benchmarkSourceDate = fund.benchmarkIndexSlug
    ? await getBenchmarkLatestDate(fund.benchmarkIndexSlug)
    : null;
  const performanceContext = await getFundPerformanceContext(fund.slug, selectedRange);
  const comparisonWindow: FundHistoryReturnLabel =
    selectedRange === "1M" || selectedRange === "3M" || selectedRange === "6M" || selectedRange === "1Y" || selectedRange === "3Y" || selectedRange === "5Y"
      ? selectedRange
      : "1Y";

  const similarAssets = peerFunds.map((peer) => ({
    name: peer.name,
    change1Y: getFundReturnValue(peer, "1Y"),
    ratioLabel: "Expense Ratio",
    ratioValue: peer.expenseRatio,
    href: `/mutual-funds/${peer.slug}`,
    hrefLabel: peer.name,
  }));

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Mutual Funds", href: "/mutual-funds" },
    { name: fund.name, href: `/mutual-funds/${fund.slug}` },
  ];
  const fundHouseName = fund.factsheetMeta?.amcName?.trim() ?? "";
  const usableFundHouseName =
    fundHouseName && !/(unavailable|pending)/i.test(fundHouseName) ? fundHouseName : null;
  const marketNews = await getLatestMarketNewsForEntity({
    entityType: "mutual_fund",
    entitySlug: fund.slug,
    fallbackKeywords: usableFundHouseName ? [usableFundHouseName] : [],
    allowLatestFallback: true,
    limit: 5,
  }).catch(() => ({
    articles: [],
    matchedEntityType: null,
    usedSectorFallback: false,
    usedEntityFallback: false,
    usedKeywordFallback: false,
    usedIpoFallback: false,
    usedLatestFallback: false,
  }));
  const marketNewsDescription = marketNews.usedKeywordFallback && usableFundHouseName
    ? `Direct fund-linked articles are not available yet, so this section is showing the latest market stories tied to ${usableFundHouseName}.`
    : marketNews.usedLatestFallback
      ? "Direct fund-linked articles are not available yet, so this section is showing the latest market stories from the broader Riddra news surface."
      : "Latest matched market news for this fund with direct links into the full Market News archive.";

  return (
    <>
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <JsonLd
        data={buildWebPageSchema({
          title: `${fund.name} NAV`,
          description: fund.summary,
          path: `/mutual-funds/${fund.slug}`,
        })}
      />
      <MutualFundDetailBriefPage
        fund={fund}
        peerFunds={peerFunds}
        similarAssets={similarAssets}
        benchmarkReturns={benchmarkReturns}
        benchmarkContext={{
          label: fund.benchmark,
          sourceLabel: fund.benchmarkIndexSlug ? "Retained benchmark history" : "Awaiting benchmark history",
          sourceDate:
            benchmarkSourceDate && benchmarkReturns?.["1Y"] !== AWAITING_BENCHMARK_HISTORY
              ? formatProductDate(benchmarkSourceDate, benchmarkSourceDate)
              : null,
          mappingSource: fund.benchmarkMappingMeta?.source ?? "Unmapped benchmark",
        }}
        sharedSidebarRailData={sharedSidebarRailData}
        viewerSignedIn={Boolean(currentUser)}
        premiumAnalyticsUnlocked={premiumAnalyticsUnlocked}
        performanceContext={{
          selectedRange,
          comparisonWindow,
          timeframes: getFundHistoryTimeframes().map((timeframe) => ({
            id: timeframe.id,
            label: timeframe.label,
            href: `/mutual-funds/${fund.slug}?range=${timeframe.id}#summary`,
            active: timeframe.id === selectedRange,
          })),
          chartPoints: performanceContext.chartPoints,
          chartState: performanceContext.chartState,
          availableReturns: performanceContext.availableReturns,
          annualReturns: performanceContext.annualReturns,
          sourceLabel: performanceContext.sourceLabel,
          sourceDate: performanceContext.sourceDate
            ? formatProductDate(performanceContext.sourceDate, performanceContext.sourceDate)
            : null,
          statusLabel: performanceContext.statusLabel,
          annualReturnsEmptyLabel: performanceContext.annualReturnsEmptyLabel,
        }}
        marketNewsSection={
          <EntityNewsSection
            entityType="mutual_fund"
            entitySlug={fund.slug}
            articles={marketNews.articles}
            usedLatestFallback={marketNews.usedLatestFallback}
            titleOverride="Latest mutual fund news"
            descriptionOverride={marketNewsDescription}
          />
        }
      />
    </>
  );
}
