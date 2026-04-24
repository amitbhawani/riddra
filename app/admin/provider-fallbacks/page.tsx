import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  providerFallbackItems,
  providerFallbackRules,
  providerFallbacksSummary,
} from "@/lib/provider-fallbacks";
import { getProviderFallbackRegistrySummary } from "@/lib/provider-fallback-registry";

export const metadata: Metadata = {
  title: "Provider Fallbacks",
  description:
    "Protected provider-fallbacks page for rollback-safe backup paths across auth, billing, communications, AI, and brokers.",
};

export default async function AdminProviderFallbacksPage() {
  await requireUser();
  const registrySummary = getProviderFallbackRegistrySummary();
  const readinessItems = providerFallbackItems.map((item) => ({
    label: item.title,
    status: item.status,
    detail: item.summary,
    routeTarget: "/admin/provider-fallbacks",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Provider Fallbacks", href: "/admin/provider-fallbacks" },
            ]}
          />
          <Eyebrow>Resilience layer</Eyebrow>
          <SectionHeading
            title="Provider fallbacks"
            description="This page makes fallback behavior explicit so provider switching, outages, and rollout reversals can later happen without silently breaking product trust."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Domains with fallbacks</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {providerFallbacksSummary.domainsWithFallbacks}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Tested paths</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {providerFallbacksSummary.testedFallbackPaths}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Rollback profiles</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {providerFallbacksSummary.rollbackProfiles}
            </p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="provider fallback profile"
            panelTitle="Write-through provider fallback action"
            panelDescription="Log outage and rollback fallback changes into the shared revision lane so provider fallback posture stops living only as a static resilience board."
            defaultRouteTarget="/admin/provider-fallbacks"
            defaultOperator="Provider Fallback Operator"
            defaultChangedFields="fallback_domain, rollback_profile, outage_state"
            actionNoun="provider-fallback mutation"
          />
          {providerFallbackItems.map((item) => (
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
          <h2 className="text-2xl font-semibold text-white">Fallback rules</h2>
          <div className="mt-5 grid gap-3">
            {providerFallbackRules.map((rule) => (
              <div
                key={rule}
                className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76"
              >
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Provider fallback registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                This registry combines the fallback profiles with switchboard checkpoints across auth, billing,
                communications, AI, brokers, and storage so rollback and outage posture can be reviewed outside this
                page too.
              </p>
            </div>
            <Link
              href="/api/admin/provider-fallback-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download CSV
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Registry rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.total}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Live</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.live}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">In progress</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.inProgress}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Queued</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.queued}</p>
            </div>
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
