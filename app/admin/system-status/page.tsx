import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getCommunicationDeliveryProofStatus } from "@/lib/communication-readiness";
import { listDurableJobRuns } from "@/lib/durable-jobs";
import { getEmailDeliveryLog, summarizeEmailDeliveryLog } from "@/lib/email-delivery-log-store";
import { getMarketDataRefreshProofStatus } from "@/lib/market-data-refresh";
import { getSupabaseDurabilityCheck } from "@/lib/supabase-durability-check";
import { getSystemStatusItems } from "@/lib/system-status";

export const metadata: Metadata = {
  title: "System Status",
  description: "Protected system-status page for environment, auth, and launch configuration readiness.",
};

export default async function SystemStatusPage() {
  await requireUser();

  const items = getSystemStatusItems();
  const refreshProof = getMarketDataRefreshProofStatus();
  const deliveryProof = getCommunicationDeliveryProofStatus();
  const [
    durabilityCheck,
    marketDataRuns,
    contactAcknowledgementEntries,
    contactInboxEntries,
    supportAcknowledgementEntries,
    supportFollowUpEntries,
    supportInboxEntries,
  ] = await Promise.all([
    getSupabaseDurabilityCheck(),
    listDurableJobRuns({ family: "market_data", limit: 5 }),
    getEmailDeliveryLog({ family: "contact_acknowledgement", limit: 5 }),
    getEmailDeliveryLog({ family: "contact_inbox_notification", limit: 5 }),
    getEmailDeliveryLog({ family: "support_acknowledgement", limit: 5 }),
    getEmailDeliveryLog({ family: "support_follow_up", limit: 5 }),
    getEmailDeliveryLog({ family: "support_inbox_notification", limit: 5 }),
  ]);
  const configuredCount = items.filter((item) => item.status === "Configured").length;
  const partialCount = items.filter((item) => item.status === "Partial").length;
  const missingCount = items.filter((item) => item.status === "Missing").length;
  const notReadyCount = partialCount + missingCount;
  const latestMarketDataRun = marketDataRuns.items[0] ?? null;
  const latestContactEntry = contactAcknowledgementEntries[0] ?? contactInboxEntries[0] ?? null;
  const latestSupportEntry =
    supportFollowUpEntries[0] ?? supportAcknowledgementEntries[0] ?? supportInboxEntries[0] ?? null;
  const contactSummary = summarizeEmailDeliveryLog([...contactAcknowledgementEntries, ...contactInboxEntries]);
  const supportSummary = summarizeEmailDeliveryLog([
    ...supportAcknowledgementEntries,
    ...supportFollowUpEntries,
    ...supportInboxEntries,
  ]);
  const readinessItems = items.map((item) => ({
    label: item.title,
    status: item.status,
    detail: item.note,
    routeTarget: "/admin/system-status",
  }));
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Admin", href: "/admin" },
    { name: "System Status", href: "/admin/system-status" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>System readiness</Eyebrow>
          <SectionHeading
            title="System status"
            description="This page shows what the current environment actually has configured, so launch work can be based on facts instead of assumptions."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Configured</p>
            <p className="mt-2 text-3xl font-semibold text-white">
                {configuredCount}
              </p>
            </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Partial</p>
            <p className="mt-2 text-3xl font-semibold text-white">
                {partialCount}
              </p>
            </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Missing</p>
            <p className="mt-2 text-3xl font-semibold text-white">
                {missingCount}
              </p>
            </GlowCard>
          </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Current reality</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-mist/74">
            {notReadyCount === 0
              ? "All tracked launch-critical configuration items are currently ready."
              : `${notReadyCount} of ${items.length} tracked configuration items are still partial or missing, so the platform should still be treated as a controlled beta build instead of a broad-public release.`}
          </p>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Current proof state</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-mist/74">
            These cards keep the last backend-only blockers visible from the system desk itself: remote durable schema activation, retained market-data proof, and live transactional delivery proof.
          </p>
          <div className="mt-4">
            <Link
              href="/admin/runtime-diagnostics"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Open runtime diagnostics
            </Link>
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <h3 className="text-base font-semibold text-white">Remote durable schema</h3>
              <p className="mt-3 text-sm leading-7 text-mist/74">
                {durabilityCheck.connectionError
                  ? durabilityCheck.connectionError
                  : durabilityCheck.missingTables.length
                    ? `${durabilityCheck.missingTables.length} required durability tables are still missing remotely: ${durabilityCheck.missingTables.join(", ")}.`
                    : "All required durability tables are visible from the current Supabase admin connection."}
              </p>
              <p className="mt-3 text-xs leading-6 text-mist/58">
                Ready groups {durabilityCheck.groups.filter((group) => group.status === "Ready").length} · Missing tables {durabilityCheck.missingTables.length}
              </p>
              <Link
                href="/admin/source-mapping-desk"
                className="mt-4 inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                Open schema proof lane
              </Link>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <h3 className="text-base font-semibold text-white">Market-data retained refresh</h3>
              <p className="mt-3 text-sm leading-7 text-mist/74">
                {marketDataRuns.error
                  ? marketDataRuns.error
                  : latestMarketDataRun?.errorMessage ??
                    (latestMarketDataRun
                      ? `Latest retained refresh is ${latestMarketDataRun.status}.`
                      : refreshProof.exactMissing.length
                        ? `Refresh proof is still missing ${refreshProof.exactMissing.join(", ")}.`
                        : "No retained market-data refresh run has been recorded yet.")}
              </p>
              <p className="mt-3 text-xs leading-6 text-mist/58">
                Total {marketDataRuns.summary.total} · Succeeded {marketDataRuns.summary.succeeded} · Failed {marketDataRuns.summary.failed}
              </p>
              <Link
                href="/admin/market-data"
                className="mt-4 inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                Open market-data desk
              </Link>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <h3 className="text-base font-semibold text-white">Transactional delivery proof</h3>
              <p className="mt-3 text-sm leading-7 text-mist/74">
                {deliveryProof.exactMissing.length
                  ? `Delivery proof is still missing ${deliveryProof.exactMissing.join(", ")}.`
                  : latestSupportEntry?.messageId
                    ? `Newest support proof resolved as ${latestSupportEntry.status} with message id ${latestSupportEntry.messageId}.`
                    : latestContactEntry?.messageId
                      ? `Newest contact proof resolved as ${latestContactEntry.status} with message id ${latestContactEntry.messageId}.`
                      : "Delivery runtime is configured. Run the live contact and signed-in support proofs next."}
              </p>
              <p className="mt-3 text-xs leading-6 text-mist/58">
                Contact sent {contactSummary.sent}/{contactSummary.total} · Support sent {supportSummary.sent}/{supportSummary.total}
              </p>
              <Link
                href="/admin/communication-readiness"
                className="mt-4 inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                Open delivery proof lane
              </Link>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Environment checklist</h2>
          <div className="mt-5">
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="system status check"
              panelTitle="Write-through system status action"
              panelDescription="Log environment and config changes into the shared revision lane so actual system readiness stops living only as a static facts board."
              defaultRouteTarget="/admin/system-status"
              defaultOperator="System Status Operator"
              defaultChangedFields="system_config, env_state, launch_truth"
              actionNoun="system-status mutation"
            />
          </div>
          <div className="mt-5 grid gap-4">
            {items.map((item) => (
              <div key={item.title} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-white">{item.title}</h3>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {item.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
              </div>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
