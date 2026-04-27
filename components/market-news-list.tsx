import { ProductCard } from "@/components/product-page-system";
import { MarketNewsCard } from "@/components/market-news-card";
import type { MarketNewsArticleWithRelations } from "@/lib/market-news/types";

export function MarketNewsList({
  articles,
  title,
  description,
  compact = false,
  wrapInCard = true,
  emptyTitle = "Market News is being prepared",
  emptyDescription = "Fresh stories will appear here once the latest market news articles are ready.",
}: {
  articles: MarketNewsArticleWithRelations[];
  title?: string;
  description?: string;
  compact?: boolean;
  wrapInCard?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (!articles.length) {
    return (
      <ProductCard tone="secondary" className="space-y-3 p-5">
        {title ? (
          <div className="space-y-2">
            <h2 className="riddra-product-body text-[22px] font-semibold tracking-tight text-[#1B3A6B]">
              {title}
            </h2>
            {description ? (
              <p className="riddra-product-body text-[14px] leading-7 text-[rgba(107,114,128,0.86)]">
                {description}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="rounded-[16px] border border-dashed border-[rgba(212,133,59,0.28)] bg-[rgba(27,58,107,0.03)] px-4 py-5">
          <p className="riddra-product-body text-[16px] font-medium text-[#1B3A6B]">{emptyTitle}</p>
          <p className="riddra-product-body mt-2 text-[14px] leading-7 text-[rgba(75,85,99,0.84)]">
            {emptyDescription}
          </p>
        </div>
      </ProductCard>
    );
  }

  const content = (
    <div className="divide-y-0">
      {articles.map((article) => (
        <MarketNewsCard key={article.id} article={article} compact={compact} />
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      {title ? (
        <div className="max-w-3xl space-y-2">
          <h2 className="riddra-product-body text-[22px] font-semibold tracking-tight text-[#1B3A6B]">
            {title}
          </h2>
          {description ? (
            <p className="riddra-product-body text-[14px] leading-7 text-[rgba(107,114,128,0.86)]">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}

      {wrapInCard ? <ProductCard tone="secondary" className="p-0">{content}</ProductCard> : content}
    </div>
  );
}
