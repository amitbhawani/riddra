import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/json-ld";
import { TestStockDetailPage } from "@/components/test-stock-detail-page";
import { formatBenchmarkLabel } from "@/lib/benchmark-labels";
import {
  getBenchmarkHistory,
  getFormattedBenchmarkReturns,
} from "@/lib/benchmark-history";
import {
  getStockChartSnapshot,
} from "@/lib/chart-content";
import { getPublicStockDiscoverySlugs, getStock, getStocks } from "@/lib/content";
import { getIndexSnapshot } from "@/lib/index-content";
import { getPublishedAdminManagedStockFallbackRecords } from "@/lib/ipo-lifecycle";
import type { StockSnapshot } from "@/lib/mock-data";
import {
  getNativeStockChartData,
} from "@/lib/native-stock-chart";
import {
  parseDesignNumericValue,
} from "@/lib/product-page-design";
import { buildManagedRouteMetadata } from "@/lib/public-route-seo";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";
import { getSharedSidebarRailData } from "@/lib/shared-sidebar-config";
import { getNormalizedStockDetailData } from "@/lib/stock-normalized-detail";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type MutualFundOwner = {
  fundSlug: string;
  fundName: string;
  weight: string;
  sourceDate: string;
};

type DemoShareholdingBucket = {
  label: string;
  shortLabel?: string;
  value: string;
  color: string;
};

const defaultMutualFundOwners: MutualFundOwner[] = [
  {
    fundSlug: "hdfc-mid-cap-opportunities",
    fundName: "HDFC Mid-Cap Opportunities Fund",
    weight: "2.31%",
    sourceDate: "Apr 2026",
  },
  {
    fundSlug: "sbi-bluechip-fund",
    fundName: "SBI Bluechip Fund",
    weight: "1.84%",
    sourceDate: "Apr 2026",
  },
  {
    fundSlug: "parag-parikh-flexi-cap-fund",
    fundName: "Parag Parikh Flexi Cap Fund",
    weight: "1.42%",
    sourceDate: "Apr 2026",
  },
  {
    fundSlug: "icici-prudential-value-discovery-fund",
    fundName: "ICICI Prudential Value Discovery Fund",
    weight: "1.19%",
    sourceDate: "Apr 2026",
  },
  {
    fundSlug: "nippon-india-growth-fund",
    fundName: "Nippon India Growth Fund",
    weight: "0.97%",
    sourceDate: "Apr 2026",
  },
];

const shareholdingPalette = [
  { label: "Promoters", shortLabel: "Promoters", color: "#E85D75", fallback: 46.36 },
  { label: "DIIs", shortLabel: "DIIs", color: "#0EA5E9", fallback: 16.42 },
  { label: "Mutual Funds", shortLabel: "MF", color: "#F59E0B", fallback: 11.08 },
  { label: "FIIs", shortLabel: "FIIs", color: "#7C3AED", fallback: 19.77 },
  { label: "Public", shortLabel: "Public", color: "#374151", fallback: 6.37 },
] as const;

const stockStaticParamOverrides = [
  "alankit-limited",
  "axita-cotton-limited",
  "capillary-techno-india-l",
  "dev-information-technology-limited",
  "force-motors-limited",
  "hardwyn-india-limited",
  "infosys",
] as const;

export async function generateStaticParams() {
  const [stockSlugs, stocks, fallbackRecords] = await Promise.all([
    getPublicStockDiscoverySlugs(),
    getStocks(),
    getPublishedAdminManagedStockFallbackRecords(),
  ]);
  const publishedSlugs = Array.from(
    new Set([
      ...stockSlugs,
      ...stocks.map((stock) => stock.slug),
      ...fallbackRecords.map((record) => record.slug),
      ...stockStaticParamOverrides,
    ]),
  ).sort();

  return publishedSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const stock = await getStock(slug);

  if (!stock) {
    return { title: "Stock not found" };
  }

  return buildManagedRouteMetadata({
    family: "stocks",
    slug: stock.slug,
    title: stock.name,
    summary: stock.summary,
    symbol: stock.symbol,
    publicHref: `/stocks/${stock.slug}`,
    benchmarkMapping: stock.sectorIndexSlug ?? null,
    seoContext: {
      price: stock.price,
      sector: stock.sector,
      benchmark: stock.sectorIndexSlug ?? null,
    },
  });
}

