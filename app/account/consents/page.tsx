import type { Metadata } from "next";
import Link from "next/link";

import { SubscriberAuditSection } from "@/components/subscriber-audit-section";
import { ConsentChannelUpdatePanel } from "@/components/consent-channel-update-panel";
import { ConsentChannelManagePanel } from "@/components/consent-channel-manage-panel";
import { NotificationEventCreatePanel } from "@/components/notification-event-create-panel";
import { NotificationEventManagePanel } from "@/components/notification-event-manage-panel";
import { SubscriberRuleListSection } from "@/components/subscriber-rule-list-section";
import { SubscriberStatGrid } from "@/components/subscriber-stat-grid";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { WorkspaceConsentItemManagePanel } from "@/components/workspace-consent-item-manage-panel";
import { WorkspaceConsentItemUpdatePanel } from "@/components/workspace-consent-item-update-panel";
import { requireUser } from "@/lib/auth";
import { getAccountNotificationEventMemory } from "@/lib/notification-event-memory-store";
import { getNotificationEventRegistrySummary } from "@/lib/notification-event-registry";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getSubscriberWorkspaceMemory } from "@/lib/subscriber-workspace-store";

export const metadata: Metadata = {
  title: "Consent Center",
  description: "Manage notification, lifecycle, and sensitive-workflow consent preferences.",
};

export const dynamic = "force-dynamic";

