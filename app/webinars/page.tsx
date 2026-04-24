import type { Metadata } from "next";
import Link from "next/link";

import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { educationTracks } from "@/lib/education-library";
import { getPublishableCmsSlugSet } from "@/lib/publishable-content";
import { webinarRules, webinars, webinarSummary } from "@/lib/webinars";

export const metadata: Metadata = {
  title: "Webinars",
  description: "Riddra webinar and workshop hub for live education, replay planning, and event-led growth.",
};

export default async function WebinarsPage() {
  const publishedWebinarSlugs = await getPublishableCmsSlugSet("webinar");
  const visibleWebinars = webinars.filter((item) => publishedWebinarSlugs.has(item.slug));
  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Eyebrow>Creator engine</Eyebrow>
          <SectionHeading
            title="Webinars and workshops"
            description="Join live sessions, workshops, and replay-friendly events that extend learning beyond articles and static lessons."
          />
        </div>

        <PublicSurfaceTruthSection
          eyebrow="Webinar truth"
          title="This webinar layer is structurally strong, but deeper event continuity still depends on launch activation"
          description="Use webinars and workshops confidently for public education and event-led growth, while keeping auth continuity, premium participation promises, and support follow-through honest until those live paths are fully verified."
          authReady="Signed-in continuity is active enough to carry event participation into account and workspace flows."
          authPending="Local preview auth still limits how trustworthy the full webinar-to-account handoff can be."
          billingReady="Billing core credentials exist, so premium event and replay-access language can move beyond pure preview framing once checkout and webhook flows are exercised."
          billingPending="Billing credentials are still incomplete, so premium continuity promises should stay expectation-setting."
          supportReady="Support delivery is configured enough to begin testing real follow-up for users who convert through webinar flows."
          supportPending="Support delivery is still not fully active, so the webinar layer should keep support expectations conservative."
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
          stats={[
            { label: "Upcoming sessions", value: webinarSummary.upcomingSessions },
            { label: "Starter tracks", value: webinarSummary.starterTracks },
            { label: "Creator formats", value: webinarSummary.creatorFormats },
            { label: "Replay assets", value: webinarSummary.replayAssets },
            {
              label: "Support continuity",
              value: "Event-safe follow-through",
              detail:
                "Webinar flows now stay anchored to the same account, billing, and support posture as the rest of the public product.",
            },
          ]}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {educationTracks.slice(1, 4).map((track) => (
            <GlowCard key={track.title}>
              <p className="text-xs uppercase tracking-[0.16em] text-mist/58">{track.audience}</p>
              <h2 className="mt-3 text-xl font-semibold text-white">{track.title}</h2>
              <p className="mt-3 text-sm leading-7 text-mist/74">{track.path}</p>
              <p className="mt-3 text-sm leading-7 text-mist/66">{track.outcome}</p>
            </GlowCard>
          ))}
        </div>

        <div className="grid gap-6">
          {visibleWebinars.map((item) => (
            <GlowCard key={item.slug} className="transition hover:border-white/18 hover:bg-white/[0.04]">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm text-mist/66">{item.format}</p>
                    <h2 className="mt-3 text-2xl font-semibold text-white">{item.title}</h2>
                    <p className="mt-4 text-sm leading-7 text-mist/74">{item.summary}</p>
                    <div className="mt-4 flex flex-wrap gap-3 text-sm text-mist/68">
                      <span>Host: <span className="text-white">{item.host}</span></span>
                      <span>Duration: <span className="text-white">{item.duration}</span></span>
                      <span>Access: <span className="text-white">{item.access}</span></span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3 text-sm text-mist/68">
                      <span>{item.registrationMode}</span>
                      <span>{item.replayAssets.length} replay assets</span>
                    </div>
                  </div>
                  <div className="grid min-w-[250px] gap-3">
                    <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                      <p className="text-sm text-mist/66">Audience</p>
                      <p className="mt-2 text-sm font-semibold text-white">{item.audience}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                      <p className="text-sm text-mist/66">Next session</p>
                      <p className="mt-2 text-sm font-semibold text-white">{item.nextSession}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                      <p className="text-sm text-mist/66">Replay path</p>
                      <p className="mt-2 text-sm font-semibold text-white">{item.replayPlan}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/webinars/${item.slug}`}
                    className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:bg-white/[0.06]"
                  >
                    Open webinar
                  </Link>
                  <Link
                    href={`/webinars/${item.slug}/register`}
                    className="inline-flex rounded-full border border-white/10 bg-black/15 px-4 py-2 text-sm text-mist/80 transition hover:border-white/18 hover:bg-white/[0.04] hover:text-white"
                  >
                    Register route
                  </Link>
                  <Link
                    href={`/webinars/${item.slug}/replay`}
                    className="inline-flex rounded-full border border-white/10 bg-black/15 px-4 py-2 text-sm text-mist/80 transition hover:border-white/18 hover:bg-white/[0.04] hover:text-white"
                  >
                    Replay route
                  </Link>
                </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Why this matters</h2>
          <div className="mt-5 grid gap-3">
            {webinarRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
