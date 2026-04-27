import {
  MarketNewsTrackedLink,
} from "@/components/market-news-click-surface";
import { MarketNewsEntityChips } from "@/components/market-news-entity-chips";
import {
  formatMarketNewsDateTime,
  getMarketNewsSnippet,
} from "@/lib/market-news/formatting";
import type { MarketNewsArticleWithRelations } from "@/lib/market-news/types";

function getArticleInsightLine(article: MarketNewsArticleWithRelations) {
  const insight =
    article.impact_note?.trim() ||
    getMarketNewsSnippet(article.short_summary, { maxWords: 18, maxSentences: 1 });

  return insight || "";
}

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
  const insightLine = getArticleInsightLine(article);
  const visibleEntities = article.entities.slice(0, compact ? 2 : 3);

  return (
    <article
      className={`border-b border-[rgba(226,222,217,0.82)] ${
        compact ? "py-4" : "py-5"
      } last:border-b-0`}
    >
      <div className="space-y-2.5">
        {publishedLabel ? (
          <p className="riddra-product-body text-[12px] font-medium uppercase tracking-[0.14em] text-[rgba(107,114,128,0.78)]">
            {publishedLabel}
          </p>
        ) : null}

        <MarketNewsTrackedLink
          href={`/markets/news/${article.slug}`}
          articleId={article.id}
          entityType={primaryEntity?.entity_type ?? null}
          entitySlug={primaryEntity?.entity_slug ?? null}
          className="block"
        >
          <h3
            className={`riddra-product-body font-semibold tracking-tight text-[#1B3A6B] transition hover:text-[#D4853B] ${
              compact ? "text-[16px] leading-[1.38]" : "text-[20px] leading-[1.32]"
            }`}
          >
            {article.rewritten_title || article.original_title}
          </h3>
        </MarketNewsTrackedLink>

        {insightLine ? (
          <p
            className={`riddra-product-body text-[14px] text-[rgba(75,85,99,0.82)] ${
              compact ? "line-clamp-2 leading-6" : "line-clamp-1 leading-7"
            }`}
          >
            {insightLine}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            {visibleEntities.length ? (
              <MarketNewsEntityChips entities={visibleEntities} compact={compact} limit={compact ? 2 : 3} />
            ) : null}
          </div>

          <MarketNewsTrackedLink
            href={`/markets/news/${article.slug}`}
            articleId={article.id}
            entityType={primaryEntity?.entity_type ?? null}
            entitySlug={primaryEntity?.entity_slug ?? null}
            className="shrink-0 text-[13px] font-semibold text-[#1B3A6B] transition hover:text-[#D4853B]"
          >
            Read more →
          </MarketNewsTrackedLink>
        </div>
      </div>
    </article>
  );
}
