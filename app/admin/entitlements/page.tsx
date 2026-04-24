import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { EntitlementHistoryManagePanel } from "@/components/entitlement-history-manage-panel";
import { EntitlementOverridePanel } from "@/components/entitlement-override-panel";
import { EntitlementOverrideManagePanel } from "@/components/entitlement-override-manage-panel";
import { EntitlementSyncChangePanel } from "@/components/entitlement-sync-change-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getEntitlementSyncMemory } from "@/lib/entitlement-sync-memory-store";
import { getEntitlementSyncRegistrySummary } from "@/lib/entitlement-sync-registry";

export const metadata: Metadata = {
  title: "Entitlements",
  description: "Protected entitlement-audit page for access-level changes, billing-linked permissions, and override visibility.",
};

export const dynamic = "force-dynamic";

export default async function EntitlementsPage() {
  await requireUser();
  const [entitlementSyncMemory, entitlementRegistrySummary] = await Promise.all([
    getEntitlementSyncMemory(),
    getEntitlementSyncRegistrySummary(),
  ]);

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Admin", href: "/admin" },
    { name: "Entitlements", href: "/admin/entitlements" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Phase 2 access control</Eyebrow>
          <SectionHeading
            title="Entitlement audit"
            description="This page keeps access changes accountable by showing how billing events, manual support actions, and future plan rules should translate into actual feature access."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-mist/68">Updates today</p>
            <p className="mt-2 text-3xl font-semibold text-white">{entitlementSyncMemory.summary.updatesToday}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Automated changes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{entitlementSyncMemory.summary.automatedChanges}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Manual overrides</p>
            <p className="mt-2 text-3xl font-semibold text-white">{entitlementSyncMemory.summary.manualOverrides}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Pending syncs</p>
            <p className="mt-2 text-3xl font-semibold text-white">{entitlementSyncMemory.summary.pendingSyncs}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Recent access changes</h2>
          <p className="mt-3 text-sm leading-7 text-mist/74">
            This audit now reads from the local entitlement-sync memory store, so billing-linked access changes and grace-period drift
            start behaving like one backend lane instead of separate static samples.
          </p>
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <EntitlementSyncChangePanel
              endpoint="/api/admin/entitlements/sync-change"
              items={entitlementSyncMemory.historyRows.map((item) => ({
                featureCode: item.featureCode,
                accessLevel: item.nextLevel,
                route: "/account/access",
              }))}
              title="Record admin entitlement sync change"
              description="Append entitlement transition rows through the dedicated admin entitlements API instead of routing this audit desk through the subscriber access endpoint."
              actionLabel="Record admin sync change"
            />
            <EntitlementHistoryManagePanel
              endpoint="/api/admin/entitlements/sync-change"
              items={entitlementSyncMemory.historyRows.map((item) => ({
                id: item.id,
                featureCode: item.featureCode,
                changedAt: item.changedAt,
                nextLevel: item.nextLevel,
                syncState: item.syncState,
              }))}
              title="Manage admin entitlement history"
              description="Remove stale entitlement transitions through the dedicated admin entitlements API when this audit desk needs cleanup instead of piggybacking on the subscriber access route."
              emptyMessage="Keeps the admin entitlement audit from relying on the subscriber sync-change route for cleanup."
            />
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Registry rows</p>
              <p className="mt-2 text-lg font-semibold text-white">{entitlementRegistrySummary.totalRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Synced rows</p>
              <p className="mt-2 text-lg font-semibold text-white">{entitlementRegistrySummary.syncedRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Needs review</p>
              <p className="mt-2 text-lg font-semibold text-white">{entitlementRegistrySummary.reviewRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Automated rows</p>
              <p className="mt-2 text-lg font-semibold text-white">{entitlementRegistrySummary.automatedRows}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/api/admin/entitlement-sync-registry"
              className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Download entitlement registry CSV
            </Link>
            <Link
              href="/account/access/entitlements"
              className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-sm font-medium text-mist/84 transition hover:border-white/20 hover:bg-white/[0.04]"
            >
              Open subscriber entitlement audit
            </Link>
          </div>
          <div className="mt-5 grid gap-4">
            {entitlementSyncMemory.historyRows.map((item) => (
              <div key={item.id} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{item.userRef}</h3>
                    <p className="mt-2 text-sm text-mist/66">
                      {item.changedAt} · {item.featureCode}
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
            ))}
          </div>
        </GlowCard>

        <div className="grid gap-5 xl:grid-cols-2">
          <EntitlementOverridePanel
            endpoint="/api/admin/entitlements/override"
            items={entitlementSyncMemory.historyRows.map((item) => ({
              featureCode: item.featureCode,
              accessLevel: item.nextLevel,
              route: "/account/access",
            }))}
            title="Write admin entitlement override"
            description="Append manual entitlement overrides through the dedicated admin entitlements API instead of routing support-style access changes through the subscriber access surface."
            actionLabel="Save admin entitlement override"
          />
          <EntitlementOverrideManagePanel
            endpoint="/api/admin/entitlements/override"
            items={entitlementSyncMemory.historyRows
              .filter((item) => item.actorType !== "system")
              .map((item) => ({
                id: item.id,
                actorType: item.actorType,
                changedAt: item.changedAt,
                featureCode: item.featureCode,
                nextLevel: item.nextLevel,
              }))}
            title="Manage admin entitlement overrides"
            description="Remove stale support or ops override rows through the dedicated admin entitlements override API instead of piggybacking on the generic sync-history lane."
            emptyMessage="No admin-side manual overrides need cleanup right now."
          />
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Entitlement rules</h2>
          <div className="mt-5 grid gap-3">
            {entitlementSyncMemory.rules.map((rule) => (
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
