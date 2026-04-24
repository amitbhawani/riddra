import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { getGlobalSidebarRail } from "@/components/global-sidebar-rail-server";
import { JsonLd } from "@/components/json-ld";
import {
  ProductBulletListCard,
  ProductCard,
  ProductPageContainer,
  ProductPageTwoColumnLayout,
  ProductRouteGrid,
  ProductSectionTitle,
} from "@/components/product-page-system";
import { Eyebrow, SectionHeading } from "@/components/ui";
import { getLearnArticles, getLearningPaths, getMarketEvents } from "@/lib/learn";
import { getPublicTruthItems } from "@/lib/public-route-truth";
import { getPublishableCmsSlugSet } from "@/lib/publishable-content";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Learn",
  description: "Riddra learning hub for finance basics, IPO understanding, mutual fund comparisons, and market workflows.",
};

export default async function LearnPage() {
  const truth = getSubscriberSurfaceTruth();
  const [articles, learningPaths, marketEvents, publishedArticleSlugs, sidebar] = await Promise.all([
    getLearnArticles(),
    getLearningPaths(),
    getMarketEvents(),
    getPublishableCmsSlugSet("research_article"),
    getGlobalSidebarRail("learn"),
  ]);
  const visibleArticles = articles.filter((article) => publishedArticleSlugs.has(article.slug));
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Learn", href: "/learn" },
  ];

  return (
    <div className="riddra-product-page py-3 sm:py-4">
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <JsonLd
        data={buildWebPageSchema({
          title: "Learn",
          description: "Riddra learning hub for finance basics, IPO understanding, mutual fund comparisons, and market workflows.",
          path: "/learn",
        })}
      />
      <ProductPageContainer>
        <ProductPageTwoColumnLayout
          left={
            <div className="space-y-6">
              <div className="space-y-5">
                <Breadcrumbs items={breadcrumbs} />
                <Eyebrow>Evergreen authority</Eyebrow>
                <SectionHeading
                  title="Learn hub"
                  description="Build confidence in stocks, IPOs, funds, and market workflows through clear learning tracks and practical explainers."
                />
              </div>

              <ProductCard tone="secondary" className="space-y-4">
                <ProductSectionTitle
                  title="Learning route truth"
                  description="Keep the learning surface honest about account continuity and support while still behaving like a polished public product."
                />
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                  <ProductBulletListCard
                    title="Current posture"
                    description="Public learning stays useful, but it should not overstate connected premium continuity."
                    items={getPublicTruthItems(truth, {
                      continuitySubject: "education flows",
                      handoffLabel: "learn-to-account handoff",
                      billingSubject: "premium learning continuity",
                      supportSubject: "learn users who convert",
                    }).map((item) => ({ body: item }))}
                    variant="context"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { label: "Creator-ready layer", value: "Article and lesson depth" },
                      { label: "Live education", value: "Webinars and workshops" },
                      { label: "Distribution", value: "Newsletter loops" },
                      { label: "Support continuity", value: "Account-backed follow-through" },
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
                title="Learning tracks"
                description="Follow structured tracks so beginner questions, trader workflows, and long-term wealth topics feel connected instead of scattered."
                items={learningPaths.map((path) => ({
                  eyebrow: path.audience,
                  title: path.title,
                  description: `${path.summary} ${path.promise}`,
                  href: `/learn/tracks/${path.slug}`,
                  hrefLabel: "Open track",
                  meta: `${path.steps.length} steps`,
                }))}
              />

              <ProductRouteGrid
                title="Market event archive"
                description="Connect results, IPO windows, and NAV refresh cycles back into research, learning, and archive continuity."
                items={marketEvents.map((event) => ({
                  eyebrow: event.eventType,
                  title: event.title,
                  description: event.summary,
                  href: `/learn/events/${event.slug}`,
                  hrefLabel: "Open event page",
                  meta: `${event.status} • ${event.dateLabel}`,
                }))}
              />

              <ProductRouteGrid
                title="Explainers and articles"
                description="Keep evergreen explainers inside the same compact product system."
                items={visibleArticles.map((article) => ({
                  eyebrow: article.category,
                  title: article.title,
                  description: article.summary,
                  href: `/learn/${article.slug}`,
                  hrefLabel: "Open article",
                  meta: "Article",
                }))}
              />
            </div>
          }
          right={sidebar}
        />
      </ProductPageContainer>
    </div>
  );
}
