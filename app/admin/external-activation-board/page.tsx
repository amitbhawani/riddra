import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getExternalActivationBoard } from "@/lib/external-activation-board";

export const metadata: Metadata = {
  title: "External Activation Board",
  description:
    "Protected external-activation board for credentials, callbacks, support delivery, and launch commitments that still need setup outside the codebase.",
};

export default async function AdminExternalActivationBoardPage() {
  await requireUser();

  const board = getExternalActivationBoard();
  const readinessItems = board.lanes.map((lane) => ({
    label: lane.title,
    status: lane.blocked > 0 ? "Blocked" : lane.ready > 0 ? "Ready" : "In progress",
    detail: lane.summary,
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
              { name: "External Activation Board", href: "/admin/external-activation-board" },
            ]}
          />
          <Eyebrow>Phase 22 external handoff</Eyebrow>
          <SectionHeading
            title="External activation board"
            description="This page keeps the remaining non-code activation work in one place so credentials, redirects, communications, and launch commitments can be executed without hunting through multiple admin routes."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <GlowCard>
            <p className="text-sm text-mist/68">Ready checks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{board.ready}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked checks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{board.blocked}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="external activation lane"
              panelTitle="Write-through external activation board action"
              panelDescription="Log activation-board changes into the shared revision lane so credential, redirect, delivery, and commitment posture stops living only as an overview board."
              defaultRouteTarget="/admin/external-activation-board"
              defaultOperator="External Activation Board Operator"
              defaultChangedFields="activation_lane, readiness_state, external_blocker"
              actionNoun="external-activation-board mutation"
            />
          </div>
          {board.lanes.map((lane) => (
            <GlowCard key={lane.title}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <h2 className="text-2xl font-semibold text-white">{lane.title}</h2>
                  <p className="text-sm leading-7 text-mist/76">{lane.summary}</p>
                </div>
                <Link
                  href={lane.href}
                  className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
                >
                  Open lane
                </Link>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <p className="text-sm text-mist/68">Ready</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{lane.ready}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <p className="text-sm text-mist/68">Blocked</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{lane.blocked}</p>
                </div>
              </div>
            </GlowCard>
          ))}
        </div>
      </Container>
    </div>
  );
}
