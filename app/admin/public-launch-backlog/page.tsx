import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { LaunchPendingAuditActionPanel } from "@/components/launch-pending-audit-action-panel";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { buildTrackerPhases, currentFocus } from "@/lib/build-tracker";
import {
  getLaunchPendingAuditActionMemory,
} from "@/lib/launch-pending-audit-action-memory-store";

export const metadata: Metadata = {
  title: "Public Launch Backlog",
  description:
    "Protected launch backlog page for the post-Phase-16 work that still stands between public beta and a broad signup push.",
};

function statusTone(status: string) {
  if (status === "In progress") return "bg-flare/12 text-flare";
  if (status === "Next") return "bg-white/10 text-white";
  if (status === "Queued") return "bg-white/10 text-white";
  return "bg-bloom/12 text-bloom";
}

export default async function AdminPublicLaunchBacklogPage() {
  await requireUser();

  const backlogPhases = buildTrackerPhases.filter((phase) => {
    const numericPhase = Number.parseInt(phase.phase.replace("Phase ", ""), 10);
    return Number.isFinite(numericPhase) && numericPhase >= 17;
  });

  const actionableCount = backlogPhases.reduce(
    (sum, phase) => sum + phase.items.filter((item) => item.status !== "Planned").length,
    0,
  );

  const plannedCount = backlogPhases.reduce(
    (sum, phase) => sum + phase.items.filter((item) => item.status === "Planned").length,
    0,
  );
  const pendingAuditMemory = await getLaunchPendingAuditActionMemory();
  const pendingAuditSummary = pendingAuditMemory.summary;
  const pendingAuditGroups = pendingAuditMemory.groups;
  const readinessItems = pendingAuditMemory.items.slice(0, 12).map((item) => ({
    label: item.title,
    status:
      item.status === "Blocked"
        ? "Needs activation"
        : item.status === "Queued"
          ? "Queued"
          : "Needs verification",
    detail: item.detail,
    routeTarget: item.href,
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Public Launch Backlog", href: "/admin/public-launch-backlog" },
            ]}
          />
          <Eyebrow>Execution backlog</Eyebrow>
          <SectionHeading
            title="Public launch backlog"
            description="Phases 13 to 16 closed the build-side roadmap, but they did not mean broad public launch was truly done. This page keeps the remaining live-data, coverage, billing, support, and launch-QA work visible as the next real execution phases."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Backlog phases</p>
            <p className="mt-2 text-3xl font-semibold text-white">{backlogPhases.length}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Actionable now</p>
            <p className="mt-2 text-3xl font-semibold text-white">{actionableCount}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Planned later</p>
            <p className="mt-2 text-3xl font-semibold text-white">{plannedCount}</p>
          </GlowCard>
        </div>

        <div id="top-100-pending-audit">
          <GlowCard>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <SectionHeading
                title="Current pending fixes audit"
                description="This is the consolidated private-beta activation audit. It now focuses on the distinct blockers that are still open right now instead of mixing in deferred billing, future mobile or traffic work, replay ideas, and broad-public launch rehearsal."
              />
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/build-tracker#top-100-pending-fixes"
                  className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
                >
                  Open tracker summary
                </Link>
                <a
                  href="/api/admin/launch-pending-audit"
                  className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
                >
                  Open JSON export
                </a>
                <a
                  href="/api/admin/launch-pending-audit?format=csv"
                  className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
                >
                  Download CSV
                </a>
              </div>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
              <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <p className="text-sm text-mist/68">Audited items</p>
                <p className="mt-2 text-3xl font-semibold text-white">{pendingAuditSummary.total}</p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <p className="text-sm text-mist/68">Blocked now</p>
                <p className="mt-2 text-3xl font-semibold text-white">{pendingAuditSummary.blocked}</p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <p className="text-sm text-mist/68">In progress</p>
                <p className="mt-2 text-3xl font-semibold text-white">{pendingAuditSummary.inProgress}</p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <p className="text-sm text-mist/68">Queued</p>
                <p className="mt-2 text-3xl font-semibold text-white">{pendingAuditSummary.queued}</p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <p className="text-sm text-mist/68">Viewer-facing</p>
                <p className="mt-2 text-3xl font-semibold text-white">{pendingAuditSummary.viewer}</p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <p className="text-sm text-mist/68">Developer or ops</p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {pendingAuditSummary.developer + pendingAuditSummary.operator}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-5">
              <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <p className="text-sm text-mist/68">Open actions</p>
                <p className="mt-2 text-3xl font-semibold text-white">{pendingAuditSummary.open}</p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <p className="text-sm text-mist/68">Working now</p>
                <p className="mt-2 text-3xl font-semibold text-white">{pendingAuditSummary.working}</p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <p className="text-sm text-mist/68">Waiting</p>
                <p className="mt-2 text-3xl font-semibold text-white">{pendingAuditSummary.waiting}</p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <p className="text-sm text-mist/68">Closed</p>
                <p className="mt-2 text-3xl font-semibold text-white">{pendingAuditSummary.closed}</p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <p className="text-sm text-mist/68">Assigned owners</p>
                <p className="mt-2 text-3xl font-semibold text-white">{pendingAuditSummary.assigned}</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4">
              {pendingAuditGroups.map((group) => (
                <details
                  key={`${group.perspective}-${group.lane}`}
                  open
                  className="rounded-[24px] border border-white/8 bg-black/15 p-5"
                >
                  <summary className="list-none cursor-pointer">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-mist/68">{group.perspective}</p>
                        <h3 className="mt-2 text-xl font-semibold text-white">{group.lane}</h3>
                      </div>
                      <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/80">
                        {group.items.length} items
                      </span>
                    </div>
                  </summary>
                  <div className="mt-5 grid gap-4">
                    {group.items.map((auditItem) => (
                      <div
                        key={auditItem.id}
                        className="rounded-[24px] border border-white/8 bg-black/20 p-5"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-3">
                              <h4 className="text-lg font-semibold text-white">{auditItem.title}</h4>
                              <div
                                className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${statusTone(auditItem.status)}`}
                              >
                                {auditItem.status}
                              </div>
                              {"actionStatus" in auditItem ? (
                                <div className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/80">
                                  {auditItem.actionStatus}
                                </div>
                              ) : null}
                            </div>
                            <p className="text-sm leading-7 text-mist/76">{auditItem.detail}</p>
                            {"owner" in auditItem && auditItem.owner ? (
                              <p className="text-sm text-white/82">
                                Owner:
                                <span className="ml-2 text-mist/72">{auditItem.owner}</span>
                              </p>
                            ) : null}
                            {"nextStep" in auditItem ? (
                              <p className="text-sm leading-7 text-mist/76">
                                Next step:
                                <span className="ml-2">{auditItem.nextStep}</span>
                              </p>
                            ) : null}
                            {"note" in auditItem && auditItem.note ? (
                              <p className="text-sm leading-7 text-mist/76">
                                Operator note:
                                <span className="ml-2">{auditItem.note}</span>
                              </p>
                            ) : null}
                            <p className="text-xs uppercase tracking-[0.14em] text-mist/52">
                              Source: {auditItem.source}
                            </p>
                          </div>
                          <Link
                            href={auditItem.href}
                            className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
                          >
                            Open related surface
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
            <div className="mt-6">
              <LaunchPendingAuditActionPanel items={pendingAuditMemory.items} />
            </div>
          </GlowCard>
        </div>

        {readinessItems.length > 0 ? (
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="public launch backlog lane"
            panelTitle="Write-through backlog action"
            panelDescription="Log backlog decisions into the shared revision lane so the remaining launch work can be updated from the backlog board itself instead of only through downstream desks."
            defaultRouteTarget="/admin/public-launch-backlog"
            defaultOperator="Public Launch Backlog Operator"
            defaultChangedFields="backlog_lane, launch_blocker, execution_posture"
            actionNoun="public-launch backlog mutation"
          />
        ) : null}

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Current focus</h2>
          <div className="mt-5 grid gap-3">
            {currentFocus.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76"
              >
                {item}
              </div>
            ))}
          </div>
        </GlowCard>

        <div className="grid gap-6">
          {backlogPhases.map((phase) => (
            <GlowCard key={phase.phase}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-semibold text-white">{phase.phase}</h2>
                    <div className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${statusTone(phase.status)}`}>
                      {phase.status}
                    </div>
                    <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/78">
                      {phase.progressLabel}
                    </div>
                  </div>
                  <p className="max-w-4xl text-sm leading-7 text-mist/74">{phase.objective}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                {phase.items.map((item) => (
                  <div key={item.title} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                          <div className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${statusTone(item.status)}`}>
                            {item.status}
                          </div>
                        </div>
                        <p className="max-w-4xl text-sm leading-7 text-mist/76">{item.summary}</p>
                      </div>
                      {item.href ? (
                        <Link
                          href={item.href}
                          className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
                        >
                          Open related surface
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </GlowCard>
          ))}
        </div>
      </Container>
    </div>
  );
}
