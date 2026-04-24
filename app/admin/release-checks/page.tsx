import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getChartVerificationSummary } from "@/lib/chart-verification-registry";
import { getLiveSmokeTestRegistrySummary } from "@/lib/live-smoke-tests";
import {
  releaseCheckLanes,
  releaseCheckRules,
  releaseChecksSummary,
} from "@/lib/release-checks";

export const metadata: Metadata = {
  title: "Release Checks",
  description:
    "Protected release-checks page for critical journey verification, signoff readiness, and repeatable launch discipline.",
};

export default async function AdminReleaseChecksPage() {
  await requireUser();
  const chartSummary = getChartVerificationSummary();
  const readinessItems = releaseCheckLanes.flatMap((lane) =>
    lane.routes.map((route) => ({
      label: `${lane.title}: ${route.label}`,
      status: route.status,
      detail: route.note,
      routeTarget: route.href,
    })),
  );
  const smokeSummary = getLiveSmokeTestRegistrySummary();

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Release Checks", href: "/admin/release-checks" },
            ]}
          />
          <Eyebrow>Launch discipline</Eyebrow>
          <SectionHeading
            title="Release checks"
            description="This page turns production launch confidence into repeatable checks so builds, auth, billing, content, and public journeys are validated together."
          />
        </div>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">Release-check registry</h2>
              <p className="max-w-4xl text-sm leading-7 text-mist/74">
                The route-by-route launch matrix is now exportable, so QA can be reviewed outside this page and shared
                as one release registry instead of living only in the admin view.
              </p>
            </div>
            <a
              href="/api/admin/release-checks"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download release CSV
            </a>
          </div>
          <div className="mt-5">
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="release check"
              panelTitle="Write-through release-check action"
              panelDescription="Log route-level launch-check changes into the shared revision lane so release truth stops living only as an exportable matrix."
              defaultRouteTarget="/admin/release-checks"
              defaultOperator="Release Checks Operator"
              defaultChangedFields="release_lane, route_check, launch_state"
              actionNoun="release-check mutation"
            />
          </div>
        </GlowCard>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Release lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{releaseChecksSummary.releaseLanes}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Critical journeys</p>
            <p className="mt-2 text-3xl font-semibold text-white">{releaseChecksSummary.criticalJourneys}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Signoff layers</p>
            <p className="mt-2 text-3xl font-semibold text-white">{releaseChecksSummary.signoffLayers}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Ready route checks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{releaseChecksSummary.readyRoutes}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">In progress route checks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{releaseChecksSummary.inProgressRoutes}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked route checks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{releaseChecksSummary.blockedRoutes}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">Smoke-test journey registry</h2>
              <p className="max-w-4xl text-sm leading-7 text-mist/74">
                Keep the launch rehearsal itself exportable. This registry tracks the exact public, auth, billing,
                support, and operator sequences that still need one clean pass before broad-public release.
              </p>
            </div>
            <a
              href="/api/admin/smoke-test-journeys"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download smoke CSV
            </a>
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
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">Chart verification registry</h2>
              <p className="max-w-4xl text-sm leading-7 text-mist/74">
                Keep the chart-backed public routes in one exportable audit lane so Sensex, NSE index pages, homepage,
                markets, stock-chart routes, and fund proxies are checked together instead of as isolated visual bugs.
              </p>
            </div>
            <a
              href="/api/admin/chart-verification-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download chart CSV
            </a>
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

        <div className="grid gap-6">
          {releaseCheckLanes.map((lane) => (
            <GlowCard key={lane.title} className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{lane.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{lane.summary}</p>
                </div>
                <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                  {lane.status}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/8 bg-black/15 px-5 py-4 text-sm text-mist/76">
                <span className="text-white">{lane.routes.length}</span> route checks in this lane
              </div>

              <div className="grid gap-4">
                {lane.routes.map((route) => (
                  <div
                    key={`${lane.title}-${route.href}`}
                    className="rounded-[24px] border border-white/8 bg-black/15 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-base font-semibold text-white">{route.label}</h3>
                          <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/80">
                            {route.status}
                          </span>
                        </div>
                        <p className="text-sm leading-7 text-mist/74">{route.note}</p>
                      </div>
                      <a
                        href={route.href}
                        className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
                      >
                        Open page
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Release rules</h2>
          <div className="mt-5 grid gap-3">
            {releaseCheckRules.map((rule) => (
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
