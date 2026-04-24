import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  countConfiguredValues,
  getLaunchConfigStore,
  launchConfigSectionKeys,
} from "@/lib/launch-config-store";
import {
  getProviderOnboardingItems,
  providerOnboardingRules,
  providerOnboardingTargets,
} from "@/lib/provider-onboarding";
import { getProviderOnboardingRegistrySummary } from "@/lib/provider-onboarding-registry";
import { providerPayloadContracts } from "@/lib/provider-payload-contract";

export const metadata: Metadata = {
  title: "Provider Onboarding",
  description:
    "Protected provider-onboarding page for the first trusted stock, fund, and index market-data feed activation.",
};

export default async function AdminProviderOnboardingPage() {
  await requireUser();

  const items = getProviderOnboardingItems();
  const readinessItems = items.map((item) => ({
    label: item.title,
    status: item.status,
    detail: item.detail,
  }));
  const configStore = await getLaunchConfigStore();
  const registrySummary = await getProviderOnboardingRegistrySummary();

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Provider Onboarding", href: "/admin/provider-onboarding" },
            ]}
          />
          <Eyebrow>Phase 17 execution</Eyebrow>
          <SectionHeading
            title="Provider onboarding"
            description="This page turns the first live-data activation into a cleaner handoff: configure the provider, validate payloads, authenticate execution, and complete the first trusted stock, fund, plus index rollout."
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
              <h2 className="text-2xl font-semibold text-white">Visual setup desk</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                If you do not want to touch code or environment files, use the Launch Config Console. It is the new admin-side page for Supabase keys, provider values, billing credentials, support email, admin-access entries, and index-specific chart-symbol overrides.
              </p>
            </div>
            <Link
              href="/admin/launch-config-console"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open launch config console
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Config sections</p>
              <p className="mt-2 text-2xl font-semibold text-white">{launchConfigSectionKeys.length}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Filled values</p>
              <p className="mt-2 text-2xl font-semibold text-white">{countConfiguredValues(configStore)}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Backend save state</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {configStore.updatedAt ? "Launch config saved in backend store" : "Waiting for first backend save"}
              </p>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Provider onboarding checklist</h2>
          <div className="mt-5">
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="provider onboarding check"
              panelTitle="Write-through provider action"
              panelDescription="Log provider-activation changes into the shared revision lane so market-data onboarding stops living only as a static execution checklist."
              defaultRouteTarget="/admin/provider-onboarding"
              defaultOperator="Provider Onboarding Operator"
              defaultChangedFields="provider_config, execution_auth, rollout_target"
              actionNoun="provider-onboarding mutation"
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
                <p className="mt-3 text-sm leading-7 text-mist/74">{item.detail}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Activation registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                This registry flattens the provider lane into configuration checks, execution entry points, and the
                first trusted rollout targets. Use it as the Phase 17 audit view and export it when you want one
                portable source of truth.
              </p>
            </div>
            <Link
              href="/api/admin/provider-onboarding-registry"
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

        <div className="grid gap-6 lg:grid-cols-2">
          <GlowCard>
              <h2 className="text-2xl font-semibold text-white">First trusted target set</h2>
              <div className="mt-5 grid gap-3">
              {providerOnboardingTargets.map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                  {item}
                </div>
              ))}
            </div>
          </GlowCard>

          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Execution entry points</h2>
            <div className="mt-5 grid gap-3">
              {[
                "/api/admin/market-data/sample-payload",
                "/api/admin/market-data/validate",
                "/api/admin/market-data/ingest",
                "/api/admin/market-data/provider-sync",
                "/admin/market-data-tester",
                "/admin/market-data-playbook",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                  {item}
                </div>
              ))}
            </div>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Normalized payload contract</h2>
          <div className="mt-5 grid gap-4">
            {providerPayloadContracts.map((contract) => (
              <div key={contract.family} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-white">{contract.family}</h3>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    Normalized shape
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{contract.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {contract.requiredFields.map((field) => (
                    <div key={field} className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs text-white/84">
                      {field}
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4 text-xs leading-6 text-mist/74">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(contract.sampleValues, null, 2)}</pre>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-mist/74">
                  {contract.targetRoutes.map((route) => (
                    <div key={route}>{route}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Provider rules</h2>
          <div className="mt-5 grid gap-3">
            {providerOnboardingRules.map((rule) => (
              <div
                key={rule}
                className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76"
              >
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
