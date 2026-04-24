import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getTrustSignoffItems, trustSignoffRules } from "@/lib/trust-signoff";
import { getTrustSignoffRegistrySummary } from "@/lib/trust-signoff-registry";

export const metadata: Metadata = {
  title: "Trust Signoff",
  description:
    "Protected Phase 19 trust-signoff page for privacy, terms, support credibility, and broad-launch messaging review.",
};

export default async function AdminTrustSignoffPage() {
  await requireUser();
  const items = getTrustSignoffItems();
  const readinessItems = items.map((item) => ({
    label: item.title,
    status: item.status,
    detail: item.detail,
    routeTarget: item.href,
  }));
  const registrySummary = getTrustSignoffRegistrySummary();

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Trust Signoff", href: "/admin/trust-signoff" },
            ]}
          />
          <Eyebrow>Phase 19 trust layer</Eyebrow>
          <SectionHeading
            title="Trust signoff"
            description="This page keeps privacy, terms, support credibility, and public promise discipline in one place so broad-launch trust is reviewed as an operating layer, not as leftover copy."
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
          <h2 className="text-2xl font-semibold text-white">Trust checklist</h2>
          <div className="mt-5">
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="trust signoff check"
              panelTitle="Write-through trust action"
              panelDescription="Log trust-signoff changes into the shared revision lane so legal and support posture stop living only as a static trust checklist."
              defaultRouteTarget="/admin/trust-signoff"
              defaultOperator="Trust Signoff Operator"
              defaultChangedFields="trust_owner, legal_posture, support_credibility"
              actionNoun="trust-signoff mutation"
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
                    <p className="text-sm leading-7 text-mist/74">{item.detail}</p>
                  </div>
                  <Link
                    href={item.href}
                    className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
                  >
                    Open related page
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Trust rules</h2>
          <div className="mt-5 grid gap-3">
            {trustSignoffRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Trust signoff registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                This registry combines the trust checklist with public-route checkpoints for legal ownership, support
                promises, domain posture, risk disclosure, and external incident confidence so Phase 19 can audit
                broad-launch trust from one portable surface.
              </p>
            </div>
            <Link
              href="/api/admin/trust-signoff-registry"
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