function readStockStat(stock: StockSnapshot, label: string) {
  return stock.stats.find((item) => item.label === label)?.value ?? "Unavailable";
}

function readShareholdingPercent(
  stock: StockSnapshot,
  labels: string[],
  fallback: number,
) {
  for (const label of labels) {
    const match = stock.shareholding.find((item) => item.label === label)?.value;
    const parsed = parseDesignNumericValue(match);

    if (parsed !== null) {
      return parsed;
    }
  }

  return fallback;
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function formatHoldingCell(value: number) {
  return value.toFixed(2);
}

function buildShareholdingBuckets(stock: StockSnapshot): DemoShareholdingBucket[] {
  return shareholdingPalette.map((bucket) => {
    const labels =
      bucket.label === "Public" ? ["Public", "Public / Others", "Others"] : [bucket.label];
    const value = readShareholdingPercent(stock, labels, bucket.fallback);

    return {
      label: bucket.label,
      shortLabel: bucket.shortLabel,
      value: formatPercent(value),
      color: bucket.color,
    };
  });
}

function buildInvestorTimelineRows(stock: StockSnapshot) {
  return shareholdingPalette.map((bucket) => {
    const labels =
      bucket.label === "Public" ? ["Public", "Public / Others", "Others"] : [bucket.label];
    const currentValue = readShareholdingPercent(stock, labels, bucket.fallback);

    return {
      label: bucket.label,
      dec2024: formatHoldingCell(Math.max(currentValue - 0.42, 0.1)),
      mar2025: formatHoldingCell(Math.max(currentValue - 0.28, 0.1)),
      jun2025: formatHoldingCell(Math.max(currentValue - 0.16, 0.1)),
      sep2025: formatHoldingCell(Math.max(currentValue - 0.08, 0.1)),
      dec2025: formatHoldingCell(currentValue),
    };
  });
}

function buildTopShareholders(stock: StockSnapshot, buckets: DemoShareholdingBucket[]) {
  const bucketMap = new Map(
    buckets.map((bucket) => [bucket.label, parseDesignNumericValue(bucket.value) ?? 0]),
  );
  const promoterHolding = bucketMap.get("Promoters") ?? 46.36;
  const fiiHolding = bucketMap.get("FIIs") ?? 19.77;
  const diiHolding = bucketMap.get("DIIs") ?? 16.42;
  const mutualFundHolding = bucketMap.get("Mutual Funds") ?? 11.08;
  const publicHolding = bucketMap.get("Public") ?? 6.37;

  const rows = [
    {
      name: `${stock.name} promoter group`,
      base: Math.max(Math.min(promoterHolding * 0.56, promoterHolding), 8.5),
    },
    {
      name: "Life Insurance Corporation of India",
      base: Math.max(diiHolding * 0.24, 1.2),
    },
    {
      name: "The Vanguard Group",
      base: Math.max(fiiHolding * 0.16, 1.05),
    },
    {
      name: "HDFC Mutual Fund",
      base: Math.max(mutualFundHolding * 0.2, 0.92),
    },
    {
      name: "Retail / other public holders",
      base: Math.max(publicHolding * 0.3, 0.76),
    },
  ];

  return rows.map((row, index) => ({
    name: row.name,
    currentHolding: formatHoldingCell(row.base),
    previousQuarter: formatHoldingCell(Math.max(row.base - 0.04 - index * 0.01, 0.1)),
    priorQuarter: formatHoldingCell(Math.max(row.base - 0.09 - index * 0.015, 0.1)),
    earlierQuarter: formatHoldingCell(Math.max(row.base - 0.15 - index * 0.02, 0.1)),
  }));
}

function buildInvestorDetails(stock: StockSnapshot) {
  return [
    { label: "Symbol", value: stock.symbol, helper: "" },
    { label: "Sector", value: stock.sector, helper: "" },
    { label: "Market cap", value: readStockStat(stock, "Market Cap"), helper: "" },
    { label: "P/E", value: readStockStat(stock, "P/E"), helper: "" },
    { label: "P/B", value: readStockStat(stock, "P/B"), helper: "" },
    { label: "ROE", value: readStockStat(stock, "ROE"), helper: "" },
    { label: "ROCE", value: readStockStat(stock, "ROCE"), helper: "" },
    { label: "Dividend yield", value: readStockStat(stock, "Dividend Yield"), helper: "" },
  ];
}

function buildStockIndustryLabel(stock: StockSnapshot) {
  const sector = stock.sector.trim();

  if (!sector || sector.toLowerCase() === "unclassified") {
    return null;
  }

  return `${sector} businesses and related listed operations`;
}

function toSectorSlug(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function StockDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const benchmarkHistoryPromise = getBenchmarkHistory("nifty50").catch(() => []);
  const [stock, benchmark, benchmarkReturns, sharedSidebarRailData, benchmarkHistory] = await Promise.all([
    getStock(slug),
    getIndexSnapshot("nifty50").catch(() => null),
    getFormattedBenchmarkReturns("nifty50").catch(() => null),
    getSharedSidebarRailData({ pageCategory: "stocks" }),
    benchmarkHistoryPromise,
  ]);

  if (!stock) {
    notFound();
  }

  const resolvedSlug = stock.slug;
  const [nativeChartInitialData, chartSnapshot, normalizedData] = await Promise.all([
    getNativeStockChartData({ slug: resolvedSlug, range: "1Y", interval: "1d" }),
    getStockChartSnapshot(resolvedSlug),
    getNormalizedStockDetailData(resolvedSlug),
  ]);

  const sectorBenchmarkSlug = stock.sectorIndexSlug?.trim() || null;
  const sectorBenchmarkHistory = sectorBenchmarkSlug
    ? await getBenchmarkHistory(sectorBenchmarkSlug).catch(() => [])
    : [];

  const similarAssets: Array<{
    name: string;
    price: string;
    change1Y: string;
    ratioLabel: string;
    ratioValue: string;
    marketCap?: string;
    href?: string;
    hrefLabel: string;
  }> = [];
  const mutualFundOwners: MutualFundOwner[] = [];

  const shareholdingBuckets = buildShareholdingBuckets(stock);
  const investorDetailRows = buildInvestorTimelineRows(stock);
  const demoMutualFundOwners = mutualFundOwners.length
    ? mutualFundOwners
    : defaultMutualFundOwners;
  const demoData = {
    heroBadgeLabel: stock.symbol,
    heroSectorLabel: stock.sector,
    industryLabel: buildStockIndustryLabel(stock),
    sectorLabel: sectorBenchmarkSlug ? formatBenchmarkLabel(sectorBenchmarkSlug) : undefined,
    investorDetails: buildInvestorDetails(stock),
    topShareholders: buildTopShareholders(stock, shareholdingBuckets),
    mutualFundOwners: demoMutualFundOwners,
    investorDetailRows,
    shareholdingBuckets,
  };

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Stocks", href: "/stocks" },
    { name: stock.name, href: `/stocks/${stock.slug}` },
  ];

  return (
    <>
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <JsonLd
        data={buildWebPageSchema({
          title: `${stock.name} Share Price`,
          description: stock.summary,
          path: `/stocks/${stock.slug}`,
        })}
      />
      <TestStockDetailPage
        stock={stock}
        chartSnapshot={chartSnapshot}
        benchmarkSlug={benchmark?.slug ?? "nifty50"}
        benchmarkReturns={benchmarkReturns}
        benchmarkHistory={benchmarkHistory}
        sectorBenchmarkSlug={sectorBenchmarkSlug}
        sectorBenchmarkHistory={sectorBenchmarkHistory}
        similarAssets={similarAssets}
        mutualFundOwners={mutualFundOwners}
        demoData={demoData}
        viewerSignedIn={false}
        sharedSidebarRailData={sharedSidebarRailData}
        nativeChartInitialData={nativeChartInitialData}
        normalizedData={normalizedData}
        pageContext={{
          label: stock.name,
          href: `/stocks/${stock.slug}`,
          routeSlug: stock.slug,
          title: `${stock.name} Share Price`,
          watchlistQuery: stock.slug,
        }}
      />
    </>
  );
}
