import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { moduleInstallerItems, moduleInstallerRules, moduleInstallerSummary } from "@/lib/module-installer";

export const metadata: Metadata = {
  title: "Module Installer",
  description: "Protected module-installer page for starter kits, clone-ready route families, and one-click expansion planning.",
};

export default async function AdminModuleInstallerPage() {
  await requireUser();
  const readinessItems = moduleInstallerItems.map((item) => ({
    label: item.title,
    status: item.status === "Ready" ? "Ready" : "Queued",
    detail: item.summary,
    routeTarget:
      item.title === "Equity research starter kit"
        ? "/admin/module-catalog"
        : item.title === "IPO lifecycle starter kit"
          ? "/admin/canonical-asset-intake"
          : item.title === "Wealth product starter kit"
            ? "/admin/wealth-products"
            : item.title === "Creator distribution starter kit"
              ? "/admin/creator-studio"
              : item.title === "Campaign microsite kit"
                ? "/admin/campaign-engine"
                : "/admin/support-ops",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Admin", href: "/admin" }, { name: "Module Installer", href: "/admin/module-installer" }]} />
          <Eyebrow>Install kits</Eyebrow>
          <SectionHeading
            title="Module installer"
            description="This page turns route-family contracts into clone-ready starter kits so future expansion can move closer to one-click enablement instead of bespoke rebuilds."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Starter kits</p>
            <p className="mt-2 text-3xl font-semibold text-white">{moduleInstallerSummary.starterKits}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Ready to clone</p>
            <p className="mt-2 text-3xl font-semibold text-white">{moduleInstallerSummary.readyToClone}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Queued families</p>
            <p className="mt-2 text-3xl font-semibold text-white">{moduleInstallerSummary.queuedFamilies}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="module installer kit"
              panelTitle="Write-through module-installer action"
              panelDescription="Log starter-kit and clone-ready changes into the shared revision lane so expansion kits stop living only as a planning page."
              defaultRouteTarget="/admin/module-installer"
              defaultOperator="Module Installer Operator"
              defaultChangedFields="starter_kit, clone_state, kit_dependency"
              actionNoun="module-installer mutation"
            />
          </GlowCard>
          {moduleInstallerItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Installer rules</h2>
          <div className="mt-5 grid gap-3">
            {moduleInstallerRules.map((rule) => (
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
