import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  designSystemItems,
  designSystemRules,
  designSystemSummary,
} from "@/lib/design-system-refinement";

export const metadata: Metadata = {
  title: "Design System",
  description:
    "Protected design-system page for research-page polish, admin workflow clarity, token refinement, and launch-grade interaction review.",
};

export default async function AdminDesignSystemPage() {
  await requireUser();
  const readinessItems = designSystemItems.map((item) => ({
    label: item.title,
    status: item.status === "In progress" ? "Needs verification" : "Queued",
    detail: item.summary,
    routeTarget:
      item.title === "Research and chart-page polish"
        ? "/admin/public-launch-qa"
        : item.title === "Admin workflow clarity"
          ? "/build-tracker"
          : item.title === "Design token and pattern tightening"
            ? "/admin/design-system"
            : "/admin/experience-audit",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Design System", href: "/admin/design-system" },
            ]}
          />
          <Eyebrow>Experience polish</Eyebrow>
          <SectionHeading
            title="Design system refinement"
            description="This page turns visual polish and interaction quality into a structured refinement track instead of leaving launch feel to the final hour."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Polish tracks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{designSystemSummary.polishTracks}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Route families</p>
            <p className="mt-2 text-3xl font-semibold text-white">{designSystemSummary.routeFamilies}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">UI priorities</p>
            <p className="mt-2 text-3xl font-semibold text-white">{designSystemSummary.uiPriorities}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="design-system refinement"
              panelTitle="Write-through design-system action"
              panelDescription="Log polish and interaction-refinement changes into the shared revision lane so launch-quality design work stops living only as a descriptive audit board."
              defaultRouteTarget="/admin/design-system"
              defaultOperator="Design System Operator"
              defaultChangedFields="ui_track, polish_scope, interaction_posture"
              actionNoun="design-system mutation"
            />
          </GlowCard>
          {designSystemItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Design rules</h2>
          <div className="mt-5 grid gap-3">
            {designSystemRules.map((rule) => (
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
