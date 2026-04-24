import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getLiveSmokeTestRegistrySummary } from "@/lib/live-smoke-tests";
import { getPlaceholderHonestySummary } from "@/lib/placeholder-honesty-registry";
import {
  preflightChecklistItems,
  preflightChecklistRules,
  preflightChecklistSummary,
} from "@/lib/preflight-checklist";
import { getPreflightChecklistRegistrySummary } from "@/lib/preflight-checklist-registry";

export const metadata: Metadata = {
  title: "Preflight Checklist",
  description:
    "Protected preflight-checklist page for final route checks, provider validation, rollback readiness, and owner signoff before launch.",
};

export default async function AdminPreflightChecklistPage() {
  await requireUser();
  const registrySummary = getPreflightChecklistRegistrySummary();
  const readinessItems = preflightChecklistItems.map((item) => ({
    label: item.group,
    status: item.status,
    detail: item.summary,
    routeTarget: "/admin/preflight-checklist",
  }));
  const smokeSummary = getLiveSmokeTestRegistrySummary();
  const placeholderSummary = getPlaceholderHonestySummary();

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Preflight Checklist", href: "/admin/preflight-checklist" },
            ]}
          />
          <Eyebrow>Final verification</Eyebrow>
          <SectionHeading
            title="Preflight checklist"
            description="This page collects the final route, auth, provider, operations, and owner signoff checks that should happen after activation and before public promotion."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Checklist groups</p>
            <p className="mt-2 text-3xl font-semibold text-white">{preflightChecklistSummary.checklistGroups}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Critical checks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{preflightChecklistSummary.criticalChecks}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Owner reviews</p>
            <p className="mt-2 text-3xl font-semibold text-white">{preflightChecklistSummary.ownerReviews}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="preflight checklist group"
            panelTitle="Write-through preflight action"
            panelDescription="Log final launch-pass changes into the shared revision lane so preflight truth stops living only as a static readiness checklist."
            defaultRouteTarget="/admin/preflight-checklist"
            defaultOperator="Preflight Checklist Operator"
            defaultChangedFields="preflight_group, launch_signoff, readiness_state"
            actionNoun="preflight-checklist mutation"
          />
          {preflightChecklistItems.map((item) => (
            <GlowCard key={item.group}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{item.group}</h2>
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
          <h2 className="text-2xl font-semibold text-white">Preflight rules</h2>
          <div className="mt-5 grid gap-3">
            {preflightChecklistRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Preflight registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                This registry combines checklist groups, launch route checkpoints, and preflight rules so the last
                launch pass can be downloaded and reviewed outside this page too.
              </p>
            </div>
            <Link
              href="/api/admin/preflight-checklist-registry"
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
              <h2 className="text-2xl font-semibold text-white">Live smoke-test preflight</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                The smoke-test desk now breaks the last-pass rehearsal into explicit route sequences. Keep it in
                preflight so homepage, auth, billing, support, and operator launch control are reviewed together.
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
              <p className="text-sm text-mist/68">Ready journeys</p>
              <p className="mt-2 text-2xl font-semibold text-white">{smokeSummary.readyJourneys}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Optional journeys</p>
              <p className="mt-2 text-2xl font-semibold text-white">{smokeSummary.optionalJourneys}</p>
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
              <h2 className="text-2xl font-semibold text-white">Placeholder honesty preflight</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                Public trust breaks fast when staged billing, portfolio, trading, or AI routes look fully live. Keep
                this registry in the last-pass checklist so launch decisions account for preview-backed states too.
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
      </Container>
    </div>
  );
}
