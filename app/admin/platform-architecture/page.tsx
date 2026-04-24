import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  platformArchitectureLayers,
  platformArchitectureModules,
  platformArchitectureNextMoves,
  platformArchitectureSqlRules,
} from "@/lib/platform-architecture";

export const metadata: Metadata = {
  title: "Platform Architecture",
  description: "Protected platform-architecture page for scale-ready CMS, SQL design, and modular route-family planning.",
};

export default async function PlatformArchitecturePage() {
  await requireUser();

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Admin", href: "/admin" },
    { name: "Platform Architecture", href: "/admin/platform-architecture" },
  ];
  const readinessItems = platformArchitectureModules.map((item) => ({
    label: item.title,
    status:
      item.title === "Source adapters"
        ? "Needs activation"
        : item.title === "Plugin-like feature packs"
          ? "Queued"
          : "Needs verification",
    detail: item.summary,
    routeTarget:
      item.title === "Route-family templates"
        ? "/admin/content-models"
        : item.title === "Block registry"
          ? "/admin/cms"
          : item.title === "Source adapters"
            ? "/admin/provider-adapters"
            : item.title === "Lifecycle automation"
              ? "/admin/editorial-workflows"
              : "/admin/wealth-products",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Scale architecture</Eyebrow>
          <SectionHeading
            title="Platform architecture"
            description="This page defines the large-scale operating model for Riddra: thousands of dynamic public pages, manual editorial control, plugin-like route expansion, and a SQL system that remembers everything important."
          />
        </div>

        <GlowCard>
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="platform architecture track"
            panelTitle="Write-through platform-architecture action"
            panelDescription="Log structural architecture decisions into the shared revision lane so module and scale-planning changes stop living only as long-form guidance."
            defaultRouteTarget="/admin/platform-architecture"
            defaultOperator="Platform Architecture Operator"
            defaultChangedFields="architecture_module, scale_layer, rollout_posture"
            actionNoun="platform-architecture mutation"
          />
        </GlowCard>

        <div className="grid gap-6 xl:grid-cols-2">
          {platformArchitectureLayers.map((layer) => (
            <GlowCard key={layer.title}>
              <h2 className="text-2xl font-semibold text-white">{layer.title}</h2>
              <div className="mt-5 grid gap-3">
                {layer.points.map((point) => (
                  <div key={point} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                    {point}
                  </div>
                ))}
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Plugin-like modules</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {platformArchitectureModules.map((item) => (
              <div key={item.title} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <h3 className="text-base font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-mist/74">{item.summary}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">SQL planning rules</h2>
          <div className="mt-5 grid gap-3">
            {platformArchitectureSqlRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Next architecture moves</h2>
          <div className="mt-5 grid gap-3">
            {platformArchitectureNextMoves.map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {item}
              </div>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
