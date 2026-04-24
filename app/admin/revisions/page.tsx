import type { Metadata } from "next";
import Link from "next/link";

import { EditorialRevisionLogPanel } from "@/components/editorial-revision-log-panel";
import { EditorialRevisionManagePanel } from "@/components/editorial-revision-manage-panel";
import { RollbackScenarioCreatePanel } from "@/components/rollback-scenario-create-panel";
import { RollbackScenarioManagePanel } from "@/components/rollback-scenario-manage-panel";
import { Container, Eyebrow, GlowCard } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getEditorialRevisionMemory } from "@/lib/editorial-revision-memory-store";
import { getEditorialRevisionRegistrySummary } from "@/lib/editorial-revision-registry";

export const metadata: Metadata = {
  title: "Revision Log",
  description: "Protected revision-log planning surface for editorial and override history.",
};

export const dynamic = "force-dynamic";

export default async function AdminRevisionsPage() {
  await requireUser();
  const [revisionMemory, registrySummary] = await Promise.all([
    getEditorialRevisionMemory(),
    getEditorialRevisionRegistrySummary(),
  ]);

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Eyebrow>Change control</Eyebrow>
          <h1 className="display-font text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Revision log
          </h1>
          <p className="max-w-3xl text-base leading-8 text-mist/76">
            This is the model for how you and your staff will audit edits across IPOs, stocks, index trackers, and future wealth pages. It is designed to answer who changed what, when, and why.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Logged revisions</p>
            <p className="mt-2 text-3xl font-semibold text-white">{revisionMemory.summary.loggedRevisions}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Rollback-ready assets</p>
            <p className="mt-2 text-3xl font-semibold text-white">{revisionMemory.summary.rollbackReadyAssets}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Review-ready changes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{revisionMemory.summary.reviewReadyChanges}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Tracked families</p>
            <p className="mt-2 text-3xl font-semibold text-white">{revisionMemory.summary.trackedFamilies}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Archived versions</p>
            <p className="mt-2 text-3xl font-semibold text-white">{revisionMemory.summary.archivedVersions}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">High-risk changes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{revisionMemory.summary.highRiskChanges}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Editorial revision registry</h2>
              <p className="max-w-4xl text-sm leading-7 text-mist/74">
                This registry combines revisions, rollback scenarios, and family coverage into one exportable backend surface so CMS control is auditable outside the page itself.
              </p>
            </div>
            <Link
              href="/api/admin/editorial-revision-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download CSV
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Registry rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.totalRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Revision rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.revisionRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Rollback rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.rollbackRows}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Family rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.familyRows}</p>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Audit rules</h2>
          <div className="mt-5 grid gap-3">
            {revisionMemory.rules.map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {item}
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Revision coverage by family</h2>
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
          <EditorialRevisionLogPanel />
          <EditorialRevisionManagePanel
            items={revisionMemory.revisions.map((entry) => ({
              id: entry.id,
              asset: entry.asset,
              action: entry.action,
              revisionState: entry.revisionState,
            }))}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <RollbackScenarioCreatePanel />
          <RollbackScenarioManagePanel
            items={revisionMemory.rollbackScenarios.map((item) => ({
              id: item.id,
              asset: item.asset,
              change: item.change,
              queueState: item.queueState,
            }))}
          />
        </div>

        <div className="grid gap-6">
          {revisionMemory.revisions.map((entry) => (
            <GlowCard key={`${entry.asset}-${entry.time}`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-mist/60">{entry.assetType}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{entry.asset}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{entry.action}</p>
                </div>
                <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                  {entry.editor}
                </div>
              </div>
              <div className="mt-5 grid gap-3 lg:grid-cols-4">
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <p className="text-sm text-mist/66">Time</p>
                  <p className="mt-2 text-sm font-semibold text-white">{entry.time}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <p className="text-sm text-mist/66">Changed fields</p>
                  <p className="mt-2 text-sm font-semibold text-white">{entry.changedFields}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <p className="text-sm text-mist/66">Revision state</p>
                  <p className="mt-2 text-sm font-semibold text-white">{entry.revisionState}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <p className="text-sm text-mist/66">Rollback ready</p>
                  <p className="mt-2 text-sm font-semibold text-white">{entry.rollbackReady}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 lg:col-span-2">
                  <p className="text-sm text-mist/66">Reason</p>
                  <p className="mt-2 text-sm font-semibold text-white">{entry.reason}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 lg:col-span-2">
                  <p className="text-sm text-mist/66">Route target</p>
                  <p className="mt-2 text-sm font-semibold text-white">{entry.routeTarget}</p>
                </div>
              </div>
            </GlowCard>
          ))}
        </div>
      </Container>
    </div>
  );
}
