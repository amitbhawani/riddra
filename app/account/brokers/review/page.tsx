import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { BrokerReviewItemCreatePanel } from "@/components/broker-review-item-create-panel";
import { BrokerSyncReviewPanel } from "@/components/broker-sync-review-panel";
import { SubscriberAuditSection } from "@/components/subscriber-audit-section";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getBrokerSyncMemory } from "@/lib/broker-sync-memory-store";
import { getBrokerSyncRegistrySummary } from "@/lib/broker-sync-registry";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";

export const metadata: Metadata = {
  title: "Broker Sync Review",
  description: "Subscriber broker-sync review page for approval-first updates and mismatch handling.",
};

export const dynamic = "force-dynamic";

export default async function BrokerReviewPage() {
  const user = await requireUser();
  const truth = getSubscriberSurfaceTruth();
  const [brokerSyncMemory, brokerRegistry] = await Promise.all([
    getBrokerSyncMemory(user),
    getBrokerSyncRegistrySummary(user),
  ]);
  const usesDurableBrokerState = brokerSyncMemory.storageMode === "supabase_private_beta";

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Account", href: "/account" },
    { name: "Broker Connections", href: "/account/brokers" },
    { name: "Sync Review", href: "/account/brokers/review" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Approval-first sync</Eyebrow>
          <SectionHeading
            title="Broker sync review"
            description="Review differences between a broker refresh and your saved portfolio before Riddra updates holdings or overwrites values."
          />
        </div>

        <SubscriberTruthNotice
          eyebrow="Sync review truth"
          title="This review queue is still a controlled preview"
          description={
            usesDurableBrokerState
              ? "The approval-first review model is the right direction, and the queue below now persists in the shared private-beta broker lane while internal broker sync execution runs through Trigger.dev. Live broker integrations and user-specific holdings mutations are still not active."
              : "The approval-first review model is the right direction, but this queue still falls back to the file-backed broker-sync preview store because durable private-beta broker storage is unavailable."
          }
          items={[
            truth.hasBrokerContinuity
              ? "A broker continuity path exists, so this queue can soon move into live validation."
              : "Broker sync is still not live, so these review items should be treated as workflow examples only.",
            "Approving or keeping rows here now writes a persisted per-user broker review decision, but it still does not execute a live adapter sync or overwrite saved holdings yet.",
            "Trigger-backed broker sync execution can now prepare review rows and linked-account continuity without pretending imported holdings were already applied.",
          ]}
          href="/admin/subscriber-launch-readiness"
          hrefLabel="Open subscriber readiness"
        />

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Review queue</h2>
          <p className="mt-3 text-sm leading-7 text-mist/72">
            Use this page to understand how approval-first sync should feel. The queue itself is now persisted state for this account, and review actions below now write back into {usesDurableBrokerState ? "the shared private-beta broker lane" : "the fallback broker-sync file"} even though they still stop short of a live broker-linked sync.
          </p>
          <div className="mt-5 rounded-[24px] border border-white/8 bg-black/15 p-5 text-sm leading-7 text-mist/72">
            <p className="text-xs uppercase tracking-[0.18em] text-mist/55">Sync memory</p>
            <p className="mt-2 text-white">
              {brokerSyncMemory.reviewItems.length} queued reviews across {brokerSyncMemory.summary.activeQueueLanes} queue lanes
            </p>
            <p className="mt-2 text-xs leading-6 text-mist/55">
              Last refreshed {new Date(brokerSyncMemory.updatedAt).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })} · Storage mode: {brokerSyncMemory.storageMode.replaceAll("_", " ")}
            </p>
          </div>
          <SubscriberAuditSection
            embedded
            title="Broker registry coverage"
            description="This review queue now surfaces the broader broker continuity registry too, so sync posture is not hidden only on the main broker route."
            headline={`${brokerRegistry.totalRows} broker rows with ${brokerRegistry.reviewQueue} review items and ${brokerRegistry.linkedAccounts} linked accounts`}
            downloadHref="/api/broker-sync-registry"
            downloadLabel="Download broker registry CSV"
            stats={[
              { label: "Registry rows", value: brokerRegistry.totalRows },
              { label: "Review items", value: brokerRegistry.reviewQueue },
              { label: "Linked accounts", value: brokerRegistry.linkedAccounts },
              { label: "Sync runs", value: brokerRegistry.syncRuns },
            ]}
          />
          <div className="mt-5 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <BrokerReviewItemCreatePanel />
            <BrokerSyncReviewPanel items={brokerSyncMemory.reviewItems} />
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
