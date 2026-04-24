import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { LaunchApprovalRevisionPanel } from "@/components/launch-approval-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getLaunchApprovalBoard } from "@/lib/launch-approval-board";
import { getLaunchApprovalRegistrySummary } from "@/lib/launch-approval-registry";

export const metadata: Metadata = {
  title: "Launch Approvals",
  description:
    "Protected launch-approvals page for owner signoff across scope, engineering, support, payments, and communications before go-live.",
};

export default async function AdminLaunchApprovalsPage() {
  await requireUser();

  const board = getLaunchApprovalBoard();
  const { approvals, consoleSummary, ownerUrgencies, blockedApprovalLanes } = board;
  const registrySummary = getLaunchApprovalRegistrySummary();

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Launch Approvals", href: "/admin/launch-approvals" },
            ]}
          />
          <Eyebrow>Owner signoff</Eyebrow>
          <SectionHeading
            title="Launch approvals"
            description="This page keeps the final launch call tied to explicit owner signoff so deadline pressure does not replace accountability."
          />
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/launch-day-console"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open launch-day console
            </Link>
            <Link
              href="/admin/go-no-go"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open go / no-go
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-mist/68">Approved lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{approvals.approved}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Pending lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{approvals.pending}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked launch checks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{consoleSummary.blockedCount}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Launch-console status</p>
            <p className="mt-2 text-2xl font-semibold text-white">{consoleSummary.status}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Pending signoff lanes</h2>
          <div className="mt-5 grid gap-3">
            {blockedApprovalLanes.map((lane) => (
              <div key={lane} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {lane}
              </div>
            ))}
          </div>
        </GlowCard>

        <div className="grid gap-6">
          {approvals.approvals.map((approval) => (
            <GlowCard key={approval.owner}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-mist/60">{approval.owner}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{approval.lane}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{approval.detail}</p>
                </div>
                <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                  {approval.status}
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Owner urgency map</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {ownerUrgencies.map((item) => (
              <div key={item.lane} className="rounded-2xl border border-white/8 bg-black/15 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-white">{item.lane}</h3>
                  <span className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                    {item.priority}
                  </span>
                </div>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-mist/60">{item.owner}</p>
                <p className="mt-3 text-sm leading-7 text-mist/76">{item.summary}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <LaunchApprovalRevisionPanel items={approvals.approvals} />

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Launch approval registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                This registry combines owner approvals with urgency checkpoints so the final launch call can be exported
                and reviewed outside this page too.
              </p>
            </div>
            <Link
              href="/api/admin/launch-approval-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download CSV
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Registry rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.total}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Approved</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.approved}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Pending</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.pending}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Blocking</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.blocking}</p>
            </div>
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
