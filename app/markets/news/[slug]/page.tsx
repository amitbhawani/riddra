import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import { JsonLd } from "@/components/json-ld";
import { MarketNewsEntityChips } from "@/components/market-news-entity-chips";
import { MarketNewsImage } from "@/components/market-news-image";
import { MarketNewsList } from "@/components/market-news-list";
import { ProductCard, ProductSectionTitle } from "@/components/product-page-system";
import { getStocks } from "@/lib/content";
import {
  formatMarketNewsDateTime,
  formatMarketNewsFullDate,
  formatMarketNewsRelativeTime,
} from "@/lib/market-news/formatting";
import { getMarketNewsArticleBySlug, getRelatedMarketNewsArticles } from "@/lib/market-news/queries";
import type { StockSnapshot } from "@/lib/mock-data";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { buildBreadcrumbSchema } from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ stories?: string }>;
};

function getArticlePublishDateValue(article: {
  published_at: string | null;
  source_published_at: string | null;
  created_at: string;
}) {
  return article.published_at || article.source_published_at || article.created_at;
}

function buildMarketNewsDetailUrl(slug: string) {
  return `${getPublicSiteUrl()}/markets/news/${slug}`;
}

function buildNewsArticleSchema(article: Awaited<ReturnType<typeof getMarketNewsArticleBySlug>>) {
  if (!article) {
    return null;
  }

  const canonicalUrl = buildMarketNewsDetailUrl(article.slug);
  const publishedAt = getArticlePublishDateValue(article);
  const modifiedAt = article.updated_at || publishedAt;

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.rewritten_title || article.original_title,
    description:
      article.seo_description ||
      article.short_summary ||
      article.summary ||
      "Latest market news article on Riddra.",
    datePublished: publishedAt,
    dateModified: modifiedAt,
    author: {
      "@type": "Person",
      name: article.author_name || "Author Amit",
    },
    publisher: {
      "@type": "Organization",
      name: "Riddra",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    url: canonicalUrl,
    image: article.display_image_url ? [article.display_image_url] : undefined,
  };
}

