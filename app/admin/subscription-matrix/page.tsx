import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { subscriptionMatrixFeatures, subscriptionMatrixRules } from "@/lib/subscription-matrix";

export const metadata: Metadata = {
  title: "Subscription Matrix",
  description: "Protected subscription-matrix page for plan mapping, entitlements, and future gating decisions.",
};

const planLabels = ["Starter", "Pro", "Elite"] as const;

export default async function SubscriptionMatrixPage() {
  await requireUser();

  const readinessItems = subscriptionMatrixFeatures.map((item) => ({
    label: item.feature,
    status:
      item.starter === "Included" && item.pro === "Included" && item.elite === "Included"
        ? "Ready"
        : "In progress",
    detail: `${item.note} Starter: ${item.starter} · Pro: ${item.pro} · Elite: ${item.elite}`,
    routeTarget:
      item.feature === "Portfolio tracker and import review"
        ? "/portfolio/import"
        : item.feature === "Saved watchlists and workspace memory"
          ? "/account/workspace"
          : item.feature === "Priority alerts and AI summaries"
            ? "/admin/entitlements"
            : "/admin/subscription-matrix",
  }));

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Admin", href: "/admin" },
    { name: "Subscription Matrix", href: "/admin/subscription-matrix" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Phase 2 monetization</Eyebrow>
          <SectionHeading
            title="Subscription matrix"
            description="This page turns pricing into a real entitlement plan. It keeps feature access decisions visible before billing and gating logic become live code."
          />
        </div>

        <GlowCard>
          <div className="mb-6">
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="subscription entitlement rule"
              panelTitle="Write-through subscription-matrix action"
              panelDescription="Log plan-mapping changes into the shared revision lane so entitlement posture stops living only as a static monetization planning table."
              defaultRouteTarget="/admin/subscription-matrix"
              defaultOperator="Subscription Matrix Operator"
              defaultChangedFields="plan_mapping, entitlement_rule, monetization_scope"
              actionNoun="subscription-matrix mutation"
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.4fr_repeat(3,minmax(0,0.6fr))]">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-4 text-sm font-semibold text-white">
              Feature
            </div>
            {planLabels.map((label) => (
              <div key={label} className="rounded-[24px] border border-white/8 bg-black/15 p-4 text-sm font-semibold text-white">
                {label}
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-4">
            {subscriptionMatrixFeatures.map((item) => (
              <div
                key={item.feature}
                className="grid gap-4 rounded-[24px] border border-white/8 bg-black/15 p-4 lg:grid-cols-[1.4fr_repeat(3,minmax(0,0.6fr))]"
              >
                <div>
                  <h3 className="text-base font-semibold text-white">{item.feature}</h3>
                  <p className="mt-2 text-sm leading-7 text-mist/74">{item.note}</p>
                </div>
                <PlanBadge value={item.starter} />
                <PlanBadge value={item.pro} />
                <PlanBadge value={item.elite} />
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Entitlement rules</h2>
          <div className="mt-5 grid gap-3">
            {subscriptionMatrixRules.map((rule) => (
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

function PlanBadge({ value }: { value: "Included" | "Planned" | "No" }) {
  const tone =
    value === "Included"
      ? "bg-emerald-500/15 text-emerald-200"
      : value === "Planned"
        ? "bg-amber-500/15 text-amber-100"
        : "bg-white/[0.04] text-white/70";

  return (
    <div className={`rounded-[24px] border border-white/8 px-4 py-4 text-center text-sm font-medium ${tone}`}>
      {value}
    </div>
  );
}
