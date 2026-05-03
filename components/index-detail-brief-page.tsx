import Link from "next/link";
import type { ReactNode } from "react";

import { getGlobalSidebarRail } from "@/components/global-sidebar-rail-server";
import { JsonLd } from "@/components/json-ld";
import { ManagedSharedSidebarStack } from "@/components/managed-shared-sidebar-stack";
import { MarketSnapshotSidebar } from "@/components/market-snapshot-system";
import { UserContentActionCard } from "@/components/user-content-action-card";
import {
  ProductBulletListCard,
  CategoryRankBadge,
  CtaBlock,
  ExposureStrip,
  HeroPriceBlock,
  MainChartContainer,
  ProductCard,
  ProductDataTableCard,
  ProductInsightGridCard,
  ProductRouteGrid,
  ProductRouteRailCard,
  ProductResearchStrip,
  ProductEditorialCluster,
  ProductPageShell,
  ProductPageTwoColumnLayout,
  ProductReadingStrip,
  ProductSectionTitle,
  ProductTruthBadge,
  QuickStatsCard,
  SimilarAssetsRow,
  StickyTabBar,
} from "@/components/product-page-system";
import {
  getIndexSnapshot,
  getIndexSnapshots,
  getIndexWeightRoster,
  type IndexWeightRoster,
} from "@/lib/index-content";
import { getStocks } from "@/lib/content";
import type { IndexComponent, IndexSnapshot } from "@/lib/index-intelligence";
import { getMarketSnapshotGroups, type MarketSnapshotGroup } from "@/lib/market-snapshot-system";
import {
  formatProductPercent,
  type ProductTruthState,
} from "@/lib/product-page-design";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";
import { getSourceByCode } from "@/lib/source-registry";

type RelatedIndexCard = {
  name: string;
  change1Y: string;
  ratioLabel: string;
  ratioValue: string;
  sparklinePoints?: number[];
  href: string;
  hrefLabel: string;
};

type IndexRouteConfig = {
  slug: IndexSnapshot["slug"];
  title: string;
  description: string;
  path: string;
  sourceCode: string;
};

const indexRouteConfig: Record<IndexSnapshot["slug"], IndexRouteConfig> = {
  nifty50: {
    slug: "nifty50",
    title: "Nifty 50",
    description: "Nifty 50 research page for weighted breadth and market mood.",
    path: "/nifty50",
    sourceCode: "nse_index",
  },
  sensex: {
    slug: "sensex",
    title: "Sensex",
    description: "Sensex research page for weighted breadth and daily market tone.",
    path: "/sensex",
    sourceCode: "bse_sensex",
  },
  banknifty: {
    slug: "banknifty",
    title: "Bank Nifty",
    description: "Bank Nifty research page for weighted breadth and banking sentiment.",
    path: "/banknifty",
    sourceCode: "nse_bank_index",
  },
  finnifty: {
    slug: "finnifty",
    title: "Fin Nifty",
    description:
      "Fin Nifty research page for weighted breadth and financial-services sentiment.",
    path: "/finnifty",
    sourceCode: "nse_financial_services_index",
  },
};

function formatSignedScore(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

function formatPlainPercent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}

function getIndexTruthState(snapshot: IndexSnapshot): ProductTruthState {
  const detail = `${snapshot.marketDetail} ${snapshot.officialSyncNote}`.toLowerCase();

  if (detail.includes("only reflects") || detail.includes("partial live component coverage")) {
    return "partial";
  }

  if (snapshot.dataMode === "manual") {
    return "delayed_snapshot";
  }

  if (snapshot.dataMode === "verified") {
    return "verified";
  }

  return "unavailable";
}

function getTimelinePoints(snapshot: IndexSnapshot) {
  if (snapshot.historyBars && snapshot.historyBars.length > 1) {
    const firstClose = snapshot.historyBars[0]?.close ?? 0;

    if (firstClose > 0) {
      return snapshot.historyBars.map((bar) => ({
        label: bar.date,
        value: ((bar.close / firstClose) - 1) * 100,
        changeFromStart: ((bar.close / firstClose) - 1) * 100,
      }));
    }
  }

  if (snapshot.timeline.length < 2) {
    return [];
  }

  const firstMove = snapshot.timeline[0]?.movePercent ?? 0;

  return snapshot.timeline.map((point) => ({
    label: point.timeLabel,
    value: point.movePercent,
    changeFromStart: point.movePercent - firstMove,
  }));
}

function buildIndexChartEmptyState(snapshot: IndexSnapshot) {
  if (snapshot.dataMode === "manual") {
    return {
      state: "delayed_snapshot" as const,
      title: "Session timeline is only partially retained",
      description:
        "A retained delayed benchmark snapshot is available, but a fuller multi-point session timeline has not been written for this route yet.",
    };
  }

  if (getIndexTruthState(snapshot) === "partial") {
    return {
      state: "unavailable" as const,
      title: "Partial index timeline",
      description:
        "This benchmark has a current snapshot, but the visible component coverage is only partial. The timeline stays withheld when it would overstate how complete the session read is.",
    };
  }

  return {
    state: "unavailable" as const,
    title: "Awaiting benchmark history",
    description:
      "This benchmark does not yet have retained daily benchmark history, so the page withholds the chart instead of drawing an implied benchmark path.",
  };
}

function describeTimelineCoverage(snapshot: IndexSnapshot) {
  if (snapshot.historyBars && snapshot.historyBars.length > 1) {
    const first = snapshot.historyBars[0]?.date;
    const last = snapshot.historyBars[snapshot.historyBars.length - 1]?.date;

    return `${first ?? "Start"} to ${last ?? "Latest"} • ${snapshot.historyBars.length} points`;
  }

  if (snapshot.timeline.length < 2) {
    return "Data pending";
  }

  const first = snapshot.timeline[0];
  const last = snapshot.timeline[snapshot.timeline.length - 1];

  return `${first?.timeLabel ?? "Open"} to ${last?.timeLabel ?? "Latest"} • ${snapshot.timeline.length} points`;
}

