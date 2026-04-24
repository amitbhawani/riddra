import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { dbActivationGroups } from "@/lib/db-activation";

export const metadata: Metadata = {
  title: "DB Activation",
  description: "Protected database activation page for migrations, seeds, and rollout verification.",
};

export default async function DbActivationPage() {
  await requireUser();

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Admin", href: "/admin" },
    { name: "DB Activation", href: "/admin/db-activation" },
  ];
  const readinessItems = dbActivationGroups.map((group) => ({
    label: group.title,
    status:
      group.title === "Portfolio foundation" ||
      group.title === "Billing foundation" ||
      group.title === "Asset registry foundation"
        ? "Needs verification"
        : "Needs activation",
    detail: group.summary,
    routeTarget:
      group.title === "Portfolio foundation"
        ? "/portfolio/import"
        : group.title === "Billing foundation"
          ? "/admin/billing-ledger"
          : group.title === "Editorial CMS foundation"
            ? "/admin/cms"
            : group.title === "Asset registry foundation"
              ? "/admin/asset-registry"
              : group.title === "Phase 2 execution foundation"
                ? "/admin/provider-onboarding"
                : group.title === "Phase 8 architecture foundation"
                  ? "/admin/platform-architecture"
                  : "/admin/db-activation",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Phase 2 activation</Eyebrow>
          <SectionHeading
            title="Database activation"
            description="This page shows the exact migration and seed rollout order for the current app so the real backend can catch up with what has already been built in the UI."
          />
        </div>

        <GlowCard>
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="db activation foundation"
            panelTitle="Write-through DB-activation action"
            panelDescription="Log migration and seed-readiness changes into the shared revision lane so database rollout posture stops living only as a manual runbook."
            defaultRouteTarget="/admin/db-activation"
            defaultOperator="DB Activation Operator"
            defaultChangedFields="foundation_group, migration_posture, seed_readiness"
            actionNoun="db-activation mutation"
          />
        </GlowCard>

        <div className="grid gap-6 xl:grid-cols-2">
          {dbActivationGroups.map((group) => (
            <GlowCard key={group.title}>
              <h2 className="text-2xl font-semibold text-white">{group.title}</h2>
              <p className="mt-4 text-sm leading-7 text-mist/74">{group.summary}</p>
              <div className="mt-5 grid gap-3">
                {group.steps.map((step) => (
                  <div key={step} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                    {step}
                  </div>
                ))}
              </div>
            </GlowCard>
          ))}
        </div>
      </Container>
    </div>
  );
}
