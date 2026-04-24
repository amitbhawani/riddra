import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { cmsBlueprints } from "@/lib/cms-blueprints";
import { wealthFamilyMeta, wealthProducts } from "@/lib/wealth-products";

export const metadata: Metadata = {
  title: "Wealth Products Ops",
  description: "Protected wealth-product operations page for ETF, PMS, AIF, and SIF expansion planning across CMS, lifecycle, and route families.",
};

export default async function WealthProductsOpsPage() {
  await requireUser();

  const wealthBlueprints = cmsBlueprints.filter((item) => ["etf", "pms", "aif", "sif"].includes(item.assetType));
  const readinessItems = wealthBlueprints.map((blueprint) => ({
    label: blueprint.title,
    status: "Needs verification",
    detail: blueprint.description,
    routeTarget:
      blueprint.assetType === "etf"
        ? "/etfs"
        : blueprint.assetType === "pms"
          ? "/pms"
          : blueprint.assetType === "aif"
            ? "/aif"
            : "/sif",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Admin", href: "/admin" }, { name: "Wealth Products", href: "/admin/wealth-products" }]} />
          <Eyebrow>Wealth expansion ops</Eyebrow>
          <SectionHeading
            title="Wealth product operations"
            description="This page keeps ETF, PMS, AIF, and SIF expansion inside the same CMS, registry, lifecycle, and document discipline as the rest of Riddra."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
          {Object.entries(wealthFamilyMeta).map(([familyKey, family]) => (
            <GlowCard key={family.href}>
              <h2 className="text-2xl font-semibold text-white">{family.label}</h2>
              <p className="mt-3 text-sm leading-7 text-mist/74">{family.description}</p>
              <div className="mt-4 rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <p className="text-sm text-mist/66">Seeded records</p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {wealthProducts.filter((product) => product.family === familyKey).length}
                </p>
              </div>
            </GlowCard>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="wealth product blueprint"
              panelTitle="Write-through wealth-product action"
              panelDescription="Log wealth-family blueprint and expansion changes into the shared revision lane so wealth ops stop living only as family-planning cards."
              defaultRouteTarget="/admin/wealth-products"
              defaultOperator="Wealth Product Operator"
              defaultChangedFields="wealth_family, blueprint_scope, suitability_posture"
              actionNoun="wealth-product mutation"
            />
          </GlowCard>
          {wealthBlueprints.map((blueprint) => (
            <GlowCard key={blueprint.assetType}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{blueprint.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{blueprint.description}</p>
                </div>
                <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                  {blueprint.assetType}
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {blueprint.blocks.map((block) => (
                  <div key={block.key} className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-white">{block.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-mist/58">{block.key}</p>
                    </div>
                    <div className="rounded-full bg-aurora/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-aurora">
                      {block.mode}
                    </div>
                  </div>
                ))}
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Wealth-family rules</h2>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {[
              "ETF, PMS, AIF, and SIF pages should reuse the same asset registry, documents, announcements, revisions, and override controls.",
              "High-intent wealth pages should stay document-rich and suitability-aware instead of acting like generic marketing pages.",
              "Every new wealth family should be installable into the same CMS and route-system pattern rather than creating one-off backend exceptions.",
              "Investor tools should connect naturally into these page families so discovery and utility reinforce each other.",
            ].map((rule) => (
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
