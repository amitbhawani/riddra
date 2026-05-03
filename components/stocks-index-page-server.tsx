import Link from "next/link";

import {
  AssetDiscoveryWorkspace,
  type AssetDiscoveryRow,
} from "@/components/asset-discovery-workspace";
import { getGlobalSidebarRail } from "@/components/global-sidebar-rail-server";
import { MarketDataUnavailableState } from "@/components/market-data-unavailable-state";
import {
  ProductBreadcrumbs,
  ProductCard,
  ProductPageContainer,
  ProductPageTwoColumnLayout,
  ProductSectionTitle,
} from "@/components/product-page-system";
import { ShowcaseRouteStrip } from "@/components/showcase-route-strip";
import {
  describeStockCompareCandidate,
  getCanonicalStockCompareHref,
  getPreferredStockComparePairs,
  getPreferredStockShowcaseRoutes,
  getTopRankedStockCompareCandidate,
} from "@/lib/compare-routing";
import { getPublicStockDiscoveryPage } from "@/lib/content";
import { getStockTruthLabel } from "@/lib/market-truth";
import type { StockSnapshot } from "@/lib/mock-data";
import { getStockOwnershipLens } from "@/lib/stock-research";

export const STOCKS_PAGE_SIZE = 60;

const stocksHeroSurfaceStyle = {
  backgroundColor: "#081225",
  backgroundImage:
    "radial-gradient(circle at top left, rgba(251,191,36,0.18), transparent 24%), radial-gradient(circle at 88% 18%, rgba(59,130,246,0.22), transparent 26%), linear-gradient(135deg, #081225 0%, #102241 52%, #183C68 100%)",
  boxShadow: "0 28px 68px rgba(8, 18, 37, 0.28)",
};

const stocksHeroGlassCardStyle = {
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.07) 100%)",
  borderColor: "rgba(255,255,255,0.16)",
  boxShadow: "0 14px 30px rgba(8, 18, 37, 0.14)",
  backdropFilter: "blur(14px)",
};

const stocksHeroBoardCardStyle = {
  background:
    "linear-gradient(180deg, rgba(4,10,22,0.22) 0%, rgba(7,18,36,0.38) 100%)",
  borderColor: "rgba(255,255,255,0.12)",
};

function heroMoveColor(value: string) {
  if (value.startsWith("+")) {
    return "#7CE3A4";
  }

  if (value.startsWith("-")) {
    return "#FCA5A5";
  }

  return "rgba(226,232,240,0.76)";
}

function buildStocksPageHref(page: number) {
  return page <= 1 ? "/stocks" : `/stocks/page/${page}`;
}

