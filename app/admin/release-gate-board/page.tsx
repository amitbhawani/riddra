import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReleaseGateRevisionPanel } from "@/components/release-gate-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getReleaseGateBoard } from "@/lib/release-gate-board";

export const metadata: Metadata = {
  title: "Release Gate Board",
  description:
    "Protected release-gate board for launch scorecard, execution queue, public posture, and preflight checks in one final release view.",
};

export default async function AdminReleaseGateBoardPage() {
  await requireUser();

  const board = getReleaseGateBoard();
  const releaseGateItems = [
    {
      title: "Launch score and blocked checks",
      summary: `${board.scorecardPercentage}% score with ${board.blockedScorecardChecks} blocked scorecard checks.`,
    },
    {
      title: "Execution queue pressure",
      summary: `${board.readyQueueItems} queue items are ready while ${board.blockedQueueItems} remain blocked.`,
    },
    {
      title: "Public posture and visible scope",
      summary: `${board.launchVisible} launch-visible lanes remain in scope while ${board.postureBlockers} posture blockers still shape the launch call.`,
    },
    {
      title: "Preflight checklist coverage",
      summary: `${board.checklistGroups} checklist groups and ${board.criticalChecks} critical checks still define release discipline.`,
    },
    {
      title: "Evidence packet posture",
      summary: `${board.readyEvidenceLanes} evidence lanes are ready and ${board.blockedEvidenceLanes} are blocked out of ${board.evidenceLanes}.`,
    },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Release Gate Board", href: "/admin/release-gate-board" },
            ]}
          />
          <Eyebrow>Phase 22 release gate</Eyebrow>
          <SectionHeading
            title="Release gate board"
            description="This page compresses the final release read into one board so launch scorecard, execution queue, public posture, and preflight discipline can be reviewed together before promotion."
          />
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/launch-scorecard"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open launch scorecard
            </Link>
            <Link
              href="/admin/preflight-checklist"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open preflight checklist
            </Link>
            <Link
              href="/admin/launch-day-runbook"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open launch-day runbook
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-mist/68">Launch score</p>
            <p className="mt-2 text-3xl font-semibold text-white">{board.scorecardPercentage}%</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked scorecard checks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{board.blockedScorecardChecks}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Ready queue items</p>
            <p className="mt-2 text-3xl font-semibold text-white">{board.readyQueueItems}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked queue items</p>
            <p className="mt-2 text-3xl font-semibold text-white">{board.blockedQueueItems}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-mist/68">Launch-visible lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{board.launchVisible}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Posture blockers</p>
            <p className="mt-2 text-3xl font-semibold text-white">{board.postureBlockers}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Checklist groups</p>
            <p className="mt-2 text-3xl font-semibold text-white">{board.checklistGroups}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Critical checks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{board.criticalChecks}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Evidence lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{board.evidenceLanes}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Ready evidence lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{board.readyEvidenceLanes}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked evidence lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{board.blockedEvidenceLanes}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Launch evidence packet</h2>
              <p className="max-w-4xl text-sm leading-7 text-mist/74">
                This packet compresses the final launch proof stack across mobile, smoke, charts, placeholder honesty,
                reliability, launch-day sequencing, and announcement readiness so release gating stays grounded in one
                combined evidence layer.
              </p>
            </div>
            <Link
              href="/api/admin/launch-evidence-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download CSV
            </Link>
          </div>
          {board.blockingEvidenceLanes.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-3">
              {board.blockingEvidenceLanes.map((lane) => (
                <span
                  key={lane}
                  className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-amber-100"
                >
                  {lane} blocked
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm leading-7 text-mist/76">
              No evidence lanes are currently blocked, but in-progress lanes still need human verification before a
              broad-public push becomes trustworthy.
            </p>
          )}
        </GlowCard>

        <ReleaseGateRevisionPanel items={releaseGateItems} />
      </Container>
    </div>
  );
}
