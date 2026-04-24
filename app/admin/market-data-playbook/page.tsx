import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getMarketDataPlaybook } from "@/lib/market-data-playbook";

export const metadata: Metadata = {
  title: "Market Data Playbook",
  description: "Protected playbook for validating, ingesting, and scheduling provider payloads for stocks and indices.",
};

export default async function MarketDataPlaybookPage() {
  await requireUser();
  const playbook = getMarketDataPlaybook();
  const readinessItems = playbook.readiness.map((item) => ({
    label: item.title,
    status: item.status,
    detail: item.detail,
    routeTarget: "/admin/market-data-playbook",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Market Data Playbook", href: "/admin/market-data-playbook" },
            ]}
          />
          <Eyebrow>Provider execution</Eyebrow>
          <SectionHeading
            title="Market data playbook"
            description="This page turns the remaining first-rollout stock and index-data activation work into one operator flow: validate, ingest, schedule, and verify."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-3">
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="market data playbook step"
              panelTitle="Write-through market-data playbook action"
              panelDescription="Log validate, ingest, schedule, and verify changes into the shared revision lane so market-data activation stops living only as a static operator playbook."
              defaultRouteTarget="/admin/market-data-playbook"
              defaultOperator="Market Data Playbook Operator"
              defaultChangedFields="playbook_step, provider_state, ingestion_readiness"
              actionNoun="market-data-playbook mutation"
            />
          </div>
          {playbook.readiness.map((item) => (
            <GlowCard key={item.title}>
              <p className="text-sm text-mist/68">{item.title}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{item.status}</p>
              <p className="mt-3 text-sm leading-7 text-mist/74">{item.detail}</p>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Execution endpoints</h2>
          <div className="mt-5 grid gap-3">
            {playbook.endpoints.map((item) => (
              <div key={item.path} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <p className="text-sm font-semibold text-white">{item.path}</p>
                <p className="mt-2 text-sm leading-7 text-mist/74">{item.purpose}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Operator tools</h2>
          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76">
              Payload tester: <span className="text-white">/admin/market-data-tester</span>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76">
              Use the tester to load the sample payload, validate provider JSON, and keep handoff issues out of the public first-rollout stock and index routes.
            </div>
          </div>
        </GlowCard>

        <div className="grid gap-6 lg:grid-cols-2">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">First target set</h2>
            <div className="mt-5 grid gap-3">
              {playbook.targets.map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/76">
                  {item}
                </div>
              ))}
            </div>
          </GlowCard>
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Backend status line</h2>
            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/76">
                Ingestion: <span className="text-white">{playbook.statusLine.ingestion}</span>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/76">
                Provider sync: <span className="text-white">{playbook.statusLine.providerSync}</span>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/76">
                Refresh bridge: <span className="text-white">{playbook.statusLine.refresh}</span>
              </div>
            </div>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Execution rules</h2>
          <div className="mt-5 grid gap-3">
            {playbook.rules.map((rule) => (
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
