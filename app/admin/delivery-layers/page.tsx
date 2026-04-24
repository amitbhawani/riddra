import type { Metadata } from "next";

import { ConsentChannelUpdatePanel } from "@/components/consent-channel-update-panel";
import { ConsentChannelManagePanel } from "@/components/consent-channel-manage-panel";
import { NotificationEventCreatePanel } from "@/components/notification-event-create-panel";
import { NotificationEventManagePanel } from "@/components/notification-event-manage-panel";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { deliveryLayerItems, deliveryLayerRules, deliveryLayersSummary } from "@/lib/delivery-layers";
import { listDurableJobRuns } from "@/lib/durable-jobs";
import { getAccountNotificationEventMemory, getNotificationEventBusMemory } from "@/lib/notification-event-memory-store";
import { getNotificationEventRegistrySummary } from "@/lib/notification-event-registry";

export const metadata: Metadata = {
  title: "Delivery Layers",
  description: "Protected delivery-layers page for canonical data, editorial records, derived outputs, and public delivery separation.",
};

export const dynamic = "force-dynamic";

export default async function AdminDeliveryLayersPage() {
  const user = await requireUser();
  const [notificationEventBus, accountNotificationMemory, notificationRegistrySummary, notificationJobRuns] = await Promise.all([
    getNotificationEventBusMemory(),
    getAccountNotificationEventMemory(user),
    getNotificationEventRegistrySummary(user, "admin"),
    listDurableJobRuns({ family: "notification", limit: 6 }),
  ]);

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Admin", href: "/admin" }, { name: "Delivery Layers", href: "/admin/delivery-layers" }]} />
          <Eyebrow>Layer separation</Eyebrow>
          <SectionHeading
            title="Delivery layers"
            description="This page defines how canonical data, editorial records, derived intelligence, and public-facing delivery artifacts stay separate as the platform scales."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Platform layers</p>
            <p className="mt-2 text-3xl font-semibold text-white">{deliveryLayersSummary.platformLayers}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Active artifacts</p>
            <p className="mt-2 text-3xl font-semibold text-white">{deliveryLayersSummary.activeArtifacts}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Rollout zones</p>
            <p className="mt-2 text-3xl font-semibold text-white">{deliveryLayersSummary.rolloutZones}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Mapped channels</p>
            <p className="mt-2 text-3xl font-semibold text-white">{notificationEventBus.summary.mappedChannels}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Queued delivery events</p>
            <p className="mt-2 text-3xl font-semibold text-white">{notificationEventBus.summary.queuedEvents}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Consent-blocked events</p>
            <p className="mt-2 text-3xl font-semibold text-white">{notificationEventBus.summary.blockedByConsent}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          {deliveryLayerItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Durable notification job lane</h2>
          <p className="mt-3 text-sm leading-7 text-mist/74">
            Notification summaries and account-change alerts now run through Trigger.dev. Treat these runs as the worker truth for notification delivery rather than inferring status only from the preview-friendly event bus.
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Recent runs</p>
              <p className="mt-2 text-3xl font-semibold text-white">{notificationJobRuns.summary.total}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Queued</p>
              <p className="mt-2 text-3xl font-semibold text-white">{notificationJobRuns.summary.queued}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Running</p>
              <p className="mt-2 text-3xl font-semibold text-white">{notificationJobRuns.summary.running}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Failed</p>
              <p className="mt-2 text-3xl font-semibold text-white">{notificationJobRuns.summary.failed}</p>
            </div>
          </div>
          <div className="mt-5">
            <a
              href="/api/admin/durable-jobs?family=notification&format=csv"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Download notification job runs
            </a>
          </div>
          <div className="mt-5 grid gap-4">
            {notificationJobRuns.items.length ? (
              notificationJobRuns.items.map((item) => (
                <div key={item.id} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-white">{item.label}</h3>
                      <p className="mt-2 text-sm text-mist/66">{item.taskId}</p>
                    </div>
                    <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-mist/74">
                    {item.errorMessage
                      ? item.errorMessage
                      : typeof item.metadata?.routeTarget === "string"
                        ? `Triggered from ${item.metadata.routeTarget}.`
                        : "No failure recorded on the latest run."}
                  </p>
                  <p className="mt-3 text-xs leading-6 text-mist/58">
                    Started {new Date(item.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · {item.id}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm leading-7 text-mist/74">
                Queue the first notification summary or account-change alert to start capturing durable worker history here.
              </div>
            )}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Consent-aware notification event bus</h2>
          <p className="mt-3 text-sm leading-7 text-mist/74">
            This lane now reads from the shared notification-event store, so channel mapping, retry posture, consent-aware suppression, and
            Resend-backed email status all stay visible in one backend surface instead of only static rollout notes.
          </p>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Registry rows</p>
              <p className="mt-2 text-lg font-semibold text-white">{notificationRegistrySummary.totalRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Channel routes</p>
              <p className="mt-2 text-lg font-semibold text-white">{notificationRegistrySummary.channelRoutes}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Delivery events</p>
              <p className="mt-2 text-lg font-semibold text-white">{notificationRegistrySummary.deliveryEvents}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Blocked or reconfirming</p>
              <p className="mt-2 text-lg font-semibold text-white">{notificationRegistrySummary.blockedOrReconfirming}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Queued or retrying</p>
              <p className="mt-2 text-lg font-semibold text-white">{notificationRegistrySummary.queuedOrRetrying}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Delivered or healthy</p>
              <p className="mt-2 text-lg font-semibold text-white">{notificationRegistrySummary.deliveredOrHealthy}</p>
            </div>
          </div>
          <div className="mt-5">
            <a
              href="/api/admin/notification-event-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Download delivery registry CSV
            </a>
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <ConsentChannelUpdatePanel
              endpoint="/api/admin/delivery-layers/channels"
              routes={accountNotificationMemory.channelRoutes}
              title="Update admin delivery routing"
              description="Write consent-aware channel posture through the dedicated admin delivery-layers API instead of routing this operations desk through the subscriber consent endpoint."
              actionLabel="Save admin routing"
            />
            <ConsentChannelManagePanel
              endpoint="/api/admin/delivery-layers/channels"
              routes={accountNotificationMemory.channelRoutes}
              title="Manage admin delivery routing"
              description="Remove stale channel mappings through the dedicated admin delivery-layers API when this operations desk needs routing cleanup instead of more subscriber-side saves."
              emptyMessage="Keeps the admin delivery-layers desk from relying on the subscriber consent route for channel cleanup."
            />
          </div>
          <div className="mt-5">
            <NotificationEventCreatePanel
              endpoint="/api/admin/delivery-layers/events"
              events={notificationEventBus.sharedEvents}
              title="Record admin delivery event"
              description="Append consent-aware delivery rows through the dedicated admin delivery-layers API instead of routing the operations desk through the subscriber event endpoint."
              actionLabel="Save admin delivery event"
            />
          </div>
          <div className="mt-5">
            <NotificationEventManagePanel
              endpoint="/api/admin/delivery-layers/events"
              items={notificationEventBus.sharedEvents.map((item) => ({
                id: item.id,
                title: item.title,
                channel: item.channel,
                deliveryState: item.deliveryState,
              }))}
              title="Manage admin delivery events"
              description="Remove stale delivery rows through the dedicated admin delivery-layers API when the operations desk needs cleanup instead of leaning on the subscriber consent event route."
              emptyMessage="Keeps the admin delivery-event bus from relying on the subscriber consent route for event cleanup."
            />
          </div>
          <div className="mt-5 grid gap-4">
            {notificationEventBus.sharedEvents.map((item) => (
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

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Layer rules</h2>
          <div className="mt-5 grid gap-3">
            {[...deliveryLayerRules, ...notificationEventBus.rules].map((rule) => (
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
