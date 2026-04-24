import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  performanceQaItems,
  performanceQaRules,
  performanceQaSummary,
} from "@/lib/performance-qa";

export const metadata: Metadata = {
  title: "Performance QA",
  description:
    "Protected performance-qa page for public route quality, discovery integrity, admin workflow performance, and release signoff discipline.",
};

export default async function AdminPerformanceQaPage() {
  await requireUser();
  const readinessItems = performanceQaItems.map((item) => ({
    label: item.title,
    status: item.status,
    detail: item.summary,
    routeTarget: "/admin/performance-qa",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Performance QA", href: "/admin/performance-qa" },
            ]}
          />
          <Eyebrow>Quality gate</Eyebrow>
          <SectionHeading
            title="Performance QA"
            description="This page turns public quality, discovery integrity, and operator efficiency into one release-aware quality gate."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Quality lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{performanceQaSummary.qualityLanes}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Monitored surfaces</p>
            <p className="mt-2 text-3xl font-semibold text-white">{performanceQaSummary.monitoredSurfaces}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Release signals</p>
            <p className="mt-2 text-3xl font-semibold text-white">{performanceQaSummary.releaseSignals}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="performance QA lane"
            panelTitle="Write-through performance QA action"
            panelDescription="Log route-quality and performance changes into the shared revision lane so launch quality stops living only as a static QA board."
            defaultRouteTarget="/admin/performance-qa"
            defaultOperator="Performance QA Operator"
            defaultChangedFields="performance_lane, route_quality, launch_signal"
            actionNoun="performance-qa mutation"
          />
          {performanceQaItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Performance QA rules</h2>
          <div className="mt-5 grid gap-3">
            {performanceQaRules.map((rule) => (
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
