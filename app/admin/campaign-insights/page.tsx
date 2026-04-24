import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  campaignInsightItems,
  campaignInsightRules,
  campaignInsightsSummary,
} from "@/lib/campaign-insights";

export const metadata: Metadata = {
  title: "Campaign Insights",
  description:
    "Protected campaign-insights page for lifecycle outcomes, retention measurement, and recovery-aware campaign reporting.",
};

export default async function AdminCampaignInsightsPage() {
  await requireUser();

  const readinessItems = campaignInsightItems.map((item) => ({
    label: item.title,
    status: item.status === "In progress" ? "In progress" : "Queued",
    detail: item.summary,
    routeTarget:
      item.title === "Recovery and trust insights"
        ? "/admin/trust-signoff"
        : item.title === "Consent-aware reporting"
          ? "/admin/consent-ops"
          : "/admin/campaign-insights",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Campaign Insights", href: "/admin/campaign-insights" },
            ]}
          />
          <Eyebrow>Outcome measurement</Eyebrow>
          <SectionHeading
            title="Campaign insights"
            description="This page turns lifecycle and campaign work into outcome-aware reporting so the team can judge activation, retention, and recovery impact instead of only sending messages."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Insight boards</p>
            <p className="mt-2 text-3xl font-semibold text-white">{campaignInsightsSummary.insightBoards}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Tracked outcomes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{campaignInsightsSummary.trackedOutcomes}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Recovery signals</p>
            <p className="mt-2 text-3xl font-semibold text-white">{campaignInsightsSummary.recoverySignals}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="campaign insight rule"
              panelTitle="Write-through campaign-insights action"
              panelDescription="Log campaign-insights changes into the shared revision lane so lifecycle outcome posture stops living only as a reporting plan."
              defaultRouteTarget="/admin/campaign-insights"
              defaultOperator="Campaign Insights Operator"
              defaultChangedFields="insight_board, outcome_signal, recovery_measurement"
              actionNoun="campaign-insights mutation"
            />
          </GlowCard>
          {campaignInsightItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Insight rules</h2>
          <div className="mt-5 grid gap-3">
            {campaignInsightRules.map((rule) => (
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
