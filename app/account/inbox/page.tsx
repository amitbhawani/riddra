import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { InboxItemManagePanel } from "@/components/inbox-item-manage-panel";
import { InboxItemUpdatePanel } from "@/components/inbox-item-update-panel";
import { JsonLd } from "@/components/json-ld";
import { SubscriberRecordGridSection } from "@/components/subscriber-record-grid-section";
import type { SubscriberRecordItem } from "@/components/subscriber-record-grid-section";
import { SubscriberStatGrid } from "@/components/subscriber-stat-grid";
import { SubscriberWorkspaceRegistrySection } from "@/components/subscriber-workspace-registry-section";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getPlaceholderHonestyRowByHref } from "@/lib/placeholder-honesty-registry";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getSubscriberWorkspaceRegistrySummary } from "@/lib/subscriber-workspace-registry";
import { getSubscriberWorkspaceMemory } from "@/lib/subscriber-workspace-store";

export const metadata: Metadata = {
  title: "Inbox",
  description: "Subscriber inbox for portfolio reviews, IPO reminders, index signals, and Riddra action items.",
};

export default async function AccountInboxPage() {
  const user = await requireUser();
  const truth = getSubscriberSurfaceTruth();
  const [workspace, workspaceRegistrySummary] = await Promise.all([
    getSubscriberWorkspaceMemory(user),
    getSubscriberWorkspaceRegistrySummary(user),
  ]);
  const placeholderTruth = getPlaceholderHonestyRowByHref("/account/inbox");
  const inboxItems: SubscriberRecordItem[] =
    workspace.inboxItems.length > 0
      ? workspace.inboxItems.map((item) => ({
          id: `${item.title}-${item.timestamp}`,
          title: item.title,
          badges: [{ label: item.priority }, { label: item.status }],
          meta: `${item.timestamp} · ${item.source}`,
          note: item.summary,
          actionHref: item.actionHref,
          actionLabel: item.actionLabel,
        }))
      : [
          {
            id: "empty-inbox",
            title: "No saved inbox items yet",
            badges: [{ label: "Per-user empty state", tone: "preview" }],
            meta: "New accounts now start without inherited inbox examples.",
            note: "This route will stay empty until this signed-in account actually receives or saves a task, reminder, or review item.",
            actionHref: "/account/workspace",
            actionLabel: "Open workspace hub",
          },
        ];
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Account", href: "/account" },
    { name: "Inbox", href: "/account/inbox" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <JsonLd
        data={buildWebPageSchema({
          title: "Inbox",
          description: "Subscriber inbox for portfolio reviews, IPO reminders, index signals, and Riddra action items.",
          path: "/account/inbox",
        })}
      />
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Subscriber workspace</Eyebrow>
          <SectionHeading
            title="Account inbox"
            description="See portfolio tasks, IPO milestones, market signals, and other high-priority updates in one action-focused inbox."
          />
        </div>

        <SubscriberTruthNotice
          eyebrow="Inbox truth"
          title="This inbox is still a protected preview feed"
          description="The routing and action patterns are real, and inbox items now persist through signed-in workspace state, but this is still staged subscriber memory rather than final delivery-confirmed inbox truth. New accounts also start empty instead of inheriting canned tasks."
          items={[
            truth.hasLiveAuthContinuity
              ? "Auth continuity is strong enough to start validating durable inbox ownership."
              : "The app still leans on local preview auth, so inbox ownership is not yet validated for outside users.",
            truth.hasPriorityAlertChannels
              ? "Priority alert channels are configured enough for deeper inbox-delivery validation."
              : "Priority delivery channels still need real activation before this inbox can be treated as a live subscriber queue.",
            `Workspace snapshot timestamp: ${new Date(workspace.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}.`,
          ]}
          currentState={placeholderTruth?.currentState}
          expectedState={placeholderTruth?.expectedState}
          href="/admin/subscriber-launch-readiness"
          hrefLabel="Open subscriber readiness"
          secondaryHref="/admin/public-launch-qa"
          secondaryHrefLabel="Open placeholder honesty"
        />

        <SubscriberStatGrid
          items={[
            {
              label: "Purpose",
              value: truth.usesPreviewMode ? "Preview action queue" : "Action queue",
              detail: "Use the inbox as the calm place to review signals that need action or deserve a second look.",
            },
            {
              label: "Signal standard",
              value: "High signal only",
              detail: "This feed stays selective. Every item is meant to help you act or make the market easier to understand.",
            },
            {
              label: "AI support",
              value: "Summarize and explain",
              detail: "AI makes each alert easier to understand, not noisier or more speculative.",
            },
          ]}
        />

        <SubscriberWorkspaceRegistrySection
          title="Workspace registry coverage"
          description="Inbox items now sit in the same exportable workspace registry as watchlists, alert posture, saved screens, consent state, and recent activity, so subscriber task continuity can be audited from one backend slice instead of only through this inbox feed."
          headline={`${workspaceRegistrySummary.totalRows} rows tie inbox actions back to saved-state and activity continuity`}
          downloadHref="/api/subscriber-workspace-registry"
          downloadLabel="Download workspace registry CSV"
          secondaryHref="/account/workspace"
          secondaryLabel="Open workspace hub"
          stats={[
            { label: "Registry rows", value: workspaceRegistrySummary.totalRows },
            { label: "Inbox rows", value: workspaceRegistrySummary.inbox },
            {
              label: "Watchlists + screens",
              value: workspaceRegistrySummary.watchlists + workspaceRegistrySummary.screens,
            },
            { label: "Activity rows", value: workspaceRegistrySummary.activities },
          ]}
        />

        <SubscriberRecordGridSection
          title={workspace.inboxItems.length > 0 ? "Recent items" : "Empty inbox state"}
          items={inboxItems}
        />

        <div className="grid gap-6 xl:grid-cols-2">
          <InboxItemUpdatePanel items={workspace.inboxItems} />
          <InboxItemManagePanel items={workspace.inboxItems} />
        </div>
      </Container>
    </div>
  );
}
