import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  accessGovernanceItems,
  accessGovernanceRules,
  accessGovernanceSummary,
} from "@/lib/access-governance";

export const metadata: Metadata = {
  title: "Access Governance",
  description:
    "Protected access-governance page for admin roles, sensitive workflow protection, and audit-aware operator access planning.",
};

export default async function AdminAccessGovernancePage() {
  await requireUser();

  const readinessItems = accessGovernanceItems.map((item) => ({
    label: item.title,
    status: item.status === "In progress" ? "In progress" : "Queued",
    detail: item.summary,
    routeTarget:
      item.title === "Sensitive workflow protection"
        ? "/admin/payment-events"
        : item.title === "Audit-aware operator actions"
          ? "/admin/revisions"
          : "/admin/access-governance",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Access Governance", href: "/admin/access-governance" },
            ]}
          />
          <Eyebrow>Security posture</Eyebrow>
          <SectionHeading
            title="Access governance"
            description="This page turns admin access into a real governance layer so sign-in, authorization, sensitive workflows, and future staff roles stay separate."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Role layers</p>
            <p className="mt-2 text-3xl font-semibold text-white">{accessGovernanceSummary.roleLayers}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Protected domains</p>
            <p className="mt-2 text-3xl font-semibold text-white">{accessGovernanceSummary.protectedDomains}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Audit priorities</p>
            <p className="mt-2 text-3xl font-semibold text-white">{accessGovernanceSummary.auditPriorities}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="access governance rule"
              panelTitle="Write-through access-governance action"
              panelDescription="Log access-governance changes into the shared revision lane so role and audit posture stop living only as a static security planning board."
              defaultRouteTarget="/admin/access-governance"
              defaultOperator="Access Governance Operator"
              defaultChangedFields="role_boundary, workflow_protection, audit_rule"
              actionNoun="access-governance mutation"
            />
          </GlowCard>
          {accessGovernanceItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Access rules</h2>
          <div className="mt-5 grid gap-3">
            {accessGovernanceRules.map((rule) => (
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
