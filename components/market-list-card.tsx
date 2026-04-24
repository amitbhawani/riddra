import Link from "next/link";

import { ProductCard, ProductSectionTitle } from "@/components/product-page-system";

type Item = {
  slug: string;
  name: string;
  summary?: string;
  change?: string;
  returns1Y?: string;
  status?: string;
};

export function MarketListCard({
  title,
  hrefBase,
  items,
  variant,
}: {
  title: string;
  hrefBase: string;
  items: Item[];
  variant: "stocks" | "funds" | "ipos";
}) {
  function buildItemDescription(item: Item) {
    if (variant === "stocks") {
      return item.change
        ? `Latest tracked move ${item.change}. Open the stock page for chart and benchmark context.`
        : "Latest tracked move is unavailable. Open the stock page for current route coverage.";
    }

    if (variant === "funds") {
      return item.returns1Y && !/awaiting/i.test(item.returns1Y)
        ? `Latest available 1Y return: ${item.returns1Y}.`
        : "Durable public return coverage is still limited on this fund route.";
    }

    return item.status
      ? `Current IPO status: ${item.status}.`
      : "Open the IPO route for issue timeline and status coverage.";
  }

  function buildBadge(item: Item) {
    if (variant === "stocks") {
      return item.change ?? "Move unavailable";
    }

    if (variant === "funds") {
      return item.returns1Y && !/awaiting/i.test(item.returns1Y)
        ? item.returns1Y
        : "Coverage limited";
    }

    return item.status ?? "Status";
  }

  return (
    <ProductCard tone="secondary" className="space-y-4">
      <ProductSectionTitle
        title={title}
        description={
          variant === "stocks"
            ? "Move straight into the live public stock routes with the strongest tracked moves."
            : variant === "funds"
              ? "Use the fund routes that already exist publicly, while keeping missing return history explicit."
              : "Follow issue routes that already have a public page, without padding this board with sample listings."
        }
        eyebrow={
          variant === "stocks" ? "Stocks" : variant === "funds" ? "Funds" : "IPO routes"
        }
      />
      <div className="mt-5 grid gap-4">
        {items.length > 0 ? (
          items.map((item) => (
            <Link
              key={item.slug}
              href={`${hrefBase}/${item.slug}`}
              className="rounded-[10px] border border-[rgba(226,222,217,0.86)] bg-white px-4 py-4 transition hover:border-[#1B3A6B] hover:shadow-[0_12px_24px_rgba(27,58,107,0.045)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="riddra-product-body text-base font-medium text-[#1B3A6B]">{item.name}</p>
                  <p className="riddra-product-body mt-2 text-sm leading-6 text-[rgba(107,114,128,0.88)]">
                    {buildItemDescription(item)}
                  </p>
                </div>
                <div className="rounded-full border border-[rgba(27,58,107,0.12)] bg-[rgba(27,58,107,0.05)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#1B3A6B]">
                  {buildBadge(item)}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-[10px] border border-dashed border-[rgba(212,133,59,0.32)] bg-[rgba(212,133,59,0.07)] px-4 py-4 text-sm leading-7 text-[rgba(107,114,128,0.9)]">
            {title} is unavailable right now because that public market lane does not yet have enough retained records to surface honestly.
          </div>
        )}
      </div>
    </ProductCard>
  );
}