function buildRelatedIndices(currentSlug: IndexSnapshot["slug"], snapshots: IndexSnapshot[]) {
  return snapshots
    .filter((item) => item.slug !== currentSlug)
    .slice(0, 4)
    .map(
      (item): RelatedIndexCard => ({
        name: item.title,
        change1Y: formatProductPercent(item.movePercent, 2, "Data pending"),
        ratioLabel: "Positive weight",
        ratioValue: formatPlainPercent(item.positiveWeightShare, 1),
        sparklinePoints:
          item.timeline.length > 1 ? item.timeline.map((point) => point.movePercent) : undefined,
        href: indexRouteConfig[item.slug].path,
        hrefLabel: "View index",
      }),
    );
}

function getLeadershipRows(items: IndexComponent[]) {
  if (!items.length) {
    return (
      <p className="riddra-product-body text-sm leading-7 text-[rgba(107,114,128,0.9)]">
        No verified component leadership rows are available for this index yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={`${item.symbol}-${item.name}`}
          className="flex items-center justify-between gap-4 rounded-[8px] border border-[#E2DED9] px-4 py-3"
        >
          <div>
            <p className="riddra-product-body text-sm font-medium text-[#1B3A6B]">{item.name}</p>
            <p className="riddra-product-body mt-1 text-xs text-[rgba(107,114,128,0.84)]">
              {item.symbol} • {item.weight.toFixed(2)}% weight
            </p>
          </div>
          <p
            className="riddra-product-number text-sm font-medium"
            style={{ color: item.changePercent >= 0 ? "#1A7F4B" : "#C0392B" }}
          >
            {formatProductPercent(item.changePercent, 2, "Data pending")}
          </p>
        </div>
      ))}
    </div>
  );
}

function formatWeightShare(value: number) {
  return `${value.toFixed(2)}%`;
}

function buildIndexSignalRows(snapshot: IndexSnapshot) {
  const strongestGainer = [...snapshot.components]
    .filter((item) => item.changePercent > 0)
    .sort((left, right) => right.changePercent - left.changePercent)[0];
  const weakestDecliner = [...snapshot.components]
    .filter((item) => item.changePercent < 0)
    .sort((left, right) => left.changePercent - right.changePercent)[0];

  return [
    {
      label: "Market mood",
      value: snapshot.marketMood,
      helper: snapshot.breadthLabel,
    },
    {
      label: "Session shape",
      value: snapshot.sessionPhase,
      helper: snapshot.trendLabel,
    },
    {
      label: "Stocks rising / falling",
      value: `${snapshot.advancingCount} / ${snapshot.decliningCount}`,
      helper: "Visible breadth split across the currently tracked component set.",
    },
    {
      label: "Weight rising / falling",
      value: `${formatWeightShare(snapshot.positiveWeightShare)} / ${formatWeightShare(snapshot.negativeWeightShare)}`,
      helper: snapshot.dominanceLabel,
    },
    {
      label: "Top puller",
      value: snapshot.topPullers[0]?.name ?? "Data pending",
      helper: snapshot.topPullers[0]
        ? `${formatProductPercent(snapshot.topPullers[0].changePercent, 2, "Data pending")} • ${formatSignedScore(snapshot.topPullers[0].contribution)} contribution`
        : "No top puller is available on this route.",
    },
    {
      label: "Top dragger",
      value: snapshot.topDraggers[0]?.name ?? "Data pending",
      helper: snapshot.topDraggers[0]
        ? `${formatProductPercent(snapshot.topDraggers[0].changePercent, 2, "Data pending")} • ${formatSignedScore(snapshot.topDraggers[0].contribution)} contribution`
        : "No top dragger is available on this route.",
    },
    {
      label: "Strongest gainer",
      value: strongestGainer?.name ?? "Data pending",
      helper: strongestGainer
        ? `${formatProductPercent(strongestGainer.changePercent, 2, "Data pending")} on ${strongestGainer.weight.toFixed(2)}% weight`
        : "No positive mover is available in the visible set.",
    },
    {
      label: "Weakest decliner",
      value: weakestDecliner?.name ?? "Data pending",
      helper: weakestDecliner
        ? `${formatProductPercent(weakestDecliner.changePercent, 2, "Data pending")} on ${weakestDecliner.weight.toFixed(2)}% weight`
        : "No negative mover is available in the visible set.",
    },
  ];
}

function buildIndexCompositionRows(snapshot: IndexSnapshot) {
  const topComponents = [...snapshot.components].sort((left, right) => right.weight - left.weight);
  const topThreeWeight = topComponents.slice(0, 3).reduce((sum, item) => sum + item.weight, 0);
  const topFiveWeight = topComponents.slice(0, 5).reduce((sum, item) => sum + item.weight, 0);
  const topTenWeight = topComponents.slice(0, 10).reduce((sum, item) => sum + item.weight, 0);
  const concentrationLabel = snapshot.compositionMeta?.concentrationLabel ?? "Visible mix pending";
  const concentrationSummary =
    snapshot.compositionMeta?.concentrationSummary ??
    "Awaiting index composition data";

  return [
    {
      label: "Top component",
      value: topComponents[0]?.name ?? "Data pending",
      helper: topComponents[0] ? `${topComponents[0].weight.toFixed(2)}% weight` : "No component roster available.",
    },
    {
      label: "Top 3 weight share",
      value: formatWeightShare(topThreeWeight),
      helper: "Concentration carried by the three biggest visible constituents.",
    },
    {
      label: "Top 5 weight share",
      value: formatWeightShare(topFiveWeight),
      helper: "How much of the visible weight is concentrated in the five biggest constituents.",
    },
    {
      label: "Top 10 weight share",
      value: formatWeightShare(topTenWeight),
      helper: "Top-ten concentration using the routed component set now visible on the page.",
    },
    {
      label: "Concentration label",
      value: concentrationLabel,
      helper: concentrationSummary,
    },
  ];
}

