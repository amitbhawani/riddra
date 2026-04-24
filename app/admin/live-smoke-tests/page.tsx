import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  getLiveSmokeTestRegistrySummary,
  getLiveSmokeTests,
} from "@/lib/live-smoke-tests";

export const metadata: Metadata = {
  title: "Live Smoke Tests",
  description:
    "Protected live-smoke-tests page for launch-critical auth, account, support, payment, and public-posture checks after env activation.",
};

export default async function AdminLiveSmokeTestsPage() {
  await requireUser();

  const smokeTests = getLiveSmokeTests();
  const readinessItems = smokeTests.tests.flatMap((test) =>
    test.steps.map((step) => ({
      label: `${test.title}: ${step.label}`,
      status: step.status,
      detail: step.note,
      routeTarget: step.href,
    })),
  );
  const registrySummary = getLiveSmokeTestRegistrySummary();

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Live Smoke Tests", href: "/admin/live-smoke-tests" },
            ]}
          />
          <Eyebrow>Post-activation verification</Eyebrow>
          <SectionHeading
            title="Live smoke tests"
            description="This page turns launch validation into a fast test run across login, protected routes, support trust, billing posture, and public launch messaging."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-mist/68">Journeys</p>
            <p className="mt-2 text-3xl font-semibold text-white">{smokeTests.tests.length}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Ready to test</p>
            <p className="mt-2 text-3xl font-semibold text-white">{smokeTests.ready}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked</p>
            <p className="mt-2 text-3xl font-semibold text-white">{smokeTests.blocked}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Optional today</p>
            <p className="mt-2 text-3xl font-semibold text-white">{smokeTests.optional}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Smoke-test journey registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                This desk now breaks the launch pass into explicit route sequences for public discovery, auth,
                billing, support, and operator control. Use it as the practical checklist before broad-public
                promotion instead of relying on memory.
              </p>
            </div>
            <Link
              href="/api/admin/smoke-test-journeys"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download CSV
            </Link>
          </div>
          <div className="mt-5">
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="live smoke-test step"
              panelTitle="Write-through smoke-test action"
              panelDescription="Log live smoke-test progress into the shared revision lane so launch rehearsal proof stops living only as a route checklist."
              defaultRouteTarget="/admin/live-smoke-tests"
              defaultOperator="Live Smoke Test Operator"
              defaultChangedFields="smoke_journey, smoke_step, verification_state"
              actionNoun="live-smoke-test mutation"
            />
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Journey steps</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.totalSteps}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Ready steps</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.readySteps}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">In progress steps</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.inProgressSteps}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Blocked steps</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.blockedSteps}</p>
            </div>
          </div>
        </GlowCard>

        <div className="grid gap-6">
          {smokeTests.tests.map((test) => (
            <GlowCard key={test.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{test.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{test.summary}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.16em] text-mist/58">
                    Primary route: {test.path}
                  </p>
                </div>
                <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                  {test.status}
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {test.steps.map((step) => (
                  <div
                    key={`${test.title}-${step.href}`}
                    className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <Link
                          href={step.href}
                          className="text-sm font-semibold text-white transition hover:text-sky-200"
                        >
                          {step.label}
                        </Link>
                        <p className="text-sm leading-7 text-mist/74">{step.note}</p>
                      </div>
                      <span className="rounded-full bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white/80">
                        {step.status}
                      </span>
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
