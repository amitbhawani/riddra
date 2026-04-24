import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  incidentResponseItems,
  incidentResponseRules,
  incidentResponseSummary,
} from "@/lib/incident-response";

export const metadata: Metadata = {
  title: "Incident Response",
  description:
    "Protected incident-response page for runtime failures, trust issues, revenue incidents, rollback planning, and follow-up learning.",
};

export default async function AdminIncidentResponsePage() {
  await requireUser();
  const readinessItems = incidentResponseItems.map((item) => ({
    label: item.title,
    status: item.status,
    detail: item.summary,
    routeTarget: "/admin/incident-response",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Incident Response", href: "/admin/incident-response" },
            ]}
          />
          <Eyebrow>Containment discipline</Eyebrow>
          <SectionHeading
            title="Incident response"
            description="This page turns major failures into explicit response lanes so runtime, source, revenue, and trust incidents can be contained deliberately."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Response lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{incidentResponseSummary.responseLanes}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Incident classes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{incidentResponseSummary.incidentClasses}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Escalation windows</p>
            <p className="mt-2 text-3xl font-semibold text-white">{incidentResponseSummary.escalationWindows}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="incident response lane"
            panelTitle="Write-through incident response action"
            panelDescription="Log containment and escalation changes into the shared revision lane so incident posture stops living only as a static response board."
            defaultRouteTarget="/admin/incident-response"
            defaultOperator="Incident Response Operator"
            defaultChangedFields="incident_lane, escalation_state, containment_posture"
            actionNoun="incident-response mutation"
          />
          {incidentResponseItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Incident rules</h2>
          <div className="mt-5 grid gap-3">
            {incidentResponseRules.map((rule) => (
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
