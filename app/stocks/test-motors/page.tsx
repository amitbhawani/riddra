import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TestStockDetailPage } from "@/components/test-stock-detail-page";
import { getComparableStocks } from "@/lib/asset-insights";
import { getBenchmarkHistory, getFormattedBenchmarkReturns } from "@/lib/benchmark-history";
import { getStockChartSnapshot } from "@/lib/chart-content";
import { getStock, getFund } from "@/lib/content";
import { getDurableFundHoldingSnapshots } from "@/lib/fund-holding-store";
import { getIndexSnapshot } from "@/lib/index-content";
import { parseDesignNumericValue, formatProductPercent } from "@/lib/product-page-design";
import type { BenchmarkHistoryEntry } from "@/lib/benchmark-history-store";
import { getSharedSidebarRailData } from "@/lib/shared-sidebar-config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Test Motors Page",
  description: "Temporary Tata Motors prototype route for finalizing the next stock-detail layout.",
  robots: {
    index: false,
    follow: false,
  },
};

const demoPopularStocks = [
  { name: "Maruti Suzuki India", price: "₹12,487.30", change1Y: "+21.80%", ratioLabel: "P/E", ratioValue: "28.40", marketCap: "₹3,92,140 Cr", href: "/stocks/maruti-suzuki-india", hrefLabel: "Maruti Suzuki India" },
  { name: "Mahindra & Mahindra", price: "₹2,418.20", change1Y: "+46.15%", ratioLabel: "P/E", ratioValue: "25.70", marketCap: "₹3,01,540 Cr", href: "/stocks/mahindra-and-mahindra", hrefLabel: "Mahindra & Mahindra" },
  { name: "Ashok Leyland", price: "₹228.60", change1Y: "+33.20%", ratioLabel: "P/E", ratioValue: "24.80", marketCap: "₹67,320 Cr", href: "/stocks/ashok-leyland", hrefLabel: "Ashok Leyland" },
  { name: "Bajaj Auto", price: "₹8,944.10", change1Y: "+29.40%", ratioLabel: "P/E", ratioValue: "31.20", marketCap: "₹2,49,780 Cr", href: "/stocks/bajaj-auto", hrefLabel: "Bajaj Auto" },
  { name: "Hero MotoCorp", price: "₹4,672.45", change1Y: "+18.70%", ratioLabel: "P/E", ratioValue: "23.90", marketCap: "₹93,510 Cr", href: "/stocks/hero-motocorp", hrefLabel: "Hero MotoCorp" },
  { name: "Eicher Motors", price: "₹4,981.35", change1Y: "+36.55%", ratioLabel: "P/E", ratioValue: "34.60", marketCap: "₹1,36,420 Cr", href: "/stocks/eicher-motors", hrefLabel: "Eicher Motors" },
  { name: "TVS Motor Company", price: "₹2,146.20", change1Y: "+41.20%", ratioLabel: "P/E", ratioValue: "39.80", marketCap: "₹1,02,880 Cr", href: "/stocks/tvs-motor-company", hrefLabel: "TVS Motor Company" },
  { name: "Samvardhana Motherson", price: "₹184.55", change1Y: "+24.90%", ratioLabel: "P/E", ratioValue: "27.40", marketCap: "₹1,29,640 Cr", href: "/stocks/samvardhana-motherson", hrefLabel: "Samvardhana Motherson" },
  { name: "Bharat Forge", price: "₹1,648.90", change1Y: "+15.10%", ratioLabel: "P/E", ratioValue: "52.10", marketCap: "₹78,960 Cr", href: "/stocks/bharat-forge", hrefLabel: "Bharat Forge" },
  { name: "Sona BLW Precision Forgings", price: "₹681.40", change1Y: "+12.65%", ratioLabel: "P/E", ratioValue: "61.30", marketCap: "₹42,150 Cr", href: "/stocks/sona-blw-precision-forgings", hrefLabel: "Sona BLW Precision Forgings" },
  { name: "UNO Minda", price: "₹1,058.35", change1Y: "+38.90%", ratioLabel: "P/E", ratioValue: "58.20", marketCap: "₹60,710 Cr", href: "/stocks/uno-minda", hrefLabel: "UNO Minda" },
  { name: "Bosch", price: "₹31,442.00", change1Y: "+9.80%", ratioLabel: "P/E", ratioValue: "41.70", marketCap: "₹92,770 Cr", href: "/stocks/bosch", hrefLabel: "Bosch" },
];

