import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import { JsonLd } from "@/components/json-ld";
import { MarketNewsEntityChips } from "@/components/market-news-entity-chips";
import { MarketNewsImage } from "@/components/market-news-image";
import { MarketNewsList } from "@/components/market-news-list";
import { ProductCard, ProductSectionTitle } from "@/components/product-page-system";
import { getStocks } from "@/lib/content";
import {
  formatMarketNewsAuthorName,
  formatMarketNewsCategoryLabel,
  formatMarketNewsDateTime,
  formatMarketNewsFullDate,
  formatMarketNewsSourceLabel,
  sanitizeMarketNewsEditorialCopy,
} from "@/lib/market-news/formatting";
import { getMarketNewsDisplayFallbackImage } from "@/lib/market-news/images";
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

  const authorDisplayName = formatMarketNewsAuthorName(article.author_name);
  const authorSchema =
    authorDisplayName === "Riddra Markets Desk"
      ? {
          "@type": "Organization",
          name: authorDisplayName,
        }
      : {
          "@type": "Person",
          name: authorDisplayName,
        };

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
    author: authorSchema,
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

function isPositiveChange(value: string | null | undefined) {
  return String(value ?? "").trim().startsWith("+");
}

function isNegativeChange(value: string | null | undefined) {
  return String(value ?? "").trim().startsWith("-");
}

type FocusStock = Pick<StockSnapshot, "slug" | "name" | "symbol" | "price" | "change" | "sector">;

function getStocksInFocus(
  article: Awaited<ReturnType<typeof getMarketNewsArticleBySlug>>,
  allStocks: StockSnapshot[],
  limit = 3,
): FocusStock[] {
  if (!article) {
    return [];
  }

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

  return results.slice(0, limit);
}

type StockMentionCandidate = {
  alias: string;
  aliasKey: string;
  slug: string;
  stockName: string;
  sortWeight: number;
};

const STOCK_MENTION_ALIAS_STOPWORDS = new Set([
  "bank",
  "capital",
  "company",
  "corp",
  "corporation",
  "financial",
  "finance",
  "fund",
  "group",
  "holding",
  "holdings",
  "india",
  "indian",
  "industries",
  "international",
  "limited",
  "motors",
  "pharma",
  "power",
  "services",
  "solutions",
  "state",
]);

