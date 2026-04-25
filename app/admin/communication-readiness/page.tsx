import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getCommunicationDeliveryProofStatus, getCommunicationReadinessItems } from "@/lib/communication-readiness";
import { getCommunicationRegistrySummary } from "@/lib/communication-readiness-registry";
import { getEmailDeliveryLog, summarizeEmailDeliveryLog } from "@/lib/email-delivery-log-store";
import { getConfiguredPublicSiteUrl } from "@/lib/public-site-url";

export const metadata: Metadata = {
  title: "Communication Readiness",
  description: "Protected communication-readiness page for support email, transactional email, and alert delivery setup.",
};

export default async function CommunicationReadinessPage() {
  await requireUser();

  const items = getCommunicationReadinessItems();
  const deliveryProof = getCommunicationDeliveryProofStatus();
  const [contactAcknowledgementEntries, contactInboxEntries, supportAcknowledgementEntries, supportFollowUpEntries, supportInboxEntries] =
    await Promise.all([
      getEmailDeliveryLog({ family: "contact_acknowledgement", limit: 10 }),
      getEmailDeliveryLog({ family: "contact_inbox_notification", limit: 10 }),
      getEmailDeliveryLog({ family: "support_acknowledgement", limit: 10 }),
      getEmailDeliveryLog({ family: "support_follow_up", limit: 10 }),
      getEmailDeliveryLog({ family: "support_inbox_notification", limit: 10 }),
    ]);
  const readinessItems = items.map((item) => ({
    label: item.title,
    status: item.status,
    detail: item.note,
    routeTarget: item.href,
  }));
  const registrySummary = getCommunicationRegistrySummary();
  const contactSummary = summarizeEmailDeliveryLog([...contactAcknowledgementEntries, ...contactInboxEntries]);
  const supportSummary = summarizeEmailDeliveryLog([
    ...supportAcknowledgementEntries,
    ...supportFollowUpEntries,
    ...supportInboxEntries,
  ]);
  const deliveryEnvValues = [
    "RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxx",
    "RESEND_FROM_EMAIL=Riddra Support <support@your-verified-domain.com>",
    "RESEND_REPLY_TO_EMAIL=founder@your-domain.com",
    "NEXT_PUBLIC_SUPPORT_EMAIL=support@your-domain.com",
  ];
  const publicProofOrigin = getConfiguredPublicSiteUrl() || "https://www.riddra.com";
  const contactProofCommand = `curl -s -X POST ${publicProofOrigin}/api/contact/requests \\
  -H 'content-type: application/json' \\
  --data '{"name":"QA Contact","email":"YOUR_REAL_INBOX@example.com","topic":"Support","note":"Private beta contact acknowledgement proof."}'`;
  const supportProofSteps = [
    "Sign in at /login with a real account.",
    "Open /account/support.",
    "Submit a support request with lane Support, preferred channel Email, urgency Next business day, and a unique proof note.",
    "Wait for the Trigger worker to finish the support-follow-up job.",
    "Refresh the support delivery-log endpoints and inspect the newest entries.",
  ];
  const deliveryProofCriteria = [
    "The newest contact_acknowledgement and contact_inbox_notification entries both show status Sent with a non-null messageId.",
    "The newest support_acknowledgement, support_follow_up, and support_inbox_notification entries all show status Sent with a non-null messageId.",
    "Queued, Failed, or Skipped means the proof is still not complete.",
  ];
  const newestContactEntry = contactAcknowledgementEntries[0] ?? contactInboxEntries[0] ?? null;
  const newestSupportEntry = supportFollowUpEntries[0] ?? supportAcknowledgementEntries[0] ?? supportInboxEntries[0] ?? null;
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Admin", href: "/admin" },
    { name: "Communication Readiness", href: "/admin/communication-readiness" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Phase 2 communications</Eyebrow>
          <SectionHeading
            title="Communication readiness"
            description="This page tracks whether support contact details and email delivery setup are ready for launch, onboarding, and alerts."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Ready</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {items.filter((item) => item.status === "Ready").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">In progress</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {items.filter((item) => item.status === "In progress").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {items.filter((item) => item.status === "Blocked").length}
            </p>
          </GlowCard>
        </div>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Live delivery proof lane</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                This is the strict signoff lane for contact acknowledgement and signed-in support follow-up. Success
                only counts once the newest delivery-log entries resolve to <span className="font-semibold text-white">Sent</span> with a non-null message id.
              </p>
            </div>
            <div className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
              {deliveryProof.proofMode === "verification_ready" ? "Verification ready" : "Blocked"}
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <h3 className="text-base font-semibold text-white">Exact missing inputs</h3>
              <div className="mt-3 grid gap-2 text-sm leading-7 text-mist/74">
                {deliveryProof.exactMissing.length ? (
                  deliveryProof.exactMissing.map((item) => <p key={item}>{item}</p>)
                ) : (
                  <p>Resend, support inbox routing, and Trigger.dev are all configured. Run the live browser proofs next.</p>
                )}
              </div>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <h3 className="text-base font-semibold text-white">Proof targets</h3>
              <div className="mt-3 grid gap-2 text-sm leading-7 text-mist/74">
                {deliveryProof.proofPages.map((item) => (
                  <p key={item}>{item}</p>
                ))}
                {deliveryProof.deliveryLogEndpoints.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <h3 className="text-base font-semibold text-white">Contact proof state</h3>
              <p className="mt-3 text-sm leading-7 text-mist/74">
                {newestContactEntry
                  ? `Newest contact delivery entry is ${newestContactEntry.status}${newestContactEntry.messageId ? ` with message id ${newestContactEntry.messageId}.` : "."}`
                  : "No contact acknowledgement proof has been logged yet."}
              </p>
              <p className="mt-3 text-xs leading-6 text-mist/58">
                Total {contactSummary.total} · Sent {contactSummary.sent} · Failed {contactSummary.failed} · Skipped {contactSummary.skipped}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <h3 className="text-base font-semibold text-white">Support proof state</h3>
              <p className="mt-3 text-sm leading-7 text-mist/74">
                {newestSupportEntry
                  ? `Newest support delivery entry is ${newestSupportEntry.status}${newestSupportEntry.messageId ? ` with message id ${newestSupportEntry.messageId}.` : "."}`
                  : "No signed-in support follow-up proof has been logged yet."}
              </p>
              <p className="mt-3 text-xs leading-6 text-mist/58">
                Total {supportSummary.total} · Sent {supportSummary.sent} · Failed {supportSummary.failed} · Skipped {supportSummary.skipped}
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <h3 className="text-base font-semibold text-white">Exact env values required</h3>
              <div className="mt-3 grid gap-3">
                {deliveryEnvValues.map((value) => (
                  <pre
                    key={value}
                    className="overflow-x-auto whitespace-pre-wrap rounded-2xl border border-white/8 bg-black/25 px-4 py-4 font-mono text-xs leading-6 text-mist/80"
                  >
                    {value}
                  </pre>
                ))}
              </div>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <h3 className="text-base font-semibold text-white">Exact contact API proof</h3>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-2xl border border-white/8 bg-black/25 px-4 py-4 font-mono text-xs leading-6 text-mist/80">
                {contactProofCommand}
              </pre>
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <h3 className="text-base font-semibold text-white">Exact signed-in support proof</h3>
              <div className="mt-3 grid gap-2 text-sm leading-7 text-mist/74">
                {supportProofSteps.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <h3 className="text-base font-semibold text-white">Exact success criteria</h3>
              <div className="mt-3 grid gap-2 text-sm leading-7 text-mist/74">
                {deliveryProofCriteria.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Communication checklist</h2>
          <div className="mt-5">
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="communication readiness check"
              panelTitle="Write-through communication action"
              panelDescription="Log support and delivery-activation changes into the shared revision lane so launch communication posture stops living only as a static checklist."
              defaultRouteTarget="/admin/communication-readiness"
              defaultOperator="Communication Readiness Operator"
              defaultChangedFields="support_contact, delivery_provider, escalation_channel"
              actionNoun="communication-readiness mutation"
            />
          </div>
          <div className="mt-5 grid gap-4">
            {items.map((item) => (
              <div key={item.title} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-base font-semibold text-white">{item.title}</h3>
                      <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                        {item.status}
                      </span>
                    </div>
                    <p className="text-sm leading-7 text-mist/74">{item.note}</p>
                  </div>
                  <Link
                    href={item.href}
                    className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
                  >
                    Open related surface
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Communication readiness registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                This registry combines launch communication checks with route-level checkpoints for contact, signup
                delivery, billing communication, alerts, and launch-day feedback intake so Phase 19 can audit support
                and communication truth from one portable surface.
              </p>
            </div>
            <Link
              href="/api/admin/communication-readiness-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download CSV
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Registry rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.total}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Ready</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.ready}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">In progress</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.inProgress}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Blocked</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.blocked}</p>
            </div>
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
