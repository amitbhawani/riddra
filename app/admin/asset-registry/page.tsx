import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  assetRegistryRules,
  assetRegistrySamples,
  assetRegistrySummary,
} from "@/lib/asset-registry-ops";

export const metadata: Metadata = {
  title: "Asset Registry",
  description: "Protected asset-registry page for canonical asset records, alias continuity, and lifecycle-aware route ownership.",
};

export default async function AssetRegistryPage() {
  await requireUser();

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Admin", href: "/admin" },
    { name: "Asset Registry", href: "/admin/asset-registry" },
  ];
  const readinessItems = assetRegistrySamples.map((item) => ({
    label: item.asset,
    status: item.state === "Live" ? "Ready" : "Needs verification",
    detail: item.note,
    routeTarget:
      item.type === "Listed stock"
        ? "/stocks"
        : item.type === "Mainboard IPO"
          ? "/ipo"
          : item.type === "SME IPO"
            ? "/ipo/sme"
            : "/mutual-funds",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Registry backbone</Eyebrow>
          <SectionHeading
            title="Asset registry"
            description="This page tracks the canonical asset layer that should unify stocks, IPOs, funds, aliases, lifecycle states, and route continuity across the platform."
          />
        </div>

        <GlowCard>
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="asset registry record"
            panelTitle="Write-through asset-registry action"
            panelDescription="Log canonical-identity and alias-continuity changes into the shared revision lane so registry ownership stops living only as a static backbone page."
            defaultRouteTarget="/admin/asset-registry"
            defaultOperator="Asset Registry Operator"
            defaultChangedFields="asset_identity, alias_mapping, lifecycle_state"
            actionNoun="asset-registry mutation"
          />
        </GlowCard>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Canonical assets</p>
            <p className="mt-2 text-3xl font-semibold text-white">{assetRegistrySummary.canonicalAssets}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Alias mappings</p>
            <p className="mt-2 text-3xl font-semibold text-white">{assetRegistrySummary.aliasMappings}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Lifecycle states</p>
            <p className="mt-2 text-3xl font-semibold text-white">{assetRegistrySummary.lifecycleStates}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Registry samples</h2>
          <div className="mt-5 grid gap-4">
            {assetRegistrySamples.map((item) => (
              <div key={item.asset} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{item.asset}</h3>
                    <p className="mt-2 text-sm text-mist/66">{item.type}</p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {item.state}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Registry rules</h2>
          <div className="mt-5 grid gap-3">
            {assetRegistryRules.map((rule) => (
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
