import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { consentOpsItems, consentOpsRules, consentOpsSummary } from "@/lib/consent-ops";

export const metadata: Metadata = {
  title: "Consent Ops",
  description:
    "Protected consent-ops page for purpose-aware messaging permissions, lifecycle eligibility, and sensitive workflow controls.",
};

export default async function AdminConsentOpsPage() {
  await requireUser();
  const readinessItems = consentOpsItems.map((item) => ({
    label: item.title,
    status: item.status,
    detail: item.summary,
    routeTarget: "/admin/consent-ops",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Consent Ops", href: "/admin/consent-ops" },
            ]}
          />
          <Eyebrow>Permission governance</Eyebrow>
          <SectionHeading
            title="Consent ops"
            description="This page gives the backend a dedicated consent-governance layer so messaging, lifecycle automation, and sensitive portfolio workflows can stay permission-aware."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Consent channels</p>
            <p className="mt-2 text-3xl font-semibold text-white">{consentOpsSummary.consentChannels}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Lifecycle scopes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{consentOpsSummary.lifecycleScopes}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">User controls</p>
            <p className="mt-2 text-3xl font-semibold text-white">{consentOpsSummary.userControls}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="consent ops lane"
            panelTitle="Write-through consent-ops action"
            panelDescription="Log permission-governance and lifecycle-eligibility changes into the shared revision lane so consent posture stops living only as a static governance board."
            defaultRouteTarget="/admin/consent-ops"
            defaultOperator="Consent Ops Operator"
            defaultChangedFields="consent_channel, lifecycle_scope, permission_control"
            actionNoun="consent-ops mutation"
          />
          {consentOpsItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Consent rules</h2>
          <div className="mt-5 grid gap-3">
            {consentOpsRules.map((rule) => (
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
