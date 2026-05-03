import Link from "next/link";
import { notFound } from "next/navigation";

import { getGlobalSidebarRail } from "@/components/global-sidebar-rail-server";
import { MarketDataUnavailableState } from "@/components/market-data-unavailable-state";
import {
  HeroPriceBlock,
  MainChartContainer,
  ProductCard,
  ProductPageShell,
  ProductSectionTitle,
  QuickStatsCard,
  StickyTabBar,
  type MarketSnapshotMetaItem,
} from "@/components/product-page-system";
import { getIndexSnapshot } from "@/lib/index-content";
import type { IndexComponent, IndexSnapshot } from "@/lib/index-intelligence";
import {
  formatProductDateTime,
  formatProductPercent,
  getTrendColor,
  type ProductTruthState,
} from "@/lib/product-page-design";
import { getSourceByCode } from "@/lib/source-registry";

type IndexSlug = IndexSnapshot["slug"];

const indexPaths: Record<IndexSlug, string> = {
  nifty50: "/nifty50",
  sensex: "/sensex",
  banknifty: "/banknifty",
  finnifty: "/finnifty",
};

const indexTitles: Record<IndexSlug, string> = {
  nifty50: "Nifty 50",
  sensex: "Sensex",
  banknifty: "Bank Nifty",
  finnifty: "Fin Nifty",
};

function getIndexTruthState(snapshot: IndexSnapshot): ProductTruthState {
  if (snapshot.dataMode === "verified") {
    return "verified";
  }

  if (snapshot.dataMode === "manual") {
    return "delayed_snapshot";
  }

  return "partial";
}

function formatSignedNumber(value: number, digits = 2) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
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

  return snapshot.timeline.map((point) => ({
    label: point.timeLabel,
    value: point.movePercent,
    changeFromStart: point.movePercent,
  }));
}

