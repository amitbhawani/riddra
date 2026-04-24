import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  cacheDisciplineItems,
  cacheDisciplineRules,
  cacheDisciplineSummary,
} from "@/lib/cache-discipline";

export const metadata: Metadata = {
  title: "Cache Discipline",
  description:
    "Protected cache-discipline page for refresh policies, invalidation rules, CMS revalidation, and operator-visible freshness planning.",
};

export default async function AdminCacheDisciplinePage() {
  await requireUser();
  const readinessItems = cacheDisciplineItems.map((item) => ({
    label: item.title,
    status: item.status,
    detail: item.summary,
    routeTarget: "/admin/cache-discipline",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Cache Discipline", href: "/admin/cache-discipline" },
            ]}
          />
          <Eyebrow>Freshness control</Eyebrow>
          <SectionHeading
            title="Cache discipline"
            description="This page turns freshness, revalidation, and invalidation into an operator-visible system so cached and near-live pages stay understandable."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Cache zones</p>
            <p className="mt-2 text-3xl font-semibold text-white">{cacheDisciplineSummary.cacheZones}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Refresh policies</p>
            <p className="mt-2 text-3xl font-semibold text-white">{cacheDisciplineSummary.refreshPolicies}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Invalidation paths</p>
            <p className="mt-2 text-3xl font-semibold text-white">{cacheDisciplineSummary.invalidationPaths}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="cache discipline lane"
            panelTitle="Write-through cache-discipline action"
            panelDescription="Log freshness and invalidation changes into the shared revision lane so cache posture stops living only as a static control board."
            defaultRouteTarget="/admin/cache-discipline"
            defaultOperator="Cache Discipline Operator"
            defaultChangedFields="cache_zone, refresh_policy, invalidation_state"
            actionNoun="cache-discipline mutation"
          />
          {cacheDisciplineItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Cache rules</h2>
          <div className="mt-5 grid gap-3">
            {cacheDisciplineRules.map((rule) => (
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
