import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { providerConfigItems, providerConfigRules, providerConfigsSummary } from "@/lib/provider-configs";
import { getProviderConfigRegistrySummary } from "@/lib/provider-config-registry";

export const metadata: Metadata = {
  title: "Provider Configs",
  description: "Protected provider-configs page for switchable provider classes, config profiles, and operational rollout planning.",
};

export default async function AdminProviderConfigsPage() {
  await requireUser();
  const registrySummary = getProviderConfigRegistrySummary();
  const readinessItems = providerConfigItems.map((item) => ({
    label: item.title,
    status: item.status,
    detail: item.summary,
    routeTarget: "/admin/provider-configs",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Admin", href: "/admin" }, { name: "Provider Configs", href: "/admin/provider-configs" }]} />
          <Eyebrow>Provider profiles</Eyebrow>
          <SectionHeading
            title="Provider configs"
            description="This page turns replaceable-provider strategy into configurable operational profiles so vendors can stay modular instead of bleeding into product logic."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Active profiles</p>
            <p className="mt-2 text-3xl font-semibold text-white">{providerConfigsSummary.activeProfiles}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Switchable classes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{providerConfigsSummary.switchableClasses}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked providers</p>
            <p className="mt-2 text-3xl font-semibold text-white">{providerConfigsSummary.blockedProviders}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="provider config profile"
            panelTitle="Write-through provider config action"
            panelDescription="Log provider-profile and rollout changes into the shared revision lane so switchable provider posture stops living only as a static config board."
            defaultRouteTarget="/admin/provider-configs"
            defaultOperator="Provider Config Operator"
            defaultChangedFields="provider_class, config_profile, rollout_state"
            actionNoun="provider-config mutation"
          />
          {providerConfigItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Provider rules</h2>
          <div className="mt-5 grid gap-3">
            {providerConfigRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Provider config registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                This registry combines provider profiles, runtime checkpoints, and integration rules so Phase 17 can
                audit switchable contracts and rollout readiness from one portable surface.
              </p>
            </div>
            <Link
              href="/api/admin/provider-config-registry"
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
              <p className="text-sm text-mist/68">Live</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.live}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">In progress</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.inProgress}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Queued</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.queued}</p>
            </div>
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
