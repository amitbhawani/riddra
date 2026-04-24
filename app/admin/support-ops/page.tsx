import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { SupportOpsRevisionPanel } from "@/components/support-ops-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { supportOpsItems, supportOpsRules, supportOpsSummary } from "@/lib/support-ops";
import { getSupportOpsRegistrySummary } from "@/lib/support-ops-registry";

export const metadata: Metadata = {
  title: "Support Ops",
  description: "Protected support-ops page for help content, triage queues, subscriber success, and operational support rules.",
};

export default async function AdminSupportOpsPage() {
  await requireUser();
  const registrySummary = getSupportOpsRegistrySummary();

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Admin", href: "/admin" }, { name: "Support Ops", href: "/admin/support-ops" }]} />
          <Eyebrow>User success</Eyebrow>
          <SectionHeading
            title="Support ops"
            description="This page turns help content, issue triage, and subscriber recovery into a deliberate operations layer instead of scattered manual interventions."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Help families</p>
            <p className="mt-2 text-3xl font-semibold text-white">{supportOpsSummary.helpFamilies}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Support queues</p>
            <p className="mt-2 text-3xl font-semibold text-white">{supportOpsSummary.supportQueues}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Success journeys</p>
            <p className="mt-2 text-3xl font-semibold text-white">{supportOpsSummary.successJourneys}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          {supportOpsItems.map((item) => (
            <GlowCard key={item.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{item.summary}</p>
                </div>
                <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                  {item.status}
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Support rules</h2>
          <div className="mt-5 grid gap-3">
            {supportOpsRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>

        <SupportOpsRevisionPanel items={supportOpsItems} />

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Support ops registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                This registry combines support surfaces, route checkpoints, and operating rules so Phase 19 can audit
                help content, recovery paths, launch-day triage, and operator discipline from one portable surface.
              </p>
            </div>
            <Link
              href="/api/admin/support-ops-registry"
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
