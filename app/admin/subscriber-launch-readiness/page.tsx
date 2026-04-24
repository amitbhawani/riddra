import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getBillingLedgerRegistrySummary } from "@/lib/billing-ledger-registry";
import { getBrokerSyncRegistrySummary } from "@/lib/broker-sync-registry";
import { getEntitlementSyncRegistrySummary } from "@/lib/entitlement-sync-registry";
import { getNotificationEventRegistrySummary } from "@/lib/notification-event-registry";
import { getPortfolioRegistrySummary } from "@/lib/portfolio-registry";
import { getSubscriberWorkspaceRegistrySummary } from "@/lib/subscriber-workspace-registry";
import { getSubscriptionLifecycleRegistrySummary } from "@/lib/subscription-lifecycle-registry";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";
import {
  getSubscriberLaunchReadinessItems,
  subscriberLaunchRules,
} from "@/lib/subscriber-launch-readiness";
import { getSubscriberLaunchRegistrySummary } from "@/lib/subscriber-launch-registry";

export const metadata: Metadata = {
  title: "Subscriber Launch Readiness",
  description:
    "Protected Phase 19 readiness page for plan gating, billing truth, support delivery, and conversion-path verification.",
};

export default async function AdminSubscriberLaunchReadinessPage() {
  const user = await requireUser();

  const items = getSubscriberLaunchReadinessItems();
  const [
    registrySummary,
    brokerRegistrySummary,
    workspaceRegistrySummary,
    supportRegistrySummary,
    billingRegistrySummary,
    entitlementRegistrySummary,
    lifecycleRegistrySummary,
    notificationRegistrySummary,
    portfolioRegistrySummary,
  ] = await Promise.all([
    getSubscriberLaunchRegistrySummary(),
    getBrokerSyncRegistrySummary(user, "admin"),
    getSubscriberWorkspaceRegistrySummary(user, "admin"),
    getSupportOpsRegistrySummary(),
    getBillingLedgerRegistrySummary(undefined, "admin"),
    getEntitlementSyncRegistrySummary(),
    getSubscriptionLifecycleRegistrySummary(user, "admin"),
    getNotificationEventRegistrySummary(user, "admin"),
    getPortfolioRegistrySummary(user, "admin"),
  ]);
  const readinessItems = items.map((item) => ({
    label: item.title,
    status: item.status,
    detail: item.note,
    routeTarget: item.href,
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Subscriber Launch Readiness", href: "/admin/subscriber-launch-readiness" },
            ]}
          />
          <Eyebrow>Phase 19 consolidation</Eyebrow>
          <SectionHeading
            title="Subscriber launch readiness"
            description="This page brings together the real subscriber-side blockers before a broad signup push: plan truth, billing activation, support delivery, and the end-to-end conversion path."
          />
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/subscriber-activation-packet"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open activation packet
            </Link>
            <Link
                  href="/api/admin/subscriber-activation-packet"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download activation CSV
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Ready</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {items.filter((item) => item.status === "Ready").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">In progress</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {items.filter((item) => item.status === "In progress").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {items.filter((item) => item.status === "Blocked").length}
            </p>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Subscriber truth checklist</h2>
          <div className="mt-5 grid gap-4">
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="subscriber launch readiness lane"
              panelTitle="Write-through subscriber launch action"
              panelDescription="Log subscriber gating, billing, support, and conversion-path changes into the shared revision lane so subscriber launch posture stops living only as a static readiness checklist."
              defaultRouteTarget="/admin/subscriber-launch-readiness"
              defaultOperator="Subscriber Launch Operator"
              defaultChangedFields="subscriber_gate, billing_truth, conversion_status"
              actionNoun="subscriber-launch mutation"
            />
            {items.map((item) => (
              <div key={item.title} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-base font-semibold text-white">{item.title}</h3>
                      <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                        {item.status}
                      </span>
                    </div>
                    <p className="text-sm leading-7 text-mist/74">{item.note}</p>
                  </div>
                  <Link
                    href={item.href}
                    className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
                  >
                    Open related surface
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Subscriber activation packet</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                This packet is the build-complete handoff for Phase 19. It separates finished account, billing,
                support, and workspace surfaces from the remaining config and verification steps that still need to be
                exercised with real credentials.
              </p>
            </div>
            <Link
              href="/admin/subscriber-activation-packet"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open packet
            </Link>
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Support delivery registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                Support delivery now has its own protected admin registry export on the subscriber launch desk too, so
                launch ops can audit help-content posture, billing-recovery support, launch-day feedback triage, and
                operator rules without bouncing back into the standalone support page to inspect the same readiness slice.
              </p>
            </div>
            <Link
              href="/api/admin/support-ops-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download support registry CSV
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Registry rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{supportRegistrySummary.total}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Ready</p>
              <p className="mt-2 text-2xl font-semibold text-white">{supportRegistrySummary.ready}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">In progress</p>
              <p className="mt-2 text-2xl font-semibold text-white">{supportRegistrySummary.inProgress}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Blocked</p>
              <p className="mt-2 text-2xl font-semibold text-white">{supportRegistrySummary.blocked}</p>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Workspace continuity registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                Workspace continuity now has its own protected admin registry export too, so subscriber launch ops can
                audit watchlists, alerts, saved screens, inbox items, consent posture, and recent workspace activity
                without routing back through subscriber-only workspace surfaces to inspect the same backend slice.
              </p>
            </div>
            <Link
              href="/api/admin/subscriber-workspace-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download workspace registry CSV
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-6">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Registry rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{workspaceRegistrySummary.totalRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Watchlists</p>
              <p className="mt-2 text-2xl font-semibold text-white">{workspaceRegistrySummary.watchlists}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Alert rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {workspaceRegistrySummary.alertPreferences + workspaceRegistrySummary.alertFeed}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Saved screens</p>
              <p className="mt-2 text-2xl font-semibold text-white">{workspaceRegistrySummary.screens}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Inbox rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{workspaceRegistrySummary.inbox}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Consent + activity</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {workspaceRegistrySummary.consents + workspaceRegistrySummary.activities}
              </p>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Broker continuity registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                Broker continuity now has its own protected admin registry export too, so subscriber launch ops can
                audit broker targets, linked accounts, sync windows, review posture, and recent broker activity
                without dropping back into the subscriber broker route just to inspect the same backend slice.
              </p>
            </div>
            <Link
              href="/api/admin/broker-sync-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download broker registry CSV
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-6">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Registry rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{brokerRegistrySummary.totalRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Priority targets</p>
              <p className="mt-2 text-2xl font-semibold text-white">{brokerRegistrySummary.priorityTargets}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Sync runs</p>
              <p className="mt-2 text-2xl font-semibold text-white">{brokerRegistrySummary.syncRuns}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Linked accounts</p>
              <p className="mt-2 text-2xl font-semibold text-white">{brokerRegistrySummary.linkedAccounts}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Review queue</p>
              <p className="mt-2 text-2xl font-semibold text-white">{brokerRegistrySummary.reviewQueue}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Active queues</p>
              <p className="mt-2 text-2xl font-semibold text-white">{brokerRegistrySummary.activeSyncQueues}</p>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Billing continuity registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                Billing continuity now sits on this launch desk too, so invoice, ledger, and payment-event posture can
                be checked from one place instead of bouncing across the billing workspace, ledger, and payment-events
                desks during subscriber launch review.
              </p>
            </div>
            <Link
              href="/api/admin/billing-ledger-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download billing registry CSV
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-5">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Registry rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{billingRegistrySummary.totalRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Ledger rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{billingRegistrySummary.ledgerRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Event rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{billingRegistrySummary.eventRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Paid or processed</p>
              <p className="mt-2 text-2xl font-semibold text-white">{billingRegistrySummary.paidRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Needs follow-up</p>
              <p className="mt-2 text-2xl font-semibold text-white">{billingRegistrySummary.followUpRows}</p>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Entitlement continuity registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                Entitlement continuity now sits here too, so sync outcomes, review posture, and automation coverage
                can be checked from the launch desk instead of forcing launch review back through the dedicated access
                pages.
              </p>
            </div>
            <Link
              href="/api/admin/entitlement-sync-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download entitlement registry CSV
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Registry rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{entitlementRegistrySummary.totalRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Synced</p>
              <p className="mt-2 text-2xl font-semibold text-white">{entitlementRegistrySummary.syncedRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Needs review</p>
              <p className="mt-2 text-2xl font-semibold text-white">{entitlementRegistrySummary.reviewRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Automated</p>
              <p className="mt-2 text-2xl font-semibold text-white">{entitlementRegistrySummary.automatedRows}</p>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Lifecycle recovery registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                Renewal and recovery posture now sits on the same launch desk too, so subscriber automation, recovery
                actions, and support touches can be reviewed without switching over to the billing lifecycle and
                payment-event desks.
              </p>
            </div>
            <Link
              href="/api/admin/subscription-lifecycle-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download lifecycle registry CSV
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Registry rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{lifecycleRegistrySummary.totalRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Ops jobs</p>
              <p className="mt-2 text-2xl font-semibold text-white">{lifecycleRegistrySummary.opsJobs}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Recovery actions</p>
              <p className="mt-2 text-2xl font-semibold text-white">{lifecycleRegistrySummary.opsRecoveryActions}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Support touches</p>
              <p className="mt-2 text-2xl font-semibold text-white">{lifecycleRegistrySummary.supportTouches}</p>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Delivery continuity registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                Consent-aware delivery now sits on the launch desk too, so channel routing, delivery health, blocked
                paths, and retry posture can be checked without leaving subscriber launch readiness for the delivery
                layers console.
              </p>
            </div>
            <Link
              href="/api/admin/notification-event-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download delivery registry CSV
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-6">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Registry rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{notificationRegistrySummary.totalRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Channel routes</p>
              <p className="mt-2 text-2xl font-semibold text-white">{notificationRegistrySummary.channelRoutes}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Delivery events</p>
              <p className="mt-2 text-2xl font-semibold text-white">{notificationRegistrySummary.deliveryEvents}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Blocked</p>
              <p className="mt-2 text-2xl font-semibold text-white">{notificationRegistrySummary.blockedOrReconfirming}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Queued or retrying</p>
              <p className="mt-2 text-2xl font-semibold text-white">{notificationRegistrySummary.queuedOrRetrying}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Delivered or healthy</p>
              <p className="mt-2 text-2xl font-semibold text-white">{notificationRegistrySummary.deliveredOrHealthy}</p>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Portfolio continuity registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                Portfolio continuity now sits on the launch desk too, so import runs, reconciliation posture, review
                backlog, holdings, and unresolved rows can be checked without leaving subscriber launch review for the
                portfolio exceptions desk.
              </p>
            </div>
            <Link
              href="/api/admin/portfolio-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download portfolio registry CSV
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-6">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Registry rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{portfolioRegistrySummary.totalRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Import runs</p>
              <p className="mt-2 text-2xl font-semibold text-white">{portfolioRegistrySummary.importRuns}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Reconciliations</p>
              <p className="mt-2 text-2xl font-semibold text-white">{portfolioRegistrySummary.reconciliations}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Review rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{portfolioRegistrySummary.reviewRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Holdings</p>
              <p className="mt-2 text-2xl font-semibold text-white">{portfolioRegistrySummary.holdings}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Unresolved rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{portfolioRegistrySummary.unresolvedRows}</p>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Subscriber readiness registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                This registry combines the Phase 19 readiness checks with live route checkpoints for pricing, signup,
                account access, billing, support delivery, webhook truth, and gated workspace paths. Use it as the
                portable subscriber audit layer.
              </p>
            </div>
            <Link
              href="/api/admin/subscriber-launch-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download CSV
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Registry rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.total}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Ready</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.ready}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">In progress</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.inProgress}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Blocked</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.blocked}</p>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Launch rules</h2>
          <div className="mt-5 grid gap-3">
            {subscriberLaunchRules.map((rule) => (
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
