import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { modulePresetItems, modulePresetRules, modulePresetsSummary } from "@/lib/module-presets";

export const metadata: Metadata = {
  title: "Module Presets",
  description: "Protected module-presets page for reusable preset bundles across route families, lifecycle patterns, and subscriber utilities.",
};

export default async function AdminModulePresetsPage() {
  await requireUser();
  const readinessItems = modulePresetItems.map((item) => ({
    label: item.title,
    status: item.status === "Ready" ? "Ready" : "Queued",
    detail: item.summary,
    routeTarget:
      item.title === "SEO research preset"
        ? "/admin/module-catalog"
        : item.title === "Lifecycle asset preset"
          ? "/admin/editorial-workflows"
          : item.title === "Subscriber utility preset"
            ? "/account/workspace"
            : item.title === "Creator funnel preset"
              ? "/admin/launch-rehearsal-packet"
              : "/admin/integration-marketplace",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Admin", href: "/admin" }, { name: "Module Presets", href: "/admin/module-presets" }]} />
          <Eyebrow>Preset bundles</Eyebrow>
          <SectionHeading
            title="Module presets"
            description="This page groups reusable expansion patterns into presets so future route families can launch from known bundles instead of assembling every block and behavior by hand."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Preset families</p>
            <p className="mt-2 text-3xl font-semibold text-white">{modulePresetsSummary.presetFamilies}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Ready presets</p>
            <p className="mt-2 text-3xl font-semibold text-white">{modulePresetsSummary.readyPresets}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Queued bundles</p>
            <p className="mt-2 text-3xl font-semibold text-white">{modulePresetsSummary.queuedBundles}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="module preset"
              panelTitle="Write-through module-preset action"
              panelDescription="Log preset-bundle changes into the shared revision lane so reusable rollout bundles stop living only as a static preset board."
              defaultRouteTarget="/admin/module-presets"
              defaultOperator="Module Preset Operator"
              defaultChangedFields="preset_bundle, preset_scope, access_posture"
              actionNoun="module-preset mutation"
            />
          </GlowCard>
          {modulePresetItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Preset rules</h2>
          <div className="mt-5 grid gap-3">
            {modulePresetRules.map((rule) => (
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
