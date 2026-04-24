import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getGlobalSidebarRail } from "@/components/global-sidebar-rail-server";
import {
  ProductBulletListCard,
  ProductInsightGridCard,
  ProductPageShell,
  ProductPageTwoColumnLayout,
} from "@/components/product-page-system";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { getNewsletterTrackBySlug, newsletterTracks } from "@/lib/newsletter";
import { getPublicTruthItems } from "@/lib/public-route-truth";
import { getPublishableCmsRecordBySlug, getPublishableCmsSlugSet } from "@/lib/publishable-content";
import { replayMemoryChains } from "@/lib/replay-memory";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const publishedSlugs = await getPublishableCmsSlugSet("newsletter");
  return newsletterTracks
    .filter((track) => publishedSlugs.has(track.slug))
    .map((track) => ({ slug: track.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const publishableRecord = await getPublishableCmsRecordBySlug("newsletter", slug);
  if (!publishableRecord) {
    return { title: "Newsletter track not found" };
  }
  const track = getNewsletterTrackBySlug(slug);

  if (!track) {
    return { title: "Newsletter track not found" };
  }

  return {
    title: track.title,
    description: track.summary,
  };
}

export default async function NewsletterTrackPage({ params }: PageProps) {
  const { slug } = await params;
  const publishableRecord = await getPublishableCmsRecordBySlug("newsletter", slug);
  if (!publishableRecord) {
    notFound();
  }
  const track = getNewsletterTrackBySlug(slug);

  if (!track) {
    notFound();
  }

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Newsletter", href: "/newsletter" },
    { label: track.title, href: `/newsletter/${track.slug}` },
  ];
  const relatedReplayChains = replayMemoryChains.slice(0, 2);
  const config = getRuntimeLaunchConfig();
  const truth = getSubscriberSurfaceTruth();
  const supportRegistry = getSupportOpsRegistrySummary("account");
  const truthItems = getPublicTruthItems(truth, {
    continuitySubject: "newsletter flows",
    handoffLabel: "newsletter-to-account handoff",
    billingSubject: "premium newsletter workflow language",
    supportSubject: "readers who convert into assisted workflows",
  });
  const sidebar = await getGlobalSidebarRail("newsletter");

  return (
    <ProductPageShell
      breadcrumbs={breadcrumbs}
      hero={
        <section className="riddra-product-card rounded-[12px] border border-[rgba(27,58,107,0.14)] bg-[linear-gradient(180deg,#FFFFFF_0%,rgba(248,246,242,0.97)_100%)] p-4 shadow-[0_10px_28px_rgba(27,58,107,0.045)]">
          <p className="riddra-product-body text-[11px] font-medium uppercase tracking-[0.18em] text-[rgba(107,114,128,0.74)]">
            {track.cadence}
          </p>
          <div className="mt-2 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
            <div className="space-y-2">
              <h1 className="riddra-product-display text-[2rem] font-semibold leading-[1.04] tracking-tight text-[#1B3A6B] sm:text-[2.55rem] lg:text-[3rem]">
                {track.title}
              </h1>
              <p className="riddra-product-body max-w-3xl text-[14px] leading-7 text-[rgba(107,114,128,0.9)]">
                {track.summary}
              </p>
            </div>
            <div className="rounded-[10px] border border-[rgba(226,222,217,0.82)] bg-white px-3 py-2.5">
              <p className="riddra-product-body text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.8)]">
                Primary objective
              </p>
              <p className="riddra-product-body mt-1.5 text-[13px] leading-6 text-[rgba(27,58,107,0.92)]">
                {track.objective}
              </p>
            </div>
          </div>
        </section>
      }
      stickyTabs={null}
      summary={null}
      supportingSections={
        <ProductPageTwoColumnLayout
          left={
            <>
              <ProductBulletListCard
                id="issue-structure"
                eyebrow="Issue structure"
                title="Issue structure"
                description="Newsletter issue sections stay editorial-first and fully rendered in the page."
                items={track.sections.map((item, index) => ({
                  title: `Section ${index + 1}`,
                  body: item,
                }))}
                variant="checklist"
              />

              <ProductBulletListCard
                id="linked-surfaces"
                eyebrow="Linked surfaces"
                title="Linked product surfaces"
                description="These linked surfaces show how each newsletter track connects back into owned product routes."
                items={track.linkedSurfaces.map((item) => ({ body: item }))}
                variant="context"
              />

              <ProductBulletListCard
                id="archive-continuity"
                eyebrow="Archive continuity"
                title="Replay and archive continuity"
                description="Replay memory stays visible inside the main column instead of being isolated in an older shell."
                items={relatedReplayChains.map((chain) => ({
                  title: chain.title,
                  body: chain.continuity,
                  meta: `${chain.status} · ${chain.source}`,
                }))}
                variant="context"
              />
            </>
          }
          right={
            <>
              <SubscriberTruthNotice
                eyebrow="Newsletter-track truth"
                title="This newsletter route is useful for public retention right now, but saved continuity still depends on launch activation"
                description={`Use ${track.title} confidently for public retention and archive discovery, while keeping auth continuity, premium workflow promises, and support follow-through honest until those live paths are fully verified.`}
                items={truthItems}
                href="/launch-readiness"
                hrefLabel="Open launch readiness"
                secondaryHref="/account/support"
                secondaryHrefLabel="Open support continuity"
              />

              <ProductInsightGridCard
                eyebrow="Track context"
                title="Newsletter snapshot"
                description="Keep the support rail compact while preserving the current operational context."
                items={[
                  { label: "Audience", value: track.audience },
                  { label: "Cadence", value: track.cadence },
                  { label: "Support rows", value: String(supportRegistry.total) },
                  { label: "Support continuity", value: config.supportEmail || config.billingSupportEmail || "Not configured yet" },
                ]}
                variant="analysis"
              />

              <ProductInsightGridCard
                eyebrow="Support posture"
                title="Support records"
                items={[
                  { label: "Total", value: String(supportRegistry.total) },
                  { label: "In progress", value: String(supportRegistry.inProgress) },
                  { label: "Needs attention", value: String(supportRegistry.blocked) },
                ]}
                variant="signals"
              />
              {sidebar}
            </>
          }
        />
      }
    />
  );
}