function buildTimelineSummaryRows(snapshot: IndexSnapshot) {
  const first = snapshot.timeline[0];
  const last = snapshot.timeline[snapshot.timeline.length - 1];
  const strongestBreadth = [...snapshot.timeline].sort(
    (left, right) => right.weightedBreadthScore - left.weightedBreadthScore,
  )[0];
  const weakestBreadth = [...snapshot.timeline].sort(
    (left, right) => left.weightedBreadthScore - right.weightedBreadthScore,
  )[0];

  return [
    {
      label: "Opening read",
      value: first ? `${first.timeLabel} • ${formatSignedScore(first.weightedBreadthScore)}` : "Data pending",
      helper: first ? formatProductPercent(first.movePercent, 2, "Data pending") : "No opening point available.",
    },
    {
      label: "Latest read",
      value: last ? `${last.timeLabel} • ${formatSignedScore(last.weightedBreadthScore)}` : "Data pending",
      helper: last ? formatProductPercent(last.movePercent, 2, "Data pending") : "No latest point available.",
    },
    {
      label: "Strongest breadth",
      value: strongestBreadth
        ? `${strongestBreadth.timeLabel} • ${formatSignedScore(strongestBreadth.weightedBreadthScore)}`
        : "Data pending",
      helper: strongestBreadth?.marketMood ?? "No strongest breadth point available.",
    },
    {
      label: "Weakest breadth",
      value: weakestBreadth
        ? `${weakestBreadth.timeLabel} • ${formatSignedScore(weakestBreadth.weightedBreadthScore)}`
        : "Data pending",
      helper: weakestBreadth?.marketMood ?? "No weakest breadth point available.",
    },
  ];
}

function buildIndexRouteLinks(snapshot: IndexSnapshot) {
  return [
    {
      eyebrow: "Indices",
      title: "Tracked indices hub",
      description:
        "Move back to the full indices cluster when you want to compare this route with the other tracked benchmark pages.",
      href: "/indices",
      hrefLabel: "Open indices",
      meta: snapshot.shortName,
    },
    {
      eyebrow: "Lead stock",
      title: snapshot.topPullers[0]?.name ?? "Top pulling stock",
      description:
        "Open the strongest single-name handoff through search when the index move should narrow into the leading stock route.",
      href: `/search?query=${encodeURIComponent(snapshot.topPullers[0]?.name ?? snapshot.title)}`,
      hrefLabel: "Search lead stock",
      meta: "Search",
    },
    {
      eyebrow: "Market board",
      title: "Broader market context",
      description:
        "Use the broader market board when the index move should be read alongside metals, currency, and other public market surfaces.",
      href: "/markets",
      hrefLabel: "Open markets",
      meta: "Context",
    },
    {
      eyebrow: "Discovery",
      title: "Stocks and sectors",
      description:
        "Continue from the index route into the stock and sector families when the breadth story needs company-level research follow-through.",
      href: "/stocks",
      hrefLabel: "Open stocks",
      meta: "Discovery",
    },
    {
      eyebrow: "Learning",
      title: "Learn and explainers",
      description:
        "Use the education layer when the user needs benchmark, breadth, or component context explained in a slower, reusable format.",
      href: "/learn",
      hrefLabel: "Open learn",
      meta: "Education",
    },
  ];
}

