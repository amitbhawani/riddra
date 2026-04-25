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
  title: "AIF",
  description: "Riddra AIF hub for alternative investment fund pages and category-led context.",
};

export default async function AifIndexPage() {
  if (isStockFirstLaunchPlaceholderFamily("aif")) {
    return <StockFirstLaunchPlaceholderPage family="aif" pageCategory="aif" />;
  }

  const config = getRuntimeLaunchConfig();
  const truth = getSubscriberSurfaceTruth();
  const supportRegistry = getSupportOpsRegistrySummary("account");
  const publishedSlugs = await getPublishableCmsSlugSet("aif");
  const products = getWealthProductsByFamily("aif").filter((product) =>
    publishedSlugs.has(product.slug),
  );
  const overview = getWealthFamilyOverview("aif");
  const sidebar = await getGlobalSidebarRail("aif");

  return (
    <WealthFamilyHubPage
      eyebrow="Wealth products"
      title="AIF hub"
      description="Review AIF offerings with strong emphasis on structure, eligibility, lock-in, strategy, and document-backed context."
      truthTitle="AIF hub route truth"
      truthDescription="Keep the AIF family honest about continuity and support while still behaving like a clean research hub."
      truthItems={getPublicTruthItems(truth, {
        continuitySubject: "AIF discovery",
        handoffLabel: "AIF-to-account handoff",
        billingSubject: "premium AIF workflow language",
        supportSubject: "public AIF users who convert",
      })}
      stats={[
        { label: "Tracked AIF routes", value: products.length },
        { label: "Entry posture", value: overview.ticketSummary },
        { label: "Coverage mix", value: overview.statusSummary },
        { label: "Support continuity", value: config.supportEmail || "Not configured yet", detail: `${supportRegistry.total} registry rows • ${supportRegistry.inProgress} in progress • ${supportRegistry.blocked} blocked` },
      ]}
      categories={[...new Set(products.map((product) => product.category))]}
      laneTitle="Compare lanes"
      laneDescription="Keep category-led compare and adjacent-alternative discovery visible."
      laneItems={overview.compareHighlights}
      products={products}
      hrefBase="/aif"
      sidebar={sidebar}
    />
  );
}
