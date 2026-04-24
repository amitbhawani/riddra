import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  educationBundleFamilies,
  educationLibraryRules,
  educationLibrarySummary,
  educationTracks,
} from "@/lib/education-library";

export const metadata: Metadata = {
  title: "Education Library",
  description: "Protected education-library surface for course, webinar, mentorship, and replay-system depth.",
};

export default async function EducationLibraryPage() {
  await requireUser();

  const readinessItems = educationTracks.map((track) => ({
    label: track.title,
    status: "Needs verification",
    detail: `${track.audience} · ${track.path} · ${track.outcome}`,
    routeTarget:
      track.title === "Investor onboarding track"
        ? "/learn/tracks/beginner-investor-track"
        : track.title === "IPO decision track"
          ? "/ipo"
          : track.title === "Trader workstation track"
            ? "/learn/tracks/trader-track"
            : track.title === "Wealth builder track"
              ? "/learn/tracks/wealth-builder-track"
              : track.title === "Subscriber retention track"
                ? "/admin/subscriber-activation-packet"
                : "/mentorship",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Education Library", href: "/admin/education-library" },
            ]}
          />
          <Eyebrow>Learning depth</Eyebrow>
          <SectionHeading
            title="Education library"
            description="Phase 16 should make learning feel like one connected library across courses, webinars, mentorship, community, and replay assets. This page tracks the system instead of isolated content cards."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-mist/68">Active tracks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{educationLibrarySummary.activeTracks}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Bundle families</p>
            <p className="mt-2 text-3xl font-semibold text-white">{educationLibrarySummary.bundleFamilies}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Replay assets</p>
            <p className="mt-2 text-3xl font-semibold text-white">{educationLibrarySummary.replayAssets}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Mentor ladders</p>
            <p className="mt-2 text-3xl font-semibold text-white">{educationLibrarySummary.mentorLadders}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="education library track"
              panelTitle="Write-through education-library action"
              panelDescription="Log learning-track and bundle-system changes into the shared revision lane so education depth stops living only as a library blueprint."
              defaultRouteTarget="/admin/education-library"
              defaultOperator="Education Library Operator"
              defaultChangedFields="track_scope, bundle_logic, replay_posture"
              actionNoun="education-library mutation"
            />
          </GlowCard>
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Persona and strategy tracks</h2>
            <div className="mt-5 grid gap-3">
              {educationTracks.map((track) => (
                <div key={track.title} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-mist/58">{track.audience}</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">{track.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-mist/74">{track.path}</p>
                  <p className="mt-2 text-sm leading-7 text-mist/66">{track.outcome}</p>
                </div>
              ))}
            </div>
          </GlowCard>
          <div className="grid gap-6">
            <GlowCard>
              <h2 className="text-2xl font-semibold text-white">Bundle families</h2>
              <div className="mt-5 grid gap-3">
                {educationBundleFamilies.map((bundle) => (
                  <div key={bundle.title} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                    <p className="text-sm font-semibold text-white">{bundle.title}</p>
                    <p className="mt-2 text-sm leading-7 text-mist/74">{bundle.includes}</p>
                  </div>
                ))}
              </div>
            </GlowCard>
            <GlowCard>
              <h2 className="text-2xl font-semibold text-white">Operating rules</h2>
              <div className="mt-5 grid gap-3">
                {educationLibraryRules.map((rule) => (
                  <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                    {rule}
                  </div>
                ))}
              </div>
            </GlowCard>
          </div>
        </div>
      </Container>
    </div>
  );
}
