import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { MarketDataPayloadTester } from "@/components/market-data-payload-tester";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getIndexChartSymbolAuditRows } from "@/lib/index-chart-symbol-audit";

export const metadata: Metadata = {
  title: "Market Data Tester",
  description: "Protected tester for validating provider payloads before they are ingested into stock, fund, and index data layers.",
};

export default async function MarketDataTesterPage() {
  await requireUser();
  const chartRows = getIndexChartSymbolAuditRows();
  const readinessItems = [
    {
      label: "Sample payload contract",
      status: "Ready",
      detail:
        "The normalized sample payload is available for provider onboarding and first-rollout stock, fund, and tracked-index validation.",
      routeTarget: "/api/admin/market-data/sample-payload",
    },
    {
      label: "Validation gate",
      status: "Ready",
      detail: "Payload shape can be checked without writing anything into the persisted market-data layer.",
      routeTarget: "/api/admin/market-data/validate",
    },
    {
      label: "Verified ingest gate",
      status: "Needs verification",
      detail: "Use the write route only after payload validation and provider truth checks pass together.",
      routeTarget: "/api/admin/market-data/ingest",
    },
    ...chartRows.map((row) => ({
      label: row.label,
      status:
        row.status === "Ready"
          ? "Ready"
          : row.status === "In progress"
            ? "Needs verification"
            : "Needs activation",
      detail: row.note,
      routeTarget: row.route,
    })),
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Market Data Tester", href: "/admin/market-data-tester" },
            ]}
          />
          <Eyebrow>Provider handoff</Eyebrow>
          <SectionHeading
            title="Market data tester"
            description="Use this desk to validate the first trusted stock set, first trusted fund NAV set, plus tracked index payloads before they are sent into the verified ingestion route. This keeps provider handoff safe and debuggable."
          />
        </div>

        <GlowCard>
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="market data tester lane"
            panelTitle="Write-through market-data tester action"
            panelDescription="Log payload-validation and index-symbol test changes into the shared revision lane so provider handoff stops living only as a test-lab explainer."
            defaultRouteTarget="/admin/market-data-tester"
            defaultOperator="Market Data Tester Operator"
            defaultChangedFields="payload_contract, validation_gate, chart_symbol_posture"
            actionNoun="market-data tester mutation"
          />
        </GlowCard>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Sample source</p>
            <p className="mt-2 text-lg font-semibold text-white">/api/admin/market-data/sample-payload</p>
            <p className="mt-3 text-sm leading-7 text-mist/74">
              Pulls the normalized first-rollout stock, fund, and tracked-index sample used for provider onboarding.
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Validation route</p>
            <p className="mt-2 text-lg font-semibold text-white">/api/admin/market-data/validate</p>
            <p className="mt-3 text-sm leading-7 text-mist/74">
              Confirms payload shape without writing anything into Supabase.
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Verified write route</p>
            <p className="mt-2 text-lg font-semibold text-white">/api/admin/market-data/ingest</p>
            <p className="mt-3 text-sm leading-7 text-mist/74">
              Use this only after validation passes and the provider payload is ready for persisted writes.
            </p>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Index chart symbol test set</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-mist/74">
            Use these current mappings and candidate overrides while checking the public index routes. This helps you
            validate the TradingView symbol layer alongside the JSON payload layer.
          </p>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {chartRows.map((row) => (
              <div key={row.slug} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{row.label}</h3>
                    <p className="mt-2 text-sm text-mist/66">{row.route}</p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {row.currentSymbol}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {row.candidates.map((candidate) => (
                    <div
                      key={candidate}
                      className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs text-white/82"
                    >
                      {candidate}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Payload lab</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-mist/74">
            Load the sample payload, compare it against the provider contract, then validate the exact JSON your upstream system will send for stock quotes, stock charts, fund NAVs, and index snapshots.
          </p>
          <div className="mt-6">
            <MarketDataPayloadTester apiBasePath="/api/admin/market-data" />
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
