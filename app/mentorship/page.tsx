import type { Metadata } from "next";
import Link from "next/link";

import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { mentorshipLadderStages } from "@/lib/mentorship-ladders";
import { mentorshipRules, mentorshipSummary, mentorshipTracks } from "@/lib/mentorship";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";

export const metadata: Metadata = {
  title: "Mentorship",
  description: "Riddra mentorship and guided-learning view for cohort programs, creator-led tracks, and subscriber learning ladders.",
};

export default function MentorshipPage() {
  const config = getRuntimeLaunchConfig();
  const truth = getSubscriberSurfaceTruth();
  const supportRegistry = getSupportOpsRegistrySummary("account");
  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Eyebrow>Guided learning</Eyebrow>
          <SectionHeading
            title="Mentorship and cohorts"
            description="Follow guided tracks, mentorship loops, and cohort-style programs designed to take learning beyond one-off lessons."
          />
        </div>

        <SubscriberTruthNotice
          eyebrow="Mentorship truth"
          title="This mentorship hub is strong for discovery, but deeper continuity still depends on launch activation"
          description="Use mentorship and cohort discovery confidently for public exploration, while keeping auth continuity, premium workflow promises, and support follow-through honest until those live paths are fully verified."
          items={[
            truth.hasLiveAuthContinuity
              ? "Signed-in continuity is active enough to carry mentorship discovery into account and guided-learning flows."
              : "Local preview auth still limits how trustworthy the full mentorship-to-account handoff can be.",
            truth.hasBillingCore
              ? "Billing core credentials exist, so premium mentorship and cohort language can move beyond pure preview framing once checkout and webhook flows are exercised."
              : "Billing credentials are still incomplete, so premium mentorship promises should stay expectation-setting.",
            truth.hasSupportDelivery
              ? "Support delivery is configured enough to begin testing real follow-up for mentorship users who convert."
              : "Support delivery is still not fully active, so mentorship routes should keep support expectations conservative.",
          ]}
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Program tracks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{mentorshipSummary.programTracks}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Cohort modes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{mentorshipSummary.cohortModes}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Creator inputs</p>
            <p className="mt-2 text-3xl font-semibold text-white">{mentorshipSummary.creatorInputs}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-mist/68">Support registry rows</p>
            <p className="mt-2 text-3xl font-semibold text-white">{supportRegistry.total}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">In progress</p>
            <p className="mt-2 text-3xl font-semibold text-white">{supportRegistry.inProgress}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked</p>
            <p className="mt-2 text-3xl font-semibold text-white">{supportRegistry.blocked}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Support continuity</p>
            <p className="mt-2 text-base font-semibold text-white">
              {config.supportEmail || "Not configured yet"}
            </p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          {mentorshipTracks.map((track) => (
            <Link key={track.slug} href={`/mentorship/${track.slug}`}>
              <GlowCard className="h-full transition hover:border-white/18 hover:bg-white/[0.04]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">{track.title}</h2>
                    <p className="mt-3 text-sm text-mist/66">{track.audience}</p>
                    <p className="mt-3 text-sm leading-7 text-mist/74">{track.summary}</p>
                  </div>
                  <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                    {track.status}
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs text-white/84">
                    {track.format}
                  </div>
                  <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs text-white/84">
                    {track.sequence.length} guided steps
                  </div>
                </div>
              </GlowCard>
            </Link>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {mentorshipLadderStages.slice(0, 4).map((stage) => (
            <GlowCard key={stage.stage}>
              <p className="text-xs uppercase tracking-[0.16em] text-mist/58">{stage.audience}</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">{stage.stage}</h2>
              <p className="mt-3 text-sm leading-7 text-mist/74">{stage.path}</p>
              <p className="mt-3 text-sm leading-7 text-mist/66">{stage.goal}</p>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Mentorship rules</h2>
          <div className="mt-5 grid gap-3">
            {mentorshipRules.map((rule) => (
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
