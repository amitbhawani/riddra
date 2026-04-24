import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import {
  nextTwoHoursPending,
  privateBetaReadinessSections,
  publicLaunchReadinessSections,
} from "@/lib/build-tracker";
import { getBuildTrackerProgressMemory } from "@/lib/build-tracker-progress-store";
import { getLaunchCutoverChecklistMemory } from "@/lib/launch-cutover-checklist-memory-store";
import { getLaunchPendingAuditActionMemory } from "@/lib/launch-pending-audit-action-memory-store";
import { getLocalDevRuntimeSnapshot } from "@/lib/local-dev-runtime";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Private Beta Tracker",
  description: "Pending-first private-beta tracker for current Riddra readiness and next operator actions.",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

function pendingStatusClasses(status: string) {
  if (status === "Blocked") return "bg-bloom/14 text-bloom";
  if (status === "In progress") return "bg-flare/14 text-flare";
  if (status === "Queued") return "bg-white/10 text-white";
  if (status === "Working") return "bg-flare/14 text-flare";
  if (status === "Waiting") return "bg-white/10 text-white";
  if (status === "Closed") return "bg-aurora/14 text-aurora";
  return "bg-white/10 text-white";
}

function localRuntimeStatusClasses(status: string) {
  if (status === "running" || status === "healthy") return "bg-aurora/14 text-aurora";
  if (status === "starting" || status === "stopping") return "bg-flare/14 text-flare";
  if (status === "failed") return "bg-bloom/14 text-bloom";
  return "bg-white/10 text-white";
}

