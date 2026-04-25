import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Eyebrow, GlowCard } from "@/components/ui";
import {
  getMentorshipTrackBySlug,
  getMentorshipTrackRoutes,
  mentorshipTracks,
} from "@/lib/mentorship";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getMentorshipTrackRoutes().map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const track = getMentorshipTrackBySlug(slug);

  if (!track) {
    return { title: "Mentorship track not found" };
  }

  return {
    title: track.title,
    description: track.summary,
  };
}

export default async function MentorshipTrackPage({ params }: PageProps) {
  const { slug } = await params;
  const track = getMentorshipTrackBySlug(slug);

  if (!track) {
    notFound();
  }

  const siblingTracks = mentorshipTracks.filter((item) => item.slug !== track.slug);
  const config = getRuntimeLaunchConfig();
  const truth = getSubscriberSurfaceTruth();
  const supportRegistry = getSupportOpsRegistrySummary("account");
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Mentorship", href: "/mentorship" },
    { name: track.title, href: `/mentorship/${track.slug}` },
  ];

  return (
    <GlobalSidebarPageShell category="mentorship" leftClassName="riddra-legacy-light-surface space-y-8">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>{track.audience}</Eyebrow>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="display-font text-4xl font-semibold tracking-tight text-white sm:text-6xl">
                {track.title}
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-8 text-mist/76">{track.summary}</p>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-mist/68">{track.goal}</p>
            </div>
            <Link
              href="/mentorship"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Back to mentorship
            </Link>
          </div>
        </div>

        <SubscriberTruthNotice
          eyebrow="Mentorship-track truth"
          title="This mentorship route is useful for guided support discovery right now, but saved continuity still depends on launch activation"
          description={`Use ${track.title} confidently for public guidance discovery, while keeping auth continuity, premium workflow promises, and support follow-through honest until those live paths are fully verified.`}
          items={[
            truth.hasLiveAuthContinuity ? "Signed-in continuity is active enough to carry mentorship flows into account and workspace surfaces." : "Local preview auth still limits how trustworthy the full mentorship-to-account handoff can be.",
            truth.hasBillingCore ? "Billing core credentials exist, so premium mentorship workflow language can move beyond pure preview framing once checkout and webhook flows are exercised." : "Billing credentials are still incomplete, so premium mentorship promises should stay expectation-setting.",
            truth.hasSupportDelivery ? "Support delivery is configured enough to begin testing real follow-up for guidance seekers who convert into assisted workflows." : "Support delivery is still not fully active, so mentorship-route support expectations should stay conservative.",
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

        <div className="grid gap-6 lg:grid-cols-3">
          {[
            { label: "Status", value: track.status },
            { label: "Program format", value: track.format },
            { label: "Companion routes", value: `${track.relatedRoutes.length} linked surfaces` },
          ].map((item) => (
            <GlowCard key={item.label}>
              <p className="text-sm text-mist/66">{item.label}</p>
              <p className="mt-3 text-lg font-semibold text-white">{item.value}</p>
            </GlowCard>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Guided sequence</h2>
            <div className="mt-5 grid gap-3">
              {track.sequence.map((step, index) => (
                <div
                  key={step}
                  className="flex items-center gap-4 rounded-2xl border border-white/8 bg-black/15 px-4 py-4"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-7 text-mist/76">{step}</p>
                </div>
              ))}
            </div>
          </GlowCard>

          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">What this path should improve</h2>
            <div className="mt-5 grid gap-3">
              {track.outcomes.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76"
                >
                  {item}
                </div>
              ))}
            </div>
          </GlowCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Best next routes</h2>
            <div className="mt-5 grid gap-3">
              {track.relatedRoutes.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76 transition hover:border-white/18 hover:bg-white/[0.04]"
                >
                  <span className="font-semibold text-white">{item.label}</span>
                  <span className="mt-2 block text-mist/68">{item.note}</span>
                  <span className="mt-3 block text-xs uppercase tracking-[0.16em] text-mist/58">{item.href}</span>
                </Link>
              ))}
            </div>
          </GlowCard>

          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Other mentorship lanes</h2>
            <div className="mt-5 grid gap-3">
              {siblingTracks.map((item) => (
                <Link
                  key={item.slug}
                  href={`/mentorship/${item.slug}`}
                  className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76 transition hover:border-white/18 hover:bg-white/[0.04]"
                >
                  <span className="font-semibold text-white">{item.title}</span>
                  <span className="mt-2 block text-mist/68">{item.summary}</span>
                </Link>
              ))}
            </div>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Operating note</h2>
          <div className="mt-5 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-4 py-4 text-sm leading-7 text-mist/74">
            The mentorship layer now has real public child routes instead of stopping at overview cards. The remaining
            gap is operational depth, persistence, and live cohort delivery, but the route family now explains what each
            path is trying to do and where it should lead next.
          </div>
        </GlowCard>
    </GlobalSidebarPageShell>
  );
}
