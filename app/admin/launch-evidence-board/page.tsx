import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { LaunchEvidenceActionPanel } from "@/components/launch-evidence-action-panel";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getLaunchEvidenceActionMemory } from "@/lib/launch-evidence-action-memory-store";
import { getLaunchEvidenceBoard } from "@/lib/launch-evidence-board";

export const metadata: Metadata = {
  title: "Launch Evidence Board",
  description:
    "Protected launch-evidence-board page for the final proof layer across decisions, approvals, blockers, and release readiness.",
};

export default async function AdminLaunchEvidenceBoardPage() {
  await requireUser();

  const board = getLaunchEvidenceBoard();
  const evidenceMemory = await getLaunchEvidenceActionMemory();
  const readinessItems = [
    {
      label: "Launch mode recommendation",
      status:
        board.blockingDecisions > 0
          ? "Needs activation"
          : board.pendingApprovals > 0 || board.blockedEvidenceLanes > 0
            ? "Needs verification"
            : "Ready",
      detail: `Recommended mode: ${board.recommendedMode}. Blocking decisions: ${board.blockingDecisions}. Pending approvals: ${board.pendingApprovals}.`,
      routeTarget: "/admin/go-no-go",
    },
    ...board.blockedApprovalLanes.map((lane) => ({
      label: lane,
      status: "Needs activation",
      detail: "This approval lane is still blocked and needs explicit launch proof or owner signoff before broad public release.",
      routeTarget: "/admin/launch-approvals",
    })),
    ...board.blockingEvidenceLanes.map((lane) => ({
      label: lane,
      status: "Needs verification",
      detail: "This proof lane still needs fresh evidence capture before signoff can be treated as current.",
      routeTarget: "/admin/launch-signoff-packet",
    })),
    ...board.topActions.slice(0, 4).map((action) => ({
      label: action.title,
      status: "Needs verification",
      detail: action.detail,
      routeTarget: action.href,
    })),
  ];

  function actionTone(status: string) {
    if (status === "Captured") return "bg-bloom/12 text-bloom";
    if (status === "Working") return "bg-aqua/12 text-aqua";
    if (status === "Needs refresh") return "bg-flare/12 text-flare";
    return "bg-white/10 text-white";
  }

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Launch Evidence Board", href: "/admin/launch-evidence-board" },
            ]}
          />
          <Eyebrow>Phase 22 evidence layer</Eyebrow>
          <SectionHeading
            title="Launch evidence board"
            description="Use this page as the proof layer before a public decision. It compresses the recommended launch mode, pending approvals, blocked checks, and top actions into one evidence view."
          />
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/launch-signoff-packet"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open signoff packet
            </Link>
            <Link
              href="/admin/release-gate-board"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open release gate
            </Link>
            <Link
              href="/api/admin/launch-evidence-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download evidence CSV
            </Link>
            <Link
              href="/admin/launch-approvals"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open approvals
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-mist/68">Recommended mode</p>
            <p className="mt-2 text-3xl font-semibold text-white">{board.recommendedMode}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocking decisions</p>
            <p className="mt-2 text-3xl font-semibold text-white">{board.blockingDecisions}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Pending approvals</p>
            <p className="mt-2 text-3xl font-semibold text-white">{board.pendingApprovals}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Launch score</p>
            <p className="mt-2 text-3xl font-semibold text-white">{board.launchScore}%</p>
          </GlowCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked scorecard checks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{board.blockedScorecardChecks}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Launch blockers</p>
            <p className="mt-2 text-3xl font-semibold text-white">{board.blockerCount}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Open owners</p>
            <p className="mt-2 text-3xl font-semibold text-white">{board.openOwners}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-mist/68">Evidence lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{board.evidenceLanes}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Ready evidence</p>
            <p className="mt-2 text-3xl font-semibold text-white">{board.readyEvidenceLanes}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">In progress evidence</p>
            <p className="mt-2 text-3xl font-semibold text-white">{board.inProgressEvidenceLanes}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked evidence</p>
            <p className="mt-2 text-3xl font-semibold text-white">{board.blockedEvidenceLanes}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <GlowCard>
            <p className="text-sm text-mist/68">Captured proof</p>
            <p className="mt-2 text-3xl font-semibold text-white">{evidenceMemory.summary.captured}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Working lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{evidenceMemory.summary.working}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Needs refresh</p>
            <p className="mt-2 text-3xl font-semibold text-white">{evidenceMemory.summary.needsRefresh}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Assigned owners</p>
            <p className="mt-2 text-3xl font-semibold text-white">{evidenceMemory.summary.assigned}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Proof attached</p>
            <p className="mt-2 text-3xl font-semibold text-white">{evidenceMemory.summary.proofAttached}</p>
          </GlowCard>
        </div>

        {readinessItems.length > 0 ? (
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="launch evidence board lane"
            panelTitle="Write-through evidence-board action"
            panelDescription="Log top-level signoff and proof decisions into the shared revision lane so launch evidence governance lives in the same mutation history as the underlying desks."
            defaultRouteTarget="/admin/launch-evidence-board"
            defaultOperator="Launch Evidence Operator"
            defaultChangedFields="launch_mode, approval_lane, evidence_posture"
            actionNoun="launch-evidence mutation"
          />
        ) : null}

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Blocked approval lanes</h2>
          <div className="mt-5 grid gap-3">
            {board.blockedApprovalLanes.map((lane) => (
              <div key={lane} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {lane}
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Blocked evidence lanes</h2>
          <div className="mt-5 grid gap-3">
            {board.blockingEvidenceLanes.length > 0 ? (
              board.blockingEvidenceLanes.map((lane) => (
                <div key={lane} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                  {lane}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-bloom/20 bg-bloom/8 px-4 py-3 text-sm leading-7 text-bloom">
                No evidence lanes are currently blocked. The remaining work is verification depth inside the in-progress proof stack.
              </div>
            )}
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Evidence ownership and proof state</h2>
              <p className="max-w-4xl text-sm leading-7 text-mist/76">
                The summary above says whether a lane is structurally ready; this lane records whether someone has actually captured current proof, who owns it, and what still needs to happen before signoff.
              </p>
            </div>
            <Link
              href="/api/admin/launch-evidence-registry?format=json"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open evidence JSON
            </Link>
          </div>
          <div className="mt-5 grid gap-4">
            {evidenceMemory.items.map((item) => (
              <div
                key={item.id}
                className="rounded-[24px] border border-white/8 bg-black/15 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">{item.label}</h3>
                      <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/80">
                        {item.lane}
                      </span>
                      <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/80">
                        {item.status}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${actionTone(item.actionStatus)}`}
                      >
                        {item.actionStatus}
                      </span>
                    </div>
                    <p className="text-sm leading-7 text-mist/76">{item.note}</p>
                    <p className="text-sm text-white/82">
                      Owner:
                      <span className="ml-2 text-mist/72">
                        {item.owner || "Unassigned"}
                      </span>
                    </p>
                    <p className="text-sm leading-7 text-mist/76">
                      Proof:
                      <span className="ml-2">{item.proof || "No current proof attached yet."}</span>
                    </p>
                    <p className="text-sm leading-7 text-mist/76">
                      Next step:
                      <span className="ml-2">{item.nextStep}</span>
                    </p>
                    {item.operatorNote ? (
                      <p className="text-sm leading-7 text-mist/76">
                        Operator note:
                        <span className="ml-2">{item.operatorNote}</span>
                      </p>
                    ) : null}
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

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Top actions</h2>
          <div className="mt-5 grid gap-4">
            {board.topActions.map((action) => (
              <div
                key={`${action.title}-${action.href}`}
                className="flex flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-black/15 p-4 lg:flex-row lg:items-start lg:justify-between"
              >
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">{action.title}</h3>
                  <p className="text-sm leading-7 text-mist/74">{action.detail}</p>
                </div>
                <Link className="text-sm text-aqua underline-offset-4 hover:underline" href={action.href}>
                  Open action
                </Link>
              </div>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
