import type { Metadata } from "next";

import { WealthFamilyHubPage } from "@/components/wealth-family-hub-page";
import { getPublicTruthItems } from "@/lib/public-route-truth";
import { getPublishableCmsSlugSet } from "@/lib/publishable-content";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";
import { getWealthFamilyOverview, getWealthProductsByFamily } from "@/lib/wealth-products";

export const metadata: Metadata = {
  title: "SIF",
  description: "Riddra SIF hub for specialized investment fund exploration and category education.",
};

export default async function SifIndexPage() {
  const config = getRuntimeLaunchConfig();
  const truth = getSubscriberSurfaceTruth();
  const supportRegistry = getSupportOpsRegistrySummary("account");
  const publishedSlugs = await getPublishableCmsSlugSet("sif");
  const products = getWealthProductsByFamily("sif").filter((product) =>
    publishedSlugs.has(product.slug),
  );
  const overview = getWealthFamilyOverview("sif");
  return (
    <WealthFamilyHubPage
      eyebrow="Wealth products"
      title="SIF hub"
      description="Explore SIF offerings with category context, glossary-friendly guidance, and regulation-aware product framing."
      truthTitle="SIF hub route truth"
      truthDescription="Keep the SIF family honest about continuity and support while still behaving like a clean research hub."
      truthItems={getPublicTruthItems(truth, {
        continuitySubject: "SIF discovery",
        handoffLabel: "SIF-to-account handoff",
        billingSubject: "premium SIF workflow language",
        supportSubject: "public SIF users who convert",
      })}
      stats={[
        { label: "Tracked SIF routes", value: products.length },
        { label: "Entry posture", value: overview.ticketSummary },
        { label: "Coverage mix", value: overview.statusSummary },
        { label: "Support continuity", value: config.supportEmail || "Not configured yet", detail: `${supportRegistry.total} registry rows • ${supportRegistry.inProgress} in progress • ${supportRegistry.blocked} blocked` },
      ]}
      categories={[...new Set(products.map((product) => product.category))]}
      laneTitle="Compare lanes"
      laneDescription="Keep specialist compare and adjacent-category discovery visible."
      laneItems={overview.compareHighlights}
      products={products}
      hrefBase="/sif"
    />
  );
}
