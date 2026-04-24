import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  journeyGovernanceItems,
  journeyGovernanceRules,
  journeyGovernanceSummary,
} from "@/lib/journey-governance";

export const metadata: Metadata = {
  title: "Journey Governance",
  description:
    "Protected journey-governance page for support, success, campaign, consent, and recovery handoffs across lifecycle operations.",
};

export default async function AdminJourneyGovernancePage() {
  await requireUser();

  const readinessItems = journeyGovernanceItems.map((item) => ({
    label: item.title,
    status: item.status === "Complete" ? "Ready" : "Needs verification",
    detail: item.summary,
    routeTarget:
      item.title === "Support-to-success handoff"
        ? "/admin/user-success"
        : item.title === "Campaign-to-outcome review"
          ? "/admin/campaign-insights"
          : item.title === "Consent-aware journey governance"
            ? "/admin/consent-ops"
            : "/admin/recovery-readiness",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Journey Governance", href: "/admin/journey-governance" },
            ]}
          />
          <Eyebrow>Lifecycle control</Eyebrow>
          <SectionHeading
            title="Journey governance"
            description="This page ties support, user success, campaigns, consent, and recovery into one governed lifecycle layer so handoffs become explicit instead of fragmented."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Governed journeys</p>
            <p className="mt-2 text-3xl font-semibold text-white">{journeyGovernanceSummary.governedJourneys}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Handoff layers</p>
            <p className="mt-2 text-3xl font-semibold text-white">{journeyGovernanceSummary.handoffLayers}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Review cycles</p>
            <p className="mt-2 text-3xl font-semibold text-white">{journeyGovernanceSummary.reviewCycles}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="journey governance policy"
              panelTitle="Write-through journey-governance action"
              panelDescription="Log lifecycle handoff and recovery-governance changes into the shared revision lane so journey ownership stops living only as governance copy."
              defaultRouteTarget="/admin/journey-governance"
              defaultOperator="Journey Governance Operator"
              defaultChangedFields="handoff_policy, escalation_rule, owner_scope"
              actionNoun="journey-governance mutation"
            />
          </GlowCard>
          {journeyGovernanceItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Governance rules</h2>
          <div className="mt-5 grid gap-3">
            {journeyGovernanceRules.map((rule) => (
              <div
                key={rule}
                className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76"
              >
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
