import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getPhaseExecutionLanes } from "@/lib/phase-execution-board";

export const metadata: Metadata = {
  title: "Phase Execution Board",
  description:
    "Protected execution board for Phases 17 to 20 across live data, canonical coverage, subscriber truth, and public launch QA.",
};

function statusClasses(status: string) {
  if (status === "Ready") return "bg-aurora/14 text-aurora";
  if (status === "In progress") return "bg-flare/14 text-flare";
  return "bg-bloom/14 text-bloom";
}

export default async function PhaseExecutionBoardPage() {
  await requireAdmin();

  const lanes = getPhaseExecutionLanes();
  const readinessItems = lanes.flatMap((lane) =>
    lane.topItems.map((item) => ({
      label: `${lane.phase} · ${item.title}`,
      status:
        item.status === "Ready"
          ? "Ready"
          : item.status === "In progress"
            ? "Needs verification"
            : "Needs activation",
      detail: item.detail,
      routeTarget: item.href,
    })),
  );

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Phase Execution Board", href: "/admin/phase-execution-board" },
            ]}
          />
          <Eyebrow>Phases 17 to 20</Eyebrow>
          <SectionHeading
            title="Execution board"
            description="This is the practical launch stack for the still-open build phases. It keeps live data, coverage scale, subscriber truth, and launch QA visible together so progress is easier to run and harder to fake."
          />
        </div>

        <GlowCard>
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="phase execution lane"
            panelTitle="Write-through execution-board action"
            panelDescription="Log phase-level execution changes into the shared revision lane so the launch stack stops living only as a summary board."
            defaultRouteTarget="/admin/phase-execution-board"
            defaultOperator="Phase Execution Operator"
            defaultChangedFields="phase_lane, execution_status, blocker_posture"
            actionNoun="phase-execution mutation"
          />
        </GlowCard>

        <div className="grid gap-6 xl:grid-cols-2">
          {lanes.map((lane) => (
            <GlowCard key={lane.phase} className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-mist/68">{lane.phase}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{lane.title}</h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-mist/82">
                  {lane.progressLabel}
                </span>
              </div>

              <p className="text-sm leading-7 text-mist/74">{lane.summary}</p>

              <div className="grid gap-3 sm:grid-cols-3">
                {lane.metrics.map((metric) => (
                  <div key={metric} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/76">
                    {metric}
                  </div>
                ))}
              </div>

              <div className="grid gap-4">
                {lane.topItems.map((item) => (
                  <div key={`${lane.phase}-${item.title}`} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-base font-semibold text-white">{item.title}</h3>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${statusClasses(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-sm leading-7 text-mist/74">{item.detail}</p>
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

              <Link
                href={lane.href}
                className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
              >
                Open {lane.phase} workstream
              </Link>
            </GlowCard>
          ))}
        </div>
      </Container>
    </div>
  );
}
