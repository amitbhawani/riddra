import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getGlobalSidebarRail } from "@/components/global-sidebar-rail-server";
import { JsonLd } from "@/components/json-ld";
import { UserContentActionCard } from "@/components/user-content-action-card";
import {
  ProductBulletListCard,
  ProductCard,
  ProductInsightGridCard,
  ProductPageShell,
  ProductPageTwoColumnLayout,
  ProductSectionTitle,
} from "@/components/product-page-system";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { getLearnArticle, getLearnArticles } from "@/lib/learn";
import { getPublicTruthItems } from "@/lib/public-route-truth";
import { getPublishableCmsRecordBySlug, getPublishableCmsSlugSet } from "@/lib/publishable-content";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const publishedSlugs = await getPublishableCmsSlugSet("research_article");
  const articles = await getLearnArticles();
  return articles
    .filter((article) => publishedSlugs.has(article.slug))
    .map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const publishableRecord = await getPublishableCmsRecordBySlug("research_article", slug);
  if (!publishableRecord) {
    return { title: "Learn article not found" };
  }
  const article = await getLearnArticle(slug);

  if (!article) {
    return { title: "Learn article not found" };
  }

  return {
    title: article.title,
    description: article.summary,
  };
}

export default async function LearnArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const publishableRecord = await getPublishableCmsRecordBySlug("research_article", slug);
  if (!publishableRecord) {
    notFound();
  }
  const article = await getLearnArticle(slug);

  if (!article) {
    notFound();
  }

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Learn", href: "/learn" },
    { label: article.title, href: `/learn/${article.slug}` },
  ];
  const schemaBreadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Learn", href: "/learn" },
    { name: article.title, href: `/learn/${article.slug}` },
  ];
  const truthItems = getPublicTruthItems(getSubscriberSurfaceTruth(), {
    continuitySubject: "learn flows",
    handoffLabel: "learn-to-account handoff",
    billingSubject: "premium education workflow language",
    supportSubject: "readers who convert into assisted workflows",
  });
  const sidebar = await getGlobalSidebarRail("learn");

  return (
    <>
      <JsonLd data={buildBreadcrumbSchema(schemaBreadcrumbs)} />
      <JsonLd
        data={buildWebPageSchema({
          title: article.title,
          description: article.summary,
          path: `/learn/${article.slug}`,
        })}
      />
      <ProductPageShell
        breadcrumbs={breadcrumbs}
        hero={
          <ProductCard tone="primary" className="space-y-4">
            <div className="space-y-1.5">
              <p className="riddra-product-body text-[11px] font-medium uppercase tracking-[0.18em] text-[rgba(107,114,128,0.74)]">
                {article.category}
              </p>
              <h1 className="riddra-product-display text-[2rem] font-semibold leading-[1.04] tracking-tight text-[#1B3A6B] sm:text-[2.5rem] lg:text-[3rem]">
                {article.title}
              </h1>
              <p className="riddra-product-body max-w-3xl text-[14px] leading-7 text-[rgba(107,114,128,0.9)]">
                {article.summary}
              </p>
            </div>
          </ProductCard>
        }
        stickyTabs={null}
        summary={null}
        supportingSections={
          <ProductPageTwoColumnLayout
            left={
              <>
                <ProductCard id="summary" tone="secondary" className="space-y-3">
                  <ProductSectionTitle
                    eyebrow="Article summary"
                    title="Why this lesson matters"
                    description="Keep the article readable and search-friendly while aligning it with the same editorial shell rhythm as the rest of the product."
                  />
                  <p className="riddra-product-body text-[14px] leading-7 text-[rgba(107,114,128,0.92)]">
                    {article.summary}
                  </p>
                </ProductCard>

                <ProductBulletListCard
                  id="takeaways"
                  eyebrow="Key takeaways"
                  title="What to remember"
                  description="These takeaways stay fully rendered in the page so the route remains useful as a public learning surface."
                  items={article.keyTakeaways.map((item) => ({ body: item }))}
                  variant="checklist"
                />
              </>
            }
            right={
              <>
                <UserContentActionCard
                  pageType="learn"
                  slug={article.slug}
                  title={article.title}
                  href={`/learn/${article.slug}`}
                  isSignedIn={false}
                  featureGate={{
                    label: "Research access",
                    enabled: false,
                    featureKey: "research_access",
                    lockedReason:
                      "This editorial layer stays public-friendly, but the deeper research workflow and continuity prompts are tied to membership.",
                    ctaHref: "/pricing",
                    ctaLabel: "See membership options",
                  }}
                />
                <SubscriberTruthNotice
                  eyebrow="Learn-article truth"
                  title="This learn route is useful for public education right now, but saved continuity still depends on launch activation"
                  description={`Use ${article.title} confidently for public education, while keeping auth continuity, premium workflow promises, and support follow-through honest until those live paths are fully verified.`}
                  items={truthItems}
                  href="/launch-readiness"
                  hrefLabel="Open launch readiness"
                  secondaryHref="/account/support"
                  secondaryHrefLabel="Open support continuity"
                />

                <ProductInsightGridCard
                  eyebrow="Article context"
                  title="Reading context"
                  description="Editorial support stays compact in the side rail instead of becoming a second long page."
                  items={[
                    { label: "Content type", value: "Learn article" },
                    { label: "Category", value: article.category },
                    { label: "Route family", value: "Learn" },
                    { label: "Public posture", value: "Editorial-first" },
                  ]}
                  variant="analysis"
                />
                {sidebar}
              </>
            }
          />
        }
      />
    </>
  );
}
