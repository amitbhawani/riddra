import Link from "next/link";
import type { ReactNode } from "react";

import {
  ProductCard,
  ProductPageContainer,
  ProductPageTwoColumnLayout,
  ProductSectionTitle,
} from "@/components/product-page-system";
import {
  getRiddraDailyMarketBriefPreview,
  type RiddraDailyMarketBrief,
} from "@/lib/market-news/brief";
import type { MarketNewsArticleWithRelations } from "@/lib/market-news/types";
import { MarketSnapshotOverview } from "@/components/market-snapshot-system";
import type { DiscoveryCard, MarketStat } from "@/lib/market-overview";
import type { MarketSnapshotGroup } from "@/lib/market-snapshot-system";
import { formatProductPercent } from "@/lib/product-page-design";
import type { IndexSnapshot } from "@/lib/index-intelligence";
import type { FundSnapshot, IpoSnapshot, StockSnapshot } from "@/lib/mock-data";

const homepageHeroSurfaceStyle = {
  backgroundColor: "#081225",
  backgroundImage:
    "radial-gradient(circle at top left, rgba(59,130,246,0.34), transparent 28%), radial-gradient(circle at 88% 18%, rgba(244,197,66,0.18), transparent 24%), linear-gradient(135deg, #071224 0%, #102241 48%, #17335D 100%)",
  boxShadow: "0 28px 68px rgba(8, 18, 37, 0.28)",
};

const homepageHeroGlassCardStyle = {
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.07) 100%)",
  borderColor: "rgba(255,255,255,0.16)",
  boxShadow: "0 14px 30px rgba(8, 18, 37, 0.14)",
  backdropFilter: "blur(14px)",
};

const homepageHeroBoardCardStyle = {
  background:
    "linear-gradient(180deg, rgba(4,10,22,0.22) 0%, rgba(7,18,36,0.38) 100%)",
  borderColor: "rgba(255,255,255,0.12)",
};

const homepageHeroFooterStyle = {
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
};

function topMoveColor(value: string) {
  if (value.startsWith("+")) {
    return "#1A7F4B";
  }

  if (value.startsWith("-")) {
    return "#C0392B";
  }

  return "#6B7280";
}

