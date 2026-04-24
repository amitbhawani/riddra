import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { SubscriberAuditSection } from "@/components/subscriber-audit-section";
import { SubscriberRouteLinkGrid } from "@/components/subscriber-route-link-grid";
import { SubscriberRuleListSection } from "@/components/subscriber-rule-list-section";
import { SubscriberStatGrid } from "@/components/subscriber-stat-grid";
import { EntitlementHistoryManagePanel } from "@/components/entitlement-history-manage-panel";
import { EntitlementOverridePanel } from "@/components/entitlement-override-panel";
import { EntitlementOverrideManagePanel } from "@/components/entitlement-override-manage-panel";
import { EntitlementSyncChangePanel } from "@/components/entitlement-sync-change-panel";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getEntitlementAuditRows, entitlementAuditRules } from "@/lib/account-entitlement-audit";
import { getUserEntitlements } from "@/lib/content";
import { getEntitlementSyncRegistrySummary } from "@/lib/entitlement-sync-registry";
import { getAccountEntitlementSyncMemory } from "@/lib/entitlement-sync-memory-store";
import { getCurrentPlanTier } from "@/lib/plan-gating";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";

export const metadata: Metadata = {
  title: "Entitlement Audit",
  description: "Review plan coverage, entitlement sync posture, and private-beta access expectations from stored records.",
};

export const dynamic = "force-dynamic";

