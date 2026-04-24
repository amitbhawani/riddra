import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { aiGuardrailCards, aiGuardrailRules, aiGuardrailSummary } from "@/lib/ai-guardrails";

export const metadata: Metadata = {
  title: "AI Guardrails",
  description: "Protected AI guardrails page for grounded outputs, human review, and cost-safe activation rules.",
};

export default async function AdminAiGuardrailsPage() {
  await requireUser();
  const readinessItems = aiGuardrailCards.map((card) => ({
    label: card.title,
    status: card.status === "Live" ? "Ready" : "Needs verification",
    detail: card.summary,
    routeTarget:
      card.title === "Grounded retrieval only"
        ? "/admin/knowledge-ops"
        : card.title === "Human review for editorial output"
          ? "/admin/revisions"
          : card.title === "No silent cost expansion"
            ? "/admin/ai-ops"
            : "/admin/provider-onboarding",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Admin", href: "/admin" }, { name: "AI Guardrails", href: "/admin/ai-guardrails" }]} />
          <Eyebrow>AI governance</Eyebrow>
          <SectionHeading
            title="AI guardrails"
            description="This page makes AI safety and cost control operational: grounded retrieval, human review, no unsupported realtime claims, and visible model-on or model-off behavior."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Grounded pipelines</p>
            <p className="mt-2 text-3xl font-semibold text-white">{aiGuardrailSummary.groundedPipelines}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Human review points</p>
            <p className="mt-2 text-3xl font-semibold text-white">{aiGuardrailSummary.humanReviewPoints}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked unsafe modes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{aiGuardrailSummary.blockedUnsafeModes}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="ai guardrail"
              panelTitle="Write-through AI-guardrail action"
              panelDescription="Log AI safety, review, and cost-control changes into the shared revision lane so guardrail posture stops living only as a governance explainer."
              defaultRouteTarget="/admin/ai-guardrails"
              defaultOperator="AI Guardrails Operator"
              defaultChangedFields="guardrail_lane, review_posture, cost_control"
              actionNoun="ai-guardrail mutation"
            />
          </GlowCard>
          {aiGuardrailCards.map((card) => (
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
          <h2 className="text-2xl font-semibold text-white">Guardrail rules</h2>
          <div className="mt-5 grid gap-3">
            {aiGuardrailRules.map((rule) => (
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
