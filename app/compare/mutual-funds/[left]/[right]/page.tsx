import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { type ComparisonBattleMetric, ComparisonBattleGrid } from "@/components/comparison-battle-grid";
import { CompareRouteCard } from "@/components/compare-route-card";
import { ComparisonVisualGrid } from "@/components/comparison-visual-grid";
import { JsonLd } from "@/components/json-ld";
import { MarketDataStatusBadge } from "@/components/market-data-status-badge";
import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import { ShowcaseRouteStrip } from "@/components/showcase-route-strip";
import { Container, Eyebrow, GlowCard } from "@/components/ui";
import { getFundCompareCandidates, getFundComparePair } from "@/lib/asset-insights";
import { getCanonicalFundCompareHref } from "@/lib/compare-routing";
import { getFunds } from "@/lib/content";
import { getFundOverlapLens, getFundPortfolioLens, getFundReturnValue } from "@/lib/fund-research";
import { getFundCompareTrustCards } from "@/lib/market-truth";
import type { FundSnapshot } from "@/lib/mock-data";
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
  const pair = await getFundComparePair(left, right);

  if (!pair) {
    return { title: "Compare mutual funds" };
  }

  return {
    title: `${pair.left.name} vs ${pair.right.name}`,
    description: `Compare ${pair.left.name} and ${pair.right.name} on category fit, cost, returns, and portfolio posture.`,
  };
}

