import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/json-ld";
import { StockDetailBriefPage } from "@/components/stock-detail-brief-page";
import { getCurrentUser } from "@/lib/auth";
import { getComparableStocks } from "@/lib/asset-insights";
import { getBenchmarkHistory, getFormattedBenchmarkReturns } from "@/lib/benchmark-history";
import { getStockChartSnapshot } from "@/lib/chart-content";
import { getStock } from "@/lib/content";
import { getIndexSnapshot } from "@/lib/index-content";
import { formatProductPercent, parseDesignNumericValue } from "@/lib/product-page-design";
import { buildManagedRouteMetadata } from "@/lib/public-route-seo";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";
import { getSharedSidebarRailData } from "@/lib/shared-sidebar-config";
import { getMembershipFeatureStatus, getUserProductProfile } from "@/lib/user-product-store";
import type { BenchmarkHistoryEntry } from "@/lib/benchmark-history-store";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
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

function computePeerOneYearReturn(
  peerChange: string,
  peerChartBars: Array<{ close: number }>,
) {
  if (peerChartBars.length > 252) {
    const latest = peerChartBars[peerChartBars.length - 1]?.close;
    const previous = peerChartBars[peerChartBars.length - 1 - 252]?.close;

    if (typeof latest === "number" && typeof previous === "number" && previous !== 0) {
      return formatProductPercent(((latest - previous) / previous) * 100);
    }
  }

  if (parseDesignNumericValue(peerChange) !== null) {
    return peerChange;
  }

  return "Awaiting extended dataset";
}

export default async function StockDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const currentUser = await getCurrentUser();
  const viewerProfile = currentUser ? await getUserProductProfile(currentUser) : null;
  const forecastUnlocked = viewerProfile
    ? await getMembershipFeatureStatus(viewerProfile, "stocks_forecasts")
    : false;
  const [stock, chartSnapshot, benchmark, benchmarkReturns, comparableStocks, sharedSidebarRailData] = await Promise.all([
    getStock(slug),
    getStockChartSnapshot(slug),
    getIndexSnapshot("nifty50"),
    getFormattedBenchmarkReturns("nifty50"),
    getComparableStocks(slug),
    getSharedSidebarRailData({ pageCategory: "stocks" }),
  ]);

  if (!stock) {
    notFound();
  }

  const sectorBenchmarkSlug = stock.sectorIndexSlug?.trim() || null;
  const [benchmarkHistory, sectorBenchmarkHistory] = await Promise.all([
    getBenchmarkHistory("nifty50"),
    sectorBenchmarkSlug ? getBenchmarkHistory(sectorBenchmarkSlug) : Promise.resolve<BenchmarkHistoryEntry[]>([]),
  ]);

  const similarAssets = (
    await Promise.all(
      comparableStocks.slice(0, 4).map(async (peer) => {
        const [peerStock, peerChart] = await Promise.all([
          getStock(peer.slug),
          getStockChartSnapshot(peer.slug),
        ]);

        if (!peerStock) {
          return null;
        }

        return {
          name: peerStock.name,
          price: peerStock.price,
          change1Y: computePeerOneYearReturn(peerStock.change, peerChart.bars),
          ratioLabel: "PE Ratio",
          ratioValue:
            peerStock.stats.find((item) =>
              ["P/E", "PE", "P/E Ratio", "PE Ratio"].includes(item.label),
            )?.value ?? "Awaiting extended dataset",
          marketCap:
            peerStock.stats.find((item) => item.label === "Market Cap")?.value ??
            "Awaiting extended dataset",
          sparklinePoints:
            peerChart.bars.length > 1
              ? peerChart.bars.slice(-12).map((bar) => bar.close)
              : undefined,
          href: `/stocks/${peerStock.slug}`,
          hrefLabel: peerStock.name,
        };
      }),
    )
  ).filter((item): item is NonNullable<typeof item> => Boolean(item));

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
      <StockDetailBriefPage
        stock={stock}
        chartSnapshot={chartSnapshot}
        benchmark={benchmark}
        benchmarkSlug={benchmark?.slug ?? "nifty50"}
        benchmarkReturns={benchmarkReturns}
        benchmarkHistory={benchmarkHistory}
        sectorBenchmarkSlug={sectorBenchmarkSlug}
        sectorBenchmarkHistory={sectorBenchmarkHistory}
        similarAssets={similarAssets}
        sharedSidebarRailData={sharedSidebarRailData}
        viewerSignedIn={Boolean(currentUser)}
        stockForecastsUnlocked={forecastUnlocked}
      />
    </>
  );
}
