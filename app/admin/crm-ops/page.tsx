import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { crmOpsItems, crmOpsRules, crmOpsSummary } from "@/lib/crm-ops";

export const metadata: Metadata = {
  title: "CRM Ops",
  description: "Protected CRM-ops page for segmentation, lifecycle stages, lead scoring, and subscriber recovery planning.",
};

export default async function AdminCrmOpsPage() {
  await requireUser();

  const readinessItems = crmOpsItems.map((item) => ({
    label: item.title,
    status: item.status === "In progress" ? "In progress" : "Queued",
    detail: item.summary,
    routeTarget:
      item.title === "Subscriber recovery and win-back"
        ? "/admin/lifecycle-campaigns"
        : item.title === "Lead scoring and plan-readiness"
          ? "/admin/subscription-matrix"
          : "/admin/crm-ops",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Admin", href: "/admin" }, { name: "CRM Ops", href: "/admin/crm-ops" }]} />
          <Eyebrow>Lifecycle growth</Eyebrow>
          <SectionHeading
            title="CRM ops"
            description="This page turns growth and subscriber lifecycle thinking into a structured operating layer so lead scoring, retention, and recovery can scale cleanly."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Active segments</p>
            <p className="mt-2 text-3xl font-semibold text-white">{crmOpsSummary.activeSegments}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Lead stages</p>
            <p className="mt-2 text-3xl font-semibold text-white">{crmOpsSummary.leadStages}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Retained journeys</p>
            <p className="mt-2 text-3xl font-semibold text-white">{crmOpsSummary.retainedJourneys}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="crm operations rule"
              panelTitle="Write-through CRM action"
              panelDescription="Log CRM-ops changes into the shared revision lane so segmentation and lifecycle posture stop living only as a planning board."
              defaultRouteTarget="/admin/crm-ops"
              defaultOperator="CRM Ops Operator"
              defaultChangedFields="segment_rule, lifecycle_state, growth_posture"
              actionNoun="crm-ops mutation"
            />
          </GlowCard>
          {crmOpsItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">CRM rules</h2>
          <div className="mt-5 grid gap-3">
            {crmOpsRules.map((rule) => (
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
