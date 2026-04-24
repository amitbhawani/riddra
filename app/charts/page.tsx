import type { Metadata } from "next";
import Link from "next/link";

import { AdvancedChartWorkspace } from "@/components/advanced-chart-workspace";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getGlobalSidebarRail } from "@/components/global-sidebar-rail-server";
import { JsonLd } from "@/components/json-ld";
import { MarketDataUnavailableState } from "@/components/market-data-unavailable-state";
import { ProductPageTwoColumnLayout } from "@/components/product-page-system";
import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import {
  chartToolGroups,
  chartWorkspaceLanes,
  derivativesModules,
} from "@/lib/advanced-chart-data";
import { getStocks } from "@/lib/content";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Charts",
  description: "Explore stock charts, compare setups, and jump into dedicated chart routes from Riddra's chart workspace.",
};

export default async function ChartsPage() {
  const stocks = await getStocks();
  const sidebar = await getGlobalSidebarRail("charts");
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Charts", href: "/charts" },
  ];

  return (
    <div className="riddra-product-page py-3 sm:py-4">
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <JsonLd
        data={buildWebPageSchema({
          title: "Charts",
          description:
            "Explore stock charts, compare setups, and jump into dedicated chart routes from Riddra's chart workspace.",
          path: "/charts",
        })}
      />
      <Container>
        <ProductPageTwoColumnLayout
          left={
            <div className="riddra-legacy-light-surface space-y-6">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Charting workspace</Eyebrow>
          <SectionHeading
            title="Charts"
            description="Scan price structure, explore chart tools, and move quickly from market discovery into dedicated stock chart views."
          />
        </div>

        <PublicSurfaceTruthSection
          eyebrow="Chart route truth"
          title="This chart hub is useful for setup discovery, but deeper continuity still depends on launch activation"
          description="Use the chart workspace confidently for public exploration, while keeping auth continuity, premium workflow promises, and support follow-through honest until those live paths are fully verified."
          authReady="Signed-in continuity is active enough to carry chart discovery into account and workspace flows."
          authPending="Local preview auth still limits how trustworthy the full chart-to-account handoff can be."
          billingReady="Billing core credentials exist, so advanced chart and premium workflow language can move beyond pure preview framing once checkout and webhook flows are exercised."
          billingPending="Billing credentials are still incomplete, so advanced chart promises should stay expectation-setting."
          supportReady="Support delivery is configured enough to begin testing real follow-up for public chart users who convert."
          supportPending="Support delivery is still not fully active, so chart routes should keep support expectations conservative."
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
        />

        <AdvancedChartWorkspace />

        <div className="grid gap-6 lg:grid-cols-3">
          {chartWorkspaceLanes.map((lane) => (
            <GlowCard key={lane.title}>
              <h2 className="text-2xl font-semibold text-white">{lane.title}</h2>
              <p className="mt-3 text-sm leading-7 text-mist/74">{lane.description}</p>
            </GlowCard>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Reference-grade tool stack</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {chartToolGroups.map((group) => (
                <div key={group.title} className="rounded-3xl border border-white/8 bg-black/15 p-4">
                  <p className="text-sm font-semibold text-white">{group.title}</p>
                  <div className="mt-4 space-y-2">
                    {group.items.map((item) => (
                      <div key={item} className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-mist/76">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </GlowCard>

          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Trader workflow depth still required</h2>
            <div className="mt-5 space-y-3">
              {derivativesModules.map((module) => (
                <div key={module.title} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <p className="text-sm font-semibold text-white">{module.title}</p>
                  <p className="mt-2 text-sm leading-7 text-mist/74">{module.description}</p>
                </div>
              ))}
            </div>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Stock chart routes</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-mist/74">
            Open a dedicated chart route like <span className="text-white">/stocks/tata-motors/chart</span> when you want price structure, indicators, and data status without the full research page around it.
          </p>
          <div className="mt-6 grid gap-3 lg:grid-cols-2">
            {stocks.length > 0 ? (
              stocks.map((stock) => (
                <Link
                  key={stock.slug}
                  href={`/stocks/${stock.slug}/chart`}
                  className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 transition hover:border-white/16 hover:bg-white/[0.05]"
                >
                  <div className="text-sm uppercase tracking-[0.16em] text-mist/62">{stock.symbol}</div>
                  <div className="mt-2 text-lg font-semibold text-white">{stock.name}</div>
                  <div className="mt-2 text-sm text-mist/72">
                    {stock.snapshotMeta?.mode === "delayed_snapshot"
                      ? "Open dedicated chart page"
                      : stock.snapshotMeta?.mode === "manual_close"
                        ? "Open chart with manual retained context"
                        : "Open chart waiting state"}
                  </div>
                </Link>
              ))
            ) : (
              <div className="lg:col-span-2">
                <MarketDataUnavailableState
                  state="feature_pending"
                  eyebrow="Chart route availability"
                  title="Stock chart routes are not available yet"
                  description="Dedicated public stock chart routes stay withheld until tracked stock records and retained chart coverage are available."
                  items={[
                    "Tracked stock records must exist before dedicated chart routes appear here.",
                    "Retained delayed or verified OHLCV then determines whether each chart opens with delayed context or a fuller chart read.",
                  ]}
                />
              </div>
            )}
          </div>
        </GlowCard>
            </div>
          }
          right={sidebar}
        />
      </Container>
    </div>
  );
}
