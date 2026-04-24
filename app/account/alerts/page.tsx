import type { Metadata } from "next";
import Link from "next/link";

import { AlertFeedManagePanel } from "@/components/alert-feed-manage-panel";
import { AlertFeedUpdatePanel } from "@/components/alert-feed-update-panel";
import { AlertPreferenceManagePanel } from "@/components/alert-preference-manage-panel";
import { AlertPreferenceUpdatePanel } from "@/components/alert-preference-update-panel";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { SubscriberRecordGridSection } from "@/components/subscriber-record-grid-section";
import type { SubscriberRecordItem } from "@/components/subscriber-record-grid-section";
import { SubscriberStatGrid } from "@/components/subscriber-stat-grid";
import { SubscriberWorkspaceRegistrySection } from "@/components/subscriber-workspace-registry-section";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getSubscriberWorkspaceRegistrySummary } from "@/lib/subscriber-workspace-registry";
import { getSubscriberWorkspaceMemory } from "@/lib/subscriber-workspace-store";

export const metadata: Metadata = {
  title: "Alert Preferences",
  description: "Manage alert channels and review recent high-signal updates across email, inbox, WhatsApp, and SMS.",
};

export default async function AccountAlertsPage() {
  const user = await requireUser();
  const truth = getSubscriberSurfaceTruth();
  const [workspace, workspaceRegistrySummary] = await Promise.all([
    getSubscriberWorkspaceMemory(user),
    getSubscriberWorkspaceRegistrySummary(user),
  ]);
  const alertFeedItems: SubscriberRecordItem[] =
    workspace.alertFeed.length > 0
      ? workspace.alertFeed.map((item) => ({
          id: `${item.title}-${item.timestamp}`,
          title: item.title,
          badges: [{ label: item.channel }, { label: item.status }],
          meta: item.timestamp,
          note: item.summary,
        }))
      : [
          {
            id: "empty-alert-feed",
            title: "No saved alert-feed rows yet",
            badges: [{ label: "Per-user empty state", tone: "preview" }],
            meta: "New accounts now start without inherited alert-feed examples.",
            note: "Create a feed row only when you actually want to retain a signal or delivery event for this signed-in account.",
            actionHref: "/account/workspace",
            actionLabel: "Open workspace hub",
          },
        ];
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Account", href: "/account" },
    { name: "Alert Preferences", href: "/account/alerts" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <JsonLd
        data={buildWebPageSchema({
          title: "Alert Preferences",
          description: "Manage alert channels and review recent high-signal updates across email, inbox, WhatsApp, and SMS.",
          path: "/account/alerts",
        })}
      />
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Subscriber workspace</Eyebrow>
          <SectionHeading
            title="Alert preferences"
            description="Control alert intensity, choose your channels, and keep important market or portfolio signals easy to review."
          />
        </div>

        <SubscriberTruthNotice
          eyebrow="Delivery truth"
          title="Alert routing is still partially staged"
          description="In-app structure now persists through the signed-in workspace state, but WhatsApp, SMS, push, and broader transactional delivery are not fully activated yet. New accounts also start without inherited alert-feed examples, so this page stays honest about what is configured versus what has actually been retained."
          items={[
            truth.hasPriorityAlertChannels
              ? "At least one priority alert channel is configured, but end-to-end delivery still needs validation."
              : "Priority delivery channels are still not configured, so urgent alert routing remains staged.",
            truth.hasSupportDelivery
              ? "Transactional delivery credentials exist for later onboarding and billing communication flows."
              : "Transactional delivery is still missing, so alert communication trust remains partial.",
            `Workspace snapshot timestamp: ${new Date(workspace.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}.`,
          ]}
          currentState="Persisted preview alert preferences and feed items for the signed-in account"
          expectedState="Verified per-user alert memory with delivery-confirmed email, WhatsApp, SMS, push, and inbox continuity"
          href="/admin/communication-readiness"
          hrefLabel="Open communication readiness"
          secondaryHref="/admin/public-launch-qa"
          secondaryHrefLabel="Open launch QA"
        />

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Signal controls</h2>
            <div className="mt-5">
              <SubscriberRecordGridSection
                title="Preference cards"
                items={workspace.alertPreferences.map((item) => ({
                  id: item.label,
                  title: item.label,
                  badges: [{ label: item.defaultState }],
                  note: item.note,
                }))}
              />
            </div>
          </GlowCard>

          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Channel strategy</h2>
            <div className="mt-5 space-y-3 text-sm leading-7 text-mist/74">
              <p>In-app inbox is the default source of truth for every alert.</p>
              <p>Email handles summaries, explainers, and revisit prompts.</p>
              <p>WhatsApp and SMS are reserved for high-signal reminders and urgent changes.</p>
              <p>Mobile alerts follow the same preference rules so every channel stays consistent.</p>
            </div>
            <Link
              href="/account/inbox"
              className="mt-6 inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Open inbox
            </Link>
          </GlowCard>
        </div>

        <SubscriberWorkspaceRegistrySection
          title="Alert registry coverage"
          description="Alert preferences and recent feed rows now flow into the shared workspace registry too, so alert posture can be audited from one exportable backend slice instead of living only inside this page."
          headline={`${workspaceRegistrySummary.totalRows} rows of alert, workspace, and activity continuity visible from the alert desk`}
          downloadHref="/api/subscriber-workspace-registry"
          downloadLabel="Download workspace registry CSV"
          secondaryHref="/account/workspace"
          secondaryLabel="Open workspace hub"
          stats={[
            { label: "Registry rows", value: workspaceRegistrySummary.totalRows },
            { label: "Alert prefs", value: workspaceRegistrySummary.alertPreferences },
            { label: "Alert feed", value: workspaceRegistrySummary.alertFeed },
            { label: "Activity rows", value: workspaceRegistrySummary.activities },
          ]}
        />

        <SubscriberStatGrid
          items={[
            {
              label: "Configured channels",
              value: workspace.alertPreferences.length,
              detail: "Channel and intensity controls now persist for the signed-in account inside the workspace preview lane.",
            },
            {
              label: "Saved feed rows",
              value: workspace.alertFeed.length,
              detail: "Important alert summaries now flow through the same saved workspace memory, and new accounts start empty instead of inheriting staged feed rows.",
            },
          ]}
        />

        <SubscriberRecordGridSection
          title={workspace.alertFeed.length > 0 ? "Recent important alerts" : "Empty alert-feed state"}
          items={alertFeedItems}
        />

        <div className="grid gap-6 xl:grid-cols-2">
          <AlertPreferenceUpdatePanel items={workspace.alertPreferences} />
          <AlertPreferenceManagePanel items={workspace.alertPreferences} />
          <AlertFeedUpdatePanel items={workspace.alertFeed} />
          <AlertFeedManagePanel items={workspace.alertFeed} />
        </div>
      </Container>
    </div>
  );
}
