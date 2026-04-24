import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { SubscriberAuditSection } from "@/components/subscriber-audit-section";
import { SubscriberRouteLinkGrid } from "@/components/subscriber-route-link-grid";
import { SubscriberRuleListSection } from "@/components/subscriber-rule-list-section";
import { SubscriberStatGrid } from "@/components/subscriber-stat-grid";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { isLocalAuthBypassEnabled, requireUser } from "@/lib/auth";
import { accessRules, accessSummary } from "@/lib/account-workspace";
import { getEntitlementSyncRegistrySummary } from "@/lib/entitlement-sync-registry";
import { getCurrentPlanTier, getPlanLabel, normalizePlanTier, type PlanTier } from "@/lib/plan-gating";
import { subscriptionMatrixFeatures } from "@/lib/subscription-matrix";

export const metadata: Metadata = {
  title: "Access and Entitlements",
  description: "See which features are included in your account and how access differs across plans.",
};

type AccountAccessPageProps = {
  searchParams?: Promise<{
    required?: string;
    from?: string;
    current?: string;
  }>;
};

export default async function AccountAccessPage({ searchParams }: AccountAccessPageProps) {
  const user = await requireUser();
  const currentPlan = await getCurrentPlanTier();
  const entitlementRegistry = await getEntitlementSyncRegistrySummary(user);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requiredParam = resolvedSearchParams?.required;
  const fromPath = resolvedSearchParams?.from;
  const requiredPlan: PlanTier | null =
    requiredParam === "pro" || requiredParam === "elite" || requiredParam === "starter"
      ? requiredParam
      : null;
  const currentPlanLabel = currentPlan.isAdmin ? "Admin access" : `${currentPlan.label} plan`;
  const usesLocalPreviewAuth = isLocalAuthBypassEnabled();
  const requestedCurrentPlan =
    resolvedSearchParams?.current &&
    ["starter", "pro", "elite"].includes(resolvedSearchParams.current)
      ? getPlanLabel(normalizePlanTier(resolvedSearchParams.current))
      : currentPlan.label;

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Account", href: "/account" },
    { name: "Access", href: "/account/access" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Access model</Eyebrow>
          <SectionHeading
            title="Access and entitlements"
            description="Understand what is included in each plan and how access rules shape the subscriber workspace."
          />
        </div>

        {usesLocalPreviewAuth ? (
          <SubscriberTruthNotice
            eyebrow="Access truth"
            title="Plan access is still being previewed locally"
            description="This page shows the intended access model, but local preview auth still bypasses the full real-user path. Treat this as entitlement guidance and route-gating preview until public auth and live subscriptions are fully validated."
            href="/admin/subscriber-launch-readiness"
            hrefLabel="Open subscriber readiness"
          />
        ) : null}

        {requiredPlan ? (
          <GlowCard className="border-aurora/30 bg-aurora/[0.06]">
            <h2 className="text-2xl font-semibold text-white">
              {getPlanLabel(requiredPlan)} access required
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-mist/78">
              This route is now gated as part of the Phase 19 hardening pass. Your current access is{" "}
              <span className="text-white">{requestedCurrentPlan}</span>, while this workflow expects{" "}
              <span className="text-white">{getPlanLabel(requiredPlan)}</span> or higher.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/pricing"
                className="rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-sm text-white transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                View pricing
              </Link>
              {fromPath ? (
                <Link
                  href={fromPath}
                  className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-sm text-mist/84 transition hover:border-white/20 hover:bg-white/[0.04]"
                >
                  Try again later
                </Link>
              ) : null}
            </div>
          </GlowCard>
        ) : null}

        <SubscriberStatGrid
          items={[
            { label: "Included now", value: accessSummary.includedNow },
            { label: "Premium expansion", value: accessSummary.premiumLater },
            { label: "Your current plan", value: currentPlanLabel },
          ]}
        />

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Plan coverage</h2>
          <div className="mt-5 grid gap-4">
            {subscriptionMatrixFeatures.map((item) => (
              <div key={item.feature} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <h3 className="text-base font-semibold text-white">{item.feature}</h3>
                <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em]">
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-white/80">Starter · {item.starter}</span>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-white/80">Pro · {item.pro}</span>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-white/80">Elite · {item.elite}</span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <SubscriberRuleListSection
          title="Entitlement rules"
          rules={accessRules}
          actions={
            <SubscriberRouteLinkGrid
              items={[
                {
                  href: "/account/access/entitlements",
                  title: "Open entitlement audit",
                  note: "Review synced access history and override posture from the detailed subscriber audit route.",
                },
                {
                  href: "/account/billing/recovery",
                  title: "Open billing recovery",
                  note: "Check the payment and fallback lane that still needs to line up with entitlement truth.",
                },
              ]}
            />
          }
        />

        <SubscriberAuditSection
          title="Entitlement registry coverage"
          description="This page now exposes the same stitched entitlement audit posture that sits behind the entitlement sub-route, so access truth is visible from the main access model too."
          headline={`${entitlementRegistry.totalRows} access rows with ${entitlementRegistry.syncedRows} synced and ${entitlementRegistry.reviewRows} under review`}
          downloadHref="/api/entitlement-sync-registry"
          downloadLabel="Download entitlement registry CSV"
          stats={[
            { label: "Registry rows", value: entitlementRegistry.totalRows },
            { label: "Synced rows", value: entitlementRegistry.syncedRows },
            { label: "Needs review", value: entitlementRegistry.reviewRows },
            { label: "Automated rows", value: entitlementRegistry.automatedRows },
          ]}
        />
      </Container>
    </div>
  );
}