export default async function AccountEntitlementsPage() {
  const user = await requireUser();
  const currentPlan = await getCurrentPlanTier();
  const liveEntitlements = await getUserEntitlements(user);
  const [entitlementMemory, entitlementRegistrySummary] = await Promise.all([
    getAccountEntitlementSyncMemory(user, currentPlan.plan),
    getEntitlementSyncRegistrySummary(user),
  ]);
  const usesDurableEntitlementState = entitlementMemory.storageMode === "supabase_private_beta";
  const syncedEntitlements =
    liveEntitlements.length > 0
      ? liveEntitlements
      : entitlementMemory.entitlements.map((item) => ({
          featureCode: item.featureCode,
          accessLevel: item.accessLevel,
        }));
  const truth = getSubscriberSurfaceTruth();
  const auditRows = getEntitlementAuditRows(currentPlan.plan);

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Account", href: "/account" },
    { name: "Access", href: "/account/access" },
    { name: "Entitlements", href: "/account/access/entitlements" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Subscriber audit</Eyebrow>
          <SectionHeading
            title="Entitlement audit"
            description="Use this protected route to see how the current plan, synced entitlements, and deferred-commercial access expectations line up inside the subscriber workspace."
          />
        </div>

        <SubscriberTruthNotice
          eyebrow="Entitlement truth"
          title="This route audits access posture more honestly than the workspace summary alone"
          description="The access model is now explainable from stored entitlement-sync rows and account continuity records, but private beta still treats commercial billing as intentionally deferred rather than as a live payment authority."
          items={[
            truth.hasLiveAuthContinuity
              ? "Public auth continuity is active enough to validate real account identity."
              : "Auth continuity still needs final provider-backed proof, so this route should keep showing stored access posture instead of pretending every outside-user path is fully verified.",
            truth.hasBillingWebhook
              ? "Webhook signing exists in code, but commercial billing remains intentionally deferred while private beta relies on stored entitlement placeholders and support-led access control."
              : "Commercial billing is intentionally deferred, so entitlement trust here comes from stored sync rows and account continuity records rather than live payment proof.",
            usesDurableEntitlementState
              ? "Per-account entitlement posture now persists in the shared private-beta account-state store, and the cross-account entitlement audit now reads from the shared durable operator snapshot lane."
              : "Entitlement posture still falls back to the local entitlement-sync file because the shared private-beta account-state store is unavailable.",
          ]}
          href="/admin/entitlements"
          hrefLabel="Open admin entitlements"
        />

        <SubscriberStatGrid
          items={[
            {
              label: "Current plan posture",
              value: currentPlan.isAdmin ? "Admin preview" : `${currentPlan.label} plan`,
            },
            { label: "Synced entitlements", value: syncedEntitlements.length },
            {
              label: "Access posture",
              value: `${truth.usesPreviewMode ? "Stored-record beta posture" : "Verified enough to test"} · ${entitlementMemory.syncState}`,
            },
          ]}
        />

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Synced entitlement state</h2>
          <p className="mt-3 text-sm leading-7 text-mist/74">
            This route now reads the stored entitlement-sync lane when live database entitlements are still missing, so
            plan-linked access posture, lifecycle state, and recent sync history stay visible together without requiring live billing to be active first.
          </p>
          <p className="mt-2 text-xs leading-6 text-mist/56">
            Storage mode: {entitlementMemory.storageMode.replaceAll("_", " ")}
          </p>
          <div className="mt-5 grid gap-3">
            {syncedEntitlements.length > 0 ? (
              syncedEntitlements.map((item) => (
                <div
                  key={item.featureCode}
                  className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76"
                >
                  <span className="font-semibold text-white">{item.featureCode}</span>
                  <span className="mt-2 block text-mist/70">{item.accessLevel}</span>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-4 py-4 text-sm leading-7 text-mist/74">
                No synced entitlements are attached to this account yet. This route should show plan expectations and stored-state gaps clearly instead of pretending commercial billing is already live.
              </div>
            )}
          </div>
        </GlowCard>

        <SubscriberAuditSection
          title="Shared entitlement registry"
          description="The subscriber entitlement audit now exposes the same stitched registry lane as the admin desk, but scoped to this signed-in account so access history is exportable here instead of living only in backend review."
          headline={`${entitlementRegistrySummary.totalRows} registry rows with ${entitlementRegistrySummary.syncedRows} synced and ${entitlementRegistrySummary.reviewRows} needing review`}
          downloadHref="/api/entitlement-sync-registry"
          downloadLabel="Download your entitlement registry CSV"
          secondaryHref="/admin/entitlements"
          secondaryLabel="Open admin entitlement audit"
          stats={[
            { label: "Registry rows", value: entitlementRegistrySummary.totalRows },
            { label: "Synced rows", value: entitlementRegistrySummary.syncedRows },
            { label: "Needs review", value: entitlementRegistrySummary.reviewRows },
            { label: "Automated rows", value: entitlementRegistrySummary.automatedRows },
          ]}
        />

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Recent synced access changes</h2>
          <p className="mt-3 text-sm leading-7 text-mist/74">
            The panel below now writes new entitlement sync-change rows back into the shared entitlement memory lane, so access transitions can be recorded and reviewed instead of only inferred from staged billing examples.
          </p>
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <EntitlementSyncChangePanel items={entitlementMemory.entitlements} />
            <EntitlementHistoryManagePanel
              items={entitlementMemory.recentHistory.map((item) => ({
                id: item.id,
                featureCode: item.featureCode,
                changedAt: item.changedAt,
                nextLevel: item.nextLevel,
                syncState: item.syncState,
              }))}
            />
          </div>
          <div className="mt-5 grid gap-4">
            {entitlementMemory.recentHistory.length > 0 ? (
              entitlementMemory.recentHistory.map((item) => (
                <div key={item.id} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-white">{item.featureCode}</h3>
                      <p className="mt-2 text-sm text-mist/66">
                        {item.changedAt} · {entitlementMemory.lifecycleState}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em]">
                      <span className="rounded-full bg-white/[0.04] px-3 py-1 text-white/80">{item.previousLevel}</span>
                      <span className="rounded-full bg-white/[0.04] px-3 py-1 text-white/80">{item.nextLevel}</span>
                      <span className="rounded-full bg-white/[0.04] px-3 py-1 text-white/80">{item.syncState}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-mist/74">
                    Reason: {item.reason} · Actor: {item.actorType} ({item.actorRef})
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-4 py-4 text-sm leading-7 text-mist/74">
                No entitlement-sync history is attached to this account yet. This route should show sync-state gaps clearly instead of implying that commercial billing must already be live for access posture to be explainable.
              </div>
            )}
          </div>
        </GlowCard>

        <div className="grid gap-5 xl:grid-cols-2">
          <EntitlementOverridePanel items={entitlementMemory.entitlements} />
          <EntitlementOverrideManagePanel
            items={entitlementMemory.recentHistory
              .filter((item) => item.actorType !== "system")
              .map((item) => ({
                id: item.id,
                actorType: item.actorType,
                changedAt: item.changedAt,
                featureCode: item.featureCode,
                nextLevel: item.nextLevel,
              }))}
            emptyMessage="No recent manual overrides need cleanup on this subscriber route."
          />
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Plan-to-feature audit</h2>
          <div className="mt-5 grid gap-4">
            {auditRows.map((row) => (
              <div key={row.feature} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{row.feature}</h3>
                    <p className="mt-3 text-sm leading-7 text-mist/74">{row.note}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white">
                    {row.currentPlanStatus}
                  </div>
                </div>
                <Link
                  href={row.route}
                  className="mt-4 inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm text-white transition hover:border-white/20 hover:bg-white/[0.06]"
                >
                  Open related route
                </Link>
              </div>
            ))}
          </div>
        </GlowCard>

        <SubscriberRuleListSection
          title="Audit rules"
          rules={[...entitlementAuditRules, ...entitlementMemory.rules]}
          actions={
            <SubscriberRouteLinkGrid
              items={[
                {
                  href: "/account/access",
                  title: "Back to access model",
                  note: "Return to the higher-level subscriber access framing after reviewing entitlement history and overrides.",
                },
                {
                  href: "/account/billing/recovery",
                  title: "Open billing recovery",
                  note: "Cross-check deferred commercial billing posture against the entitlement placeholders that stay active during private beta.",
                },
              ]}
            />
          }
        />
      </Container>
    </div>
  );
}
