import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { mentorshipLadderRules, mentorshipLadderStages, mentorshipLadderSummary } from "@/lib/mentorship-ladders";

export const metadata: Metadata = {
  title: "Mentorship Ladders",
  description: "Protected mentorship-ladders surface for guided progression, cohorts, and community continuity.",
};

export default async function MentorshipLaddersPage() {
  await requireUser();

  const readinessItems = mentorshipLadderStages.map((stage) => ({
    label: stage.stage,
    status: "Needs verification",
    detail: `${stage.audience} · ${stage.path} · ${stage.goal}`,
    routeTarget:
      stage.stage === "Starter trust"
        ? "/learn"
        : stage.stage === "Workflow practice"
          ? "/webinars"
          : stage.stage === "Guided accountability"
            ? "/mentorship"
            : stage.stage === "Community reinforcement"
              ? "/community"
              : "/pricing",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Mentorship Ladders", href: "/admin/mentorship-ladders" },
            ]}
          />
          <Eyebrow>Guided progression</Eyebrow>
          <SectionHeading
            title="Mentorship ladders"
            description="Phase 16 should connect courses, webinars, cohorts, community, and premium progression into one learning ladder instead of scattered guided-program ideas."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Ladder stages</p>
            <p className="mt-2 text-3xl font-semibold text-white">{mentorshipLadderSummary.ladderStages}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Cohort formats</p>
            <p className="mt-2 text-3xl font-semibold text-white">{mentorshipLadderSummary.cohortFormats}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Support handoffs</p>
            <p className="mt-2 text-3xl font-semibold text-white">{mentorshipLadderSummary.supportHandoffs}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="mentorship ladder stage"
              panelTitle="Write-through mentorship-ladder action"
              panelDescription="Log guided-program and progression changes into the shared revision lane so mentorship posture stops living only as a staged ladder summary."
              defaultRouteTarget="/admin/mentorship-ladders"
              defaultOperator="Mentorship Ladder Operator"
              defaultChangedFields="ladder_stage, cohort_path, progression_rule"
              actionNoun="mentorship-ladder mutation"
            />
          </GlowCard>
          {mentorshipLadderStages.map((stage) => (
            <GlowCard key={stage.stage}>
              <p className="text-xs uppercase tracking-[0.16em] text-mist/58">{stage.audience}</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">{stage.stage}</h2>
              <p className="mt-3 text-sm leading-7 text-mist/74">{stage.path}</p>
              <p className="mt-3 text-sm leading-7 text-mist/66">{stage.goal}</p>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Ladder rules</h2>
          <div className="mt-5 grid gap-3">
            {mentorshipLadderRules.map((rule) => (
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
