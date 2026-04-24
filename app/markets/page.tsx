import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { MarketListCard } from "@/components/market-list-card";
import { MarketSnapshotOverview } from "@/components/market-snapshot-system";
import {
  ProductBreadcrumbs,
  ProductCard,
  ProductPageContainer,
  ProductPageTwoColumnLayout,
  ProductRouteGrid,
  ProductSectionTitle,
} from "@/components/product-page-system";
import { SharedMarketSidebarRail } from "@/components/shared-market-sidebar-rail";
import { TradingviewMarketGrid } from "@/components/tradingview-market-grid";
import { getIndexSnapshot } from "@/lib/index-content";
import { getMarketSnapshotGroups } from "@/lib/market-snapshot-system";
import { getMarketOverview } from "@/lib/market-overview";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";
import { getSharedSidebarRailData } from "@/lib/shared-sidebar-config";

export const metadata: Metadata = {
  title: "Markets",
  description: "Riddra market overview for discovery, sector navigation, IPOs, and fund ideas.",
};

export default async function MarketsPage() {
  const [overview, snapshotGroups, nifty50Snapshot, sensexSnapshot, bankNiftySnapshot, finNiftySnapshot, sharedSidebarRailData] = await Promise.all([
    getMarketOverview(),
    getMarketSnapshotGroups(),
    getIndexSnapshot("nifty50"),
    getIndexSnapshot("sensex"),
    getIndexSnapshot("banknifty"),
    getIndexSnapshot("finnifty"),
    getSharedSidebarRailData({ pageCategory: "markets" }),
  ]);
  const marketCharts = [
    {
      title: "Nifty 50",
      nativeSnapshot: nifty50Snapshot ?? undefined,
      note: "Retained session view for the broad-market benchmark.",
    },
    {
      title: "Sensex",
      nativeSnapshot: sensexSnapshot ?? undefined,
      note: "Retained benchmark view for the BSE large-cap bellwether.",
    },
    {
      title: "Bank Nifty",
      nativeSnapshot: bankNiftySnapshot ?? undefined,
      note: "Retained banking-index view before you move into breadth and component leadership.",
    },
    {
      title: "Fin Nifty",
      nativeSnapshot: finNiftySnapshot ?? undefined,
      note: "Retained financial-services benchmark view for broader market context.",
    },
  ];
  const hasSectorPerformance = overview.sectorPerformance.length > 0;
  const hasFundIdeas = overview.topFundIdeas.length > 0;
  const hasIpoWatchlist = overview.topIpos.length > 0;
  const benchmarkRoutes: Array<{
    eyebrow: string;
    title: string;
    description: string;
    href: string;
    hrefLabel: string;
    meta: string;
  }> = [];

  if (nifty50Snapshot) {
    benchmarkRoutes.push({
      eyebrow: "Broad market",
      title: "Nifty 50",
      description: `${nifty50Snapshot.breadthLabel} with ${nifty50Snapshot.advancingCount} stocks rising and ${nifty50Snapshot.decliningCount} falling.`,
      href: "/nifty50",
      hrefLabel: "Open Nifty 50",
      meta: nifty50Snapshot.marketMood,
    });
  }

  if (sensexSnapshot) {
    benchmarkRoutes.push({
      eyebrow: "BSE benchmark",
      title: "Sensex",
      description: `${sensexSnapshot.breadthLabel} with ${sensexSnapshot.advancingCount} stocks rising and ${sensexSnapshot.decliningCount} falling.`,
      href: "/sensex",
      hrefLabel: "Open Sensex",
      meta: sensexSnapshot.marketMood,
    });
  }

  if (bankNiftySnapshot) {
    benchmarkRoutes.push({
      eyebrow: "Banking benchmark",
      title: "Bank Nifty",
      description: `${bankNiftySnapshot.breadthLabel} with ${bankNiftySnapshot.advancingCount} constituents rising and ${bankNiftySnapshot.decliningCount} falling.`,
      href: "/banknifty",
      hrefLabel: "Open Bank Nifty",
      meta: bankNiftySnapshot.marketMood,
    });
  }

  if (finNiftySnapshot) {
    benchmarkRoutes.push({
      eyebrow: "Financial services",
      title: "Fin Nifty",
      description: `${finNiftySnapshot.breadthLabel} with ${finNiftySnapshot.advancingCount} constituents rising and ${finNiftySnapshot.decliningCount} falling.`,
      href: "/finnifty",
      hrefLabel: "Open Fin Nifty",
      meta: finNiftySnapshot.marketMood,
    });
  }
  const marketDiscoveryRoutes = [
    ...overview.discovery.map((item) => ({
      title: item.title,
      description: item.description,
      href: item.href,
      hrefLabel: "Open page",
      meta: item.badge,
    })),
    {
      title: "Indices hub",
      description: "Move from the board into the full benchmark hub when you want breadth, leadership, and session history in one place.",
      href: "/indices",
      hrefLabel: "Open indices",
      meta: "Benchmarks",
    },
    {
      title: "Results calendar",
      description: "Keep earnings and event timing close once the market board points you toward a sector or stock follow-through.",
      href: "/reports/results-calendar",
      hrefLabel: "Open calendar",
      meta: "Events",
    },
  ];
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Markets", href: "/markets" },
  ];
  const breadcrumbSchemaItems = breadcrumbs.map((item) => ({
    name: item.label,
    href: item.href,
  }));
  const marketSidebar = sharedSidebarRailData.enabledOnPageType ? (
    <SharedMarketSidebarRail
      visibleBlocks={sharedSidebarRailData.visibleBlocks}
      marketSnapshotItems={sharedSidebarRailData.marketSnapshotItems}
      topGainers={sharedSidebarRailData.topGainers}
      topLosers={sharedSidebarRailData.topLosers}
      popularStocks={sharedSidebarRailData.popularStocks}
    />
  ) : null;

  return (
    <div className="riddra-product-page border-y border-[rgba(221,215,207,0.82)] bg-[linear-gradient(180deg,rgba(248,246,242,0.98)_0%,rgba(250,249,247,0.98)_100%)] py-2 sm:py-2.5">
      <JsonLd data={buildBreadcrumbSchema(breadcrumbSchemaItems)} />
      <JsonLd
        data={buildWebPageSchema({
          title: "Markets",
          description: "Riddra market overview for discovery, sector navigation, IPOs, and fund ideas.",
          path: "/markets",
        })}
      />
      <ProductPageContainer className="space-y-6">
        <ProductBreadcrumbs items={breadcrumbs} />

        <ProductPageTwoColumnLayout
          left={
            <div className="space-y-6">
        <ProductCard tone="primary" className="p-4 sm:p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="space-y-4">
              <ProductSectionTitle
                eyebrow="Daily destination"
                title="Market overview"
                description="Start with the tracked benchmark board, then move into stocks, funds, sectors, and deeper index research from one public market surface."
              />
              <div className={`grid gap-3 ${hasSectorPerformance ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                <div className="rounded-[10px] border border-[rgba(226,222,217,0.86)] bg-white/92 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Coverage</p>
                  <p className="mt-1 text-[15px] font-semibold text-[#111827]">Benchmarks, metals, FX</p>
                </div>
                <div className="rounded-[10px] border border-[rgba(226,222,217,0.86)] bg-white/92 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Benchmark routes</p>
                  <p className="mt-1 text-[15px] font-semibold text-[#111827]">{benchmarkRoutes.length}</p>
                </div>
                {hasSectorPerformance ? (
                  <div className="rounded-[10px] border border-[rgba(226,222,217,0.86)] bg-white/92 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Sector board</p>
                    <p className="mt-1 text-[15px] font-semibold text-[#111827]">
                      {overview.sectorPerformance.length} tracked sectors
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="grid gap-3">
              <div className="rounded-[10px] border border-[rgba(27,58,107,0.12)] bg-[rgba(27,58,107,0.04)] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Reading flow</p>
                <p className="mt-2 text-[15px] font-semibold text-[#1B3A6B]">Board first, then benchmark route</p>
                <p className="mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">
                  Start with the board, then move into the benchmark or market route that best matches the story you are following.
                </p>
              </div>
              <div className="rounded-[10px] border border-[rgba(226,222,217,0.86)] bg-white/92 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">What to trust here</p>
                <p className="mt-2 text-[15px] font-semibold text-[#111827]">Benchmark posture with clear coverage gaps</p>
                <p className="mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">
                  The page keeps benchmark context, metals, FX, and tracked movers visible while leaving thinner market lanes out until they are ready.
                </p>
              </div>
            </div>
          </div>
        </ProductCard>

        <div className={`grid gap-4 ${hasSectorPerformance ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
          <ProductCard tone="primary" className="space-y-3">
            <p className="riddra-product-body text-[10px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.78)]">Coverage</p>
            <p className="riddra-product-display text-[1.85rem] font-semibold tracking-tight text-[#1B3A6B]">
              Benchmarks, metals, FX
            </p>
            <p className="riddra-product-body text-sm leading-7 text-[rgba(107,114,128,0.9)]">
              The board keeps tracked index breadth, metals context, and the main FX anchor visible before you branch into detail routes.
            </p>
          </ProductCard>
          <ProductCard tone="secondary" className="space-y-3">
            <p className="riddra-product-body text-[10px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.78)]">How to use it</p>
            <p className="riddra-product-display text-[1.85rem] font-semibold tracking-tight text-[#1B3A6B]">
              Read the board, then drill down
            </p>
            <p className="riddra-product-body text-sm leading-7 text-[rgba(107,114,128,0.9)]">
              Start with benchmark posture, check cross-asset context, then move into stocks, funds, sector hubs, or the dedicated index pages.
            </p>
          </ProductCard>
          {hasSectorPerformance ? (
            <ProductCard tone="secondary" className="space-y-3">
              <p className="riddra-product-body text-[10px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.78)]">
                Sector performance
              </p>
              <>
                <div className="space-y-2">
                  {overview.sectorPerformance.map((sector) => (
                    <div
                      key={sector.sectorSlug}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] border border-[rgba(226,222,217,0.82)] bg-white px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        {sector.href ? (
                          <Link href={sector.href} className="riddra-product-body text-sm font-medium text-[#1B3A6B] transition hover:text-[#D4853B]">
                            {sector.sectorName}
                          </Link>
                        ) : (
                          <p className="riddra-product-body text-sm font-medium text-[#1B3A6B]">{sector.sectorName}</p>
                        )}
                        <p className="riddra-product-body mt-1 text-[11px] text-[rgba(107,114,128,0.76)]">
                          {sector.sourceLabel} • {sector.sourceDate}
                        </p>
                      </div>
                      <p className="riddra-product-number text-[15px] font-medium text-[#1B3A6B]">
                        {sector.return1D}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            </ProductCard>
          ) : null}
        </div>

        <div className="space-y-5">
          <ProductSectionTitle
            title="Market board"
            description="Use the tracked benchmark, metals, and FX snapshots as your first read. Missing lanes stay clearly labeled instead of being padded with filler."
          />
          <MarketSnapshotOverview groups={snapshotGroups} />
        </div>

        <div className="space-y-5">
          <ProductSectionTitle
            title="Benchmark chart board"
            description="These chart cards give a quick visual read on the major index routes. If a chart is missing, the card says so clearly."
          />
          <TradingviewMarketGrid
            items={marketCharts}
            height={330}
            eyebrow="Market chart"
            badge="Retained view"
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
          <ProductRouteGrid
            title="Open the right benchmark route"
            description="Move from the market board into the benchmark page that best matches the story you are following."
            eyebrow="Benchmarks"
            items={benchmarkRoutes}
          />
          <ProductCard tone="secondary" className="space-y-4">
            <ProductSectionTitle
              title="What this board covers"
              description="Use the market board for benchmark posture, metals, FX, and tracked route discovery."
              eyebrow="Coverage notes"
            />
            <div className="grid gap-3">
              <div className="rounded-[10px] border border-[rgba(226,222,217,0.86)] bg-white px-4 py-4">
                <p className="riddra-product-body text-[10px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.78)]">Available now</p>
                <p className="riddra-product-body mt-2 text-base font-medium text-[#1B3A6B]">Index breadth, metals, FX, and tracked stock movers</p>
                <p className="riddra-product-body mt-2 text-sm leading-6 text-[rgba(107,114,128,0.88)]">
                  The page already surfaces benchmark context, cross-asset anchors, and the strongest movers inside the tracked stock set.
                </p>
              </div>
              <div className="rounded-[10px] border border-[rgba(226,222,217,0.86)] bg-[rgba(248,246,242,0.72)] px-4 py-4">
                <p className="riddra-product-body text-[10px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.78)]">Hidden until live</p>
                <p className="riddra-product-body mt-2 text-base font-medium text-[#1B3A6B]">
                  {hasSectorPerformance ? "Exchange-wide mover expansion" : "Sector board and exchange-wide mover expansion"}
                </p>
                <p className="riddra-product-body mt-2 text-sm leading-6 text-[rgba(107,114,128,0.88)]">
                  Optional market boards stay out of the page until broader public coverage exists, so the overview does not waste space on thin placeholder modules.
                </p>
              </div>
              <Link
                href="/indices"
                className="inline-flex items-center justify-between rounded-[10px] border border-[rgba(27,58,107,0.12)] bg-[rgba(27,58,107,0.04)] px-4 py-3 text-sm font-medium text-[#1B3A6B] transition hover:bg-[rgba(27,58,107,0.08)]"
              >
                <span>Continue into the indices hub</span>
                <span className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.78)]">Benchmarks</span>
              </Link>
            </div>
          </ProductCard>
        </div>

        <div className={`grid gap-6 ${hasFundIdeas ? "xl:grid-cols-3" : "xl:grid-cols-2"}`}>
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
          {hasFundIdeas ? (
            <MarketListCard
              hrefBase="/mutual-funds"
              items={overview.topFundIdeas}
              title="Fund ideas"
              variant="funds"
            />
          ) : null}
        </div>

        <ProductRouteGrid
          title="Continue from the market board"
          description="Once the first market read is clear, these routes carry the story into sectors, screens, funds, IPOs, and learning context."
          eyebrow="Discovery"
          items={marketDiscoveryRoutes}
        />

        {hasIpoWatchlist ? (
          <MarketListCard
            hrefBase="/ipo"
            items={overview.topIpos}
            title="IPO watchlist"
            variant="ipos"
          />
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <ProductCard tone="secondary" className="space-y-3">
            <p className="riddra-product-body text-[10px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.78)]">Learning follow-through</p>
            <p className="riddra-product-display text-[1.7rem] font-semibold tracking-tight text-[#1B3A6B]">
              Add context before acting
            </p>
            <p className="riddra-product-body text-sm leading-7 text-[rgba(107,114,128,0.9)]">
              Move into the learning routes when a benchmark move needs more context around sectors, funds, or the event cycle behind it.
            </p>
            <Link
              href="/learn"
              className="inline-flex items-center justify-between rounded-[10px] border border-[rgba(27,58,107,0.12)] bg-[rgba(27,58,107,0.04)] px-4 py-3 text-sm font-medium text-[#1B3A6B] transition hover:bg-[rgba(27,58,107,0.08)]"
            >
              <span>Explore learn hub</span>
              <span className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.78)]">Context</span>
            </Link>
          </ProductCard>
          <ProductCard tone="secondary" className="space-y-3">
            <p className="riddra-product-body text-[10px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.78)]">Event follow-through</p>
            <p className="riddra-product-display text-[1.7rem] font-semibold tracking-tight text-[#1B3A6B]">
              Keep results and event timing nearby
            </p>
            <p className="riddra-product-body text-sm leading-7 text-[rgba(107,114,128,0.9)]">
              Use the results calendar and IPO routes when the market board points you toward a time-sensitive follow-up.
            </p>
            <Link
              href="/reports/results-calendar"
              className="inline-flex items-center justify-between rounded-[10px] border border-[rgba(27,58,107,0.12)] bg-[rgba(27,58,107,0.04)] px-4 py-3 text-sm font-medium text-[#1B3A6B] transition hover:bg-[rgba(27,58,107,0.08)]"
            >
              <span>Open results calendar</span>
              <span className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.78)]">Events</span>
            </Link>
          </ProductCard>
        </div>
            </div>
          }
          right={marketSidebar}
        />
      </ProductPageContainer>
    </div>
  );
}
