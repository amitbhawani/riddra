import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { campaignEngineItems, campaignEngineRules, campaignEngineSummary } from "@/lib/campaign-engine";

export const metadata: Metadata = {
  title: "Campaign Engine",
  description: "Protected campaign-engine page for channel families, lifecycle journeys, and event-driven growth automation.",
};

export default async function AdminCampaignEnginePage() {
  await requireUser();

  const readinessItems = campaignEngineItems.map((item) => ({
    label: item.title,
    status: item.status === "In progress" ? "In progress" : "Queued",
    detail: item.summary,
    routeTarget:
      item.title === "Consent and delivery governance"
        ? "/admin/delivery-layers"
        : item.title === "Operator-managed campaign templates"
          ? "/admin/segment-playbooks"
          : "/admin/campaign-engine",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Admin", href: "/admin" }, { name: "Campaign Engine", href: "/admin/campaign-engine" }]} />
          <Eyebrow>Growth automation</Eyebrow>
          <SectionHeading
            title="Campaign engine"
            description="This page turns future email, WhatsApp, SMS, and push growth into one operator-aware campaign system instead of disconnected channel experiments."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Channel families</p>
            <p className="mt-2 text-3xl font-semibold text-white">{campaignEngineSummary.channelFamilies}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Lifecycle flows</p>
            <p className="mt-2 text-3xl font-semibold text-white">{campaignEngineSummary.lifecycleFlows}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Queued playbooks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{campaignEngineSummary.queuedPlaybooks}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="campaign engine rule"
              panelTitle="Write-through campaign-engine action"
              panelDescription="Log campaign-engine changes into the shared revision lane so channel and journey posture stop living only as a growth planning board."
              defaultRouteTarget="/admin/campaign-engine"
              defaultOperator="Campaign Engine Operator"
              defaultChangedFields="channel_family, journey_rule, consent_posture"
              actionNoun="campaign-engine mutation"
            />
          </GlowCard>
          {campaignEngineItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Campaign rules</h2>
          <div className="mt-5 grid gap-3">
            {campaignEngineRules.map((rule) => (
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