function normalizeLooseSlug(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isPlaceholderSector(value: string | null | undefined) {
  const normalized = normalizeLooseSlug(value);
  return !normalized || normalized === "sector-pending" || normalized === "sector-unavailable";
}

function isPositiveChange(value: string | null | undefined) {
  return String(value ?? "").trim().startsWith("+");
}

function isNegativeChange(value: string | null | undefined) {
  return String(value ?? "").trim().startsWith("-");
}

type FocusStock = Pick<StockSnapshot, "slug" | "name" | "symbol" | "price" | "change" | "sector">;

const STOCK_MATCH_STOP_WORDS = new Set([
  "limited",
  "ltd",
  "industries",
  "industry",
  "company",
  "companies",
  "corporation",
  "corp",
  "india",
  "indian",
  "bank",
  "fund",
  "holdings",
  "financial",
  "services",
  "market",
  "markets",
  "story",
  "stories",
  "crore",
  "reports",
  "reported",
  "impact",
  "capacity",
  "constraints",
  "expansion",
  "plans",
  "update",
]);

const ARTICLE_KEYWORD_EXPANSIONS: Record<string, string[]> = {
  renewable: ["renewable", "energy", "power", "utilities", "solar"],
  energy: ["energy", "power", "utilities", "solar"],
  solar: ["solar", "energy", "power", "renewable"],
  transmission: ["transmission", "power", "grid", "utilities", "energy"],
  grid: ["grid", "power", "utilities", "energy"],
  power: ["power", "utilities", "energy", "grid"],
  cement: ["cement", "infra", "infrastructure", "construction"],
  bank: ["bank", "financial", "finance"],
  finance: ["finance", "financial", "bank"],
  auto: ["auto", "mobility", "vehicle"],
  pharma: ["pharma", "health", "healthcare"],
  telecom: ["telecom", "communications", "digital"],
};

const ARTICLE_TOPIC_STOCK_FALLBACKS: Record<string, string[]> = {
  adani: ["adani-enterprises", "adani-ports", "adani-power"],
  renewable: ["power-grid", "ntpc", "reliance-industries", "adani-power"],
  energy: ["power-grid", "ntpc", "reliance-industries", "adani-power"],
  solar: ["power-grid", "ntpc", "reliance-industries", "adani-power"],
  transmission: ["power-grid", "ntpc", "reliance-industries"],
  grid: ["power-grid", "ntpc", "reliance-industries"],
  power: ["power-grid", "ntpc", "reliance-industries", "adani-power"],
};

async function getStocksInFocus(
  article: Awaited<ReturnType<typeof getMarketNewsArticleBySlug>>,
  limit = 3,
): Promise<FocusStock[]> {
  if (!article) {
    return [];
  }

  const allStocks = await getStocks().catch(() => []);
  const results: FocusStock[] = [];
  const seenSlugs = new Set<string>();

  const pushStock = (stock: StockSnapshot | null | undefined) => {
    if (!stock || seenSlugs.has(stock.slug) || results.length >= limit) {
      return;
    }

    seenSlugs.add(stock.slug);
    results.push({
      slug: stock.slug,
      name: stock.name,
      symbol: stock.symbol,
      price: stock.price,
      change: stock.change,
      sector: stock.sector,
    });
  };

  const directStockSlugs = article.entities
    .filter((entity) => entity.entity_type === "stock" && entity.entity_slug)
    .map((entity) => entity.entity_slug.trim().toLowerCase());

  for (const slug of directStockSlugs) {
    pushStock(allStocks.find((stock) => stock.slug === slug));
  }

  if (results.length < limit) {
    const haystack = [
      article.rewritten_title,
      article.original_title,
      article.short_summary,
      article.summary,
      ...article.entities.map((entity) => entity.display_name),
    ]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join(" ")
      .toLowerCase();
    const articleKeywords = Array.from(
      new Set(
        haystack
          .split(/[^a-z0-9]+/g)
          .map((token) => token.trim())
          .filter(
            (token) =>
              token.length >= 5 &&
              !STOCK_MATCH_STOP_WORDS.has(token),
          )
          .flatMap((token) => ARTICLE_KEYWORD_EXPANSIONS[token] ?? [token]),
      ),
    );

    for (const keyword of articleKeywords) {
      for (const slug of ARTICLE_TOPIC_STOCK_FALLBACKS[keyword] ?? []) {
        pushStock(allStocks.find((stock) => stock.slug === slug));
      }
    }

    for (const stock of allStocks) {
      const normalizedName = stock.name.trim().toLowerCase();
      const normalizedSymbol = stock.symbol.trim().toLowerCase();
      const meaningfulNameTokens = normalizedName
        .split(/[^a-z0-9]+/g)
        .map((token) => token.trim())
        .filter(
          (token) =>
            token.length >= 5 &&
            !STOCK_MATCH_STOP_WORDS.has(token),
        );

      if (
        normalizedName &&
        (haystack.includes(normalizedName) ||
          (normalizedSymbol.length >= 3 && haystack.includes(normalizedSymbol)) ||
          meaningfulNameTokens.some((token) => haystack.includes(token)))
      ) {
        pushStock(stock);
      }
    }

    if (results.length < limit) {
      for (const stock of allStocks) {
        const stockSearchText = `${stock.name} ${stock.symbol} ${stock.sector}`.toLowerCase();

        if (articleKeywords.some((keyword) => stockSearchText.includes(keyword))) {
          pushStock(stock);
        }
      }
    }
  }

  if (results.length < limit) {
    const relatedSectorSlugs = new Set(
      article.entities
        .flatMap((entity) => {
          if (entity.entity_type === "sector") {
            return isPlaceholderSector(entity.entity_slug) ? [] : [entity.entity_slug];
          }

          if (entity.entity_type === "stock" && entity.sector_slug) {
            return isPlaceholderSector(entity.sector_slug) ? [] : [entity.sector_slug];
          }

          return [];
        })
        .map((value) => normalizeLooseSlug(value))
        .filter(Boolean),
    );

    if (relatedSectorSlugs.size > 0) {
      for (const stock of allStocks) {
        if (relatedSectorSlugs.has(normalizeLooseSlug(stock.sector))) {
          pushStock(stock);
        }
      }
    }
  }

  return results.slice(0, limit);
}

function parseStoriesCount(value: string | undefined) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 3;
  }

  return Math.min(Math.max(Math.trunc(parsed), 3), 18);
}

