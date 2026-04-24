import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SubscriberRecordGridSection } from "@/components/subscriber-record-grid-section";
import type { SubscriberRecordItem } from "@/components/subscriber-record-grid-section";
import { SubscriberStatGrid } from "@/components/subscriber-stat-grid";
import { SubscriberWorkspaceRegistrySection } from "@/components/subscriber-workspace-registry-section";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getPlaceholderHonestyRowByHref } from "@/lib/placeholder-honesty-registry";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getSubscriberWorkspaceRegistrySummary } from "@/lib/subscriber-workspace-registry";
import { getSubscriberWorkspaceMemory } from "@/lib/subscriber-workspace-store";

export const metadata: Metadata = {
  title: "Saved Screens",
  description: "Subscriber saved-screen workspaces for repeat stock, IPO, and fund review flows.",
};

export const dynamic = "force-dynamic";

export default async function AccountScreensPage() {
  const user = await requireUser();
  const truth = getSubscriberSurfaceTruth();
  const [workspace, workspaceRegistrySummary] = await Promise.all([
    getSubscriberWorkspaceMemory(user),
    getSubscriberWorkspaceRegistrySummary(user),
  ]);
  const placeholderTruth = getPlaceholderHonestyRowByHref("/account/screens");
  const usesDurableWorkspaceState = workspace.storageMode === "supabase_private_beta";
  const workspaceStorageLabel = usesDurableWorkspaceState
    ? "Supabase-backed private-beta workspace state"
    : "file-backed preview workspace state";
  const screenItems: SubscriberRecordItem[] =
    workspace.savedScreens.length > 0
      ? workspace.savedScreens.map((item) => ({
          id: item.title,
          title: item.title,
          badges: [
            {
              label: usesDurableWorkspaceState
                ? "Durable private-beta saved screen"
                : "File-backed saved screen",
              tone: usesDurableWorkspaceState ? "default" : "preview",
            },
            { label: item.repeatRunCapable ? "Repeat-capable" : "Manual review" },
            { label: item.sharedLayout ? "Shared layout" : "Private layout" },
          ],
          meta: item.type,
          note: item.note,
          footer: usesDurableWorkspaceState
            ? "This entry persists in the shared private-beta account-state store. The remaining gap is repeat-run and sharing proof, not seeded example cards."
            : "This entry persists in the fallback workspace file. The remaining gap is durable storage plus repeat-run and sharing proof, not seeded example cards.",
        }))
      : [
          {
            id: "empty-saved-screens",
            title: "No saved screens yet",
            badges: [
              {
                label: usesDurableWorkspaceState
                  ? "Durable private-beta workspace"
                  : "File-backed workspace",
                tone: usesDurableWorkspaceState ? "default" : "preview",
              },
            ],
            meta: "New accounts now start empty instead of inheriting saved-screen examples.",
            note: "Create a screen from the workspace hub when you actually want to preserve a repeat screener, compare view, or research layout.",
            footer: usesDurableWorkspaceState
              ? "This empty state is already tied to the shared private-beta account-state store for the signed-in account."
              : "This empty state is still tied to the fallback workspace file until the shared private-beta account-state store is available.",
            actionHref: "/account/workspace",
            actionLabel: "Open workspace hub",
          },
        ];

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Account", href: "/account" },
    { name: "Saved Screens", href: "/account/screens" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Repeat workflows</Eyebrow>
          <SectionHeading
            title="Saved screens"
            description="Keep your repeat screeners, compare views, and research layouts saved so daily review stays fast and consistent."
          />
        </div>

        <SubscriberTruthNotice
          eyebrow="Saved-state truth"
          title={usesDurableWorkspaceState ? "Saved screens now use durable private-beta state" : "Saved screens now use fallback file-backed state"}
          description={
            usesDurableWorkspaceState
              ? "This route now reads saved screens from the shared private-beta account-state store. New accounts start empty instead of inheriting seeded screen examples, and the remaining gap is repeat-run and sharing proof."
              : "This route still falls back to a file-backed workspace snapshot for the signed-in account, but new accounts now start empty instead of inheriting seeded screen examples."
          }
          items={[
            truth.hasLiveAuthContinuity
              ? "Auth continuity is strong enough to start validating true saved-screen persistence."
              : "The app still leans on local preview auth, so saved-screen ownership is not yet validated for real users.",
            `Workspace snapshot timestamp: ${new Date(workspace.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}.`,
            `Storage mode: ${workspaceStorageLabel}.`,
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
              label: "Saved screens",
              value: workspace.savedScreenSummary.savedScreens,
            },
            { label: "Repeat runs", value: workspace.savedScreenSummary.repeatRuns },
            { label: "Shared layouts", value: workspace.savedScreenSummary.sharedLayouts },
          ]}
        />

        <SubscriberWorkspaceRegistrySection
          title="Workspace registry coverage"
          description="Saved screens now sit in the same exportable workspace registry as watchlists, alert posture, inbox items, consent state, and recent activity, so repeat-review memory can be audited from one backend lane instead of living only on this page."
          headline={`${workspaceRegistrySummary.totalRows} rows connect saved-screen memory with watchlist and activity continuity`}
          downloadHref="/api/subscriber-workspace-registry"
          downloadLabel="Download workspace registry CSV"
          secondaryHref="/account/workspace"
          secondaryLabel="Open workspace hub"
          stats={[
            { label: "Registry rows", value: workspaceRegistrySummary.totalRows },
            { label: "Saved screens", value: workspaceRegistrySummary.screens },
            { label: "Watchlists", value: workspaceRegistrySummary.watchlists },
            { label: "Activity rows", value: workspaceRegistrySummary.activities },
          ]}
        />

        <SubscriberRecordGridSection
          title={workspace.savedScreens.length > 0 ? "Saved workflow screens" : "Empty saved-screen state"}
          description={
            usesDurableWorkspaceState
              ? "These screen cards now persist through the shared private-beta account-state store for this signed-in account."
              : "These screen cards still persist through the fallback workspace file for this signed-in account until durable private-beta storage is available."
          }
          items={screenItems}
        />
      </Container>
    </div>
  );
}
