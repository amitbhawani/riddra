import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  moduleActivationItems,
  moduleActivationRules,
  moduleActivationSummary,
} from "@/lib/module-activation";

export const metadata: Metadata = {
  title: "Module Activation",
  description:
    "Protected module-activation page for readiness checklists, dependency-aware enablement, and audit-safe module rollout.",
};

export default async function AdminModuleActivationPage() {
  await requireUser();
  const readinessItems = moduleActivationItems.map((item) => ({
    label: item.title,
    status: item.status === "In progress" ? "Needs verification" : "Queued",
    detail: item.summary,
    routeTarget:
      item.title === "Module activation checklists"
        ? "/build-tracker"
        : item.title === "Dependency-aware activation"
          ? "/admin/provider-onboarding"
          : item.title === "Operator-ready defaults"
            ? "/admin/operator-controls"
            : "/admin/revisions",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Module Activation", href: "/admin/module-activation" },
            ]}
          />
          <Eyebrow>Activation discipline</Eyebrow>
          <SectionHeading
            title="Module activation"
            description="This page turns starter-kit and module thinking into a readiness discipline so route families are activated only when their data, content, and operations are actually ready."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Activatable modules</p>
            <p className="mt-2 text-3xl font-semibold text-white">{moduleActivationSummary.activatableModules}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Setup checklists</p>
            <p className="mt-2 text-3xl font-semibold text-white">{moduleActivationSummary.setupChecklists}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Readiness states</p>
            <p className="mt-2 text-3xl font-semibold text-white">{moduleActivationSummary.readinessStates}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="module activation track"
              panelTitle="Write-through module-activation action"
              panelDescription="Log activation-discipline changes into the shared revision lane so module readiness stops living only as a checklist concept."
              defaultRouteTarget="/admin/module-activation"
              defaultOperator="Module Activation Operator"
              defaultChangedFields="activation_track, readiness_gate, default_posture"
              actionNoun="module-activation mutation"
            />
          </GlowCard>
          {moduleActivationItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Activation rules</h2>
          <div className="mt-5 grid gap-3">
            {moduleActivationRules.map((rule) => (
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
