import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { SupportFollowUpRequestPanel } from "@/components/support-follow-up-request-panel";
import { SubscriberAuditSection } from "@/components/subscriber-audit-section";
import { SubscriberRouteLinkGrid } from "@/components/subscriber-route-link-grid";
import { SubscriberRuleListSection } from "@/components/subscriber-rule-list-section";
import { SubscriberStatGrid } from "@/components/subscriber-stat-grid";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { accountSupportRules, accountSupportTracks } from "@/lib/account-support";
import { getCommunicationDeliveryProofStatus } from "@/lib/communication-readiness";
import { listDurableJobRuns } from "@/lib/durable-jobs";
import { getEmailDeliveryLog, summarizeEmailDeliveryLog } from "@/lib/email-delivery-log-store";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";
import { getAccountSupportFollowUpMemory } from "@/lib/support-follow-up-memory-store";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";

export const metadata: Metadata = {
  title: "Account Support",
  description: "Review support channels, recovery posture, and subscriber-safe help routes from one protected account surface.",
};

export default async function AccountSupportPage() {
  const user = await requireUser();
  const config = getRuntimeLaunchConfig();
  const deliveryProof = getCommunicationDeliveryProofStatus();
  const truth = getSubscriberSurfaceTruth();
  const [supportRegistry, followUpMemory, supportJobs] = await Promise.all([
    Promise.resolve(getSupportOpsRegistrySummary("account")),
    getAccountSupportFollowUpMemory(user),
    listDurableJobRuns({ family: "support", limit: 5 }),
  ]);
  const [supportAcknowledgementEntries, supportFollowUpEntries, supportInboxEntries] = await Promise.all([
    getEmailDeliveryLog({ family: "support_acknowledgement", limit: 10 }),
    getEmailDeliveryLog({ family: "support_follow_up", limit: 10 }),
    getEmailDeliveryLog({ family: "support_inbox_notification", limit: 10 }),
  ]);
  const usesDurableSupportState = followUpMemory.storageMode === "supabase_private_beta";
  const supportStorageLabel = usesDurableSupportState
    ? "Supabase-backed private-beta support continuity"
    : "file-backed private-beta support continuity";
  const supportDeliverySummary = summarizeEmailDeliveryLog([
    ...supportAcknowledgementEntries,
    ...supportFollowUpEntries,
    ...supportInboxEntries,
  ]);
  const newestSupportDelivery =
    supportFollowUpEntries[0] ?? supportAcknowledgementEntries[0] ?? supportInboxEntries[0] ?? null;

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Account", href: "/account" },
    { name: "Support", href: "/account/support" },
  ];

  const channels = [
    {
      label: "Support email",
      value: config.supportEmail || "Not configured yet",
      note: "Primary route for onboarding, account, and product questions.",
    },
    {
      label: "Billing support email",
      value: config.billingSupportEmail || config.supportEmail || "Not configured yet",
      note: "Use this for charge failures, renewal confusion, and invoice follow-up.",
    },
    {
      label: "WhatsApp support",
      value: config.supportWhatsapp || "Not configured yet",
      note: "Keep this visible only as a channel reference until real support staffing is ready.",
    },
    {
      label: "Feedback inbox",
      value: config.feedbackInbox || "Not configured yet",
      note: "Useful for beta feedback, issue capture, and launch-day handoff.",
    },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Subscriber support</Eyebrow>
          <SectionHeading
            title="Account support route"
            description="Use one protected route for support channels, billing recovery handoffs, and subscriber-safe next steps instead of scattering help across unrelated pages."
          />
        </div>

        <SubscriberTruthNotice
          eyebrow="Support truth"
          title={
            usesDurableSupportState
              ? "This route now uses durable private-beta support continuity"
              : "This route explains support posture without pretending the full delivery stack is already live"
          }
          description={
            usesDurableSupportState
              ? "The support follow-up lane now persists through the shared private-beta account-state store for this signed-in account. Delivery proof still depends on live Resend activation, but the support continuity record is no longer limited to the fallback file lane."
              : "The support map is useful right now, but email delivery, WhatsApp continuity, billing recovery, and subscriber identity still need full activation before this can be treated as a hardened support desk."
          }
          items={[
            truth.hasSupportDelivery
              ? "Support contact and transactional email are configured enough to begin end-to-end support-flow testing."
              : "Support contact or transactional delivery is still missing, so recovery promises should stay conservative.",
            truth.hasBillingCore
              ? "Billing credentials exist, so charge and renewal support can move beyond pure planning once checkout is exercised."
              : "Billing credentials are still missing, so payment support remains mostly a preparation lane.",
            truth.hasLiveAuthContinuity
              ? "Public identity continuity is active enough to support real signed-in help flows."
              : "Local preview auth still limits how trustworthy subscriber identity and case ownership can be.",
            `Storage mode: ${supportStorageLabel}.`,
          ]}
          href="/admin/communication-readiness"
          hrefLabel="Open communication readiness"
        />

        <SubscriberStatGrid items={channels} />

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Support and recovery tracks</h2>
          <div className="mt-5">
            <SubscriberRouteLinkGrid
              items={accountSupportTracks.map((track) => ({
                href: track.href,
                title: track.title,
                note: track.summary,
              }))}
            />
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Exact delivery blockers</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-mist/74">
            This route stays strict. Support follow-up only becomes a real delivery proof when the newest support email-log entries resolve to <span className="text-white">Sent</span> with a non-null message id.
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <h3 className="text-base font-semibold text-white">Exact missing inputs</h3>
              <div className="mt-3 grid gap-2 text-sm leading-7 text-mist/74">
                {deliveryProof.exactMissing.length ? (
                  deliveryProof.exactMissing.map((item) => <p key={item}>{item}</p>)
                ) : (
                  <p>Delivery inputs are configured. Submit the signed-in support proof next.</p>
                )}
              </div>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <h3 className="text-base font-semibold text-white">Success criteria</h3>
              <div className="mt-3 grid gap-2 text-sm leading-7 text-mist/74">
                <p>The newest support_acknowledgement entry shows status Sent with a non-null messageId.</p>
                <p>The newest support_follow_up entry shows status Sent with a non-null messageId.</p>
                <p>The newest support_inbox_notification entry shows status Sent with a non-null messageId.</p>
              </div>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">Durable support follow-up lane</h2>
              <p className="max-w-4xl text-sm leading-7 text-mist/74">
                Support callbacks now require Trigger.dev and a live Resend sender before the route accepts them. Once accepted, acknowledgement plus follow-up delivery attempts resolve honestly as queued, sent, failed, or skipped instead of living only as route notes or fake success banners.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="/api/admin/durable-jobs?family=support&format=csv"
                className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
              >
                Download support job runs
              </a>
              <a
                href="/api/admin/email-delivery-log?family=support_follow_up&format=csv"
                className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
              >
                Download follow-up email log
              </a>
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Requests</p>
              <p className="mt-2 text-3xl font-semibold text-white">{followUpMemory.summary.total}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Queued jobs</p>
              <p className="mt-2 text-3xl font-semibold text-white">{Math.max(supportJobs.summary.queued, followUpMemory.summary.queued)}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Scheduled requests</p>
              <p className="mt-2 text-3xl font-semibold text-white">{followUpMemory.summary.scheduled}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Failed jobs</p>
              <p className="mt-2 text-3xl font-semibold text-white">{supportJobs.summary.failed}</p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-6 text-mist/58">
            Storage mode: {supportStorageLabel}. Delivery proof still requires Trigger plus a live Resend sender.
          </p>
          {supportJobs.error ? (
            <div className="mt-4 rounded-[24px] border border-amber-300/20 bg-amber-500/10 p-4 text-sm leading-7 text-amber-100/88">
              Trigger support-run history could not be loaded from the live run ledger: {supportJobs.error}
            </div>
          ) : null}
          <div className="mt-5 rounded-[24px] border border-white/8 bg-black/15 p-5">
            <h3 className="text-lg font-semibold text-white">Live support proof state</h3>
            <p className="mt-3 text-sm leading-7 text-mist/74">
              {newestSupportDelivery
                ? newestSupportDelivery.messageId
                  ? `Newest signed-in support delivery resolved as ${newestSupportDelivery.status} with message id ${newestSupportDelivery.messageId}.`
                  : `Newest signed-in support delivery resolved as ${newestSupportDelivery.status}.`
                : "No signed-in support delivery proof has been recorded yet. Submit a support request after filling the live Resend sender values to create the first proof row."}
            </p>
            <p className="mt-3 text-xs leading-6 text-mist/58">
              Total {supportDeliverySummary.total} · Sent {supportDeliverySummary.sent} · Failed {supportDeliverySummary.failed} · Skipped {supportDeliverySummary.skipped}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="/api/admin/email-delivery-log?family=support_acknowledgement"
                className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
              >
                Open acknowledgement log
              </a>
              <a
                href="/api/admin/email-delivery-log?family=support_follow_up"
                className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
              >
                Open follow-up log
              </a>
              <a
                href="/api/admin/email-delivery-log?family=support_inbox_notification"
                className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
              >
                Open inbox-notification log
              </a>
            </div>
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <SupportFollowUpRequestPanel />
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <h3 className="text-lg font-semibold text-white">Recent follow-up requests</h3>
              <div className="mt-4 grid gap-3">
                {followUpMemory.requests.length ? (
                  followUpMemory.requests.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-medium text-white">{item.topic}</p>
                        <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-7 text-mist/72">
                        {item.lane} · {item.preferredChannel} · {item.urgency}
                      </p>
                      <p className="mt-2 text-xs leading-6 text-mist/60">
                        Next touch: {item.nextTouchAt}
                        {item.lastJobRunId ? ` · job ${item.lastJobRunId}` : ""}
                      </p>
                      <p className="mt-2 text-xs leading-6 text-mist/56">
                        Ack email: {item.acknowledgementEmailState} · Follow-up email: {item.followUpEmailState}
                        {item.lastEmailAt
                          ? ` · last email ${new Date(item.lastEmailAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`
                          : ""}
                      </p>
                      {item.lastEmailError ? <p className="mt-2 text-xs leading-6 text-amber-200/80">Email error: {item.lastEmailError}</p> : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-7 text-mist/72">
                    Queue the first support follow-up to turn this route into a real private-beta support work queue.
                  </p>
                )}
              </div>
            </div>
          </div>
        </GlowCard>

        <SubscriberAuditSection
          title="Support registry coverage"
          description="This gives the subscriber support route the same stitched support-truth view that launch ops uses, instead of hiding that audit posture only inside admin."
          headline={`${supportRegistry.total} support rows with ${supportRegistry.inProgress} in progress and ${supportRegistry.blocked} blocked`}
          downloadHref="/api/support-ops-registry"
          downloadLabel="Download support registry CSV"
          stats={[
            { label: "Registry rows", value: supportRegistry.total },
            { label: "In progress", value: supportRegistry.inProgress },
            { label: "Blocked", value: supportRegistry.blocked },
            { label: "Ready", value: supportRegistry.ready },
          ]}
        />

        <SubscriberRuleListSection title="Support rules" rules={accountSupportRules} />
      </Container>
    </div>
  );
}
