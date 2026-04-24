import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { SubscriberAuditSection } from "@/components/subscriber-audit-section";
import { SubscriberRouteLinkGrid } from "@/components/subscriber-route-link-grid";
import { SubscriberStatGrid } from "@/components/subscriber-stat-grid";
import { SubscriberTruthNotice } from "@/components/subscriber-truth-notice";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getAccountBillingMemory } from "@/lib/billing-ledger-memory-store";
import { getBillingLedgerRegistrySummary } from "@/lib/billing-ledger-registry";
import { billingWorkspaceItems, planActivationNotes } from "@/lib/payment-readiness";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";
import { getSubscriberSurfaceTruth } from "@/lib/subscriber-surface-truth";

export const metadata: Metadata = {
  title: "Billing",
  description: "Review private-beta billing posture, stored billing placeholders, and deferred commercial readiness from your billing workspace.",
};

export const dynamic = "force-dynamic";

export default async function AccountBillingPage() {
  const user = await requireUser();
  const truth = getSubscriberSurfaceTruth();
  const [billingMemory, billingRegistrySummary] = await Promise.all([
    getAccountBillingMemory(user),
    getBillingLedgerRegistrySummary(user, "account"),
  ]);
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Account", href: "/account" },
    { name: "Billing", href: "/account/billing" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <JsonLd
        data={buildWebPageSchema({
          title: "Billing",
          description:
            "Review private-beta billing posture, stored billing placeholders, and deferred commercial readiness from your billing workspace.",
          path: "/account/billing",
        })}
      />
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Subscriber workspace</Eyebrow>
          <SectionHeading
            title="Billing workspace"
            description="Review your private-beta access posture, stored billing placeholders, and the support path for later commercial billing without implying that checkout is already live."
          />
        </div>

        <SubscriberTruthNotice
          eyebrow="Billing truth"
          title="Commercial billing is unavailable during private beta"
          description="This workspace is now a read-only continuity surface. Verified checkout, webhook-confirmed invoices, subscription renewals, and charge recovery are intentionally deferred until the commercial lane resumes."
          items={[
            "Paid upgrades and invoice collection should not be expected from this route during private beta.",
            truth.hasBillingCore
              ? "Razorpay core credentials exist, but they remain intentionally unused until commercial billing resumes."
              : "Razorpay credentials are still absent, which is acceptable because private beta does not depend on live billing.",
            truth.hasBillingWebhook
              ? "Webhook signing exists in code, but billing lifecycle proof is still deferred."
              : "Webhook signing is not configured, so stored billing rows remain placeholders rather than charge truth.",
            truth.hasSupportDelivery
              ? "Support delivery is available now, so billing questions should route through support rather than through a fake checkout flow."
              : "Support delivery still needs operator verification, so billing questions should stay expectation-setting.",
            `Stored billing placeholder state: ${billingMemory.invoices.length} invoice rows · lifecycle ${billingMemory.lifecycleState}.`,
          ]}
          href="/admin/payment-readiness"
          hrefLabel="Open payment readiness"
        />

        <SubscriberStatGrid
          items={billingWorkspaceItems.map((item) => ({
            label: item.title,
            value: item.value,
            detail: item.note,
          }))}
        />

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Private-beta commercial posture</h2>
          <div className="mt-4 rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm leading-7 text-mist/74">
            Current stored billing placeholder: <span className="text-white">{billingMemory.currentPlan}</span> · {billingMemory.lifecycleState} · updated{" "}
            <span className="text-white">{new Date(billingMemory.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {planActivationNotes.map((plan) => (
              <div key={plan.name} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                    <p className="mt-2 text-sm text-mist/68">{plan.price}</p>
                  </div>
                  {plan.featured ? (
                    <span className="rounded-full bg-aurora/15 px-3 py-1 text-xs uppercase tracking-[0.18em] text-aurora">
                      Private beta
                    </span>
                  ) : null}
                </div>
                <p className="mt-4 text-sm leading-7 text-mist/74">{plan.activationNote}</p>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <SubscriberRouteLinkGrid
              items={[
                {
                  href: "/pricing",
                  title: "Open pricing",
                  note: "Compare the public pricing expectations with the private-beta billing gate shown here.",
                },
                {
                  href: "/account",
                  title: "Open account",
                  note: "Return to the main account hub after reviewing billing posture and account continuity.",
                },
                {
                  href: "/admin/payment-readiness",
                  title: "Review payment readiness",
                  note: "Check the deferred commercial billing desk that still governs later checkout and webhook proof.",
                },
                {
                  href: "/account/support",
                  title: "Open support",
                  note: "Use support as the private-beta path for billing questions while paid flows remain intentionally unavailable.",
                },
                {
                  href: "/account/billing/lifecycle",
                  title: "Open billing lifecycle",
                  note: "Review the stored lifecycle placeholder state without implying that renewal or downgrade automation is already live.",
                },
                {
                  href: "/account/access/entitlements",
                  title: "Open entitlement audit",
                  note: "Check the persisted entitlement placeholder state that still stands in for live billing coupling.",
                },
              ]}
            />
          </div>
        </GlowCard>

        <SubscriberAuditSection
          title="Billing registry snapshot"
          description="Your billing workspace now has its own stitched registry export, so invoice and payment-event continuity can be audited from one account-scoped lane instead of being split between preview cards and the admin ledger only."
          headline={`${billingRegistrySummary.totalRows} billing rows stitched across invoice, event, and follow-up continuity`}
          downloadHref="/api/billing-ledger-registry"
          downloadLabel="Download billing registry CSV"
          secondaryHref="/admin/billing-ledger"
          secondaryLabel="Open admin billing ledger"
          stats={[
            { label: "Registry rows", value: billingRegistrySummary.totalRows },
            { label: "Invoice rows", value: billingRegistrySummary.invoiceRows },
            { label: "Event rows", value: billingRegistrySummary.eventRows },
            { label: "Needs follow-up", value: billingRegistrySummary.followUpRows },
          ]}
        />

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Stored billing placeholder history</h2>
          <p className="mt-3 text-sm leading-7 text-mist/72">
            These invoice rows come from the signed-in account's stored billing placeholder state. They are read-only during private beta and should never be interpreted as real captured charges.
          </p>
          <div className="mt-5 grid gap-4">
            {billingMemory.invoices.map((invoice) => (
              <div key={invoice.invoiceId} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{invoice.planName}</h3>
                    <p className="mt-2 text-sm text-mist/66">
                      Preview row · {invoice.billedAt}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em]">
                    <span className="rounded-full bg-white/[0.04] px-3 py-1 text-white/80">{invoice.status}</span>
                    <span className="rounded-full bg-white/[0.04] px-3 py-1 text-white/80">{invoice.amount}</span>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{invoice.note}</p>
                <p className="mt-2 text-xs text-mist/60">Read-only placeholder row, not charge truth.</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Stored billing placeholder events</h2>
          <p className="mt-3 text-sm leading-7 text-mist/72">
            Billing events remain visible here for continuity, but commercial billing is intentionally unavailable during private beta, so this event trail is read-only and support-led.
          </p>
          {billingMemory.relatedEvents.length ? (
            <div className="mt-5 grid gap-4">
              {billingMemory.relatedEvents.map((event) => (
                <div key={event.id} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-white">{event.event}</h3>
                      <p className="mt-2 text-sm text-mist/66">
                        {event.occurredAt} · {event.subject}
                      </p>
                    </div>
                    <span className="rounded-full bg-white/[0.04] px-3 py-1 text-white/80">{event.status}</span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{event.note}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] p-5">
              <p className="text-base font-semibold text-white">No stored billing placeholder events for this account yet</p>
              <p className="mt-3 text-sm leading-7 text-mist/74">
                When commercial billing eventually resumes, this area should graduate from placeholder continuity into verified lifecycle events. For private beta, support remains the escalation path.
              </p>
            </div>
          )}
        </GlowCard>
      </Container>
    </div>
  );
}
