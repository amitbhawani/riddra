import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getBetaOpsRunbook } from "@/lib/beta-ops-runbook";

export const metadata: Metadata = {
  title: "Beta Ops Runbook",
  description:
    "Protected beta-ops-runbook page for the daily operating rhythm of a controlled public beta.",
};

export default async function AdminBetaOpsRunbookPage() {
  await requireUser();

  const runbook = getBetaOpsRunbook();
  const readinessItems = runbook.steps.map((step) => ({
    label: step.title,
    status: "Required",
    detail: `${step.detail} Owner: ${step.owner}. Cadence: ${step.cadence}.`,
    routeTarget: "/admin/beta-ops-runbook",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Beta Ops Runbook", href: "/admin/beta-ops-runbook" },
            ]}
          />
          <Eyebrow>Beta operations</Eyebrow>
          <SectionHeading
            title="Beta ops runbook"
            description="This page gives the team a repeatable daily operating rhythm for controlled public beta so feedback, trust, and scope do not drift under deadline pressure."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {runbook.principles.map((principle) => (
            <GlowCard key={principle}>
              <p className="text-sm leading-7 text-mist/76">{principle}</p>
            </GlowCard>
          ))}
        </div>

        <div className="grid gap-6">
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="beta ops runbook step"
            panelTitle="Write-through beta ops action"
            panelDescription="Log beta operating-rhythm changes into the shared revision lane so controlled-beta execution stops living only as a static runbook."
            defaultRouteTarget="/admin/beta-ops-runbook"
            defaultOperator="Beta Ops Operator"
            defaultChangedFields="beta_step, owner_rhythm, operating_cadence"
            actionNoun="beta-ops mutation"
          />
          {runbook.steps.map((step) => (
            <GlowCard key={step.title}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{step.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{step.detail}</p>
                </div>
                <div className="flex gap-3">
                  <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                    {step.owner}
                  </div>
                  <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                    {step.cadence}
                  </div>
                </div>
              </div>
            </GlowCard>
          ))}
        </div>
      </Container>
    </div>
  );
}
