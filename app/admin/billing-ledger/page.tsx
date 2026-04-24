import type { Metadata } from "next";
import Link from "next/link";

import { BillingEventCreatePanel } from "@/components/billing-event-create-panel";
import { BillingEventManagePanel } from "@/components/billing-event-manage-panel";
import { BillingInvoiceQuickAddPanel } from "@/components/billing-invoice-quick-add-panel";
import { BillingInvoiceManagePanel } from "@/components/billing-invoice-manage-panel";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getAccountBillingMemory, getBillingLedgerMemory } from "@/lib/billing-ledger-memory-store";
import { getBillingLedgerRegistrySummary } from "@/lib/billing-ledger-registry";

export const metadata: Metadata = {
  title: "Billing Ledger",
  description: "Protected billing-ledger page for subscription health, invoice review, and renewal-risk operations.",
};

export const dynamic = "force-dynamic";

export default async function BillingLedgerPage() {
  const user = await requireUser();
  const [billingLedgerMemory, billingRegistrySummary, accountBillingMemory] = await Promise.all([
    getBillingLedgerMemory(),
    getBillingLedgerRegistrySummary(undefined, "admin"),
    getAccountBillingMemory(user),
  ]);

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Admin", href: "/admin" },
    { name: "Billing Ledger", href: "/admin/billing-ledger" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Phase 2 billing ops</Eyebrow>
          <SectionHeading
            title="Billing ledger"
            description="This page gives the team one place to review subscription health, invoice continuity, and renewal-risk follow-up before real payment data is wired in."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Active subscriptions</p>
            <p className="mt-2 text-3xl font-semibold text-white">{billingLedgerMemory.summary.activeSubscriptions}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Renewals this week</p>
            <p className="mt-2 text-3xl font-semibold text-white">{billingLedgerMemory.summary.renewalsThisWeek}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Needs review</p>
            <p className="mt-2 text-3xl font-semibold text-white">{billingLedgerMemory.summary.failuresNeedReview}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Persisted invoices</p>
            <p className="mt-2 text-3xl font-semibold text-white">{billingLedgerMemory.summary.verifiedInvoices}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Event follow-up</p>
            <p className="mt-2 text-3xl font-semibold text-white">{billingLedgerMemory.summary.eventFollowUp}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Persisted billing ledger</h2>
          <p className="mt-3 text-sm leading-7 text-mist/74">
            This ledger now reads from the local billing-memory store instead of only static examples, so invoice continuity and review posture start behaving like a real backend lane.
          </p>
          <div className="mt-5 grid gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Registry rows</p>
              <p className="mt-2 text-lg font-semibold text-white">{billingRegistrySummary.totalRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Ledger rows</p>
              <p className="mt-2 text-lg font-semibold text-white">{billingRegistrySummary.ledgerRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Event rows</p>
              <p className="mt-2 text-lg font-semibold text-white">{billingRegistrySummary.eventRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Needs follow-up</p>
              <p className="mt-2 text-lg font-semibold text-white">{billingRegistrySummary.followUpRows}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/api/admin/billing-ledger-registry"
              className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Download billing registry CSV
            </Link>
            <Link
              href="/admin/payment-events"
              className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-sm font-medium text-mist/84 transition hover:border-white/20 hover:bg-white/[0.04]"
            >
              Open payment events
            </Link>
          </div>
          <div className="mt-5 grid gap-4">
            {billingLedgerMemory.ledgerRows.map((item) => (
              <div key={`${item.userRef}-${item.latestInvoice}`} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{item.userRef}</h3>
                    <p className="mt-2 text-sm text-mist/66">
                      {item.planName} · Latest invoice {item.latestInvoice}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em]">
                    <span className="rounded-full bg-white/[0.04] px-3 py-1 text-white/80">{item.status}</span>
                    <span className="rounded-full bg-white/[0.04] px-3 py-1 text-white/80">{item.renewalState}</span>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <div className="grid gap-6 xl:grid-cols-2">
          <BillingInvoiceQuickAddPanel
            endpoint="/api/admin/billing-ledger/invoices"
            initialPlanName="Elite Monthly"
            title="Write admin invoice row"
            description="Append invoice snapshots through the dedicated admin billing-ledger API instead of routing this operations desk through the subscriber billing invoice endpoint."
            actionLabel="Save admin invoice row"
          />
          <BillingInvoiceManagePanel
            endpoint="/api/admin/billing-ledger/invoices"
            invoices={accountBillingMemory.invoices}
            title="Manage admin invoice rows"
            description="Archive stale invoice snapshots through the dedicated admin billing-ledger API when this operations desk needs cleanup instead of piggybacking on the subscriber billing invoice route."
            emptyMessage="Keeps the admin billing-ledger desk from relying on the subscriber invoice route for archive actions."
          />
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Recent billing events</h2>
          <p className="mt-3 text-sm leading-7 text-mist/74">
            This lane now supports direct payment-event writes too, so lifecycle continuity and review posture can be updated through event history instead of invoice-only changes.
          </p>
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <BillingEventCreatePanel
              endpoint="/api/admin/billing-ledger/events"
              events={billingLedgerMemory.eventRows}
              title="Record admin ledger event"
              description="Append payment-event rows through the dedicated admin billing-ledger events API instead of routing this operations desk through the subscriber billing endpoint."
              actionLabel="Save admin ledger event"
            />
            <BillingEventManagePanel
              endpoint="/api/admin/billing-ledger/events"
              events={billingLedgerMemory.eventRows}
              title="Manage admin ledger events"
              description="Remove stale payment-event rows through the dedicated admin billing-ledger events API when this operations desk needs cleanup instead of piggybacking on subscriber billing routes."
              emptyMessage="Keeps the admin billing-ledger event lane from relying on the subscriber billing endpoint."
            />
          </div>
          <div className="mt-5 grid gap-4">
            {billingLedgerMemory.eventRows.map((item) => (
              <div key={item.id} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{item.event}</h3>
                    <p className="mt-2 text-sm text-mist/66">
                      {item.occurredAt} · {item.subject} · {item.userRef}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-white/80">{item.status}</span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Ledger and event rules</h2>
          <div className="mt-5 grid gap-3">
            {billingLedgerMemory.rules.map((rule) => (
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