export default async function FundComparePage({ params }: PageProps) {
  const { left, right } = await params;
  const [funds, pair, leftCandidates, rightCandidates] = await Promise.all([
    getFunds(),
    getFundComparePair(left, right),
    getFundCompareCandidates(left, { excludeSlug: right, limit: 3 }),
    getFundCompareCandidates(right, { excludeSlug: left, limit: 3 }),
  ]);

  if (!pair) {
    notFound();
  }

  const canonicalHref = getCanonicalFundCompareHref(funds, left, right);

  if (canonicalHref && canonicalHref !== `/compare/mutual-funds/${left}/${right}`) {
    redirect(canonicalHref);
  }

  const rows = [
    ["Category", cleanPublicCompareValue(pair.left.category), cleanPublicCompareValue(pair.right.category)],
    ["Latest NAV", cleanPublicCompareValue(pair.left.nav), cleanPublicCompareValue(pair.right.nav)],
    ["1Y return", cleanPublicCompareValue(pair.left.returns1Y), cleanPublicCompareValue(pair.right.returns1Y)],
    ["Risk label", cleanPublicCompareValue(pair.left.riskLabel), cleanPublicCompareValue(pair.right.riskLabel)],
    ["Benchmark", cleanPublicCompareValue(pair.left.benchmark), cleanPublicCompareValue(pair.right.benchmark)],
    ["AUM", cleanPublicCompareValue(pair.left.aum), cleanPublicCompareValue(pair.right.aum)],
    ["Expense ratio", cleanPublicCompareValue(pair.left.expenseRatio), cleanPublicCompareValue(pair.right.expenseRatio)],
  ];
  const compareLenses = [
    "Use this page when you want to explain fit, cost, and risk before going deep into documents and factsheets.",
    "The compare route keeps headline performance in context by pairing it with category, benchmark, and style posture.",
    "Both funds still link back into their full pages for holdings, sector allocation, and manager context.",
  ];
  const quickTakeaways = [
    {
      title: `${pair.left.name} fits better when`,
      points: pair.left.keyPoints.slice(0, 3),
      href: `/mutual-funds/${pair.left.slug}`,
    },
    {
      title: `${pair.right.name} fits better when`,
      points: pair.right.keyPoints.slice(0, 3),
      href: `/mutual-funds/${pair.right.slug}`,
    },
  ];
  const path = `/compare/mutual-funds/${left}/${right}`;
  const matchupCards = buildFundMatchupCards(pair.left, pair.right);
  const decisionSummary = buildFundDecisionSummary(pair.left, pair.right);
  const leftPortfolioLens = getFundPortfolioLens(pair.left);
  const rightPortfolioLens = getFundPortfolioLens(pair.right);
  const overlapLens = getFundOverlapLens(pair.left, pair.right);
  const trustCards = getFundCompareTrustCards(pair.left, pair.right);
  const visualMetrics = [
    buildFundMetric("1Y return", pair.left.returns1Y, pair.right.returns1Y),
    buildFundMetric(
      "3Y return",
      getFundReturnValue(pair.left, "3Y"),
      getFundReturnValue(pair.right, "3Y"),
    ),
    buildFundMetric("Expense ratio", pair.left.expenseRatio, pair.right.expenseRatio, true),
    buildFundMetric("AUM scale", pair.left.aum, pair.right.aum),
  ];
  const battleMetrics = [
    buildFundBattleMetric(
      "1Y return edge",
      pair.left.returns1Y,
      pair.right.returns1Y,
      "This gives the fastest performance-first read before the comparison moves into cost, fit, and category nuance.",
    ),
    buildFundBattleMetric(
      "3Y consistency",
      getFundReturnValue(pair.left, "3Y"),
      getFundReturnValue(pair.right, "3Y"),
      "Three-year returns help the route feel less like a recent-performance snapshot and more like an allocator decision surface.",
    ),
    buildFundBattleMetric(
      "Cost drag",
      pair.left.expenseRatio,
      pair.right.expenseRatio,
      "Lower expense ratio reads stronger when both funds serve a similar role in a shortlist.",
      true,
    ),
    buildFundBattleMetric(
      "AUM confidence",
      pair.left.aum,
      pair.right.aum,
      "AUM scale helps explain establishment, liquidity comfort, and how seasoned the strategy feels in a screenshot.",
    ),
  ];
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Mutual Funds", href: "/mutual-funds" },
    { name: "Compare", href: path },
  ];
  const topVerdict = buildFundAllocatorVerdict(pair.left, pair.right, overlapLens);
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

  return (
    <div className="riddra-member-page py-16 sm:py-24">
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <JsonLd
        data={buildWebPageSchema({
          title: `${pair.left.name} vs ${pair.right.name}`,
          description: `Compare ${pair.left.name} and ${pair.right.name} on Riddra.`,
          path,
        })}
      />
      <Container className="space-y-8">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Fund comparison</Eyebrow>
          <h1 className="display-font text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {pair.left.name} vs {pair.right.name}
          </h1>
          <p className="max-w-3xl text-base leading-8 text-mist/76">
            Compare two mutual funds side by side on category fit, risk, cost, returns, and portfolio posture before you commit to a deeper shortlist.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/mutual-funds/${pair.left.slug}`}
              className="rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Open {pair.left.name}
            </Link>
            <Link
              href={`/mutual-funds/${pair.right.slug}`}
              className="rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Open {pair.right.name}
            </Link>
          </div>
        </div>

        <PublicSurfaceTruthSection
          eyebrow="Fund compare truth"
          title="This compare page is useful for shortlist decisions, with account continuity still being verified"
          description={`Use ${pair.left.name} vs ${pair.right.name} confidently for public allocator decisions, while keeping auth continuity, premium workflow promises, and support follow-through honest until those live paths are fully verified.`}
          authReady="Signed-in continuity is active enough to carry fund comparisons into account and workspace flows."
          authPending="Account handoff is still being verified before it should be treated as fully reliable."
          billingReady="Billing core credentials exist, so premium compare workflow language can move beyond pure preview framing once checkout and webhook flows are exercised."
          billingPending="Billing credentials are still incomplete, so premium compare promises should stay expectation-setting."
          supportReady="Support delivery is configured enough to begin testing real follow-up for users who convert from comparison into assisted allocation workflows."
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
                <p className="text-sm uppercase tracking-[0.18em] text-mist/56">Allocator verdict</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">{topVerdict.headline}</h2>
                <p className="mt-3 text-sm leading-7 text-mist/74">{topVerdict.summary}</p>
              </div>
              <div className="rounded-full bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/82">
                {overlapLens.posture}
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
                href={`/mutual-funds/${topVerdict.primarySlug}`}
                className="rounded-full border border-white/12 bg-white/[0.03] px-5 py-3 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                Review {topVerdict.primaryName}
              </Link>
              <Link
                href={`/fund-categories/${topVerdict.categorySlug}`}
                className="rounded-full px-5 py-3 text-sm text-mist/74 transition hover:text-white"
              >
                Explore {pair.left.category}
              </Link>
            </div>
          </GlowCard>

          {[
            {
              fund: pair.left,
              lens: leftPortfolioLens,
              summary: quickTakeaways[0].points[0] ?? decisionSummary[pair.left.slug],
            },
            {
              fund: pair.right,
              lens: rightPortfolioLens,
              summary: quickTakeaways[1].points[0] ?? decisionSummary[pair.right.slug],
            },
          ].map(({ fund, lens, summary }) => (
            <GlowCard key={`${fund.slug}-best-for`} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-mist/52">Best for</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{fund.name}</h2>
                  <p className="mt-2 text-sm text-mist/68">{cleanPublicCompareValue(fund.category)}</p>
                </div>
                <div className="rounded-full bg-aurora/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-aurora">
                  {cleanPublicCompareValue(fund.returns1Y)}
                </div>
              </div>
              <p className="text-sm leading-7 text-mist/74">{summary}</p>
              <div className="grid gap-3">
                {[
                  { label: "Risk fit", value: cleanPublicCompareValue(fund.riskLabel) },
                  { label: "Expense ratio", value: cleanPublicCompareValue(fund.expenseRatio) },
                  { label: "Top-book posture", value: lens.concentrationLabel },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                    <p className="text-sm text-mist/66">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
              <Link href={`/mutual-funds/${fund.slug}`} className="inline-flex text-sm font-medium text-aurora transition hover:text-white">
                Open {fund.name}
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
          eyebrow="Keep the shortlist moving"
          title="Alternate compare routes"
          description="Swap one side of the matchup without rebuilding the investor story. These routes preserve the same allocator framing while shifting category, cost, or overlap posture."
          items={showcaseRoutes}
        />

        <div className="grid gap-4 xl:grid-cols-2">
          {[pair.left, pair.right].map((fund) => (
            <MarketDataStatusBadge
              key={fund.slug}
              title={`${fund.name} NAV status`}
              status={fund.snapshotMeta?.marketLabel ?? "Not available yet"}
              detail={
                fund.snapshotMeta?.marketDetail ??
                "This compare route inherits its NAV context from the underlying fund route snapshot."
              }
              source={fund.snapshotMeta?.source ?? null}
              updated={fund.snapshotMeta?.lastUpdated ?? null}
              tone={getSnapshotBadgeTone(fund.snapshotMeta?.mode)}
            />
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {[pair.left, pair.right].map((fund) => (
            <GlowCard key={`${fund.slug}-factsheet`} className="space-y-3">
              <p className="text-sm uppercase tracking-[0.18em] text-mist/52">Factsheet workflow</p>
              <p className="text-xl font-semibold text-white">{fund.factsheetMeta ? fund.factsheetMeta.documentLabel : "AMC evidence pending"}</p>
              <p className="text-sm leading-7 text-mist/74">
                {fund.factsheetMeta
                  ? `${fund.factsheetMeta.amcName} · ${fund.factsheetMeta.source} · ${fund.factsheetMeta.sourceDate}`
                  : "This compare route will surface AMC factsheet evidence once the document workflow is captured through the source-entry lane."}
              </p>
              {fund.factsheetMeta?.referenceUrl ? (
                <Link href={fund.factsheetMeta.referenceUrl} className="text-sm font-medium text-aurora transition hover:text-white">
                  Open reference
                </Link>
              ) : null}
            </GlowCard>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {[pair.left, pair.right].map((fund) => (
            <GlowCard key={fund.slug} className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-mist/52">{cleanPublicCompareValue(fund.category)}</p>
                  <h2 className="mt-2 text-3xl font-semibold text-white">{fund.name}</h2>
                  <p className="mt-2 text-sm text-mist/68">{cleanPublicCompareValue(fund.benchmark)}</p>
                </div>
                <div className="rounded-full bg-aurora/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-aurora">
                  {cleanPublicCompareValue(fund.returns1Y)}
                </div>
              </div>
              <p className="text-sm leading-7 text-mist/76">{fund.summary}</p>
              <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/74">
                {decisionSummary[fund.slug]}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                  <p className="text-sm text-mist/66">Latest NAV</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{cleanPublicCompareValue(fund.nav)}</p>
                  <p className="mt-2 text-sm text-aurora">{cleanPublicCompareValue(fund.returns1Y)} in 1Y</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <p className="text-sm text-mist/66">Cost and risk</p>
                  <p className="mt-2 text-sm font-semibold text-white">{cleanPublicCompareValue(fund.expenseRatio)}</p>
                  <p className="mt-2 text-xs text-mist/62">Risk: {cleanPublicCompareValue(fund.riskLabel)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-mist/72">
                <Link href={`/mutual-funds/${fund.slug}`} className="text-white transition hover:text-aurora">
                  Open fund page
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
          subtitle="A faster visual lens on return, cost, and scale so the route feels like a real allocator workflow instead of only a text comparison page."
          metrics={visualMetrics}
          leftName={pair.left.name}
          rightName={pair.right.name}
        />

        <ComparisonBattleGrid
          title="Allocator snapshot"
          subtitle="Use this strip set when you want the compare route to scan quickly in screenshots: return, consistency, cost, and scale all resolve in one compact frame."
          metrics={battleMetrics}
          leftName={pair.left.name}
          rightName={pair.right.name}
        />

        <GlowCard className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Portfolio overlap and positioning</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-mist/74">
                This compare layer now checks whether the two funds are genuinely different or mostly alternate wrappers around the same exposure.
              </p>
            </div>
            <div className="rounded-full bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/82">
              {overlapLens.posture}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Shared holdings",
                value: `${overlapLens.sharedHoldingsCount} names`,
                detail: "Exact stock overlap across the visible top holdings list.",
              },
              {
                label: "Holding overlap weight",
                value: overlapLens.holdingOverlapWeight,
                detail: "Minimum shared exposure across identical positions in both funds.",
              },
              {
                label: "Shared sector weight",
                value: overlapLens.sharedSectorWeight,
                detail: "How much of the sector stance overlaps even when stock selection differs.",
              },
              {
                label: "Dominant shared sector",
                value: overlapLens.dominantSharedSector ?? "No meaningful sector overlap",
                detail: "The main area where allocator posture still looks similar.",
              },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <p className="text-sm text-mist/66">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
                <p className="mt-3 text-sm leading-7 text-mist/72">{item.detail}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-white">Shared holdings</h3>
                <span className="text-xs uppercase tracking-[0.16em] text-mist/56">Top-book cross check</span>
              </div>
              <div className="mt-4 grid gap-3">
                {overlapLens.holdingRows.length ? (
                  overlapLens.holdingRows.map((item) => (
                    <div key={item.name} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold text-white">{item.name}</p>
                        <p className="text-xs uppercase tracking-[0.16em] text-aurora">{item.overlapWeight} shared</p>
                      </div>
                      <p className="mt-2 text-sm leading-7 text-mist/72">
                        {pair.left.name}: {item.leftWeight} • {pair.right.name}: {item.rightWeight}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-mist/70">
                    No exact top-holding overlap appears in the current visible holdings set, which is useful when you want differentiated stock selection despite some category similarity.
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-white">Sector posture</h3>
                <span className="text-xs uppercase tracking-[0.16em] text-mist/56">Where exposures converge</span>
              </div>
              <div className="mt-4 grid gap-3">
                {overlapLens.sectorRows.map((item) => (
                  <div key={item.name} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-semibold text-white">{item.name}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-aurora">{item.sharedWeight} shared</p>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-mist/72">
                      {pair.left.name}: {item.leftWeight} • {pair.right.name}: {item.rightWeight}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </GlowCard>

        <div className="grid gap-6 xl:grid-cols-2">
          {[
            {
              fund: pair.left,
              lens: leftPortfolioLens,
              compareNote: `${pair.left.name} keeps ${leftPortfolioLens.topHoldingsConcentration} in the visible top book, with ${leftPortfolioLens.dominantSector.toLowerCase()} as the clearest allocation anchor.`,
            },
            {
              fund: pair.right,
              lens: rightPortfolioLens,
              compareNote: `${pair.right.name} carries ${rightPortfolioLens.topHoldingsConcentration} in the visible top book, with ${rightPortfolioLens.dominantSector.toLowerCase()} as the main allocation tilt.`,
            },
          ].map(({ fund, lens, compareNote }) => (
            <GlowCard key={fund.slug}>
              <h2 className="text-2xl font-semibold text-white">{fund.name} portfolio posture</h2>
              <div className="mt-5 grid gap-3">
                {[
                  { label: "Top holdings concentration", value: lens.topHoldingsConcentration },
                  { label: "Concentration read", value: lens.concentrationLabel },
                  { label: "Dominant sector", value: `${lens.dominantSector} • ${lens.dominantSectorWeight}` },
                  { label: "Sector breadth", value: lens.sectorBreadth },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                    <p className="text-sm text-mist/66">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-sm leading-7 text-mist/74">{compareNote}</p>
            </GlowCard>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <CompareRouteCard
            title={`More matchups from ${pair.left.name}`}
            description="Swap the comparison shortlist from the left-hand fund when you want to keep explaining allocator fit without resetting the narrative."
            baseName={pair.left.name}
            detailHref={`/mutual-funds/${pair.left.slug}`}
            detailLabel={`Open ${pair.left.name}`}
            candidates={leftCandidates}
          />
          <CompareRouteCard
            title={`More matchups from ${pair.right.name}`}
            description="Rotate into adjacent peers from the right-hand fund so the compare route keeps behaving like a decision workflow instead of a one-off page."
            baseName={pair.right.name}
            detailHref={`/mutual-funds/${pair.right.slug}`}
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
            <h2 className="text-2xl font-semibold text-white">Use compare, then confirm on the detail route</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-mist/74">
              This page is now strong enough for the allocator story. Move into the winning fund’s detail page when you need holdings, sector allocation, manager context, and a more durable investor explanation.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/mutual-funds/${pair.left.slug}`}
              className="rounded-full border border-white/12 bg-white/[0.03] px-5 py-3 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Review {pair.left.name}
            </Link>
            <Link
              href={`/mutual-funds/${pair.right.slug}`}
              className="rounded-full border border-white/12 bg-white/[0.03] px-5 py-3 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Review {pair.right.name}
            </Link>
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}