export function IndexDetailBriefPage({
  snapshot,
  sourceLabel,
  relatedIndices,
  marketSnapshotGroups,
  componentRouteMap,
  viewerSignedIn,
  premiumAnalyticsUnlocked,
  globalSidebarRail,
}: {
  snapshot: IndexSnapshot;
  sourceLabel: string;
  relatedIndices: RelatedIndexCard[];
  marketSnapshotGroups: MarketSnapshotGroup[];
  componentRouteMap: Record<string, string>;
  viewerSignedIn: boolean;
  premiumAnalyticsUnlocked: boolean;
  globalSidebarRail?: ReactNode;
}) {
  const truthState = getIndexTruthState(snapshot);
  const componentRows = [...snapshot.components].sort((left, right) => right.weight - left.weight);
  const chartPoints = getTimelinePoints(snapshot);
  const timelineCoverage = describeTimelineCoverage(snapshot);
  const routeLinks = buildIndexRouteLinks(snapshot);
  const indexRouteRailLinks = routeLinks.slice(0, 3);
  const indexSignalRows = buildIndexSignalRows(snapshot);
  const indexCompositionRows = buildIndexCompositionRows(snapshot);
  const indexTimelineRows = buildTimelineSummaryRows(snapshot);
  const indexWatchItems = [
    {
      title: "Breadth posture",
      body: `${snapshot.breadthLabel}. Weighted breadth currently reads ${formatSignedScore(snapshot.weightedBreadthScore)}.`,
      meta: "Breadth",
    },
    {
      title: "Leadership check",
      body: snapshot.topPullers[0]
        ? `${snapshot.topPullers[0].name} is the strongest visible positive contributor right now.`
        : "Top leadership is unavailable on this route.",
      meta: "Leadership",
    },
    {
      title: "Drag check",
      body: snapshot.topDraggers[0]
        ? `${snapshot.topDraggers[0].name} is the biggest visible negative contributor right now.`
        : "No negative contributor is available on this route.",
      meta: "Draggers",
    },
    {
      title: "Coverage note",
      body: snapshot.officialSyncNote,
      meta: "Coverage",
    },
  ];
  const summaryResearchGroups = [
    {
      eyebrow: "Session",
      title: "Move and breadth",
      note: "The opening scan should immediately show the session tone.",
      items: [
        { label: "Move", value: formatProductPercent(snapshot.movePercent, 2, "Data pending") },
        { label: "Breadth", value: formatSignedScore(snapshot.weightedBreadthScore) },
        { label: "Updated", value: snapshot.lastUpdated },
      ],
    },
    {
      eyebrow: "Participation",
      title: "Stocks rising / falling",
      note: "This keeps participation visible before the deeper tables.",
      items: [
        { label: "Rising", value: String(snapshot.advancingCount) },
        { label: "Falling", value: String(snapshot.decliningCount) },
        { label: "Weight rising", value: formatPlainPercent(snapshot.positiveWeightShare, 1) },
      ],
    },
    {
      eyebrow: "Leadership",
      title: "Index leaders",
      note: "Top pushers and draggers sit early in the read.",
      items: [
        { label: "Top puller", value: snapshot.topPullers[0]?.symbol ?? "Data pending" },
        { label: "Top dragger", value: snapshot.topDraggers[0]?.symbol ?? "Data pending" },
        { label: "Trend", value: snapshot.trendLabel },
      ],
    },
    {
      eyebrow: "Coverage",
      title: "Route posture",
      note: "Make completeness visible instead of implied.",
      items: [
        { label: "Mood", value: snapshot.marketMood },
        { label: "Dominance", value: snapshot.dominanceLabel },
        { label: "Timeline", value: timelineCoverage },
        { label: "Truth", value: truthState === "verified" ? "Verified" : truthState === "delayed_snapshot" ? "Delayed Snapshot" : truthState === "partial" ? "Partial coverage" : "Data pending" },
      ],
    },
  ];
  const indexOpeningStripItems = [
    {
      label: "Data trust",
      value:
        truthState === "verified"
          ? "Verified"
          : truthState === "delayed_snapshot"
            ? "Delayed snapshot"
            : truthState === "partial"
              ? "Partial coverage"
              : "Data pending",
      helper: `${sourceLabel} • ${snapshot.lastUpdated}`,
    },
    {
      label: "Chart focus",
      value: chartPoints.length > 1 ? timelineCoverage : "Timeline unavailable",
      helper:
        chartPoints.length > 1
          ? "Read the opening point, latest breadth, and strongest stretch before moving into leadership."
          : "No retained multi-point session timeline is available yet.",
    },
    {
      label: "Read next",
      value: "Breadth & leadership",
      helper: "Continue into the scoreboard, leader table, and concentration chapter.",
    },
  ];
  const detailRows = [
    { label: "Market mood", value: snapshot.marketMood },
    { label: "Breadth read", value: snapshot.breadthLabel },
    { label: "Session shape", value: snapshot.sessionPhase },
    { label: "Weight moving higher", value: formatPlainPercent(snapshot.positiveWeightShare, 1) },
    { label: "Weight moving lower", value: formatPlainPercent(snapshot.negativeWeightShare, 1) },
    { label: "Top puller", value: snapshot.topPullers[0]?.name ?? "Data pending" },
    { label: "Top dragger", value: snapshot.topDraggers[0]?.name ?? "Data pending" },
    { label: "Timeline coverage", value: timelineCoverage },
  ];

  return (
    <ProductPageShell
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Indices", href: "/indices" },
        { label: snapshot.title, href: indexRouteConfig[snapshot.slug].path },
      ]}
      hero={
        <HeroPriceBlock
          title={snapshot.title}
          categoryBadge="Index"
          subtitle={`${snapshot.marketMood} • ${snapshot.breadthLabel}`}
          metaLine={`${sourceLabel} • ${snapshot.marketLabel}`}
          price={formatProductPercent(snapshot.movePercent, 2, "Data pending")}
          change={formatSignedScore(snapshot.weightedBreadthScore)}
          asOf={snapshot.lastUpdated}
          truthState={truthState}
          supportingNote={snapshot.narrative}
          cta={
            <div className="space-y-3">
              <CtaBlock
                title="Actions"
                description="Keep the index route practical and anchored to real market navigation."
                actions={[
                  { label: "View Components", href: "#components", tone: "primary" },
                  { label: "Open Indices", href: "/indices", tone: "secondary" },
                  {
                    label: "Search lead stock",
                    href: `/search?query=${encodeURIComponent(snapshot.topPullers[0]?.name ?? snapshot.title)}`,
                    tone: "ghost",
                  },
                ]}
              />
              <UserContentActionCard
                pageType="index"
                slug={snapshot.slug}
                title={snapshot.title}
                href={indexRouteConfig[snapshot.slug]?.path ?? `/${snapshot.slug}`}
                isSignedIn={viewerSignedIn}
                featureGate={{
                  label: "Premium analytics",
                  enabled: premiumAnalyticsUnlocked,
                  featureKey: "premium_analytics",
                  lockedReason:
                    "The live index route stays open, but deeper benchmark analytics stay behind the higher member tier.",
                  ctaHref: "/pricing",
                  ctaLabel: "Upgrade for premium analytics",
                }}
              />
            </div>
          }
        />
      }
      stickyTabs={
        <StickyTabBar
          tabs={[
            { id: "summary", label: "Summary", href: "#summary", active: true },
            { id: "breadth", label: "Breadth & Leadership", href: "#breadth" },
            { id: "composition", label: "Composition", href: "#composition" },
            { id: "timeline", label: "Timeline", href: "#timeline" },
            { id: "coverage", label: "Routes & Actions", href: "#coverage" },
          ]}
        />
      }
      summary={
        <ProductPageTwoColumnLayout
          left={
            <>
              <ProductEditorialCluster
                id="summary"
                title="Summary"
                description="The opening chapter should establish session tone, breadth posture, and the index timeline before the deeper benchmark read."
                summaryNote={
                  <p className="riddra-product-body text-sm leading-6 text-[rgba(107,114,128,0.86)]">
                    Start here for the benchmark brief: session posture, participation, and chart context before the deeper breadth and composition chapters.
                  </p>
                }
                variant="opening"
              >
                <ProductResearchStrip
                  title="Opening brief"
                  description="The index opening brings session tone, participation, leadership, and coverage together before the deeper read."
                  groups={summaryResearchGroups}
                  signatureLabel="Index opening brief"
                  signatureNote="The first scan brings mood, breadth, leadership, and coverage together before the deeper benchmark chapters."
                />
                <ProductReadingStrip items={indexOpeningStripItems} />
                <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)] xl:items-start">
                  <ProductDataTableCard
                    title="Session details"
                    description="Keep the core session identifiers, participation, and coverage visible before the deeper read."
                    rows={detailRows}
                    variant="analysis"
                  />
                  <MainChartContainer
                    chartId={`index-${snapshot.slug}`}
                    title={`${snapshot.title} primary timeline`}
                    description="Use the timeline to anchor the session before moving into breadth, leadership, and concentration."
                    attribution={{
                      label: "Benchmark source",
                      value: `${sourceLabel} • ${snapshot.lastUpdated}`,
                    }}
                    timeframes={[
                      { id: "1D", label: "1D", active: true },
                      { id: "1W", label: "1W" },
                      { id: "1M", label: "1M" },
                      { id: "3M", label: "3M" },
                      { id: "6M", label: "6M" },
                      { id: "1Y", label: "1Y" },
                      { id: "3Y", label: "3Y" },
                      { id: "5Y", label: "5Y" },
                    ]}
                    points={chartPoints}
                    supportingStats={[
                      { label: "Breadth score", value: formatSignedScore(snapshot.weightedBreadthScore) },
                      { label: "Stocks rising", value: String(snapshot.advancingCount) },
                      { label: "Stocks falling", value: String(snapshot.decliningCount) },
                      {
                        label: "Weight moving higher",
                        value: formatPlainPercent(snapshot.positiveWeightShare, 1),
                      },
                    ]}
                    truthState={truthState}
                    emptyState={buildIndexChartEmptyState(snapshot)}
                  />
                </div>
              </ProductEditorialCluster>

              <ProductEditorialCluster
                id="breadth"
                title="Breadth & Leadership"
                description="Use this chapter to confirm whether the session breadth is strong enough to trust and who is carrying it."
                summaryNote={
                  <p className="riddra-product-body text-sm leading-6 text-[rgba(107,114,128,0.86)]">
                    Start with the breadth read, then confirm who is carrying the move before moving into concentration.
                  </p>
                }
                variant="signals"
              >
                <ProductInsightGridCard
                  title="Index mood / breadth / dominance"
                  description="The index route leads with breadth and dominance interpretation, not a stock-style fundamentals block."
                  items={[
                    {
                      label: "Market mood",
                      value: snapshot.marketMood,
                      note: snapshot.breadthLabel,
                    },
                    {
                      label: "Dominance",
                      value: snapshot.dominanceLabel,
                      note: `${formatPlainPercent(snapshot.positiveWeightShare, 1)} positive weight vs ${formatPlainPercent(snapshot.negativeWeightShare, 1)} negative weight`,
                    },
                    {
                      label: "Trend",
                      value: snapshot.trendLabel,
                      note: snapshot.sessionPhase,
                    },
                  ]}
                  columns={3}
                  variant="signals"
                />
                <ProductDataTableCard
                  title="Session scoreboard"
                  description="Keep the benchmark chapter concrete with mood, breadth split, and leader names in one table."
                  rows={indexSignalRows}
                  variant="analysis"
                />
                <ProductCard tone="compact" className="space-y-2">
                  <p className="riddra-product-body text-sm leading-7 text-[rgba(107,114,128,0.92)]">
                    {truthState === "partial"
                      ? "This benchmark is readable, but the visible breadth and leadership only cover part of the component set. Keep that in mind before treating the session read as complete."
                      : "Use the breadth split, leadership table, and concentration chapter together before treating the latest benchmark move as broad market confirmation."}
                  </p>
                </ProductCard>
                <ProductCard tone="secondary" className="space-y-4">
                  <ProductSectionTitle
                    title="Leadership"
                    description="Pullers and draggers stay in the main research flow so the page reads like one benchmark note."
                  />
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <p className="riddra-product-body mb-2 text-sm font-medium text-[#1B3A6B]">Top pullers</p>
                      {getLeadershipRows(snapshot.topPullers)}
                    </div>
                    <div>
                      <p className="riddra-product-body mb-2 text-sm font-medium text-[#1B3A6B]">Top draggers</p>
                      {getLeadershipRows(snapshot.topDraggers)}
                    </div>
                  </div>
                </ProductCard>
                <ProductBulletListCard
                  title="Session watchpoints"
                    description="Use these checks before treating the current breadth read as the whole story."
                  items={indexWatchItems}
                  tone="secondary"
                  variant="watchpoints"
                />
              </ProductEditorialCluster>

              <ProductEditorialCluster
                id="composition"
                title="Composition / Holdings / Exposure"
                description="This chapter shows where the weight sits, how concentrated the move is, and which names matter most."
                summaryNote={
                  <p className="riddra-product-body text-sm leading-6 text-[rgba(107,114,128,0.86)]">
                    Use this chapter to decide whether the move is broad enough or still concentrated in a handful of names.
                  </p>
                }
                variant="composition"
              >
                <ExposureStrip
                  title="Component weight strip"
                  description="The top component weights are shown as a reusable exposure strip so the page communicates concentration without pretending it is a portfolio page."
                  items={componentRows.slice(0, 6).map((component) => ({
                    label: component.name,
                    value: `${component.weight.toFixed(2)}%`,
                  }))}
                />
                <ProductCard tone="compact" className="space-y-2">
                  <p className="riddra-product-body text-[11px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.84)]">
                    Composition source
                  </p>
                  <p className="riddra-product-body text-sm font-medium text-[#1B3A6B]">
                    {snapshot.compositionMeta
                      ? `${snapshot.compositionMeta.sourceLabel} • ${snapshot.compositionMeta.sourceDate}`
                      : "Awaiting index composition data"}
                  </p>
                  <p className="riddra-product-body text-sm leading-6 text-[rgba(107,114,128,0.88)]">
                    {snapshot.compositionMeta
                      ? snapshot.compositionMeta.concentrationSummary
                      : "The page keeps the composition chapter explicit until a durable component snapshot is available."}
                  </p>
                  {snapshot.compositionMeta?.referenceUrl ? (
                    <Link
                      href={snapshot.compositionMeta.referenceUrl}
                      className="inline-flex items-center text-[12px] font-medium text-[#1B3A6B] transition hover:text-[#D4853B]"
                    >
                      View source
                    </Link>
                  ) : null}
                </ProductCard>
                <ProductCard tone="secondary" className="space-y-5" id="components">
                  <ProductSectionTitle
                    title="Component breakdown"
                    description="Only verified or retained index components appear here. Partial coverage is labeled, not hidden."
                  />
                  <div className="space-y-3">
                    {componentRows.length ? componentRows.slice(0, 12).map((component) => (
                      <div
                        key={`${component.symbol}-${component.name}`}
                        className="grid gap-3 rounded-[8px] border border-[#E2DED9] px-4 py-4 md:grid-cols-[minmax(0,1.7fr)_0.9fr_0.9fr_0.9fr]"
                      >
                        <div>
                          {componentRouteMap[component.symbol] ? (
                            <Link
                              href={componentRouteMap[component.symbol]}
                              className="riddra-product-body text-sm font-medium text-[#1B3A6B] transition hover:text-[#D4853B]"
                            >
                              {component.name}
                            </Link>
                          ) : (
                            <p className="riddra-product-body text-sm font-medium text-[#1B3A6B]">
                              {component.name}
                            </p>
                          )}
                          <p className="riddra-product-body mt-1 text-xs text-[rgba(107,114,128,0.84)]">
                            {component.symbol}
                          </p>
                        </div>
                        <div>
                          <p className="riddra-product-body text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.84)]">
                            Weight
                          </p>
                          <p className="riddra-product-number mt-2 text-sm text-[#1B3A6B]">
                            {component.weight.toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <p className="riddra-product-body text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.84)]">
                            Move
                          </p>
                          <p
                            className="riddra-product-number mt-2 text-sm"
                            style={{ color: component.changePercent >= 0 ? "#1A7F4B" : "#C0392B" }}
                          >
                            {formatProductPercent(component.changePercent, 2, "Data pending")}
                          </p>
                        </div>
                        <div>
                          <p className="riddra-product-body text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.84)]">
                            Contribution
                          </p>
                          <p className="riddra-product-number mt-2 text-sm text-[#1B3A6B]">
                            {formatSignedScore(component.contribution)}
                          </p>
                        </div>
                      </div>
                    )) : (
                      <div className="rounded-[8px] border border-dashed border-[rgba(212,133,59,0.32)] bg-[rgba(212,133,59,0.06)] px-4 py-4">
                        <p className="riddra-product-body text-sm font-medium text-[#8E5723]">Awaiting index composition data</p>
                        <p className="riddra-product-body mt-2 text-sm leading-6 text-[rgba(107,114,128,0.88)]">
                          This route is keeping the component chapter explicit until a durable index-component snapshot is available.
                        </p>
                      </div>
                    )}
                  </div>
                </ProductCard>
                <ProductDataTableCard
                  title="Concentration cues"
                  description="These cues turn the raw component list into a faster benchmark concentration read."
                  rows={indexCompositionRows}
                  variant="composition"
                />
              </ProductEditorialCluster>

              <ProductEditorialCluster
                id="timeline"
                title="Timeline"
                description="Timeline points remain explicit, but the section now explains how the session evolved instead of reading like a raw event log."
                variant="timeline"
              >
                {snapshot.timeline.length ? (
                  <>
                    <ProductDataTableCard
                      title="Session trajectory"
                      description="Use this compact summary to see how the session opened, where breadth peaked, and what the latest posture looks like before reading the full rows."
                      rows={indexTimelineRows}
                      variant="analysis"
                    />
                    <ProductCard tone="secondary" className="space-y-5">
                      <ProductSectionTitle
                        title="Timeline"
                        description="Each recorded point stays explicit so the session path is readable without pretending there are more timeline rows than the route actually has."
                      />
                      <div className="space-y-3">
                        {snapshot.timeline.map((point) => (
                          <div
                            key={`${point.timeLabel}-${point.movePercent}`}
                            className="grid gap-3 rounded-[8px] border border-[#E2DED9] px-4 py-4 md:grid-cols-[0.9fr_1fr_1fr_1fr]"
                          >
                            <div>
                              <p className="riddra-product-body text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.84)]">
                                Time
                              </p>
                              <p className="riddra-product-number mt-2 text-sm text-[#1B3A6B]">
                                {point.timeLabel}
                              </p>
                            </div>
                            <div>
                              <p className="riddra-product-body text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.84)]">
                                Move
                              </p>
                              <p
                                className="riddra-product-number mt-2 text-sm"
                                style={{ color: point.movePercent >= 0 ? "#1A7F4B" : "#C0392B" }}
                              >
                                {formatProductPercent(point.movePercent, 2, "Data pending")}
                              </p>
                            </div>
                            <div>
                              <p className="riddra-product-body text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.84)]">
                                Breadth score
                              </p>
                              <p className="riddra-product-number mt-2 text-sm text-[#1B3A6B]">
                                {formatSignedScore(point.weightedBreadthScore)}
                              </p>
                            </div>
                            <div>
                              <p className="riddra-product-body text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.84)]">
                                Market mood
                              </p>
                              <p className="riddra-product-body mt-2 text-sm font-medium text-[#1B3A6B]">
                                {point.marketMood}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ProductCard>
                  </>
                ) : (
                  <ProductCard tone="warning" className="space-y-3">
                    <ProductSectionTitle
                      title="Session timeline unavailable"
                      description="This route has a benchmark snapshot, but no retained multi-point session timeline to show below the fold."
                    />
                    <p className="riddra-product-body text-sm leading-7 text-[rgba(107,114,128,0.92)]">
                      The page is keeping the timeline chapter explicit instead of leaving a weak placeholder. Use the breadth, leadership, and component sections above until retained session points are available.
                    </p>
                  </ProductCard>
                )}
              </ProductEditorialCluster>
              <ProductEditorialCluster
                id="coverage"
                title="Related routes / Docs / Actions"
                description="Close with the most useful benchmark handoffs and next research paths."
                summaryNote={
                  <p className="riddra-product-body text-sm leading-6 text-[rgba(107,114,128,0.86)]">
                    End with adjacent benchmarks, market context, and company-level follow-through.
                  </p>
                }
                variant="routes"
              >
                <ProductRouteGrid
                  title="Related routes and context"
                  description="Use these handoffs to stay inside one connected research flow."
                  items={routeLinks}
                />
              </ProductEditorialCluster>
            </>
          }
          right={
            <>
              <QuickStatsCard
                title="Quick stats"
                description="Keep this rail open while reading the opening brief and the breadth chapter."
                attribution={{
                  label: "Benchmark source",
                  value: `${sourceLabel} • ${truthState === "partial" ? "Partial coverage" : truthState === "delayed_snapshot" ? "Delayed Snapshot" : truthState === "verified" ? "Verified" : "Data pending"}`,
                }}
                items={[
                  { label: "Breadth score", value: formatSignedScore(snapshot.weightedBreadthScore) },
                  { label: "Market mood", value: snapshot.marketMood },
                  { label: "Session shape", value: snapshot.sessionPhase },
                  { label: "Stocks rising", value: String(snapshot.advancingCount) },
                  { label: "Stocks falling", value: String(snapshot.decliningCount) },
                  { label: "Top Puller", value: snapshot.topPullers[0]?.symbol ?? "Data pending" },
                  { label: "Top Dragger", value: snapshot.topDraggers[0]?.symbol ?? "Data pending" },
                  { label: "Weight moving higher", value: formatPlainPercent(snapshot.positiveWeightShare, 1) },
                  { label: "Updated", value: snapshot.lastUpdated },
                ]}
                brand={{ name: sourceLabel }}
              />
              <ProductCard
                tone={truthState === "partial" || truthState === "unavailable" ? "warning" : "compact"}
                className="space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="riddra-product-body text-[11px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.84)]">
                    Coverage note
                  </p>
                  <ProductTruthBadge state={truthState} />
                </div>
                <p className="riddra-product-body text-sm leading-7 text-[rgba(107,114,128,0.92)]">
                  {truthState === "partial"
                    ? "Only part of the component set is currently represented in this benchmark read, so breadth, leadership, and concentration should be treated as partial."
                    : snapshot.officialSyncNote}
                </p>
              </ProductCard>
              <ManagedSharedSidebarStack
                items={{
                  market_snapshot: (
                    <MarketSnapshotSidebar
                      groups={marketSnapshotGroups}
                      currentIndexSlug={snapshot.slug}
                    />
                  ),
                  route_links: (
                    <ProductRouteRailCard
                      title="Where to go next"
                      description="These are the most useful next routes after the main benchmark read."
                      items={indexRouteRailLinks}
                      variant="routes"
                    />
                  ),
                  page_actions: (
                    <ProductCard tone="compact" className="space-y-2">
                      <p className="riddra-product-body text-[11px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.84)]">
                        Actions
                      </p>
                      <div className="grid gap-2">
                        <Link
                          href="#components"
                          className="riddra-product-body inline-flex min-h-[38px] items-center justify-center rounded-[8px] bg-[#1B3A6B] px-3 text-[13px] font-medium text-white transition hover:bg-[#264a83]"
                        >
                          View components
                        </Link>
                        <Link
                          href="/stocks"
                          className="riddra-product-body inline-flex min-h-[38px] items-center justify-center rounded-[8px] border border-[rgba(27,58,107,0.14)] bg-white px-3 text-[13px] font-medium text-[#1B3A6B] transition hover:border-[#D4853B] hover:text-[#D4853B]"
                        >
                          Open stocks
                        </Link>
                        <Link
                          href="/indices"
                          className="riddra-product-body inline-flex min-h-[38px] items-center justify-center rounded-[8px] border border-[rgba(226,222,217,0.88)] bg-[rgba(250,250,250,0.88)] px-3 text-[13px] font-medium text-[#1B3A6B] transition hover:border-[#1B3A6B]"
                        >
                          Back to indices
                        </Link>
                      </div>
                    </ProductCard>
                  ),
                }}
              />
              {globalSidebarRail}
            </>
          }
        />
      }
      similarAssets={
        relatedIndices.length ? (
          <SimilarAssetsRow
            title="Other tracked indices"
            description="These related index cards keep the same detail system and stay explicit about the coverage available on each route."
            items={relatedIndices}
          />
        ) : undefined
      }
    />
  );
}

