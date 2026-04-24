import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getBetaCommandCenter } from "@/lib/beta-command-center";

export const metadata: Metadata = {
  title: "Beta Command Center",
  description:
    "Protected beta-command-center page for deciding whether the platform is operationally ready to move from launch prep into controlled public beta.",
};

export default async function AdminBetaCommandCenterPage() {
  await requireUser();

  const center = getBetaCommandCenter();
  const readinessItems = center.lanes.map((lane) => ({
    label: lane.title,
    status: lane.status,
    detail: lane.detail,
    routeTarget: lane.href,
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Beta Command Center", href: "/admin/beta-command-center" },
            ]}
          />
          <Eyebrow>Phase 14 bridge</Eyebrow>
          <SectionHeading
            title="Beta command center"
            description="This page turns the next phase into an operational checkpoint so the team can judge whether controlled public beta is actually supportable."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Ready lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{center.ready}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Watch lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{center.watch}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{center.blocked}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="beta command lane"
            panelTitle="Write-through beta command action"
            panelDescription="Log beta-readiness and invite-gating changes into the shared revision lane so controlled-beta posture stops living only as a static command board."
            defaultRouteTarget="/admin/beta-command-center"
            defaultOperator="Beta Command Operator"
            defaultChangedFields="beta_lane, readiness_status, invite_scope"
            actionNoun="beta-command mutation"
          />
          {center.lanes.map((lane) => (
            <GlowCard key={lane.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{lane.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{lane.detail}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.16em] text-mist/58">
                    Reference: {lane.href}
                  </p>
                </div>
                <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                  {lane.status}
                </div>
              </div>
            </GlowCard>
          ))}
        </div>
      </Container>
    </div>
  );
}
