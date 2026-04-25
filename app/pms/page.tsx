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
  title: "PMS",
  description: "Riddra PMS hub for strategy-led wealth and manager pages.",
};

export default async function PmsIndexPage() {
  if (isStockFirstLaunchPlaceholderFamily("pms")) {
    return <StockFirstLaunchPlaceholderPage family="pms" pageCategory="pms" />;
  }

  const config = getRuntimeLaunchConfig();
  const truth = getSubscriberSurfaceTruth();
  const supportRegistry = getSupportOpsRegistrySummary("account");
  const publishedSlugs = await getPublishableCmsSlugSet("pms");
  const products = getWealthProductsByFamily("pms").filter((product) =>
    publishedSlugs.has(product.slug),
  );
  const overview = getWealthFamilyOverview("pms");
  const sidebar = await getGlobalSidebarRail("pms");

  return (
    <WealthFamilyHubPage
      eyebrow="Wealth products"
      title="PMS hub"
      description="Review PMS offerings with clear context on style, concentration, ticket size, manager process, and suitability."
      truthTitle="PMS hub route truth"
      truthDescription="Keep the PMS family honest about continuity and support while still behaving like a clean research hub."
      truthItems={getPublicTruthItems(truth, {
        continuitySubject: "PMS discovery",
        handoffLabel: "PMS-to-account handoff",
        billingSubject: "premium PMS workflow language",
        supportSubject: "public PMS users who convert",
      })}
      stats={[
        { label: "Tracked PMS routes", value: products.length },
        { label: "Entry posture", value: overview.ticketSummary },
        { label: "Coverage mix", value: overview.statusSummary },
        { label: "Support continuity", value: config.supportEmail || "Not configured yet", detail: `${supportRegistry.total} registry rows • ${supportRegistry.inProgress} in progress • ${supportRegistry.blocked} blocked` },
      ]}
      categories={[...new Set(products.map((product) => product.category))]}
      laneTitle="Compare lanes"
      laneDescription="Keep style-led compare and adjacent-manager discovery visible."
      laneItems={overview.compareHighlights}
      products={products}
      hrefBase="/pms"
      sidebar={sidebar}
    />
  );
}