function buildFundMatchupCards(left: FundSnapshot, right: FundSnapshot) {
  const leftReturnLabel = cleanPublicCompareValue(left.returns1Y);
  const rightReturnLabel = cleanPublicCompareValue(right.returns1Y);
  const leftCostLabel = cleanPublicCompareValue(left.expenseRatio);
  const rightCostLabel = cleanPublicCompareValue(right.expenseRatio);
  const leftReturn = parseFundMetricNumber(leftReturnLabel);
  const rightReturn = parseFundMetricNumber(rightReturnLabel);
  const leftCost = parseFundMetricNumber(leftCostLabel);
  const rightCost = parseFundMetricNumber(rightCostLabel);

  return [
    {
      title: "Return edge",
      value:
        leftReturn !== null && rightReturn !== null
          ? leftReturn >= rightReturn
            ? left.name
            : right.name
          : "Needs richer feed",
      detail: `${left.name} shows ${leftReturnLabel} versus ${rightReturnLabel} for ${right.name}.`,
    },
    {
      title: "Cost edge",
      value:
        leftCost !== null && rightCost !== null
          ? leftCost <= rightCost
            ? left.name
            : right.name
          : "Needs richer feed",
      detail: `Expense ratio reads ${leftCostLabel} on the left versus ${rightCostLabel} on the right.`,
    },
    {
      title: "Fit framing",
      value: left.category === right.category ? left.category : `${left.category} vs ${right.category}`,
      detail: `${left.name} carries ${cleanPublicCompareValue(left.riskLabel).toLowerCase()} risk while ${right.name} carries ${cleanPublicCompareValue(right.riskLabel).toLowerCase()} risk.`,
    },
  ];
}

