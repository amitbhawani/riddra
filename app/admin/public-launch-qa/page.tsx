import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getChartVerificationSummary } from "@/lib/chart-verification-registry";
import { getLaunchDayRunbookRegistrySummary } from "@/lib/launch-day-runbook-registry";
import { getLaunchEvidenceRegistrySummary } from "@/lib/launch-evidence-registry";
import { getLiveSmokeTestRegistrySummary } from "@/lib/live-smoke-tests";
import { getMobileQaRegistrySummary } from "@/lib/mobile-qa-registry";
import { getPlaceholderHonestySummary } from "@/lib/placeholder-honesty-registry";
import { getPublicLaunchQaItems, publicLaunchQaRules } from "@/lib/public-launch-qa";
import { getPublicLaunchQaRegistrySummary } from "@/lib/public-launch-qa-registry";
import { getReliabilityOpsRegistrySummary } from "@/lib/reliability-ops-registry";

export const metadata: Metadata = {
  title: "Public Launch QA",
  description:
    "Protected Phase 20 launch-QA page for mobile quality, smoke tests, incident drills, and final broad-public announcement readiness.",
};

export default async function AdminPublicLaunchQaPage() {
  await requireUser();

  const items = getPublicLaunchQaItems();
  const readinessItems = items.map((item) => ({
    label: item.title,
    status: item.status,
    detail: item.note,
    routeTarget: item.href,
  }));
  const registrySummary = getPublicLaunchQaRegistrySummary();
  const chartSummary = getChartVerificationSummary();
  const evidenceSummary = getLaunchEvidenceRegistrySummary();
  const runbookSummary = getLaunchDayRunbookRegistrySummary();
  const smokeSummary = getLiveSmokeTestRegistrySummary();
  const mobileSummary = getMobileQaRegistrySummary();
  const placeholderSummary = getPlaceholderHonestySummary();
  const reliabilitySummary = getReliabilityOpsRegistrySummary();

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Public Launch QA", href: "/admin/public-launch-qa" },
            ]}
          />
          <Eyebrow>Phase 20 consolidation</Eyebrow>
          <SectionHeading
            title="Public launch QA"
            description="This is the final broad-public launch desk. It brings together mobile quality, smoke tests, incident drills, launch messaging, and final go / no-go discipline in one place."
          />
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/launch-rehearsal-packet"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open rehearsal packet
            </Link>
            <Link
              href="/api/admin/launch-rehearsal-packet"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download rehearsal CSV
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Ready</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {items.filter((item) => item.status === "Ready").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">In progress</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {items.filter((item) => item.status === "In progress").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {items.filter((item) => item.status === "Blocked").length}
            </p>
          </GlowCard>
        </div>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Launch rehearsal packet</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                This packet is the build-complete handoff for Phase 20. The QA registries, evidence lanes, and
                launch-day boards are built; what remains is config completion plus one deliberate human rehearsal.
              </p>
            </div>
            <Link
              href="/admin/launch-rehearsal-packet"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open packet
            </Link>
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Broad-public launch checklist</h2>
          <div className="mt-5">
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="public launch QA check"
              panelTitle="Write-through launch QA action"
              panelDescription="Log launch-QA changes into the shared revision lane so final rehearsal posture stops living only as a static broad-public checklist."
              defaultRouteTarget="/admin/public-launch-qa"
              defaultOperator="Public Launch QA Operator"
              defaultChangedFields="qa_lane, launch_proof, rehearsal_state"
              actionNoun="public-launch-qa mutation"
            />
          </div>
          <div className="mt-5 grid gap-4">
            {items.map((item) => (
              <div key={item.title} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-base font-semibold text-white">{item.title}</h3>
                      <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                        {item.status}
                      </span>
                    </div>
                    <p className="text-sm leading-7 text-mist/74">{item.note}</p>
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
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Launch evidence packet</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                This packet compresses mobile, smoke, chart, placeholder, reliability, launch-day, and announcement
                proof into one exportable Phase 20 surface so the final launch call does not depend on hunting across
                multiple admin desks.
              </p>
            </div>
            <Link
              href="/api/admin/launch-evidence-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download CSV
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Evidence lanes</p>
              <p className="mt-2 text-2xl font-semibold text-white">{evidenceSummary.total}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Ready</p>
              <p className="mt-2 text-2xl font-semibold text-white">{evidenceSummary.ready}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">In progress</p>
              <p className="mt-2 text-2xl font-semibold text-white">{evidenceSummary.inProgress}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Blocked lanes</p>
              <p className="mt-2 text-2xl font-semibold text-white">{evidenceSummary.blocked}</p>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Launch QA registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                This registry merges the broad-public QA checklist with the mobile QA matrix, so Phase 20 now has one
                portable audit layer for launch safety instead of splitting that truth across separate pages.
              </p>
            </div>
            <Link
              href="/api/admin/public-launch-qa-registry"
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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Mobile QA registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                The mobile pass is now route-level and exportable, so compact-screen review across public discovery,
                auth, research, and workspace flows can be tracked like the rest of Phase 20.
              </p>
            </div>
            <Link
              href="/api/admin/mobile-qa-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download CSV
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-5">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Registry rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{mobileSummary.total}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Routes</p>
              <p className="mt-2 text-2xl font-semibold text-white">{mobileSummary.routes}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Ready</p>
              <p className="mt-2 text-2xl font-semibold text-white">{mobileSummary.ready}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">In progress</p>
              <p className="mt-2 text-2xl font-semibold text-white">{mobileSummary.inProgress}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Blocked</p>
              <p className="mt-2 text-2xl font-semibold text-white">{mobileSummary.blocked}</p>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Launch-day registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                This lane keeps the same-day launch sequence exportable, so checkpoints, active queue items, and
                fallback actions are reviewed alongside mobile, smoke, chart, and reliability truth.
              </p>
            </div>
            <Link
              href="/api/admin/launch-day-runbook-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download CSV
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Registry rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{runbookSummary.total}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Ready</p>
              <p className="mt-2 text-2xl font-semibold text-white">{runbookSummary.ready}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">In progress</p>
              <p className="mt-2 text-2xl font-semibold text-white">{runbookSummary.inProgress}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Blocked</p>
              <p className="mt-2 text-2xl font-semibold text-white">{runbookSummary.blocked}</p>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Smoke-test registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                This registry turns the broad-public smoke pass into explicit public, auth, billing, support, and
                operator route sequences, so Phase 20 can be reviewed as a real rehearsal lane instead of one vague
                checklist item.
              </p>
            </div>
            <Link
              href="/api/admin/smoke-test-journeys"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download CSV
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Journeys</p>
              <p className="mt-2 text-2xl font-semibold text-white">{smokeSummary.journeys}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Journey steps</p>
              <p className="mt-2 text-2xl font-semibold text-white">{smokeSummary.totalSteps}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Ready journeys</p>
              <p className="mt-2 text-2xl font-semibold text-white">{smokeSummary.readyJourneys}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Blocked journeys</p>
              <p className="mt-2 text-2xl font-semibold text-white">{smokeSummary.blockedJourneys}</p>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Chart verification registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                This registry isolates the chart-backed public routes that still need visual verification, so Sensex,
                the homepage grid, markets, NSE index pages, stock-chart routes, and fund proxies can be reviewed as
                one launch-risk lane instead of scattered chart anecdotes.
              </p>
            </div>
            <Link
              href="/api/admin/chart-verification-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download CSV
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Registry rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{chartSummary.total}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Ready</p>
              <p className="mt-2 text-2xl font-semibold text-white">{chartSummary.ready}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">In progress</p>
              <p className="mt-2 text-2xl font-semibold text-white">{chartSummary.inProgress}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Blocked</p>
              <p className="mt-2 text-2xl font-semibold text-white">{chartSummary.blocked}</p>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Reliability registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                This registry keeps incident response, recovery readiness, and rollback scenarios visible as one
                launch-risk lane, so the drill and rollback posture are reviewed alongside smoke, chart, and
                placeholder trust.
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
              <p className="mt-2 text-2xl font-semibold text-white">{reliabilitySummary.total}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Ready</p>
              <p className="mt-2 text-2xl font-semibold text-white">{reliabilitySummary.ready}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">In progress</p>
              <p className="mt-2 text-2xl font-semibold text-white">{reliabilitySummary.inProgress}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Blocked</p>
              <p className="mt-2 text-2xl font-semibold text-white">{reliabilitySummary.blocked}</p>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Placeholder honesty registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                This registry isolates routes that still look more live than they really are, so Phase 20 can review
                fake-looking or preview-backed states as one deliberate trust problem instead of rediscovering them
                page by page.
              </p>
            </div>
            <Link
              href="/api/admin/placeholder-honesty-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download CSV
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Registry rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{placeholderSummary.total}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Ready</p>
              <p className="mt-2 text-2xl font-semibold text-white">{placeholderSummary.ready}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">In progress</p>
              <p className="mt-2 text-2xl font-semibold text-white">{placeholderSummary.inProgress}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Blocked</p>
              <p className="mt-2 text-2xl font-semibold text-white">{placeholderSummary.blocked}</p>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">QA rules</h2>
          <div className="mt-5 grid gap-3">
            {publicLaunchQaRules.map((rule) => (
              <div
                key={rule}
                className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76"
              >
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
