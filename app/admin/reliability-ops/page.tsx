import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { reliabilityOpsItems, reliabilityOpsRules, reliabilityOpsSummary } from "@/lib/reliability-ops";
import { getReliabilityOpsRegistrySummary } from "@/lib/reliability-ops-registry";

export const metadata: Metadata = {
  title: "Reliability Ops",
  description: "Protected reliability-ops page for release QA, observability, recovery planning, and production confidence.",
};

export default async function AdminReliabilityOpsPage() {
  await requireUser();
  const registrySummary = getReliabilityOpsRegistrySummary();
  const readinessItems = reliabilityOpsItems.map((item) => ({
    label: item.title,
    status: item.status === "In progress" ? "Needs verification" : "Queued",
    detail: item.summary,
    routeTarget:
      item.title === "Release QA and regression checks"
        ? "/admin/release-checks"
        : item.title === "Observability and failure visibility"
          ? "/admin/observability"
          : item.title === "Caching and revalidation discipline"
            ? "/admin/cache-discipline"
            : item.title === "Security and operator access control"
              ? "/admin/access-governance"
              : item.title === "Backup and recovery readiness"
                ? "/admin/recovery-readiness"
                : "/admin/performance-qa",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Admin", href: "/admin" }, { name: "Reliability Ops", href: "/admin/reliability-ops" }]} />
          <Eyebrow>Production confidence</Eyebrow>
          <SectionHeading
            title="Reliability ops"
            description="This page tracks the missing production layer: release QA, observability, recovery planning, security discipline, and performance-aware launch confidence."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Control areas</p>
            <p className="mt-2 text-3xl font-semibold text-white">{reliabilityOpsSummary.controlAreas}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Launch checks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{reliabilityOpsSummary.launchChecks}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Queued monitors</p>
            <p className="mt-2 text-3xl font-semibold text-white">{reliabilityOpsSummary.queuedMonitors}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="reliability ops lane"
              panelTitle="Write-through reliability-ops action"
              panelDescription="Log release-confidence and recovery changes into the shared revision lane so reliability posture stops living only as a checklist."
              defaultRouteTarget="/admin/reliability-ops"
              defaultOperator="Reliability Ops Operator"
              defaultChangedFields="control_state, recovery_posture, launch_risk"
              actionNoun="reliability-ops mutation"
            />
          </GlowCard>
          {reliabilityOpsItems.map((item) => (
            <GlowCard key={item.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{item.summary}</p>
                </div>
                <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                  {item.status}
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Reliability registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                This registry combines reliability controls, incident lanes, recovery readiness, and rollback
                scenarios so Phase 20 can audit launch-day resilience outside this page too.
              </p>
            </div>
            <Link
              href="/api/admin/reliability-ops-registry"
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
              <p className="text-sm text-mist/68">Ready</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.ready}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">In progress</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.inProgress}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Blocked</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.blocked}</p>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Reliability rules</h2>
          <div className="mt-5 grid gap-3">
            {reliabilityOpsRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
