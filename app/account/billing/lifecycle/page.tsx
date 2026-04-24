import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { SubscriberAuditSection } from "@/components/subscriber-audit-section";
import { SubscriberRouteLinkGrid } from "@/components/subscriber-route-link-grid";
import { SubscriberRuleListSection } from "@/components/subscriber-rule-list-section";
import { SubscriberStatGrid } from "@/components/subscriber-stat-grid";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { accountBillingLifecycleRows, accountBillingLifecycleRules } from "@/lib/account-billing-lifecycle";
import { getUserSubscriptionSummary } from "@/lib/content";
import { getCurrentPlanTier } from "@/lib/plan-gating";
import { getSubscriptionLifecycleRegistrySummary } from "@/lib/subscription-lifecycle-registry";
import { getSubscriptionLifecycleAccountMemory } from "@/lib/subscription-lifecycle-memory-store";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";

export const metadata: Metadata = {
  title: "Billing Lifecycle",
  description: "Review read-only private-beta lifecycle posture, stored billing placeholders, and deferred commercial recovery expectations.",
};

export const dynamic = "force-dynamic";

export default async function AccountBillingLifecyclePage() {
  const user = await requireUser();
  const truth = getSubscriberSurfaceTruth();
  const subscription = await getUserSubscriptionSummary(user);
  const currentPlan = await getCurrentPlanTier();
  const [lifecycleMemory, lifecycleRegistrySummary] = await Promise.all([
    getSubscriptionLifecycleAccountMemory(user),
    getSubscriptionLifecycleRegistrySummary(user, "account"),
  ]);

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Account", href: "/account" },
    { name: "Billing", href: "/account/billing" },
    { name: "Lifecycle", href: "/account/billing/lifecycle" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Subscriber billing</Eyebrow>
          <SectionHeading
            title="Billing lifecycle route"
            description="Use one protected route to review stored lifecycle placeholder state and future renewal posture without implying that commercial billing is already live."
          />
        </div>

        <SubscriberTruthNotice
          eyebrow="Lifecycle truth"
          title="Commercial billing lifecycle is unavailable during private beta"
          description="This route is now a read-only lifecycle continuity surface. Checkout, webhook-confirmed lifecycle changes, renewals, and fallback automation are intentionally deferred until the commercial billing lane resumes."
          items={[
            "Lifecycle rows on this page should be treated as stored placeholders, not as live subscriber billing truth.",
            truth.hasBillingCore
              ? "Razorpay credentials may exist, but they remain intentionally unused during private beta."
              : "Razorpay credentials are still absent, which is acceptable because private beta does not depend on live billing.",
            truth.hasBillingWebhook
              ? "Webhook signing exists in code, but lifecycle proof is still deferred."
              : "Webhook signing is not configured, so event-driven lifecycle state remains intentionally deferred.",
            subscription
              ? `A stored subscription record exists for ${subscription.planCode}, but lifecycle reconciliation still remains a later commercial lane.`
              : currentPlan.isAdmin
                ? "This account is still relying on admin preview posture, not on a verified paid subscriber record."
                : "No verified paid subscription record is attached to this account yet.",
          ]}
          href="/admin/payment-events"
          hrefLabel="Open payment events"
        />

        <SubscriberStatGrid
          items={[
            {
              label: "Current plan posture",
              value: currentPlan.isAdmin ? "Admin preview" : currentPlan.label,
            },
            {
              label: "Subscription record",
              value: subscription ? subscription.status : "Not synced yet",
            },
            {
              label: "Lifecycle verification",
              value: "Deferred for private beta",
            },
            { label: "Queued lifecycle jobs", value: lifecycleMemory.summary.queuedJobs },
            { label: "Support touches", value: lifecycleMemory.summary.supportTouches },
            { label: "Recovery actions", value: lifecycleMemory.summary.recoveryActions },
          ]}
        />

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Stored lifecycle placeholder jobs</h2>
          <p className="mt-3 text-sm leading-7 text-mist/72">
            This route now exposes the stored lifecycle queue as a read-only private-beta continuity surface. Renewal, warning, fallback, and support timing should stay inspectable here without pretending the commercial billing lane is already active.
          </p>
          <div className="mt-5 rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm leading-7 text-mist/74">
            Create, update, and cleanup controls are intentionally hidden here during private beta. If the lifecycle
            placeholder queue needs operator changes, use the admin payment-events desk instead of treating this
            subscriber route like a live billing console.
          </div>
          <div className="mt-5 grid gap-4">
            {lifecycleMemory.jobs.map((job) => (
              <div key={job.id} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{job.title}</h3>
                    <p className="mt-2 text-sm text-mist/66">
                      {job.triggerEvent} · {job.accountScope}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {job.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{job.note}</p>
                <p className="mt-2 text-xs leading-6 text-mist/55">Next run: {job.nextRun}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <SubscriberAuditSection
          title="Lifecycle registry"
          description="Lifecycle and recovery rows now roll up into one account-scoped registry, so subscriber-facing billing posture can be audited from one protected export instead of being mixed together with the admin operations queue."
          headline={`${lifecycleRegistrySummary.totalRows} lifecycle rows tied across jobs, recovery, and support touches`}
          downloadHref="/api/subscription-lifecycle-registry"
          downloadLabel="Download lifecycle registry CSV"
          secondaryHref="/admin/payment-events"
          secondaryLabel="Open payment events"
          stats={[
            { label: "Registry rows", value: lifecycleRegistrySummary.totalRows },
            { label: "Account jobs", value: lifecycleRegistrySummary.accountJobs },
            { label: "Account recovery", value: lifecycleRegistrySummary.accountRecoveryActions },
            { label: "Support touches", value: lifecycleRegistrySummary.supportTouches },
          ]}
        />

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Lifecycle stages</h2>
          <div className="mt-5 grid gap-4">
            {accountBillingLifecycleRows.map((row, index) => (
              <div key={row.event} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-mist/58">Stage {index + 1}</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{row.event}</h3>
                    <p className="mt-3 text-sm leading-7 text-mist/74">{row.subscriberRead}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white">
                    Subscriber-facing
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-mist/68">{row.operatorMeaning}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Next routes</h2>
          <div className="mt-5">
            <SubscriberRouteLinkGrid
              items={[
                {
                  href: "/account/billing",
                  title: "Billing workspace",
                  note: "Review the read-only billing posture and placeholder invoice history.",
                },
                {
                  href: "/account/billing/recovery",
                  title: "Billing recovery",
                  note: "Move from lifecycle understanding into the support-led recovery posture for private beta.",
                },
                {
                  href: "/account/access/entitlements",
                  title: "Entitlement audit",
                  note: "Check how stored entitlement placeholders line up while commercial billing stays deferred.",
                },
                {
                  href: "/account/support",
                  title: "Account support",
                  note: "Use support as the real escalation path for billing questions during private beta.",
                },
              ]}
            />
          </div>
        </GlowCard>

        <SubscriberRuleListSection
          title="Lifecycle rules"
          rules={[...accountBillingLifecycleRules, ...lifecycleMemory.rules]}
        />
      </Container>
    </div>
  );
}
