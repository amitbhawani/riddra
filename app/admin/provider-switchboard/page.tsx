import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  providerSwitchboardItems,
  providerSwitchboardRules,
  providerSwitchboardSummary,
} from "@/lib/provider-switchboard";

export const metadata: Metadata = {
  title: "Provider Switchboard",
  description: "Protected provider-switchboard page for primary providers, fallback paths, and operator-safe vendor switching.",
};

export default async function AdminProviderSwitchboardPage() {
  await requireUser();
  const readinessItems = providerSwitchboardItems.map((item) => ({
    label: item.title,
    status: item.status,
    detail: item.summary,
    routeTarget: "/admin/provider-switchboard",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Admin", href: "/admin" }, { name: "Provider Switchboard", href: "/admin/provider-switchboard" }]} />
          <Eyebrow>Provider control</Eyebrow>
          <SectionHeading
            title="Provider switchboard"
            description="This page turns provider profiles into a switchboard so primary vendors, fallback paths, and rollback-safe changes can later be managed without product rewrites."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Switchable domains</p>
            <p className="mt-2 text-3xl font-semibold text-white">{providerSwitchboardSummary.switchableDomains}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Primary providers</p>
            <p className="mt-2 text-3xl font-semibold text-white">{providerSwitchboardSummary.activePrimaryProviders}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Fallback paths</p>
            <p className="mt-2 text-3xl font-semibold text-white">{providerSwitchboardSummary.fallbackPaths}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="provider switchboard lane"
            panelTitle="Write-through provider switchboard action"
            panelDescription="Log provider switching and fallback-control changes into the shared revision lane so switchboard posture stops living only as a static vendor-control board."
            defaultRouteTarget="/admin/provider-switchboard"
            defaultOperator="Provider Switchboard Operator"
            defaultChangedFields="switch_domain, primary_provider, fallback_path"
            actionNoun="provider-switchboard mutation"
          />
          {providerSwitchboardItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Switchboard rules</h2>
          <div className="mt-5 grid gap-3">
            {providerSwitchboardRules.map((rule) => (
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
