import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Eyebrow, GlowCard } from "@/components/ui";
import { educationTracks } from "@/lib/education-library";
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
    return { title: "Webinar not found" };
  }

  return {
    title: webinar.title,
    description: webinar.summary,
  };
}

export default async function WebinarDetailPage({ params }: PageProps) {
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
  ];
  const relatedTrack =
    educationTracks.find((track) =>
      track.path.toLowerCase().includes("webinar") ||
      track.audience.toLowerCase().includes(webinar.audience.split(" ")[0].toLowerCase()),
    ) ?? educationTracks[1];
  const config = getRuntimeLaunchConfig();
  const truth = getSubscriberSurfaceTruth();
  const supportRegistry = getSupportOpsRegistrySummary("account");
  return (
    <GlobalSidebarPageShell
      category="webinars"
      className="space-y-3.5 sm:space-y-4"
      leftClassName="riddra-legacy-light-surface space-y-6"
    >
      <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>{webinar.format}</Eyebrow>
          <h1 className="display-font text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            {webinar.title}
          </h1>
          <p className="max-w-3xl text-base leading-8 text-mist/76">{webinar.summary}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/webinars/${webinar.slug}/register`}
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-5 py-2 text-sm text-white transition hover:bg-white/[0.06]"
            >
              Open registration route
            </Link>
            <Link
              href={`/webinars/${webinar.slug}/replay`}
              className="inline-flex rounded-full border border-white/10 bg-black/15 px-5 py-2 text-sm text-mist/80 transition hover:border-white/18 hover:bg-white/[0.04] hover:text-white"
            >
              Open replay route
            </Link>
          </div>
      </div>

        <SubscriberTruthNotice
          eyebrow="Webinar detail truth"
          title="This webinar route is useful for session discovery right now, but saved continuity still depends on launch activation"
          description={`Use ${webinar.title} confidently for public participation discovery, while keeping auth continuity, premium workflow promises, and support follow-through honest until those live paths are fully verified.`}
          items={[
            truth.hasLiveAuthContinuity
              ? "Signed-in continuity is active enough to carry webinar usage into account and workspace flows."
              : "Local preview auth still limits how trustworthy the full webinar-to-account handoff can be.",
            truth.hasBillingCore
              ? "Billing core credentials exist, so premium participation workflow language can move beyond pure preview framing once checkout and webhook flows are exercised."
              : "Billing credentials are still incomplete, so premium webinar promises should stay expectation-setting.",
            truth.hasSupportDelivery
              ? "Support delivery is configured enough to begin testing real follow-up for attendees who convert into assisted workflows."
              : "Support delivery is still not fully active, so webinar-route support expectations should stay conservative.",
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
            { label: "Audience", value: webinar.audience },
            { label: "Cadence", value: webinar.cadence },
            { label: "Format status", value: webinar.formatStatus },
            { label: "Replay plan", value: webinar.replayPlan },
            { label: "Host", value: webinar.host },
            { label: "Duration", value: webinar.duration },
            { label: "Next session", value: webinar.nextSession },
            { label: "Access", value: webinar.access },
          ].map((item) => (
            <GlowCard key={item.label}>
              <p className="text-sm text-mist/66">{item.label}</p>
              <p className="mt-3 text-lg font-semibold text-white">{item.value}</p>
            </GlowCard>
          ))}
        </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Why this format matters</h2>
            <div className="mt-5 grid gap-3">
              {webinar.outcomes.map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                  {item}
                </div>
              ))}
            </div>
          </GlowCard>

          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Session agenda</h2>
            <div className="mt-5 grid gap-3">
              {webinar.agenda.map((item, index) => (
                <div key={item} className="flex items-center gap-4 rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <p className="text-sm text-mist/76">{item}</p>
                </div>
              ))}
            </div>
          </GlowCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Session assets</h2>
            <div className="mt-5 grid gap-3">
              {webinar.assets.map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                  {item}
                </div>
              ))}
            </div>
          </GlowCard>
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Companion routes</h2>
            <div className="mt-5 grid gap-3">
              {webinar.followUpRoutes.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76 transition hover:border-white/18 hover:bg-white/[0.04]"
                >
                  <span className="font-semibold text-white">{item.label}</span>
                  <span className="mt-2 block text-mist/70">{item.href}</span>
                </Link>
              ))}
            </div>
          </GlowCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">How this webinar fits the library</h2>
            <p className="mt-4 text-sm leading-7 text-mist/74">{relatedTrack.path}</p>
            <div className="mt-5 rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/66">Target learner lane</p>
              <p className="mt-2 text-sm font-semibold text-white">{relatedTrack.title}</p>
            </div>
            <div className="mt-3 rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/66">Expected outcome</p>
              <p className="mt-2 text-sm leading-7 text-mist/76">{relatedTrack.outcome}</p>
            </div>
          </GlowCard>
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Replay and follow-up plan</h2>
            <div className="mt-5 grid gap-3">
              {[
                "Turn the session into replay clips, recap notes, and newsletter snippets.",
                "Route attendees back into the matching product pages so education improves tool usage.",
                "Use common questions to strengthen related learn pages, course modules, and mentor support.",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Link
                href={`/webinars/${webinar.slug}/register`}
                className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76 transition hover:border-white/18 hover:bg-white/[0.04]"
              >
                <span className="font-semibold text-white">Registration route</span>
                <span className="mt-2 block text-mist/70">{webinar.registrationMode}</span>
              </Link>
              <Link
                href={`/webinars/${webinar.slug}/replay`}
                className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76 transition hover:border-white/18 hover:bg-white/[0.04]"
              >
                <span className="font-semibold text-white">Replay route</span>
                <span className="mt-2 block text-mist/70">{webinar.replayPlan}</span>
              </Link>
            </div>
            <div className="mt-5 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-4 py-4 text-sm leading-7 text-mist/74">
              This webinar layer now carries real session logistics, host framing, access posture, companion routes, asset blocks, and dedicated registration plus replay routes. The remaining work is durable RSVP persistence, replay hosting, and attendance-linked follow-up flows.
            </div>
          </GlowCard>
      </div>
    </GlobalSidebarPageShell>
  );
}
