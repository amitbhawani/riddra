import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { LaunchEvidenceActionPanel } from "@/components/launch-evidence-action-panel";
import { LaunchPendingAuditActionPanel } from "@/components/launch-pending-audit-action-panel";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getLaunchEvidenceActionMemory } from "@/lib/launch-evidence-action-memory-store";
import { getLaunchPendingAuditActionMemory } from "@/lib/launch-pending-audit-action-memory-store";
import { getLaunchDayConsoleSummary } from "@/lib/launch-day-console";

export const metadata: Metadata = {
  title: "Launch Day Console",
  description:
    "Protected launch-day command center for the final auth, payment, support, provider, mobile, and broad-public go-live blockers.",
};

function tone(status: string) {
  if (status === "Ready") return "bg-bloom/12 text-bloom";
  if (status === "In progress") return "bg-flare/12 text-flare";
  if (status === "Deferred") return "bg-white/10 text-mist/80";
  return "bg-white/10 text-white";
}

export default async function AdminLaunchDayConsolePage() {
  await requireUser();

  const summary = getLaunchDayConsoleSummary();
  const pendingAuditMemory = await getLaunchPendingAuditActionMemory();
  const evidenceMemory = await getLaunchEvidenceActionMemory();
  const activeActionItems = pendingAuditMemory.items.filter(
    (item) => item.actionStatus !== "Closed",
  );
  const staleEvidenceItems = evidenceMemory.items.filter(
    (item) =>
      item.actionStatus !== "Captured" ||
      !item.proof.trim() ||
      !item.owner.trim(),
  );
  const readinessItems = [
    ...summary.lanes.map((lane) => ({
      label: lane.title,
      status: lane.status,
      detail: lane.topBlocker,
      routeTarget: lane.href,
    })),
    ...activeActionItems.slice(0, 4).map((item) => ({
      label: item.title,
      status: item.status === "Blocked" ? "Needs activation" : "Needs verification",
      detail: item.nextStep,
      routeTarget: item.href,
    })),
    ...staleEvidenceItems.slice(0, 4).map((item) => ({
      label: item.label,
      status: item.actionStatus === "Needs refresh" ? "Needs verification" : "Needs activation",
      detail: item.nextStep,
      routeTarget: item.href,
    })),
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Launch Day Console", href: "/admin/launch-day-console" },
            ]}
          />
          <Eyebrow>Phase 22 command center</Eyebrow>
          <SectionHeading
            title="Launch day console"
            description="Use this command center as the last-mile operator view. It compresses the provider, subscriber, conversion, trust, and QA lanes into one launch picture so the team can see what is still blocked before a broad signup push."
          />
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/external-activation-board"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open external activation board
            </Link>
            <Link
              href="/admin/launch-posture-board"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open launch posture board
            </Link>
            <Link
              href="/admin/release-gate-board"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open release gate board
            </Link>
            <Link
              href="/admin/launch-blocker-ledger"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open blocker ledger
            </Link>
            <Link
              href="/admin/launch-owner-inbox"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open owner inbox
            </Link>
            <Link
              href="/admin/launch-signoff-packet"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open signoff packet
            </Link>
            <Link
              href="/admin/launch-evidence-board"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open evidence board
            </Link>
            <Link
              href="/admin/external-prerequisites"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open external prerequisites
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <GlowCard>
            <p className="text-sm text-mist/68">Overall status</p>
            <div className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${tone(summary.status)}`}>
              {summary.status}
            </div>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Ready checks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{summary.readyCount}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">In progress checks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{summary.inProgressCount}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked checks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{summary.blockedCount}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Deferred checks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{summary.deferredCount}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <GlowCard>
            <p className="text-sm text-mist/68">Open backlog actions</p>
            <p className="mt-2 text-3xl font-semibold text-white">{pendingAuditMemory.summary.open}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Working now</p>
            <p className="mt-2 text-3xl font-semibold text-white">{pendingAuditMemory.summary.working}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Waiting</p>
            <p className="mt-2 text-3xl font-semibold text-white">{pendingAuditMemory.summary.waiting}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Closed</p>
            <p className="mt-2 text-3xl font-semibold text-white">{pendingAuditMemory.summary.closed}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Assigned owners</p>
            <p className="mt-2 text-3xl font-semibold text-white">{pendingAuditMemory.summary.assigned}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <GlowCard>
            <p className="text-sm text-mist/68">Captured evidence</p>
            <p className="mt-2 text-3xl font-semibold text-white">{evidenceMemory.summary.captured}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Evidence working</p>
            <p className="mt-2 text-3xl font-semibold text-white">{evidenceMemory.summary.working}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Needs refresh</p>
            <p className="mt-2 text-3xl font-semibold text-white">{evidenceMemory.summary.needsRefresh}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Proof attached</p>
            <p className="mt-2 text-3xl font-semibold text-white">{evidenceMemory.summary.proofAttached}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Stale evidence lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{staleEvidenceItems.length}</p>
          </GlowCard>
        </div>

        {readinessItems.length > 0 ? (
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="launch day console lane"
            panelTitle="Write-through launch-day action"
            panelDescription="Log launch-console decisions into the shared revision lane so this final command center stops acting like a read-only dashboard."
            defaultRouteTarget="/admin/launch-day-console"
            defaultOperator="Launch Day Console Operator"
            defaultChangedFields="launch_lane, backlog_action, evidence_posture"
            actionNoun="launch-day console mutation"
          />
        ) : null}

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Urgent blockers</h2>
          <div className="mt-5 grid gap-3">
            {summary.urgentBlockers.length > 0 ? (
              summary.urgentBlockers.map((blocker) => (
                <div key={blocker} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76">
                  {blocker}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-bloom/20 bg-bloom/8 px-4 py-4 text-sm leading-7 text-bloom">
                No urgent blockers remain inside the current launch console. The remaining work is verification and signoff.
              </div>
            )}
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Launch backlog action lane</h2>
              <p className="max-w-4xl text-sm leading-7 text-mist/76">
                This compresses the highest-priority non-closed backlog items into one launch-day lane with owner and next-step posture, so the team can work the cutover backlog instead of only reading it.
              </p>
            </div>
            <Link
              href="/admin/public-launch-backlog#top-100-pending-audit"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open full backlog
            </Link>
          </div>
          <div className="mt-5 grid gap-4">
            {activeActionItems.slice(0, 8).map((item) => (
              <div key={item.id} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                      <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/80">
                        {item.status}
                      </span>
                      <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/80">
                        {item.actionStatus}
                      </span>
                    </div>
                    <p className="text-sm leading-7 text-mist/76">{item.detail}</p>
                    <p className="text-sm text-white/82">
                      Owner:
                      <span className="ml-2 text-mist/72">
                        {item.owner || "Unassigned"}
                      </span>
                    </p>
                    <p className="text-sm leading-7 text-mist/76">
                      Next step:
                      <span className="ml-2">{item.nextStep}</span>
                    </p>
                  </div>
                  <Link
                    href={item.href}
                    className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
                  >
                    Open related surface
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <LaunchPendingAuditActionPanel items={pendingAuditMemory.items} />
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Evidence capture lane</h2>
              <p className="max-w-4xl text-sm leading-7 text-mist/76">
                The launch call still needs actual proof. This keeps the missing-or-stale evidence lanes visible from the command center so final signoff is based on fresh proof, not only status summaries.
              </p>
            </div>
            <Link
              href="/admin/launch-evidence-board"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open full evidence board
            </Link>
          </div>
          <div className="mt-5 grid gap-4">
            {staleEvidenceItems.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="rounded-[24px] border border-white/8 bg-black/15 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">{item.label}</h3>
                      <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/80">
                        {item.actionStatus}
                      </span>
                    </div>
                    <p className="text-sm leading-7 text-mist/76">{item.note}</p>
                    <p className="text-sm leading-7 text-mist/76">
                      Owner:
                      <span className="ml-2">{item.owner || "Unassigned"}</span>
                    </p>
                    <p className="text-sm leading-7 text-mist/76">
                      Next step:
                      <span className="ml-2">{item.nextStep}</span>
                    </p>
                  </div>
                  <Link
                    href={item.href}
                    className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
                  >
                    Open lane
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <LaunchEvidenceActionPanel items={evidenceMemory.items} />
          </div>
        </GlowCard>

        <div className="grid gap-6 xl:grid-cols-2">
          {summary.lanes.map((lane) => (
            <GlowCard key={lane.title}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-semibold text-white">{lane.title}</h2>
                    <div className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${tone(lane.status)}`}>
                      {lane.status}
                    </div>
                  </div>
                  <p className="text-sm leading-7 text-mist/76">{lane.description}</p>
                  <p className="text-sm text-white/88">
                    Top blocker:
                    <span className="ml-2 text-mist/72">{lane.topBlocker}</span>
                  </p>
                </div>
                <Link
                  href={lane.href}
                  className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
                >
                  Open lane
                </Link>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <p className="text-sm text-mist/68">Ready</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{lane.readyCount}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <p className="text-sm text-mist/68">In progress</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{lane.inProgressCount}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <p className="text-sm text-mist/68">Blocked</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{lane.blockedCount}</p>
                </div>
              </div>
            </GlowCard>
          ))}
        </div>
      </Container>
    </div>
  );
}
