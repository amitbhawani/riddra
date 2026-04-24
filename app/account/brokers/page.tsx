import type { Metadata } from "next";
import Link from "next/link";

import { BrokerLinkedAccountCreatePanel } from "@/components/broker-linked-account-create-panel";
import { BrokerLinkedAccountManagePanel } from "@/components/broker-linked-account-manage-panel";
import { BrokerTargetCreatePanel } from "@/components/broker-target-create-panel";
import { BrokerTargetManagePanel } from "@/components/broker-target-manage-panel";
import { BrokerSyncRunManagePanel } from "@/components/broker-sync-run-manage-panel";
import { BrokerSyncRunPanel } from "@/components/broker-sync-run-panel";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SubscriberActivityLogSection } from "@/components/subscriber-activity-log-section";
import { SubscriberAuditSection } from "@/components/subscriber-audit-section";
import { SubscriberStatGrid } from "@/components/subscriber-stat-grid";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getBrokerAdapterRegistryRows, getBrokerAdapterRegistrySummary } from "@/lib/broker-adapter-registry";
import { getBrokerSyncMemory } from "@/lib/broker-sync-memory-store";
import { getBrokerSyncRegistrySummary } from "@/lib/broker-sync-registry";
import { listDurableJobRuns } from "@/lib/durable-jobs";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";

export const metadata: Metadata = {
  title: "Broker Connections",
  description: "Review broker connection options, sync rules, and CSV fallback paths for your portfolio workspace.",
};

export const dynamic = "force-dynamic";

