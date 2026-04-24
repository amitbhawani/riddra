import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { moduleCatalogItems, moduleCatalogRules, moduleCatalogSummary } from "@/lib/module-catalog";

export const metadata: Metadata = {
  title: "Module Catalog",
  description: "Protected module-catalog page for plugin-style route families and platform expansion contracts.",
};

export default async function AdminModuleCatalogPage() {
  await requireUser();
  const readinessItems = moduleCatalogItems.map((item) => ({
    label: item.title,
    status: item.status === "Active" ? "Ready" : "Queued",
    detail: item.summary,
    routeTarget:
      item.title === "Equity research family"
        ? "/stocks"
        : item.title === "IPO lifecycle family"
          ? "/ipo"
          : item.title === "Funds and wealth family"
            ? "/wealth"
            : item.title === "Learning and creator family"
              ? "/learn"
              : item.title === "Workstation tools family"
                ? "/trader-workstation"
                : item.title === "Broker pages family"
                  ? "/account/brokers"
                  : item.title === "Campaign microsite family"
                    ? "/admin/campaign-engine"
                    : "/account/support",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Admin", href: "/admin" }, { name: "Module Catalog", href: "/admin/module-catalog" }]} />
          <Eyebrow>Platform modules</Eyebrow>
          <SectionHeading
            title="Module catalog"
            description="This page turns the plugin-style platform goal into a real operating model: route families, installable contracts, and queued module types that can expand later without bespoke rebuilds."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Installable families</p>
            <p className="mt-2 text-3xl font-semibold text-white">{moduleCatalogSummary.installableFamilies}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Active contracts</p>
            <p className="mt-2 text-3xl font-semibold text-white">{moduleCatalogSummary.activeContracts}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Queued modules</p>
            <p className="mt-2 text-3xl font-semibold text-white">{moduleCatalogSummary.queuedModules}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="module catalog family"
              panelTitle="Write-through module-catalog action"
              panelDescription="Log module-family contract changes into the shared revision lane so platform expansion stops living only as a descriptive catalog."
              defaultRouteTarget="/admin/module-catalog"
              defaultOperator="Module Catalog Operator"
              defaultChangedFields="module_family, contract_state, route_family"
              actionNoun="module-catalog mutation"
            />
          </GlowCard>
          {moduleCatalogItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Module rules</h2>
          <div className="mt-5 grid gap-3">
            {moduleCatalogRules.map((rule) => (
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
