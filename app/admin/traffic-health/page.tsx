import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  trafficHealthItems,
  trafficHealthRules,
  trafficHealthSummary,
} from "@/lib/traffic-health";

export const metadata: Metadata = {
  title: "Traffic Health",
  description:
    "Protected traffic-health page for crawlability, schema integrity, performance quality, and search-traffic anomaly planning.",
};

export default async function AdminTrafficHealthPage() {
  await requireUser();
  const readinessItems = trafficHealthItems.map((item) => ({
    label: item.title,
    status: item.status,
    detail: item.summary,
    routeTarget: "/admin/traffic-health",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Traffic Health", href: "/admin/traffic-health" },
            ]}
          />
          <Eyebrow>Discovery quality</Eyebrow>
          <SectionHeading
            title="Traffic health"
            description="This page turns crawl integrity, schema quality, and route-level performance into an operator-visible growth and trust layer."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Acquisition routes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{trafficHealthSummary.acquisitionRoutes}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Search signals</p>
            <p className="mt-2 text-3xl font-semibold text-white">{trafficHealthSummary.searchSignals}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Health monitors</p>
            <p className="mt-2 text-3xl font-semibold text-white">{trafficHealthSummary.healthMonitors}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="traffic health lane"
            panelTitle="Write-through traffic health action"
            panelDescription="Log crawl, schema, and route-discovery changes into the shared revision lane so traffic health stops living only as a static SEO board."
            defaultRouteTarget="/admin/traffic-health"
            defaultOperator="Traffic Health Operator"
            defaultChangedFields="traffic_lane, crawl_state, route_health"
            actionNoun="traffic-health mutation"
          />
          {trafficHealthItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Traffic rules</h2>
          <div className="mt-5 grid gap-3">
            {trafficHealthRules.map((rule) => (
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
