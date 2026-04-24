import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { RollbackScenarioCreatePanel } from "@/components/rollback-scenario-create-panel";
import { RollbackScenarioActionPanel } from "@/components/rollback-scenario-action-panel";
import { RollbackScenarioManagePanel } from "@/components/rollback-scenario-manage-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getEditorialRevisionMemory } from "@/lib/editorial-revision-memory-store";

export const metadata: Metadata = {
  title: "Rollback Center",
  description: "Protected rollback center for revision-safe publishing, return-to-source actions, and recovery planning.",
};

export const dynamic = "force-dynamic";

export default async function RollbackCenterPage() {
  await requireUser();
  const revisionMemory = await getEditorialRevisionMemory();

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Admin", href: "/admin" },
    { name: "Rollback Center", href: "/admin/rollback-center" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Recovery controls</Eyebrow>
          <SectionHeading
            title="Rollback center"
            description="This page tracks how editorial and override changes should be reversed safely without losing audit history, source lineage, or lifecycle continuity."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Rollback-ready assets</p>
            <p className="mt-2 text-3xl font-semibold text-white">{revisionMemory.summary.rollbackReadyAssets}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">High-risk changes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{revisionMemory.summary.highRiskChanges}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Archived versions</p>
            <p className="mt-2 text-3xl font-semibold text-white">{revisionMemory.summary.archivedVersions}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Tracked families</p>
            <p className="mt-2 text-3xl font-semibold text-white">{revisionMemory.summary.trackedFamilies}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Logged revisions</p>
            <p className="mt-2 text-3xl font-semibold text-white">{revisionMemory.summary.loggedRevisions}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Review-ready changes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{revisionMemory.summary.reviewReadyChanges}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Rollback scenarios</h2>
          <div className="mt-5">
            <RollbackScenarioManagePanel
              items={revisionMemory.rollbackScenarios.map((item) => ({
                id: item.id,
                asset: item.asset,
                change: item.change,
                queueState: item.queueState,
              }))}
            />
          </div>
          <div className="mt-5 grid gap-4">
            {revisionMemory.rollbackScenarios.map((item) => (
              <div key={`${item.asset}-${item.change}`} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{item.asset}</h3>
                    <p className="mt-2 text-sm text-mist/66">{item.change}</p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {item.risk}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{item.fallback}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Last known good</p>
                    <p className="mt-2 text-sm font-medium text-white">{item.lastKnownGood}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Queue state</p>
                    <p className="mt-2 text-sm font-medium text-white">{item.queueState}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Route target</p>
                    <p className="mt-2 text-sm font-medium text-white">{item.routeTarget}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Rollback coverage by family</h2>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {revisionMemory.familyLanes.map((lane) => (
              <div key={lane.family} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{lane.family}</h3>
                    <p className="mt-2 text-sm text-mist/66">{lane.note}</p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {lane.latestState}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Tracked assets</p>
                    <p className="mt-2 text-lg font-semibold text-white">{lane.trackedAssets}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-mist/62">Rollback ready</p>
                    <p className="mt-2 text-lg font-semibold text-white">{lane.rollbackReadyAssets}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlowCard>

        <div className="grid gap-6 xl:grid-cols-2">
          <RollbackScenarioCreatePanel />
          <RollbackScenarioActionPanel
            items={revisionMemory.rollbackScenarios.map((item) => ({
              asset: item.asset,
              change: item.change,
              queueState: item.queueState,
            }))}
          />
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Rollback rules</h2>
          <div className="mt-5 grid gap-3">
            {revisionMemory.rules.map((rule) => (
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
