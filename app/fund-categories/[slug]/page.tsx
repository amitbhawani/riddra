import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { AssetDiscoveryWorkspace, type AssetDiscoveryRow } from "@/components/asset-discovery-workspace";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import { JsonLd } from "@/components/json-ld";
import { StockFirstLaunchPlaceholderPage } from "@/components/stock-first-launch-placeholder-page";
import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import { ShowcaseRouteStrip } from "@/components/showcase-route-strip";
import { Eyebrow, GlowCard } from "@/components/ui";
import {
  describeFundCompareCandidate,
  getCanonicalFundCompareHref,
  getPreferredFundComparePairs,
  getPreferredFundShowcaseRoutes,
  getRankedFundCompareCandidates,
} from "@/lib/compare-routing";
import { getFundCategorySearchAliases } from "@/lib/fund-search-aliases";
import { getFundPortfolioLens, getFundReturnValue } from "@/lib/fund-research";
import { getFundsByCategorySlug, getFundCategoryHubs } from "@/lib/hubs";
import { getFundTruthLabel } from "@/lib/market-truth";
import { isStockFirstLaunchPlaceholderFamily } from "@/lib/public-launch-scope";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const hubs = await getFundCategoryHubs();
  return hubs.map((hub) => ({ slug: hub.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getFundsByCategorySlug(slug);

  if (!category) {
    return { title: "Fund category not found" };
  }

  return {
    title: `${category.hub.name}`,
    description: category.hub.description,
  };
}

export default async function FundCategoryDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const category = await getFundsByCategorySlug(slug);

  if (!category) {
    notFound();
  }

  if (isStockFirstLaunchPlaceholderFamily("fund_categories")) {
    return (
      <StockFirstLaunchPlaceholderPage
        family="fund_categories"
        variant="detail"
        pageCategory="mutual_funds"
        assetName={category.hub.name}
      />
    );
  }

  const showcaseSequence = getPreferredFundShowcaseRoutes(category.items, 3).map((fund, index) => {
    const topCompareCandidate = getRankedFundCompareCandidates(category.items, fund.slug, { limit: 1 })[0] ?? null;

    if (index === 0) {
      return {
        title: `Lead with ${fund.name}`,
        summary: "Start with the strongest fund detail route so benchmark, holdings, and suitability context land before category-level comparison begins.",
        href: `/mutual-funds/${fund.slug}`,
        label: `Open ${fund.name}`,
        tag: fund.snapshotMeta?.mode === "delayed_snapshot" ? "Verified route" : "Category anchor",
      };
    }

    if (topCompareCandidate) {
      return {
        title: `${fund.name} vs ${topCompareCandidate.name}`,
        summary: "Move into the in-category compare route when you want cost, return consistency, and overlap posture to scan faster than single-page reading.",
        href:
          getCanonicalFundCompareHref(category.items, fund.slug, topCompareCandidate.slug) ??
          `/compare/mutual-funds/${fund.slug}/${topCompareCandidate.slug}`,
        label: "Open compare route",
        tag: "In-category compare",
      };
    }

    return {
      title: `${fund.name} detail route`,
      summary: "Use the single-fund route to deepen holdings, manager, and benchmark context once the shortlist is clear.",
      href: `/mutual-funds/${fund.slug}`,
      label: "Open fund route",
      tag: "Detail route",
    };
  });

  const comparePairs = getPreferredFundComparePairs(category.items, 3).map(({ left, right }) => ({
    title: `${left.name} vs ${right.name}`,
    href:
      getCanonicalFundCompareHref(category.items, left.slug, right.slug) ??
      `/compare/mutual-funds/${left.slug}/${right.slug}`,
    note: `${category.hub.name} fit, cost, and benchmark posture compressed into a cleaner allocator decision route.`,
  }));

  const discoveryRows: AssetDiscoveryRow[] = category.items.map((fund) => {
    const topCompareCandidate = getRankedFundCompareCandidates(category.items, fund.slug, { limit: 1 })[0] ?? null;
    const compareMeta = topCompareCandidate ? describeFundCompareCandidate(fund, topCompareCandidate) : null;
    const compareHref = topCompareCandidate
      ? getCanonicalFundCompareHref(category.items, fund.slug, topCompareCandidate.slug) ??
        `/compare/mutual-funds/${fund.slug}/${topCompareCandidate.slug}`
      : undefined;
    const portfolioLens = getFundPortfolioLens(fund);
    const truthLabel = getFundTruthLabel(fund);

    return {
      id: fund.slug,
      name: fund.name,
      searchTokens: [
        fund.name,
        fund.category,
        fund.benchmark,
        fund.summary,
        fund.riskLabel,
        fund.expenseRatio,
        fund.fundManager.name,
        fund.fundManager.style,
        portfolioLens.dominantSector,
        portfolioLens.topHoldingsConcentration,
        ...getFundCategorySearchAliases(fund.category),
        truthLabel,
        topCompareCandidate?.name ?? "",
      ],
      category: fund.category.toLowerCase(),
      categoryLabel: fund.category,
      badge: fund.returns1Y,
      summary: fund.summary,
      truthLabel,
      truthTone:
        fund.snapshotMeta?.mode === "delayed_snapshot"
          ? "verified"
          : fund.snapshotMeta?.mode === "manual_nav"
            ? "managed"
            : "seeded",
      truthDetail:
        fund.snapshotMeta?.marketDetail ??
        (fund.factsheetMeta
          ? `${fund.factsheetMeta.documentLabel} captured on ${fund.factsheetMeta.sourceDate}.`
          : "This category route still mixes verified and seeded fund snapshots while delayed NAV coverage expands."),
      primaryMetric: {
        label: "Latest NAV",
        value: fund.nav,
      },
      metrics: [
        { label: "1Y return", value: fund.returns1Y },
        { label: "3Y return", value: getFundReturnValue(fund, "3Y CAGR") },
        { label: "Expense ratio", value: fund.expenseRatio },
        { label: "Top holdings", value: portfolioLens.topHoldingsConcentration },
      ],
      compareLabel: topCompareCandidate ? `${fund.name} vs ${topCompareCandidate.name}` : undefined,
      compareDetail: compareMeta?.rationale,
      compareHref,
      compareHighlight: compareMeta?.highlight,
      primaryHref: `/mutual-funds/${fund.slug}`,
      primaryHrefLabel: "Open fund",
      secondaryHref: fund.factsheetMeta?.referenceUrl,
      secondaryHrefLabel: fund.factsheetMeta?.referenceUrl ? "Open factsheet" : undefined,
      sortMetricValue: parseSignedPercent(fund.returns1Y),
      truthScore: fund.snapshotMeta?.mode === "delayed_snapshot" ? 3 : fund.snapshotMeta?.mode === "manual_nav" ? 2 : 1,
    };
  });

  const verifiedCount = category.items.filter((fund) => fund.snapshotMeta?.mode === "delayed_snapshot").length;
  const compareReadyCount = discoveryRows.filter((row) => row.compareHref).length;
  const leadFund = getPreferredFundShowcaseRoutes(category.items, 1)[0] ?? category.items[0] ?? null;
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Fund Categories", href: "/fund-categories" },
    { name: category.hub.name, href: `/fund-categories/${category.hub.slug}` },
  ];

  return (
    <>
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <JsonLd
        data={buildWebPageSchema({
          title: category.hub.name,
          description: category.hub.description,
          path: `/fund-categories/${category.hub.slug}`,
        })}
      />
      <GlobalSidebarPageShell
        category="mutual_funds"
        className="space-y-3.5 sm:space-y-4"
        leftClassName="riddra-legacy-light-surface space-y-6"
      >
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Fund category hub</Eyebrow>
          <h1 className="display-font text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {category.hub.name}
          </h1>
          <p className="max-w-3xl text-base leading-8 text-mist/76">{category.hub.description}</p>
          <p className="max-w-3xl text-sm leading-7 text-mist/70">
            Use this route as the bridge between broad mutual-fund browsing and a real shortlist. It keeps the strongest
            in-category funds, truth posture, and compare handoffs together.
          </p>
        </div>

        <PublicSurfaceTruthSection
          eyebrow="Fund-category truth"
          title="This category route is useful for shortlist discovery right now, but saved continuity still depends on launch activation"
          description={`Use ${category.hub.name} confidently for public discovery, while keeping auth continuity, premium workflow promises, and support follow-through honest until those live paths are fully verified.`}
          authReady="Signed-in continuity is active enough to carry category discovery into account and workspace flows."
          authPending="Local preview auth still limits how trustworthy the full category-to-account handoff can be."
          billingReady="Billing core credentials exist, so premium category workflow language can move beyond pure preview framing once checkout and webhook flows are exercised."
          billingPending="Billing credentials are still incomplete, so premium category promises should stay expectation-setting."
          supportReady="Support delivery is configured enough to begin testing real follow-up for shortlist users who convert into assisted workflows."
          supportPending="Support delivery is still not fully active, so category-route support expectations should stay conservative."
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
          secondaryHref="/account/support"
          secondaryHrefLabel="Open support continuity"
        />

        <div className="grid gap-6 lg:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-mist/68">Tracked funds</p>
            <p className="mt-2 text-3xl font-semibold text-white">{category.items.length}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Verified NAVs</p>
            <p className="mt-2 text-3xl font-semibold text-white">{verifiedCount}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Compare-ready</p>
            <p className="mt-2 text-3xl font-semibold text-white">{compareReadyCount}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Lead route</p>
            <p className="mt-2 text-xl font-semibold text-white">{leadFund?.name ?? "Category shortlist"}</p>
          </GlowCard>
        </div>

        <AssetDiscoveryWorkspace
          title={`${category.hub.name} discovery workspace`}
          description="Filter this category by truth posture and compare readiness so the hub behaves more like an allocator workspace than a static roster of funds."
          searchPlaceholder={`Search ${category.hub.name.toLowerCase()} by fund, benchmark, or compare peer`}
          categoryLabel="Category"
          rows={discoveryRows}
          sortOptions={[
            { value: "metric", label: "1Y return" },
            { value: "truth", label: "Truth posture" },
            { value: "compare", label: "Compare readiness" },
            { value: "name", label: "Alphabetical" },
          ]}
          defaultSort="metric"
        />

        <ShowcaseRouteStrip
          eyebrow="Best next clicks"
          title={`Open ${category.hub.name} the right way`}
          description="Use this sequence when you want the allocator story to feel guided: one strong fund route, one strong compare handoff, then deeper detail only when needed."
          items={showcaseSequence}
        />

        <GlowCard className="space-y-5">
          <p className="text-sm uppercase tracking-[0.18em] text-mist/52">Category compare routes</p>
          <h2 className="text-2xl font-semibold text-white">Best in-category matchups</h2>
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
                This category needs at least two routed funds before an in-category compare lane becomes meaningful.
              </div>
            )}
          </div>
        </GlowCard>
      </GlobalSidebarPageShell>
    </>
  );
}

function parseSignedPercent(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
