import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdvancedChartWorkspace } from "@/components/advanced-chart-workspace";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import { JsonLd } from "@/components/json-ld";
import { MarketDataStatusBadge } from "@/components/market-data-status-badge";
import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import { Eyebrow, GlowCard } from "@/components/ui";
import { getStockChartSnapshot } from "@/lib/chart-content";
import { getStock } from "@/lib/content";
import { getChartSnapshotPresentation } from "@/lib/market-session";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";
import { buildSeoMetadata } from "@/lib/seo-config";
import { getStockRouteBuildWarmSlugs } from "@/lib/stock-route-static-slugs";
import { getTradingviewStockSymbol } from "@/lib/tradingview-symbols";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const nextMilestones = [
  "Connect this chart route to verified symbol-bound OHLCV as the approved feed path comes online.",
  "Bring proprietary signal overlays into the workspace once the chart layer is ready for them.",
  "Expand chart controls with drawing, compare, and saved-layout support for deeper daily use.",
];

export const dynamicParams = true;
export const revalidate = 300;

export async function generateStaticParams() {
  return getStockRouteBuildWarmSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const stock = await getStock(slug);

  if (!stock) {
    return { title: "Chart not found" };
  }

  return buildSeoMetadata({
    policyKey: "stock_chart",
    title: `${stock.name} Chart | Riddra`,
    description: `${stock.name} chart page for Riddra with a dedicated chart-first route.`,
    publicHref: `/stocks/${stock.slug}/chart`,
  });
}

export default async function StockChartPage({ params }: PageProps) {
  const { slug } = await params;
  const [stock, chartSnapshot] = await Promise.all([getStock(slug), getStockChartSnapshot(slug)]);

  if (!stock) {
    notFound();
  }

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Stocks", href: "/stocks" },
    { name: stock.name, href: `/stocks/${stock.slug}` },
    { name: "Chart", href: `/stocks/${stock.slug}/chart` },
  ];
  const chartPresentation = getChartSnapshotPresentation(chartSnapshot.mode);
  const tradingviewSymbol = getTradingviewStockSymbol(stock.symbol);

  return (
    <>
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <JsonLd
        data={buildWebPageSchema({
          title: `${stock.name} Chart`,
          description: `${stock.name} chart page for Riddra with a dedicated chart-first route.`,
          path: `/stocks/${stock.slug}/chart`,
        })}
      />
      <GlobalSidebarPageShell category="charts" className="space-y-8" leftClassName="riddra-legacy-light-surface space-y-8">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>{stock.symbol} chart</Eyebrow>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="display-font text-4xl font-semibold tracking-tight text-white sm:text-6xl">
                {stock.name} chart
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-mist/74">
                This is the chart-first route for {stock.name}. It keeps the chart honest: verified delayed bars when symbol-bound OHLCV is available, a clearly labeled source-entry series while activation is still underway, and a waiting state until any symbol-bound OHLCV arrives.
              </p>
              <Link
                href={`/stocks/${stock.slug}`}
                className="mt-5 inline-flex text-sm text-white transition hover:text-aurora"
              >
                Back to {stock.name} overview
              </Link>
            </div>
          </div>
        </div>

        <PublicSurfaceTruthSection
          eyebrow="Chart-route truth"
          title="This chart route is useful for public chart-first review right now, but saved continuity still depends on launch activation"
          description={`Use ${stock.name} chart confidently for public chart-first review, while keeping auth continuity, premium workflow promises, and support follow-through honest until those live paths are fully verified.`}
          authReady="Signed-in continuity is active enough to carry chart usage into account and workspace flows."
          authPending="Local preview auth still limits how trustworthy the full chart-to-account handoff can be."
          billingReady="Billing core credentials exist, so premium chart workflow language can move beyond pure preview framing once checkout and webhook flows are exercised."
          billingPending="Billing credentials are still incomplete, so premium chart promises should stay expectation-setting."
          supportReady="Support delivery is configured enough to begin testing real follow-up for chart users who convert into assisted workflows."
          supportPending="Support delivery is still not fully active, so chart-route support expectations should stay conservative."
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
          secondaryHref="/account/support"
          secondaryHrefLabel="Open support continuity"
        />

        <AdvancedChartWorkspace
          title={`${stock.name} chart workspace`}
          description={`${stock.symbol} chart view now expects symbol-bound OHLCV. It renders from verified delayed bars when available, falls back honestly to the source-entry OHLCV lane when needed, and otherwise stays in a clear waiting-for-data state.`}
          presets={["5M", "15M", "1H", "1D"]}
          tradingviewSymbol={tradingviewSymbol}
          nativeChartData={
            chartSnapshot.mode !== "pending" && chartSnapshot.bars.length
              ? {
                  bars: chartSnapshot.bars,
                  trendSeries: chartSnapshot.trendSeries,
                  signalSeries: chartSnapshot.signalSeries,
                }
              : null
          }
          dataStatus={{
            mode: chartSnapshot.mode,
            source: chartSnapshot.source,
            lastUpdated: chartSnapshot.lastUpdated,
            timeframe: chartSnapshot.timeframe,
            marketLabel: chartPresentation.marketLabel,
            marketDetail: chartPresentation.marketDetail,
          }}
          fallbackNotice={
            chartSnapshot.mode === "pending"
              ? {
                  eyebrow: "Chart waiting state",
                  title: `${stock.name} is waiting for symbol-bound OHLCV`,
                  description:
                    "This route now stays stable and honest instead of dropping into the hosted TradingView fallback when stock-specific bars are still missing.",
                  statusLabel: chartPresentation.marketLabel,
                  hints: [
                    "Source-entry OHLCV or verified provider bars will activate the native chart here as soon as they exist for this symbol.",
                    "The stock overview route still carries the broader research context while this chart route waits for symbol-specific history.",
                    "This is a launch-safe choice: no popup-prone hosted widget, no borrowed candles, and no fake sense of verified chart truth.",
                  ],
                  href: `/stocks/${stock.slug}`,
                  hrefLabel: `Back to ${stock.name} overview`,
                }
              : null
          }
        />

        <MarketDataStatusBadge
          title="Chart verification"
          status={chartPresentation.marketLabel}
          detail={chartPresentation.marketDetail}
          source={chartSnapshot.source}
          updated={chartSnapshot.lastUpdated}
            tone={
              chartSnapshot.mode === "verified"
                ? "verified"
                : chartSnapshot.mode === "source_entry"
                  ? "degraded"
                : "pending"
            }
          />

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Why this route matters</h2>
            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76">
                Chart-first users do not always want to scan a full equity research page before seeing price structure. This route gives them a direct entry point.
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76">
                The stock landing page can surface the chart on top too, but this URL gives us a clean SEO and product path for dedicated chart workflows.
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76">
                This route now avoids showing shared reference candles as if they belong to this stock. It becomes a symbol-bound chart surface as soon as either source-entry or verified provider OHLCV is available for the symbol.
              </div>
            </div>
          </GlowCard>

          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">What unlocks next</h2>
            <div className="mt-5 space-y-3">
              {nextMilestones.map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                  {item}
                </div>
              ))}
            </div>
          </GlowCard>
        </div>
      </GlobalSidebarPageShell>
    </>
  );
}