function normalizeStockMentionAlias(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function getUniqueFirstTokenCounts(stocks: StockSnapshot[]) {
  const counts = new Map<string, number>();

  for (const stock of stocks) {
    const firstToken = normalizeStockMentionAlias(stock.name.split(/\s+/)[0] ?? "");

    if (!firstToken || firstToken.length < 5) {
      continue;
    }

    counts.set(firstToken, (counts.get(firstToken) ?? 0) + 1);
  }

  return counts;
}

function buildStockMentionCandidates(stocks: StockSnapshot[]) {
  const aliasMap = new Map<string, StockMentionCandidate>();
  const firstTokenCounts = getUniqueFirstTokenCounts(stocks);

  const registerAlias = (stock: StockSnapshot, alias: string, sortWeight: number) => {
    const normalizedAlias = alias.replace(/\s+/g, " ").trim();
    const aliasKey = normalizeStockMentionAlias(normalizedAlias);

    if (!normalizedAlias || aliasKey.length < 4) {
      return;
    }

    const existing = aliasMap.get(aliasKey);
    if (existing && existing.sortWeight >= sortWeight) {
      return;
    }

    aliasMap.set(aliasKey, {
      alias: normalizedAlias,
      aliasKey,
      slug: stock.slug,
      stockName: stock.name,
      sortWeight,
    });
  };

  for (const stock of stocks) {
    registerAlias(stock, stock.name, 1000 + stock.name.length);

    const firstToken = normalizeStockMentionAlias(stock.name.split(/\s+/)[0] ?? "");
    if (
      firstToken &&
      firstToken.length >= 5 &&
      !STOCK_MENTION_ALIAS_STOPWORDS.has(firstToken) &&
      firstTokenCounts.get(firstToken) === 1
    ) {
      registerAlias(stock, firstToken, 400 + firstToken.length);
    }
  }

  return Array.from(aliasMap.values()).sort((left, right) => right.sortWeight - left.sortWeight);
}

function filterStockMentionCandidatesForContext(
  candidates: StockMentionCandidate[],
  contextText: string,
) {
  const normalizedContext = contextText.toLowerCase();

  return candidates.filter((candidate) => normalizedContext.includes(candidate.aliasKey));
}

function isStockMentionBoundaryCharacter(value: string | undefined) {
  if (!value) {
    return true;
  }

  return !/[A-Za-z0-9]/.test(value);
}

function linkStockMentionsInParagraph(
  paragraph: string,
  candidates: StockMentionCandidate[],
): ReactNode[] {
  if (!paragraph.trim() || !candidates.length) {
    return [paragraph];
  }

  const lowerParagraph = paragraph.toLowerCase();
  const matches: Array<{
    start: number;
    end: number;
    candidate: StockMentionCandidate;
  }> = [];

  for (const candidate of candidates) {
    const aliasNeedle = candidate.aliasKey;
    let searchIndex = 0;

    while (searchIndex < lowerParagraph.length) {
      const matchIndex = lowerParagraph.indexOf(aliasNeedle, searchIndex);

      if (matchIndex === -1) {
        break;
      }

      const matchEnd = matchIndex + aliasNeedle.length;
      const previousCharacter = paragraph[matchIndex - 1];
      const nextCharacter = paragraph[matchEnd];

      if (
        isStockMentionBoundaryCharacter(previousCharacter) &&
        isStockMentionBoundaryCharacter(nextCharacter)
      ) {
        matches.push({
          start: matchIndex,
          end: matchEnd,
          candidate,
        });
      }

      searchIndex = matchIndex + aliasNeedle.length;
    }
  }

  if (!matches.length) {
    return [paragraph];
  }

  matches.sort((left, right) => {
    if (left.start !== right.start) {
      return left.start - right.start;
    }

    if (left.end !== right.end) {
      return right.end - left.end;
    }

    return right.candidate.sortWeight - left.candidate.sortWeight;
  });

  const selectedMatches: typeof matches = [];
  let occupiedUntil = -1;

  for (const match of matches) {
    if (match.start < occupiedUntil) {
      continue;
    }

    selectedMatches.push(match);
    occupiedUntil = match.end;
  }

  if (!selectedMatches.length) {
    return [paragraph];
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of selectedMatches) {
    if (match.start > cursor) {
      nodes.push(paragraph.slice(cursor, match.start));
    }

    nodes.push(
      <Link
        key={`${match.candidate.slug}-${match.start}-${match.end}`}
        href={`/stocks/${match.candidate.slug}`}
        className="font-medium text-[#1B3A6B] underline decoration-[rgba(27,58,107,0.24)] underline-offset-[3px] transition hover:text-[#D4853B] hover:decoration-[rgba(212,133,59,0.4)]"
        title={match.candidate.stockName}
      >
        {paragraph.slice(match.start, match.end)}
      </Link>,
    );

    cursor = match.end;
  }

  if (cursor < paragraph.length) {
    nodes.push(paragraph.slice(cursor));
  }

  return nodes;
}

function splitArticleBodyIntoParagraphs(value: string | null | undefined) {
  const sanitized = sanitizeMarketNewsEditorialCopy(value);

  if (!sanitized) {
    return [];
  }

  return sanitized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
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
  const allStocks = await getStocks().catch(() => []);
  const visibleStoriesCount = parseStoriesCount(resolvedSearchParams.stories);
  const visibleRelatedArticles = relatedArticles.slice(0, visibleStoriesCount);
  const canLoadMoreStories = visibleStoriesCount < relatedArticles.length;
  const canShowLessStories = visibleStoriesCount > 3;
  const nextStoriesCount = Math.min(visibleStoriesCount + 3, relatedArticles.length);
  const taggedStockEntities = article.entities.filter((entity) => entity.entity_type === "stock");
  const focusStocks = getStocksInFocus(article, allStocks, 3);
  const publishDateValue = getArticlePublishDateValue(article);
  const publishedLabel = formatMarketNewsDateTime(publishDateValue);
  const publishedFullDate = formatMarketNewsFullDate(publishDateValue);
  const modifiedLabel = formatMarketNewsDateTime(article.updated_at);
  const authorDisplayName = formatMarketNewsAuthorName(article.author_name);
  const categoryLabel = formatMarketNewsCategoryLabel(article.category);
  const sourceLabel = formatMarketNewsSourceLabel(article.source_name, article.source_url);
  const fallbackSrc = getMarketNewsDisplayFallbackImage(article);
  const articleBodyParagraphs = splitArticleBodyIntoParagraphs(
    article.summary || article.short_summary || "Market News is being prepared.",
  );
  const stockMentionCandidates = filterStockMentionCandidatesForContext(
    buildStockMentionCandidates(allStocks),
    [
      article.rewritten_title || article.original_title,
      article.short_summary || "",
      article.summary || "",
      ...articleBodyParagraphs,
    ].join(" "),
  );
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Markets", href: "/markets" },
    { name: "Market News", href: "/markets/news" },
  ];
  const byline = publishedFullDate ? `by ${authorDisplayName} · ${publishedFullDate}` : `by ${authorDisplayName}`;

  return (
    <>
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <JsonLd data={buildNewsArticleSchema(article)} />
      <GlobalSidebarPageShell
        category="markets"
        className="space-y-4"
        leftClassName="riddra-legacy-light-surface"
      >
        <div className="w-full space-y-6">
          <Breadcrumbs items={breadcrumbs} />

          <ProductCard tone="primary" className="overflow-hidden p-5 sm:p-6">
            <article className="w-full space-y-6">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-[rgba(107,114,128,0.8)]">
                  <span className="inline-flex rounded-full border border-[rgba(221,215,207,0.92)] bg-white px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[rgba(75,85,99,0.9)]">
                    {categoryLabel}
                  </span>
                  {publishedLabel ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="riddra-product-body text-[12px] font-medium uppercase tracking-[0.12em] text-[rgba(107,114,128,0.78)]">
                        {publishedLabel}
                      </span>
                    </>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <h1 className="riddra-product-body text-[28px] font-semibold tracking-tight text-[#1B3A6B] sm:text-[32px]">
                    {article.rewritten_title || article.original_title}
                  </h1>
                  <p className="riddra-product-body text-[14px] leading-7 text-[rgba(75,85,99,0.86)]">
                    {byline}
                  </p>
                  {modifiedLabel && modifiedLabel !== publishedLabel ? (
                    <p className="riddra-product-body text-[13px] leading-6 text-[rgba(107,114,128,0.8)]">
                      Updated {modifiedLabel}
                    </p>
                  ) : null}
                </div>
              </div>

              <figure className="space-y-2">
                <div className="aspect-[16/9] overflow-hidden rounded-[10px] border border-[rgba(221,215,207,0.92)] bg-[rgba(248,246,243,0.92)]">
                  <MarketNewsImage
                    primarySrc={article.display_image_url}
                    fallbackSrc={fallbackSrc}
                    alt={article.image_display_alt_text}
                    className="h-full w-full object-cover"
                  />
                </div>
                {!article.uses_fallback_image && article.image_display_alt_text?.trim() ? (
                  <figcaption className="riddra-product-body text-[12px] italic leading-6 text-[rgba(107,114,128,0.82)]">
                    {article.image_display_alt_text}
                  </figcaption>
                ) : null}
              </figure>

              <div className="article-body w-full space-y-5 text-[16px] leading-[1.75] text-[rgba(55,65,81,0.94)]">
                {articleBodyParagraphs.length ? (
                  articleBodyParagraphs.map((paragraph, index) => (
                    <p key={`${article.id}-paragraph-${index}`}>
                      {linkStockMentionsInParagraph(paragraph, stockMentionCandidates)}
                    </p>
                  ))
                ) : (
                  <p>Market News is being prepared.</p>
                )}
              </div>

              {article.impact_note?.trim() ? (
                <blockquote className="border-l-[3px] border-l-[#D4853B] pl-4 text-[15px] italic leading-8 text-[rgba(75,85,99,0.9)]">
                  {linkStockMentionsInParagraph(article.impact_note, stockMentionCandidates)}
                </blockquote>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={article.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-[8px] border border-[rgba(221,215,207,0.94)] bg-white px-4 py-2 text-sm font-medium text-[#1B3A6B] transition hover:border-[rgba(27,58,107,0.22)] hover:bg-[rgba(27,58,107,0.04)]"
                >
                  Read full story at {sourceLabel}
                  <span aria-hidden="true">↗</span>
                </a>
                {taggedStockEntities.length ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="riddra-product-body text-[12px] font-medium text-[rgba(107,114,128,0.82)]">
                      Tagged stocks
                    </span>
                    <MarketNewsEntityChips entities={taggedStockEntities} limit={4} />
                  </div>
                ) : null}
              </div>
            </article>
          </ProductCard>

          {focusStocks.length ? (
            <ProductCard tone="secondary" className="space-y-4 p-5 sm:p-6">
              <h2 className="riddra-product-body text-[22px] font-semibold tracking-tight text-[#1B3A6B]">
                Stocks in focus
              </h2>
              <div className="grid gap-3 md:grid-cols-3">
                {focusStocks.map((stock) => (
                  <Link
                    key={stock.slug}
                    href={`/stocks/${stock.slug}`}
                    className="rounded-[16px] border border-[rgba(221,215,207,0.92)] bg-white px-4 py-4 transition hover:border-[rgba(212,133,59,0.28)] hover:shadow-[0_16px_34px_rgba(15,23,42,0.06)]"
                  >
                    <p className="riddra-product-body text-sm font-semibold uppercase tracking-[0.12em] text-[rgba(107,114,128,0.78)]">
                      {stock.symbol}
                    </p>
                    <p className="riddra-product-body mt-2 text-[20px] font-semibold text-[#1B3A6B]">
                      {stock.name}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="riddra-product-body text-[18px] font-semibold text-[#111827]">
                        {stock.price}
                      </span>
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
            </ProductCard>
          ) : null}

          <MarketNewsList
            articles={visibleRelatedArticles}
            title="Similar news"
            compact
            emptyTitle="More stories are being prepared"
            emptyDescription="Additional related market news articles will appear here as the public news archive fills out."
          />
          {canLoadMoreStories || canShowLessStories ? (
            <div className="flex flex-wrap items-center justify-center gap-4 pt-1">
              {canLoadMoreStories ? (
                <Link
                  href={`/markets/news/${article.slug}?stories=${nextStoriesCount}`}
                  className="inline-flex items-center justify-center rounded-full border border-[rgba(221,215,207,0.94)] bg-white px-5 py-2.5 text-sm font-medium text-[#1B3A6B] transition hover:border-[rgba(27,58,107,0.22)] hover:bg-[rgba(27,58,107,0.04)]"
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
        </div>
      </GlobalSidebarPageShell>
    </>
  );
}
