import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import Link from "next/link";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getPaymentReadinessItems, planActivationNotes } from "@/lib/payment-readiness";
import { paymentReadinessRegistrySummary } from "@/lib/payment-readiness-registry";

export const metadata: Metadata = {
  title: "Payment Readiness",
  description: "Protected payment-readiness page for deferred commercial billing activation, Razorpay setup, and later plan rollout tracking.",
};

export default async function PaymentReadinessPage() {
  await requireUser();

  const items = getPaymentReadinessItems();
  const readinessItems = items.map((item) => ({
    label: item.title,
    status: item.status,
    detail: item.note,
  }));
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Admin", href: "/admin" },
    { name: "Payment Readiness", href: "/admin/payment-readiness" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Phase 2 payments</Eyebrow>
          <SectionHeading
            title="Payment readiness"
            description="This page keeps deferred commercial billing activation honest by separating private-beta preview groundwork from the commercial billing work that can wait until after private beta."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-mist/68">Preview / internal</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {items.filter((item) => item.status === "Preview / internal").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Deferred commercial</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {items.filter((item) => item.status === "Deferred").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {items.filter((item) => item.status === "Blocked").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Checklist rows</p>
            <p className="mt-2 text-3xl font-semibold text-white">{items.length}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Activation checklist</h2>
          <div className="mt-5">
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="payment readiness check"
              panelTitle="Write-through payment action"
              panelDescription="Log billing-activation changes into the shared revision lane so payment readiness stops living only as a static launch checklist."
              defaultRouteTarget="/admin/payment-readiness"
              defaultOperator="Payment Readiness Operator"
              defaultChangedFields="billing_activation, webhook_state, entitlement_mapping"
              actionNoun="payment-readiness mutation"
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

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Billing activation registry</h2>
              <p className="max-w-4xl text-sm leading-7 text-mist/74">
                This registry combines billing activation checks, billing workspace notes, webhook event coverage, and
                plan-to-feature mapping so Phase 19 can audit payment truth from one downloadable surface. Preview or
                internal here means groundwork exists, not that commercial billing is live.
              </p>
            </div>
            <Link
              href="/api/admin/payment-readiness-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download CSV
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Registry rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{paymentReadinessRegistrySummary.rows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Preview / internal</p>
              <p className="mt-2 text-2xl font-semibold text-white">{paymentReadinessRegistrySummary.previewInternal}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Deferred commercial</p>
              <p className="mt-2 text-2xl font-semibold text-white">{paymentReadinessRegistrySummary.deferred}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Blocked</p>
              <p className="mt-2 text-2xl font-semibold text-white">{paymentReadinessRegistrySummary.blocked}</p>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Plan rollout notes</h2>
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
                      Build mode
                    </span>
                  ) : null}
                </div>
                <p className="mt-4 text-sm leading-7 text-mist/74">{plan.activationNote}</p>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Link
              href="/admin/payment-events"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Open payment events
            </Link>
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
