import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  integrationMarketplaceItems,
  integrationMarketplaceRules,
  integrationMarketplaceSummary,
} from "@/lib/integration-marketplace";

export const metadata: Metadata = {
  title: "Integration Marketplace",
  description: "Protected integration-marketplace page for provider classes, replaceable adapters, and platform extensibility planning.",
};

export default async function AdminIntegrationMarketplacePage() {
  await requireUser();
  const readinessItems = integrationMarketplaceItems.map((item) => ({
    label: item.title,
    status: item.status === "Active" ? "Ready" : "Queued",
    detail: item.summary,
    routeTarget:
      item.title === "Auth providers"
        ? "/admin/auth-activation"
        : item.title === "Payment providers"
          ? "/admin/payment-readiness"
          : item.title === "Communication providers"
            ? "/admin/communication-readiness"
            : item.title === "Broker and sync providers"
              ? "/account/brokers"
              : item.title === "AI providers"
                ? "/admin/ai-ops"
                : item.title === "Analytics and attribution providers"
                  ? "/admin/campaign-insights"
                  : "/admin/documents",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Admin", href: "/admin" }, { name: "Integration Marketplace", href: "/admin/integration-marketplace" }]} />
          <Eyebrow>Provider ecosystem</Eyebrow>
          <SectionHeading
            title="Integration marketplace"
            description="This page turns replaceable-provider thinking into a real platform layer so future vendors connect through stable contracts instead of leaking directly into product logic."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Replaceable providers</p>
            <p className="mt-2 text-3xl font-semibold text-white">{integrationMarketplaceSummary.replaceableProviders}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Active classes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{integrationMarketplaceSummary.activeClasses}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Queued adapters</p>
            <p className="mt-2 text-3xl font-semibold text-white">{integrationMarketplaceSummary.queuedAdapters}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="integration provider class"
              panelTitle="Write-through integration-marketplace action"
              panelDescription="Log provider-class and adapter-contract changes into the shared revision lane so platform extensibility stops living only as marketplace planning copy."
              defaultRouteTarget="/admin/integration-marketplace"
              defaultOperator="Integration Marketplace Operator"
              defaultChangedFields="provider_class, adapter_contract, vendor_posture"
              actionNoun="integration-marketplace mutation"
            />
          </GlowCard>
          {integrationMarketplaceItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Marketplace rules</h2>
          <div className="mt-5 grid gap-3">
            {integrationMarketplaceRules.map((rule) => (
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
