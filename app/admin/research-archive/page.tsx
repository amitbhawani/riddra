import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { ResearchArchiveRecordCreatePanel } from "@/components/research-archive-record-create-panel";
import { ResearchArchiveRecordManagePanel } from "@/components/research-archive-record-manage-panel";
import { ResearchArchiveRecordUpdatePanel } from "@/components/research-archive-record-update-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { getArchiveRefreshMemory } from "@/lib/archive-refresh-memory-store";
import { requireUser } from "@/lib/auth";
import { getResearchArchiveMemory } from "@/lib/research-archive-memory-store";
import { getResearchArchiveRegistrySummary } from "@/lib/research-archive-registry";
import {
  archiveWorkflowRules,
  researchArchiveLanes,
  researchArchiveSummary,
} from "@/lib/research-archive";
import { assetMemoryFamilies } from "@/lib/asset-memory-map";
import { getMarketEvents } from "@/lib/learn";
import { replayMemoryChains } from "@/lib/replay-memory";

export const metadata: Metadata = {
  title: "Research Archive",
  description: "Protected research-archive surface for results memory, IPO lifecycle history, and durable event context.",
};

export default async function ResearchArchivePage() {
  await requireUser();
  const events = await getMarketEvents();
  const archiveRefreshMemory = await getArchiveRefreshMemory();
  const researchArchiveMemory = await getResearchArchiveMemory();
  const registrySummary = await getResearchArchiveRegistrySummary();
  const archiveContinuityLanes = [
    ...archiveRefreshMemory.continuityLanes.map((lane) => ({
      lane: lane.lane,
      continuityStatus: lane.continuityStatus,
      retainedEvents: lane.retainedEvents,
      note: lane.note,
    })),
    ...researchArchiveMemory.familyLanes.map((lane) => ({
      lane: lane.family,
      continuityStatus: lane.status,
      retainedEvents: lane.retainedRows,
      note: lane.note,
    })),
  ];
  const readinessItems = [
    ...researchArchiveLanes.map((lane) => ({
      label: lane.title,
      status: "Needs verification",
      detail: lane.summary,
      routeTarget: "/admin/research-archive",
    })),
    ...researchArchiveMemory.familyLanes.map((lane) => ({
      label: `${lane.family} continuity`,
      status: lane.status,
      detail: lane.note,
      routeTarget: "/admin/research-archive",
    })),
    ...archiveRefreshMemory.continuityLanes.map((lane) => ({
      label: lane.lane,
      status: lane.continuityStatus,
      detail: lane.note,
      routeTarget: "/admin/source-mapping-desk",
    })),
    ...researchArchiveMemory.records.slice(0, 6).map((record) => ({
      label: record.title,
      status: record.status,
      detail: record.continuityNote,
      routeTarget: record.pageTarget || "/admin/research-archive",
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
              { name: "Research Archive", href: "/admin/research-archive" },
            ]}
          />
          <Eyebrow>Market memory</Eyebrow>
          <SectionHeading
            title="Research archive"
            description="Phase 16 should make the platform remember what happened, not just what is current. This layer tracks event continuity across stocks, IPOs, funds, and editorial updates."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Tracked lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{researchArchiveMemory.summary.trackedLanes}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Archived rows</p>
            <p className="mt-2 text-3xl font-semibold text-white">{researchArchiveMemory.summary.archivedRows}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Archive health</p>
            <p className="mt-2 text-lg font-semibold text-white">{researchArchiveSummary.archiveHealth}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Official filings</p>
            <p className="mt-2 text-3xl font-semibold text-white">{researchArchiveMemory.summary.officialFilings}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Public route targets</p>
            <p className="mt-2 text-3xl font-semibold text-white">{researchArchiveMemory.summary.publicRouteTargets}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Pending archive writes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{archiveRefreshMemory.summary.pendingWrites}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Document backlog</p>
            <p className="mt-2 text-3xl font-semibold text-white">{archiveRefreshMemory.summary.documentBacklog}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked families</p>
            <p className="mt-2 text-3xl font-semibold text-white">{archiveRefreshMemory.summary.blockedFamilies}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="research archive lane"
            panelTitle="Write-through archive action"
            panelDescription="Log archive continuity, filing memory, and enrichment-posture changes into the shared revision lane so this desk stops living only as a record and refresh console."
            defaultRouteTarget="/admin/research-archive"
            defaultOperator="Research Archive Owner"
            defaultChangedFields="archive_family, continuity_posture, enrichment_state"
            actionNoun="archive mutation"
          />
        </GlowCard>

        <GlowCard>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Research-archive registry</h2>
              <p className="max-w-3xl text-sm leading-7 text-mist/74">
                Research continuity now has one exportable registry spanning archive-backed records, refresh runs, and continuity
                lanes, so filings, results memory, and factsheet evidence can be audited as one backend lane instead of across
                separate archive and refresh cards.
              </p>
            </div>
            <Link
              href="/api/admin/research-archive-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Download archive registry
            </Link>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Registry rows</p>
              <p className="mt-2 text-3xl font-semibold text-white">{registrySummary.totalRows}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Archive rows</p>
              <p className="mt-2 text-3xl font-semibold text-white">{registrySummary.archiveRecords}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Refresh runs</p>
              <p className="mt-2 text-3xl font-semibold text-white">{registrySummary.refreshRuns}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Queued writes</p>
              <p className="mt-2 text-3xl font-semibold text-white">{registrySummary.queuedWrites}</p>
            </div>
          </div>
        </GlowCard>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Archive lanes</h2>
            <div className="mt-5 grid gap-3">
              {researchArchiveLanes.map((lane) => (
                <div key={lane.title} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <p className="text-sm font-semibold text-white">{lane.title}</p>
                  <p className="mt-2 text-sm leading-7 text-mist/74">{lane.summary}</p>
                </div>
              ))}
            </div>
          </GlowCard>

          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Persisted archive enrichment</h2>
            <p className="mt-3 text-sm leading-7 text-mist/74">
              This lane now reads from a local research-archive memory store, so filings, results memory, factsheet evidence, and route
              targets start behaving like a backend enrichment system instead of only descriptive admin prose.
            </p>
            <div className="mt-5 grid gap-3">
              {researchArchiveMemory.records.slice(0, 8).map((record) => (
                <div key={record.id} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{record.title}</p>
                    <div className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/82">
                      {record.status}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-mist/66">
                    {record.family} · {record.sourceLabel} · {record.publishedAt}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{record.continuityNote}</p>
                  <p className="mt-2 text-xs text-mist/60">Target route: {record.pageTarget}</p>
                </div>
              ))}
            </div>
          </GlowCard>

          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Event continuity samples</h2>
            <div className="mt-5 grid gap-3">
              {events.map((event) => (
                <div key={event.slug} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{event.title}</p>
                    <div className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/82">
                      {event.eventType}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-mist/66">
                    {event.assetRef} · {event.dateLabel}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{event.archiveNote}</p>
                </div>
              ))}
            </div>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Archive refresh queue</h2>
          <div className="mt-5 grid gap-3">
            {archiveRefreshMemory.runs.map((job) => (
              <div key={job.family} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{job.family}</p>
                  <div className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/82">
                    {job.status}
                  </div>
                </div>
                <p className="mt-2 text-sm text-mist/66">
                  {job.sourceClass} · {job.cadence} · next {job.nextWindow}
                </p>
                <p className="mt-3 text-sm leading-7 text-mist/74">{job.coveragePosture}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <div className="grid gap-6 xl:grid-cols-2">
          <ResearchArchiveRecordCreatePanel />
          <ResearchArchiveRecordUpdatePanel
            items={researchArchiveMemory.records.map((record) => ({
              id: record.id,
              title: record.title,
              publishedAt: record.publishedAt,
              continuityNote: record.continuityNote,
              pageTarget: record.pageTarget,
              status: record.status,
            }))}
          />
        </div>

        <ResearchArchiveRecordManagePanel
          items={researchArchiveMemory.records.map((record) => ({
            id: record.id,
            title: record.title,
            family: record.family,
            status: record.status,
          }))}
        />

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Replay continuity chains</h2>
          <div className="mt-5 grid gap-3">
            {replayMemoryChains.map((chain) => (
              <div key={chain.title} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{chain.title}</p>
                  <div className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/82">
                    {chain.status}
                  </div>
                </div>
                <p className="mt-2 text-sm text-mist/66">{chain.source}</p>
                <p className="mt-3 text-sm leading-7 text-mist/74">{chain.continuity}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Asset-specific memory map</h2>
          <div className="mt-5 grid gap-3">
            {assetMemoryFamilies.map((family) => (
              <div key={family.title} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <p className="text-sm font-semibold text-white">{family.title}</p>
                <p className="mt-3 text-sm leading-7 text-mist/74">{family.continuity}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Archive continuity lanes</h2>
          <div className="mt-5 grid gap-3">
            {archiveContinuityLanes.map((lane) => (
              <div key={lane.lane} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{lane.lane}</p>
                  <div className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/82">
                    {lane.continuityStatus}
                  </div>
                </div>
                <p className="mt-2 text-sm text-mist/66">Retained event rows · {lane.retainedEvents}</p>
                <p className="mt-3 text-sm leading-7 text-mist/74">{lane.note}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Archive rules</h2>
          <div className="mt-5 grid gap-3">
            {[...archiveWorkflowRules, ...researchArchiveMemory.rules].map((rule) => (
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