function buildComponentRows(items: IndexComponent[], tone: "positive" | "negative") {
  if (!items.length) {
    return (
      <p className="riddra-product-body text-sm leading-7 text-[rgba(107,114,128,0.84)]">
        Verified component rows are not available for this section yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={`${tone}-${item.symbol}`}
          className="rounded-[10px] border border-[rgba(221,215,207,0.9)] bg-white px-4 py-3 shadow-[0_8px_18px_rgba(27,58,107,0.028)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="riddra-product-body text-sm font-semibold text-[#1B3A6B]">{item.name}</p>
              <p className="riddra-product-body text-xs text-[rgba(107,114,128,0.78)]">
                {item.symbol} • {item.weight.toFixed(2)}% weight
              </p>
            </div>
            <div className="text-right">
              <p className="riddra-product-number text-sm font-semibold" style={{ color: getTrendColor(item.changePercent) }}>
                {formatProductPercent(item.changePercent, 2)}
              </p>
              <p className="riddra-product-body mt-1 text-xs text-[rgba(107,114,128,0.78)]">
                contribution {formatSignedNumber(item.contribution)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function IndexMetaGrid({ items }: { items: MarketSnapshotMetaItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[10px] border border-[rgba(221,215,207,0.9)] bg-white px-4 py-3 shadow-[0_8px_18px_rgba(27,58,107,0.028)]"
        >
          <p className="riddra-product-body text-[11px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.74)]">
            {item.label}
          </p>
          <p className="riddra-product-number mt-2 text-[18px] font-semibold text-[#1B3A6B]">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export async function IndexDetailStandardPage({ slug }: { slug: IndexSlug }) {
  const sidebarPromise = getGlobalSidebarRail("indices");
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Indices", href: "/indices" },
    { label: indexTitles[slug], href: indexPaths[slug] },
  ];
  let snapshot: IndexSnapshot | null = null;
  let readFailureDetail: string | null = null;

  try {
    snapshot = await getIndexSnapshot(slug);
  } catch (error) {
    readFailureDetail =
      error instanceof Error ? error.message : "Unknown index snapshot read failure.";
  }

  const sidebar = await sidebarPromise;

  if (readFailureDetail) {
    return (
      <ProductPageShell
        breadcrumbs={breadcrumbs}
        hero={
          <HeroPriceBlock
            title={indexTitles[slug]}
            categoryBadge="Index"
            subtitle="Index route temporarily unavailable"
            metaLine="Retained benchmark snapshot read failed"
            price="Data pending"
            change="Retry pending"
            asOf="Awaiting reconnect"
            truthState="read_failed"
            supportingNote="This route is staying explicit about the read failure instead of rendering an implied benchmark move."
          />
        }
        stickyTabs={null}
        summary={
          <MarketDataUnavailableState
            state="read_failed"
            eyebrow="Index route availability"
            title={`${indexTitles[slug]} data could not be read`}
            description="The retained benchmark snapshot is temporarily unavailable, so this page is withholding the index detail view until the source recovers."
            items={[
              "Retry the route after the retained index snapshot source reconnects.",
              `Technical detail: ${readFailureDetail}`,
            ]}
          />
        }
        sidebar={sidebar}
      />
    );
  }

  if (!snapshot) {
    notFound();
  }

  const source = await getSourceByCode(snapshot.sourceCode);

  const path = indexPaths[slug];
  const truthState = getIndexTruthState(snapshot);
  const timelinePoints = getTimelinePoints(snapshot);
  const visibleCount = snapshot.compositionMeta?.visibleCount ?? snapshot.components.length;
  const sourceDateLabel =
    snapshot.compositionMeta?.sourceDate ??
    (snapshot.lastUpdated.includes("·") ? snapshot.lastUpdated.split("·").pop()?.trim() ?? snapshot.lastUpdated : snapshot.lastUpdated);

  return (
    <ProductPageShell
      hero={
        <HeroPriceBlock
          title={snapshot.title}
          categoryBadge="Index"
          subtitle={`${snapshot.marketMood} • ${snapshot.breadthLabel}`}
          metaLine={`${source?.sourceName ?? snapshot.marketLabel} • ${visibleCount} visible components`}
          price={formatProductPercent(snapshot.movePercent, 2)}
          change={formatSignedNumber(snapshot.weightedBreadthScore)}
          asOf={sourceDateLabel}
          truthState={truthState}
          supportingNote={snapshot.narrative}
        />
      }
      breadcrumbs={breadcrumbs}
      stickyTabs={
        <StickyTabBar
          tabs={[
            { id: "summary", label: "Summary", href: `${path}#summary`, active: true },
            { id: "breadth", label: "Breadth", href: `${path}#breadth` },
            { id: "leaders", label: "Leaders", href: `${path}#leaders` },
            { id: "timeline", label: "Timeline", href: `${path}#timeline` },
          ]}
          className="top-auto"
          tabListClassName="justify-start"
        />
      }
      summary={
        <div id="summary" className="grid gap-3.5 xl:grid-cols-[minmax(0,1.62fr)_minmax(280px,0.86fr)]">
          <MainChartContainer
            chartId={`index-${slug}-timeline`}
            title={`${snapshot.title} session rhythm`}
            description="A cleaner index read that keeps the opening move, leadership tone, and direction visible inside the same card language as the stock prototype."
            attribution={{ label: "Source", value: source?.sourceName ?? snapshot.marketLabel }}
            timeframes={[
              { id: "1d", label: "1D", active: true },
              { id: "1w", label: "1W" },
              { id: "1m", label: "1M" },
              { id: "3m", label: "3M" },
              { id: "1y", label: "1Y" },
            ]}
            points={timelinePoints}
            supportingStats={[
              { label: "Session phase", value: snapshot.sessionPhase },
              { label: "Trend", value: snapshot.trendLabel },
              { label: "Breadth score", value: formatSignedNumber(snapshot.weightedBreadthScore) },
              { label: "Dominance", value: snapshot.dominanceLabel },
            ]}
            truthState={truthState}
            emptyState={{
              state: truthState === "verified" ? "unavailable" : "feature_pending",
              title: "Index timeline is not retained yet",
              description:
                "This route stays explicit when deeper retained history is not available instead of drawing an implied benchmark path.",
            }}
          />

          <div className="space-y-3.5">
            <QuickStatsCard
              title="Quick details"
              description="Keep the benchmark source, breadth tilt, and session composition visible beside the main chart."
              attribution={{ label: "Source", value: source?.sourceName ?? snapshot.marketLabel }}
              items={[
                { label: "Market mood", value: snapshot.marketMood },
                { label: "Breadth label", value: snapshot.breadthLabel },
                { label: "Positive weight", value: `${snapshot.positiveWeightShare.toFixed(1)}%` },
                { label: "Negative weight", value: `${snapshot.negativeWeightShare.toFixed(1)}%` },
                { label: "Advancing", value: `${snapshot.advancingCount}` },
                { label: "Declining", value: `${snapshot.decliningCount}` },
              ]}
            />

            <ProductCard tone="secondary" className="space-y-4">
              <ProductSectionTitle
                eyebrow="Reading context"
                title="Session summary"
                description="The same compact reading strip idea from the stock page, adapted for an index route."
              />
              <IndexMetaGrid
                items={[
                  { label: "Coverage", value: `${visibleCount} constituents` },
                  { label: "Source date", value: sourceDateLabel },
                  { label: "Top puller", value: snapshot.topPullers[0]?.symbol ?? "Unavailable" },
                  { label: "Top dragger", value: snapshot.topDraggers[0]?.symbol ?? "Unavailable" },
                ]}
              />
            </ProductCard>
          </div>
        </div>
      }
      supportingSections={
        <div className="space-y-3.5">
          <section id="breadth">
            <ProductCard tone="primary" className="space-y-4">
              <ProductSectionTitle
                eyebrow="Breadth"
                title="Opening brief"
                description="A direct index brief using the same soft card system and tighter spacing rhythm as Test Motors."
              />
              <IndexMetaGrid
                items={[
                  { label: "Session", value: snapshot.sessionPhase },
                  { label: "Breadth", value: snapshot.breadthLabel },
                  { label: "Positive", value: `${snapshot.positiveWeightShare.toFixed(1)}%` },
                  { label: "Negative", value: `${snapshot.negativeWeightShare.toFixed(1)}%` },
                ]}
              />
              <div className="grid gap-3 lg:grid-cols-2">
                <ProductCard tone="secondary" className="space-y-2">
                  <p className="riddra-product-body text-[11px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.74)]">
                    Market mood
                  </p>
                  <p className="riddra-product-number text-[24px] font-semibold text-[#1B3A6B]">{snapshot.marketMood}</p>
                  <p className="riddra-product-body text-sm leading-7 text-[rgba(75,85,99,0.84)]">
                    {snapshot.dominanceLabel}. {snapshot.trendLabel}.
                  </p>
                </ProductCard>
                <ProductCard tone="secondary" className="space-y-2">
                  <p className="riddra-product-body text-[11px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.74)]">
                    Source note
                  </p>
                  <p className="riddra-product-body text-sm leading-7 text-[rgba(75,85,99,0.84)]">
                    {snapshot.marketDetail}
                  </p>
                  <p className="riddra-product-body text-sm leading-7 text-[rgba(75,85,99,0.84)]">
                    {snapshot.officialSyncNote}
                  </p>
                </ProductCard>
              </div>
            </ProductCard>
          </section>

          <section id="leaders" className="grid gap-3.5 xl:grid-cols-2">
            <ProductCard tone="primary" className="space-y-4">
              <ProductSectionTitle
                eyebrow="Leaders"
                title="Top pullers"
                description="Heaviest positive contributors inside the current retained benchmark set."
              />
              {buildComponentRows(snapshot.topPullers, "positive")}
            </ProductCard>
            <ProductCard tone="primary" className="space-y-4">
              <ProductSectionTitle
                eyebrow="Draggers"
                title="Top draggers"
                description="Heaviest negative contributors inside the current retained benchmark set."
              />
              {buildComponentRows(snapshot.topDraggers, "negative")}
            </ProductCard>
          </section>

          <section id="timeline">
            <ProductCard tone="primary" className="space-y-4">
              <ProductSectionTitle
                eyebrow="Timeline"
                title="Composition and source context"
                description="A cleaner wrap-up block for roster visibility and benchmark source coverage."
              />
              <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
                {snapshot.components.slice(0, 4).map((item) => (
                  <ProductCard key={item.symbol} tone="secondary" className="space-y-2 p-4">
                    <p className="riddra-product-body text-[11px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.74)]">
                      {item.symbol}
                    </p>
                    <p className="riddra-product-body text-[15px] font-semibold text-[#1B3A6B]">{item.name}</p>
                    <p className="riddra-product-body text-sm text-[rgba(75,85,99,0.84)]">
                      {item.weight.toFixed(2)}% weight
                    </p>
                    <p className="riddra-product-number text-sm font-semibold" style={{ color: getTrendColor(item.changePercent) }}>
                      {formatProductPercent(item.changePercent, 2)}
                    </p>
                  </ProductCard>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/indices"
                  className="inline-flex items-center justify-center rounded-[10px] bg-[#1B3A6B] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#264a83]"
                >
                  Open indices
                </Link>
                <Link
                  href="/markets"
                  className="inline-flex items-center justify-center rounded-[10px] border border-[rgba(27,58,107,0.14)] bg-white px-4 py-2.5 text-sm font-medium text-[#1B3A6B] transition hover:border-[#D4853B] hover:text-[#D4853B]"
                >
                  Open markets
                </Link>
              </div>
            </ProductCard>
          </section>
        </div>
      }
      sidebar={sidebar}
    />
  );
}
