"use client";

import Link from "next/link";

import { ProductCard } from "@/components/product-page-system";
import {
  buildSidebarMarketSnapshotSections,
  type SidebarMarketSnapshotItem,
} from "@/lib/sidebar-market-snapshot";
import type {
  SharedSidebarMover,
  SharedSidebarPopularStock,
} from "@/lib/shared-sidebar-config";

function getTrendColor(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";

  if (normalized.startsWith("-")) {
    return "#DC2626";
  }

  if (normalized) {
    return "#16A34A";
  }

  return "#1B3A6B";
}

function SidebarSectionHeading({
  title,
  eyebrow,
}: {
  title: string;
  eyebrow?: string;
}) {
  return (
    <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#141414] px-3 py-2.5 shadow-[0_8px_18px_rgba(15,15,15,0.14)]">
      <div>
        {eyebrow ? (
          <p className="mb-0.5 font-[family:var(--font-riddra-mono)] text-[9px] font-medium uppercase tracking-[0.18em] text-[rgba(255,255,255,0.54)]">
            {eyebrow}
          </p>
        ) : null}
        <h3 className="font-[family:var(--font-riddra-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
          {title}
        </h3>
      </div>
    </div>
  );
}

export function SharedMarketSidebarRail({
  visibleBlocks,
  marketSnapshotItems,
  topGainers,
  topLosers,
  popularStocks,
}: {
  visibleBlocks?: {
    marketSnapshot?: boolean;
    topGainers?: boolean;
    topLosers?: boolean;
    popularStocks?: boolean;
  };
  marketSnapshotItems: SidebarMarketSnapshotItem[];
  topGainers: SharedSidebarMover[];
  topLosers: SharedSidebarMover[];
  popularStocks: SharedSidebarPopularStock[];
}) {
  const marketSnapshotSections = buildSidebarMarketSnapshotSections(marketSnapshotItems);
  const showMarketSnapshot = visibleBlocks?.marketSnapshot ?? true;
  const showTopGainers = visibleBlocks?.topGainers ?? true;
  const showTopLosers = visibleBlocks?.topLosers ?? true;
  const showPopularStocks = visibleBlocks?.popularStocks ?? true;

  return (
    <div className="shared-market-sidebar-rail space-y-3">
      {showMarketSnapshot ? (
        <div className="grid gap-3">
          {marketSnapshotSections.map((section) => (
          <ProductCard key={section.title} tone="primary" className="space-y-3">
            <SidebarSectionHeading title={section.title} />
            <div className="shared-market-sidebar-table overflow-hidden rounded-[10px] border border-[rgba(27,58,107,0.08)] bg-white">
              <div className="shared-market-sidebar-header grid grid-cols-[minmax(0,46%)_minmax(68px,34%)_minmax(54px,20%)] items-center gap-2 border-b border-[rgba(27,58,107,0.08)] bg-[rgba(255,255,255,0.92)] px-3 py-2">
                <span className="shared-market-sidebar-table-label text-left font-[family:var(--font-riddra-mono)] text-[10px] uppercase tracking-[0.14em] text-[rgba(107,114,128,0.82)]">
                  Name
                </span>
                <span className="shared-market-sidebar-table-label justify-self-end text-right font-[family:var(--font-riddra-mono)] text-[10px] uppercase tracking-[0.14em] text-[rgba(107,114,128,0.82)]">
                  Last
                </span>
                <span className="shared-market-sidebar-table-label justify-self-end text-right font-[family:var(--font-riddra-mono)] text-[10px] uppercase tracking-[0.14em] text-[rgba(107,114,128,0.82)]">
                  Chg%
                </span>
              </div>

              <div className="divide-y divide-[rgba(27,58,107,0.08)]">
                {section.rows.map((item) => (
                  <div
                    key={`${section.title}-${item.label}`}
                    className="shared-market-sidebar-row grid grid-cols-[minmax(0,46%)_minmax(68px,34%)_minmax(54px,20%)] items-center gap-2 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="shared-market-sidebar-name truncate text-left text-[12px] font-semibold uppercase tracking-[0.02em] text-[#1F2937]">
                        {item.href ? (
                          <Link href={item.href} className="hover:text-[#D4853B]">
                            {item.label}
                          </Link>
                        ) : (
                          item.label
                        )}
                      </p>
                    </div>
                    <p className="shared-market-sidebar-value justify-self-end text-right text-[12px] font-semibold text-[#1B3A6B]">{item.value}</p>
                    <p
                      className="shared-market-sidebar-change riddra-product-number justify-self-end text-right text-[11px] font-medium"
                      style={{ color: getTrendColor(item.change) }}
                    >
                      {item.change}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </ProductCard>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3">
        {[
          showTopGainers ? { title: "Top Gainers", rows: topGainers.slice(0, 5), positive: true } : null,
          showTopLosers ? { title: "Top Losers", rows: topLosers.slice(0, 5), positive: false } : null,
        ]
          .filter((group): group is { title: string; rows: SharedSidebarMover[]; positive: boolean } => Boolean(group))
          .map((group) => (
          <ProductCard key={group.title} tone="secondary" className="space-y-3">
            <SidebarSectionHeading title={group.title} />
            <div className="grid gap-1.5">
              {group.rows.map((item, index) => (
                <SidebarMoverRow
                  key={`${item.slug ?? item.href ?? item.name}-${group.title}`}
                  href={item.href ?? (item.slug ? `/stocks/${item.slug}` : undefined)}
                  name={item.name}
                  price={item.price}
                  highlighted={index === 0}
                  positive={group.positive}
                />
              ))}
            </div>
            <Link
              href={group.positive ? "/stocks#top-gainers" : "/stocks#top-losers"}
              className="inline-flex text-[13px] font-semibold text-[#4361EE] hover:text-[#1B3A6B]"
            >
              View All
            </Link>
          </ProductCard>
          ))}
      </div>

      {showPopularStocks ? (
        <ProductCard tone="secondary" className="space-y-3">
          <SidebarSectionHeading title="Popular Stocks" />
          <div className="grid gap-1.5">
            {popularStocks.slice(0, 6).map((item, index) => (
              <SidebarMoverRow key={`${item.label}-${index}`} href={item.href} name={item.label} price={item.price} />
            ))}
          </div>
        </ProductCard>
      ) : null}
    </div>
  );
}

function SidebarMoverRow({
  href,
  name,
  price,
  highlighted = false,
  positive = true,
}: {
  href?: string;
  name: string;
  price: string;
  highlighted?: boolean;
  positive?: boolean;
}) {
  const className = [
    "shared-market-sidebar-mover grid grid-cols-[minmax(0,1fr)_72px] items-center gap-3 rounded-[9px] border px-3 py-2",
    highlighted
      ? positive
        ? "border-[rgba(22,163,74,0.16)] bg-[rgba(240,253,244,0.95)]"
        : "border-[rgba(220,38,38,0.16)] bg-[rgba(254,242,242,0.95)]"
      : "border-[rgba(27,58,107,0.08)] bg-white",
  ].join(" ");

  const content = (
    <>
      <div className="min-w-0">
        <p className="shared-market-sidebar-mover-name truncate text-[12px] font-semibold text-[#1F2937]">{name}</p>
      </div>
      <p className="shared-market-sidebar-mover-price text-right text-[12px] font-semibold text-[#1B3A6B]">{price}</p>
    </>
  );

  if (!href) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}
