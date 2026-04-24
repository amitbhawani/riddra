import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { LaunchOwnerInboxRevisionPanel } from "@/components/launch-owner-inbox-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getLaunchOwnerInbox } from "@/lib/launch-owner-inbox";

export const metadata: Metadata = {
  title: "Launch Owner Inbox",
  description:
    "Protected launch-owner-inbox page for assigning the remaining launch blockers and approvals by owner.",
};

export default async function AdminLaunchOwnerInboxPage() {
  await requireUser();

  const inbox = getLaunchOwnerInbox();

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Launch Owner Inbox", href: "/admin/launch-owner-inbox" },
            ]}
          />
          <Eyebrow>Phase 22 owner handoff</Eyebrow>
          <SectionHeading
            title="Launch owner inbox"
            description="This page turns the remaining launch blockers into owner-specific inbox lanes so credentials, approvals, support, and public-posture work can be closed faster."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Owners with open work</p>
            <p className="mt-2 text-3xl font-semibold text-white">{inbox.owners}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Critical owner lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{inbox.criticalOwners}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Pending approvals</p>
            <p className="mt-2 text-3xl font-semibold text-white">{inbox.pendingApprovals}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <LaunchOwnerInboxRevisionPanel items={inbox.lanes} />
          {inbox.lanes.map((lane) => (
            <GlowCard key={lane.owner}>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-semibold text-white">{lane.owner}</h2>
                    <div className="rounded-full bg-white/[0.05] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white/78">
                      {lane.urgency}
                    </div>
                  </div>
                  <p className="max-w-3xl text-sm leading-7 text-mist/74">{lane.summary}</p>
                </div>

                <div className="grid min-w-[220px] gap-3 rounded-[1.5rem] border border-white/10 bg-black/15 p-4 text-sm text-mist/72">
                  <div className="flex items-center justify-between">
                    <span>Blockers</span>
                    <span className="font-semibold text-white">{lane.blockerCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Pending approvals</span>
                    <span className="font-semibold text-white">{lane.approvalCount}</span>
                  </div>
                  <Link className="text-aqua underline-offset-4 hover:underline" href={lane.href}>
                    Open owner lane
                  </Link>
                </div>
              </div>
            </GlowCard>
          ))}
        </div>
      </Container>
    </div>
  );
}
