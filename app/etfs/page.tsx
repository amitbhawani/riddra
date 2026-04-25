import type { Metadata } from "next";

import { getGlobalSidebarRail } from "@/components/global-sidebar-rail-server";
import { StockFirstLaunchPlaceholderPage } from "@/components/stock-first-launch-placeholder-page";
import { WealthFamilyHubPage } from "@/components/wealth-family-hub-page";
import { getPublicTruthItems } from "@/lib/public-route-truth";
import { getPublishableCmsSlugSet } from "@/lib/publishable-content";
import { isStockFirstLaunchPlaceholderFamily } from "@/lib/public-launch-scope";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";
import { getWealthFamilyOverview, getWealthProductsByFamily } from "@/lib/wealth-products";

export const metadata: Metadata = {
  title: "ETFs",
  description: "Riddra ETF hub for benchmark-led passive and thematic fund discovery.",
};

export default async function EtfIndexPage() {
  if (isStockFirstLaunchPlaceholderFamily("etfs")) {
    return <StockFirstLaunchPlaceholderPage family="etfs" pageCategory="etfs" />;
  }

  const config = getRuntimeLaunchConfig();
  const truth = getSubscriberSurfaceTruth();
  const supportRegistry = getSupportOpsRegistrySummary("account");
  const publishedSlugs = await getPublishableCmsSlugSet("etf");
  const products = getWealthProductsByFamily("etf").filter((product) =>
    publishedSlugs.has(product.slug),
  );
  const overview = getWealthFamilyOverview("etf");
  const sidebar = await getGlobalSidebarRail("etfs");

  return (
    <WealthFamilyHubPage
      eyebrow="Wealth products"
      title="ETF hub"
      description="Browse ETFs with clear benchmark, liquidity, structure, and use-case context so passive products stay easy to compare."
      truthTitle="ETF hub route truth"
      truthDescription="Keep the ETF family honest about continuity and support while still behaving like a clean public research hub."
      truthItems={getPublicTruthItems(truth, {
        continuitySubject: "ETF discovery",
        handoffLabel: "ETF-to-account handoff",
        billingSubject: "ETF workflow language",
        supportSubject: "ETF users who convert",
      })}
      stats={[
        { label: "Tracked ETF routes", value: products.length },
        { label: "Ticket posture", value: overview.ticketSummary },
        { label: "Coverage mix", value: overview.statusSummary },
        { label: "Support continuity", value: config.supportEmail || "Not configured yet", detail: `${supportRegistry.total} support registry rows` },
      ]}
      categories={[...new Set(products.map((product) => product.category))]}
      laneTitle="Benchmark and compare lanes"
      laneDescription={overview.benchmarkHighlights.join(" / ")}
      laneItems={overview.compareHighlights}
      products={products}
      hrefBase="/etfs"
      sidebar={sidebar}
    />
  );
}