export function parsePositiveStocksPage(value: number | string | undefined) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export async function StocksIndexPageServer({
  currentPage = 1,
}: {
  currentPage?: number;
}) {
  const safeCurrentPage = parsePositiveStocksPage(currentPage);
  const [stockPage, sidebar] = await Promise.all([
    getPublicStockDiscoveryPage(safeCurrentPage, STOCKS_PAGE_SIZE),
    getGlobalSidebarRail("stocks"),
  ]);
  const stocks = stockPage.stocks;
  const verifiedCount = stocks.filter(
    (stock) => stock.snapshotMeta?.mode === "delayed_snapshot",
  ).length;
  const managedCount = stocks.filter(
    (stock) => stock.snapshotMeta?.mode === "manual_close",
  ).length;
  const sectorCount = new Set(stocks.map((stock) => stock.sector)).size;
  const leadGainer =
    [...stocks].sort(
      (left, right) => parseSignedPercent(right.change) - parseSignedPercent(left.change),
    )[0] ?? null;
  const leadLoser =
    [...stocks].sort(
      (left, right) => parseSignedPercent(left.change) - parseSignedPercent(right.change),
    )[0] ?? null;
  const strongestPair = getPreferredStockComparePairs(stocks, 1)[0] ?? null;
  const strongestPairHref = strongestPair
    ? getCanonicalStockCompareHref(
        stocks,
        strongestPair.left.slug,
        strongestPair.right.slug,
      ) ??
      `/compare/stocks/${strongestPair.left.slug}/${strongestPair.right.slug}`
    : null;
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Stocks", href: "/stocks" },
  ];
  const showcaseSequence = getPreferredStockShowcaseRoutes(stocks, 3).map(
    (stock, index) => {
      const topCompareCandidate = getTopRankedStockCompareCandidate(stocks, stock.slug);

      if (index === 0) {
        return {
          title: `Lead with ${stock.name}`,
          summary:
            "Open the strongest stock route first so quote, chart, and research context land in one clean destination.",
          href: `/stocks/${stock.slug}`,
          label: `Open ${stock.name}`,
          tag:
            stock.snapshotMeta?.mode === "delayed_snapshot"
              ? "Verified route"
              : "Stock detail",
        };
      }

      if (topCompareCandidate) {
        return {
          title: `${stock.name} vs ${topCompareCandidate.name}`,
          summary:
            "Move into the ranked compare path when you want the stock story to shift from single-name research into a cleaner side-by-side call.",
          href:
            getCanonicalStockCompareHref(
              stocks,
              stock.slug,
              topCompareCandidate.slug,
            ) ?? `/compare/stocks/${stock.slug}/${topCompareCandidate.slug}`,
          label: "Open compare route",
          tag: "Compare flow",
        };
      }

      return {
        title: `${stock.name} chart`,
        summary:
          "Use the chart-first route when the walkthrough needs price structure before the broader research frame.",
        href: `/stocks/${stock.slug}/chart`,
        label: "Open chart route",
        tag: "Chart-first",
      };
    },
  );
  const comparePairs = getPreferredStockComparePairs(stocks, 3).map(({ left, right }) => ({
    title: `${left.name} vs ${right.name}`,
    href:
      getCanonicalStockCompareHref(stocks, left.slug, right.slug) ??
      `/compare/stocks/${left.slug}/${right.slug}`,
    note: `${left.sector} leadership versus ${right.sector.toLowerCase()} strength in a cleaner ranked stock matchup.`,
  }));
  const discoveryRows: AssetDiscoveryRow[] = stocks.map((stock) => {
    const topCompareCandidate = getTopRankedStockCompareCandidate(stocks, stock.slug);
    const compareMeta = topCompareCandidate
      ? describeStockCompareCandidate(stock, topCompareCandidate)
      : null;
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
        "This route stays conservative until a verified delayed quote is written for the symbol.",
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
      compareLabel: topCompareCandidate
        ? `${stock.name} vs ${topCompareCandidate.name}`
        : undefined,
      compareDetail: compareMeta?.rationale,
      compareHref,
      compareHighlight: compareMeta?.highlight,
      primaryHref: `/stocks/${stock.slug}`,
      primaryHrefLabel: "Open stock",
      secondaryHref: `/stocks/${stock.slug}/chart`,
      secondaryHrefLabel: "Open chart",
      sortMetricValue: parseSignedPercent(stock.change),
      truthScore:
        stock.snapshotMeta?.mode === "delayed_snapshot"
          ? 3
          : stock.snapshotMeta?.mode === "manual_close"
            ? 2
            : 1,
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

  const heroBoardItems = [
    leadGainer
      ? {
          key: "gainer",
          label: "Lead gainer",
          title: leadGainer.name,
          value: leadGainer.price,
          meta: leadGainer.change,
        }
      : null,
    leadLoser
      ? {
          key: "loser",
          label: "Lead loser",
          title: leadLoser.name,
          value: leadLoser.price,
          meta: leadLoser.change,
        }
      : null,
    {
      key: "truth",
      label: "Verified routes",
      title: `${verifiedCount}`,
      value: `${managedCount} managed`,
      meta: stockPage.total ? `${stockPage.total} total` : "Universe",
    },
    {
      key: "sectors",
      label: "Sector coverage",
      title: `${sectorCount}`,
      value: "Discovery lanes",
      meta: strongestPair ? "Compare-ready" : "Routes building",
    },
  ].filter(
    (
      item,
    ): item is { key: string; label: string; title: string; value: string; meta: string } =>
      Boolean(item),
  );
  const heroRailItems = [
    leadGainer
      ? {
          label: "Lead gainer",
          title: leadGainer.name,
          detail: `${leadGainer.symbol} • ${leadGainer.price}`,
          meta: leadGainer.change,
          href: `/stocks/${leadGainer.slug}`,
        }
      : null,
    leadLoser
      ? {
          label: "Lead loser",
          title: leadLoser.name,
          detail: `${leadLoser.symbol} • ${leadLoser.price}`,
          meta: leadLoser.change,
          href: `/stocks/${leadLoser.slug}`,
        }
      : null,
    strongestPair
      ? {
          label: "Best compare route",
          title: `${strongestPair.left.name} vs ${strongestPair.right.name}`,
          detail: "Use the compare lane when one stock page is not enough.",
          meta: "Compare-ready",
          href:
            getCanonicalStockCompareHref(
              stocks,
              strongestPair.left.slug,
              strongestPair.right.slug,
            ) ??
            `/compare/stocks/${strongestPair.left.slug}/${strongestPair.right.slug}`,
        }
      : null,
  ].filter(
    (
      item,
    ): item is { label: string; title: string; detail: string; meta: string; href: string } =>
      Boolean(item),
  );

  return (
    <div className="riddra-product-page border-y border-[rgba(221,215,207,0.82)] bg-[linear-gradient(180deg,rgba(248,246,242,0.98)_0%,rgba(250,249,247,0.98)_100%)] py-2 sm:py-2.5">
      <ProductPageContainer className="space-y-6">
        <ProductBreadcrumbs items={breadcrumbs} />
        <ProductPageTwoColumnLayout
          left={
            <div className="space-y-6">
              <ProductCard
                tone="primary"
                className="overflow-hidden border-[rgba(15,23,42,0.22)] p-0 text-white"
                style={stocksHeroSurfaceStyle}
              >
                <div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Dedicated stock subsection",
                        "Native chart routes",
                        "Stored snapshot data",
                      ].map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-white/14 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/82"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-white/70">
                        Stocks
                      </p>
                      <h1 className="text-3xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-[3.35rem]">
                        A stock hub built for discovery first, then conviction.
                      </h1>
                      <p className="max-w-3xl text-base leading-8 text-[rgba(226,232,240,0.9)]">
                        Use the stock subsection for real movers, compare-ready routes, sector clustering, and direct entry into stock pages backed by stored chart and snapshot data.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[14px] border border-white/12 bg-black/12 px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-white/66">
                          Tracked stocks
                        </p>
                        <p className="mt-2 text-[18px] font-semibold text-white">
                          {stockPage.total}
                        </p>
                      </div>
                      <div className="rounded-[14px] border border-white/12 bg-black/12 px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-white/66">
                          Route truth
                        </p>
                        <p className="mt-2 text-[15px] font-semibold text-white">
                          {verifiedCount} verified · {managedCount} managed
                        </p>
                      </div>
                      <div className="rounded-[14px] border border-white/12 bg-black/12 px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-white/66">
                          Sector coverage
                        </p>
                        <p className="mt-2 text-[18px] font-semibold text-white">
                          {sectorCount}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 pt-1">
                      <Link
                        href="#catalog"
                        className="inline-flex min-h-[46px] items-center justify-center rounded-[10px] bg-[#F4C542] px-5 text-sm font-semibold text-[#081225] shadow-[0_16px_28px_rgba(244,197,66,0.28)] transition hover:translate-y-[-1px]"
                      >
                        Browse stock grid
                      </Link>
                      <Link
                        href="/screener"
                        className="inline-flex min-h-[46px] items-center justify-center rounded-[10px] border border-white/16 bg-white/8 px-5 text-sm font-semibold text-white transition hover:bg-white/12"
                      >
                        Open screener
                      </Link>
                      {strongestPairHref ? (
                        <Link
                          href={strongestPairHref}
                          className="inline-flex min-h-[46px] items-center justify-center rounded-[10px] border border-white/16 bg-transparent px-5 text-sm font-semibold text-white/88 transition hover:bg-white/8"
                        >
                          Open best compare
                        </Link>
                      ) : null}
                    </div>
                    <div className="grid gap-3 pt-1 sm:grid-cols-2 xl:grid-cols-4">
                      {heroBoardItems.map((item) => (
                        <div
                          key={item.key}
                          className="rounded-[16px] border px-4 py-4"
                          style={stocksHeroBoardCardStyle}
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/56">
                            {item.label}
                          </p>
                          <p className="mt-3 text-[1.08rem] font-semibold text-white">
                            {item.title}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-white/72">
                            {item.value}
                          </p>
                          <p
                            className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em]"
                            style={{ color: heroMoveColor(item.meta) }}
                          >
                            {item.meta}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-3">
                    {heroRailItems.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="rounded-[18px] border px-4 py-4 transition hover:translate-y-[-1px]"
                        style={stocksHeroGlassCardStyle}
                      >
                        <p className="text-[10px] uppercase tracking-[0.16em] text-white/62">
                          {item.label}
                        </p>
                        <p className="mt-2 text-[1rem] font-semibold text-white">
                          {item.title}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-white/78">
                          {item.detail}
                        </p>
                        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F4C542]">
                          {item.meta}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              </ProductCard>

              <div className="grid gap-4 lg:grid-cols-4">
                <ProductCard tone="primary" className="p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">
                    Tracked stocks
                  </p>
                  <p className="mt-1 text-[22px] font-semibold text-[#111827]">
                    {stockPage.total}
                  </p>
                  <p className="mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">
                    Public stock routes currently available for search, hub discovery, and compare handoffs.
                  </p>
                </ProductCard>
                <ProductCard tone="primary" className="p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">
                    Route truth
                  </p>
                  <p className="mt-1 text-[18px] font-semibold text-[#111827]">
                    {verifiedCount} verified · {managedCount} managed
                  </p>
                  <p className="mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">
                    Keep the first click on delayed or managed routes when the walkthrough needs stronger quote credibility.
                  </p>
                </ProductCard>
                <ProductCard tone="primary" className="p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">
                    Sector coverage
                  </p>
                  <p className="mt-1 text-[22px] font-semibold text-[#111827]">
                    {sectorCount}
                  </p>
                  <p className="mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">
                    Sector clustering keeps the hub useful for theme-first discovery before one company takes over the story.
                  </p>
                </ProductCard>
                <ProductCard tone="primary" className="p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">
                    Strongest compare route
                  </p>
                  <p className="mt-1 text-[18px] font-semibold text-[#111827]">
                    {strongestPair
                      ? `${strongestPair.left.name} vs ${strongestPair.right.name}`
                      : "Compare lane pending"}
                  </p>
                  <p className="mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">
                    The hub now surfaces multiple ranked head-to-head routes instead of collapsing the demo into one showcase card.
                  </p>
                </ProductCard>
              </div>

              <ProductCard
                tone="primary"
                id="catalog"
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">
                    Catalog window
                  </p>
                  <p className="text-[14px] font-semibold text-[#111827]">
                    Showing page {stockPage.page} of {stockPage.totalPages}
                  </p>
                  <p className="text-[13px] text-[rgba(75,85,99,0.84)]">
                    Rendering {stocks.length} stocks per page keeps the hub fast while the canonical universe now covers {stockPage.total} active stocks.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {stockPage.page > 1 ? (
                    <Link
                      href={buildStocksPageHref(stockPage.page - 1)}
                      className="inline-flex h-10 items-center justify-center rounded-[11px] border border-[rgba(221,215,207,0.96)] bg-white px-3.5 text-[13px] font-semibold text-[#355286] transition hover:border-[rgba(27,58,107,0.16)]"
                    >
                      Previous page
                    </Link>
                  ) : null}
                  {stockPage.page < stockPage.totalPages ? (
                    <Link
                      href={buildStocksPageHref(stockPage.page + 1)}
                      className="inline-flex h-10 items-center justify-center rounded-[11px] border border-[rgba(27,58,107,0.16)] bg-[#2F4A83] px-3.5 text-[13px] font-semibold text-white shadow-[0_8px_18px_rgba(47,74,131,0.18)]"
                    >
                      Next page
                    </Link>
                  ) : null}
                </div>
              </ProductCard>

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
                <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.72)]">
                  Showcase comparisons
                </p>
                <h2 className="text-[16px] font-semibold text-[#111827]">
                  Best stock demos to open next
                </h2>
                <div className="grid gap-4 md:grid-cols-3">
                  {comparePairs.map((pair) => (
                    <Link key={pair.href} href={pair.href}>
                      <div className="rounded-[12px] border border-[rgba(221,215,207,0.96)] bg-white/92 px-4 py-4 transition hover:border-[rgba(27,58,107,0.18)] hover:bg-[rgba(27,58,107,0.03)]">
                        <h3 className="text-[15px] font-semibold text-[#111827]">
                          {pair.title}
                        </h3>
                        <p className="mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">
                          {pair.note}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </ProductCard>
            </div>
          }
          right={sidebar}
        />
      </ProductPageContainer>
    </div>
  );
}

function readStockStat(stock: StockSnapshot, label: string) {
  return stock.stats.find((item) => item.label === label)?.value ?? "Pending";
}

function parseSignedPercent(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
