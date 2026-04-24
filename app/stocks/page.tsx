import type { Metadata } from "next";
import Link from "next/link";

import { AssetDiscoveryWorkspace, type AssetDiscoveryRow } from "@/components/asset-discovery-workspace";
import { MarketDataUnavailableState } from "@/components/market-data-unavailable-state";
import {
  ProductBreadcrumbs,
  ProductCard,
  ProductPageContainer,
  ProductSectionTitle,
} from "@/components/product-page-system";
import { ShowcaseRouteStrip } from "@/components/showcase-route-strip";
import {
  describeStockCompareCandidate,
  getCanonicalStockCompareHref,
  getPreferredStockComparePairs,
  getPreferredStockShowcaseRoutes,
  getRankedStockCompareCandidates,
} from "@/lib/compare-routing";
import { getStocks } from "@/lib/content";
import { getStockTruthLabel } from "@/lib/market-truth";
import { getStockOwnershipLens } from "@/lib/stock-research";

export const metadata: Metadata = {
  title: "Indian Stocks",
  description: "Browse Indian stocks with quote snapshots, sector context, and direct links into detailed research pages.",
};

export default async function StocksIndexPage() {
  const stocks = await getStocks();
  const verifiedCount = stocks.filter((stock) => stock.snapshotMeta?.mode === "delayed_snapshot").length;
  const managedCount = stocks.filter((stock) => stock.snapshotMeta?.mode === "manual_close").length;
  const sectorCount = new Set(stocks.map((stock) => stock.sector)).size;
  const strongestPair = getPreferredStockComparePairs(stocks, 1)[0] ?? null;
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Stocks", href: "/stocks" },
  ];
  const showcaseSequence = getPreferredStockShowcaseRoutes(stocks, 3).map((stock, index) => {
    const topCompareCandidate = getRankedStockCompareCandidates(stocks, stock.slug, { limit: 1 })[0] ?? null;

    if (index === 0) {
      return {
        title: `Lead with ${stock.name}`,
        summary: "Open the strongest stock route first so quote, chart, and research context land in one clean destination.",
        href: `/stocks/${stock.slug}`,
        label: `Open ${stock.name}`,
        tag: stock.snapshotMeta?.mode === "delayed_snapshot" ? "Verified route" : "Stock detail",
      };
    }

    if (topCompareCandidate) {
      return {
        title: `${stock.name} vs ${topCompareCandidate.name}`,
        summary: "Move into the ranked compare path when you want the stock story to shift from single-name research into a cleaner side-by-side call.",
        href:
          getCanonicalStockCompareHref(stocks, stock.slug, topCompareCandidate.slug) ??
          `/compare/stocks/${stock.slug}/${topCompareCandidate.slug}`,
        label: "Open compare route",
        tag: "Compare flow",
      };
    }

    return {
      title: `${stock.name} chart`,
      summary: "Use the chart-first route when the walkthrough needs price structure before the broader research frame.",
      href: `/stocks/${stock.slug}/chart`,
      label: "Open chart route",
      tag: "Chart-first",
    };
  });
  const comparePairs = getPreferredStockComparePairs(stocks, 3).map(({ left, right }) => ({
    title: `${left.name} vs ${right.name}`,
    href: getCanonicalStockCompareHref(stocks, left.slug, right.slug) ?? `/compare/stocks/${left.slug}/${right.slug}`,
    note: `${left.sector} leadership versus ${right.sector.toLowerCase()} strength in a cleaner ranked stock matchup.`,
  }));
  const discoveryRows: AssetDiscoveryRow[] = stocks.map((stock) => {
    const topCompareCandidate = getRankedStockCompareCandidates(stocks, stock.slug, { limit: 1 })[0] ?? null;
    const compareMeta = topCompareCandidate ? describeStockCompareCandidate(stock, topCompareCandidate) : null;
    const compareHref = topCompareCandidate
      ? getCanonicalStockCompareHref(stocks, stock.slug, topCompareCandidate.slug) ??
        `/compare/stocks/${stock.slug}/${topCompareCandidate.slug}`
      : undefined;
    const ownershipLens = getStockOwnershipLens(stock);
    const truthLabel = getStockTruthLabel(stock);

    return {
      id: stock.slug,
      name: stock.name,
      searchTokens: [
        stock.name,
        stock.symbol,
        stock.sector,
        stock.summary,
        stock.momentumLabel,
        truthLabel,
        topCompareCandidate?.name ?? "",
      ],
      category: stock.sector.toLowerCase(),
      categoryLabel: stock.sector,
      badge: stock.momentumLabel,
      summary: stock.summary,
      truthLabel,
      truthTone:
        stock.snapshotMeta?.mode === "delayed_snapshot"
          ? "verified"
          : stock.snapshotMeta?.mode === "manual_close"
            ? "managed"
            : "seeded",
      truthDetail:
        stock.snapshotMeta?.marketDetail ??
        "This route stays conservative until a provider-backed durable quote is written for the symbol.",
      primaryMetric: {
        label: "Snapshot",
        value: `${stock.price} • ${stock.change}`,
      },
      metrics: [
        { label: "Market Cap", value: readStockStat(stock, "Market Cap") },
        { label: "ROE", value: readStockStat(stock, "ROE") },
        { label: "Debt / Equity", value: readStockStat(stock, "Debt / Equity") },
        { label: "Ownership", value: ownershipLens.posture },
      ],
      compareLabel: topCompareCandidate ? `${stock.name} vs ${topCompareCandidate.name}` : undefined,
      compareDetail: compareMeta?.rationale,
      compareHref,
      compareHighlight: compareMeta?.highlight,
      primaryHref: `/stocks/${stock.slug}`,
      primaryHrefLabel: "Open stock",
      secondaryHref: `/stocks/${stock.slug}/chart`,
      secondaryHrefLabel: "Open chart",
      sortMetricValue: parseSignedPercent(stock.change),
      truthScore: stock.snapshotMeta?.mode === "delayed_snapshot" ? 3 : stock.snapshotMeta?.mode === "manual_close" ? 2 : 1,
    };
  });

  if (stocks.length === 0) {
    return (
      <div className="riddra-product-page border-y border-[rgba(221,215,207,0.82)] bg-[linear-gradient(180deg,rgba(248,246,242,0.98)_0%,rgba(250,249,247,0.98)_100%)] py-2 sm:py-2.5">
        <ProductPageContainer className="space-y-6">
          <ProductBreadcrumbs items={breadcrumbs} />
          <ProductCard tone="primary" className="p-4 sm:p-5">
            <ProductSectionTitle
              eyebrow="Stock hub"
              title="Indian stocks"
              description="Browse Indian stocks from one hub and move quickly into quote views, chart routes, sector context, and deeper research pages."
            />
          </ProductCard>
          <MarketDataUnavailableState
            state="unavailable"
            eyebrow="Stock hub availability"
            title="No public stock routes are ready yet"
            description="This hub stays empty until real tracked stock records are available."
            items={[
              "Published stock routes appear here only when real records and trusted market data are available.",
              "Unavailable coverage remains withheld instead of being replaced with placeholder stock cards.",
            ]}
          />
        </ProductPageContainer>
      </div>
    );
  }

  return (
    <div className="riddra-product-page border-y border-[rgba(221,215,207,0.82)] bg-[linear-gradient(180deg,rgba(248,246,242,0.98)_0%,rgba(250,249,247,0.98)_100%)] py-2 sm:py-2.5">
      <ProductPageContainer className="space-y-6">
        <ProductBreadcrumbs items={breadcrumbs} />

        <ProductCard tone="primary" className="p-4 sm:p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="space-y-4">
              <ProductSectionTitle
                eyebrow="Stock hub"
                title="Indian stocks"
                description="Browse Indian stocks from one hub and move quickly into quote views, chart routes, sector context, and deeper research pages."
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[10px] border border-[rgba(226,222,217,0.86)] bg-white/92 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Tracked stocks</p>
                  <p className="mt-1 text-[20px] font-semibold text-[#111827]">{stocks.length}</p>
                </div>
                <div className="rounded-[10px] border border-[rgba(226,222,217,0.86)] bg-white/92 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Route truth</p>
                  <p className="mt-1 text-[15px] font-semibold text-[#111827]">
                    {verifiedCount} verified · {managedCount} managed
                  </p>
                </div>
                <div className="rounded-[10px] border border-[rgba(226,222,217,0.86)] bg-white/92 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Sector coverage</p>
                  <p className="mt-1 text-[20px] font-semibold text-[#111827]">{sectorCount}</p>
                </div>
              </div>
            </div>
            <div className="grid gap-3">
              <div className="rounded-[10px] border border-[rgba(27,58,107,0.12)] bg-[rgba(27,58,107,0.04)] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Hub reading flow</p>
                <p className="mt-2 text-[15px] font-semibold text-[#1B3A6B]">Discovery, compare route, then detail page</p>
                <p className="mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">
                  The stock hub now follows the same public research rhythm as the detail pages instead of reading like a separate catalog surface.
                </p>
              </div>
              <div className="rounded-[10px] border border-[rgba(226,222,217,0.86)] bg-white/92 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Strongest compare route</p>
                <p className="mt-2 text-[15px] font-semibold text-[#111827]">
                  {strongestPair ? `${strongestPair.left.name} vs ${strongestPair.right.name}` : "Compare lane pending"}
                </p>
                <p className="mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">
                  Open the ranked compare lane when one stock page is no longer enough and the story needs a cleaner side-by-side view.
                </p>
              </div>
            </div>
          </div>
        </ProductCard>

        <div className="grid gap-4 lg:grid-cols-4">
          <ProductCard tone="primary" className="p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Tracked stocks</p>
            <p className="mt-1 text-[22px] font-semibold text-[#111827]">{stocks.length}</p>
            <p className="mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">
              Public stock routes currently available for search, hub discovery, and compare handoffs.
            </p>
          </ProductCard>
          <ProductCard tone="primary" className="p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Route truth</p>
            <p className="mt-1 text-[18px] font-semibold text-[#111827]">
              {verifiedCount} verified · {managedCount} managed
            </p>
            <p className="mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">
              Keep the first click on delayed or managed routes when the walkthrough needs stronger quote credibility.
            </p>
          </ProductCard>
          <ProductCard tone="primary" className="p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Sector coverage</p>
            <p className="mt-1 text-[22px] font-semibold text-[#111827]">{sectorCount}</p>
            <p className="mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">
              Sector clustering keeps the hub useful for theme-first discovery before one company takes over the story.
            </p>
          </ProductCard>
          <ProductCard tone="primary" className="p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Strongest compare route</p>
            <p className="mt-1 text-[18px] font-semibold text-[#111827]">
              {strongestPair ? `${strongestPair.left.name} vs ${strongestPair.right.name}` : "Compare lane pending"}
            </p>
            <p className="mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">
              The hub now surfaces multiple ranked head-to-head routes instead of collapsing the demo into one showcase card.
            </p>
          </ProductCard>
        </div>

        <AssetDiscoveryWorkspace
          title="Route-backed stock discovery"
          description="Filter the live stock bench by sector, truth posture, and compare readiness so demos can move from one strong stock to the right chart or peer route without scrolling the whole catalog."
          searchPlaceholder="Search by company, ticker, sector, or compare peer"
          categoryLabel="Sector"
          rows={discoveryRows}
          sortOptions={[
            { value: "metric", label: "1D move" },
            { value: "truth", label: "Truth posture" },
            { value: "compare", label: "Compare readiness" },
            { value: "name", label: "Alphabetical" },
          ]}
          defaultSort="metric"
        />

        <ShowcaseRouteStrip
          eyebrow="Walkthrough path"
          title="Best stock opening sequence"
          description="These are the fastest stock routes to open when you want a calm product story instead of a broad catalog tour."
          items={showcaseSequence}
        />

        <ProductCard tone="primary" className="space-y-4 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.72)]">Showcase comparisons</p>
          <h2 className="text-[16px] font-semibold text-[#111827]">Best stock demos to open next</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {comparePairs.map((pair) => (
              <Link key={pair.href} href={pair.href}>
                <div className="rounded-[12px] border border-[rgba(221,215,207,0.96)] bg-white/92 px-4 py-4 transition hover:border-[rgba(27,58,107,0.18)] hover:bg-[rgba(27,58,107,0.03)]">
                  <h3 className="text-[15px] font-semibold text-[#111827]">{pair.title}</h3>
                  <p className="mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">{pair.note}</p>
                </div>
              </Link>
            ))}
          </div>
        </ProductCard>
      </ProductPageContainer>
    </div>
  );
}

function readStockStat(
  stock: Awaited<ReturnType<typeof getStocks>>[number],
  label: string,
) {
  return stock.stats.find((item) => item.label === label)?.value ?? "Pending";
}

function parseSignedPercent(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
