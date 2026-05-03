import Link from "next/link";

import { ProductCard, ProductSectionTitle } from "@/components/product-page-system";

type Item = {
  slug: string;
  name: string;
  symbol?: string;
  sector?: string;
  category?: string;
  summary?: string;
  price?: string;
  nav?: string;
  change?: string;
  returns1Y?: string;
  status?: string;
  priceBand?: string;
  openDate?: string;
  snapshotMeta?: {
    source: string;
    lastUpdated: string;
    marketLabel?: string;
    marketDetail?: string;
  };
};

export function MarketListCard({
  title,
  hrefBase,
  items,
  variant,
  sectionId,
  viewAllHref,
  description,
  eyebrow,
}: {
  title: string;
  hrefBase: string;
  items: Item[];
  variant: "stocks" | "funds" | "ipos";
  sectionId?: string;
  viewAllHref?: string;
  description?: string;
  eyebrow?: string;
}) {
  function formatDate(value: string | null | undefined) {
    const normalized = String(value ?? "").trim();
    if (!normalized) {
      return "Not available";
    }

    const parsed = new Date(normalized.includes("T") ? normalized : `${normalized}T00:00:00Z`);
    if (!Number.isFinite(parsed.getTime())) {
      return normalized;
    }

    return parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  function buildItemDescription(item: Item) {
    if (variant === "stocks") {
      const move = item.change ? `Latest move ${item.change}` : "Latest move unavailable";
      const symbolLine = item.symbol ? `${item.symbol}` : "Tracked stock";
      const sectorLine = item.sector ? ` • ${item.sector}` : "";
      return `${symbolLine}${sectorLine}. ${move}. Open the stock page for the native chart and full stored market snapshot.`;
    }

    if (variant === "funds") {
      return item.returns1Y && !/awaiting/i.test(item.returns1Y)
        ? `${item.category ?? "Tracked fund"} • Latest available 1Y return ${item.returns1Y}.`
        : `${item.category ?? "Tracked fund"} • durable public return coverage is still limited on this route.`;
    }

    return item.status
      ? `Current IPO status ${item.status}${item.openDate ? ` • opens ${formatDate(item.openDate)}` : ""}.`
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

  function buildMeta(item: Item) {
    if (variant === "stocks") {
      return [
        item.price ? { label: "Price", value: item.price } : null,
        item.snapshotMeta?.lastUpdated
          ? { label: "Updated", value: formatDate(item.snapshotMeta.lastUpdated) }
          : null,
      ].filter((row): row is { label: string; value: string } => Boolean(row));
    }

    if (variant === "funds") {
      return [
        item.nav ? { label: "NAV", value: item.nav } : null,
        item.snapshotMeta?.lastUpdated
          ? { label: "Updated", value: formatDate(item.snapshotMeta.lastUpdated) }
          : null,
      ].filter((row): row is { label: string; value: string } => Boolean(row));
    }

    return [
      item.priceBand ? { label: "Price band", value: item.priceBand } : null,
      item.openDate ? { label: "Open date", value: formatDate(item.openDate) } : null,
    ].filter((row): row is { label: string; value: string } => Boolean(row));
  }

  return (
    <section id={sectionId} className="scroll-mt-24">
    <ProductCard tone="secondary" className="space-y-4">
      <ProductSectionTitle
        title={title}
        description={description ??
          (variant === "stocks"
            ? "Move straight into the live public stock routes with the strongest tracked moves."
            : variant === "funds"
              ? "Use the fund routes that already exist publicly, while keeping missing return history explicit."
              : "Follow issue routes that already have a public page, without padding this board with sample listings.")}
        eyebrow={eyebrow ?? (variant === "stocks" ? "Stocks" : variant === "funds" ? "Funds" : "IPO routes")}
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
                  {buildMeta(item).length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {buildMeta(item).map((detail) => (
                        <span
                          key={`${item.slug}-${detail.label}`}
                          className="rounded-full border border-[rgba(27,58,107,0.1)] bg-[rgba(27,58,107,0.04)] px-2.5 py-1 text-[11px] font-medium text-[#1B3A6B]"
                        >
                          {detail.label}: {detail.value}
                        </span>
                      ))}
                    </div>
                  ) : null}
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
      {viewAllHref ? (
        <Link
          href={viewAllHref}
          className="inline-flex text-[13px] font-semibold text-[#4361EE] hover:text-[#1B3A6B]"
        >
          View all
        </Link>
      ) : null}
    </ProductCard>
    </section>
  );
}