export default async function BuildTrackerPage() {
  await requireAdmin();

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Private Beta Tracker", href: "/build-tracker" },
  ];

  const launchCutoverChecklistMemory = await getLaunchCutoverChecklistMemory();
  const { snapshot: realProjectProgress } =
    await getBuildTrackerProgressMemory({ launchCutoverChecklistMemory });
  const pendingAuditMemory = await getLaunchPendingAuditActionMemory();
  const pendingAuditSummary = pendingAuditMemory.summary;
  const localDevRuntime = await getLocalDevRuntimeSnapshot();

  const readyPrivateBetaLanes = privateBetaReadinessSections.filter((item) => item.status === "Ready");
  const deferredLaterLanes = publicLaunchReadinessSections.filter((item) => item.status === "Deferred");
  const activePendingGroups = pendingAuditMemory.groups.filter((group) => group.items.length > 0);
  const immediatePendingItems = pendingAuditMemory.items.slice(0, 8);
  const showActivePending = pendingAuditSummary.total > 0;

  return (
    <div className="py-16 sm:py-24">
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <JsonLd
        data={buildWebPageSchema({
          title: "Private Beta Tracker",
          description: "Pending-first private-beta tracker for current Riddra readiness and next operator actions.",
          path: "/build-tracker",
        })}
      />
      <Container className="space-y-8">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Private beta phase</Eyebrow>
          <SectionHeading
            title="Riddra private beta tracker"
            description="This page now shows only real pending work in the main view. Proven lanes and deferred later work stay hidden under one collapsed section."
          />
        </div>

        <GlowCard>
          <SectionHeading
            title="Private Beta Snapshot"
            description="This is the short, live status view for private beta. If there is nothing pending, the page should feel short and finished."
          />
          <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Overall private-beta progress</p>
              <p className="mt-2 text-5xl font-semibold text-white">{realProjectProgress.totalPercent}%</p>
              <p className="mt-4 text-sm leading-7 text-mist/74">{realProjectProgress.summary}</p>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-aqua via-aurora to-flare"
                  style={{ width: `${realProjectProgress.totalPercent}%` }}
                />
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-mist/52">Pending now</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{pendingAuditSummary.total}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-mist/52">Proven beta lanes</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{readyPrivateBetaLanes.length}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-mist/52">Deferred later lanes</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{deferredLaterLanes.length}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-mist/52">Last updated</p>
                  <p className="mt-2 text-lg font-semibold text-white">{realProjectProgress.updatedAt}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-mist/68">Local runtime</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{localDevRuntime.url ?? "Not recorded yet"}</h3>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${localRuntimeStatusClasses(localDevRuntime.status)}`}
                >
                  {localDevRuntime.status}
                </span>
              </div>
              <p className="mt-4 text-sm leading-7 text-mist/74">{localDevRuntime.note}</p>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-mist/52">Guard PID</p>
                  <p className="mt-2 text-lg font-semibold text-white">{localDevRuntime.pid ?? "Not recorded"}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-mist/52">Last healthcheck</p>
                  <p className="mt-2 text-lg font-semibold text-white">{localDevRuntime.lastHealthcheckAt ?? "Not recorded"}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {(localDevRuntime.routes.length > 0 ? localDevRuntime.routes : []).map((item) => (
                  <div key={`${item.route}-${item.status}`} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{item.route}</p>
                        <p className="text-xs leading-6 text-mist/58">{item.url}</p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                          item.status === "200" ? "bg-aurora/14 text-aurora" : "bg-bloom/14 text-bloom"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </GlowCard>

        {showActivePending ? (
          <>
            {nextTwoHoursPending.length > 0 ? (
              <GlowCard>
                <SectionHeading
                  title="Pending Right Now"
                  description="This is the shortest real list of what still needs attention next."
                />
                <div className="mt-6 grid gap-4 xl:grid-cols-2">
                  {nextTwoHoursPending.map((item, index) => (
                    <div key={item.title} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                      <p className="text-xs uppercase tracking-[0.16em] text-mist/52">Next action {index + 1}</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">{item.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-mist/74">{item.detail}</p>
                      <Link
                        href={item.href}
                        className="mt-5 inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
                      >
                        Open next action
                      </Link>
                    </div>
                  ))}
                </div>
              </GlowCard>
            ) : null}

            {immediatePendingItems.length > 0 ? (
              <GlowCard>
                <SectionHeading
                  title="Immediate Blockers"
                  description="Only the live pending items stay here. Completed and deferred work is hidden below."
                />
                <div className="mt-6 grid gap-4 xl:grid-cols-2">
                  {immediatePendingItems.map((item) => (
                    <div key={item.id} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-mist/68">{item.lane}</p>
                          <h3 className="mt-2 text-lg font-semibold text-white">{item.title}</h3>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${pendingStatusClasses(item.status)}`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-mist/74">{item.detail}</p>
                      <p className="mt-3 text-xs leading-6 text-mist/58">{item.nextStep}</p>
                      <Link
                        href={item.href}
                        className="mt-5 inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
                      >
                        Open blocker lane
                      </Link>
                    </div>
                  ))}
                </div>
              </GlowCard>
            ) : null}

            {activePendingGroups.length > 0 ? (
              <GlowCard>
                <SectionHeading
                  title="Current Pending Fixes"
                  description="This is the full live pending board, grouped by lane. Nothing completed is shown here."
                />
                <div className="mt-6 grid gap-4 lg:grid-cols-4">
                  <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                    <p className="text-sm text-mist/68">Audited items</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{pendingAuditSummary.total}</p>
                  </div>
                  <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                    <p className="text-sm text-mist/68">Blocked</p>
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
                </div>
                <div className="mt-6 grid gap-4 xl:grid-cols-2">
                  {activePendingGroups.map((group) => (
                    <div key={`${group.lane}-${group.perspective}`} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-semibold text-white">{group.lane}</h3>
                          <p className="mt-2 text-sm leading-7 text-mist/74">{group.perspective} lane</p>
                        </div>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                          {group.items.length} open
                        </span>
                      </div>
                      <div className="mt-5 space-y-3">
                        {group.items.map((item) => (
                          <div key={item.id} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-white">{item.title}</p>
                              <span
                                className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${pendingStatusClasses(item.status)}`}
                              >
                                {item.status}
                              </span>
                            </div>
                            <p className="mt-3 text-sm leading-7 text-mist/74">{item.detail}</p>
                            <p className="mt-3 text-xs leading-6 text-mist/58">{item.nextStep}</p>
                            <Link
                              href={item.href}
                              className="mt-4 inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
                            >
                              Open lane
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </GlowCard>
            ) : null}
          </>
        ) : (
          <GlowCard>
            <SectionHeading
              title="Pending Right Now"
              description="There is no live pending item on the current private-beta board."
            />
            <div className="mt-6 rounded-[24px] border border-aurora/20 bg-aurora/[0.04] p-6">
              <h3 className="text-2xl font-semibold text-white">No active pending items</h3>
              <p className="mt-3 text-sm leading-7 text-mist/74">
                The main view is intentionally short because the live pending audit is empty. Completed and deferred lanes are hidden below so the page stays usable.
              </p>
            </div>
          </GlowCard>
        )}

        <details className="rounded-[28px] border border-white/8 bg-black/15 p-6">
          <summary className="cursor-pointer list-none">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-white">Completed and deferred</h2>
                <p className="mt-2 text-sm leading-7 text-mist/74">
                  Open this only if you want the hidden proven lanes and later deferred work.
                </p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                Hidden by default
              </span>
            </div>
          </summary>
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <div className="rounded-[24px] border border-white/8 bg-black/20 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xl font-semibold text-white">Proven beta lanes</h3>
                <span className="rounded-full bg-aurora/14 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-aurora">
                  {readyPrivateBetaLanes.length} ready
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {readyPrivateBetaLanes.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <span className="rounded-full bg-aurora/14 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-aurora">
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-mist/74">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-black/20 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xl font-semibold text-white">Deferred later lanes</h3>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                  {deferredLaterLanes.length} deferred
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {deferredLaterLanes.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-mist/74">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </details>
      </Container>
    </div>
  );
}
