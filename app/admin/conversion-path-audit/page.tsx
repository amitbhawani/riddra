import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  conversionPathAuditRules,
  getConversionPathAuditItems,
  getConversionPathRegistrySummary,
} from "@/lib/conversion-path-audit";

export const metadata: Metadata = {
  title: "Conversion Path Audit",
  description:
    "Protected launch audit page for reviewing the real public-to-subscriber journey from homepage through signup, setup, and paid conversion.",
};

export default async function AdminConversionPathAuditPage() {
  await requireUser();

  const items = getConversionPathAuditItems();
  const registrySummary = getConversionPathRegistrySummary();
  const readinessItems = items.map((item) => ({
    label: item.title,
    status: item.status === "Blocked" ? "Required" : item.status,
    detail: item.detail,
    routeTarget: item.href,
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Conversion Path Audit", href: "/admin/conversion-path-audit" },
            ]}
          />
          <Eyebrow>Launch verification</Eyebrow>
          <SectionHeading
            title="Conversion path audit"
            description="This page checks the journey people will actually take: discover the product, sign up, complete setup, trust the support layer, and understand when the paid branch becomes real."
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
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="conversion path lane"
            panelTitle="Write-through conversion-path action"
            panelDescription="Log public-to-paid journey changes into the shared revision lane so conversion-truth work stops living only as an audit checklist."
            defaultRouteTarget="/admin/conversion-path-audit"
            defaultOperator="Conversion Path Operator"
            defaultChangedFields="journey_state, blocker_posture, launch_handoff"
            actionNoun="conversion-path mutation"
          />
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Journey checklist</h2>
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
                    Open related route
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Audit rules</h2>
          <div className="mt-5 grid gap-3">
            {conversionPathAuditRules.map((rule) => (
              <div
                key={rule}
                className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76"
              >
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Conversion-path registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                This registry combines the journey checklist with route checkpoints for discovery, auth, support,
                billing, and launch mode so the full public-to-paid path can be exported and reviewed outside this
                page too.
              </p>
            </div>
            <Link
              href="/api/admin/conversion-path-registry"
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