export function MarketIntelligenceHomepage({
  dailyBrief,
  indexSnapshots,
  marketSnapshotGroups,
  stats,
  discovery,
  topStocks,
  topLosers,
  topFunds,
  topIpos,
  topMarketNewsStories,
  sidebar,
}: {
  dailyBrief: RiddraDailyMarketBrief | null;
  indexSnapshots: IndexSnapshot[];
  marketSnapshotGroups: MarketSnapshotGroup[];
  stats: MarketStat[];
  discovery: DiscoveryCard[];
  topStocks: StockSnapshot[];
  topLosers: StockSnapshot[];
  topFunds: FundSnapshot[];
  topIpos: IpoSnapshot[];
  topMarketNewsStories: MarketNewsArticleWithRelations[];
  sidebar?: ReactNode;
}) {
  const primaryIndex = indexSnapshots[0] ?? null;
  const shouldShowTodayOnRiddra =
    Boolean(dailyBrief && dailyBrief.articles.length >= 3) && topMarketNewsStories.length >= 3;
  const leadGainer = topStocks[0] ?? null;
  const leadFund = topFunds[0] ?? null;
  const leadIpo = topIpos[0] ?? null;
  const leadStory = topMarketNewsStories[0] ?? null;
  const heroBoardItems = marketSnapshotGroups
    .flatMap((group) =>
      group.family === "index"
        ? group.items.slice(0, 2)
        : group.items.slice(0, 1),
    )
    .slice(0, 4);
  const heroRailItems = [
    leadGainer
      ? {
          label: "Lead gainer",
          title: leadGainer.name,
          detail: `${leadGainer.symbol} • ${leadGainer.price}`,
          meta: leadGainer.change,
        }
      : null,
    leadFund
      ? {
          label: "Fund idea",
          title: leadFund.name,
          detail: `${leadFund.category} • NAV ${leadFund.nav}`,
          meta: leadFund.returns1Y,
        }
      : null,
    leadIpo
      ? {
          label: "IPO watch",
          title: leadIpo.name,
          detail: `${leadIpo.priceBand} • ${leadIpo.status}`,
          meta: leadIpo.openDate,
        }
      : null,
    leadStory
      ? {
          label: "Top story",
          title: leadStory.rewritten_title || leadStory.original_title,
          detail: leadStory.source_name || "Market News",
          meta: "Latest coverage",
        }
      : null,
  ].filter(
    (item): item is { label: string; title: string; detail: string; meta: string } =>
      Boolean(item),
  );

  return (
    <div className="pb-14 pt-10 sm:pb-20 sm:pt-14">
      <div className="riddra-product-page py-8 sm:py-10">
        <ProductPageContainer>
          <ProductPageTwoColumnLayout
            left={
              <div className="space-y-6">
                <section className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
            <ProductCard
              tone="primary"
              className="space-y-0 overflow-hidden border-[rgba(15,23,42,0.22)] p-0 text-white"
              style={homepageHeroSurfaceStyle}
            >
              <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(260px,0.92fr)]">
                <div className="space-y-5">
                  <div className="flex flex-wrap gap-2">
                    {["Live market surface", "Stored Yahoo data", "Route-ready research"].map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/14 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/82"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <p className="riddra-product-body text-[11px] uppercase tracking-[0.24em] text-white/70">
                      Riddra Home
                    </p>
                    <h1 className="riddra-product-display max-w-4xl text-4xl font-semibold leading-tight text-white sm:text-[3.75rem]">
                      One market front door that actually shows what is live right now.
                    </h1>
                    <p className="riddra-product-body max-w-3xl text-base leading-8 text-[rgba(226,232,240,0.92)] sm:text-lg">
                      Use the homepage as the market snapshot layer: benchmarks, route-ready stock movers, public fund ideas, IPO watch, and market news in one premium surface before you drill deeper.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/markets"
                      className="inline-flex min-h-[48px] items-center justify-center rounded-[10px] bg-[#F4C542] px-5 text-sm font-semibold text-[#081225] shadow-[0_16px_28px_rgba(244,197,66,0.28)] transition hover:translate-y-[-1px]"
                    >
                      Open Markets
                    </Link>
                    <Link
                      href="/stocks"
                      className="inline-flex min-h-[48px] items-center justify-center rounded-[10px] border border-white/16 bg-white/8 px-5 text-sm font-semibold text-white transition hover:bg-white/12"
                    >
                      Explore Stocks
                    </Link>
                    <Link
                      href="/markets#latest-news"
                      className="inline-flex min-h-[48px] items-center justify-center rounded-[10px] border border-white/16 bg-transparent px-5 text-sm font-semibold text-white/88 transition hover:bg-white/8"
                    >
                      Read Market News
                    </Link>
                  </div>
                  {heroBoardItems.length ? (
                    <div className="grid gap-3 pt-2 sm:grid-cols-2 2xl:grid-cols-4">
                      {heroBoardItems.map((item) => (
                        <Link
                          key={item.id}
                          href={item.href ?? "/markets"}
                          className="rounded-[16px] border px-4 py-4 transition hover:translate-y-[-1px]"
                          style={homepageHeroBoardCardStyle}
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/58">
                            {item.label}
                          </p>
                          <div className="mt-3 flex items-end justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[1.2rem] font-semibold leading-none text-white">
                                {item.value}
                              </p>
                              <p className="mt-2 text-xs leading-5 text-white/70">
                                {item.sourceLabel}
                              </p>
                            </div>
                            <span
                              className="text-sm font-semibold"
                              style={{ color: topMoveColor(item.change) }}
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
                        style={homepageHeroGlassCardStyle}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/62">{item.label}</p>
                        <p className="mt-2 text-[1rem] font-semibold leading-6 text-white">{item.title}</p>
                        <p className="mt-2 text-sm leading-6 text-white/78">{item.detail}</p>
                        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F4C542]">{item.meta}</p>
                      </div>
                    ))}
                </div>
              </div>
              <div
                className="grid gap-3 border-t border-white/10 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3"
                style={homepageHeroFooterStyle}
              >
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[14px] border px-4 py-4"
                    style={homepageHeroBoardCardStyle}
                  >
                    <p className="riddra-product-body text-[11px] uppercase tracking-[0.16em] text-white/66">
                      {stat.label}
                    </p>
                    <p className="riddra-product-number mt-2 text-2xl font-medium text-white">{stat.value}</p>
                    <p className="riddra-product-body mt-2 text-sm leading-6 text-white/74">
                      {stat.note}
                    </p>
                  </div>
                ))}
              </div>
            </ProductCard>

            <ProductCard tone="secondary" className="space-y-5 overflow-hidden border-[rgba(27,58,107,0.14)] bg-[linear-gradient(180deg,#FFFFFF_0%,rgba(243,247,252,0.98)_100%)]">
              <ProductSectionTitle
                title="Fastest routes to test"
                description="These are the strongest public routes if you want the product to feel live immediately."
              />
              <div className="grid gap-3">
                {[
                  { href: "/stocks/reliance-industries", label: "Open Reliance", tone: "primary" },
                  { href: "/nifty50", label: "Open Nifty 50", tone: "secondary" },
                  { href: "/markets#stocks", label: "See stock movers", tone: "ghost" },
                ].map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={[
                      "riddra-product-body inline-flex min-h-[48px] items-center justify-center rounded-[10px] px-4 text-sm font-medium transition",
                      action.tone === "primary"
                        ? "bg-[#1B3A6B] text-white hover:bg-[#D4853B]"
                        : action.tone === "secondary"
                          ? "border border-[#1B3A6B] bg-white text-[#1B3A6B] hover:border-[#D4853B] hover:text-[#D4853B]"
                          : "border border-[#E2DED9] bg-[#FAFAFA] text-[#1B3A6B] hover:border-[#1B3A6B]",
                    ].join(" ")}
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
              <div className="grid gap-3 border-t border-[#E2DED9] pt-4 sm:grid-cols-2">
                {discovery.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-[12px] border border-[rgba(226,222,217,0.88)] bg-white px-4 py-4 transition hover:border-[#1B3A6B] hover:shadow-[0_12px_24px_rgba(27,58,107,0.05)]"
                  >
                    <p className="riddra-product-body text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.82)]">
                      {item.badge}
                    </p>
                    <p className="riddra-product-body mt-2 text-base font-medium text-[#1B3A6B]">{item.title}</p>
                    <p className="riddra-product-body mt-2 text-sm leading-6 text-[rgba(107,114,128,0.88)]">
                      {item.description}
                    </p>
                  </Link>
                ))}
              </div>
            </ProductCard>
                </section>

                <section className="space-y-5">
            {marketSnapshotGroups.length ? (
              <MarketSnapshotOverview groups={marketSnapshotGroups} />
            ) : (
              <ProductCard tone="warning">
                <p className="riddra-product-body text-sm leading-7 text-[rgba(107,114,128,0.9)]">
                  Shared market snapshots are unavailable on this homepage right now.
                </p>
              </ProductCard>
            )}
                </section>

                <section className="space-y-5 border-t border-[rgba(226,222,217,0.82)] pt-8">
                  <ProductSectionTitle
                    title="Jump into the live market surface"
                    description="Use the homepage as the fast snapshot, then move into the exact market lane you want without losing the broader picture."
                  />
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      {
                        title: "Stock movers",
                        href: "/markets#stocks",
                        meta: `${topStocks.length + topLosers.length} tracked leaders`,
                        description: "Open the market stocks section for top gainers, losers, and direct routes into stock pages.",
                      },
                      {
                        title: "Fund ideas",
                        href: "/markets#fund-ideas",
                        meta: `${topFunds.length} fund routes`,
                        description: "See the public fund routes that already carry stored NAV and return context.",
                      },
                      {
                        title: "IPO watchlist",
                        href: "/markets#ipo-watchlist",
                        meta: `${topIpos.length} tracked issues`,
                        description: "Keep the live IPO slate close with current status, dates, and issue pages.",
                      },
                      {
                        title: "Latest market news",
                        href: "/markets#latest-news",
                        meta: `${topMarketNewsStories.length} fresh stories`,
                        description: "Continue into the markets page for the current market-news layer and brief context.",
                      },
                    ].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="rounded-[10px] border border-[rgba(226,222,217,0.88)] bg-white px-4 py-4 transition hover:border-[#1B3A6B] hover:shadow-[0_12px_24px_rgba(27,58,107,0.05)]"
                      >
                        <p className="riddra-product-body text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.82)]">
                          {item.meta}
                        </p>
                        <p className="riddra-product-body mt-2 text-base font-medium text-[#1B3A6B]">{item.title}</p>
                        <p className="riddra-product-body mt-2 text-sm leading-6 text-[rgba(107,114,128,0.88)]">
                          {item.description}
                        </p>
                      </Link>
                    ))}
                  </div>
                </section>

                {shouldShowTodayOnRiddra && dailyBrief ? (
                  <section className="space-y-5 border-t border-[rgba(226,222,217,0.82)] pt-8">
                    <ProductSectionTitle
                      title="Today on Riddra"
                      description="A compact read of the daily brief and the strongest market-news stories on the platform right now."
                    />

                    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)]">
                      <ProductCard tone="secondary" className="space-y-4">
                        <div className="space-y-2">
                          <p className="riddra-product-body text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.82)]">
                            Daily Market Brief
                          </p>
                          <h3 className="riddra-product-body text-[24px] font-semibold leading-tight text-[#1B3A6B] sm:text-[28px]">
                            {dailyBrief.headline}
                          </h3>
                          <p className="riddra-product-body text-sm leading-7 text-[rgba(107,114,128,0.9)]">
                            {getRiddraDailyMarketBriefPreview(dailyBrief)}
                          </p>
                        </div>
                        <div className="space-y-2">
                          {dailyBrief.highlights.slice(0, 3).map((highlight, index) => (
                            <div
                              key={`${dailyBrief.articles[index]?.id ?? index}-${highlight}`}
                              className="rounded-[10px] border border-[rgba(226,222,217,0.84)] bg-white px-3.5 py-3 text-sm leading-6 text-[rgba(55,65,81,0.92)]"
                            >
                              {highlight}
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Link
                            href="/markets/brief"
                            className="riddra-product-body inline-flex min-h-[42px] items-center justify-center rounded-[6px] bg-[#1B3A6B] px-4 text-sm font-medium text-white transition hover:bg-[#D4853B]"
                          >
                            Read full brief
                          </Link>
                          <Link
                            href="/markets/news"
                            className="riddra-product-body inline-flex min-h-[42px] items-center justify-center rounded-[6px] border border-[#1B3A6B] bg-white px-4 text-sm font-medium text-[#1B3A6B] transition hover:border-[#D4853B] hover:text-[#D4853B]"
                          >
                            View all market news
                          </Link>
                        </div>
                      </ProductCard>

                      <ProductCard tone="secondary" className="space-y-4">
                        <ProductSectionTitle
                          title="Popular Market Stories"
                          description="Three market-news stories with the strongest combined importance, momentum, and freshness."
                        />
                        <div className="space-y-3">
                          {topMarketNewsStories.slice(0, 3).map((article) => (
                            <Link
                              key={article.id}
                              href={`/markets/news/${article.slug}`}
                              className="block rounded-[10px] border border-[rgba(226,222,217,0.88)] bg-white px-4 py-4 transition hover:border-[#1B3A6B] hover:shadow-[0_12px_24px_rgba(27,58,107,0.05)]"
                            >
                              <p className="riddra-product-body text-base font-medium leading-7 text-[#1B3A6B]">
                                {article.rewritten_title || article.original_title}
                              </p>
                              <p className="riddra-product-body mt-2 text-sm leading-6 text-[rgba(107,114,128,0.88)]">
                                {article.short_summary || article.impact_note || article.summary || "Open the full story on Riddra Market News."}
                              </p>
                            </Link>
                          ))}
                        </div>
                      </ProductCard>
                    </div>
                  </section>
                ) : null}

                <section className="grid gap-6 border-t border-[rgba(226,222,217,0.82)] pt-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-3">
              <ProductSectionTitle
                title="Leadership pulse"
                description="A compact read of what is actively pulling or dragging the primary market benchmark right now."
              />
            </div>
            <div className="space-y-5">
              {primaryIndex ? (
                <ProductCard tone="secondary" className="space-y-4">
                  <ProductSectionTitle
                    title="Market leadership"
                    description="A compact intelligence strip using the live index component snapshot instead of editorial filler."
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-3 rounded-[10px] border border-[rgba(226,222,217,0.88)] bg-white px-4 py-4">
                      <p className="riddra-product-body text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.82)]">
                        Top pullers
                      </p>
                      {primaryIndex.topPullers.slice(0, 3).map((item) => (
                        <div key={item.symbol} className="flex items-center justify-between gap-3">
                          <span className="riddra-product-body text-sm text-[#1B3A6B]">{item.name}</span>
                          <span className="riddra-product-number text-sm text-[#1A7F4B]">
                            {formatProductPercent(item.changePercent)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3 rounded-[10px] border border-[rgba(226,222,217,0.88)] bg-white px-4 py-4">
                      <p className="riddra-product-body text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.82)]">
                        Top draggers
                      </p>
                      {primaryIndex.topDraggers.slice(0, 3).map((item) => (
                        <div key={item.symbol} className="flex items-center justify-between gap-3">
                          <span className="riddra-product-body text-sm text-[#1B3A6B]">{item.name}</span>
                          <span className="riddra-product-number text-sm text-[#C0392B]">
                            {formatProductPercent(item.changePercent)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </ProductCard>
              ) : null}
            </div>
                </section>

                <section className="space-y-5 border-t border-[rgba(226,222,217,0.82)] pt-8">
            <ProductSectionTitle
              title="Route-ready market ideas"
              description="These cards pull from stored market data already in Riddra today. Every link goes to a working route, not a placeholder."
            />
            <div className="grid gap-4 xl:grid-cols-4">
              <ProductCard tone="secondary" className="space-y-4">
                <ProductSectionTitle title="Stocks" description="Real stock routes with working truth-state handling." />
                <div className="space-y-3">
                  {topStocks.map((stock) => (
                    <Link
                      key={stock.slug}
                      href={`/stocks/${stock.slug}`}
                      className="block rounded-[10px] border border-[rgba(226,222,217,0.88)] bg-white px-4 py-4 transition hover:border-[#1B3A6B] hover:shadow-[0_12px_24px_rgba(27,58,107,0.05)]"
                    >
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="riddra-product-body text-base font-medium text-[#1B3A6B]">{stock.name}</p>
                          <p className="riddra-product-body mt-1 text-sm text-[rgba(107,114,128,0.88)]">
                            {stock.symbol} • {stock.sector}
                          </p>
                          <p className="riddra-product-body mt-2 text-sm leading-6 text-[rgba(107,114,128,0.88)]">
                            {stock.price} • updated {stock.snapshotMeta?.lastUpdated ?? "from stored history"}
                          </p>
                        </div>
                        <span className="riddra-product-number text-sm" style={{ color: topMoveColor(stock.change) }}>
                          {stock.change}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </ProductCard>

              <ProductCard tone="secondary" className="space-y-4">
                <ProductSectionTitle title="Top losers" description="Keep the weak side of the stored stock universe visible too." />
                <div className="space-y-3">
                  {topLosers.map((stock) => (
                    <Link
                      key={stock.slug}
                      href={`/stocks/${stock.slug}`}
                      className="block rounded-[10px] border border-[rgba(226,222,217,0.88)] bg-white px-4 py-4 transition hover:border-[#1B3A6B] hover:shadow-[0_12px_24px_rgba(27,58,107,0.05)]"
                    >
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="riddra-product-body text-base font-medium text-[#1B3A6B]">{stock.name}</p>
                          <p className="riddra-product-body mt-1 text-sm text-[rgba(107,114,128,0.88)]">
                            {stock.symbol} • {stock.sector}
                          </p>
                          <p className="riddra-product-body mt-2 text-sm leading-6 text-[rgba(107,114,128,0.88)]">
                            {stock.price} • updated {stock.snapshotMeta?.lastUpdated ?? "from stored history"}
                          </p>
                        </div>
                        <span className="riddra-product-number text-sm" style={{ color: topMoveColor(stock.change) }}>
                          {stock.change}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </ProductCard>

              <ProductCard tone="secondary" className="space-y-4">
                <ProductSectionTitle title="Funds" description="Investor-facing fund routes already using durable NAV truth." />
                <div className="space-y-3">
                  {topFunds.map((fund) => (
                    <Link
                      key={fund.slug}
                      href={`/mutual-funds/${fund.slug}`}
                      className="block rounded-[10px] border border-[rgba(226,222,217,0.88)] bg-white px-4 py-4 transition hover:border-[#1B3A6B] hover:shadow-[0_12px_24px_rgba(27,58,107,0.05)]"
                    >
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="riddra-product-body text-base font-medium text-[#1B3A6B]">{fund.name}</p>
                          <p className="riddra-product-body mt-1 text-sm text-[rgba(107,114,128,0.88)]">{fund.category}</p>
                          <p className="riddra-product-body mt-2 text-sm leading-6 text-[rgba(107,114,128,0.88)]">
                            NAV {fund.nav} • updated {fund.snapshotMeta?.lastUpdated ?? "from stored history"}
                          </p>
                        </div>
                        <span className="riddra-product-number text-sm" style={{ color: topMoveColor(fund.returns1Y) }}>
                          {fund.returns1Y}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </ProductCard>

              <ProductCard tone="secondary" className="space-y-4">
                <ProductSectionTitle title="IPO watch" description="Public issue pages remain route-based and explicit about missing data." />
                <div className="space-y-3">
                  {topIpos.map((ipo) => (
                    <Link
                      key={ipo.slug}
                      href={`/ipo/${ipo.slug}`}
                      className="block rounded-[10px] border border-[rgba(226,222,217,0.88)] bg-white px-4 py-4 transition hover:border-[#1B3A6B] hover:shadow-[0_12px_24px_rgba(27,58,107,0.05)]"
                    >
                      <p className="riddra-product-body text-base font-medium text-[#1B3A6B]">{ipo.name}</p>
                      <p className="riddra-product-body mt-2 text-sm text-[rgba(107,114,128,0.88)]">
                        {ipo.priceBand} • {ipo.status}
                      </p>
                      <p className="riddra-product-body mt-2 text-sm leading-6 text-[rgba(107,114,128,0.88)]">
                        Opens {ipo.openDate} • listing {ipo.listingDate}
                      </p>
                    </Link>
                  ))}
                </div>
              </ProductCard>
            </div>
                </section>
              </div>
            }
            right={sidebar}
          />
        </ProductPageContainer>
      </div>
    </div>
  );
}
