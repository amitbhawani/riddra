import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { assetMemoryFamilies, assetMemoryRules, assetMemorySummary } from "@/lib/asset-memory-map";

export const metadata: Metadata = {
  title: "Asset Memory",
  description: "Protected asset-memory surface for archive continuity across stocks, IPOs, funds, wealth products, and learning assets.",
};

export default async function AssetMemoryPage() {
  await requireUser();
  const readinessItems = assetMemoryFamilies.map((family) => ({
    label: family.title,
    status:
      family.title === "Listed stocks" || family.title === "Mutual funds"
        ? "Needs verification"
        : family.title === "IPO and SME IPOs"
          ? "In progress"
          : "Queued",
    detail: family.continuity,
    routeTarget: family.anchor,
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Asset Memory", href: "/admin/asset-memory" },
            ]}
          />
          <Eyebrow>Archive density</Eyebrow>
          <SectionHeading
            title="Asset memory map"
            description="Phase 16 should make archive continuity asset-specific. This page tracks how stocks, IPOs, funds, wealth products, and learning assets preserve long-term memory."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Tracked families</p>
            <p className="mt-2 text-3xl font-semibold text-white">{assetMemorySummary.trackedFamilies}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Memory chains</p>
            <p className="mt-2 text-3xl font-semibold text-white">{assetMemorySummary.memoryChains}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Continuity modes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{assetMemorySummary.continuityModes}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="asset-memory family"
              panelTitle="Write-through asset-memory action"
              panelDescription="Log archive and continuity changes into the shared revision lane so long-lived memory planning stops living only as a static family map."
              defaultRouteTarget="/admin/asset-memory"
              defaultOperator="Asset Memory Operator"
              defaultChangedFields="asset_family, memory_chain, continuity_mode"
              actionNoun="asset-memory mutation"
            />
          </GlowCard>
          {assetMemoryFamilies.map((family) => (
            <GlowCard key={family.title}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{family.title}</h2>
                  <p className="mt-3 max-w-4xl text-sm leading-7 text-mist/74">{family.continuity}</p>
                </div>
                <Link
                  href={family.anchor}
                  className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
                >
                  Open surface
                </Link>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Asset-memory rules</h2>
          <div className="mt-5 grid gap-3">
            {assetMemoryRules.map((rule) => (
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
