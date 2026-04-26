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
  topFunds: FundSnapshot[];
  topIpos: IpoSnapshot[];
  topMarketNewsStories: MarketNewsArticleWithRelations[];
  sidebar?: ReactNode;
}) {
  const primaryIndex = indexSnapshots[0] ?? null;
  const shouldShowTodayOnRiddra =
    Boolean(dailyBrief && dailyBrief.articles.length >= 3) && topMarketNewsStories.length >= 3;

  return (
    <div className="pb-14 pt-10 sm:pb-20 sm:pt-14">
      <div className="riddra-product-page py-8 sm:py-10">
        <ProductPageContainer>
          <ProductPageTwoColumnLayout
            left={
              <div className="space-y-6">
                <section className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
            <ProductCard tone="primary" className="space-y-6 p-0">
              <div className="space-y-5 p-5 sm:p-6">
                <p className="riddra-product-body text-[11px] uppercase tracking-[0.24em] text-[rgba(107,114,128,0.84)]">
                  Market Intelligence
                </p>
                <h1 className="riddra-product-display max-w-4xl text-4xl font-semibold leading-tight text-[#1B3A6B] sm:text-6xl">
                  One precise market front door for indices, commodities, currency, and route-ready asset research.
                </h1>
                <p className="riddra-product-body max-w-3xl text-base leading-8 text-[rgba(107,114,128,0.94)] sm:text-lg">
                  This homepage is now a market-intelligence dashboard, not a generic landing page. It opens with verifiable market snapshots, then hands users into real stock, fund, and IPO routes only where the data is actually ready.
                </p>
              </div>
              <div className="grid gap-3 border-t border-[#E2DED9] bg-[linear-gradient(180deg,rgba(27,58,107,0.02)_0%,rgba(255,255,255,0)_100%)] p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-[10px] border border-[rgba(226,222,217,0.88)] bg-white px-4 py-4 shadow-[0_8px_18px_rgba(27,58,107,0.025)]">
                    <p className="riddra-product-body text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.82)]">
                      {stat.label}
                    </p>
                    <p className="riddra-product-number mt-2 text-2xl font-medium text-[#1B3A6B]">{stat.value}</p>
                    <p className="riddra-product-body mt-2 text-sm leading-6 text-[rgba(107,114,128,0.88)]">
                      {stat.note}
                    </p>
                  </div>
                ))}
              </div>
            </ProductCard>

            <ProductCard tone="secondary" className="space-y-5">
              <ProductSectionTitle
                title="Fastest routes to test"
                description="These are real product routes already backed by durable or explicit truth-state behavior."
              />
              <div className="grid gap-3">
                <Link
                  href="/stocks/tata-motors"
                  className="riddra-product-body inline-flex min-h-[46px] items-center justify-center rounded-[6px] bg-[#1B3A6B] px-4 text-sm font-medium text-white transition hover:bg-[#D4853B]"
                >
                  Open Tata Motors
                </Link>
                <Link
                  href="/nifty50"
                  className="riddra-product-body inline-flex min-h-[46px] items-center justify-center rounded-[6px] border border-[#1B3A6B] bg-white px-4 text-sm font-medium text-[#1B3A6B] transition hover:border-[#D4853B] hover:text-[#D4853B]"
                >
                  Open Nifty 50
                </Link>
                <Link
                  href="/search?query=tata%20motors"
                  className="riddra-product-body inline-flex min-h-[46px] items-center justify-center rounded-[6px] border border-[#E2DED9] bg-[#FAFAFA] px-4 text-sm font-medium text-[#1B3A6B] transition hover:border-[#1B3A6B]"
                >
                  Search live routes
                </Link>
              </div>
              <div className="grid gap-3 border-t border-[#E2DED9] pt-4 sm:grid-cols-2">
                {discovery.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-[10px] border border-[rgba(226,222,217,0.88)] bg-white px-4 py-4 transition hover:border-[#1B3A6B] hover:shadow-[0_12px_24px_rgba(27,58,107,0.05)]"
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
              description="These cards route into working product pages only. No generated pages and no fake discovery entries."
            />
            <div className="grid gap-4 xl:grid-cols-3">
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
                          <p className="riddra-product-body mt-1 text-sm text-[rgba(107,114,128,0.88)]">{stock.sector}</p>
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
