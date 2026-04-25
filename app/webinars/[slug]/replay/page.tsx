import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Eyebrow, GlowCard } from "@/components/ui";
import { getPublishableCmsRecordBySlug, getPublishableCmsSlugSet } from "@/lib/publishable-content";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";
import { getWebinarBySlug, webinars } from "@/lib/webinars";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const publishedWebinarSlugs = await getPublishableCmsSlugSet("webinar");
  return webinars
    .filter((item) => publishedWebinarSlugs.has(item.slug))
    .map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const publishableRecord = await getPublishableCmsRecordBySlug("webinar", slug);
  const webinar = publishableRecord ? getWebinarBySlug(publishableRecord.canonicalSlug) : null;

  if (!webinar) {
    return { title: "Webinar replay not found" };
  }

  return {
    title: `${webinar.title} replay`,
    description: `Replay route for ${webinar.title}.`,
  };
}

export default async function WebinarReplayPage({ params }: PageProps) {
  const { slug } = await params;
  const publishableRecord = await getPublishableCmsRecordBySlug("webinar", slug);
  const webinar = publishableRecord ? getWebinarBySlug(publishableRecord.canonicalSlug) : null;

  if (!webinar) {
    notFound();
  }

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Webinars", href: "/webinars" },
    { name: webinar.title, href: `/webinars/${webinar.slug}` },
    { name: "Replay", href: `/webinars/${webinar.slug}/replay` },
  ];
  const publishedWebinarSlugs = await getPublishableCmsSlugSet("webinar");
  const siblingWebinars = webinars
    .filter((item) => item.slug !== webinar.slug && publishedWebinarSlugs.has(item.slug))
    .slice(0, 2);
  const config = getRuntimeLaunchConfig();
  const truth = getSubscriberSurfaceTruth();
  const supportRegistry = getSupportOpsRegistrySummary("account");

  return (
    <GlobalSidebarPageShell category="webinars" leftClassName="riddra-legacy-light-surface space-y-8">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Replay route</Eyebrow>
          <h1 className="display-font text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            {webinar.title} replay
          </h1>
          <p className="max-w-3xl text-base leading-8 text-mist/76">
            This route turns the webinar into a reusable archive with replay assets, recap framing, and follow-up
            handoffs instead of leaving the event lifecycle trapped in one page note.
          </p>
        </div>

        <SubscriberTruthNotice
          eyebrow="Replay truth"
          title="This replay route is useful for archive learning right now, but saved continuity still depends on launch activation"
          description={`Use ${webinar.title} replay confidently for public archive learning, while keeping auth continuity, premium workflow promises, and support follow-through honest until those live paths are fully verified.`}
          items={[
            truth.hasLiveAuthContinuity ? "Signed-in continuity is active enough to carry replay flows into account and workspace surfaces." : "Local preview auth still limits how trustworthy the full replay-to-account handoff can be.",
            truth.hasBillingCore ? "Billing core credentials exist, so premium replay workflow language can move beyond pure preview framing once checkout and webhook flows are exercised." : "Billing credentials are still incomplete, so premium replay promises should stay expectation-setting.",
            truth.hasSupportDelivery ? "Support delivery is configured enough to begin testing real follow-up for replay users who need help after the session." : "Support delivery is still not fully active, so replay-route support expectations should stay conservative.",
          ]}
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
          secondaryHref="/account/support"
          secondaryHrefLabel="Open support continuity"
        />

        <div className="grid gap-6 lg:grid-cols-4">
          <GlowCard><p className="text-sm text-mist/68">Support registry rows</p><p className="mt-2 text-3xl font-semibold text-white">{supportRegistry.total}</p></GlowCard>
          <GlowCard><p className="text-sm text-mist/68">In progress</p><p className="mt-2 text-3xl font-semibold text-white">{supportRegistry.inProgress}</p></GlowCard>
          <GlowCard><p className="text-sm text-mist/68">Blocked</p><p className="mt-2 text-3xl font-semibold text-white">{supportRegistry.blocked}</p></GlowCard>
          <GlowCard><p className="text-sm text-mist/68">Support continuity</p><p className="mt-2 text-base font-semibold text-white">{config.supportEmail || config.billingSupportEmail || "Not configured yet"}</p></GlowCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {[
            { label: "Replay plan", value: webinar.replayPlan },
            { label: "Format status", value: webinar.formatStatus },
            { label: "Audience", value: webinar.audience },
            { label: "Cadence", value: webinar.cadence },
          ].map((item) => (
            <GlowCard key={item.label}>
              <p className="text-sm text-mist/66">{item.label}</p>
              <p className="mt-3 text-lg font-semibold text-white">{item.value}</p>
            </GlowCard>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Replay asset stack</h2>
            <div className="mt-5 grid gap-3">
              {webinar.replayAssets.map((asset) => (
                <div key={asset} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                  {asset}
                </div>
              ))}
            </div>
          </GlowCard>

          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Learning outcomes carried forward</h2>
            <div className="mt-5 grid gap-3">
              {webinar.outcomes.map((outcome) => (
                <div key={outcome} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                  {outcome}
                </div>
              ))}
            </div>
          </GlowCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Where replay should send users next</h2>
            <div className="mt-5 grid gap-3">
              {webinar.followUpRoutes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76 transition hover:border-white/18 hover:bg-white/[0.04]"
                >
                  <span className="font-semibold text-white">{route.label}</span>
                  <span className="mt-2 block text-mist/70">{route.href}</span>
                </Link>
              ))}
            </div>
          </GlowCard>

          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Adjacent webinar routes</h2>
            <div className="mt-5 grid gap-3">
              <Link
                href={`/webinars/${webinar.slug}`}
                className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76 transition hover:border-white/18 hover:bg-white/[0.04]"
              >
                <span className="font-semibold text-white">Open webinar detail</span>
                <span className="mt-2 block text-mist/70">Session agenda, assets, and overview.</span>
              </Link>
              <Link
                href={`/webinars/${webinar.slug}/register`}
                className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76 transition hover:border-white/18 hover:bg-white/[0.04]"
              >
                <span className="font-semibold text-white">Open registration route</span>
                <span className="mt-2 block text-mist/70">{webinar.registrationMode}</span>
              </Link>
              {siblingWebinars.map((item) => (
                <Link
                  key={item.slug}
                  href={`/webinars/${item.slug}/replay`}
                  className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76 transition hover:border-white/18 hover:bg-white/[0.04]"
                >
                  <span className="font-semibold text-white">{item.title} replay</span>
                  <span className="mt-2 block text-mist/70">{item.replayPlan}</span>
                </Link>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-4 py-4 text-sm leading-7 text-mist/74">
              Replay hosting and attendance memory still need durable activation later, but the public education graph
              now has a real replay destination instead of stopping at a sentence on the webinar detail page.
            </div>
          </GlowCard>
        </div>
    </GlobalSidebarPageShell>
  );
}
