import Link from "next/link";

import { MarketListCard } from "@/components/market-list-card";
import { MarketSnapshotOverview } from "@/components/market-snapshot-system";
import {
  ProductCard,
  ProductPageContainer,
  ProductPageTwoColumnLayout,
  ProductSectionTitle,
} from "@/components/product-page-system";
import { SearchAssistForm } from "@/components/search-assist-form";
import { SharedMarketSidebarRail } from "@/components/shared-market-sidebar-rail";
import { getMarketOverview } from "@/lib/market-overview";
import { getMarketSnapshotGroups } from "@/lib/market-snapshot-system";
import { getSharedSidebarRailData } from "@/lib/shared-sidebar-config";

export default async function NotFound() {
  const [overview, snapshotGroups, sharedSidebarRailData] = await Promise.all([
    getMarketOverview(),
    getMarketSnapshotGroups(),
    getSharedSidebarRailData({ pageCategory: "fallback" }),
  ]);
  const visibleSnapshotGroups = snapshotGroups.slice(0, 2);
  const hasSectorPerformance = overview.sectorPerformance.length > 0;

  const left = (
    <div className="space-y-3 sm:space-y-4">
      <ProductCard tone="primary" className="p-5 text-center sm:p-7">
        <div className="mx-auto max-w-3xl space-y-4">
          <p className="riddra-product-body text-[11px] font-semibold uppercase tracking-[0.2em] text-[rgba(107,114,128,0.76)]">
            404 · Page not found
          </p>
          <div className="space-y-2">
            <h1 className="riddra-product-display text-3xl font-semibold tracking-tight text-[#111827] sm:text-4xl">
              Find the right Riddra page
            </h1>
            <p className="riddra-product-body mx-auto max-w-2xl text-sm leading-7 text-[rgba(75,85,99,0.84)]">
              The page you opened is not available, but search can take you straight to stocks, funds, indices, tools, and market pages.
            </p>
          </div>

          <div className="mx-auto max-w-2xl rounded-[16px] border border-[rgba(27,58,107,0.12)] bg-[rgba(248,250,252,0.82)] p-3 shadow-[0_14px_32px_rgba(27,58,107,0.07)]">
            <SearchAssistForm placeholder="Search stocks, indices, funds, tools..." />
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {[
              { label: "Open markets", href: "/markets" },
              { label: "Stock screener", href: "/screener" },
              { label: "Nifty 50", href: "/nifty50" },
              { label: "Tata Motors", href: "/stocks/tata-motors" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-[rgba(27,58,107,0.12)] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#1B3A6B] transition hover:border-[#D4853B] hover:text-[#D4853B]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </ProductCard>

      <ProductCard tone="secondary" className="space-y-4 p-4 sm:p-5">
        <ProductSectionTitle
          eyebrow="Market recovery"
          title="Start from the market board"
          description="These are the useful market entry cards from the market page, brought here so a missing link still gives users a productive next step."
        />
        <div className={`grid gap-3 ${hasSectorPerformance ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          <div className="rounded-[10px] border border-[rgba(226,222,217,0.86)] bg-white px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Coverage</p>
            <p className="mt-1 text-[15px] font-semibold text-[#111827]">Benchmarks, metals, FX</p>
          </div>
          <div className="rounded-[10px] border border-[rgba(226,222,217,0.86)] bg-white px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Tracked stocks</p>
            <p className="mt-1 text-[15px] font-semibold text-[#111827]">
              {overview.stats.find((item) => item.label === "Tracked stocks")?.value ?? "Live"}
            </p>
          </div>
          {hasSectorPerformance ? (
            <div className="rounded-[10px] border border-[rgba(226,222,217,0.86)] bg-white px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Sector board</p>
              <p className="mt-1 text-[15px] font-semibold text-[#111827]">
                {overview.sectorPerformance.length} tracked sectors
              </p>
            </div>
          ) : null}
        </div>
      </ProductCard>

      {visibleSnapshotGroups.length > 0 ? (
        <ProductCard tone="primary" className="space-y-5 p-4 sm:p-5">
          <ProductSectionTitle
            eyebrow="Market board"
            title="Market snapshot"
            description="A compact read on the core market board before you continue into the full Markets page."
          />
          <MarketSnapshotOverview groups={visibleSnapshotGroups} />
        </ProductCard>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        <MarketListCard
          hrefBase="/stocks"
          items={overview.topGainers}
          title="Top gainers"
          variant="stocks"
        />
        <MarketListCard
          hrefBase="/stocks"
          items={overview.topLosers}
          title="Top losers"
          variant="stocks"
        />
      </div>
    </div>
  );

  const right = sharedSidebarRailData.enabledOnPageType ? (
    <SharedMarketSidebarRail
      visibleBlocks={sharedSidebarRailData.visibleBlocks}
      marketSnapshotItems={sharedSidebarRailData.marketSnapshotItems}
      topGainers={sharedSidebarRailData.topGainers}
      topLosers={sharedSidebarRailData.topLosers}
      popularStocks={sharedSidebarRailData.popularStocks}
    />
  ) : null;

  return (
    <div className="riddra-product-page py-3 sm:py-4">
      <ProductPageContainer>
        <ProductPageTwoColumnLayout left={left} right={right} />
      </ProductPageContainer>
    </div>
  );
}
