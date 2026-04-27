import {
  MarketNewsClickSurface,
  MarketNewsTrackedLink,
} from "@/components/market-news-click-surface";
import { MarketNewsImage } from "@/components/market-news-image";
import { ProductCard } from "@/components/product-page-system";
import {
  formatMarketNewsCategoryLabel,
  formatMarketNewsDateTime,
  getMarketNewsSnippet,
} from "@/lib/market-news/formatting";
import { getMarketNewsDisplayFallbackImage } from "@/lib/market-news/images";
import type { MarketNewsArticleWithRelations } from "@/lib/market-news/types";

function TopStoryRow({ article }: { article: MarketNewsArticleWithRelations }) {
  const primaryEntity = article.entities[0] ?? null;
  const publishedLabel = formatMarketNewsDateTime(
    article.published_at || article.source_published_at || article.created_at,
  );
  const snippet = getMarketNewsSnippet(
    article.short_summary || article.summary || article.impact_note,
    { maxWords: 22, maxSentences: 1 },
  );
  const fallbackSrc = getMarketNewsDisplayFallbackImage(article);

  return (
    <article className="border-b border-[rgba(226,222,217,0.82)] py-4 last:border-b-0">
      <MarketNewsClickSurface
        href={`/markets/news/${article.slug}`}
        articleId={article.id}
        entityType={primaryEntity?.entity_type ?? null}
        entitySlug={primaryEntity?.entity_slug ?? null}
        className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]"
      >
        <div className="overflow-hidden rounded-[10px] border border-[rgba(221,215,207,0.92)] bg-[rgba(248,246,243,0.92)]">
          <MarketNewsImage
            primarySrc={article.display_image_url}
            fallbackSrc={fallbackSrc}
            alt={article.image_display_alt_text}
            className="h-[108px] w-full object-cover"
          />
        </div>

        <div className="min-w-0 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-[rgba(107,114,128,0.8)]">
            <span className="inline-flex rounded-full border border-[rgba(221,215,207,0.92)] bg-white px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[rgba(75,85,99,0.9)]">
              {formatMarketNewsCategoryLabel(article.category)}
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

          <MarketNewsTrackedLink
            href={`/markets/news/${article.slug}`}
            articleId={article.id}
            entityType={primaryEntity?.entity_type ?? null}
            entitySlug={primaryEntity?.entity_slug ?? null}
            className="block"
          >
            <h2 className="riddra-product-body line-clamp-2 text-[20px] font-semibold leading-[1.28] tracking-tight text-[#1B3A6B] transition hover:text-[#D4853B]">
              {article.rewritten_title || article.original_title}
            </h2>
          </MarketNewsTrackedLink>

          {snippet ? (
            <p className="riddra-product-body line-clamp-2 text-[14px] leading-7 text-[rgba(75,85,99,0.84)]">
              {snippet}
            </p>
          ) : null}

          <MarketNewsTrackedLink
            href={`/markets/news/${article.slug}`}
            articleId={article.id}
            entityType={primaryEntity?.entity_type ?? null}
            entitySlug={primaryEntity?.entity_slug ?? null}
            className="inline-flex text-[13px] font-semibold text-[#1B3A6B] transition hover:text-[#D4853B]"
          >
            Read more →
          </MarketNewsTrackedLink>
        </div>
      </MarketNewsClickSurface>
    </article>
  );
}

export function MarketNewsTopStories({
  articles,
}: {
  articles: MarketNewsArticleWithRelations[];
}) {
  if (!articles.length) {
    return null;
  }

  return (
    <section className="space-y-3">
      <p className="riddra-product-body text-[11px] font-medium uppercase tracking-[0.06em] text-[rgba(107,114,128,0.78)]">
        Top stories today
      </p>
      <ProductCard tone="secondary" className="p-0">
        <div className="px-4 sm:px-5">
          {articles.slice(0, 3).map((article) => (
            <TopStoryRow key={article.id} article={article} />
          ))}
        </div>
      </ProductCard>
    </section>
  );
}
