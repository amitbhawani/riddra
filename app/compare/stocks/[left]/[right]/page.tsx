import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { type ComparisonBattleMetric, ComparisonBattleGrid } from "@/components/comparison-battle-grid";
import { CompareRouteCard } from "@/components/compare-route-card";
import { ComparisonVisualGrid } from "@/components/comparison-visual-grid";
import { getGlobalSidebarRail } from "@/components/global-sidebar-rail-server";
import { JsonLd } from "@/components/json-ld";
import { MarketDataStatusBadge } from "@/components/market-data-status-badge";
import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import { ProductPageContainer, ProductPageTwoColumnLayout } from "@/components/product-page-system";
import { ShowcaseRouteStrip } from "@/components/showcase-route-strip";
import { Eyebrow, GlowCard } from "@/components/ui";
import { getStockCompareCandidates, getStockComparePair } from "@/lib/asset-insights";
import { getCanonicalStockCompareHref } from "@/lib/compare-routing";
import { getStocks } from "@/lib/content";
import { getStockCompareTrustCards } from "@/lib/market-truth";
import type { StockSnapshot } from "@/lib/mock-data";
import { getStockOwnershipLens } from "@/lib/stock-research";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";

type PageProps = {
  params: Promise<{ left: string; right: string }>;
};

function cleanPublicCompareValue(value: string | null | undefined, fallback = "Not available yet") {
  const normalized = String(value ?? "").trim();
  const pendingCopyPattern = new RegExp(`${["Awaiting", "verified"].join("\\s+")}[^•.,"\\n]*`, "gi");
  const pendingPrefixPattern = new RegExp(`^${["awaiting", "verified"].join("\\s+")}`, "i");

  if (!normalized || pendingPrefixPattern.test(normalized)) {
    return fallback;
  }

  return normalized.replace(pendingCopyPattern, fallback);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { left, right } = await params;
  const pair = await getStockComparePair(left, right);

  if (!pair) {
    return { title: "Compare stocks" };
  }

  return {
    title: `${pair.left.name} vs ${pair.right.name}`,
    description: `Compare ${pair.left.name} and ${pair.right.name} with side-by-side price, quality, and research context.`,
  };
}

