import {
  MarketNewsClickSurface,
  MarketNewsTrackedLink,
} from "@/components/market-news-click-surface";
import { MarketNewsEntityChips } from "@/components/market-news-entity-chips";
import { MarketNewsImage } from "@/components/market-news-image";
import { ProductCard } from "@/components/product-page-system";
import { formatMarketNewsDateTime } from "@/lib/market-news/formatting";
import type { MarketNewsArticleWithRelations } from "@/lib/market-news/types";

function formatImpactLabel(value: string | null | undefined) {
  return String(value ?? "")
    .split("_")
    .map((part) => (part ? `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}` : ""))
    .join(" ")
    .trim();
}

function getFallbackSrc(article: MarketNewsArticleWithRelations) {
  return article.image?.fallback_image_url || article.fallback_image_url || article.display_image_url;
}

function StoryMeta({
  article,
  compact = false,
  showBadges = true,
  showSourceMeta = true,
  chipLimit,
}: {
  article: MarketNewsArticleWithRelations;
  compact?: boolean;
  showBadges?: boolean;
  showSourceMeta?: boolean;
  chipLimit?: number;
}) {
  const primaryEntity = article.entities[0] ?? null;
  const publishedLabel = formatMarketNewsDateTime(
    article.published_at || article.source_published_at || article.created_at,
  );
  const impactLabel = formatImpactLabel(article.impact_label);
  const resolvedChipLimit = chipLimit ?? (compact ? 4 : 5);

  return (
    <div className={compact ? "space-y-2.5" : "space-y-3"}>
      {showBadges && (impactLabel || article.category) ? (
        <div className="flex flex-wrap items-center gap-2">
          {impactLabel ? (
            <span className="rounded-full border border-[rgba(212,133,59,0.24)] bg-[rgba(212,133,59,0.1)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[#8E5723]">
              {impactLabel}
            </span>
          ) : null}
          {article.category ? (
            <span className="rounded-full border border-[rgba(27,58,107,0.14)] bg-[rgba(27,58,107,0.03)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[#1B3A6B]">
              {article.category}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className={compact ? "space-y-1.5" : "space-y-2"}>
        <MarketNewsTrackedLink
          href={`/markets/news/${article.slug}`}
          articleId={article.id}
          entityType={primaryEntity?.entity_type ?? null}
          entitySlug={primaryEntity?.entity_slug ?? null}
          className="block"
        >
          <h2
            className={`riddra-product-body font-semibold tracking-tight text-[#1B3A6B] transition hover:text-[#D4853B] ${
              compact
                ? "line-clamp-4 text-[18px] leading-[1.26]"
                : "text-[30px] leading-[1.14]"
            }`}
          >
            {article.rewritten_title || article.original_title}
          </h2>
        </MarketNewsTrackedLink>
        <p
          className={`riddra-product-body text-[14px] leading-7 text-[rgba(75,85,99,0.86)] ${
            compact ? "line-clamp-2 text-[13px] leading-[1.45]" : "line-clamp-3"
          }`}
        >
          {article.short_summary || article.summary || "Market News is being prepared."}
        </p>
      </div>

      {showSourceMeta ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-[rgba(107,114,128,0.86)]">
          {publishedLabel ? <span>{publishedLabel}</span> : null}
          {publishedLabel ? <span className="text-[rgba(148,163,184,0.92)]">•</span> : null}
          <span className="font-medium text-[#1B3A6B]">{article.source_name}</span>
        </div>
      ) : null}

      {article.impact_note?.trim() ? (
        <p
          className={`riddra-product-body text-[13px] leading-6 text-[rgba(107,114,128,0.88)] ${
            compact ? "line-clamp-2" : "line-clamp-2"
          }`}
        >
          {article.impact_note}
        </p>
      ) : null}

      <MarketNewsEntityChips
        entities={article.entities}
        compact={compact}
        limit={resolvedChipLimit}
      />

      <div className="flex flex-wrap gap-3">
        <MarketNewsTrackedLink
          href={`/markets/news/${article.slug}`}
          articleId={article.id}
          entityType={primaryEntity?.entity_type ?? null}
          entitySlug={primaryEntity?.entity_slug ?? null}
          className={`inline-flex rounded-full border border-[rgba(27,58,107,0.14)] bg-[rgba(27,58,107,0.04)] font-medium text-[#1B3A6B] transition hover:bg-[rgba(27,58,107,0.08)] ${
            compact ? "px-3 py-1.5 text-[12px]" : "px-4 py-2 text-sm"
          }`}
        >
          Read more
        </MarketNewsTrackedLink>
        <a
          href={article.source_url}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex rounded-full border border-[rgba(212,133,59,0.18)] bg-[rgba(212,133,59,0.08)] font-medium text-[#8E5723] transition hover:bg-[rgba(212,133,59,0.14)] ${
            compact ? "px-3 py-1.5 text-[12px]" : "px-4 py-2 text-sm"
          }`}
        >
          Source
        </a>
      </div>
    </div>
  );
}

function TopStoryCard({ article }: { article: MarketNewsArticleWithRelations }) {
  const primaryEntity = article.entities[0] ?? null;

  return (
    <ProductCard tone="primary" className="h-full min-h-[176px] overflow-hidden p-0">
      <MarketNewsClickSurface
        href={`/markets/news/${article.slug}`}
        articleId={article.id}
        entityType={primaryEntity?.entity_type ?? null}
        entitySlug={primaryEntity?.entity_slug ?? null}
        className="flex h-full items-start gap-3.5 p-3.5"
      >
        <div className="mt-0.5 h-[76px] w-[76px] shrink-0 overflow-hidden rounded-[14px] border border-[rgba(221,215,207,0.92)] bg-[rgba(248,246,243,0.92)]">
          <MarketNewsImage
            primarySrc={article.display_image_url}
            fallbackSrc={getFallbackSrc(article)}
            alt={article.image_display_alt_text}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <StoryMeta
            article={article}
            compact
            showBadges={false}
            showSourceMeta
            chipLimit={2}
          />
        </div>
      </MarketNewsClickSurface>
    </ProductCard>
  );
}

export function MarketNewsTopStories({
  articles,
  title = "Market News",
  description = "Popular Market Stories on Riddra",
}: {
  articles: MarketNewsArticleWithRelations[];
  title?: string;
  description?: string;
}) {
  if (!articles.length) {
    return (
      <ProductCard tone="primary" className="space-y-3 p-5">
        <div className="space-y-2">
          <p className="riddra-product-body text-[11px] font-medium uppercase tracking-[0.18em] text-[rgba(107,114,128,0.72)]">
            {title}
          </p>
          <h1 className="riddra-product-body text-[30px] font-semibold tracking-tight text-[#1B3A6B]">
            {description}
          </h1>
        </div>
        <div className="rounded-[16px] border border-dashed border-[rgba(212,133,59,0.28)] bg-[rgba(27,58,107,0.03)] px-4 py-5">
          <p className="riddra-product-body text-[16px] font-medium text-[#1B3A6B]">
            Market News is being prepared
          </p>
          <p className="riddra-product-body mt-2 text-[14px] leading-7 text-[rgba(75,85,99,0.84)]">
            Popular stories will appear here once the latest market news articles are ready for the public surface.
          </p>
        </div>
      </ProductCard>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="riddra-product-body text-[11px] font-medium uppercase tracking-[0.18em] text-[rgba(107,114,128,0.72)]">
          {title}
        </p>
        <h1 className="riddra-product-body text-[30px] font-semibold tracking-tight text-[#1B3A6B]">
          {description}
        </h1>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {articles.slice(0, 3).map((article) => (
          <TopStoryCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}
