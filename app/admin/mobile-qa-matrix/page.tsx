import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { mobileQaAreas, mobileQaChecklist } from "@/lib/mobile-qa-matrix";
import { getMobileQaRegistrySummary } from "@/lib/mobile-qa-registry";

export const metadata: Metadata = {
  title: "Mobile QA Matrix | Riddra Admin",
  description:
    "Review the mobile launch pass for discovery, search, charts, auth, and subscriber workflows before a broad public push.",
};

export default async function MobileQaMatrixPage() {
  await requireUser();
  const registrySummary = getMobileQaRegistrySummary();
  const readinessItems = mobileQaAreas.map((area) => ({
    label: area.title,
    status: area.status,
    detail: `${area.summary} Routes: ${area.routes.join(", ")}`,
    routeTarget: area.routes[0] ?? "/admin/mobile-qa-matrix",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Mobile QA Matrix", href: "/admin/mobile-qa-matrix" },
            ]}
          />
          <Eyebrow>Phase 20 execution</Eyebrow>
          <SectionHeading
            title="Mobile QA Matrix"
            description="Track the compact-screen pass across public discovery, search, market routes, auth, and subscriber workflows before broad launch messaging goes out."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Ready to test</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {mobileQaAreas.filter((area) => area.status === "Ready to test").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Needs testing</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {mobileQaAreas.filter((area) => area.status === "Needs testing").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked by live data</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {mobileQaAreas.filter((area) => area.status === "Blocked by live data").length}
            </p>
          </GlowCard>
        </div>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="mobile QA area"
              panelTitle="Write-through mobile QA action"
              panelDescription="Log compact-screen QA changes into the shared revision lane so mobile launch posture stops living only as a test matrix."
              defaultRouteTarget="/admin/mobile-qa-matrix"
              defaultOperator="Mobile QA Operator"
              defaultChangedFields="mobile_area, route_coverage, qa_state"
              actionNoun="mobile-qa mutation"
            />
          </div>
          {mobileQaAreas.map((area) => (
            <GlowCard key={area.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/75">{area.status}</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">{area.title}</h2>
                </div>
                <span className="rounded-full border border-white/10 bg-slate-950/40 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-300">
                  {area.routes.length} routes
                </span>
              </div>
              <p className="mt-4 text-sm leading-7 text-mist/76">{area.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {area.routes.map((route) => (
                  <Link
                    key={route}
                    href={route}
                    className="rounded-full border border-white/10 bg-slate-950/40 px-3 py-1 text-xs text-slate-200"
                  >
                    {route}
                  </Link>
                ))}
              </div>
            </GlowCard>
          ))}
        </section>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Mobile QA registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                This registry turns the mobile pass into route-level checkpoints, so compact-screen review is
                exportable and can be tracked outside this page instead of being a manual note-taking exercise.
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
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.total}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Routes</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.routes}</p>
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
          <h2 className="text-2xl font-semibold text-white">Run this pass</h2>
          <div className="mt-5 space-y-3 text-sm leading-7 text-mist/76">
            {mobileQaChecklist.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
