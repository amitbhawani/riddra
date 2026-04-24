import type { Metadata } from "next";

import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { requireUser } from "@/lib/auth";
import { getSourceRegistry } from "@/lib/source-registry";
import { Container, Eyebrow, GlowCard } from "@/components/ui";

export const metadata: Metadata = {
  title: "Source Admin",
  description: "Protected source registry overview for Riddra.",
};

export default async function AdminSourcesPage() {
  await requireUser();
  const sources = await getSourceRegistry();
  const readinessItems = sources.map((source) => {
    const status =
      source.officialStatus.toLowerCase() === "official" &&
      source.refreshCadence &&
      source.coverageScope &&
      source.licenseNote &&
      source.fallbackBehavior
        ? "Needs verification"
        : "Needs activation";

    const routeTarget =
      source.domain === "indexes"
        ? "/admin/indexes"
        : source.domain === "stocks" || source.domain === "mutual_funds"
          ? "/admin/market-data"
          : source.domain === "ipo"
            ? "/ipo"
            : source.domain === "filings"
              ? "/admin/documents"
              : "/admin/source-entry-console";

    return {
      label: source.sourceName,
      status,
      detail: source.notes || `Trust and fallback posture for ${source.domain} data still needs operator confirmation.`,
      routeTarget,
    };
  });

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Eyebrow>Admin trust layer</Eyebrow>
          <h1 className="display-font text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Source registry
          </h1>
          <p className="max-w-3xl text-base leading-8 text-mist/76">
            This page keeps the internal view of where each data domain should come from and how we think about trust, licensing, and fallbacks.
          </p>
        </div>

        <GlowCard>
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="source registry lane"
            panelTitle="Write-through source-registry action"
            panelDescription="Log source trust, licensing, and fallback changes into the shared revision lane so source posture stops living only as a registry overview."
            defaultRouteTarget="/admin/sources"
            defaultOperator="Source Registry Owner"
            defaultChangedFields="source_policy, coverage_scope, fallback_posture"
            actionNoun="source-registry mutation"
          />
        </GlowCard>

        <div className="grid gap-6">
          {sources.map((source) => (
            <GlowCard key={source.code}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{source.sourceName}</h2>
                  <p className="mt-2 text-sm text-mist/68">
                    {source.code} • {source.domain} • {source.sourceType}
                  </p>
                </div>
                <div className="rounded-full bg-aurora/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-aurora">
                  {source.officialStatus}
                </div>
              </div>
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/78">
                  Refresh cadence: <span className="text-white">{source.refreshCadence || "Pending"}</span>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/78">
                  Coverage: <span className="text-white">{source.coverageScope || "Pending"}</span>
                </div>
              </div>
              <div className="mt-4 rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm leading-7 text-mist/70">
                <p>
                  <span className="text-white">License note:</span> {source.licenseNote || "Pending"}
                </p>
                <p className="mt-3">
                  <span className="text-white">Fallback:</span> {source.fallbackBehavior || "Pending"}
                </p>
              </div>
            </GlowCard>
          ))}
        </div>
      </Container>
    </div>
  );
}
