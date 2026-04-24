import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { JobRunManagePanel } from "@/components/job-run-manage-panel";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { SourceJobManagePanel } from "@/components/source-job-manage-panel";
import { SourceJobCreatePanel } from "@/components/source-job-create-panel";
import { SourceJobRunPanel } from "@/components/source-job-run-panel";
import { SourceJobUpdatePanel } from "@/components/source-job-update-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getJobRunMemory } from "@/lib/job-run-memory-store";
import { sourceJobRules } from "@/lib/source-jobs";
import { getSourceJobMemory } from "@/lib/source-job-memory-store";
import { getSourceJobRegistrySummary } from "@/lib/source-job-registry";

export const metadata: Metadata = {
  title: "Source Jobs",
  description: "Protected internal preview desk for source-job planning, refresh cadence, and ingest-job posture.",
};

export const dynamic = "force-dynamic";

export default async function SourceJobsPage() {
  await requireUser();
  const registrySummary = getSourceJobRegistrySummary();
  const sourceJobMemory = await getSourceJobMemory();
  const sourceRunMemory = await getJobRunMemory("source_jobs");

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Admin", href: "/admin" },
    { name: "Source Jobs", href: "/admin/source-jobs" },
  ];
  const readinessItems = [
    ...sourceJobMemory.runs.map((job) => ({
      label: job.adapter,
      status: job.status,
      detail: `${job.nextStep} Queue depth ${job.queueDepth}. Retry backlog ${job.retryBacklog}.`,
      routeTarget: "/admin/source-jobs",
    })),
    ...sourceJobMemory.hotCacheLanes.map((lane) => ({
      label: lane.lane,
      status: lane.cacheStatus,
      detail: lane.note,
      routeTarget: "/admin/source-jobs",
    })),
    ...sourceRunMemory.runs.slice(0, 6).map((run) => ({
      label: `${run.target} run`,
      status: run.outcome === "Succeeded" ? "Ready" : run.outcome === "Needs review" ? "Needs verification" : "Needs activation",
      detail: run.resultSummary,
      routeTarget: "/admin/source-jobs",
    })),
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Data operations</Eyebrow>
          <SectionHeading
            title="Source jobs preview desk"
            description="This page is an internal planning and preview ledger for source adapters. It does not represent Trigger.dev worker execution for private-beta flows."
          />
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Internal preview only</h2>
          <p className="mt-3 text-sm leading-7 text-mist/74">
            Use this desk for internal adapter planning, queue notes, and backlog shaping only. Private-beta-critical execution now runs through Trigger.dev, so this page should never be read as live worker truth.
          </p>
        </GlowCard>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Active adapters</p>
            <p className="mt-2 text-3xl font-semibold text-white">{sourceJobMemory.summary.activeAdapters}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Planned jobs</p>
            <p className="mt-2 text-3xl font-semibold text-white">{sourceJobMemory.summary.plannedJobs}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked feeds</p>
            <p className="mt-2 text-3xl font-semibold text-white">{sourceJobMemory.summary.blockedFeeds}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Queued runs</p>
            <p className="mt-2 text-3xl font-semibold text-white">{sourceJobMemory.summary.queueDepth}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Retry backlog</p>
            <p className="mt-2 text-3xl font-semibold text-white">{sourceJobMemory.summary.retryBacklog}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Warm caches</p>
            <p className="mt-2 text-3xl font-semibold text-white">{sourceJobMemory.summary.warmCaches}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Recorded runs</p>
            <p className="mt-2 text-3xl font-semibold text-white">{sourceRunMemory.summary.totalRuns}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Succeeded runs</p>
            <p className="mt-2 text-3xl font-semibold text-white">{sourceRunMemory.summary.succeeded}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Needs review</p>
            <p className="mt-2 text-3xl font-semibold text-white">{sourceRunMemory.summary.needsReview}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="source job lane"
            panelTitle="Write-through source-job action"
            panelDescription="Log adapter, queue, cache, and execution-posture changes into the shared revision lane so this desk stops living only as a persisted queue report."
            defaultRouteTarget="/admin/source-jobs"
            defaultOperator="Source Job Operator"
            defaultChangedFields="adapter_status, queue_posture, cache_state"
            actionNoun="source-job mutation"
          />
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Adapter queue</h2>
          <p className="mt-3 text-sm leading-7 text-mist/74">
            This queue now comes from a persisted source-job memory store so adapter cadence, backlog, retry posture,
            and hot-cache intent stop living only in static planning copy.
          </p>
          <div className="mt-5 grid gap-4">
            {sourceJobMemory.runs.map((job) => (
              <div key={job.adapter} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{job.adapter}</h3>
                    <p className="mt-2 text-sm text-mist/66">
                      {job.domain} · {job.cadence}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {job.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{job.nextStep}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-mist/76">
                    Queue depth: <span className="text-white">{job.queueDepth}</span>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-mist/76">
                    Retry backlog: <span className="text-white">{job.retryBacklog}</span>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-mist/76">
                    Next run: <span className="text-white">{job.nextRunWindow}</span>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-6 text-mist/58">
                  Last run checkpoint: {new Date(job.lastRunAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · {job.cachePosture}
                </p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Hot-cache lanes</h2>
          <div className="mt-5 grid gap-4">
            {sourceJobMemory.hotCacheLanes.map((lane) => (
              <div key={lane.lane} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{lane.lane}</h3>
                    <p className="mt-2 text-sm text-mist/66">Target TTL · {lane.ttl}</p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {lane.cacheStatus}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{lane.note}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <div className="grid gap-4 xl:grid-cols-2">
          <SourceJobCreatePanel />
          <SourceJobUpdatePanel
            items={sourceJobMemory.runs.map((item) => ({
              adapter: item.adapter,
              status: item.status,
              queueDepth: item.queueDepth,
              retryBacklog: item.retryBacklog,
              nextRunWindow: item.nextRunWindow,
              nextStep: item.nextStep,
            }))}
          />
        </div>

        <SourceJobManagePanel
          items={sourceJobMemory.runs.map((item) => ({
            adapter: item.adapter,
            status: item.status,
            domain: item.domain,
          }))}
        />

        <SourceJobRunPanel
          items={sourceJobMemory.runs.map((item) => ({
            adapter: item.adapter,
            nextRunWindow: item.nextRunWindow,
          }))}
        />

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Recent preview execution history</h2>
          <p className="mt-3 text-sm leading-7 text-mist/74">
            Manual operator notes now land in a shared preview ledger, so queue posture and backlog edits can still be reviewed without pretending they came from the live Trigger.dev worker lane.
          </p>
          <div className="mt-5">
            <JobRunManagePanel
              endpoint="/api/admin/source-jobs/run"
              emptyMessage="Keeps the shared source-job execution ledger from behaving like append-only preview history."
              items={sourceRunMemory.runs.map((run) => ({
                id: run.id,
                title: run.target,
                subtitle: `${run.trigger} · ${run.outcome} · ${run.affectedRows} rows`,
              }))}
            />
          </div>
          <div className="mt-5 grid gap-4">
            {sourceRunMemory.runs.map((run) => (
              <div key={run.id} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{run.target}</h3>
                    <p className="mt-2 text-sm text-mist/66">
                      {run.trigger} · {run.outcome}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {run.affectedRows} rows
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{run.resultSummary}</p>
                <p className="mt-3 text-xs leading-6 text-mist/58">
                  Finished {new Date(run.finishedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} ·
                  Next window {run.nextWindow}
                </p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Ingest rules</h2>
          <div className="mt-5 grid gap-3">
            {sourceJobRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Source-job registry</h2>
              <p className="max-w-4xl text-sm leading-7 text-mist/74">
                This registry combines the adapter queue with real execution checkpoints for sample payload validation,
                verified ingest, provider sync, and refresh control so the live-data lane can be audited from one
                portable surface.
              </p>
            </div>
            <Link
              href="/api/admin/source-job-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download CSV
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-5">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Registry rows</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.total}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Ready</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.ready}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">In progress</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.inProgress}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Blocked</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.blocked}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Planned</p>
              <p className="mt-2 text-2xl font-semibold text-white">{registrySummary.planned}</p>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Provider handoff shortcuts</h2>
          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
              Sample payload endpoint: <span className="text-white">/api/admin/market-data/sample-payload</span>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
              Verified ingest endpoint: <span className="text-white">/api/admin/market-data/ingest</span>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
              Provider sync endpoint: <span className="text-white">/api/admin/market-data/provider-sync</span>
            </div>
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
