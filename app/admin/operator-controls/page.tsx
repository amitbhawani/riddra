import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { operatorControlGroups, operatorControlRules, operatorControlsSummary } from "@/lib/operator-controls";

export const metadata: Metadata = {
  title: "Operator Controls",
  description: "Protected operator-controls page for module activation, behavior settings, and rollout-safe admin configuration.",
};

export default async function AdminOperatorControlsPage() {
  await requireUser();
  const readinessItems = operatorControlGroups.map((group) => ({
    label: group.title,
    status:
      group.status === "Live" ? "Ready" : group.status === "In progress" ? "Needs verification" : "Queued",
    detail: group.summary,
    routeTarget:
      group.title === "Module activation controls"
        ? "/admin/module-activation"
        : group.title === "Publishing behavior controls"
          ? "/admin/operator-controls"
          : group.title === "Alert and notification controls"
            ? "/admin/delivery-layers"
            : group.title === "AI mode controls"
              ? "/admin/ai-ops"
              : group.title === "Search and discovery controls"
                ? "/admin/search-screener-truth"
                : "/admin/integration-marketplace",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Admin", href: "/admin" }, { name: "Operator Controls", href: "/admin/operator-controls" }]} />
          <Eyebrow>Operator configuration</Eyebrow>
          <SectionHeading
            title="Operator controls"
            description="This page models the admin-side configuration layer that should eventually let your team control modules, behavior, and rollout modes without touching code for every small change."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Configurable panels</p>
            <p className="mt-2 text-3xl font-semibold text-white">{operatorControlsSummary.configurablePanels}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Module toggles</p>
            <p className="mt-2 text-3xl font-semibold text-white">{operatorControlsSummary.moduleToggles}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Rollout modes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{operatorControlsSummary.rolloutModes}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="operator control group"
              panelTitle="Write-through operator-control action"
              panelDescription="Log admin configuration and rollout-control changes into the shared revision lane so operator behavior stops living only as a static control model."
              defaultRouteTarget="/admin/operator-controls"
              defaultOperator="Operator Controls Owner"
              defaultChangedFields="control_group, behavior_scope, rollback_mode"
              actionNoun="operator-control mutation"
            />
          </GlowCard>
          {operatorControlGroups.map((group) => (
            <GlowCard key={group.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{group.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{group.summary}</p>
                </div>
                <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                  {group.status}
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Configuration rules</h2>
          <div className="mt-5 grid gap-3">
            {operatorControlRules.map((rule) => (
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
