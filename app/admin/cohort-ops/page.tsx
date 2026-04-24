import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { cohortOpsItems, cohortOpsRules, cohortOpsSummary } from "@/lib/cohort-ops";

export const metadata: Metadata = {
  title: "Cohort Ops",
  description:
    "Protected cohort-ops page for guided program setup, assignment rhythm, progression management, and creator-support handoffs.",
};

export default async function AdminCohortOpsPage() {
  await requireUser();

  const readinessItems = cohortOpsItems.map((item) => ({
    label: item.title,
    status: item.status === "In progress" ? "In progress" : "Queued",
    detail: item.summary,
    routeTarget:
      item.title === "Creator and support handoff"
        ? "/admin/support-ops"
        : item.title === "Subscriber progression and access"
          ? "/admin/subscription-matrix"
          : "/admin/cohort-ops",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Cohort Ops", href: "/admin/cohort-ops" },
            ]}
          />
          <Eyebrow>Guided programs</Eyebrow>
          <SectionHeading
            title="Cohort operations"
            description="This page turns mentorship and guided learning into an operating rhythm instead of a loose collection of creator promises."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Program modes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{cohortOpsSummary.programModes}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Guidance loops</p>
            <p className="mt-2 text-3xl font-semibold text-white">{cohortOpsSummary.guidanceLoops}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Creator controls</p>
            <p className="mt-2 text-3xl font-semibold text-white">{cohortOpsSummary.creatorControls}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="cohort operations rule"
              panelTitle="Write-through cohort-ops action"
              panelDescription="Log cohort-ops changes into the shared revision lane so guided-program posture stops living only as an education planning board."
              defaultRouteTarget="/admin/cohort-ops"
              defaultOperator="Cohort Ops Operator"
              defaultChangedFields="program_mode, progression_rule, creator_handoff"
              actionNoun="cohort-ops mutation"
            />
          </GlowCard>
          {cohortOpsItems.map((item) => (
            <GlowCard key={item.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{item.summary}</p>
                </div>
                <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                  {item.status}
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Cohort rules</h2>
          <div className="mt-5 grid gap-3">
            {cohortOpsRules.map((rule) => (
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
