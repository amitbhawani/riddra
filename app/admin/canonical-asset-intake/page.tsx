import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  canonicalAssetIntakeRules,
  canonicalAssetIntakeSummary,
  canonicalAssetIntakeTemplates,
} from "@/lib/canonical-asset-intake";
import { canonicalCoverageFamilyBreakdown, canonicalCoverageSummary } from "@/lib/canonical-coverage";

export const metadata: Metadata = {
  title: "Canonical Asset Intake",
  description:
    "Protected asset-intake page for the exact spreadsheet columns and first-wave targets needed to scale stocks, funds, IPOs, and wealth products.",
};

export default async function AdminCanonicalAssetIntakePage() {
  await requireUser();
  const readinessItems = canonicalAssetIntakeTemplates.map((template) => ({
    label: template.family,
    status:
      template.family === "Stocks" || template.family === "Mutual Funds" || template.family === "IPOs"
        ? "Needs verification"
        : "Needs activation",
    detail: template.objective,
    routeTarget:
      template.family === "Stocks"
        ? "/stocks"
        : template.family === "Mutual Funds"
          ? "/mutual-funds"
          : template.family === "IPOs"
            ? "/ipo"
            : "/admin/wealth-products",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Canonical Asset Intake", href: "/admin/canonical-asset-intake" },
            ]}
          />
          <Eyebrow>Scale handoff</Eyebrow>
          <SectionHeading
            title="Canonical asset intake"
            description="This is the exact human handoff for Phase 18. It tells the team what spreadsheet columns to prepare for stocks, funds, IPOs, and wealth products so coverage can scale beyond the tiny seeded universe."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Tracked families</p>
            <p className="mt-2 text-3xl font-semibold text-white">{canonicalAssetIntakeSummary.liveFamilies}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Current seeded assets</p>
            <p className="mt-2 text-3xl font-semibold text-white">{canonicalAssetIntakeSummary.currentSeededAssets}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">First-wave goal</p>
            <p className="mt-2 text-base font-semibold leading-7 text-white">
              {canonicalAssetIntakeSummary.firstWaveGoal}
            </p>
          </GlowCard>
        </div>

        <GlowCard>
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="canonical asset intake family"
            panelTitle="Write-through canonical-intake action"
            panelDescription="Log intake-family and scale-handoff decisions into the shared revision lane so coverage-expansion planning stops living only as spreadsheet guidance."
            defaultRouteTarget="/admin/canonical-asset-intake"
            defaultOperator="Canonical Intake Operator"
            defaultChangedFields="asset_family, intake_columns, coverage_posture"
            actionNoun="canonical-intake mutation"
          />
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Canonical route coverage registry</h2>
              <p className="max-w-4xl text-sm leading-7 text-mist/74">
                This is the live exportable route registry for Phase 18. It shows what public stock, fund, IPO, ETF,
                PMS, AIF, and SIF pages currently exist, plus whether they are still seeded, carrying a delayed
                snapshot, or only ready at the identity layer.
              </p>
            </div>
            <a
              href="/api/admin/canonical-coverage"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download coverage CSV
            </a>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Total routes</p>
              <p className="mt-2 text-3xl font-semibold text-white">{canonicalCoverageSummary.totalRoutes}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Delayed snapshot routes</p>
              <p className="mt-2 text-3xl font-semibold text-white">{canonicalCoverageSummary.delayedRoutes}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Manual close routes</p>
              <p className="mt-2 text-3xl font-semibold text-white">{canonicalCoverageSummary.manualRoutes}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Identity-only routes</p>
              <p className="mt-2 text-3xl font-semibold text-white">{canonicalCoverageSummary.identityReadyRoutes}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {canonicalCoverageFamilyBreakdown.map((family) => (
              <div key={family.family} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-base font-semibold text-white">{family.familyLabel}</h3>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {family.routeCount} routes
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/80">
                  <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1">
                    Delayed: {family.delayed}
                  </div>
                  <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1">
                    Manual: {family.manual}
                  </div>
                  <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1">
                    Seeded: {family.seeded}
                  </div>
                  <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1">
                    Identity ready: {family.identityReady}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlowCard>

        <div className="grid gap-6">
          {canonicalAssetIntakeTemplates.map((template) => (
            <GlowCard key={template.family}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-mist/58">{template.owner}</p>
                  <h2 className="text-2xl font-semibold text-white">{template.family}</h2>
                  <p className="max-w-4xl text-sm leading-7 text-mist/74">{template.objective}</p>
                </div>
                <div className="rounded-[24px] border border-white/8 bg-black/15 px-5 py-4 text-sm text-mist/76">
                  <div>
                    Current coverage: <span className="text-white">{template.currentCoverage}</span>
                  </div>
                  <div className="mt-2">
                    First wave: <span className="text-white">{template.firstWaveTarget}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-[24px] border border-white/8 bg-black/15 p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-mist/58">Required spreadsheet columns</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {template.columns.map((column) => (
                    <div
                      key={column}
                      className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs text-white/84"
                    >
                      {column}
                    </div>
                  ))}
                </div>
                <a
                  href={`/api/admin/canonical-intake-template?family=${encodeURIComponent(template.family)}`}
                  className="mt-5 inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
                >
                  Download CSV template
                </a>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Intake rules</h2>
          <div className="mt-5 grid gap-3">
            {canonicalAssetIntakeRules.map((rule) => (
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
