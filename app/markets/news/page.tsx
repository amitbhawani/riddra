import type { Metadata } from "next";
import Link from "next/link";

import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import { MarketNewsList } from "@/components/market-news-list";
import { MarketNewsTopStories } from "@/components/market-news-top-stories";
import { ProductCard } from "@/components/product-page-system";
import {
  getMarketNewsArticles,
  getMarketNewsFilterOptions,
  getTopMarketNewsArticles,
} from "@/lib/market-news/queries";

export const metadata: Metadata = {
  title: "Market News",
  description: "Latest Riddra market news with rewritten summaries, source attribution, and related company context.",
};

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

  const [filterOptions, topStories, articles] = await Promise.all([
    getMarketNewsFilterOptions().catch(() => ({
      companies: [],
      sectors: [],
      categories: [],
      impactLabels: [],
    })),
    getTopMarketNewsArticles({
      ...filters,
      limit: 3,
    }).catch(() => []),
    getMarketNewsArticles({
      ...filters,
      limit: Math.min(visibleNewsCount + 1, 60),
    }).catch(() => []),
  ]);
  const visibleArticles = articles.slice(0, visibleNewsCount);
  const hasMoreArticles = articles.length > visibleNewsCount;
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
      leftClassName="riddra-legacy-light-surface space-y-6"
    >
      <ProductCard tone="secondary" className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <p className="riddra-product-body text-[11px] font-medium uppercase tracking-[0.18em] text-[rgba(107,114,128,0.72)]">
              Filter stories
            </p>
            <p className="riddra-product-body text-[14px] leading-7 text-[rgba(107,114,128,0.86)]">
              Filter stories by company, sector, category, or story impact.
            </p>
          </div>
          {activeFilters ? (
            <Link
              href="/markets/news"
              className="inline-flex rounded-full border border-[rgba(221,215,207,0.94)] bg-white px-4 py-2 text-sm font-medium text-[rgba(55,65,81,0.88)] transition hover:border-[rgba(212,133,59,0.3)] hover:text-[#8E5723]"
            >
              Clear filters
            </Link>
          ) : null}
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
                Reset
              </Link>
            ) : null}
          </div>
        </form>
      </ProductCard>

      <MarketNewsTopStories articles={topStories} />

      <MarketNewsList
        articles={visibleArticles}
        title="Latest stories"
        description={
          activeFilters
            ? "Filtered stories matching the current market news selections."
            : "Each story keeps the rewritten title, concise summary, time, and related entities in one card."
        }
        emptyTitle={activeFilters ? "No stories match these filters yet" : "Market News is being prepared"}
        emptyDescription={
          activeFilters
            ? "Try clearing one or more filters to return to the broader market news feed."
            : "Fresh stories will appear here once the latest market news articles are ready for the public surface."
        }
      />
      {loadMoreHref ? (
        <div className="flex justify-center pt-1">
          <Link
            href={loadMoreHref}
            className="riddra-button-link-primary inline-flex items-center justify-center rounded-full border border-[rgba(27,58,107,0.16)] bg-[#1B3A6B] px-5 py-2.5 text-sm font-medium transition hover:bg-[#244b85]"
          >
            Load 5 more news
          </Link>
        </div>
      ) : null}
    </GlobalSidebarPageShell>
  );
}
