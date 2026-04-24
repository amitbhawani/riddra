import type { Metadata } from "next";

import { BillingEventCreatePanel } from "@/components/billing-event-create-panel";
import { BillingEventManagePanel } from "@/components/billing-event-manage-panel";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { LifecycleJobCreatePanel } from "@/components/lifecycle-job-create-panel";
import { LifecycleJobManagePanel } from "@/components/lifecycle-job-manage-panel";
import { LifecycleJobUpdatePanel } from "@/components/lifecycle-job-update-panel";
import { RecoveryActionCreatePanel } from "@/components/recovery-action-create-panel";
import { RecoveryActionManagePanel } from "@/components/recovery-action-manage-panel";
import { RecoveryActionUpdatePanel } from "@/components/recovery-action-update-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getBillingLedgerMemory } from "@/lib/billing-ledger-memory-store";
import { supportedPaymentEvents } from "@/lib/payment-events";
import { paymentOpsRules } from "@/lib/payment-ops";
import { getSubscriptionLifecycleRegistrySummary } from "@/lib/subscription-lifecycle-registry";
import { getSubscriptionLifecycleOpsMemory } from "@/lib/subscription-lifecycle-memory-store";

export const metadata: Metadata = {
  title: "Payment Events",
  description: "Protected payment-events page for webhook event handling, billing-state review, and entitlement follow-up.",
};

export const dynamic = "force-dynamic";