export async function generateMetadata({
  params,
}: Pick<PageProps, "params">): Promise<Metadata> {
  const { slug } = await params;
  const article = await getMarketNewsArticleBySlug(slug).catch(() => null);

  if (!article) {
    return {
      title: "Market News not found",
      description: "The requested market news article could not be found.",
    };
  }

  const title = article.seo_title || article.rewritten_title || article.original_title;
  const description =
    article.seo_description ||
    article.short_summary ||
    article.summary ||
    "Latest market news article on Riddra.";
  const canonicalUrl = buildMarketNewsDetailUrl(article.slug);
  const imageUrl = article.display_image_url || `${getPublicSiteUrl()}/news-fallbacks/riddra-market-news.svg`;

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
      type: "article",
      images: imageUrl ? [{ url: imageUrl, alt: article.image_display_alt_text }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function MarketNewsDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const article = await getMarketNewsArticleBySlug(slug).catch(() => null);

  if (!article) {
    notFound();
  }

  const relatedArticles = await getRelatedMarketNewsArticles(article, 12).catch(() => []);
  const visibleStoriesCount = parseStoriesCount(resolvedSearchParams.stories);
  const visibleRelatedArticles = relatedArticles.slice(0, visibleStoriesCount);
  const canLoadMoreStories = visibleStoriesCount < relatedArticles.length;
  const canShowLessStories = visibleStoriesCount > 3;
  const nextStoriesCount = Math.min(visibleStoriesCount + 3, relatedArticles.length);
  const taggedStockEntities = article.entities.filter((entity) => entity.entity_type === "stock");
  const visibleDetailEntities = taggedStockEntities.length ? taggedStockEntities : article.entities;
  const focusStocks = await getStocksInFocus(article, 3);
  const publishDateValue = getArticlePublishDateValue(article);
  const publishedLabel = formatMarketNewsDateTime(publishDateValue);
  const publishedRelativeLabel = formatMarketNewsRelativeTime(publishDateValue);
  const publishedFullDate = formatMarketNewsFullDate(publishDateValue);
  const modifiedLabel = formatMarketNewsDateTime(article.updated_at);
  const fallbackSrc =
    article.image?.fallback_image_url || article.fallback_image_url || article.display_image_url;
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Markets", href: "/markets" },
    { name: "Market News", href: "/markets/news" },
    { name: article.rewritten_title || article.original_title, href: `/markets/news/${article.slug}` },
  ];
  const byline = publishedFullDate
    ? `Published ${publishedRelativeLabel ?? "recently"} on ${publishedFullDate} By ${article.author_name || "Author Amit"}`
    : null;

  return (
    <>
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <JsonLd data={buildNewsArticleSchema(article)} />
      <GlobalSidebarPageShell
        category="markets"
        className="space-y-4"
        leftClassName="riddra-legacy-light-surface space-y-6"
      >
        <Breadcrumbs items={breadcrumbs} />

        <ProductCard tone="primary" className="overflow-hidden p-4 sm:p-5">
          <article className="space-y-5">
            {publishedLabel ? (
              <p className="riddra-product-body text-[12px] font-medium uppercase tracking-[0.14em] text-[rgba(107,114,128,0.82)]">
                {publishedLabel}
              </p>
            ) : null}

            <div className="space-y-3">
              <h1 className="riddra-product-body text-[30px] font-semibold tracking-tight text-[#1B3A6B] sm:text-[38px]">
                {article.rewritten_title || article.original_title}
              </h1>
              {byline ? (
                <div className="space-y-1.5">
                  <p className="riddra-product-body text-[14px] leading-7 text-[rgba(75,85,99,0.86)]">
                    {byline}
                  </p>
                  {modifiedLabel && modifiedLabel !== publishedLabel ? (
                    <p className="riddra-product-body text-[13px] leading-6 text-[rgba(107,114,128,0.8)]">
                      Updated {modifiedLabel}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="space-y-3">
                <div className="float-right mb-3 ml-4 w-[118px] overflow-hidden rounded-[16px] border border-[rgba(221,215,207,0.92)] bg-[rgba(248,246,243,0.92)] shadow-[0_12px_28px_rgba(15,23,42,0.07)] sm:w-[132px]">
                  <MarketNewsImage
                    primarySrc={article.display_image_url}
                    fallbackSrc={fallbackSrc}
                    alt={article.image_display_alt_text}
                    className="h-[118px] w-full object-cover sm:h-[132px]"
                  />
                </div>
                <p className="riddra-product-body text-[15px] leading-8 text-[rgba(75,85,99,0.86)]">
                  {article.summary || article.short_summary || "Market News is being prepared."}
                </p>
                {article.impact_note?.trim() ? (
                  <p className="riddra-product-body inline-flex rounded-[14px] border border-[rgba(212,133,59,0.16)] bg-[rgba(212,133,59,0.08)] px-4 py-2 text-[13px] font-medium leading-6 text-[#8E5723]">
                    {article.impact_note}
                  </p>
                ) : null}
                <div className="clear-both" />
              </div>
            </div>

            <div className="space-y-3">
              <p className="riddra-product-body text-[13px] leading-6 text-[rgba(107,114,128,0.84)]">
                Source attribution:{" "}
                <span className="font-medium text-[#1B3A6B]">{article.source_name}</span>
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {visibleDetailEntities.length ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="riddra-product-body text-[12px] font-medium text-[rgba(107,114,128,0.82)]">
                      {taggedStockEntities.length ? "Tagged stocks" : "Related entities"}
                    </span>
                    <MarketNewsEntityChips entities={visibleDetailEntities} limit={4} />
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-3">
                  <a
                    href={article.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="riddra-button-link-primary inline-flex rounded-full border border-[rgba(27,58,107,0.16)] bg-[#1B3A6B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#244b85]"
                  >
                    Read full story
                  </a>
                </div>
              </div>
            </div>
          </article>
        </ProductCard>

        <ProductCard tone="secondary" className="space-y-4 p-4 sm:p-5">
          <ProductSectionTitle
            eyebrow="Market relevance"
            title="Stocks in Focus"
            description="These linked stock routes are the closest public market pages tied to the story, the matched companies, or the sector context around this update."
          />
          {focusStocks.length ? (
            <div className="grid gap-3 md:grid-cols-3">
              {focusStocks.map((stock) => (
                <Link
                  key={stock.slug}
                  href={`/stocks/${stock.slug}`}
                  className="rounded-[16px] border border-[rgba(221,215,207,0.92)] bg-white px-4 py-4 transition hover:border-[rgba(212,133,59,0.28)] hover:shadow-[0_16px_34px_rgba(15,23,42,0.06)]"
                >
                  <p className="riddra-product-body text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.74)]">
                    {isPlaceholderSector(stock.sector) ? "Stock in focus" : stock.sector}
                  </p>
                  <p className="riddra-product-body mt-2 text-[20px] font-semibold text-[#1B3A6B]">{stock.name}</p>
                  <p className="riddra-product-body mt-1 text-sm text-[rgba(107,114,128,0.82)]">{stock.symbol}</p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="riddra-product-body text-[18px] font-semibold text-[#111827]">{stock.price}</span>
                    <span
                      className={`riddra-product-body text-sm font-semibold ${
                        isPositiveChange(stock.change)
                          ? "text-[#15803d]"
                          : isNegativeChange(stock.change)
                            ? "text-[#b42318]"
                            : "text-[rgba(55,65,81,0.86)]"
                      }`}
                    >
                      {stock.change}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-[16px] border border-dashed border-[rgba(221,215,207,0.94)] bg-white px-4 py-5 text-sm leading-7 text-[rgba(75,85,99,0.84)]">
              Related stock routes will appear here as more company-to-story links are mapped into the market news system.
            </div>
          )}
        </ProductCard>

        <MarketNewsList
          articles={visibleRelatedArticles}
          title="Similar News"
          compact
          emptyTitle="More stories are being prepared"
          emptyDescription="Additional related market news articles will appear here as the public news archive fills out."
        />
        {canLoadMoreStories || canShowLessStories ? (
          <div className="flex flex-wrap items-center justify-center gap-4 pt-1">
            {canLoadMoreStories ? (
              <Link
                href={`/markets/news/${article.slug}?stories=${nextStoriesCount}`}
                className="riddra-button-link-primary inline-flex items-center justify-center rounded-full border border-[rgba(27,58,107,0.16)] bg-[#1B3A6B] px-5 py-2.5 text-sm font-medium transition hover:bg-[#244b85]"
              >
                Load more stories
              </Link>
            ) : null}
            {canShowLessStories ? (
              <Link
                href={`/markets/news/${article.slug}`}
                className="inline-flex rounded-full border border-[rgba(221,215,207,0.94)] bg-white px-5 py-2.5 text-sm font-medium text-[rgba(55,65,81,0.88)] transition hover:border-[rgba(212,133,59,0.3)] hover:text-[#8E5723]"
              >
                Show less
              </Link>
            ) : null}
          </div>
        ) : null}
      </GlobalSidebarPageShell>
    </>
  );
}
