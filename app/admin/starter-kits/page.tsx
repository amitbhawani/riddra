import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { starterKitItems, starterKitRules, starterKitsSummary } from "@/lib/starter-kits";

export const metadata: Metadata = {
  title: "Starter Kits",
  description:
    "Protected starter-kits page for reusable route-family, workspace, and launch-template kits across the platform.",
};

export default async function AdminStarterKitsPage() {
  await requireUser();

  const readinessItems = starterKitItems.map((item) => ({
    label: item.title,
    status: item.status === "In progress" ? "Needs verification" : "Queued",
    detail: item.summary,
    routeTarget:
      item.title === "SEO route-family kits"
        ? "/admin/content-models"
        : item.title === "Workspace feature kits"
          ? "/account/workspace"
          : item.title === "Campaign and microsite kits"
            ? "/admin/distribution-ops"
            : "/admin/setup-playbook",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Starter Kits", href: "/admin/starter-kits" },
            ]}
          />
          <Eyebrow>Module reuse</Eyebrow>
          <SectionHeading
            title="Starter kits"
            description="This page turns module thinking into repeatable starter kits so new route families and workspace features can launch from known patterns instead of manual rebuilds."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Kit families</p>
            <p className="mt-2 text-3xl font-semibold text-white">{starterKitsSummary.kitFamilies}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Reusable patterns</p>
            <p className="mt-2 text-3xl font-semibold text-white">{starterKitsSummary.reusablePatterns}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Launch templates</p>
            <p className="mt-2 text-3xl font-semibold text-white">{starterKitsSummary.launchTemplates}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="starter kit"
              panelTitle="Write-through starter-kit action"
              panelDescription="Log reusable module-pattern changes into the shared revision lane so starter kits stop living only as reuse theory."
              defaultRouteTarget="/admin/starter-kits"
              defaultOperator="Starter Kit Operator"
              defaultChangedFields="kit_family, rollout_template, operator_defaults"
              actionNoun="starter-kit mutation"
            />
          </GlowCard>
          {starterKitItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Starter-kit rules</h2>
          <div className="mt-5 grid gap-3">
            {starterKitRules.map((rule) => (
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
