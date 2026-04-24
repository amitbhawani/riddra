import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getCommunicationDeliveryProofStatus } from "@/lib/communication-readiness";
import { listDurableJobRuns } from "@/lib/durable-jobs";
import { getEmailDeliveryLog, summarizeEmailDeliveryLog } from "@/lib/email-delivery-log-store";
import { getExternalActivationRegistrySummary } from "@/lib/external-activation-registry";
import {
  externalActivationRules,
  getExternalActivationItems,
} from "@/lib/external-activation";
import { getMarketDataHandoffItems } from "@/lib/market-data-handoff";
import { getMarketDataRefreshProofStatus } from "@/lib/market-data-refresh";
import { getSupabaseDurabilityCheck } from "@/lib/supabase-durability-check";

export const metadata: Metadata = {
  title: "External Activation",
  description:
    "Protected external-activation page for provider credentials, deployment inputs, email/payments setup, and source-linked launch blockers.",
};

export default async function AdminExternalActivationPage() {
  await requireUser();
  const externalActivationItems = getExternalActivationItems();
  const refreshProof = getMarketDataRefreshProofStatus();
  const deliveryProof = getCommunicationDeliveryProofStatus();
  const registrySummary = await getExternalActivationRegistrySummary();
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
  const readinessItems = externalActivationItems.map((item) => ({
    label: item.title,
    status: item.status,
    detail: item.summary,
    routeTarget: item.href,
  }));
  const marketDataHandoffItems = getMarketDataHandoffItems();

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "External Activation", href: "/admin/external-activation" },
            ]}
          />
          <Eyebrow>Real-world blockers</Eyebrow>
          <SectionHeading
            title="External activation"
            description="This page keeps provider credentials, launch-critical secrets, and outside dependencies visible without overstating them. Configured means setup is in place; it does not mean the live provider path has already been proven."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Provider groups</p>
            <p className="mt-2 text-3xl font-semibold text-white">{registrySummary.providerGroups}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Required credentials</p>
            <p className="mt-2 text-3xl font-semibold text-white">{registrySummary.requiredCredentials}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Launch critical</p>
            <p className="mt-2 text-3xl font-semibold text-white">{registrySummary.launchCritical}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Current proof state</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-mist/74">
            External activation is now narrowed to the last backend-owned proof lanes: remote durable schema visibility, retained market-data refresh, and strict email delivery proof.
          </p>
          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <h3 className="text-base font-semibold text-white">Remote durable schema</h3>
              <p className="mt-3 text-sm leading-7 text-mist/74">
                {durabilityCheck.connectionError
                  ? durabilityCheck.connectionError
                  : durabilityCheck.missingTables.length
                    ? `${durabilityCheck.missingTables.length} required durability tables are still missing remotely. Next migrations: ${durabilityCheck.migrationOrder.join(" -> ")}.`
                    : "All required durability tables are visible through the current Supabase admin connection."}
              </p>
              <p className="mt-3 text-xs leading-6 text-mist/58">
                Ready groups {durabilityCheck.groups.filter((group) => group.status === "Ready").length} · Missing tables {durabilityCheck.missingTables.length}
              </p>
              <Link
                href="/admin/source-mapping-desk"
                className="mt-4 inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
              >
                Open migration proof lane
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
                className="mt-4 inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
              >
                Open retained-refresh lane
              </Link>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <h3 className="text-base font-semibold text-white">Strict delivery proof</h3>
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
                className="mt-4 inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
              >
                Open delivery proof lane
              </Link>
            </div>
          </div>
        </GlowCard>

        <div className="grid gap-6">
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="external activation check"
            panelTitle="Write-through external activation action"
            panelDescription="Log outside-the-code activation changes into the shared revision lane so env, provider, support, and billing blockers stop living only as a static blocker list."
            defaultRouteTarget="/admin/external-activation"
            defaultOperator="External Activation Operator"
            defaultChangedFields="external_dependency, activation_state, launch_blocker"
            actionNoun="external-activation mutation"
          />
          {externalActivationItems.map((item) => (
            <GlowCard key={item.title}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{item.summary}</p>
                </div>
                <div className="grid gap-2 lg:text-right">
                  <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                    {item.status}
                  </div>
                  <div className="text-xs uppercase tracking-[0.16em] text-mist/60">{item.action}</div>
                  <Link
                    href={item.href}
                    className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
                  >
                    Open related surface
                  </Link>
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">External activation registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                This registry combines launch-config input groups with the live outside-the-code blocker rows, so
                provider, auth, billing, communication, trust, and go-live inputs stop being split between setup forms
                and blocker cards.
              </p>
            </div>
            <Link
              href="/api/admin/external-activation-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download activation registry CSV
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-6">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Registry rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.totalRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Config groups</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.configGroups}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Blocker rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.blockerRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Partial / mixed</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.partial}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Config-complete</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.configured}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Deferred</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.deferred}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Blocked / missing</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.blocked}</p>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Activation rules</h2>
          <div className="mt-5 grid gap-3">
            {externalActivationRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Market-data handoff</h2>
          <div className="mt-5 grid gap-3">
            {marketDataHandoffItems.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/80">
                    {item.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-7 text-mist/74">{item.detail}</p>
              </div>
            ))}
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
              Provider sample: <span className="text-white">/api/admin/market-data/sample-payload</span>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
              Payload tester: <span className="text-white">/admin/market-data-tester</span>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
              Validation-only route: <span className="text-white">/api/admin/market-data/validate</span>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
              Signed ingest: <span className="text-white">/api/admin/market-data/ingest</span>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
              Provider sync: <span className="text-white">/api/admin/market-data/provider-sync</span>
            </div>
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
