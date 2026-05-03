import type { Metadata } from "next";
import Link from "next/link";

import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import { MarketNewsList } from "@/components/market-news-list";
import { MarketNewsTopStories } from "@/components/market-news-top-stories";
import { ProductCard } from "@/components/product-page-system";
import { buildRiddraDailyMarketBriefFromArticles } from "@/lib/market-news/brief";
import { getInternalLinkProps } from "@/lib/link-utils";
import {
  buildMarketNewsFilterOptionsFromArticles,
  getMarketNewsArticles,
} from "@/lib/market-news/queries";
import { buildSeoMetadata } from "@/lib/seo-config";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({
    policyKey: "market_news_listing",
    title: "Market News | Riddra",
    description:
      "Latest Riddra market news with rewritten summaries, source attribution, and related company context.",
    publicHref: "/markets/news",
  });
}

const INITIAL_NEWS_COUNT = 7;
const LOAD_MORE_NEWS_COUNT = 5;
const UNFILTERED_MARKET_NEWS_POOL_LIMIT = 120;

export default async function MarketNewsPage() {
  const articles = await getMarketNewsArticles({
    limit: UNFILTERED_MARKET_NEWS_POOL_LIMIT,
  }).catch(() => []);
  const filterOptions = buildMarketNewsFilterOptionsFromArticles(articles);
  const dailyBrief = buildRiddraDailyMarketBriefFromArticles(articles);
  const topStories = articles.slice(0, 3);
  const latestPool = articles.slice(topStories.length);
  const visibleArticles = latestPool.slice(0, INITIAL_NEWS_COUNT);
  const hasMoreArticles = latestPool.length > INITIAL_NEWS_COUNT;
  const shouldShowDailyBrief = Boolean(dailyBrief && dailyBrief.articles.length >= 3);
  const shouldShowLatestSection = visibleArticles.length > 0 || !topStories.length;
  const loadMoreHref = hasMoreArticles
    ? `/markets/news/live?news_count=${INITIAL_NEWS_COUNT + LOAD_MORE_NEWS_COUNT}`
    : null;

  return (
    <GlobalSidebarPageShell
      category="markets"
      className="space-y-4"
      leftClassName="riddra-legacy-light-surface"
    >
      <div className="w-full space-y-6">
        <ProductCard tone="secondary" className="space-y-5 p-5 sm:p-6">
          <div className="space-y-2">
            <p className="riddra-product-body text-[11px] font-medium uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">
              Market news
            </p>
            <h1 className="riddra-product-body text-[34px] font-semibold tracking-tight text-[#1B3A6B] sm:text-[40px]">
              Market news
            </h1>
            <p className="riddra-product-body text-[14px] leading-7 text-[rgba(107,114,128,0.86)]">
              Filter stories by company, sector, or category.
            </p>
          </div>

          <form
            action="/markets/news/live"
            method="get"
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
          >
            <label className="grid gap-1.5">
              <span className="text-[12px] font-medium uppercase tracking-[0.12em] text-[rgba(107,114,128,0.78)]">
                Company
              </span>
              <select
                name="company"
                defaultValue=""
                className="rounded-[12px] border border-[rgba(221,215,207,0.94)] bg-white px-3 py-2.5 text-sm text-[#1B3A6B] outline-none transition focus:border-[rgba(27,58,107,0.28)]"
              >
                <option value="">All companies</option>
                {filterOptions.companies.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5">
              <span className="text-[12px] font-medium uppercase tracking-[0.12em] text-[rgba(107,114,128,0.78)]">
                Sector
              </span>
              <select
                name="sector"
                defaultValue=""
                className="rounded-[12px] border border-[rgba(221,215,207,0.94)] bg-white px-3 py-2.5 text-sm text-[#1B3A6B] outline-none transition focus:border-[rgba(27,58,107,0.28)]"
              >
                <option value="">All sectors</option>
                {filterOptions.sectors.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5">
              <span className="text-[12px] font-medium uppercase tracking-[0.12em] text-[rgba(107,114,128,0.78)]">
                Category
              </span>
              <select
                name="category"
                defaultValue=""
                className="rounded-[12px] border border-[rgba(221,215,207,0.94)] bg-white px-3 py-2.5 text-sm text-[#1B3A6B] outline-none transition focus:border-[rgba(27,58,107,0.28)]"
              >
                <option value="">All categories</option>
                {filterOptions.categories.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap items-end gap-3 pt-6 xl:pt-0">
              <button
                type="submit"
                className="riddra-button-link-primary inline-flex items-center justify-center rounded-full border border-[rgba(27,58,107,0.16)] bg-[#1B3A6B] px-4 py-2 text-sm font-medium transition hover:bg-[#244b85]"
              >
                Apply filters
              </button>
            </div>
          </form>
        </ProductCard>

        {shouldShowDailyBrief && dailyBrief ? (
          <ProductCard
            tone="secondary"
            className="space-y-4 border-l-[3px] border-l-[#D4853B] px-5 py-5 sm:px-6"
          >
            <div className="space-y-1.5">
              <p className="riddra-product-body text-[11px] font-medium uppercase tracking-[0.16em] text-[#8E5723]">
                Today&apos;s market brief
              </p>
              <h2 className="riddra-product-body text-[28px] font-semibold tracking-tight text-[#1B3A6B] sm:text-[32px]">
                {dailyBrief.headline}
              </h2>
            </div>

            <ul className="space-y-2">
              {dailyBrief.highlights.slice(0, 5).map((highlight, index) => (
                <li
                  key={`${dailyBrief.articles[index]?.id ?? index}-${highlight}`}
                  className="rounded-[12px] border border-[rgba(226,222,217,0.82)] bg-white/88 px-4 py-3 text-[14px] leading-7 text-[rgba(55,65,81,0.92)]"
                >
                  {highlight}
                </li>
              ))}
            </ul>

            <div className="flex">
              <Link
                href="/markets/brief"
                {...getInternalLinkProps()}
                className="inline-flex rounded-full border border-[rgba(27,58,107,0.14)] bg-[rgba(27,58,107,0.04)] px-4 py-2 text-sm font-medium text-[#1B3A6B] transition hover:bg-[rgba(27,58,107,0.08)]"
              >
                Read full brief →
              </Link>
            </div>
          </ProductCard>
        ) : null}

        {topStories.length ? <MarketNewsTopStories articles={topStories} /> : null}

        {shouldShowLatestSection ? (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[rgba(221,215,207,0.92)]" />
              <p className="riddra-product-body text-[11px] font-medium uppercase tracking-[0.06em] text-[rgba(107,114,128,0.78)]">
                Latest
              </p>
              <div className="h-px flex-1 bg-[rgba(221,215,207,0.92)]" />
            </div>

            <MarketNewsList
              articles={visibleArticles}
              emptyTitle="Market News is being prepared"
              emptyDescription="Fresh stories will appear here once the latest market news articles are ready for the public surface."
            />
          </section>
        ) : null}

        {loadMoreHref ? (
          <div className="flex justify-center pt-1">
            <Link
              href={loadMoreHref}
              {...getInternalLinkProps()}
              className="inline-flex items-center justify-center rounded-full border border-[rgba(221,215,207,0.94)] bg-white px-5 py-2.5 text-sm font-medium text-[#1B3A6B] transition hover:border-[rgba(27,58,107,0.22)] hover:bg-[rgba(27,58,107,0.04)]"
            >
              Load more stories
            </Link>
          </div>
        ) : null}
      </div>
    </GlobalSidebarPageShell>
  );
}
