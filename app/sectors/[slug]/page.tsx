import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { AssetDiscoveryWorkspace, type AssetDiscoveryRow } from "@/components/asset-discovery-workspace";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import { JsonLd } from "@/components/json-ld";
import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import { ShowcaseRouteStrip } from "@/components/showcase-route-strip";
import { Eyebrow, GlowCard } from "@/components/ui";
import {
  describeStockCompareCandidate,
  getCanonicalStockCompareHref,
  getPreferredStockComparePairs,
  getPreferredStockShowcaseRoutes,
  getRankedStockCompareCandidates,
} from "@/lib/compare-routing";
import { getStocksBySectorSlug, getStockSectorHubs } from "@/lib/hubs";
import { getStockTruthLabel } from "@/lib/market-truth";
import type { StockSnapshot } from "@/lib/mock-data";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";
import { getStockOwnershipLens } from "@/lib/stock-research";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const hubs = await getStockSectorHubs();
  return hubs.map((hub) => ({ slug: hub.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const sector = await getStocksBySectorSlug(slug);

  if (!sector) {
    return { title: "Sector not found" };
  }

  return {
    title: `${sector.hub.name} Stocks`,
    description: sector.hub.description,
  };
}

export default async function SectorDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const sector = await getStocksBySectorSlug(slug);

  if (!sector) {
    notFound();
  }

  const showcaseSequence = getPreferredStockShowcaseRoutes(sector.items, 3).map((stock, index) => {
    const topCompareCandidate = getRankedStockCompareCandidates(sector.items, stock.slug, { limit: 1 })[0] ?? null;

    if (index === 0) {
      return {
        title: `Lead with ${stock.name}`,
        summary: "Start with the strongest same-sector stock route so quote, research, and chart context land before the peer debate starts.",
        href: `/stocks/${stock.slug}`,
        label: `Open ${stock.name}`,
        tag: stock.snapshotMeta?.mode === "delayed_snapshot" ? "Verified route" : "Sector anchor",
      };
    }

    if (topCompareCandidate) {
      return {
        title: `${stock.name} vs ${topCompareCandidate.name}`,
        summary: "Move into the same-sector compare route when the story shifts from company research into leadership, leverage, and quality tradeoffs.",
        href:
          getCanonicalStockCompareHref(sector.items, stock.slug, topCompareCandidate.slug) ??
          `/compare/stocks/${stock.slug}/${topCompareCandidate.slug}`,
        label: "Open compare route",
        tag: "Same-sector compare",
      };
    }

    return {
      title: `${stock.name} chart`,
      summary: "Use the chart route when the walkthrough needs price structure before the full stock page.",
      href: `/stocks/${stock.slug}/chart`,
      label: "Open chart route",
      tag: "Chart-first",
    };
  });

  const comparePairs = getPreferredStockComparePairs(sector.items, 3).map(({ left, right }) => ({
    title: `${left.name} vs ${right.name}`,
    href:
      getCanonicalStockCompareHref(sector.items, left.slug, right.slug) ??
      `/compare/stocks/${left.slug}/${right.slug}`,
    note: `${sector.hub.name} leadership, quality, and leverage framed in a cleaner sector-matched head-to-head route.`,
  }));

  const discoveryRows: AssetDiscoveryRow[] = sector.items.map((stock) => {
    const topCompareCandidate = getRankedStockCompareCandidates(sector.items, stock.slug, { limit: 1 })[0] ?? null;
    const compareMeta = topCompareCandidate ? describeStockCompareCandidate(stock, topCompareCandidate) : null;
    const compareHref = topCompareCandidate
      ? getCanonicalStockCompareHref(sector.items, stock.slug, topCompareCandidate.slug) ??
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
        "This sector route still mixes verified and seeded stock snapshots while delayed-quote coverage expands.",
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

  const verifiedCount = sector.items.filter((stock) => stock.snapshotMeta?.mode === "delayed_snapshot").length;
  const compareReadyCount = discoveryRows.filter((row) => row.compareHref).length;
  const leadStock = getPreferredStockShowcaseRoutes(sector.items, 1)[0] ?? sector.items[0] ?? null;
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Sectors", href: "/sectors" },
    { name: sector.hub.name, href: `/sectors/${sector.hub.slug}` },
  ];

  return (
    <div className="py-16 sm:py-24">
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <JsonLd
        data={buildWebPageSchema({
          title: `${sector.hub.name} Stocks`,
          description: sector.hub.description,
          path: `/sectors/${sector.hub.slug}`,
        })}
      />
      <GlobalSidebarPageShell category="sectors">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Sector hub</Eyebrow>
          <h1 className="display-font text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {sector.hub.name} stocks
          </h1>
          <p className="max-w-3xl text-base leading-8 text-mist/76">{sector.hub.description}</p>
          <p className="max-w-3xl text-sm leading-7 text-mist/70">
            Use this route as the bridge between broad stock discovery and single-name conviction. It keeps the strongest
            same-sector names, truth posture, and compare handoffs in one place.
          </p>
        </div>

        <PublicSurfaceTruthSection
          eyebrow="Sector truth"
          title="This sector route is useful for same-theme discovery right now, but saved continuity still depends on launch activation"
          description={`Use ${sector.hub.name} confidently for public stock discovery, while keeping auth continuity, premium workflow promises, and support follow-through honest until those live paths are fully verified.`}
          authReady="Signed-in continuity is active enough to carry sector discovery into account and workspace flows."
          authPending="Local preview auth still limits how trustworthy the full sector-to-account handoff can be."
          billingReady="Billing core credentials exist, so premium sector workflow language can move beyond pure preview framing once checkout and webhook flows are exercised."
          billingPending="Billing credentials are still incomplete, so premium sector promises should stay expectation-setting."
          supportReady="Support delivery is configured enough to begin testing real follow-up for sector users who convert into assisted workflows."
          supportPending="Support delivery is still not fully active, so sector-route support expectations should stay conservative."
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
          secondaryHref="/account/support"
          secondaryHrefLabel="Open support continuity"
        />

        <div className="grid gap-6 lg:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-mist/68">Tracked stocks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{sector.items.length}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Verified snapshots</p>
            <p className="mt-2 text-3xl font-semibold text-white">{verifiedCount}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Compare-ready</p>
            <p className="mt-2 text-3xl font-semibold text-white">{compareReadyCount}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Lead route</p>
            <p className="mt-2 text-xl font-semibold text-white">{leadStock?.name ?? "Sector shortlist"}</p>
          </GlowCard>
        </div>

        <AssetDiscoveryWorkspace
          title={`${sector.hub.name} discovery workspace`}
          description="Filter this sector by truth posture and compare readiness so the hub behaves like a real same-theme research desk instead of a flat list of cards."
          searchPlaceholder={`Search ${sector.hub.name.toLowerCase()} stocks by company, ticker, or compare peer`}
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
          eyebrow="Best next clicks"
          title={`Open ${sector.hub.name} the right way`}
          description="Use this sequence when you want the sector story to feel intentional: one strong stock route, one strong compare handoff, then chart-first proof."
          items={showcaseSequence}
        />

        <GlowCard className="space-y-5">
          <p className="text-sm uppercase tracking-[0.18em] text-mist/52">Sector compare routes</p>
          <h2 className="text-2xl font-semibold text-white">Best same-sector debates</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {comparePairs.length ? (
              comparePairs.map((pair) => (
                <Link key={pair.href} href={pair.href}>
                  <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 transition hover:border-white/18 hover:bg-white/[0.04]">
                    <h3 className="text-lg font-semibold text-white">{pair.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-mist/74">{pair.note}</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/12 bg-black/15 px-4 py-5 text-sm text-mist/68">
                This sector needs at least two routed stocks before a same-sector compare lane becomes meaningful.
              </div>
            )}
          </div>
        </GlowCard>
      </GlobalSidebarPageShell>
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
