import type { Metadata } from "next";
import Link from "next/link";

import { AssetDiscoveryWorkspace, type AssetDiscoveryRow } from "@/components/asset-discovery-workspace";
import { getGlobalSidebarRail } from "@/components/global-sidebar-rail-server";
import { MarketDataUnavailableState } from "@/components/market-data-unavailable-state";
import { StockFirstLaunchPlaceholderPage } from "@/components/stock-first-launch-placeholder-page";
import {
  ProductCard,
  ProductPageContainer,
  ProductPageTwoColumnLayout,
  ProductSectionTitle,
} from "@/components/product-page-system";
import { ShowcaseRouteStrip } from "@/components/showcase-route-strip";
import {
  describeFundCompareCandidate,
  getCanonicalFundCompareHref,
  getPreferredFundComparePairs,
  getPreferredFundShowcaseRoutes,
  getRankedFundCompareCandidates,
} from "@/lib/compare-routing";
import { getFunds } from "@/lib/content";
import { getFundCategorySearchAliases } from "@/lib/fund-search-aliases";
import { getFundPortfolioLens, getFundReturnValue } from "@/lib/fund-research";
import { getFundTruthLabel } from "@/lib/market-truth";
import { isStockFirstLaunchPlaceholderFamily } from "@/lib/public-launch-scope";

export const metadata: Metadata = {
  title: "Mutual Funds",
  description: "Riddra mutual fund hub with structured page templates and category-led discovery.",
};

