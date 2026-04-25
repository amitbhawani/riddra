import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getGlobalSidebarRail } from "@/components/global-sidebar-rail-server";
import {
  ProductBulletListCard,
  ProductInsightGridCard,
  ProductPageShell,
  ProductPageTwoColumnLayout,
  ProductRouteRailCard,
} from "@/components/product-page-system";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { getLearningPath, getLearningPathRoutes, getLearningPaths } from "@/lib/learn";
import { getPublicTruthItems } from "@/lib/public-route-truth";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getLearningPathRoutes().map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const learningPath = await getLearningPath(slug);

  if (!learningPath) {
    return { title: "Learning track not found" };
  }

  return {
    title: learningPath.title,
    description: learningPath.summary,
  };
}

export default async function LearningTrackPage({ params }: PageProps) {
  const { slug } = await params;
  const learningPath = await getLearningPath(slug);
  const learningPaths = await getLearningPaths();

  if (!learningPath) {
    notFound();
  }

  const siblingTracks = learningPaths.filter((path) => path.slug !== learningPath.slug);
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Learn", href: "/learn" },
    { label: learningPath.title, href: `/learn/tracks/${learningPath.slug}` },
  ];
  const truthItems = getPublicTruthItems(getSubscriberSurfaceTruth(), {
    continuitySubject: "guided learning",
    handoffLabel: "track-to-account handoff",
    billingSubject: "premium learning-track language",
    supportSubject: "users coming through guided tracks",
  });
  const sidebar = await getGlobalSidebarRail("learn");

  return (
    <ProductPageShell
      breadcrumbs={breadcrumbs}
      hero={
        <section className="riddra-product-card rounded-[12px] border border-[rgba(27,58,107,0.14)] bg-[linear-gradient(180deg,#FFFFFF_0%,rgba(248,246,242,0.97)_100%)] p-4 shadow-[0_10px_28px_rgba(27,58,107,0.045)]">
          <p className="riddra-product-body text-[11px] font-medium uppercase tracking-[0.18em] text-[rgba(107,114,128,0.74)]">
            {learningPath.audience}
          </p>
          <div className="mt-2 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
            <div className="space-y-2">
              <h1 className="riddra-product-display text-[2rem] font-semibold leading-[1.04] tracking-tight text-[#1B3A6B] sm:text-[2.55rem] lg:text-[3rem]">
                {learningPath.title}
              </h1>
              <p className="riddra-product-body max-w-3xl text-[14px] leading-7 text-[rgba(107,114,128,0.9)]">
                {learningPath.summary}
              </p>
              <p className="riddra-product-body max-w-3xl text-[13px] leading-6 text-[rgba(107,114,128,0.82)]">
                {learningPath.promise}
              </p>
            </div>
            <div className="rounded-[10px] border border-[rgba(226,222,217,0.82)] bg-white px-3 py-2.5">
              <p className="riddra-product-body text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.8)]">
                Sequence depth
              </p>
              <p className="riddra-product-number mt-1.5 text-[15px] font-medium text-[#1B3A6B]">
                {learningPath.steps.length} guided steps
              </p>
            </div>
          </div>
        </section>
      }
      stickyTabs={null}
      summary={null}
      sidebar={sidebar}
      supportingSections={
        <ProductPageTwoColumnLayout
          left={
            <>
              <ProductBulletListCard
                id="sequence"
                eyebrow="Track sequence"
                title="Step-by-step path"
                description="The sequence stays fully rendered in the DOM so the track remains crawlable and easy to scan."
                items={learningPath.steps.map((step, index) => ({
                  title: `Step ${index + 1}`,
                  body: step,
                }))}
                variant="checklist"
              />

              <ProductBulletListCard
                id="focus-areas"
                eyebrow="Focus areas"
                title="What this track reinforces"
                description="Use these focus areas to understand what this guided route is helping a learner build."
                items={learningPath.focusAreas.map((item) => ({ body: item }))}
                variant="context"
              />

              <ProductRouteRailCard
                id="related-routes"
                eyebrow="Best next routes"
                title="Best next routes"
                description="Track routes stay connected to the rest of the product through explicit next-step handoffs."
                items={learningPath.relatedRoutes.map((item) => ({
                  title: item.label,
                  description: item.note,
                  href: item.href,
                  hrefLabel: "Open page",
                  meta: item.href,
                }))}
                variant="routes"
              />

              <ProductRouteRailCard
                id="other-tracks"
                eyebrow="Other learner lanes"
                title="Other learner lanes"
                description="Sibling tracks stay visible in the main flow instead of being hidden behind a separate dark shell."
                items={siblingTracks.map((item) => ({
                  title: item.title,
                  description: item.summary,
                  href: `/learn/tracks/${item.slug}`,
                  hrefLabel: "Open track",
                  meta: item.audience,
                }))}
                variant="routes"
              />
            </>
          }
          right={
            <>
              <SubscriberTruthNotice
                eyebrow="Learning-track truth"
                title="This guided track is useful for public learning right now, but supported continuity still depends on launch activation"
                description="Use this learning track confidently for guided discovery, while keeping signed-in continuity, support follow-through, and premium workflow promises honest until the live paths are fully verified."
                items={truthItems}
                href="/launch-readiness"
                hrefLabel="Open launch readiness"
                secondaryHref="/account/support"
                secondaryHrefLabel="Open support continuity"
              />

              <ProductInsightGridCard
                eyebrow="Track context"
                title="Track snapshot"
                description="The side rail stays compact and editorial-first."
                items={[
                  { label: "Track type", value: learningPath.audience },
                  { label: "Sequence depth", value: `${learningPath.steps.length} guided steps` },
                  { label: "Companion routes", value: `${learningPath.relatedRoutes.length} linked surfaces` },
                  { label: "Route family", value: "Learn" },
                ]}
                variant="analysis"
              />

              <ProductBulletListCard
                eyebrow="Operating note"
                title="Current route posture"
                items={[
                  {
                    body: "The learning layer already gives users a concrete track-by-track reading path, while deeper media, replay, and progress persistence can come later without changing this route structure.",
                  },
                ]}
                variant="context"
              />
            </>
          }
        />
      }
    />
  );
}