export default async function AccountBrokersPage() {
  const user = await requireUser();
  const truth = getSubscriberSurfaceTruth();
  const [brokerSyncMemory, registrySummary, adapterRegistrySummary, brokerSyncRuns] = await Promise.all([
    getBrokerSyncMemory(user),
    getBrokerSyncRegistrySummary(user),
    Promise.resolve(getBrokerAdapterRegistrySummary()),
    listDurableJobRuns({ family: "broker_sync", limit: 8 }),
  ]);
  const adapterRows = getBrokerAdapterRegistryRows();
  const usesDurableBrokerState = brokerSyncMemory.storageMode === "supabase_private_beta";
  const brokerStorageLabel = usesDurableBrokerState
    ? "Supabase-backed private-beta broker state"
    : "file-backed preview broker state";

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Account", href: "/account" },
    { name: "Broker Connections", href: "/account/brokers" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Portfolio connectivity</Eyebrow>
          <SectionHeading
            title="Broker connections"
            description="See connection options, understand the sync rules, and decide when to use broker import versus manual or CSV-based updates."
          />
        </div>

        <SubscriberTruthNotice
          eyebrow="Broker truth"
          title="Broker connections are still staged"
          description="This route is intentionally useful for planning and sync education, but broker access itself is not yet live. Riddra should keep this page honest until at least one real broker path and review workflow are verified end to end."
          items={[
            truth.hasBrokerContinuity
              ? "At least one broker path is active enough for real continuity checks."
              : "No live broker connection path is active yet; the page is still a setup and review preview.",
            `Internal broker adapter profiles tracked: ${adapterRegistrySummary.totalRows}.`,
            "CSV fallback remains the trustworthy universal option until broker APIs are actually verified for subscribers.",
            brokerSyncMemory.summary.linkedAccounts === 0
              ? "Untouched accounts now start empty here instead of inheriting staged broker examples."
              : "This account already has persisted broker continuity rows.",
            `Linked broker accounts tracked: ${brokerSyncMemory.summary.linkedAccounts}.`,
            `Recent broker workspace actions: ${brokerSyncMemory.summary.activityEntries}.`,
            `Storage mode: ${brokerStorageLabel}.`,
          ]}
          href="/admin/subscriber-launch-readiness"
          hrefLabel="Open subscriber readiness"
        />

        <SubscriberStatGrid
          items={[
            {
              label: truth.usesPreviewMode ? "Priority targets" : "Priority brokers",
              value: brokerSyncMemory.summary.priorityBrokers,
            },
            { label: "Planned brokers", value: brokerSyncMemory.summary.plannedBrokers },
            { label: "Queue lanes", value: brokerSyncMemory.summary.activeQueueLanes },
            { label: "Linked accounts", value: brokerSyncMemory.summary.linkedAccounts },
            { label: "Review queue", value: brokerSyncMemory.summary.reviewQueue },
            { label: "Activity entries", value: brokerSyncMemory.summary.activityEntries },
          ]}
        />

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Broker roadmap</h2>
          <p className="mt-3 text-sm leading-7 text-mist/72">
            These connection cards now read from {usesDurableBrokerState ? "the shared private-beta broker lane" : "the fallback broker-sync file"}, so broker rollout targets are persisted backend state instead of one-off static copy.
          </p>
          <div className="mt-5">
            <BrokerTargetCreatePanel />
          </div>
          <div className="mt-5">
            <BrokerTargetManagePanel targets={brokerSyncMemory.targets} />
          </div>
          {brokerSyncMemory.targets.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {brokerSyncMemory.targets.map((item) => (
                <div key={item.brokerName} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-2">
                      <h3 className="text-base font-semibold text-white">{item.brokerName}</h3>
                      <span className="inline-flex rounded-full border border-amber-300/18 bg-amber-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-amber-100/88">
                        Persisted rollout target
                      </span>
                    </div>
                    <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-mist/62">
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">{item.tokenState}</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">{item.syncMode}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[24px] border border-dashed border-white/12 bg-black/15 px-6 py-8">
              <p className="text-sm font-medium text-white">No broker targets yet</p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-mist/72">
                This account no longer inherits staged broker targets. Add the first real broker rollout target above when you want to start tracking adapter posture for this user.
              </p>
            </div>
          )}
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Linked accounts and sync posture</h2>
          <p className="mt-3 text-sm leading-7 text-mist/72">
            Broker continuity now keeps a persisted linked-account lane too, so staged account linkage can be tracked
            separately from rollout targets and queued sync windows instead of being inferred only from review text.
          </p>
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <BrokerLinkedAccountCreatePanel />
            <BrokerLinkedAccountManagePanel linkedAccounts={brokerSyncMemory.linkedAccounts} />
          </div>
          {brokerSyncMemory.linkedAccounts.length > 0 ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {brokerSyncMemory.linkedAccounts.map((item) => (
                <div key={`${item.brokerName}-${item.accountLabel}`} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-2">
                      <h3 className="text-base font-semibold text-white">{item.brokerName}</h3>
                      <span className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/84">
                        {item.accountLabel}
                      </span>
                    </div>
                    <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                      {item.linkageState}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
                  <p className="mt-3 text-xs leading-6 text-mist/55">Last sync: {item.lastSyncAt}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[24px] border border-dashed border-white/12 bg-black/15 px-6 py-8">
              <p className="text-sm font-medium text-white">No linked broker accounts yet</p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-mist/72">
                Add a linked-account row only when this user has a real broker continuity candidate to track. Untouched accounts should stay empty here.
              </p>
            </div>
          )}
        </GlowCard>

        <SubscriberAuditSection
          title="Broker sync registry"
          description="Broker continuity now has one exportable registry for connection targets, queued sync windows, and staged review rows, so signed-in broker posture can be audited as one backend slice instead of across separate preview cards."
          headline={`${registrySummary.totalRows} broker rows stitched across targets, runs, linked accounts, and activity`}
          downloadHref="/api/broker-sync-registry"
          downloadLabel="Download broker registry"
          stats={[
            { label: "Registry rows", value: registrySummary.totalRows },
            { label: "Priority targets", value: registrySummary.priorityTargets },
            { label: "Sync runs", value: registrySummary.syncRuns },
            { label: "Linked accounts", value: registrySummary.linkedAccounts },
            { label: "Live queue posture", value: registrySummary.activeSyncQueues },
            { label: "Activity rows", value: registrySummary.activities },
          ]}
        />

        <GlowCard>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Broker adapter registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/72">
                Broker rollout now has an explicit internal adapter registry and a Trigger-backed sync queue, so this page no longer depends on roadmap prose alone to explain how approval-first broker execution should work.
              </p>
            </div>
            <Link
              href="/api/admin/broker-adapter-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Download adapter registry
            </Link>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Adapter rows</p>
              <p className="mt-2 text-3xl font-semibold text-white">{adapterRegistrySummary.totalRows}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Queue-ready adapters</p>
              <p className="mt-2 text-3xl font-semibold text-white">{adapterRegistrySummary.queueReady}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Planned adapters</p>
              <p className="mt-2 text-3xl font-semibold text-white">{adapterRegistrySummary.planned}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Broker sync worker runs</p>
              <p className="mt-2 text-3xl font-semibold text-white">{brokerSyncRuns.summary.total}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {adapterRows.map((row) => (
              <div key={row.adapterKey} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{row.brokerName}</h3>
                    <p className="mt-2 text-xs leading-6 text-mist/58">{row.adapterKey}</p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {row.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{row.note}</p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-mist/62">
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">{row.authMode}</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">{row.executionMode}</span>
                </div>
                <p className="mt-3 text-xs leading-6 text-mist/55">
                  Coverage: {row.syncCoverage}
                </p>
                <p className="mt-2 text-xs leading-6 text-mist/55">
                  Review policy: {row.reviewPolicy}
                </p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Sync runs and rules</h2>
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <BrokerSyncRunPanel />
            <BrokerSyncRunManagePanel runs={brokerSyncMemory.syncRuns} />
          </div>
          {brokerSyncMemory.syncRuns.length > 0 ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {brokerSyncMemory.syncRuns.map((item) => (
                <div key={`${item.broker}-${item.accountScope}`} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-white">{item.broker}</h3>
                    <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                      {item.queueState}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
                  <p className="mt-3 text-xs leading-6 text-mist/55">
                    {item.accountScope} · Next window: {item.nextWindow}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[24px] border border-dashed border-white/12 bg-black/15 px-6 py-8">
              <p className="text-sm font-medium text-white">No sync runs recorded yet</p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-mist/72">
                Sync windows now start empty too. Record the first broker refresh run only when there is a real account-specific queue window to track.
              </p>
            </div>
          )}
          <div className="mt-5 grid gap-3">
            {brokerSyncMemory.rules.map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {item}
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-6 text-mist/55">
            The review flow below now reads from a persisted broker-sync queue and a Trigger-backed internal adapter worker, but approvals still stop before live broker-linked holdings writes.
          </p>
          <Link
            href="/account/brokers/review"
            className="mt-6 inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
          >
            Open sync review
          </Link>
        </GlowCard>

        <SubscriberActivityLogSection
          title="Recent broker activity"
          description="Broker run creation and approval-first review changes now append into one recent activity lane inside the persisted broker workspace."
          items={brokerSyncMemory.activityLog.slice(0, 6).map((entry) => ({
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
      </Container>
    </div>
  );
}
