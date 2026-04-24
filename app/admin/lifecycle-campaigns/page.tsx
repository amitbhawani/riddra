import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  lifecycleCampaignItems,
  lifecycleCampaignRules,
  lifecycleCampaignsSummary,
} from "@/lib/lifecycle-campaigns";

export const metadata: Metadata = {
  title: "Lifecycle Campaigns",
  description: "Protected lifecycle-campaigns page for onboarding, retention, upgrade, churn recovery, and trust-repair journeys.",
};

export default async function AdminLifecycleCampaignsPage() {
  await requireUser();

  const readinessItems = lifecycleCampaignItems.map((item) => ({
    label: item.title,
    status: item.status === "In progress" ? "In progress" : "Queued",
    detail: item.summary,
    routeTarget:
      item.title === "Portfolio trust recovery"
        ? "/portfolio/import"
        : item.title === "Upgrade and value-reveal journeys"
          ? "/admin/subscription-matrix"
          : item.title === "Churn prevention and win-back"
            ? "/admin/crm-ops"
            : "/admin/lifecycle-campaigns",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Admin", href: "/admin" }, { name: "Lifecycle Campaigns", href: "/admin/lifecycle-campaigns" }]} />
          <Eyebrow>Lifecycle journeys</Eyebrow>
          <SectionHeading
            title="Lifecycle campaigns"
            description="This page turns subscriber growth into structured lifecycle journeys so onboarding, retention, recovery, and upgrade logic become an operating system instead of scattered campaigns."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Journey families</p>
            <p className="mt-2 text-3xl font-semibold text-white">{lifecycleCampaignsSummary.journeyFamilies}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Active moments</p>
            <p className="mt-2 text-3xl font-semibold text-white">{lifecycleCampaignsSummary.activeMoments}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Recovery loops</p>
            <p className="mt-2 text-3xl font-semibold text-white">{lifecycleCampaignsSummary.recoveryLoops}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="lifecycle campaign rule"
              panelTitle="Write-through lifecycle-campaign action"
              panelDescription="Log lifecycle-campaign changes into the shared revision lane so onboarding, retention, and recovery posture stop living only as a journey-planning board."
              defaultRouteTarget="/admin/lifecycle-campaigns"
              defaultOperator="Lifecycle Campaign Operator"
              defaultChangedFields="journey_family, lifecycle_trigger, recovery_posture"
              actionNoun="lifecycle-campaign mutation"
            />
          </GlowCard>
          {lifecycleCampaignItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Lifecycle rules</h2>
          <div className="mt-5 grid gap-3">
            {lifecycleCampaignRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
