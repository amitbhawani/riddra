import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getExternalPrerequisites } from "@/lib/external-prerequisites";

export const metadata: Metadata = {
  title: "External Prerequisites",
  description:
    "Protected external-prerequisites page for the remaining off-repo auth, payments, support, and launch-approval tasks.",
};

export default async function AdminExternalPrerequisitesPage() {
  await requireUser();

  const data = getExternalPrerequisites();
  const readinessItems = data.items.map((item) => ({
    label: item.title,
    status: item.status,
    detail: item.detail,
    routeTarget: "/admin/external-prerequisites",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "External Prerequisites", href: "/admin/external-prerequisites" },
            ]}
          />
          <Eyebrow>Build-side complete handoff</Eyebrow>
          <SectionHeading
            title="External prerequisites"
            description="This page lists the remaining off-repo tasks after the Phase 22 build-side operator layer is complete. These items still need real dashboard, provider, payment, or legal action."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Open prerequisites</p>
            <p className="mt-2 text-3xl font-semibold text-white">{data.openPrerequisites}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Immediate user inputs</p>
            <p className="mt-2 text-3xl font-semibold text-white">{data.userInputs}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Shared activation items</p>
            <p className="mt-2 text-3xl font-semibold text-white">{data.sharedItems}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="external prerequisite"
            panelTitle="Write-through prerequisite action"
            panelDescription="Log off-repo launch prerequisites into the shared revision lane so human-owned activation work stops living only as a static handoff list."
            defaultRouteTarget="/admin/external-prerequisites"
            defaultOperator="External Prerequisites Operator"
            defaultChangedFields="external_prerequisite, owner_handoff, launch_blocker"
            actionNoun="external-prerequisite mutation"
          />
          {data.items.map((item) => (
            <GlowCard key={item.title}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
                  <p className="text-sm leading-7 text-mist/74">{item.detail}</p>
                </div>
                <div className="grid gap-2 text-right">
                  <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                    {item.status}
                  </div>
                  <div className="text-xs uppercase tracking-[0.16em] text-mist/60">{item.owner}</div>
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Immediate checklist</h2>
          <div className="mt-5 grid gap-3">
            {data.checklist.map((entry) => (
              <div key={entry} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {entry}
              </div>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
