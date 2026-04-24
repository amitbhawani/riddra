import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { SubscriberAuditSection } from "@/components/subscriber-audit-section";
import { SubscriberRouteLinkGrid } from "@/components/subscriber-route-link-grid";
import { SubscriberRuleListSection } from "@/components/subscriber-rule-list-section";
import { SubscriberStatGrid } from "@/components/subscriber-stat-grid";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { billingRecoveryRules, billingRecoveryStages } from "@/lib/billing-recovery";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getSubscriptionLifecycleRegistrySummary } from "@/lib/subscription-lifecycle-registry";
import { getSubscriptionLifecycleAccountMemory } from "@/lib/subscription-lifecycle-memory-store";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";

export const metadata: Metadata = {
  title: "Billing Recovery",
  description: "Review read-only private-beta recovery posture, support channels, and deferred commercial recovery expectations.",
};

export const dynamic = "force-dynamic";

export default async function AccountBillingRecoveryPage() {
  const user = await requireUser();
  const truth = getSubscriberSurfaceTruth();
  const config = getRuntimeLaunchConfig();
  const [lifecycleMemory, lifecycleRegistrySummary] = await Promise.all([
    getSubscriptionLifecycleAccountMemory(user),
    getSubscriptionLifecycleRegistrySummary(user, "account"),
  ]);

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Account", href: "/account" },
    { name: "Billing", href: "/account/billing" },
    { name: "Recovery", href: "/account/billing/recovery" },
  ];

  const supportChannels = [
    {
      label: "Billing support email",
      value: config.billingSupportEmail || config.supportEmail || "Not configured yet",
    },
    {
      label: "Support WhatsApp",
      value: config.supportWhatsapp || "Not configured yet",
    },
    {
      label: "Feedback inbox",
      value: config.feedbackInbox || "Not configured yet",
    },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Subscriber recovery</Eyebrow>
          <SectionHeading
            title="Billing recovery route"
            description="Use this protected route to review the stored recovery posture and support channels without implying that failed-charge automation is already live."
          />
        </div>

        <SubscriberTruthNotice
          eyebrow="Recovery truth"
          title="Commercial billing recovery is unavailable during private beta"
          description="This route is now a read-only recovery continuity surface. Failed-charge automation, payment retries, and cancellation recovery remain intentionally deferred until the commercial billing lane resumes."
          items={[
            "Recovery rows on this page should be treated as stored placeholders, not as live retry or cancellation truth.",
            truth.hasBillingCore
              ? "Razorpay credentials may exist, but they remain intentionally unused during private beta."
              : "Razorpay credentials are still absent, which is acceptable because private beta does not depend on live billing.",
            truth.hasBillingWebhook
              ? "Webhook signing exists in code, but billing recovery proof is still deferred."
              : "Webhook signing is not configured, so failed-charge and cancellation truth remain intentionally deferred.",
            truth.hasSupportDelivery
              ? "Support and delivery channels are configured enough to handle billing questions while paid recovery stays support-led."
              : "Support delivery is still not strong enough for billing recovery promises, so this route should stay clearly expectation-setting.",
          ]}
          href="/admin/payment-readiness"
          hrefLabel="Open payment readiness"
        />

        <SubscriberStatGrid
          items={[
            { label: "Commercial billing", value: "Deferred for private beta" },
            { label: "Webhook lifecycle", value: truth.hasBillingWebhook ? "Deferred with code path present" : "Deferred and unconfigured" },
            { label: "Recovery delivery", value: truth.hasSupportDelivery ? "Support-led and ready to verify" : "Needs support activation" },
            { label: "Queued jobs", value: lifecycleMemory.summary.queuedJobs },
            { label: "Support touches", value: lifecycleMemory.summary.supportTouches },
            { label: "Recovery actions", value: lifecycleMemory.summary.recoveryActions },
          ]}
        />

        <SubscriberAuditSection
          title="Lifecycle registry snapshot"
          description="Recovery is now stitched into the same account-scoped lifecycle registry as subscriber billing jobs, so failed-charge posture can be reviewed with one protected audit surface instead of a mixed subscriber-plus-admin export."
          headline={`${lifecycleRegistrySummary.totalRows} lifecycle rows visible across recovery, support, and job continuity`}
          downloadHref="/api/subscription-lifecycle-registry"
          downloadLabel="Download lifecycle registry CSV"
          stats={[
            { label: "Registry rows", value: lifecycleRegistrySummary.totalRows },
            { label: "Recovery rows", value: lifecycleRegistrySummary.accountRecoveryActions },
            { label: "Support touches", value: lifecycleRegistrySummary.supportTouches },
            { label: "Lifecycle jobs", value: lifecycleRegistrySummary.accountJobs },
          ]}
        />

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Recovery lifecycle</h2>
          <div className="mt-5 grid gap-4">
            {billingRecoveryStages.map((stage, index) => (
              <div key={stage.event} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-mist/58">Step {index + 1}</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{stage.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-mist/74">{stage.subscriberRead}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white">
                    {stage.event}
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-mist/68">{stage.operatorExpectation}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <div className="grid gap-6 lg:grid-cols-2">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Persisted recovery actions</h2>
            <p className="mt-3 text-sm leading-7 text-mist/72">
              Recovery actions remain visible here as stored placeholders, but private beta should not present a live retry console or editable payment-recovery workflow to subscribers.
            </p>
            <div className="mt-5 rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm leading-7 text-mist/74">
              Create, update, and cleanup controls are intentionally hidden here during private beta. Use support for
              billing questions and the admin payment-events desk for operator-side recovery adjustments.
            </div>
            <div className="mt-5 grid gap-4">
              {lifecycleMemory.recoveryActions.map((action) => (
                <div key={`${action.title}-${action.dueAt}`} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-white">{action.title}</h3>
                      <p className="mt-2 text-sm text-mist/66">{action.channel}</p>
                    </div>
                    <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                      {action.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{action.note}</p>
                  <p className="mt-2 text-xs leading-6 text-mist/55">Due: {action.dueAt}</p>
                </div>
              ))}
            </div>
          </GlowCard>

          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Support channels</h2>
            <div className="mt-5">
              <SubscriberStatGrid items={supportChannels.map((channel) => ({ label: channel.label, value: channel.value }))} />
            </div>
          </GlowCard>

          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Next routes</h2>
            <div className="mt-5">
              <SubscriberRouteLinkGrid
                items={[
                  { href: "/account/billing", title: "Billing workspace", note: "Review the read-only billing posture and placeholder invoice truth." },
                  {
                    href: "/account/billing/lifecycle",
                    title: "Billing lifecycle",
                    note: "Review the stored lifecycle placeholder state from one route.",
                  },
                  {
                    href: "/account/access/entitlements",
                    title: "Entitlement audit",
                    note: "See how stored entitlement placeholders line up while commercial billing stays deferred.",
                  },
                  { href: "/help", title: "Help center", note: "Keep recovery messaging aligned with public help content." },
                  {
                    href: "/account/support",
                    title: "Account support",
                    note: "Use support as the real private-beta path for billing questions and recovery help.",
                  },
                ]}
              />
            </div>
          </GlowCard>
        </div>

        <SubscriberRuleListSection title="Recovery rules" rules={[...billingRecoveryRules, ...lifecycleMemory.rules]} />
      </Container>
    </div>
  );
}
