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
  }>;
};

function normalizeQueryValue(value: string | undefined) {
  return String(value ?? "").trim();
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
      limit: 24,
    }).catch(() => []),
  ]);

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
            <h2 className="riddra-product-body text-[24px] font-semibold tracking-tight text-[#1B3A6B]">
              Market News filters
            </h2>
            <p className="riddra-product-body text-[14px] leading-7 text-[rgba(107,114,128,0.86)]">
              Filter by company, sector, category, or story impact using URL-backed query params.
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

          <label className="grid gap-1.5">
            <span className="text-[12px] font-medium uppercase tracking-[0.12em] text-[rgba(107,114,128,0.78)]">
              Impact
            </span>
            <select
              name="impact_label"
              defaultValue={filters.impactLabel}
              className="rounded-[12px] border border-[rgba(221,215,207,0.94)] bg-white px-3 py-2.5 text-sm text-[#1B3A6B] outline-none transition focus:border-[rgba(27,58,107,0.28)]"
            >
              <option value="">All impact labels</option>
              {filterOptions.impactLabels.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="md:col-span-2 xl:col-span-4 flex flex-wrap gap-3 pt-1">
            <button
              type="submit"
              className="inline-flex rounded-full border border-[rgba(27,58,107,0.16)] bg-[#1B3A6B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#244b85]"
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
        articles={articles}
        title="Latest stories"
        description={
          activeFilters
            ? "Filtered stories matching the current market news selections."
            : "Each story keeps the rewritten title, concise summary, external source link, and related entities in one card."
        }
        emptyTitle={activeFilters ? "No stories match these filters yet" : "Market News is being prepared"}
        emptyDescription={
          activeFilters
            ? "Try clearing one or more filters to return to the broader market news feed."
            : "Fresh stories will appear here once the latest market news articles are ready for the public surface."
        }
      />
    </GlobalSidebarPageShell>
  );
}