export function IndexDetailUnavailablePage({
  title,
  path,
  sourceLabel,
  roster,
  readFailureDetail,
  marketSnapshotGroups,
  globalSidebarRail,
}: {
  title: string;
  path: string;
  sourceLabel: string;
  roster: IndexWeightRoster | null;
  readFailureDetail: string | null;
  marketSnapshotGroups: MarketSnapshotGroup[];
  globalSidebarRail?: ReactNode;
}) {
  const truthState: ProductTruthState = readFailureDetail ? "read_failed" : "unavailable";
  const rosterItems = roster?.components ?? [];

  return (
    <ProductPageShell
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Indices", href: "/indices" },
        { label: title, href: path },
      ]}
      hero={
        <HeroPriceBlock
          title={title}
          categoryBadge="Index"
          subtitle={
            readFailureDetail
              ? "Source read failed"
              : "Waiting for retained benchmark data"
          }
          metaLine={sourceLabel}
          price="Data pending"
          change={
            roster ? `${roster.components.length} roster components` : "No verified component roster yet"
          }
          asOf={roster?.lastUpdated ?? "Data pending"}
          truthState={truthState}
          supportingNote={
            readFailureDetail
              ? "The benchmark source could not be read for this route right now, so the page is staying explicit about the failure instead of guessing."
              : "This route stays unavailable until a retained benchmark snapshot or saved component roster exists."
          }
          cta={
            <CtaBlock
              title="Actions"
              description="Keep the route clear and honest while the durable index path catches up."
              actions={[
                { label: "Open Indices", href: "/indices", tone: "primary" },
                { label: "Browse Markets", href: "/markets", tone: "secondary" },
                { label: "Search index stocks", href: "/search", tone: "ghost" },
              ]}
            />
          }
        />
      }
      stickyTabs={
        <StickyTabBar
          tabs={[
            { id: "summary", label: "Summary", href: "#summary", active: true },
            { id: "components", label: "Components", href: "#components" },
            { id: "coverage", label: "Coverage", href: "#coverage" },
          ]}
        />
      }
      summary={
        <ProductPageTwoColumnLayout
          left={
            <>
              <section id="summary" className="space-y-8">
                <MainChartContainer
                  chartId={`index-unavailable-${path}`}
                  title={`${title} primary timeline`}
                  description="The chart slot stays in place, but it remains withheld until the route has a real retained benchmark timeline."
                  attribution={{
                    label: "Benchmark source",
                    value: `${sourceLabel} • ${readFailureDetail ? "Read Failed" : "Data pending"}`,
                  }}
                  timeframes={[
                    { id: "1D", label: "1D", active: true },
                    { id: "1W", label: "1W" },
                    { id: "1M", label: "1M" },
                    { id: "3M", label: "3M" },
                    { id: "6M", label: "6M" },
                    { id: "1Y", label: "1Y" },
                    { id: "3Y", label: "3Y" },
                    { id: "5Y", label: "5Y" },
                  ]}
                  points={[]}
                  supportingStats={[
                    { label: "Route status", value: readFailureDetail ? "Read failed" : "Data not available yet" },
                    { label: "Roster rows", value: String(rosterItems.length) },
                    { label: "Source", value: sourceLabel },
                    { label: "Last updated", value: roster?.lastUpdated ?? "Data pending" },
                  ]}
                  truthState={truthState}
                  emptyState={{
                    state: readFailureDetail ? "read_failed" : "unavailable",
                    title: readFailureDetail ? "Source read failed" : "Session timeline unavailable",
                    description: readFailureDetail
                      ? "The benchmark source could not be read for this route right now, so the chart stays withheld."
                      : "No retained benchmark timeline is available yet, so this page refuses to draw a chart from incomplete roster-only data.",
                  }}
                />
              </section>

              {rosterItems.length ? (
                <section id="components" className="space-y-8 riddra-product-section">
                  <ExposureStrip
                    title="Reference component strip"
                    description="A saved roster can still be shown while the current breadth snapshot is unavailable."
                    items={rosterItems.slice(0, 6).map((component) => ({
                      label: component.name,
                      value: `${component.weight.toFixed(2)}%`,
                    }))}
                  />
                  <ProductCard tone="secondary" className="space-y-5">
                    <ProductSectionTitle
                      title="Stored component roster"
                      description="This is a saved roster only. It does not imply that current breadth, leadership, or timeline data is ready."
                    />
                    <div className="space-y-3">
                      {rosterItems.slice(0, 12).map((component) => (
                        <div
                          key={`${component.symbol}-${component.name}`}
                          className="flex items-center justify-between gap-4 rounded-[8px] border border-[#E2DED9] px-4 py-4"
                        >
                          <div>
                            <p className="riddra-product-body text-sm font-medium text-[#1B3A6B]">
                              {component.name}
                            </p>
                            <p className="riddra-product-body mt-1 text-xs text-[rgba(107,114,128,0.84)]">
                              {component.symbol}
                            </p>
                          </div>
                          <p className="riddra-product-number text-sm text-[#1B3A6B]">
                            {component.weight.toFixed(2)}%
                          </p>
                        </div>
                      ))}
                    </div>
                  </ProductCard>
                </section>
              ) : null}
            </>
          }
          right={
            <>
              <QuickStatsCard
                title="Quick stats"
                description="Even the unavailable route keeps the same shell and numeric summary rules."
                attribution={{
                  label: "Benchmark source",
                  value: `${sourceLabel} • ${readFailureDetail ? "Read Failed" : "Data pending"}`,
                }}
                items={[
                  { label: "Route status", value: readFailureDetail ? "Read failed" : "Data not available yet" },
                  { label: "Roster rows", value: String(rosterItems.length) },
                  { label: "Last updated", value: roster?.lastUpdated ?? "Data pending" },
                  { label: "Source", value: sourceLabel },
                  { label: "Mood", value: "Data pending" },
                  { label: "Dominance", value: "Data pending" },
                  { label: "Breadth", value: "Data pending" },
                  { label: "Timeline", value: "Data pending" },
                ]}
                brand={{ name: title }}
              />
              <MarketSnapshotSidebar groups={marketSnapshotGroups} />
              {globalSidebarRail}
              <CategoryRankBadge
                title="Route status"
                rankLabel={readFailureDetail ? "Read failed" : "Data pending"}
                detail={
                  readFailureDetail
                    ? "The benchmark source is disconnected on this route right now."
                    : "A saved roster may exist, but current index intelligence is still intentionally withheld."
                }
              />
              <ProductCard tone="warning" className="space-y-3" id="coverage">
                <div className="flex items-center justify-between gap-3">
                  <p className="riddra-product-body text-[11px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.84)]">
                    Coverage note
                  </p>
                  <ProductTruthBadge state={truthState} />
                </div>
                <p className="riddra-product-body text-sm leading-7 text-[rgba(107,114,128,0.92)]">
                  {readFailureDetail
                    ? "The benchmark source could not be read for this route right now. The page is staying explicit about that failure instead of pretending the route simply has no data."
                    : "This route is waiting for a retained benchmark snapshot. Any saved roster is shown only as reference weightage, not as proof of a current breadth read."}
                </p>
              </ProductCard>
            </>
          }
        />
      }
    />
  );
}

