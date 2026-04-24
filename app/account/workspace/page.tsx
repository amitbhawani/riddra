import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { SubscriberActivityLogSection } from "@/components/subscriber-activity-log-section";
import { SubscriberRecordGridSection } from "@/components/subscriber-record-grid-section";
import { SubscriberRouteLinkGrid } from "@/components/subscriber-route-link-grid";
import { SubscriberStatGrid } from "@/components/subscriber-stat-grid";
import { SubscriberWorkspaceRegistrySection } from "@/components/subscriber-workspace-registry-section";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { WorkspaceQuickAddPanel } from "@/components/workspace-quick-add-panel";
import { WorkspaceConsentItemUpdatePanel } from "@/components/workspace-consent-item-update-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { workspaceModules } from "@/lib/account-workspace";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getSubscriberWorkspaceContinuitySummary } from "@/lib/subscriber-workspace-continuity";
import { getSubscriberWorkspaceRegistrySummary } from "@/lib/subscriber-workspace-registry";
import { getSubscriberWorkspaceMemory } from "@/lib/subscriber-workspace-store";

export const metadata: Metadata = {
  title: "Workspace",
  description: "Subscriber workspace hub for watchlists, saved screens, broker links, billing, and repeat-use product flows.",
};

export const dynamic = "force-dynamic";