export default async function AccountConsentsPage() {
  const user = await requireUser();
  const truth = getSubscriberSurfaceTruth();
  const [workspace, notificationMemory, notificationRegistrySummary] = await Promise.all([
    getSubscriberWorkspaceMemory(user),
    getAccountNotificationEventMemory(user),
    getNotificationEventRegistrySummary(user, "account"),
  ]);
  const usesDurableDeliveryState = notificationMemory.storageMode === "supabase_private_beta";
  const deliveryStorageLabel = usesDurableDeliveryState
    ? "Supabase-backed private-beta delivery continuity"
    : "file-backed preview delivery continuity";

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Eyebrow>Consent center</Eyebrow>
          <SectionHeading
            title="Consent and messaging preferences"
            description="Use this workspace to manage alerts, campaigns, and sensitive portfolio workflow consent so Riddra stays useful without feeling pushy."
          />
          <Link
            href="/account/alerts"
            className="inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
          >
            Open alert preferences
          </Link>
        </div>

        <SubscriberTruthNotice
          eyebrow="Consent truth"
          title={
            usesDurableDeliveryState
              ? "Consent-aware delivery continuity now uses durable private-beta state"
              : "Consent controls are still a subscriber preview layer"
          }
          description={
            usesDurableDeliveryState
              ? "This route now reads channel routing and recent delivery events from the shared private-beta account-state store for this signed-in account. Provider-backed delivery still needs live proof, but the continuity lane is no longer limited to the fallback preview file."
              : "This route now persists governed preview intent through the local workspace store for the signed-in account, but the controls below are still not fully durable user-managed consent state yet."
          }
          items={[
            truth.hasPriorityAlertChannels
              ? "Channel configuration exists enough to begin deeper consent and delivery validation."
              : "Delivery channels still need real activation before consent choices can be treated as operational user controls.",
            truth.hasSupportDelivery
              ? "Support and communication delivery are configured enough for consent-aware lifecycle testing."
              : "Subscriber messaging still needs stronger delivery readiness before consent scope becomes launch-trustworthy.",
            `Workspace snapshot timestamp: ${new Date(workspace.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}.`,
            `Delivery storage mode: ${deliveryStorageLabel}.`,
          ]}
          href="/admin/subscriber-launch-readiness"
          hrefLabel="Open subscriber readiness"
        />

        <SubscriberStatGrid
          items={[
            {
              label: truth.usesPreviewMode ? "Preview channels" : "Consent channels",
              value: workspace.consentSummary.consentChannels,
            },
            {
              label: truth.usesPreviewMode ? "Preview scopes" : "Lifecycle scopes",
              value: workspace.consentSummary.lifecycleScopes,
            },
            {
              label: truth.usesPreviewMode ? "Planned controls" : "User controls",
              value: workspace.consentSummary.userControls,
            },
            { label: "Mapped delivery channels", value: notificationMemory.channelRoutes.length },
            { label: "Recent delivery events", value: notificationMemory.recentEvents.length },
          ]}
        />

        <div className="grid gap-6">
          {workspace.consentItems.map((item) => (
            <GlowCard key={item.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{item.summary}</p>
                </div>
                <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                  {truth.usesPreviewMode ? "Preview" : item.status}
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Subscriber-facing consent posture</h2>
          <p className="mt-3 text-sm leading-7 text-mist/74">
            This panel now writes consent summaries into the shared workspace store, so the consent center, workspace hub, and recent workspace activity all reflect the same subscriber-facing posture instead of leaving consent copy static beside delivery updates.
          </p>
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <WorkspaceConsentItemUpdatePanel items={workspace.consentItems} />
            <WorkspaceConsentItemManagePanel items={workspace.consentItems} />
          </div>
        </GlowCard>

        <SubscriberAuditSection
          title="Consent-aware delivery registry"
          description="Channel routing and recent delivery events now roll up into one exportable registry from the subscriber side, so consent-aware messaging posture is portable instead of trapped across separate cards and queues."
          headline={`${notificationRegistrySummary.totalRows} delivery rows stitched across channel routing, events, and health states`}
          downloadHref="/api/notification-event-registry"
          downloadLabel="Download your delivery registry CSV"
          secondaryHref="/admin/delivery-layers"
          secondaryLabel="Open admin delivery layers"
          stats={[
            { label: "Registry rows", value: notificationRegistrySummary.totalRows },
            { label: "Channel routes", value: notificationRegistrySummary.channelRoutes },
            { label: "Delivery events", value: notificationRegistrySummary.deliveryEvents },
            { label: "Blocked or reconfirming", value: notificationRegistrySummary.blockedOrReconfirming },
            { label: "Queued or retrying", value: notificationRegistrySummary.queuedOrRetrying },
            { label: "Delivered or healthy", value: notificationRegistrySummary.deliveredOrHealthy },
          ]}
        />

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Channel mapping and delivery posture</h2>
          <p className="mt-3 text-sm leading-7 text-mist/74">
            {usesDurableDeliveryState
              ? "This route now reads from the shared private-beta account-state store for channel routing and recent delivery events, so consent-aware delivery continuity is no longer limited to the local preview file."
              : "This route now reads from the local notification-event memory store, and the panel below can write channel posture updates back into that lane so consent-aware delivery no longer stays read-only."}
          </p>
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <ConsentChannelUpdatePanel routes={notificationMemory.channelRoutes} />
            <ConsentChannelManagePanel routes={notificationMemory.channelRoutes} />
          </div>
          <div className="mt-5 grid gap-4">
            {notificationMemory.channelRoutes.map((route) => (
              <div key={route.channel} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{route.channel}</h3>
                    <p className="mt-2 text-sm text-mist/66">
                      {route.mappedScopes} · {route.preferenceSource}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em]">
                    <span className="rounded-full bg-white/[0.04] px-3 py-1 text-white/80">{route.consentStatus}</span>
                    <span className="rounded-full bg-white/[0.04] px-3 py-1 text-white/80">{route.deliveryState}</span>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{route.note}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Recent consent-aware delivery events</h2>
          <p className="mt-3 text-sm leading-7 text-mist/74">
            The panel below now writes new delivery-event rows back into the shared notification-event store, and email events move through the Resend-backed durable lane instead of pretending they were already delivered. Final provider truth resolves as queued, sent, failed, or skipped.
          </p>
          <p className="mt-3 text-xs leading-6 text-mist/58">Storage mode: {deliveryStorageLabel}.</p>
          <div className="mt-5">
            <NotificationEventCreatePanel events={notificationMemory.recentEvents} />
          </div>
          <div className="mt-5">
            <NotificationEventManagePanel
              items={notificationMemory.recentEvents.map((item) => ({
                id: item.id,
                title: item.title,
                channel: item.channel,
                deliveryState: item.deliveryState,
              }))}
            />
          </div>
          <div className="mt-5 grid gap-4">
            {notificationMemory.recentEvents.map((item) => (
              <div key={item.id} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm text-mist/66">
                      {item.channel} · {item.audienceScope} · {item.triggeredBy}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em]">
                    <span className="rounded-full bg-white/[0.04] px-3 py-1 text-white/80">{item.consentState}</span>
                    <span className="rounded-full bg-white/[0.04] px-3 py-1 text-white/80">{item.deliveryState}</span>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
                <p className="mt-2 text-xs text-mist/60">Next attempt: {item.nextAttempt}</p>
                {item.channel === "Email" ? (
                  <p className="mt-2 text-xs text-mist/56">
                    Email delivery: {item.emailDeliveryState}
                    {item.emailMessageId ? ` · message ${item.emailMessageId}` : ""}
                    {item.emailError ? ` · ${item.emailError}` : ""}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </GlowCard>

        <SubscriberRuleListSection title="Consent rules" rules={[...workspace.consentRules, ...notificationMemory.rules]} />
      </Container>
    </div>
  );
}
