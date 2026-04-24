import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getBetaMetrics } from "@/lib/beta-metrics";

export const metadata: Metadata = {
  title: "Beta Metrics",
  description:
    "Protected beta-metrics page for judging whether the beta is improving trust, support confidence, and product clarity before wider expansion.",
};

export default async function AdminBetaMetricsPage() {
  await requireUser();

  const data = getBetaMetrics();
  const readinessItems = data.metrics.map((metric) => ({
    label: metric.title,
    status:
      metric.status === "Healthy" ? "Ready" : metric.status === "Watch" ? "In progress" : "Blocked",
    detail: `${metric.target} Why it matters: ${metric.reason}`,
    routeTarget:
      metric.title === "Auth completion confidence"
        ? "/admin/auth-activation"
        : metric.title === "Support response confidence"
          ? "/admin/support-ops"
          : metric.title === "Trust-breaking issue rate"
            ? "/admin/beta-triage"
            : "/admin/payment-readiness",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Beta Metrics", href: "/admin/beta-metrics" },
            ]}
          />
          <Eyebrow>Beta health</Eyebrow>
          <SectionHeading
            title="Beta metrics"
            description="This page keeps the beta focused on trust, support responsiveness, and product clarity instead of vanity progress."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Healthy</p>
            <p className="mt-2 text-3xl font-semibold text-white">{data.healthy}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Watch</p>
            <p className="mt-2 text-3xl font-semibold text-white">{data.watch}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Risk</p>
            <p className="mt-2 text-3xl font-semibold text-white">{data.risk}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="beta health metric"
              panelTitle="Write-through beta-metrics action"
              panelDescription="Log beta-health changes into the shared revision lane so expansion confidence stops living only as a static metrics board."
              defaultRouteTarget="/admin/beta-metrics"
              defaultOperator="Beta Metrics Operator"
              defaultChangedFields="metric_status, beta_health, expansion_confidence"
              actionNoun="beta-metrics mutation"
            />
          </GlowCard>
          {data.metrics.map((metric) => (
            <GlowCard key={metric.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{metric.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{metric.target}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.16em] text-mist/58">
                    Why it matters: {metric.reason}
                  </p>
                </div>
                <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                  {metric.status}
                </div>
              </div>
            </GlowCard>
          ))}
        </div>
      </Container>
    </div>
  );
}
