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

function formatImpactLabel(value: string | null | undefined) {
  return String(value ?? "")
    .split("_")
    .map((part) => (part ? `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}` : ""))
    .join(" ")
    .trim();
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
  const impactLabel = formatImpactLabel(article.impact_label);
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
            {publishedLabel ? (
              <span className="rounded-full border border-[rgba(221,215,207,0.92)] bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[rgba(107,114,128,0.86)]">
                {publishedLabel}
              </span>
            ) : null}
          </div>

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

          <div className="flex flex-wrap items-center gap-2 text-sm text-[rgba(107,114,128,0.86)]">
            <span className="font-medium text-[#1B3A6B]">{article.source_name}</span>
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
            <a
              href={article.source_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-full border border-[rgba(221,215,207,0.94)] bg-white px-4 py-2 text-sm font-medium text-[rgba(55,65,81,0.88)] transition hover:border-[rgba(212,133,59,0.3)] hover:text-[#8E5723]"
            >
              Source
            </a>
          </div>
        </div>
      </MarketNewsClickSurface>
    </ProductCard>
  );
}
