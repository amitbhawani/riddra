import type { Metadata } from "next";

import { getGlobalSidebarRail } from "@/components/global-sidebar-rail-server";
import {
  ProductBulletListCard,
  ProductCard,
  ProductPageContainer,
  ProductPageTwoColumnLayout,
  ProductRouteGrid,
  ProductSectionTitle,
} from "@/components/product-page-system";
import { Eyebrow, SectionHeading } from "@/components/ui";
import { getPublicTruthItems } from "@/lib/public-route-truth";
import { getPublishableCmsSlugSet } from "@/lib/publishable-content";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { newsletterRules, newsletterSummary, newsletterTracks } from "@/lib/newsletter";

export const metadata: Metadata = {
  title: "Newsletter",
  description: "Riddra newsletter and distribution hub for market briefs, IPO alerts, investor updates, and subscriber nudges.",
};

export default async function NewsletterPage() {
  const truth = getSubscriberSurfaceTruth();
  const [publishedSlugs, sidebar] = await Promise.all([
    getPublishableCmsSlugSet("newsletter"),
    getGlobalSidebarRail("newsletter"),
  ]);
  const visibleTracks = newsletterTracks.filter((track) => publishedSlugs.has(track.slug));
  return (
    <div className="riddra-product-page py-3 sm:py-4">
      <ProductPageContainer>
        <ProductPageTwoColumnLayout
          left={
            <div className="space-y-6">
              <div className="space-y-5">
                <Eyebrow>Distribution engine</Eyebrow>
                <SectionHeading
                  title="Newsletter and distribution"
                  description="Stay connected through market briefs, IPO updates, investor education, and subscriber-focused distribution tracks."
                />
              </div>

              <ProductCard tone="secondary" className="space-y-4">
                <ProductSectionTitle
                  title="Newsletter route truth"
                  description="Keep distribution surfaces honest about subscriber continuity and delivery posture while staying clean and public-facing."
                />
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                  <ProductBulletListCard
                    title="Current posture"
                    description="Distribution flows should feel trustworthy, but not overstate subscriber continuity."
                    items={getPublicTruthItems(truth, {
                      continuitySubject: "distribution flows",
                      handoffLabel: "newsletter-to-account handoff",
                      billingSubject: "premium subscriber-upgrade language",
                      supportSubject: "newsletter readers who convert",
                    }).map((item) => ({ body: item }))}
                    variant="context"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { label: "Distribution loops", value: newsletterSummary.distributionLoops },
                      { label: "Primary segments", value: newsletterSummary.primarySegments },
                      { label: "Launch channels", value: newsletterSummary.launchChannels },
                      { label: "Archive templates", value: newsletterSummary.archiveTemplates },
                    ].map((item) => (
                      <ProductCard key={item.label} tone="compact" className="space-y-1.5 px-4 py-4">
                        <p className="riddra-product-body text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.76)]">{item.label}</p>
                        <p className="riddra-product-number text-[18px] text-[#1B3A6B]">{item.value}</p>
                      </ProductCard>
                    ))}
                  </div>
                </div>
              </ProductCard>

              <ProductRouteGrid
                title="Distribution tracks"
                description="Keep newsletter tracks inside the same compact route system as the rest of the product."
                items={visibleTracks.map((track) => ({
                  eyebrow: track.cadence,
                  title: track.title,
                  description: `${track.audience} • ${track.summary}`,
                  href: `/newsletter/${track.slug}`,
                  hrefLabel: "Open track",
                  meta: "Newsletter",
                }))}
              />

              <ProductBulletListCard
                title="Distribution rules"
                description="Keep operating rules compact and readable inside the unified product system."
                items={newsletterRules.map((rule) => ({ body: rule }))}
                variant="context"
              />
            </div>
          }
          right={sidebar}
        />
      </ProductPageContainer>
    </div>
  );
}
