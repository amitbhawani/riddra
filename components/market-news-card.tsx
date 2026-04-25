import {
  MarketNewsClickSurface,
  MarketNewsTrackedLink,
} from "@/components/market-news-click-surface";
import { MarketNewsEntityChips } from "@/components/market-news-entity-chips";
import { MarketNewsImage } from "@/components/market-news-image";
import { ProductCard } from "@/components/product-page-system";
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

export function MarketNewsCard({
  article,
  compact = false,
}: {
  article: MarketNewsArticleWithRelations;
  compact?: boolean;
}) {
  const primaryEntity = article.entities[0] ?? null;
  const publishedLabel = formatDateLabel(article.published_at || article.source_published_at);
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
            ? "grid gap-4 p-4"
            : "grid gap-5 p-4 md:grid-cols-[250px_minmax(0,1fr)] md:items-start sm:p-5"
        }
      >
        <div className="overflow-hidden rounded-[14px] border border-[rgba(221,215,207,0.92)] bg-[rgba(248,246,243,0.92)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          <MarketNewsImage
            primarySrc={article.display_image_url}
            fallbackSrc={fallbackSrc}
            alt={article.image_display_alt_text}
            className={compact ? "h-44 w-full object-cover" : "h-56 w-full object-cover md:h-full"}
          />
        </div>

        <div className="space-y-4.5">
          {publishedLabel ? (
            <p className="riddra-product-body text-[12px] font-medium uppercase tracking-[0.14em] text-[rgba(107,114,128,0.8)]">
              {publishedLabel}
            </p>
          ) : null}

          <div className="space-y-2.5">
            <MarketNewsTrackedLink
              href={`/markets/news/${article.slug}`}
              articleId={article.id}
              entityType={primaryEntity?.entity_type ?? null}
              entitySlug={primaryEntity?.entity_slug ?? null}
              className="block"
            >
              <h2
                className={`riddra-product-body font-semibold tracking-tight text-[#1B3A6B] transition hover:text-[#D4853B] ${
                  compact ? "text-[22px]" : "text-[24px] leading-[1.22]"
                }`}
              >
                {article.rewritten_title || article.original_title}
              </h2>
            </MarketNewsTrackedLink>
            <p
              className={`riddra-product-body text-[14px] leading-7 text-[rgba(75,85,99,0.86)] ${
                compact ? "line-clamp-3" : "line-clamp-3"
              }`}
            >
              {summary}
            </p>
          </div>

          <MarketNewsEntityChips entities={article.entities} compact={compact} limit={compact ? 4 : 5} />

          <div className="flex flex-wrap gap-3">
            <MarketNewsTrackedLink
              href={`/markets/news/${article.slug}`}
              articleId={article.id}
              entityType={primaryEntity?.entity_type ?? null}
              entitySlug={primaryEntity?.entity_slug ?? null}
              className="inline-flex rounded-full border border-[rgba(27,58,107,0.14)] bg-[rgba(27,58,107,0.04)] px-4 py-2 text-sm font-medium text-[#1B3A6B] transition hover:bg-[rgba(27,58,107,0.08)]"
            >
              Read More
            </MarketNewsTrackedLink>
          </div>
        </div>
      </MarketNewsClickSurface>
    </ProductCard>
  );
}