export default async function AccountWorkspacePage() {
  const user = await requireUser();
  const truth = getSubscriberSurfaceTruth();
  const [workspace, workspaceRegistrySummary, continuitySummary] = await Promise.all([
    getSubscriberWorkspaceMemory(user),
    getSubscriberWorkspaceRegistrySummary(user),
    getSubscriberWorkspaceContinuitySummary(user, {
      route: "/account/workspace",
      action: "Loaded workspace hub",
    }),
  ]);
  const usesDurableWorkspaceState = workspace.storageMode === "supabase_private_beta";
  const workspaceStorageLabel = usesDurableWorkspaceState
    ? "Supabase-backed private-beta workspace state"
    : "file-backed preview workspace state";

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Account", href: "/account" },
    { name: "Workspace", href: "/account/workspace" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Subscriber workspace</Eyebrow>
          <SectionHeading
            title="Workspace hub"
            description="Use one workspace hub to move between saved context, action queues, broker reviews, billing, and repeat research flows."
          />
        </div>

        <SubscriberTruthNotice
          eyebrow="Workspace truth"
          title="This hub now explains workspace continuity from stored account records"
          description={
            usesDurableWorkspaceState
              ? "This workspace hub now reads from the shared private-beta account-state store and a shared account continuity ledger that ties auth mode, saved workspace state, brokers, support, delivery, and entitlement placeholders together for the signed-in account."
              : "This workspace route still falls back to file-backed preview storage, but it now reads through a shared account continuity ledger that ties auth mode, saved workspace state, brokers, support, delivery, and entitlement placeholders together for the signed-in account."
          }
          items={[
            continuitySummary.accountState.auth.note,
            `Workspace snapshot timestamp: ${new Date(workspace.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}.`,
            `Recent persisted workspace actions: ${workspace.activitySummary.entries}.`,
            `Storage mode: ${workspaceStorageLabel}.`,
            continuitySummary.accountState.blockers[0] ?? "No additional continuity blocker is currently recorded for this account.",
          ]}
          href="/admin/subscriber-launch-readiness"
          hrefLabel="Open subscriber readiness"
        />

        <SubscriberStatGrid
          items={[
            {
              label: truth.usesPreviewMode ? "Persisted preview lists" : "Saved lists",
              value: workspace.watchlistSummary.activeLists,
            },
            {
              label: truth.usesPreviewMode ? "Persisted preview screens" : "Saved screens",
              value: workspace.savedScreenSummary.savedScreens,
            },
            {
              label: truth.usesPreviewMode ? "Preview inbox items" : "Inbox items",
              value: workspace.inboxItems.length,
            },
            {
              label: truth.usesPreviewMode ? "Persisted preview actions" : "Recent actions",
              value: workspace.activitySummary.entries,
            },
            {
              label: "Session continuity",
              value: continuitySummary.accountState.auth.sessionReliability,
            },
            {
              label: "Open blockers",
              value: continuitySummary.accountState.blockers.length,
            },
          ]}
        />

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Workspace write APIs</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-mist/74">
            This workspace lane is no longer read-only. These quick actions now write and remove watchlist and saved-screen rows
            inside {usesDurableWorkspaceState ? "the shared private-beta account-state store" : "the fallback workspace file"},
            which turns the lane from static preview memory into a real save-and-manage path.
          </p>
          <div className="mt-5">
            <WorkspaceQuickAddPanel
              storageMode={workspace.storageMode}
              currentWatchlists={workspace.watchlists}
              currentScreens={workspace.savedScreens}
            />
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Consent posture writes</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-mist/74">
            Consent summaries now have a first-class workspace save path too, so subscriber-facing consent posture can be updated inside the same backend lane that tracks watchlists, screens, alerts, inbox state, and recent workspace activity.
          </p>
          <div className="mt-5">
            <WorkspaceConsentItemUpdatePanel items={workspace.consentItems} />
          </div>
        </GlowCard>

        <SubscriberWorkspaceRegistrySection
          title="Workspace registry"
          description="This workspace lane now has a shared registry export, so watchlists, alert preferences, alert feed rows, saved screens, inbox state, consent posture, and recent workspace activity can be reviewed as one backend slice instead of only through separate account pages."
          headline={`${workspaceRegistrySummary.totalRows} registry rows stitched across saved-state, delivery, and activity continuity`}
          downloadHref="/api/subscriber-workspace-registry"
          downloadLabel="Download workspace registry CSV"
          secondaryHref="/build-tracker"
          secondaryLabel="Open build tracker"
          stats={[
            { label: "Registry rows", value: workspaceRegistrySummary.totalRows },
            { label: "Watchlists", value: workspaceRegistrySummary.watchlists },
            { label: "Alert prefs", value: workspaceRegistrySummary.alertPreferences },
            { label: "Alert feed", value: workspaceRegistrySummary.alertFeed },
            { label: "Saved screens", value: workspaceRegistrySummary.screens },
            { label: "Inbox rows", value: workspaceRegistrySummary.inbox },
            { label: "Consent rows", value: workspaceRegistrySummary.consents },
            { label: "Activity rows", value: workspaceRegistrySummary.activities },
          ]}
        />

        <SubscriberStatGrid
          items={[
            {
              label: "Linked backend rows",
              value: continuitySummary.totalRows,
              detail: "Workspace, portfolio, broker, billing, entitlement, support, and delivery continuity stitched together.",
            },
            {
              label: "Connected lanes",
              value: continuitySummary.connectedLanes,
              detail: "How many subscriber backend lanes are now visible from this one workspace surface.",
            },
            {
              label: "Lanes needing attention",
              value: continuitySummary.lanesNeedingAttention,
              detail: "The lanes that still hold unresolved review, delivery, or recovery work.",
            },
            {
              label: "Open follow-ups",
              value: continuitySummary.openFollowUps,
              detail: "Combined follow-up count across portfolio, broker, billing, entitlements, delivery, and support.",
            },
            {
              label: "Last continuity sync",
              value: new Date(continuitySummary.accountState.updatedAt).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              }),
              detail: continuitySummary.accountState.lastAction,
            },
          ]}
        />

        <SubscriberRecordGridSection
          title="Account continuity details"
          description="The workspace hub now carries the shared account continuity record too, so route-level workspace state can be explained alongside auth mode, preference counts, support and delivery state, and entitlement placeholders."
          items={[
            {
              id: "workspace-auth",
              title: "Auth continuity",
              badges: [
                {
                  label: continuitySummary.accountState.auth.sessionReliability,
                  tone: continuitySummary.accountState.auth.sessionReliability === "Verified" ? "default" : "preview",
                },
              ],
              meta: `${continuitySummary.accountState.auth.label} · ${continuitySummary.accountState.lastRoute}`,
              note: continuitySummary.accountState.auth.note,
              footer: `Continuity key ${continuitySummary.accountState.userKey}`,
            },
            {
              id: "workspace-preferences",
              title: "Persistent user preferences",
              meta: `${continuitySummary.accountState.preferences.watchlists} watchlists · ${continuitySummary.accountState.preferences.savedScreens} screens · ${continuitySummary.accountState.preferences.alertPreferences} alert preferences`,
              note: `${continuitySummary.accountState.preferences.consentItems} consent items, ${continuitySummary.accountState.preferences.consentChannels} delivery channels, and ${continuitySummary.accountState.preferences.inboxItems} inbox items are stored against the signed-in account.`,
            },
            {
              id: "workspace-support-delivery",
              title: "Support and delivery state",
              meta: `${continuitySummary.accountState.supportAndDelivery.supportRequests} support requests · ${continuitySummary.accountState.supportAndDelivery.deliveryEvents} delivery events`,
              note: `${continuitySummary.accountState.supportAndDelivery.openSupportRequests} open support requests and ${continuitySummary.accountState.supportAndDelivery.deliveryRoutes} channel routes now survive reloads because they come from stored records, not local cards.`,
            },
            {
              id: "workspace-entitlements",
              title: "Entitlement placeholders",
              badges: [
                {
                  label: continuitySummary.accountState.entitlements.syncState,
                  tone: continuitySummary.accountState.entitlements.syncState === "Synced" ? "default" : "preview",
                },
              ],
              meta: `${continuitySummary.accountState.entitlements.planLabel} · ${continuitySummary.accountState.entitlements.lifecycleState}`,
              note: "Billing is still deferred, but account access posture is now explainable from stored entitlement rows and billing-placeholder records.",
            },
          ]}
        />

        <SubscriberRecordGridSection
          title="Cross-module continuity"
          description="Workspace continuity now reaches beyond saved state alone. This stitched view pulls in the linked portfolio, broker, billing, entitlement, delivery, and support lanes so the signed-in workspace can act like a real continuity hub instead of an isolated preview island."
          items={continuitySummary.lanes.map((lane) => ({
            id: lane.id,
            title: lane.title,
            badges: [
              {
                label: lane.status,
                tone: lane.attentionCount > 0 ? "preview" : "default",
              },
              {
                label: lane.attentionCount > 0 ? `${lane.attentionCount} follow-up` : `${lane.healthyCount} healthy`,
                tone: lane.attentionCount > 0 ? "preview" : "default",
              },
            ],
            meta: lane.metric,
            note: lane.note,
            footer: `${lane.totalRows} linked rows · ${lane.storageMode.replaceAll("_", " ")} · ${new Date(lane.lastUpdatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`,
            actionHref: lane.href,
            actionLabel: "Open lane",
          }))}
        />

        <SubscriberRouteLinkGrid
          items={[
            {
              href: "/api/account/workspace/continuity",
              title: "Download continuity CSV",
              note: "Export the stitched subscriber continuity view across workspace, portfolio, broker, billing, entitlement, delivery, and support.",
            },
            {
              href: "/api/account/workspace/continuity?format=json",
              title: "Open continuity JSON",
              note: "Inspect the same continuity model as structured data while the workspace lane keeps moving toward production-backed persistence.",
            },
          ]}
        />

        <SubscriberActivityLogSection
          title="Recent workspace activity"
          description={
            usesDurableWorkspaceState
              ? "Every watchlist, saved-screen, alert, and inbox write now appends a recent activity entry into the same durable private-beta workspace record, which makes this lane auditable instead of only mutable."
              : "Every watchlist, saved-screen, alert, and inbox write now appends a recent activity entry into the same fallback workspace record, which makes this lane auditable instead of only mutable."
          }
          items={workspace.activityLog.slice(0, 6).map((entry) => ({
            id: entry.id,
            title: entry.title,
            scope: entry.scope.replaceAll("_", " "),
            action: entry.action,
            detail: entry.detail,
            timestamp: new Date(entry.timestamp).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            }),
          }))}
        />

        <SubscriberRouteLinkGrid
          items={workspaceModules.map((item) => ({
            href: item.href,
            title: item.title,
            note: item.note,
          }))}
        />

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Subscriber audit routes</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-mist/74">
            Use these protected routes to review entitlement posture, billing recovery, and subscriber support without digging through admin-only surfaces.
          </p>
          <div className="mt-5">
            <SubscriberRouteLinkGrid
              items={[
                {
                  href: "/account/access/entitlements",
                  title: "Entitlement audit",
                  note: "Review plan coverage, synced entitlements, and route-level access posture.",
                },
                {
                  href: "/account/billing/recovery",
                  title: "Billing recovery",
                  note: "Review failed-charge, halt, and fallback-access expectations from one protected route.",
                },
                {
                  href: "/account/billing/lifecycle",
                  title: "Billing lifecycle",
                  note: "Review activation, renewal, and downgrade posture from one subscriber-safe route.",
                },
                {
                  href: "/account/support",
                  title: "Account support",
                  note: "Review support channels, recovery posture, and subscriber-safe next steps in one place.",
                },
              ]}
            />
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
