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
import { getTopMarketNewsArticles } from "@/lib/market-news/queries";
import { getMarketSnapshotGroups } from "@/lib/market-snapshot-system";
import { getMarketOverview } from "@/lib/market-overview";
import { buildSeoMetadata } from "@/lib/seo-config";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";
import { getSharedSidebarRailData } from "@/lib/shared-sidebar-config";

const marketsHeroSurfaceStyle = {
  backgroundColor: "#081225",
  backgroundImage:
    "radial-gradient(circle at top left, rgba(56,189,248,0.28), transparent 28%), radial-gradient(circle at 84% 18%, rgba(244,197,66,0.16), transparent 24%), linear-gradient(135deg, #081225 0%, #0E213E 48%, #15365F 100%)",
  boxShadow: "0 28px 68px rgba(8, 18, 37, 0.28)",
};

const marketsHeroGlassCardStyle = {
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.07) 100%)",
  borderColor: "rgba(255,255,255,0.16)",
  boxShadow: "0 14px 30px rgba(8, 18, 37, 0.14)",
  backdropFilter: "blur(14px)",
};

const marketsHeroBoardCardStyle = {
  background:
    "linear-gradient(180deg, rgba(4,10,22,0.22) 0%, rgba(7,18,36,0.38) 100%)",
  borderColor: "rgba(255,255,255,0.12)",
};

function heroMoveColor(value: string) {
  if (value.startsWith("+")) {
    return "#7CE3A4";
  }

  if (value.startsWith("-")) {
    return "#FCA5A5";
  }

  return "rgba(226,232,240,0.76)";
}

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({
    policyKey: "markets_hub",
    title: "Markets | Riddra",
    description: "Riddra market overview for discovery, sector navigation, IPOs, and fund ideas.",
    publicHref: "/markets",
  });
}

