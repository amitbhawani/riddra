import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  providerAdapterItems,
  providerAdapterRules,
  providerAdaptersSummary,
} from "@/lib/provider-adapters";

export const metadata: Metadata = {
  title: "Provider Adapters",
  description:
    "Protected provider-adapters page for normalized contracts across auth, billing, communications, brokers, AI, and storage.",
};

export default async function AdminProviderAdaptersPage() {
  await requireUser();
  const readinessItems = providerAdapterItems.map((item) => ({
    label: item.title,
    status: item.status,
    detail: item.summary,
    routeTarget: "/admin/provider-adapters",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Provider Adapters", href: "/admin/provider-adapters" },
            ]}
          />
          <Eyebrow>Extensibility contracts</Eyebrow>
          <SectionHeading
            title="Provider adapters"
            description="This page frames provider integrations as adapter contracts so vendors can be replaced without rewriting product logic or breaking operator workflows."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Adapter domains</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {providerAdaptersSummary.adapterDomains}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Interchangeable profiles</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {providerAdaptersSummary.interchangeableProfiles}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Rollout states</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {providerAdaptersSummary.rolloutStates}
            </p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="provider adapter contract"
            panelTitle="Write-through provider adapter action"
            panelDescription="Log adapter-contract changes into the shared revision lane so provider replacement posture stops living only as a static architecture board."
            defaultRouteTarget="/admin/provider-adapters"
            defaultOperator="Provider Adapter Operator"
            defaultChangedFields="adapter_domain, contract_state, interchangeability"
            actionNoun="provider-adapter mutation"
          />
          {providerAdapterItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Adapter rules</h2>
          <div className="mt-5 grid gap-3">
            {providerAdapterRules.map((rule) => (
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