export async function IndexDetailRoutePage({
  slug,
}: {
  slug: IndexSnapshot["slug"];
}) {
  const config = indexRouteConfig[slug];
  let snapshot: IndexSnapshot | null = null;
  let roster: IndexWeightRoster | null = null;
  let readFailureDetail: string | null = null;
  let relatedIndices: RelatedIndexCard[] = [];
  const marketSnapshotGroups = await getMarketSnapshotGroups();
  const stocks = await getStocks();
  const componentRouteMap = Object.fromEntries(
    stocks
      .filter((stock) => stock.symbol)
      .map((stock) => [stock.symbol, `/stocks/${stock.slug}`]),
  );

  try {
    snapshot = await getIndexSnapshot(slug);
  } catch (error) {
    readFailureDetail =
      error instanceof Error ? error.message : `Unknown ${config.title} snapshot read failure.`;
  }

  if (!snapshot) {
    try {
      roster = await getIndexWeightRoster(slug);
    } catch (error) {
      readFailureDetail ??=
        error instanceof Error ? error.message : `Unknown ${config.title} roster read failure.`;
    }
  } else {
    try {
      const allSnapshots = await getIndexSnapshots();
      relatedIndices = buildRelatedIndices(slug, allSnapshots);
    } catch {
      relatedIndices = [];
    }
  }

  const source = await getSourceByCode(snapshot?.sourceCode ?? roster?.sourceCode ?? config.sourceCode);
  const globalSidebarRail = await getGlobalSidebarRail("indices");
  const sourceLabel = source?.sourceName ?? "Verified source unavailable";
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Indices", href: "/indices" },
    { name: config.title, href: config.path },
  ];

  return (
    <>
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <JsonLd
        data={buildWebPageSchema({
          title: config.title,
          description: config.description,
          path: config.path,
        })}
      />
      {snapshot ? (
        <IndexDetailBriefPage
          snapshot={snapshot}
          sourceLabel={sourceLabel}
          relatedIndices={relatedIndices}
          marketSnapshotGroups={marketSnapshotGroups}
          componentRouteMap={componentRouteMap}
          viewerSignedIn={false}
          premiumAnalyticsUnlocked={false}
          globalSidebarRail={globalSidebarRail}
        />
      ) : (
        <IndexDetailUnavailablePage
          title={config.title}
          path={config.path}
          sourceLabel={sourceLabel}
          roster={roster}
          readFailureDetail={readFailureDetail}
          marketSnapshotGroups={marketSnapshotGroups}
          globalSidebarRail={globalSidebarRail}
        />
      )}
    </>
  );
}
