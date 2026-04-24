import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  ProductBulletListCard,
  ProductInsightGridCard,
  ProductPageShell,
  ProductPageTwoColumnLayout,
  ProductRouteRailCard,
} from "@/components/product-page-system";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { getMarketEvent, getMarketEventRoutes, getMarketEvents } from "@/lib/learn";
import { getPublicTruthItems } from "@/lib/public-route-truth";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getMarketEventRoutes().map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getMarketEvent(slug);

  if (!event) {
    return { title: "Event page not found" };
  }

  return {
    title: event.title,
    description: event.summary,
  };
}

export default async function LearnEventPage({ params }: PageProps) {
  const { slug } = await params;
  const event = await getMarketEvent(slug);
  const allEvents = await getMarketEvents();

  if (!event) {
    notFound();
  }

  const siblingEvents = allEvents.filter((item) => item.slug !== event.slug);
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Learn", href: "/learn" },
    { label: "Event archive", href: "/reports/results-calendar" },
    { label: event.title, href: `/learn/events/${event.slug}` },
  ];
  const truthItems = getPublicTruthItems(getSubscriberSurfaceTruth(), {
    continuitySubject: "event-driven learning",
    handoffLabel: "event-page-to-account handoff",
    billingSubject: "premium event workflow language",
    supportSubject: "learners coming through event detail pages",
  });

  return (
    <ProductPageShell
      breadcrumbs={breadcrumbs}
      hero={
        <section className="riddra-product-card rounded-[12px] border border-[rgba(27,58,107,0.14)] bg-[linear-gradient(180deg,#FFFFFF_0%,rgba(248,246,242,0.97)_100%)] p-4 shadow-[0_10px_28px_rgba(27,58,107,0.045)]">
          <p className="riddra-product-body text-[11px] font-medium uppercase tracking-[0.18em] text-[rgba(107,114,128,0.74)]">
            {event.eventType}
          </p>
          <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <h1 className="riddra-product-display text-[2rem] font-semibold leading-[1.04] tracking-tight text-[#1B3A6B] sm:text-[2.55rem] lg:text-[3rem]">
                {event.title}
              </h1>
              <p className="riddra-product-body max-w-3xl text-[14px] leading-7 text-[rgba(107,114,128,0.9)]">
                {event.summary}
              </p>
            </div>
            <div className="grid gap-2 rounded-[10px] border border-[rgba(226,222,217,0.82)] bg-white px-3 py-2.5 text-right">
              <p className="riddra-product-body text-[11px] uppercase tracking-[0.16em] text-[rgba(107,114,128,0.8)]">
                {event.status}
              </p>
              <p className="riddra-product-number text-[14px] font-medium text-[#1B3A6B]">{event.dateLabel}</p>
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
                id="why-it-matters"
                eyebrow="Event context"
                title="Why this event matters"
                description={event.archiveNote}
                items={event.checkpoints.map((item) => ({ body: item }))}
                variant="checklist"
              />

              <ProductRouteRailCard
                id="follow-up-routes"
                eyebrow="Follow-up routes"
                title="Best follow-up routes"
                description="Keep the event page tied into the broader product instead of treating it like a disconnected archive entry."
                items={event.followUpRoutes.map((item) => ({
                  title: item.label,
                  description: item.note,
                  href: item.href,
                  hrefLabel: "Open page",
                  meta: item.href,
                }))}
                variant="routes"
              />

              <ProductRouteRailCard
                id="related-events"
                eyebrow="Related archive"
                title="Related market events"
                description="These related event pages stay fully rendered for search and archive continuity."
                items={siblingEvents.map((item) => ({
                  title: item.title,
                  description: item.summary,
                  href: `/learn/events/${item.slug}`,
                  hrefLabel: "Open event",
                  meta: `${item.eventType} · ${item.dateLabel}`,
                }))}
                variant="routes"
              />
            </>
          }
          right={
            <>
              <SubscriberTruthNotice
                eyebrow="Event-archive truth"
                title="This event detail page is useful for public learning right now, but supported continuity still depends on launch activation"
                description="Use this event page confidently for learning and follow-up routing, while keeping signed-in continuity, support follow-through, and premium workflow promises honest until the live paths are fully verified."
                items={truthItems}
                href="/launch-readiness"
                hrefLabel="Open launch readiness"
                secondaryHref="/account/support"
                secondaryHrefLabel="Open support continuity"
              />

              <ProductInsightGridCard
                eyebrow="Event context"
                title="Event snapshot"
                description="Editorial support stays compact while keeping the visible event context clear."
                items={[
                  { label: "Event type", value: event.eventType },
                  { label: "Status", value: event.status },
                  { label: "Window", value: event.dateLabel },
                  { label: "Asset reference", value: event.assetRef },
                ]}
                variant="analysis"
              />
            </>
          }
        />
      }
    />
  );
}
