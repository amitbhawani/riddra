import Link from "next/link";

import {
  MarketNewsClickSurface,
  MarketNewsTrackedLink,
} from "@/components/market-news-click-surface";
import { MarketNewsEntityChips } from "@/components/market-news-entity-chips";
import { MarketNewsImage } from "@/components/market-news-image";
import { ProductCard, ProductSectionTitle } from "@/components/product-page-system";
import { getMarketNewsDisplayFallbackImage } from "@/lib/market-news/images";
import type { MarketNewsArticleWithRelations } from "@/lib/market-news/types";

function formatDateLabel(value: string | null | undefined) {
  const parsed = Date.parse(value ?? "");

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(parsed));
}

function formatStockHeadingName(value: string) {
  const cleaned = value
    .replace(/\b(limited|ltd\.?|industries|industry|corporation|corp\.?|inc\.?|plc|holdings?)\b$/i, "")
    .trim();

  return cleaned || value.trim() || "Stock";
}

type EntityNewsSectionProps = {
  entityType: "stock" | "sector" | "mutual_fund" | "etf" | "ipo";
  entitySlug: string;
  entityDisplayName?: string | null;
  symbol?: string | null;
  articles: MarketNewsArticleWithRelations[];
  usedSectorFallback?: boolean;
  fallbackSectorLabel?: string | null;
  usedLatestFallback?: boolean;
  titleOverride?: string;
  descriptionOverride?: string;
  emptyTitleOverride?: string;
  emptyDescriptionOverride?: string;
};