export default async function MarketsPage() {
  const [
    overview,
    snapshotGroups,
    nifty50Snapshot,
    sensexSnapshot,
    bankNiftySnapshot,
    finNiftySnapshot,
    sharedSidebarRailData,
    topMarketNewsStories,
  ] = await Promise.all([
    getMarketOverview(),
    getMarketSnapshotGroups(),
    getIndexSnapshot("nifty50").catch(() => null),
    getIndexSnapshot("sensex").catch(() => null),
    getIndexSnapshot("banknifty").catch(() => null),
    getIndexSnapshot("finnifty").catch(() => null),
    getSharedSidebarRailData({ pageCategory: "markets" }),
    getTopMarketNewsArticles({ limit: 4 }).catch(() => []),
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
  const topStory = topMarketNewsStories[0] ?? null;
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
  const heroBoardItems = snapshotGroups
    .flatMap((group) =>
      group.family === "index"
        ? group.items.slice(0, 2)
        : group.items.slice(0, 1),
    )
    .slice(0, 4);
  const heroRailItems = [
    overview.topGainers[0]
      ? {
          label: "Top gainer",
          title: overview.topGainers[0].name,
          detail: `${overview.topGainers[0].symbol} • ${overview.topGainers[0].price}`,
          meta: overview.topGainers[0].change,
        }
      : null,
    overview.topLosers[0]
      ? {
          label: "Top loser",
          title: overview.topLosers[0].name,
          detail: `${overview.topLosers[0].symbol} • ${overview.topLosers[0].price}`,
          meta: overview.topLosers[0].change,
        }
      : null,
    overview.topIpos[0]
      ? {
          label: "IPO watch",
          title: overview.topIpos[0].name,
          detail: `${overview.topIpos[0].priceBand} • ${overview.topIpos[0].status}`,
          meta: overview.topIpos[0].openDate,
        }
      : null,
    topStory
      ? {
          label: "Top story",
          title: topStory.rewritten_title || topStory.original_title,
          detail: topStory.source_name || "Market News",
          meta: "Latest coverage",
        }
      : null,
  ].filter(
    (item): item is { label: string; title: string; detail: string; meta: string } =>
      Boolean(item),
  );
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
        <ProductCard
          tone="primary"
          className="overflow-hidden border-[rgba(15,23,42,0.22)] p-0 text-white"
          style={marketsHeroSurfaceStyle}
        >
          <div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {["Benchmarks live", "Stocks + funds + IPOs", "Market news inside"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/14 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/82"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="space-y-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/70">Markets</p>
                <h1 className="text-3xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-[3.3rem]">
                  One operating surface for the whole market story.
                </h1>
                <p className="max-w-3xl text-base leading-8 text-[rgba(226,232,240,0.9)]">
                  Start with the benchmark board, then move through stored stock movers, fund ideas, IPO watch, and market news without bouncing across disconnected sections.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[14px] border border-white/12 bg-black/12 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/66">Coverage</p>
                  <p className="mt-2 text-[15px] font-semibold text-white">Benchmarks, metals, FX</p>
                </div>
                <div className="rounded-[14px] border border-white/12 bg-black/12 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/66">Benchmark routes</p>
                  <p className="mt-2 text-[15px] font-semibold text-white">{benchmarkRoutes.length}</p>
                </div>
                <div className="rounded-[14px] border border-white/12 bg-black/12 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/66">Tracked sectors</p>
                  <p className="mt-2 text-[15px] font-semibold text-white">
                    {hasSectorPerformance ? overview.sectorPerformance.length : 0}
                  </p>
                </div>
              </div>
              {heroBoardItems.length ? (
                <div className="grid gap-3 pt-1 sm:grid-cols-2 xl:grid-cols-4">
                  {heroBoardItems.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href ?? "/markets"}
                      className="rounded-[16px] border px-4 py-4 transition hover:translate-y-[-1px]"
                      style={marketsHeroBoardCardStyle}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/56">
                        {item.label}
                      </p>
                      <div className="mt-3 flex items-end justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[1.08rem] font-semibold leading-none text-white">
                            {item.value}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-white/70">
                            {item.sourceLabel}
                          </p>
                        </div>
                        <span
                          className="text-sm font-semibold"
                          style={{ color: heroMoveColor(item.change) }}
                        >
                          {item.change}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="grid gap-3">
              {heroRailItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[18px] border px-4 py-4"
                    style={marketsHeroGlassCardStyle}
                  >
                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/62">{item.label}</p>
                    <p className="mt-2 text-[1rem] font-semibold text-white">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-white/78">{item.detail}</p>
                    <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F4C542]">{item.meta}</p>
                  </div>
                ))}
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

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          {[
            { href: "#stocks", label: "Stocks", meta: "subsection" },
            { href: "#top-gainers", label: "Top Gainers", meta: "stored movers" },
            { href: "#top-losers", label: "Top Losers", meta: "weakest moves" },
            { href: "#fund-ideas", label: "Fund Ideas", meta: "stored NAV" },
            { href: "#ipo-watchlist", label: "IPO Watch", meta: "live slate" },
            { href: "#latest-news", label: "Latest News", meta: "market stories" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[12px] border border-[rgba(226,222,217,0.86)] bg-[linear-gradient(180deg,#FFFFFF_0%,rgba(246,248,252,0.96)_100%)] px-4 py-3 transition hover:border-[#1B3A6B] hover:shadow-[0_10px_22px_rgba(27,58,107,0.05)]"
            >
              <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">{item.meta}</p>
              <p className="mt-2 text-[14px] font-semibold text-[#1B3A6B]">{item.label}</p>
            </Link>
          ))}
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

        <section id="stocks" className="scroll-mt-24 space-y-5 border-t border-[rgba(226,222,217,0.82)] pt-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <ProductSectionTitle
              title="Stocks on the market page"
              description="This is the stock subsection inside Markets: top movers first, then direct routes into the dedicated stock pages and the broader /stocks hub."
              eyebrow="Stocks"
            />
            <Link
              href="/stocks"
              className="inline-flex items-center justify-between rounded-[10px] border border-[rgba(27,58,107,0.12)] bg-[rgba(27,58,107,0.04)] px-4 py-3 text-sm font-medium text-[#1B3A6B] transition hover:bg-[rgba(27,58,107,0.08)]"
            >
              <span>Open full stock subsection</span>
              <span className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.78)]">/stocks</span>
            </Link>
          </div>
          <div className={`grid gap-6 ${hasFundIdeas ? "xl:grid-cols-3" : "xl:grid-cols-2"}`}>
            <MarketListCard
              sectionId="top-gainers"
              viewAllHref="/markets#top-gainers"
              hrefBase="/stocks"
              items={overview.topGainers}
              title="Top gainers"
              variant="stocks"
              description="The strongest stored same-day moves in the tracked stock universe, with direct links into the stock detail pages."
            />
            <MarketListCard
              sectionId="top-losers"
              viewAllHref="/markets#top-losers"
              hrefBase="/stocks"
              items={overview.topLosers}
              title="Top losers"
              variant="stocks"
              description="The weakest stored same-day moves in the tracked stock universe, so the downside tape stays visible too."
            />
            {hasFundIdeas ? (
              <MarketListCard
                sectionId="fund-ideas"
                viewAllHref="/mutual-funds"
                hrefBase="/mutual-funds"
                items={overview.topFundIdeas}
                title="Fund ideas"
                variant="funds"
                description="Public fund routes already backed by durable NAV truth, surfaced here so markets and wealth discovery stay connected."
              />
            ) : null}
          </div>
        </section>

        <ProductRouteGrid
          title="Continue from the market board"
          description="Once the first market read is clear, these routes carry the story into sectors, screens, funds, IPOs, and learning context."
          eyebrow="Discovery"
          items={marketDiscoveryRoutes}
        />

        {hasIpoWatchlist ? (
          <MarketListCard
            sectionId="ipo-watchlist"
            viewAllHref="/ipo"
            hrefBase="/ipo"
            items={overview.topIpos}
            title="IPO watchlist"
            variant="ipos"
            description="The current public IPO slate with issue status, price bands, and direct routes into dedicated issue pages."
          />
        ) : null}

        <section id="latest-news" className="scroll-mt-24 space-y-5 border-t border-[rgba(226,222,217,0.82)] pt-8">
          <ProductSectionTitle
            title="Latest market news"
            description="The most important market stories in the stored news layer, kept inside Markets so the page feels complete even before you drill into a stock or index."
            eyebrow="News"
          />
          <div className="grid gap-4 xl:grid-cols-2">
            {topMarketNewsStories.length ? (
              topMarketNewsStories.map((article) => (
                <Link
                  key={article.id}
                  href={`/markets/news/${article.slug}`}
                  className="block rounded-[10px] border border-[rgba(226,222,217,0.88)] bg-white px-4 py-4 transition hover:border-[#1B3A6B] hover:shadow-[0_12px_24px_rgba(27,58,107,0.05)]"
                >
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">
                      {article.source_name || "Market News"}
                    </p>
                    <p className="text-base font-medium leading-7 text-[#1B3A6B]">
                      {article.rewritten_title || article.original_title}
                    </p>
                    <p className="text-sm leading-6 text-[rgba(107,114,128,0.88)]">
                      {article.short_summary || article.impact_note || article.summary || "Open the full story on Riddra Market News."}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <ProductCard tone="warning">
                <p className="text-sm leading-7 text-[rgba(107,114,128,0.9)]">
                  Market news is temporarily unavailable on this page right now.
                </p>
              </ProductCard>
            )}
          </div>
        </section>

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
