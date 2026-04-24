import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { distributionOpsCards, distributionOpsRules, distributionOpsSummary } from "@/lib/distribution-ops";

export const metadata: Metadata = {
  title: "Distribution Ops",
  description: "Protected distribution-ops page for campaign loops, repurposing paths, and launch sequences.",
};

export default async function AdminDistributionOpsPage() {
  await requireUser();

  const readinessItems = distributionOpsCards.map((card) => ({
    label: card.title,
    status: card.status === "Live" ? "Ready" : "Needs verification",
    detail: card.summary,
    routeTarget:
      card.title === "Learn to newsletter loop"
        ? "/newsletter"
        : card.title === "Webinar to replay to course loop"
          ? "/webinars"
          : card.title === "Portfolio and alerts lifecycle loop"
            ? "/account/alerts"
            : "/ipo",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Admin", href: "/admin" }, { name: "Distribution Ops", href: "/admin/distribution-ops" }]} />
          <Eyebrow>Distribution operations</Eyebrow>
          <SectionHeading
            title="Distribution ops"
            description="This page tracks how learn content, webinars, newsletters, alerts, and user lifecycle moments should turn into repeatable owned-distribution systems."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Campaign loops</p>
            <p className="mt-2 text-3xl font-semibold text-white">{distributionOpsSummary.campaignLoops}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Repurposing paths</p>
            <p className="mt-2 text-3xl font-semibold text-white">{distributionOpsSummary.repurposingPaths}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Launch sequences</p>
            <p className="mt-2 text-3xl font-semibold text-white">{distributionOpsSummary.launchSequences}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="distribution ops loop"
              panelTitle="Write-through distribution-ops action"
              panelDescription="Log campaign-loop and repurposing changes into the shared revision lane so owned-distribution posture stops living only as an ops summary."
              defaultRouteTarget="/admin/distribution-ops"
              defaultOperator="Distribution Ops Operator"
              defaultChangedFields="distribution_loop, repurposing_path, campaign_trigger"
              actionNoun="distribution-ops mutation"
            />
          </GlowCard>
          {distributionOpsCards.map((card) => (
            <GlowCard key={card.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{card.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{card.summary}</p>
                </div>
                <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                  {card.status}
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Distribution rules</h2>
          <div className="mt-5 grid gap-3">
            {distributionOpsRules.map((rule) => (
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