export function EntityNewsSection({
  entityType,
  entitySlug,
  entityDisplayName,
  symbol,
  articles,
  usedSectorFallback = false,
  fallbackSectorLabel,
  usedLatestFallback = false,
  titleOverride,
  descriptionOverride,
  emptyTitleOverride,
  emptyDescriptionOverride,
}: EntityNewsSectionProps) {
  const isStockLayout = entityType === "stock";
  const visibleArticles = isStockLayout ? articles.slice(0, 3) : articles;
  const showMoreHref = `/markets/news?company=${encodeURIComponent(entitySlug)}`;
  const stockHeadingName = formatStockHeadingName(entityDisplayName || symbol || "Stock");
  const title =
    titleOverride ??
    (entityType === "sector"
      ? "Latest sector news"
      : entityType === "stock" && usedSectorFallback
        ? `${fallbackSectorLabel || "Sector"} news`
        : isStockLayout
          ? `Latest ${stockHeadingName} News`
          : "Latest stock news");
  const description =
    descriptionOverride ??
    (entityType === "sector"
      ? usedLatestFallback
        ? "Direct sector-linked articles are not available yet, so this section is showing the latest market stories from the broader Riddra news surface."
        : "Latest matched market news for this sector with direct links into the full Market News archive."
      : entityType === "stock" && usedSectorFallback
        ? `Direct stock-linked articles are not available yet, so this section is showing the latest ${fallbackSectorLabel || "sector"} stories.`
        : symbol
          ? `Latest matched market news for ${symbol} with direct links into the full Market News archive.`
          : "Latest matched market news with direct links into the full Market News archive.");

  return (
    <ProductCard tone="secondary" className="space-y-4">
      <ProductSectionTitle
        eyebrow={isStockLayout ? undefined : "News"}
        title={title}
        description={isStockLayout ? undefined : description}
      />

      {visibleArticles.length ? (
        <div className="grid gap-3">
          {visibleArticles.map((article) => {
            const publishedLabel = formatDateLabel(article.published_at || article.source_published_at);
            const fallbackSrc = getMarketNewsDisplayFallbackImage(article);
            const primaryEntity = article.entities[0] ?? null;
            const trackingEntityType = entityType === "stock" || entityType === "sector" || entityType === "mutual_fund" || entityType === "etf" || entityType === "ipo"
              ? entityType
              : primaryEntity?.entity_type ?? null;
            const trackingEntitySlug = entitySlug || primaryEntity?.entity_slug || null;

            if (isStockLayout) {
              return (
                <MarketNewsClickSurface
                  key={article.id}
                  href={`/markets/news/${article.slug}`}
                  articleId={article.id}
                  entityType={trackingEntityType}
                  entitySlug={trackingEntitySlug}
                  className="grid items-start gap-3 rounded-[14px] border border-[rgba(221,215,207,0.92)] bg-white p-3 sm:grid-cols-[56px_minmax(0,1fr)]"
                >
                  <div className="self-start overflow-hidden rounded-[10px] border border-[rgba(221,215,207,0.92)] bg-[rgba(248,246,243,0.92)]">
                    <MarketNewsImage
                      primarySrc={article.display_image_url}
                      fallbackSrc={fallbackSrc}
                      alt={article.image_display_alt_text}
                      className="h-14 w-14 object-cover sm:h-14 sm:w-14"
                    />
                  </div>

                  <div className="min-w-0 space-y-1.5">
                    {publishedLabel ? (
                      <p className="text-[11px] text-[rgba(107,114,128,0.82)]">{publishedLabel}</p>
                    ) : null}

                    <MarketNewsTrackedLink
                      href={`/markets/news/${article.slug}`}
                      articleId={article.id}
                      entityType={trackingEntityType}
                      entitySlug={trackingEntitySlug}
                      className="block text-[14px] font-semibold leading-5 text-[#1B3A6B] transition hover:text-[#D4853B]"
                    >
                      {article.rewritten_title || article.original_title}
                    </MarketNewsTrackedLink>

                    <p className="line-clamp-2 text-[12px] leading-5 text-[rgba(75,85,99,0.84)]">
                      {article.short_summary || article.summary || "Market news is being prepared."}
                    </p>
                  </div>
                </MarketNewsClickSurface>
              );
            }

            return (
              <MarketNewsClickSurface
                key={article.id}
                href={`/markets/news/${article.slug}`}
                articleId={article.id}
                entityType={trackingEntityType}
                entitySlug={trackingEntitySlug}
                className="grid gap-3 rounded-[14px] border border-[rgba(221,215,207,0.92)] bg-white p-3.5 sm:grid-cols-[112px_minmax(0,1fr)]"
              >
                <div className="overflow-hidden rounded-[12px] border border-[rgba(221,215,207,0.92)] bg-[rgba(248,246,243,0.92)]">
                  <MarketNewsImage
                    primarySrc={article.display_image_url}
                    fallbackSrc={fallbackSrc}
                    alt={article.image_display_alt_text}
                    className="h-[88px] w-full object-cover sm:h-full"
                  />
                </div>

                <div className="space-y-2.5">
                  {publishedLabel ? (
                    <p className="text-[11px] text-[rgba(107,114,128,0.82)]">{publishedLabel}</p>
                  ) : null}

                  <div className="space-y-1.5">
                    <MarketNewsTrackedLink
                      href={`/markets/news/${article.slug}`}
                      articleId={article.id}
                      entityType={trackingEntityType}
                      entitySlug={trackingEntitySlug}
                      className="block text-[15px] font-semibold leading-6 text-[#1B3A6B] transition hover:text-[#D4853B]"
                    >
                      {article.rewritten_title || article.original_title}
                    </MarketNewsTrackedLink>
                    <p className="line-clamp-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">
                      {article.short_summary || article.summary || "Market news is being prepared."}
                    </p>
                  </div>

                  <MarketNewsEntityChips
                    entities={article.entities}
                    compact
                    limit={4}
                    activeEntitySlug={entitySlug}
                  />

                  <div className="flex flex-wrap gap-3 pt-0.5">
                    <MarketNewsTrackedLink
                      href={`/markets/news/${article.slug}`}
                      articleId={article.id}
                      entityType={trackingEntityType}
                      entitySlug={trackingEntitySlug}
                      className="text-[12px] font-semibold text-[#1B3A6B] underline underline-offset-4"
                    >
                      Read more
                    </MarketNewsTrackedLink>
                  </div>
                </div>
              </MarketNewsClickSurface>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[14px] border border-dashed border-[rgba(212,133,59,0.26)] bg-[rgba(27,58,107,0.03)] px-4 py-5">
          <p className="text-[14px] font-semibold text-[#1B3A6B]">
            {emptyTitleOverride ||
              (entityType === "sector"
                ? "Latest sector news is being prepared"
                : entityType === "mutual_fund"
                  ? "Latest mutual fund news is being prepared"
                  : entityType === "etf"
                    ? "Latest ETF news is being prepared"
                    : entityType === "ipo"
                      ? "Latest IPO news is being prepared"
                      : "Latest stock news is being prepared")}
          </p>
          <p className="mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">
            {emptyDescriptionOverride ||
              (entityType === "sector"
                ? "Matched market news articles for this sector will appear here once they are ready on the public Market News surface."
                : entityType === "mutual_fund"
                  ? "Matched market news articles for this fund will appear here once they are ready on the public Market News surface."
                  : entityType === "etf"
                    ? "Matched market news articles for this ETF will appear here once they are ready on the public Market News surface."
                    : entityType === "ipo"
                      ? "Matched market news articles for this IPO will appear here once they are ready on the public Market News surface."
                      : "Matched market news articles for this stock will appear here once they are ready on the public Market News surface.")}
          </p>
        </div>
      )}

      {isStockLayout && articles.length ? (
        <div className="flex justify-end pt-1">
          <Link
            href={showMoreHref}
            className="text-[12px] font-semibold text-[#1B3A6B] underline underline-offset-4"
          >
            Show more news
          </Link>
        </div>
      ) : null}
    </ProductCard>
  );
}