export default async function PaymentEventsPage() {
  const user = await requireUser();
  const [billingLedgerMemory, lifecycleOpsMemory, lifecycleRegistrySummary] = await Promise.all([
    getBillingLedgerMemory(),
    getSubscriptionLifecycleOpsMemory(),
    getSubscriptionLifecycleRegistrySummary(user, "admin"),
  ]);

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Admin", href: "/admin" },
    { name: "Payment Events", href: "/admin/payment-events" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Phase 2 payments</Eyebrow>
          <SectionHeading
            title="Payment events"
            description="This page keeps webhook handling grounded in actual subscription-state logic so billing events can become trustworthy user access decisions."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Supported events</p>
            <p className="mt-2 text-3xl font-semibold text-white">{supportedPaymentEvents.length}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Processed samples</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {billingLedgerMemory.eventRows.filter((item) => item.status === "Processed").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Needs follow-up</p>
            <p className="mt-2 text-3xl font-semibold text-white">{billingLedgerMemory.summary.eventFollowUp}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Queued lifecycle jobs</p>
            <p className="mt-2 text-3xl font-semibold text-white">{lifecycleOpsMemory.summary.queuedJobs}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Running lifecycle jobs</p>
            <p className="mt-2 text-3xl font-semibold text-white">{lifecycleOpsMemory.summary.runningJobs}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Accounts at risk</p>
            <p className="mt-2 text-3xl font-semibold text-white">{lifecycleOpsMemory.summary.accountsAtRisk}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Recovery actions</p>
            <p className="mt-2 text-3xl font-semibold text-white">{lifecycleOpsMemory.summary.recoveryActions}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Lifecycle registry</h2>
          <p className="mt-3 text-sm leading-7 text-mist/74">
            Payment events now sit beside one admin-scoped lifecycle registry, so ops jobs and recovery queues can be
            audited from a protected operations export instead of sharing a mixed subscriber-plus-admin lifecycle feed.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Registry rows</p>
              <p className="mt-2 text-3xl font-semibold text-white">{lifecycleRegistrySummary.totalRows}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Ops jobs</p>
              <p className="mt-2 text-3xl font-semibold text-white">{lifecycleRegistrySummary.opsJobs}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Ops recovery</p>
              <p className="mt-2 text-3xl font-semibold text-white">{lifecycleRegistrySummary.opsRecoveryActions}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Support touches</p>
              <p className="mt-2 text-3xl font-semibold text-white">{lifecycleRegistrySummary.supportTouches}</p>
            </div>
          </div>
          <div className="mt-5">
            <a
              href="/api/admin/subscription-lifecycle-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Download lifecycle registry CSV
            </a>
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Supported webhook events</h2>
          <div className="mt-5 grid gap-4">
            {supportedPaymentEvents.map((item) => (
              <div key={item.event} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-white">{item.event}</h3>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    Payment event
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{item.purpose}</p>
                <p className="mt-2 text-sm leading-7 text-white/82">{item.action}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Persisted event log</h2>
          <p className="mt-3 text-sm leading-7 text-mist/74">
            This queue now supports direct payment-event creation too, so ops can append lifecycle-driving events into the shared billing-memory lane instead of treating this page as a read-only event log.
          </p>
          <div className="mt-5">
            <BillingEventCreatePanel
              endpoint="/api/admin/payment-events"
              events={billingLedgerMemory.eventRows}
              title="Record admin payment event"
              description="Append a payment-event row through the dedicated admin payment-events API instead of routing this desk through the subscriber billing surface."
              actionLabel="Save admin payment event"
            />
          </div>
          <div className="mt-5 grid gap-4">
            {billingLedgerMemory.eventRows.map((item) => (
              <div key={item.id} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{item.event}</h3>
                    <p className="mt-2 text-sm text-mist/66">
                      {item.occurredAt} · {item.userRef}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em]">
                    <span className="rounded-full bg-white/[0.04] px-3 py-1 text-white/80">{item.status}</span>
                    <span className="rounded-full bg-white/[0.04] px-3 py-1 text-white/80">{item.subject}</span>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
                <p className="mt-2 text-xs text-mist/60">Event ID: {item.id}</p>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <BillingEventManagePanel
              endpoint="/api/admin/payment-events"
              events={billingLedgerMemory.eventRows}
              title="Manage admin payment events"
              description="Remove stale webhook or reconciliation rows through the dedicated admin payment-events API when this operations desk needs cleanup instead of only more appended samples."
              emptyMessage="Keeps the admin payment-events desk from relying on the subscriber billing route for event cleanup."
            />
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Lifecycle automation queue</h2>
          <p className="mt-3 text-sm leading-7 text-mist/74">
            Payment events now feed a shared durable lifecycle job queue, and the panel below now writes operator queue-state updates back into that backend lane instead of leaving lifecycle operations as read-only policy notes.
          </p>
          <div className="mt-5">
            <LifecycleJobCreatePanel
              endpoint="/api/admin/payment-events/lifecycle-jobs"
              title="Create ops lifecycle job"
              description="Append a new renewal-audit, failed-charge, or fallback-cleanup queue row into the shared payment-events lifecycle lane."
              actionLabel="Create ops job"
            />
          </div>
          <div className="mt-5">
            <LifecycleJobUpdatePanel
              jobs={lifecycleOpsMemory.jobs}
              endpoint="/api/admin/payment-events/lifecycle-jobs"
              title="Update ops lifecycle job"
              description="Persist renewal-audit, failed-charge, and fallback-cleanup queue updates into the shared payment-events lifecycle lane."
              actionLabel="Save ops job"
            />
          </div>
          <div className="mt-5">
            <LifecycleJobManagePanel
              jobs={lifecycleOpsMemory.jobs.map((job) => ({
                id: job.id,
                title: job.title,
                triggerEvent: job.triggerEvent,
                status: job.status,
              }))}
              endpoint="/api/admin/payment-events/lifecycle-jobs"
              title="Manage ops lifecycle jobs"
              description="Remove stale renewal-audit, failed-charge, or fallback-cleanup rows from the shared payment-events lifecycle lane when the ops queue needs cleanup instead of more appends."
            />
          </div>
          <div className="mt-5 grid gap-4">
            {lifecycleOpsMemory.jobs.map((job) => (
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
                <p className="mt-2 text-xs text-mist/60">Next run: {job.nextRun}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Recovery-action queue</h2>
          <p className="mt-3 text-sm leading-7 text-mist/74">
            Payment recovery now has its own admin-backed action lane too, so reminder, support, and fallback-review rows can be created, updated, and removed from the payment-events desk instead of only from the subscriber billing workspace.
          </p>
          <div className="mt-5">
            <RecoveryActionCreatePanel
              endpoint="/api/admin/payment-events/recovery-actions"
              panelTitle="Create ops recovery action"
              description="Append a new reminder, support handoff, or fallback-review row into the shared admin recovery lane for payment operations."
              actionLabel="Create ops recovery action"
              idleMessage="Creates a new ops recovery row inside the shared payment-events recovery lane."
              successMessage="Created a new ops recovery action in the shared lifecycle lane."
            />
          </div>
          <div className="mt-5">
            <RecoveryActionUpdatePanel
              actions={lifecycleOpsMemory.recoveryActions}
              endpoint="/api/admin/payment-events/recovery-actions"
              panelTitle="Update ops recovery action"
              description="Persist payment-recovery state changes into the shared admin recovery lane instead of leaving reminder timing and support posture as page-only notes."
              actionLabel="Save ops recovery action"
              idleMessage="Writes into the same backend recovery lane used by the admin payment-events desk."
              successMessage="Saved ops recovery action state into the shared lifecycle backend lane."
            />
          </div>
          <div className="mt-5">
            <RecoveryActionManagePanel
              actions={lifecycleOpsMemory.recoveryActions}
              endpoint="/api/admin/payment-events/recovery-actions"
              title="Manage ops recovery actions"
              description="Remove stale reminder and support rows from the shared admin recovery lane when payment operations need cleanup instead of more appends."
              emptyMessage="Keeps the admin recovery queue from staying append-only after create and update flows."
            />
          </div>
          <div className="mt-5 grid gap-4">
            {lifecycleOpsMemory.recoveryActions.map((action) => (
              <div key={action.title} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{action.title}</h3>
                    <p className="mt-2 text-sm text-mist/66">
                      {action.channel} · {action.dueAt}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {action.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{action.note}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Operations rules</h2>
          <div className="mt-5 grid gap-3">
            {[...paymentOpsRules, ...lifecycleOpsMemory.rules].map((rule) => (
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
