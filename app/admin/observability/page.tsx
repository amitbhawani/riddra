import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  observabilityItems,
  observabilityRules,
  observabilitySummary,
} from "@/lib/observability-ops";

export const metadata: Metadata = {
  title: "Observability",
  description:
    "Protected observability page for runtime health, source failures, notification issues, and operator escalation planning.",
};

export default async function AdminObservabilityPage() {
  await requireUser();
  const readinessItems = observabilityItems.map((item) => ({
    label: item.title,
    status: item.status,
    detail: item.summary,
    routeTarget: "/admin/observability",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Observability", href: "/admin/observability" },
            ]}
          />
          <Eyebrow>Failure visibility</Eyebrow>
          <SectionHeading
            title="Observability"
            description="This page turns runtime, source, billing, and trust failures into one visible operator layer instead of leaving issues to be discovered by accident."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Signal families</p>
            <p className="mt-2 text-3xl font-semibold text-white">{observabilitySummary.signalFamilies}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Monitored journeys</p>
            <p className="mt-2 text-3xl font-semibold text-white">{observabilitySummary.monitoredJourneys}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Alert destinations</p>
            <p className="mt-2 text-3xl font-semibold text-white">{observabilitySummary.alertDestinations}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="observability lane"
            panelTitle="Write-through observability action"
            panelDescription="Log alerting and runtime-visibility changes into the shared revision lane so observability posture stops living only as a static failure-visibility board."
            defaultRouteTarget="/admin/observability"
            defaultOperator="Observability Operator"
            defaultChangedFields="signal_family, alert_path, runtime_visibility"
            actionNoun="observability mutation"
          />
          {observabilityItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Observability rules</h2>
          <div className="mt-5 grid gap-3">
            {observabilityRules.map((rule) => (
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
