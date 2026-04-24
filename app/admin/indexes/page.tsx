import type { Metadata } from "next";

import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { requireUser } from "@/lib/auth";
import { indexOpsCards, indexPipelineSteps } from "@/lib/index-ops";
import { hasSupabaseEnv } from "@/lib/env";
import { getSourceRegistry } from "@/lib/source-registry";
import { Container, Eyebrow, GlowCard } from "@/components/ui";

export const metadata: Metadata = {
  title: "Index Ops Admin",
  description: "Protected operating view for Riddra index trackers and their refresh architecture.",
};

export default async function AdminIndexesPage() {
  await requireUser();
  const sources = await getSourceRegistry();
  const readinessItems = indexOpsCards.map((card) => ({
    label: card.title,
    status: card.status === "Architecture ready" ? "Needs verification" : "Needs activation",
    detail: card.nextMilestone,
    routeTarget: `/${card.slug}`,
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Eyebrow>Admin index ops</Eyebrow>
          <h1 className="display-font text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Index tracker operations
          </h1>
          <p className="max-w-3xl text-base leading-8 text-mist/76">
            This protected view tracks how the four index products move from seeded intelligence into source-backed intraday systems.
          </p>
        </div>

        <GlowCard>
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="index ops lane"
            panelTitle="Write-through index-ops action"
            panelDescription="Log index refresh, archive, and tracker-readiness changes into the shared revision lane so index operations stop living only as an architecture summary."
            defaultRouteTarget="/admin/indexes"
            defaultOperator="Index Ops Operator"
            defaultChangedFields="index_lane, refresh_target, milestone_posture"
            actionNoun="index-ops mutation"
          />
        </GlowCard>

        <div className="grid gap-6 lg:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-mist/68">Tracked index products</p>
            <p className="mt-2 text-3xl font-semibold text-white">{indexOpsCards.length}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Index data sources</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {sources.filter((source) => source.domain === "indexes").length}
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Pipeline stages</p>
            <p className="mt-2 text-3xl font-semibold text-white">{indexPipelineSteps.length}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Realtime status</p>
            <p className="mt-2 text-3xl font-semibold text-white">{hasSupabaseEnv() ? "DB-ready" : "Planned"}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {indexOpsCards.map((card) => (
            <GlowCard key={card.slug}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{card.title}</h2>
                  <p className="mt-2 text-sm text-mist/68">
                    {card.slug} • {card.sourceCode}
                  </p>
                </div>
                <div className="rounded-full bg-aurora/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-aurora">
                  {card.status}
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/78">
                  Refresh target: <span className="text-white">{card.refreshTarget}</span>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/78">
                  Public layer: <span className="text-white">{card.publicLayer}</span>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist/78">
                  Premium layer: <span className="text-white">{card.premiumLayer}</span>
                </div>
              </div>

              <div className="mt-4 rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm leading-7 text-mist/72">
                <span className="text-white">Next milestone:</span> {card.nextMilestone}
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Index ingestion pipeline</h2>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {indexPipelineSteps.map((step) => (
              <div
                key={step}
                className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76"
              >
                {step}
              </div>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