const peerFallbackMetrics: Record<string, { change1Y: string; ratioValue: string; marketCap: string }> = {
  infosys: { change1Y: "+18.40%", ratioValue: "24.80", marketCap: "₹5,48,200 Cr" },
  "bajaj-auto": { change1Y: "+29.40%", ratioValue: "31.20", marketCap: "₹2,49,780 Cr" },
  hcltech: { change1Y: "+14.70%", ratioValue: "21.60", marketCap: "₹3,92,880 Cr" },
  "maruti-suzuki-india": { change1Y: "+21.80%", ratioValue: "28.40", marketCap: "₹3,92,140 Cr" },
  "mahindra-and-mahindra": { change1Y: "+46.15%", ratioValue: "25.70", marketCap: "₹3,01,540 Cr" },
  "ashok-leyland": { change1Y: "+33.20%", ratioValue: "24.80", marketCap: "₹67,320 Cr" },
};

function computePeerOneYearReturn(
  peerSlug: string,
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
    return peerFallbackMetrics[peerSlug]?.change1Y ?? peerChange;
  }

  return peerFallbackMetrics[peerSlug]?.change1Y ?? "+18.40%";
}

export default async function TestMotorsPage() {
  const slug = "tata-motors";
  const [stock, chartSnapshot, benchmark, benchmarkReturns, comparableStocks, sharedSidebarRailData, fundHoldingSnapshots] =
    await Promise.all([
      getStock(slug),
      getStockChartSnapshot(slug),
      getIndexSnapshot("nifty50"),
      getFormattedBenchmarkReturns("nifty50"),
      getComparableStocks(slug),
      getSharedSidebarRailData({ pageCategory: "stocks" }),
      getDurableFundHoldingSnapshots(),
    ]);

  if (!stock) {
    notFound();
  }

  const sectorBenchmarkSlug = stock.sectorIndexSlug?.trim() || null;
  const [benchmarkHistory, sectorBenchmarkHistory] = await Promise.all([
    getBenchmarkHistory("nifty50"),
    sectorBenchmarkSlug ? getBenchmarkHistory(sectorBenchmarkSlug) : Promise.resolve<BenchmarkHistoryEntry[]>([]),
  ]);

  const comparableSimilarAssets = (
    await Promise.all(
      comparableStocks.slice(0, 6).map(async (peer) => {
        const [peerStock, peerChart] = await Promise.all([getStock(peer.slug), getStockChartSnapshot(peer.slug)]);

        if (!peerStock) {
          return null;
        }

        return {
          name: peerStock.name,
          price: peerStock.price,
          change1Y: computePeerOneYearReturn(peer.slug, peerStock.change, peerChart.bars),
          ratioLabel: "P/E",
          ratioValue:
            peerStock.stats.find((item) => ["P/E", "PE", "P/E Ratio", "PE Ratio"].includes(item.label))?.value ??
            peerFallbackMetrics[peer.slug]?.ratioValue ??
            "24.80",
          marketCap:
            peerStock.stats.find((item) => item.label === "Market Cap")?.value ??
            peerFallbackMetrics[peer.slug]?.marketCap ??
            "₹2,10,000 Cr",
          href: `/stocks/${peerStock.slug}`,
          hrefLabel: peerStock.name,
        };
      }),
    )
  ).filter((item): item is NonNullable<typeof item> => Boolean(item));

  const seenPopularStocks = new Set(comparableSimilarAssets.map((item) => item.name.trim().toLowerCase()));
  const similarAssets = [
    ...comparableSimilarAssets,
    ...demoPopularStocks.filter((item) => !seenPopularStocks.has(item.name.trim().toLowerCase())),
  ];

  const mutualFundOwners = (
    await Promise.all(
      fundHoldingSnapshots
        .filter((snapshot) =>
          snapshot.rows.some((row) => row.name.trim().toLowerCase() === stock.name.trim().toLowerCase()),
        )
        .slice(0, 5)
        .map(async (snapshot) => {
          const matchingRow = snapshot.rows.find(
            (row) => row.name.trim().toLowerCase() === stock.name.trim().toLowerCase(),
          );

          if (!matchingRow) {
            return null;
          }

          const fund = await getFund(snapshot.fundSlug);

          return {
            fundSlug: snapshot.fundSlug,
            fundName: fund?.name ?? snapshot.fundSlug,
            weight: matchingRow.weight,
            sourceDate: snapshot.sourceDate,
          };
        }),
    )
  ).filter((item): item is NonNullable<typeof item> => Boolean(item));

  const demoData = {
    heroBadgeLabel: "TEST MOTORS",
    heroSectorLabel: "Automobiles",
    industryLabel: "Passenger Vehicles and Commercial Vehicles",
    sectorLabel: "Nifty Auto",
    investorDetails: [
      { label: "Symbol", value: stock.symbol, helper: "" },
      { label: "Sector", value: "Passenger vehicles, CVs, EVs", helper: "" },
      { label: "Market cap", value: "₹3,39,480 Cr", helper: "" },
      { label: "P/E", value: "13.80", helper: "" },
      { label: "P/B", value: "3.62", helper: "" },
      { label: "ROE", value: "22.40%", helper: "" },
      { label: "ROCE", value: "18.90%", helper: "" },
      { label: "Dividend yield", value: "0.62%", helper: "" },
    ],
    performanceRows: [
      { period: "1D", stock: "+1.86%", benchmark: "+0.74%" },
      { period: "1M", stock: "+8.42%", benchmark: "+3.11%" },
      { period: "3M", stock: "+17.95%", benchmark: "+8.66%" },
      { period: "6M", stock: "+26.40%", benchmark: "+12.84%" },
      { period: "1Y", stock: "+38.75%", benchmark: "+16.20%" },
      { period: "3Y", stock: "+164.30%", benchmark: "+58.40%" },
    ],
    chartSummary: {
      stockReturn: "+38.75%",
      benchmarkReturn: "+16.20%",
      outperformance: "+22.55%",
    },
    topShareholders: [
      {
        name: "Tata Sons",
        currentHolding: "26.14",
        previousQuarter: "26.13",
        priorQuarter: "26.13",
        earlierQuarter: "26.12",
      },
      {
        name: "Life Insurance Corporation of India",
        currentHolding: "3.91",
        previousQuarter: "3.88",
        priorQuarter: "3.86",
        earlierQuarter: "3.79",
      },
      {
        name: "Dodge & Cox International Stock Fund",
        currentHolding: "2.48",
        previousQuarter: "2.44",
        priorQuarter: "2.39",
        earlierQuarter: "2.31",
      },
      {
        name: "SBI Equity Hybrid Fund",
        currentHolding: "1.72",
        previousQuarter: "1.69",
        priorQuarter: "1.65",
        earlierQuarter: "1.60",
      },
      {
        name: "The Vanguard Group",
        currentHolding: "1.36",
        previousQuarter: "1.34",
        priorQuarter: "1.31",
        earlierQuarter: "1.28",
      },
    ],
    mutualFundOwners: [
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
        fundSlug: "hdfc-mid-cap-opportunities",
        fundName: "Parag Parikh Flexi Cap Fund",
        weight: "1.42%",
        sourceDate: "Apr 2026",
      },
      {
        fundSlug: "sbi-bluechip-fund",
        fundName: "ICICI Prudential Value Discovery Fund",
        weight: "1.19%",
        sourceDate: "Apr 2026",
      },
      {
        fundSlug: "hdfc-mid-cap-opportunities",
        fundName: "Nippon India Growth Fund",
        weight: "0.97%",
        sourceDate: "Apr 2026",
      },
    ],
    investorDetailRows: [
      { label: "Promoters", dec2024: "46.36", mar2025: "46.37", jun2025: "46.37", sep2025: "46.36", dec2025: "46.36" },
      { label: "FIIs", dec2024: "18.94", mar2025: "19.11", jun2025: "19.32", sep2025: "19.54", dec2025: "19.77" },
      { label: "DIIs", dec2024: "14.88", mar2025: "15.14", jun2025: "15.68", sep2025: "16.01", dec2025: "16.42" },
      { label: "Mutual Funds", dec2024: "9.44", mar2025: "9.67", jun2025: "10.21", sep2025: "10.66", dec2025: "11.08" },
      { label: "Public / Others", dec2024: "10.38", mar2025: "9.71", jun2025: "8.42", sep2025: "7.43", dec2025: "6.37" },
    ],
    shareholdingBuckets: [
      { label: "Promoters", value: "46.36%", color: "#DF3F62" },
      { label: "DIIs", value: "16.42%", color: "#CDB9CE" },
      { label: "Mutual Funds", value: "11.08%", color: "#D8CBEE" },
      { label: "FIIs", value: "19.77%", color: "#A25DCC" },
      { label: "Public", value: "6.37%", color: "#243B53" },
    ],
  };

  return (
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
      normalizedData={null}
      viewerSignedIn={false}
      sharedSidebarRailData={sharedSidebarRailData}
    />
  );
}
