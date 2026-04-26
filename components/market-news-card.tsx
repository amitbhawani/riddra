import {
  MarketNewsClickSurface,
  MarketNewsTrackedLink,
} from "@/components/market-news-click-surface";
import { MarketNewsEntityChips } from "@/components/market-news-entity-chips";
import { MarketNewsImage } from "@/components/market-news-image";
import { ProductCard } from "@/components/product-page-system";
import { formatMarketNewsDateTime } from "@/lib/market-news/formatting";
import type { MarketNewsArticleWithRelations } from "@/lib/market-news/types";

export function MarketNewsCard({
  article,
  compact = false,
}: {
  article: MarketNewsArticleWithRelations;
  compact?: boolean;
}) {
  const primaryEntity = article.entities[0] ?? null;
  const publishedLabel = formatMarketNewsDateTime(
    article.published_at || article.source_published_at || article.created_at,
  );
  const summary = article.short_summary || article.summary || "Market News is being prepared.";
  const fallbackSrc =
    article.image?.fallback_image_url || article.fallback_image_url || article.display_image_url;

  return (
    <ProductCard tone={compact ? "secondary" : "primary"} className="overflow-hidden p-0">
      <MarketNewsClickSurface
        href={`/markets/news/${article.slug}`}
        articleId={article.id}
        entityType={primaryEntity?.entity_type ?? null}
        entitySlug={primaryEntity?.entity_slug ?? null}
        className={
          compact
            ? "grid items-start gap-3 p-4 sm:grid-cols-[74px_minmax(0,1fr)]"
            : "grid gap-5 p-4 md:grid-cols-[250px_minmax(0,1fr)] md:items-start sm:p-5"
        }
      >
        <div className="overflow-hidden rounded-[14px] border border-[rgba(221,215,207,0.92)] bg-[rgba(248,246,243,0.92)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          <MarketNewsImage
            primarySrc={article.display_image_url}
            fallbackSrc={fallbackSrc}
            alt={article.image_display_alt_text}
            className={compact ? "h-[74px] w-[74px] object-cover" : "h-56 w-full object-cover md:h-full"}
          />
        </div>

        <div className={compact ? "min-w-0 space-y-2" : "space-y-4"}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-medium uppercase tracking-[0.14em] text-[rgba(107,114,128,0.8)]">
            {publishedLabel ? <span className="riddra-product-body">{publishedLabel}</span> : null}
            {publishedLabel ? (
              <span className="riddra-product-body text-[rgba(148,163,184,0.92)]">•</span>
            ) : null}
            <span className="riddra-product-body">{article.source_name}</span>
          </div>

          <div className={compact ? "space-y-1.5" : "space-y-2.5"}>
            <MarketNewsTrackedLink
              href={`/markets/news/${article.slug}`}
              articleId={article.id}
              entityType={primaryEntity?.entity_type ?? null}
              entitySlug={primaryEntity?.entity_slug ?? null}
              className="block"
            >
              <h2
                className={`riddra-product-body font-semibold tracking-tight text-[#1B3A6B] transition hover:text-[#D4853B] ${
                  compact ? "text-[18px] leading-[1.3]" : "text-[24px] leading-[1.22]"
                }`}
              >
                {article.rewritten_title || article.original_title}
              </h2>
            </MarketNewsTrackedLink>
            <p
              className={`riddra-product-body text-[14px] leading-7 text-[rgba(75,85,99,0.86)] ${
                compact ? "line-clamp-2 text-[13px] leading-6" : "line-clamp-3"
              }`}
            >
              {summary}
            </p>
          </div>

          {article.impact_note?.trim() ? (
            <p
              className={`riddra-product-body text-[13px] leading-6 text-[rgba(107,114,128,0.88)] ${
                compact ? "line-clamp-1" : "line-clamp-2"
              }`}
            >
              {article.impact_note}
            </p>
          ) : null}

          {!compact ? (
            <MarketNewsEntityChips entities={article.entities} compact={compact} limit={5} />
          ) : null}

          <div className={compact ? "flex flex-wrap gap-2 pt-0.5" : "flex flex-wrap gap-3"}>
            <MarketNewsTrackedLink
              href={`/markets/news/${article.slug}`}
              articleId={article.id}
              entityType={primaryEntity?.entity_type ?? null}
              entitySlug={primaryEntity?.entity_slug ?? null}
              className={
                compact
                  ? "text-[12px] font-semibold text-[#1B3A6B] underline underline-offset-4"
                  : "inline-flex rounded-full border border-[rgba(27,58,107,0.14)] bg-[rgba(27,58,107,0.04)] px-4 py-2 text-sm font-medium text-[#1B3A6B] transition hover:bg-[rgba(27,58,107,0.08)]"
              }
            >
              Read More
            </MarketNewsTrackedLink>
            <a
              href={article.source_url}
              target="_blank"
              rel="noreferrer"
              className={
                compact
                  ? "text-[12px] font-semibold text-[#8E5723] underline underline-offset-4"
                  : "inline-flex rounded-full border border-[rgba(212,133,59,0.18)] bg-[rgba(212,133,59,0.08)] px-4 py-2 text-sm font-medium text-[#8E5723] transition hover:bg-[rgba(212,133,59,0.14)]"
              }
            >
              Source
            </a>
          </div>
        </div>
      </MarketNewsClickSurface>
    </ProductCard>
  );
}