export default async function MutualFundsIndexPage() {
  if (isStockFirstLaunchPlaceholderFamily("mutual_funds")) {
    return (
      <StockFirstLaunchPlaceholderPage
        family="mutual_funds"
        pageCategory="mutual_funds"
      />
    );
  }

  const funds = await getFunds();
  const sidebar = await getGlobalSidebarRail("mutual_funds");
  const categories = Array.from(new Set(funds.map((fund) => fund.category)));
  const verifiedCount = funds.filter((fund) => fund.snapshotMeta?.mode === "delayed_snapshot").length;
  const managedCount = funds.filter((fund) => fund.snapshotMeta?.mode === "manual_nav").length;
  const factsheetEvidenceCount = funds.filter((fund) => Boolean(fund.factsheetMeta)).length;
  const strongestPair = getPreferredFundComparePairs(funds, 1)[0] ?? null;
  const showcaseSequence = getPreferredFundShowcaseRoutes(funds, 3).map((fund, index) => {
    const topCompareCandidate = getRankedFundCompareCandidates(funds, fund.slug, { limit: 1 })[0] ?? null;
    const categoryHref = `/fund-categories/${fund.category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;

    if (index === 0) {
      return {
        title: `Open the ${fund.name} detail route`,
        summary: "Start on the fund page that already combines quick view, research framing, and a compare handoff in the same first-scroll flow.",
        href: `/mutual-funds/${fund.slug}`,
        label: `Open ${fund.name}`,
        tag: fund.snapshotMeta?.mode === "delayed_snapshot" ? "Verified route" : "Fund detail",
      };
    }

    if (topCompareCandidate) {
      return {
        title: `${fund.name} vs ${topCompareCandidate.name}`,
        summary: "Move into the ranked allocator path when you want cost, return, and category-fit differences to land faster than a hub scroll.",
        href:
          getCanonicalFundCompareHref(funds, fund.slug, topCompareCandidate.slug) ??
          `/compare/mutual-funds/${fund.slug}/${topCompareCandidate.slug}`,
        label: "Open fund compare",
        tag: "Compare flow",
      };
    }

    return {
      title: `${fund.category} discovery`,
      summary: "Return to category navigation only after the strongest fund page and compare path are already established.",
      href: categoryHref,
      label: "Open category hub",
      tag: "Broader discovery",
    };
  });
  const comparePairs = getPreferredFundComparePairs(funds, 3).map(({ left, right }) => ({
    title: `${left.name} vs ${right.name}`,
    href:
      getCanonicalFundCompareHref(funds, left.slug, right.slug) ?? `/compare/mutual-funds/${left.slug}/${right.slug}`,
    note: `${left.category} positioning versus ${right.category.toLowerCase()} posture in a cleaner ranked allocator matchup.`,
  }));
  const categoryCards = categories
    .map((category) => {
      const items = funds.filter((fund) => fund.category === category);
      const leadFund = getPreferredFundShowcaseRoutes(items, 1)[0] ?? items[0] ?? null;
      const verifiedRoutes = items.filter((fund) => fund.snapshotMeta?.mode === "delayed_snapshot").length;
      const comparePair = getPreferredFundComparePairs(items, 1)[0] ?? null;
      const categoryHref = `/fund-categories/${category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;

      return {
        category,
        href: categoryHref,
        count: items.length,
        verifiedRoutes,
        leadFund: leadFund?.name ?? "Category shortlist",
        compareLabel: comparePair ? `${comparePair.left.name} vs ${comparePair.right.name}` : "Compare route builds from the lead fund",
      };
    })
    .sort((left, right) => right.count - left.count || left.category.localeCompare(right.category));
  const discoveryRows: AssetDiscoveryRow[] = funds.map((fund) => {
    const topCompareCandidate = getRankedFundCompareCandidates(funds, fund.slug, { limit: 1 })[0] ?? null;
    const categoryHref = `/fund-categories/${fund.category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
    const compareMeta = topCompareCandidate ? describeFundCompareCandidate(fund, topCompareCandidate) : null;
    const compareHref = topCompareCandidate
      ? getCanonicalFundCompareHref(funds, fund.slug, topCompareCandidate.slug) ??
        `/compare/mutual-funds/${fund.slug}/${topCompareCandidate.slug}`
      : undefined;
    const portfolioLens = getFundPortfolioLens(fund);
    const truthLabel = getFundTruthLabel(fund);
    const categoryAliases = getFundCategorySearchAliases(fund.category);

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
        ...categoryAliases,
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
          : "This route stays conservative until a verified delayed NAV is written for the scheme."),
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
      secondaryHref: categoryHref,
      secondaryHrefLabel: "Open category",
      tertiaryHref: fund.factsheetMeta?.referenceUrl,
      tertiaryHrefLabel: fund.factsheetMeta?.referenceUrl ? "Open factsheet" : undefined,
      sortMetricValue: parseSignedPercent(fund.returns1Y),
      truthScore: fund.snapshotMeta?.mode === "delayed_snapshot" ? 3 : fund.snapshotMeta?.mode === "manual_nav" ? 2 : 1,
    };
  });

  if (funds.length === 0) {
    return (
      <div className="py-16 sm:py-24">
        <ProductPageContainer className="space-y-8">
          <div className="space-y-4">
            <ProductSectionTitle
              eyebrow="Mutual fund hub"
              title="Mutual fund hub"
              description="Browse funds by category, compare key stats, and move from quick discovery into deeper fund research pages."
            />
          </div>
          <MarketDataUnavailableState
            state="unavailable"
            eyebrow="Fund hub availability"
            title="No public fund routes are ready yet"
            description="This hub stays empty until real tracked fund records are available."
            items={[
              "Published fund routes appear here only when real records and trusted NAV data are available.",
              "Unavailable coverage remains withheld instead of being replaced with placeholder fund cards.",
            ]}
          />
        </ProductPageContainer>
      </div>
    );
  }

  return (
    <div className="riddra-product-page py-3 sm:py-4">
      <ProductPageContainer>
        <ProductPageTwoColumnLayout
          left={
            <div className="space-y-6">
        <div className="space-y-4">
          <ProductSectionTitle
            eyebrow="Mutual fund hub"
            title="Mutual fund hub"
            description="Browse funds by category, compare key stats, and move from quick discovery into deeper fund research pages."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <ProductCard tone="primary" className="p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Tracked funds</p>
            <p className="mt-1 text-[22px] font-semibold text-[#111827]">{funds.length}</p>
            <p className="mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">
              Public fund routes currently available for allocator discovery, compare, and benchmark-led follow-through.
            </p>
          </ProductCard>
          <ProductCard tone="primary" className="p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Route truth</p>
            <p className="mt-1 text-[18px] font-semibold text-[#111827]">
              {verifiedCount} verified · {managedCount} managed
            </p>
            <p className="mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">
              Use delayed or managed NAV routes first when the demo needs stronger current-state credibility.
            </p>
          </ProductCard>
          <ProductCard tone="primary" className="p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Strongest compare route</p>
            <p className="mt-1 text-[18px] font-semibold text-[#111827]">
              {strongestPair ? `${strongestPair.left.name} vs ${strongestPair.right.name}` : "Compare lane pending"}
            </p>
            <p className="mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">
              Category and hub pages now rotate through multiple ranked compare routes instead of showing only one showcase matchup.
            </p>
          </ProductCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <ProductCard tone="primary" className="p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Category hubs</p>
            <p className="mt-1 text-[22px] font-semibold text-[#111827]">{categories.length}</p>
            <p className="mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">
              Category-led navigation stays useful when the user knows the allocation lane but not the final fund yet.
            </p>
          </ProductCard>
          <ProductCard tone="primary" className="p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Factsheet evidence</p>
            <p className="mt-1 text-[22px] font-semibold text-[#111827]">{factsheetEvidenceCount}</p>
            <p className="mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">
              Evidence-backed routes can point to captured AMC documents instead of relying only on seeded fund copy.
            </p>
          </ProductCard>
          <ProductCard tone="primary" className="p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Investor workflow</p>
            <p className="mt-1 text-[18px] font-semibold text-[#111827]">Returns, risk, holdings, allocation, compare</p>
            <p className="mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">
              The public fund hub should feel like an allocator workspace before the detailed page opens.
            </p>
          </ProductCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {categoryCards.map((card) => (
            <Link key={card.category} href={card.href}>
              <ProductCard tone="primary" className="h-full p-4 transition hover:border-[rgba(27,58,107,0.18)] hover:bg-[rgba(27,58,107,0.03)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-[18px] font-semibold text-[#111827]">{card.category}</h2>
                    <p className="mt-2 text-[13px] leading-6 text-[rgba(75,85,99,0.84)]">
                      Use category views to compare funds faster and narrow the shortlist that fits your allocation plan.
                    </p>
                  </div>
                  <div className="rounded-full border border-[rgba(221,215,207,0.96)] bg-white/92 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[#1B3A6B]">
                    {card.count} funds
                  </div>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white/92 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Lead route</p>
                    <p className="mt-1 text-[13px] font-semibold text-[#111827]">{card.leadFund}</p>
                  </div>
                  <div className="rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white/92 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Verified routes</p>
                    <p className="mt-1 text-[13px] font-semibold text-[#111827]">{card.verifiedRoutes}</p>
                  </div>
                  <div className="rounded-[10px] border border-[rgba(221,215,207,0.96)] bg-white/92 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">Best compare</p>
                    <p className="mt-1 text-[13px] font-semibold text-[#111827]">{card.compareLabel}</p>
                  </div>
                </div>
              </ProductCard>
            </Link>
          ))}
        </div>

        <AssetDiscoveryWorkspace
          title="Route-backed fund discovery"
          description="Search the mutual-fund bench by category, truth posture, and compare readiness so the hub behaves like a real allocator workspace instead of a static fund roster."
          searchPlaceholder="Search by fund, category, benchmark, or peer"
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
          eyebrow="Walkthrough path"
          title="Best fund opening sequence"
          description="Use this sequence when you want the investor-side demo to feel guided: one strong detail route, one strong compare route, then broader category discovery."
          items={showcaseSequence}
        />

        <ProductCard tone="primary" className="space-y-4 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(107,114,128,0.72)]">Showcase comparison</p>
          <h2 className="text-[16px] font-semibold text-[#111827]">Mutual fund demo routes</h2>
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
            </div>
          }
          right={sidebar}
        />
      </ProductPageContainer>
    </div>
  );
}

function parseSignedPercent(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