function buildFundDecisionSummary(left: FundSnapshot, right: FundSnapshot) {
  return {
    [left.slug]: `${left.name} fits better when you want ${cleanPublicCompareValue(left.category).toLowerCase()} exposure with ${cleanPublicCompareValue(left.riskLabel).toLowerCase()} framing and a clean jump into holdings and manager context.`,
    [right.slug]: `${right.name} is stronger when you want ${cleanPublicCompareValue(right.category).toLowerCase()} exposure with ${cleanPublicCompareValue(right.riskLabel).toLowerCase()} framing and a clearer benchmark-led explanation.`,
  };
}

function buildFundAllocatorVerdict(left: FundSnapshot, right: FundSnapshot, overlapLens: ReturnType<typeof getFundOverlapLens>) {
  const leftReturn = parseFundMetricNumber(cleanPublicCompareValue(left.returns1Y));
  const rightReturn = parseFundMetricNumber(cleanPublicCompareValue(right.returns1Y));
  const leftCost = parseFundMetricNumber(cleanPublicCompareValue(left.expenseRatio));
  const rightCost = parseFundMetricNumber(cleanPublicCompareValue(right.expenseRatio));
  const returnLeader =
    leftReturn !== null && rightReturn !== null ? (leftReturn >= rightReturn ? left : right) : null;
  const costLeader = leftCost !== null && rightCost !== null ? (leftCost <= rightCost ? left : right) : null;
  const primary =
    returnLeader && costLeader && returnLeader.slug === costLeader.slug
      ? returnLeader
      : costLeader ?? returnLeader ?? left;

  return {
    headline: `${primary.name} is the cleaner first follow-up when you want one fund to carry the shortlist story.`,
    summary:
      primary.slug === left.slug
        ? `${left.name} currently gives the stronger combined read across the visible return, cost, and category framing, while ${right.name} still matters if you want a different benchmark or portfolio stance.`
        : `${right.name} currently gives the stronger combined read across the visible return, cost, and category framing, while ${left.name} still matters if you want a different benchmark or portfolio stance.`,
    primarySlug: primary.slug,
    primaryName: primary.name,
    categorySlug: left.category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
    lanes: [
      {
        label: "Return leader",
        value: returnLeader?.name ?? "Needs richer return history",
        detail: returnLeader ? `${cleanPublicCompareValue(returnLeader.returns1Y)} 1Y keeps the performance case simple at the top of the page.` : "The route needs richer return history before a clear leader should be implied.",
      },
      {
        label: "Cost leader",
        value: costLeader?.name ?? "Needs richer cost context",
        detail: costLeader ? `${cleanPublicCompareValue(costLeader.expenseRatio)} expense ratio reads cleaner when both funds serve a similar allocator role.` : "The route needs clearer cost coverage before a cost winner should be implied.",
      },
      {
        label: "Overlap posture",
        value: overlapLens.posture,
        detail:
          overlapLens.sharedHoldingsCount > 0
            ? `${overlapLens.sharedHoldingsCount} shared holdings and ${overlapLens.sharedSectorWeight} shared sector weight show how much of the shortlist is genuinely different.`
            : "Visible top holdings do not overlap directly, so the shortlist still presents meaningfully different stock-selection posture.",
      },
    ],
  };
}

function parseFundMetricNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "Pending" || trimmed === "Not available yet") return null;

  const normalized = trimmed.replace(/,/g, "").replace("%", "").trim();

  if (normalized.includes("Cr")) {
    const parsed = Number.parseFloat(normalized.replace("Cr", "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  const parsed = Number.parseFloat(normalized.replace(/[^\d.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function buildFundMetric(label: string, leftLabel: string, rightLabel: string, lowerIsBetter = false) {
  leftLabel = cleanPublicCompareValue(leftLabel);
  rightLabel = cleanPublicCompareValue(rightLabel);
  const leftValue = parseFundMetricNumber(leftLabel);
  const rightValue = parseFundMetricNumber(rightLabel);

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
      note: "Lower cost reads stronger here.",
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

function buildFundBattleMetric(
  label: string,
  leftLabel: string,
  rightLabel: string,
  note: string,
  lowerIsBetter = false,
): ComparisonBattleMetric {
  leftLabel = cleanPublicCompareValue(leftLabel);
  rightLabel = cleanPublicCompareValue(rightLabel);
  const leftValue = parseFundMetricNumber(leftLabel);
  const rightValue = parseFundMetricNumber(rightLabel);

  if (leftValue === null || rightValue === null) {
    return {
      label,
      leftLabel,
      rightLabel,
      leftScore: 22,
      rightScore: 22,
      winner: "none" as const,
      note: "This presentation strip upgrades automatically once both funds carry richer numeric history.",
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

function getSnapshotBadgeTone(mode: NonNullable<FundSnapshot["snapshotMeta"]>["mode"] | undefined) {
  if (mode === "delayed_snapshot") {
    return "verified" as const;
  }

  if (mode === "manual_nav") {
    return "degraded" as const;
  }

  if (mode === "fallback") {
    return "pending" as const;
  }

  return "pending" as const;
}
