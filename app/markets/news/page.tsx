import type { Metadata } from "next";
import Link from "next/link";

import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import { MarketNewsList } from "@/components/market-news-list";
import { MarketNewsTopStories } from "@/components/market-news-top-stories";
import { ProductCard } from "@/components/product-page-system";
import { getRiddraDailyMarketBrief } from "@/lib/market-news/brief";
import {
  getMarketNewsArticles,
  getMarketNewsFilterOptions,
} from "@/lib/market-news/queries";
import { getPublicSiteUrl } from "@/lib/public-site-url";

export async function generateMetadata(): Promise<Metadata> {
  const canonicalUrl = `${getPublicSiteUrl()}/markets/news`;
  const title = "Market News | Riddra";
  const description =
    "Latest Riddra market news with rewritten summaries, source attribution, and related company context.";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
    },
  };
}

type PageProps = {
  searchParams?: Promise<{
    company?: string;
    sector?: string;
    category?: string;
    impact_label?: string;
    news_count?: string;
  }>;
};

const INITIAL_NEWS_COUNT = 7;
const LOAD_MORE_NEWS_COUNT = 5;

function normalizeQueryValue(value: string | undefined) {
  return String(value ?? "").trim();
}

function parseVisibleNewsCount(value: string | undefined) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return INITIAL_NEWS_COUNT;
  }

  return Math.min(Math.max(Math.trunc(parsed), INITIAL_NEWS_COUNT), 60);
}

function buildMarketNewsPageHref(input: {
  company: string;
  sector: string;
  category: string;
  impactLabel: string;
  newsCount?: number;
}) {
  const searchParams = new URLSearchParams();

  if (input.company) {
    searchParams.set("company", input.company);
  }

  if (input.sector) {
    searchParams.set("sector", input.sector);
  }

  if (input.category) {
    searchParams.set("category", input.category);
  }

  if (input.impactLabel) {
    searchParams.set("impact_label", input.impactLabel);
  }

  if (input.newsCount && input.newsCount > INITIAL_NEWS_COUNT) {
    searchParams.set("news_count", String(input.newsCount));
  }

  const query = searchParams.toString();
  return query ? `/markets/news?${query}` : "/markets/news";
}

function hasActiveFilters(filters: {
  company: string;
  sector: string;
  category: string;
  impactLabel: string;
}) {
  return Boolean(filters.company || filters.sector || filters.category || filters.impactLabel);
}

function getFilterOptionLabel(
  options: readonly { value: string; label: string }[],
  value: string,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

export default async function MarketNewsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const filters = {
    company: normalizeQueryValue(resolvedSearchParams.company),
    sector: normalizeQueryValue(resolvedSearchParams.sector),
    category: normalizeQueryValue(resolvedSearchParams.category),
    impactLabel: normalizeQueryValue(resolvedSearchParams.impact_label),
  };
  const visibleNewsCount = parseVisibleNewsCount(resolvedSearchParams.news_count);
  const activeFilters = hasActiveFilters(filters);

  const [filterOptions, dailyBrief, articles] = await Promise.all([
    getMarketNewsFilterOptions().catch(() => ({
      companies: [],
      sectors: [],
      categories: [],
      impactLabels: [],
    })),
    getRiddraDailyMarketBrief().catch(() => null),
    getMarketNewsArticles({
      ...filters,
      limit: Math.min(visibleNewsCount + 16, 60),
    }).catch(() => []),
  ]);

  const topStories = articles.slice(0, 3);
  const latestPool = articles.slice(topStories.length);
  const visibleArticles = latestPool.slice(0, visibleNewsCount);
  const hasMoreArticles = latestPool.length > visibleNewsCount;
  const shouldShowDailyBrief = Boolean(dailyBrief && dailyBrief.articles.length >= 3);
  const shouldShowLatestSection = visibleArticles.length > 0 || !topStories.length;
  const loadMoreHref = hasMoreArticles
    ? buildMarketNewsPageHref({
        ...filters,
        newsCount: visibleNewsCount + LOAD_MORE_NEWS_COUNT,
      })
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

          <form action="/markets/news" method="get" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-1.5">
              <span className="text-[12px] font-medium uppercase tracking-[0.12em] text-[rgba(107,114,128,0.78)]">
                Company
              </span>
              <select
                name="company"
                defaultValue={filters.company}
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
                defaultValue={filters.sector}
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
                defaultValue={filters.category}
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
              {activeFilters ? (
                <Link
                  href="/markets/news"
                  className="inline-flex rounded-full border border-[rgba(221,215,207,0.94)] bg-white px-4 py-2 text-sm font-medium text-[rgba(55,65,81,0.88)] transition hover:border-[rgba(212,133,59,0.3)] hover:text-[#8E5723]"
                >
                  Clear all
                </Link>
              ) : null}
            </div>
          </form>

          {activeFilters ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-[rgba(226,222,217,0.82)] pt-3">
              {filters.company ? (
                <span className="inline-flex rounded-full border border-[rgba(27,58,107,0.14)] bg-[rgba(27,58,107,0.04)] px-3 py-1.5 text-[12px] font-medium text-[#1B3A6B]">
                  Company: {getFilterOptionLabel(filterOptions.companies, filters.company)}
                </span>
              ) : null}
              {filters.sector ? (
                <span className="inline-flex rounded-full border border-[rgba(107,114,128,0.16)] bg-[rgba(107,114,128,0.05)] px-3 py-1.5 text-[12px] font-medium text-[rgba(55,65,81,0.92)]">
                  Sector: {getFilterOptionLabel(filterOptions.sectors, filters.sector)}
                </span>
              ) : null}
              {filters.category ? (
                <span className="inline-flex rounded-full border border-[rgba(212,133,59,0.16)] bg-[rgba(212,133,59,0.08)] px-3 py-1.5 text-[12px] font-medium text-[#8E5723]">
                  Category: {getFilterOptionLabel(filterOptions.categories, filters.category)}
                </span>
              ) : null}
              <span className="ml-auto text-[13px] text-[rgba(107,114,128,0.86)]">
                Showing {articles.length} {articles.length === 1 ? "story" : "stories"}
              </span>
            </div>
          ) : null}
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
              emptyTitle={activeFilters ? "No stories match these filters yet" : "Market News is being prepared"}
              emptyDescription={
                activeFilters
                  ? "Try clearing one or more filters to return to the broader market news feed."
                  : "Fresh stories will appear here once the latest market news articles are ready for the public surface."
              }
            />
          </section>
        ) : null}

        {loadMoreHref ? (
          <div className="flex justify-center pt-1">
            <Link
              href={loadMoreHref}
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