export default async function StockComparePage({ params }: PageProps) {
  const { left, right } = await params;
  const [stocks, pair, leftCandidates, rightCandidates, sidebar] = await Promise.all([
    getStocks(),
    getStockComparePair(left, right),
    getStockCompareCandidates(left, { excludeSlug: right, limit: 3 }),
    getStockCompareCandidates(right, { excludeSlug: left, limit: 3 }),
    getGlobalSidebarRail("compare"),
  ]);

  if (!pair) {
    notFound();
  }

  const canonicalHref = getCanonicalStockCompareHref(stocks, left, right);

  if (canonicalHref && canonicalHref !== `/compare/stocks/${left}/${right}`) {
    redirect(canonicalHref);
  }

  const rows = [
    ["Sector", cleanPublicCompareValue(pair.left.sector), cleanPublicCompareValue(pair.right.sector)],
    ["Quote snapshot", cleanPublicCompareValue(pair.left.price), cleanPublicCompareValue(pair.right.price)],
    ["Daily move", cleanPublicCompareValue(pair.left.change), cleanPublicCompareValue(pair.right.change)],
    [
      "Market-cap lens",
      cleanPublicCompareValue(pair.left.stats.find((item) => item.label === "Market Cap")?.value),
      cleanPublicCompareValue(pair.right.stats.find((item) => item.label === "Market Cap")?.value),
    ],
    [
      "ROE",
      cleanPublicCompareValue(pair.left.stats.find((item) => item.label === "ROE")?.value),
      cleanPublicCompareValue(pair.right.stats.find((item) => item.label === "ROE")?.value),
    ],
    [
      "Debt / Equity",
      cleanPublicCompareValue(pair.left.stats.find((item) => item.label === "Debt / Equity")?.value),
      cleanPublicCompareValue(pair.right.stats.find((item) => item.label === "Debt / Equity")?.value),
    ],
    [
      "52W range",
      cleanPublicCompareValue(pair.left.stats.find((item) => item.label === "52W Range")?.value),
      cleanPublicCompareValue(pair.right.stats.find((item) => item.label === "52W Range")?.value),
    ],
    ["Market stance", cleanPublicCompareValue(pair.left.momentumLabel), cleanPublicCompareValue(pair.right.momentumLabel)],
  ];
  const quickTakeaways = [
    {
      title: `${pair.left.name} stands out when`,
      points: pair.left.keyPoints.slice(0, 3),
      href: `/stocks/${pair.left.slug}`,
    },
    {
      title: `${pair.right.name} stands out when`,
      points: pair.right.keyPoints.slice(0, 3),
      href: `/stocks/${pair.right.slug}`,
    },
  ];
  const compareLenses = [
    "Use this page when you want a faster first-pass decision than opening two separate stock tabs.",
    "Price, quality, leverage, and sector position now sit together so the comparison tells a cleaner story in a live walkthrough.",
    "Each side still links into its dedicated research page and chart route when you want to go deeper.",
  ];
  const path = `/compare/stocks/${left}/${right}`;
  const matchupCards = buildStockMatchupCards(pair.left, pair.right);
  const decisionSummary = buildStockDecisionSummary(pair.left, pair.right);
  const leftOwnershipLens = getStockOwnershipLens(pair.left);
  const rightOwnershipLens = getStockOwnershipLens(pair.right);
  const trustCards = getStockCompareTrustCards(pair.left, pair.right);
  const visualMetrics = [
    buildMetric(
      "Return on equity",
      pair.left.stats.find((item) => item.label === "ROE")?.value ?? "Pending",
      pair.right.stats.find((item) => item.label === "ROE")?.value ?? "Pending",
    ),
    buildMetric(
      "Debt discipline",
      pair.left.stats.find((item) => item.label === "Debt / Equity")?.value ?? "Pending",
      pair.right.stats.find((item) => item.label === "Debt / Equity")?.value ?? "Pending",
      true,
    ),
    buildMetric(
      "Market-cap scale",
      pair.left.stats.find((item) => item.label === "Market Cap")?.value ?? "Pending",
      pair.right.stats.find((item) => item.label === "Market Cap")?.value ?? "Pending",
    ),
    buildMetric(
      "Price move today",
      pair.left.change,
      pair.right.change,
    ),
  ];
  const topVerdict = buildStockDecisionVerdict(pair.left, pair.right);
  const showcaseRoutes = [
    ...leftCandidates.slice(0, 2).map((candidate) => ({
      title: `Try ${pair.left.name} vs ${candidate.targetName}`,
      summary: candidate.rationale,
      href: candidate.href,
      label: "Open compare route",
      tag: candidate.highlight,
    })),
    ...rightCandidates.slice(0, 2).map((candidate) => ({
      title: `Try ${pair.right.name} vs ${candidate.targetName}`,
      summary: candidate.rationale,
      href: candidate.href,
      label: "Open compare route",
      tag: candidate.highlight,
    })),
  ]
    .filter((item, index, items) => items.findIndex((candidate) => candidate.href === item.href) === index)
    .slice(0, 3);
  const battleMetrics = [
    buildBattleMetric(
      "Profitability edge",
      pair.left.stats.find((item) => item.label === "ROE")?.value ?? "Pending",
      pair.right.stats.find((item) => item.label === "ROE")?.value ?? "Pending",
      "Higher return on equity usually gives the cleaner quality-first opening story in a live compare walkthrough.",
    ),
    buildBattleMetric(
      "Balance-sheet comfort",
      pair.left.stats.find((item) => item.label === "Debt / Equity")?.value ?? "Pending",
      pair.right.stats.find((item) => item.label === "Debt / Equity")?.value ?? "Pending",
      "Lower leverage reads stronger when the audience wants the safer balance-sheet narrative.",
      true,
    ),
    buildBattleMetric(
      "Scale and benchmark weight",
      pair.left.stats.find((item) => item.label === "Market Cap")?.value ?? "Pending",
      pair.right.stats.find((item) => item.label === "Market Cap")?.value ?? "Pending",
      "Market-cap scale helps frame whether the debate is about category leadership or upside from the challenger.",
    ),
    buildBattleMetric(
      "Today's tape",
      pair.left.change,
      pair.right.change,
      "Use the day-move strip when the conversation shifts from long-term quality into current market participation.",
    ),
  ];
  const ownershipBattleMetrics = [
    buildBattleMetric(
      "Promoter backing",
      leftOwnershipLens.promoterHolding,
      rightOwnershipLens.promoterHolding,
      "Higher promoter ownership often supports the control-and-alignment story when both routes look otherwise close.",
    ),
    buildBattleMetric(
      "Institutional participation",
      leftOwnershipLens.institutionalHolding,
      rightOwnershipLens.institutionalHolding,
      "FII plus DII mix helps show where institutional sponsorship currently looks stronger.",
    ),
    buildBattleMetric(
      "Public float",
      leftOwnershipLens.publicHolding,
      rightOwnershipLens.publicHolding,
      "Retail participation helps explain search demand, participation breadth, and how widely a story is being watched.",
    ),
  ];
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Stocks", href: "/stocks" },
    { name: "Compare", href: path },
  ];

  return (
    <div className="riddra-product-page py-3 sm:py-4">
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <JsonLd
        data={buildWebPageSchema({
          title: `${pair.left.name} vs ${pair.right.name}`,
          description: `Compare ${pair.left.name} and ${pair.right.name} on Riddra.`,
          path,
        })}
      />
      <ProductPageContainer>
        <ProductPageTwoColumnLayout
          left={
            <div className="riddra-legacy-light-surface space-y-6">
              <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Stock comparison</Eyebrow>
          <h1 className="display-font text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {pair.left.name} vs {pair.right.name}
          </h1>
          <p className="max-w-3xl text-base leading-8 text-mist/76">
            Compare two stocks side by side on quote context, quality markers, leverage, and the quick research cues you want before opening a full deep-dive page.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/stocks/${pair.left.slug}`}
              className="rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Open {pair.left.name}
            </Link>
            <Link
              href={`/stocks/${pair.right.slug}`}
              className="rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Open {pair.right.name}
            </Link>
          </div>
              </div>

        <PublicSurfaceTruthSection
          eyebrow="Stock compare truth"
          title="This compare page is useful for live decisions, with account continuity still being verified"
          description={`Use ${pair.left.name} vs ${pair.right.name} confidently for public decision support, while keeping auth continuity, premium workflow promises, and support follow-through honest until those live paths are fully verified.`}
          authReady="Signed-in continuity is active enough to carry stock comparisons into account and workspace flows."
          authPending="Account handoff is still being verified before it should be treated as fully reliable."
          billingReady="Billing core credentials exist, so premium compare workflow language can move beyond pure preview framing once checkout and webhook flows are exercised."
          billingPending="Billing credentials are still incomplete, so premium compare promises should stay expectation-setting."
          supportReady="Support delivery is configured enough to begin testing real follow-up for users who convert from comparison into assisted workflows."
          supportPending="Support delivery is still not fully active, so compare-route support expectations should stay conservative."
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
          secondaryHref="/account/support"
          secondaryHrefLabel="Open support continuity"
        />

        <div className="grid gap-6 xl:grid-cols-3">
          {matchupCards.map((card) => (
            <GlowCard key={card.title}>
              <p className="text-sm uppercase tracking-[0.18em] text-mist/52">{card.title}</p>
              <p className="mt-3 text-xl font-semibold text-white">{card.value}</p>
              <p className="mt-3 text-sm leading-7 text-mist/74">{card.detail}</p>
            </GlowCard>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <GlowCard className="space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm uppercase tracking-[0.18em] text-mist/56">Decision verdict</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">{topVerdict.headline}</h2>
                <p className="mt-3 text-sm leading-7 text-mist/74">{topVerdict.summary}</p>
              </div>
              <div className="rounded-full bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/82">
                {topVerdict.posture}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {topVerdict.lanes.map((lane) => (
                <div key={lane.label} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <p className="text-sm text-mist/66">{lane.label}</p>
                  <p className="mt-2 text-sm font-semibold text-white">{lane.value}</p>
                  <p className="mt-3 text-sm leading-7 text-mist/72">{lane.detail}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/stocks/${topVerdict.primarySlug}`}
                className="rounded-full border border-white/12 bg-white/[0.03] px-5 py-3 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                Review {topVerdict.primaryName}
              </Link>
              <Link
                href={`/sectors/${topVerdict.sectorSlug}`}
                className="rounded-full px-5 py-3 text-sm text-mist/74 transition hover:text-white"
              >
                Explore {topVerdict.sectorName}
              </Link>
            </div>
          </GlowCard>

          {[
            {
              stock: pair.left,
              ownershipLens: leftOwnershipLens,
              summary: quickTakeaways[0].points[0] ?? decisionSummary[pair.left.slug],
            },
            {
              stock: pair.right,
              ownershipLens: rightOwnershipLens,
              summary: quickTakeaways[1].points[0] ?? decisionSummary[pair.right.slug],
            },
          ].map(({ stock, ownershipLens, summary }) => (
            <GlowCard key={`${stock.slug}-best-for`} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-mist/52">Best for</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{stock.name}</h2>
                  <p className="mt-2 text-sm text-mist/68">{stock.sector}</p>
                </div>
                <div className="rounded-full bg-aurora/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-aurora">
                  {stock.change}
                </div>
              </div>
              <p className="text-sm leading-7 text-mist/74">{summary}</p>
              <div className="grid gap-3">
                {[
                  { label: "Momentum lens", value: cleanPublicCompareValue(stock.momentumLabel) },
                  { label: "ROE", value: cleanPublicCompareValue(stock.stats.find((item) => item.label === "ROE")?.value) },
                  { label: "Ownership posture", value: ownershipLens.posture },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                    <p className="text-sm text-mist/66">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
              <Link href={`/stocks/${stock.slug}`} className="inline-flex text-sm font-medium text-aurora transition hover:text-white">
                Open {stock.name}
              </Link>
            </GlowCard>
          ))}
        </div>

        <GlowCard className="space-y-5">
          <h2 className="text-2xl font-semibold text-white">Why this compare works</h2>
          <div className="grid gap-4 xl:grid-cols-3">
            {trustCards.map((card) => (
              <div key={card.title} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <p className="text-sm uppercase tracking-[0.18em] text-mist/52">{card.title}</p>
                <p className="mt-3 text-xl font-semibold text-white">{card.value}</p>
                <p className="mt-3 text-sm leading-7 text-mist/74">{card.detail}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <ShowcaseRouteStrip
          eyebrow="Keep the matchup moving"
          title="Alternate compare routes"
          description="Swap one side of the debate without resetting the stock story. These routes keep the same head-to-head flow while shifting quality, leverage, or sector framing."
          items={showcaseRoutes}
        />

        <div className="grid gap-4 xl:grid-cols-2">
          {[pair.left, pair.right].map((stock) => (
            <MarketDataStatusBadge
              key={stock.slug}
              title={`${stock.name} quote status`}
              status={stock.snapshotMeta?.marketLabel ?? "Not available yet"}
              detail={
                stock.snapshotMeta?.marketDetail ??
                "This compare route inherits its quote context from the underlying stock route snapshot."
              }
              source={stock.snapshotMeta?.source ?? null}
              updated={stock.snapshotMeta?.lastUpdated ?? null}
              tone={getSnapshotBadgeTone(stock.snapshotMeta?.mode)}
            />
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {[pair.left, pair.right].map((stock) => (
            <GlowCard key={stock.slug} className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-mist/52">{cleanPublicCompareValue(stock.sector)}</p>
                  <h2 className="mt-2 text-3xl font-semibold text-white">{stock.name}</h2>
                  <p className="mt-2 text-sm text-mist/68">{stock.symbol}</p>
                </div>
                <div className="rounded-full bg-aurora/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-aurora">
                  {cleanPublicCompareValue(stock.momentumLabel)}
                </div>
              </div>
              <p className="text-sm leading-7 text-mist/76">{stock.summary}</p>
              <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/74">
                {decisionSummary[stock.slug]}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                  <p className="text-sm text-mist/66">Quote</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{cleanPublicCompareValue(stock.price)}</p>
                  <p className="mt-2 text-sm text-aurora">{cleanPublicCompareValue(stock.change)}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <p className="text-sm text-mist/66">Quality lens</p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {cleanPublicCompareValue(stock.stats.find((item) => item.label === "ROE")?.value)}
                  </p>
                  <p className="mt-2 text-xs text-mist/62">
                    Debt / Equity: {cleanPublicCompareValue(stock.stats.find((item) => item.label === "Debt / Equity")?.value)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-mist/72">
                <Link href={`/stocks/${stock.slug}`} className="text-white transition hover:text-aurora">
                  Open stock page
                </Link>
                <span className="text-mist/35">•</span>
                <Link href={`/stocks/${stock.slug}/chart`} className="transition hover:text-white">
                  Open chart
                </Link>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard className="space-y-5">
          <h2 className="text-2xl font-semibold text-white">Decision lenses</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {compareLenses.map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76">
                {item}
              </div>
            ))}
          </div>
        </GlowCard>

        <ComparisonVisualGrid
          title="Visual scorecard"
          subtitle="A quick visual read of quality, leverage, scale, and current move so the page feels more like a market dashboard than a static document."
          metrics={visualMetrics}
          leftName={pair.left.name}
          rightName={pair.right.name}
        />

        <ComparisonBattleGrid
          title="Presentation snapshot"
          subtitle="A tighter matchup layer for screenshots and live demos. Each strip answers who leads, why it matters, and where the story is strongest right now."
          metrics={battleMetrics}
          leftName={pair.left.name}
          rightName={pair.right.name}
        />

        <GlowCard className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Ownership and participation posture</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-mist/74">
                This layer keeps the comparison grounded in who owns the story: promoter control, institutional sponsorship, and public participation all shift how the route should be narrated.
              </p>
            </div>
            <div className="rounded-full bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/82">
              {leftOwnershipLens.posture} vs {rightOwnershipLens.posture}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Promoter anchor",
                value: cleanPublicCompareValue(`${pair.left.name}: ${leftOwnershipLens.promoterHolding} • ${pair.right.name}: ${rightOwnershipLens.promoterHolding}`),
                detail: "Use this when control, stewardship, and long-cycle alignment matter to the audience.",
              },
              {
                label: "Institutional mix",
                value: cleanPublicCompareValue(`${pair.left.name}: ${leftOwnershipLens.institutionalHolding} • ${pair.right.name}: ${rightOwnershipLens.institutionalHolding}`),
                detail: "A faster read on whether institutions are leaning into one side more heavily.",
              },
              {
                label: "Public participation",
                value: cleanPublicCompareValue(`${pair.left.name}: ${leftOwnershipLens.publicHolding} • ${pair.right.name}: ${rightOwnershipLens.publicHolding}`),
                detail: "Helpful when the storyline is about breadth of interest, liquidity comfort, or retail heat.",
              },
              {
                label: "Ownership read",
                value: `${leftOwnershipLens.posture} vs ${rightOwnershipLens.posture}`,
                detail: "This compresses the cap-table framing into one quick headline before you open the detail route.",
              },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <p className="text-sm text-mist/66">{item.label}</p>
                <p className="mt-2 text-sm font-semibold leading-7 text-white">{item.value}</p>
                <p className="mt-3 text-sm leading-7 text-mist/72">{item.detail}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <ComparisonBattleGrid
          title="Ownership snapshot"
          subtitle="Promoter, institutional, and public participation now scan in the same screenshot-friendly strip format as the headline quality and tape comparison."
          metrics={ownershipBattleMetrics}
          leftName={pair.left.name}
          rightName={pair.right.name}
        />

        <div className="grid gap-6 xl:grid-cols-2">
          {[
            {
              stock: pair.left,
              lens: leftOwnershipLens,
              compareNote: `${pair.left.name} currently reads as ${leftOwnershipLens.posture.toLowerCase()}, which helps explain how the stock should be framed once the conversation moves beyond quote action.`,
            },
            {
              stock: pair.right,
              lens: rightOwnershipLens,
              compareNote: `${pair.right.name} currently reads as ${rightOwnershipLens.posture.toLowerCase()}, giving you a second ownership-led narrative instead of only price and ratio comparisons.`,
            },
          ].map(({ stock, lens, compareNote }) => (
            <GlowCard key={stock.slug} className="space-y-5">
              <div>
                <h2 className="text-2xl font-semibold text-white">{stock.name} research posture</h2>
                <p className="mt-2 text-sm leading-7 text-mist/74">{compareNote}</p>
              </div>

              <div className="grid gap-3">
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <p className="text-sm text-mist/66">Ownership posture</p>
                  <p className="mt-2 text-sm font-semibold text-white">{lens.posture}</p>
                  <p className="mt-2 text-xs text-mist/60">
                    {cleanPublicCompareValue(`Promoters: ${lens.promoterHolding} • Institutions: ${lens.institutionalHolding} • Public: ${lens.publicHolding}`)}
                  </p>
                </div>
                {stock.fundamentals.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm text-mist/66">{item.label}</p>
                      <p className="text-sm font-semibold text-white">{cleanPublicCompareValue(item.value)}</p>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-mist/72">{cleanPublicCompareValue(item.note)}</p>
                  </div>
                ))}
                <div className="grid gap-3 sm:grid-cols-2">
                  {stock.shareholding.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                      <p className="text-sm text-mist/66">{item.label}</p>
                      <p className="mt-2 text-sm font-semibold text-white">{cleanPublicCompareValue(item.value)}</p>
                      <p className="mt-2 text-xs leading-6 text-mist/60">{cleanPublicCompareValue(item.note)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <CompareRouteCard
            title={`More matchups from ${pair.left.name}`}
            description="Keep the walkthrough moving by swapping the right-hand side while staying anchored on the same left-hand stock."
            baseName={pair.left.name}
            detailHref={`/stocks/${pair.left.slug}`}
            detailLabel={`Open ${pair.left.name}`}
            candidates={leftCandidates}
          />
          <CompareRouteCard
            title={`More matchups from ${pair.right.name}`}
            description="Rotate into adjacent peers from the right-hand stock when you want to keep the sector story going without backing out to the stock hub."
            baseName={pair.right.name}
            detailHref={`/stocks/${pair.right.slug}`}
            detailLabel={`Open ${pair.right.name}`}
            candidates={rightCandidates}
          />
        </div>

        <GlowCard>
          <div className="overflow-hidden rounded-[24px] border border-white/8">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-white/[0.04] text-mist/70">
                <tr>
                  <th className="px-4 py-3 font-medium">Metric</th>
                  <th className="px-4 py-3 font-medium">{pair.left.name}</th>
                  <th className="px-4 py-3 font-medium">{pair.right.name}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row[0]} className="border-t border-white/8">
                    {row.map((cell, cellIndex) => (
                      <td key={`${row[0]}-${cellIndex}`} className="px-4 py-3 align-top text-mist/80">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlowCard>

        <div className="grid gap-6 xl:grid-cols-2">
          {quickTakeaways.map((item) => (
            <GlowCard key={item.title} className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
                <Link href={item.href} className="text-sm text-aurora transition hover:text-white">
                  Open page
                </Link>
              </div>
              <div className="grid gap-3">
                {item.points.map((point) => (
                  <div key={point} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                    {point}
                  </div>
                ))}
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Keep the walkthrough moving</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-mist/74">
              Use this compare page for the side-by-side story, then jump into the stronger name’s detail page or chart route when the audience wants proof, not just the headline verdict.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/stocks/${pair.left.slug}/chart`}
              className="rounded-full border border-white/12 bg-white/[0.03] px-5 py-3 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Open {pair.left.name} chart
            </Link>
            <Link
              href={`/stocks/${pair.right.slug}/chart`}
              className="rounded-full border border-white/12 bg-white/[0.03] px-5 py-3 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Open {pair.right.name} chart
            </Link>
          </div>
        </GlowCard>
            </div>
          }
          right={sidebar}
        />
      </ProductPageContainer>
    </div>
  );
}

function buildStockMatchupCards(left: StockSnapshot, right: StockSnapshot) {
  const leftRoeLabel = cleanPublicCompareValue(left.stats.find((item) => item.label === "ROE")?.value);
  const rightRoeLabel = cleanPublicCompareValue(right.stats.find((item) => item.label === "ROE")?.value);
  const leftDebtLabel = cleanPublicCompareValue(left.stats.find((item) => item.label === "Debt / Equity")?.value);
  const rightDebtLabel = cleanPublicCompareValue(right.stats.find((item) => item.label === "Debt / Equity")?.value);
  const leftRoe = parseMetricNumber(leftRoeLabel);
  const rightRoe = parseMetricNumber(rightRoeLabel);
  const leftDebt = parseMetricNumber(leftDebtLabel);
  const rightDebt = parseMetricNumber(rightDebtLabel);

  return [
    {
      title: "Quality edge",
      value:
        leftRoe !== null && rightRoe !== null
          ? leftRoe >= rightRoe
            ? left.name
            : right.name
          : "Needs richer feed",
      detail: `ROE currently reads ${leftRoeLabel} for ${left.name} versus ${rightRoeLabel} for ${right.name}.`,
    },
    {
      title: "Balance-sheet edge",
      value:
        leftDebt !== null && rightDebt !== null
          ? leftDebt <= rightDebt
            ? left.name
            : right.name
          : "Needs richer feed",
      detail: `Debt / Equity is ${leftDebtLabel} on the left versus ${rightDebtLabel} on the right.`,
    },
    {
      title: "Narrative edge",
      value: left.momentumLabel.length >= right.momentumLabel.length ? left.name : right.name,
      detail: `${left.name} is framed as "${cleanPublicCompareValue(left.momentumLabel)}" while ${right.name} reads "${cleanPublicCompareValue(right.momentumLabel)}".`,
    },
  ];
}

function buildStockDecisionSummary(left: StockSnapshot, right: StockSnapshot) {
  return {
    [left.slug]: `${left.name} is the better route when you want ${cleanPublicCompareValue(left.momentumLabel).toLowerCase()} exposure with ${cleanPublicCompareValue(left.sector).toLowerCase()} context and a cleaner jump into its dedicated research page.`,
    [right.slug]: `${right.name} is stronger when you want ${cleanPublicCompareValue(right.momentumLabel).toLowerCase()} framing with a direct path into chart-first follow-through and deeper stock-route detail.`,
  };
}

function buildStockDecisionVerdict(left: StockSnapshot, right: StockSnapshot) {
  const leftRoe = parseMetricNumber(cleanPublicCompareValue(left.stats.find((item) => item.label === "ROE")?.value));
  const rightRoe = parseMetricNumber(cleanPublicCompareValue(right.stats.find((item) => item.label === "ROE")?.value));
  const leftDebt = parseMetricNumber(cleanPublicCompareValue(left.stats.find((item) => item.label === "Debt / Equity")?.value));
  const rightDebt = parseMetricNumber(cleanPublicCompareValue(right.stats.find((item) => item.label === "Debt / Equity")?.value));
  const leftOwnership = getStockOwnershipLens(left);
  const rightOwnership = getStockOwnershipLens(right);
  const leftWins =
    (leftRoe !== null && rightRoe !== null && leftRoe >= rightRoe ? 1 : 0) +
    (leftDebt !== null && rightDebt !== null && leftDebt <= rightDebt ? 1 : 0) +
    (left.snapshotMeta?.mode === "delayed_snapshot" ? 1 : 0);
  const rightWins =
    (leftRoe !== null && rightRoe !== null && rightRoe > leftRoe ? 1 : 0) +
    (leftDebt !== null && rightDebt !== null && rightDebt < leftDebt ? 1 : 0) +
    (right.snapshotMeta?.mode === "delayed_snapshot" ? 1 : 0);
  const winner = leftWins >= rightWins ? left : right;
  const loser = winner.slug === left.slug ? right : left;
  const winnerOwnership = winner.slug === left.slug ? leftOwnership : rightOwnership;
  const winnerRoe = cleanPublicCompareValue(winner.stats.find((item) => item.label === "ROE")?.value);
  const winnerDebt = cleanPublicCompareValue(winner.stats.find((item) => item.label === "Debt / Equity")?.value);

  return {
    headline: `${winner.name} is the cleaner first recommendation for this matchup`,
    summary: `${winner.name} currently gives the stronger opening route when the walkthrough needs one name to lead: ${cleanPublicCompareValue(winner.momentumLabel).toLowerCase()} framing, ${winnerRoe} ROE, ${winnerDebt} debt/equity, and ${winnerOwnership.posture.toLowerCase()} all support a faster story before you open the other stock as the challenger.`,
    posture: `${winner.name} leads`,
    primarySlug: winner.slug,
    primaryName: winner.name,
    sectorSlug: slugify(winner.sector),
    sectorName: winner.sector,
    lanes: [
      {
        label: "Quality lead",
        value: winnerRoe,
        detail: `${winner.name} should lead when profitability quality matters more than a pure tape-reading comparison.`,
      },
      {
        label: "Balance-sheet read",
        value: winnerDebt,
        detail: `${winner.name} currently looks cleaner on leverage, while ${loser.name} remains the better challenger route if you want contrast.`,
      },
      {
        label: "Best fit",
        value: winnerOwnership.posture,
        detail: `Use ${winner.name} first when you want ${cleanPublicCompareValue(winner.sector).toLowerCase()} context with a more decision-ready ownership and momentum posture.`,
      },
    ],
  };
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function parseMetricNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "Pending" || trimmed === "Not available yet") return null;

  const normalized = trimmed.replace(/,/g, "").replace("%", "").trim();

  if (normalized.includes("L Cr")) {
    const parsed = Number.parseFloat(normalized.replace("L Cr", "").trim());
    return Number.isFinite(parsed) ? parsed * 100000 : null;
  }

  if (normalized.includes("Cr")) {
    const parsed = Number.parseFloat(normalized.replace("Cr", "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  const parsed = Number.parseFloat(normalized.replace(/[^\d.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function buildMetric(label: string, leftLabel: string, rightLabel: string, lowerIsBetter = false) {
  leftLabel = cleanPublicCompareValue(leftLabel);
  rightLabel = cleanPublicCompareValue(rightLabel);
  const leftValue = parseMetricNumber(leftLabel);
  const rightValue = parseMetricNumber(rightLabel);

  if (leftValue === null || rightValue === null) {
    return {
      label,
      leftLabel,
      rightLabel,
      leftScore: 20,
      rightScore: 20,
      note: "Visual weighting activates as richer numeric coverage expands.",
    };
  }

  const max = Math.max(leftValue, rightValue, 1);
  const min = Math.min(leftValue, rightValue, 0);

  if (lowerIsBetter) {
    const base = Math.max(max, 1);
    return {
      label,
      leftLabel,
      rightLabel,
      leftScore: 100 - (leftValue / base) * 82,
      rightScore: 100 - (rightValue / base) * 82,
      note: "Lower leverage reads stronger here.",
    };
  }

  const spread = Math.max(max - min, 1);
  return {
    label,
    leftLabel,
    rightLabel,
    leftScore: 18 + ((leftValue - min) / spread) * 82,
    rightScore: 18 + ((rightValue - min) / spread) * 82,
  };
}

function buildBattleMetric(
  label: string,
  leftLabel: string,
  rightLabel: string,
  note: string,
  lowerIsBetter = false,
): ComparisonBattleMetric {
  leftLabel = cleanPublicCompareValue(leftLabel);
  rightLabel = cleanPublicCompareValue(rightLabel);
  const leftValue = parseMetricNumber(leftLabel);
  const rightValue = parseMetricNumber(rightLabel);

  if (leftValue === null || rightValue === null) {
    return {
      label,
      leftLabel,
      rightLabel,
      leftScore: 22,
      rightScore: 22,
      winner: "none" as const,
      note: "This presentation strip upgrades automatically once both sides have richer numeric coverage.",
    };
  }

  const max = Math.max(leftValue, rightValue, 1);
  const min = Math.min(leftValue, rightValue, 0);
  const spread = Math.max(max - min, 1);
  const leftScore = lowerIsBetter
    ? 18 + ((max - leftValue) / spread) * 82
    : 18 + ((leftValue - min) / spread) * 82;
  const rightScore = lowerIsBetter
    ? 18 + ((max - rightValue) / spread) * 82
    : 18 + ((rightValue - min) / spread) * 82;
  const winner: ComparisonBattleMetric["winner"] =
    Math.abs(leftScore - rightScore) < 4 ? "tie" : leftScore > rightScore ? "left" : "right";

  return {
    label,
    leftLabel,
    rightLabel,
    leftScore,
    rightScore,
    winner,
    note,
  };
}

function getSnapshotBadgeTone(mode: NonNullable<StockSnapshot["snapshotMeta"]>["mode"] | undefined) {
  if (mode === "delayed_snapshot") {
    return "verified" as const;
  }

  if (mode === "manual_close") {
    return "degraded" as const;
  }

  if (mode === "fallback") {
    return "pending" as const;
  }

  return "pending" as const;
}
