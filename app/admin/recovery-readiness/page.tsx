import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  recoveryReadinessItems,
  recoveryReadinessRules,
  recoveryReadinessSummary,
} from "@/lib/recovery-readiness";

export const metadata: Metadata = {
  title: "Recovery Readiness",
  description:
    "Protected recovery-readiness page for rollback planning, content recovery, provider rollback, and performance-health recovery discipline.",
};

export default async function AdminRecoveryReadinessPage() {
  await requireUser();
  const readinessItems = recoveryReadinessItems.map((item) => ({
    label: item.title,
    status: item.status,
    detail: item.summary,
    routeTarget: "/admin/recovery-readiness",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Recovery Readiness", href: "/admin/recovery-readiness" },
            ]}
          />
          <Eyebrow>Recovery discipline</Eyebrow>
          <SectionHeading
            title="Recovery readiness"
            description="This page turns rollback and restoration into a real operating layer so content, provider, billing, and traffic mistakes can be recovered deliberately."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Recovery tracks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{recoveryReadinessSummary.recoveryTracks}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Protected assets</p>
            <p className="mt-2 text-3xl font-semibold text-white">{recoveryReadinessSummary.protectedAssets}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Readiness checks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{recoveryReadinessSummary.readinessChecks}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="recovery readiness track"
            panelTitle="Write-through recovery readiness action"
            panelDescription="Log rollback and restoration changes into the shared revision lane so recovery discipline stops living only as a static readiness board."
            defaultRouteTarget="/admin/recovery-readiness"
            defaultOperator="Recovery Readiness Operator"
            defaultChangedFields="recovery_track, rollback_posture, resilience_state"
            actionNoun="recovery-readiness mutation"
          />
          {recoveryReadinessItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Recovery rules</h2>
          <div className="mt-5 grid gap-3">
            {recoveryReadinessRules.map((rule) => (
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
