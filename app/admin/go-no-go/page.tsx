import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { GoNoGoRevisionPanel } from "@/components/go-no-go-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getGoNoGoSummary } from "@/lib/go-no-go";
import { getLaunchDecisionRegistrySummary } from "@/lib/launch-decision-registry";
import { getLaunchEvidenceRegistrySummary } from "@/lib/launch-evidence-registry";

export const metadata: Metadata = {
  title: "Go / No-Go",
  description:
    "Protected launch decision page that summarizes whether the platform should stay internal, remain in launch prep, enter public beta, or move to full launch.",
};

export default async function AdminGoNoGoPage() {
  await requireUser();

  const summary = getGoNoGoSummary();
  const evidenceSummary = getLaunchEvidenceRegistrySummary();
  const registrySummary = getLaunchDecisionRegistrySummary();

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Go / No-Go", href: "/admin/go-no-go" },
            ]}
          />
          <Eyebrow>Launch call</Eyebrow>
          <SectionHeading
            title="Go / no-go"
            description="This page compresses the current blocker state into a single launch recommendation so deadline decisions can stay disciplined."
          />
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/launch-day-console"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open launch-day console
            </Link>
            <Link
              href="/admin/launch-approvals"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open launch approvals
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-mist/68">Recommendation</p>
            <p className="mt-2 text-2xl font-semibold text-white">{summary.recommendation}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Recommended mode</p>
            <p className="mt-2 text-2xl font-semibold text-white">{summary.recommendedMode}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Readiness</p>
            <p className="mt-2 text-2xl font-semibold text-white">{summary.readinessPercentage}%</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocking lanes</p>
            <p className="mt-2 text-2xl font-semibold text-white">{summary.blockingCount}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked activation steps</p>
            <p className="mt-2 text-3xl font-semibold text-white">{summary.blockedSteps}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked smoke tests</p>
            <p className="mt-2 text-3xl font-semibold text-white">{summary.blockedSmokeTests}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Launch evidence packet</h2>
              <p className="max-w-4xl text-sm leading-7 text-mist/74">
                This packet compresses the Phase 20 proof stack into one portable view across mobile, smoke, chart,
                placeholder, reliability, launch-day, and announcement lanes, so the final go or no-go call can lean
                on one combined evidence surface instead of six separate admin pages.
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
          {evidenceSummary.blockingLanes.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-3">
              {evidenceSummary.blockingLanes.map((lane) => (
                <span
                  key={lane}
                  className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-amber-100"
                >
                  {lane} blocked
                </span>
              ))}
            </div>
          ) : null}
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Why this is the current call</h2>
          <div className="mt-5 grid gap-3">
            {summary.reasons.map((reason) => (
              <div
                key={reason}
                className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76"
              >
                {reason}
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Launch decision registry</h2>
              <p className="max-w-4xl text-sm leading-7 text-mist/74">
                This registry combines approvals, decision blockers, launch scorecard checks, activation steps, and
                live smoke tests so the final launch call can be reviewed from one portable audit surface.
              </p>
            </div>
            <Link
              href="/api/admin/launch-decision-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download CSV
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-5">
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
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Activation-ready</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.inProgress}</p>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Decision discipline</h2>
          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
              A broad public push should wait until the launch-day console no longer shows blocked lanes across auth, billing, support, provider activation, and launch QA.
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
              The recommendation can move faster than full completion, but it should never move faster than the product truth that users will actually experience.
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
              The launch approvals page should be treated as the owner-signoff layer, while this page remains the compressed final call.
            </div>
          </div>
        </GlowCard>

        <GoNoGoRevisionPanel
          recommendation={summary.recommendation}
          recommendedMode={summary.recommendedMode}
          reasons={summary.reasons}
        />
      </Container>
    </div>
  );
}
