import type { Metadata } from "next";

import { ArchiveRefreshManagePanel } from "@/components/archive-refresh-manage-panel";
import { ArchiveRefreshRunPanel } from "@/components/archive-refresh-run-panel";
import { ArchiveRefreshCreatePanel } from "@/components/archive-refresh-create-panel";
import { ArchiveRefreshUpdatePanel } from "@/components/archive-refresh-update-panel";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JobRunManagePanel } from "@/components/job-run-manage-panel";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { getArchiveRefreshMemory } from "@/lib/archive-refresh-memory-store";
import { requireUser } from "@/lib/auth";
import { listDurableJobRuns } from "@/lib/durable-jobs";
import { getJobRunMemory } from "@/lib/job-run-memory-store";
import { getExternalLinkProps } from "@/lib/link-utils";
import { getMarketDataRefreshProofStatus } from "@/lib/market-data-refresh";
import {
  getMarketSourceCredentialGroups,
  getMarketSourceCredentialSummary,
  getMarketSourceStackGroups,
  getMarketSourceStackSummary,
} from "@/lib/market-source-stack";
import {
  sourceMappingDeskLanes,
  sourceMappingDeskRules,
  sourceMappingDeskSummary,
} from "@/lib/source-mapping-desk";
import { sourceMappingRegistrySummary } from "@/lib/source-mapping-registry";
import { getConfiguredPublicSiteUrl } from "@/lib/public-site-url";

export const metadata: Metadata = {
  title: "Source Mapping Desk",
  description: "Protected internal operations desk for canonical asset sheets, trusted source planning, and archive-refresh execution.",
};

export const dynamic = "force-dynamic";

export default async function SourceMappingDeskPage() {
  await requireUser();
  const archiveRefreshMemory = await getArchiveRefreshMemory();
  const archiveRunMemory = await getJobRunMemory("archive_refresh");
  const archiveDurableRuns = await listDurableJobRuns({ family: "archive_refresh", limit: 20 });
  const marketDataDurableRuns = await listDurableJobRuns({ family: "market_data", limit: 6 });
  const refreshProof = getMarketDataRefreshProofStatus();
  const sourceStackGroups = getMarketSourceStackGroups();
  const sourceStackSummary = getMarketSourceStackSummary();
  const sourceCredentialGroups = getMarketSourceCredentialGroups();
  const sourceCredentialSummary = getMarketSourceCredentialSummary();
  const latestMarketDataRun = marketDataDurableRuns.items[0];
  const marketDataNeedsRemoteMigration = Boolean(
    latestMarketDataRun?.errorMessage?.includes("db/migrations/0011_market_data_durability.sql"),
  );
  const publicProofOrigin = getConfiguredPublicSiteUrl() || "https://www.riddra.com";
  const refreshProofCommands = [
    `npm run trigger:dev`,
    `curl -s -X POST ${publicProofOrigin}/api/market-data/refresh \\
  -H 'x-riddra-refresh-secret: <MARKET_DATA_REFRESH_SECRET>'`,
    `curl -s '${publicProofOrigin}/api/admin/durable-jobs?family=market_data'`,
  ];
  const refreshProofQueries = [
    `select id, series_type, asset_slug, run_status, records_written, error_message
from public.market_refresh_runs
order by created_at desc
limit 20;`,
    `select series_type, asset_slug, timeframe, refresh_status, records_retained, latest_point_at
from public.market_series_status
order by updated_at desc
limit 20;`,
    `select slug, quoted_at, price, change_percent
from public.stock_quote_history
order by quoted_at desc
limit 20;`,
    `select slug, nav_date, nav
from public.fund_nav_history
order by nav_date desc
limit 20;`,
  ];
  const refreshProofCriteria = [
    "The refresh API returns ok: true with mode durable_job_queued and a non-empty job id.",
    "The durable-jobs API shows a fresh market_data run after the refresh call.",
    "The newest market_refresh_runs rows show succeeded with records_written greater than 0 and no error_message.",
    "The newest market_series_status rows show live retained stock_quote and fund_nav state with records_retained greater than 0.",
    "Stock and fund pages open with durable market values instead of the unavailable or degraded waiting state.",
  ];
  const readinessItems = [
    ...sourceMappingDeskLanes.map((lane) => ({
      label: lane.title,
      status: "Needs verification",
      detail: lane.summary,
      routeTarget: "/admin/source-mapping-desk",
    })),
    ...sourceStackGroups.flatMap((group) =>
      group.items.map((item) => ({
        label: item.title,
        status: item.status,
        detail: item.role,
        routeTarget: "/admin/launch-config-console",
      })),
    ),
    ...sourceCredentialGroups.flatMap((group) =>
      group.items.map((item) => ({
        label: item.title,
        status: item.status,
        detail: item.detail,
        routeTarget: "/admin/launch-config-console",
      })),
    ),
    ...archiveRefreshMemory.runs.map((job) => ({
      label: `${job.family} archive queue`,
      status: job.status,
      detail: `${job.nextStep} Pending writes ${job.pendingWrites}. Document backlog ${job.documentBacklog}.`,
      routeTarget: "/admin/research-archive",
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
              { name: "Source Mapping Desk", href: "/admin/source-mapping-desk" },
            ]}
          />
          <Eyebrow>Human handoff</Eyebrow>
          <SectionHeading
            title="Source mapping desk"
            description="This page translates the platform architecture into internal human work: canonical asset sheets, trusted source mapping, editorial prep, and preview archive posture."
          />
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Internal operator lane</h2>
          <p className="mt-3 text-sm leading-7 text-mist/74">
            Archive refresh on this desk now queues through Trigger.dev and mirrors results into the internal execution ledger. It is useful for internal private-beta ops proof, but it still does not replace upstream provider and official-source verification.
          </p>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Live refresh proof lane</h2>
              <p className="max-w-4xl text-sm leading-7 text-mist/74">
                The real private-beta proof is the durable refresh lane, not the archive desk. This card tells you whether the refresh path is actually configured through segmented endpoints or a provider payload and what still blocks the first retained write proof.
              </p>
            </div>
            <div className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
              {refreshProof.proofMode === "verification_ready" ? "Verification ready" : "Blocked"}
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Refresh source</p>
              <p className="mt-2 text-lg font-semibold text-white">{refreshProof.sourceLabel}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Latest worker outcome</p>
              <p className="mt-2 text-lg font-semibold text-white">{latestMarketDataRun?.status ?? "No runs yet"}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Exact missing inputs</p>
              <div className="mt-2 grid gap-1 text-sm leading-7 text-mist/74">
                {refreshProof.exactMissing.length ? (
                  refreshProof.exactMissing.map((item) => <p key={item}>{item}</p>)
                ) : (
                  <p>Refresh inputs are configured. Run the durable refresh proof next.</p>
                )}
              </div>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Recommended next inputs</p>
              <div className="mt-2 grid gap-1 text-sm leading-7 text-mist/74">
                {refreshProof.recommendedMissing.length ? (
                  refreshProof.recommendedMissing.map((item) => <p key={item}>{item}</p>)
                ) : (
                  <p>Index and chart refresh inputs are already present for the current proof lane.</p>
                )}
              </div>
            </div>
          </div>
          {latestMarketDataRun ? (
            <div className="mt-5 rounded-[24px] border border-white/8 bg-black/15 p-5">
              <h3 className="text-base font-semibold text-white">Latest refresh proof result</h3>
              <p className="mt-3 text-sm leading-7 text-mist/74">
                {latestMarketDataRun.errorMessage
                  ? latestMarketDataRun.errorMessage
                  : typeof latestMarketDataRun.metadata?.routeTarget === "string"
                    ? `Latest durable refresh run came from ${latestMarketDataRun.metadata.routeTarget}.`
                    : "Latest durable refresh run completed without a recorded error message."}
              </p>
              {marketDataNeedsRemoteMigration ? (
                <p className="mt-3 text-sm leading-7 text-amber-100/88">
                  The latest failed run is pointing at the remote Supabase schema, not the refresh code path. Apply <span className="font-semibold text-white">db/migrations/0011_market_data_durability.sql</span> to the real project and rerun the refresh proof.
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <h3 className="text-base font-semibold text-white">Proof route and pages</h3>
              <div className="mt-3 grid gap-2 text-sm leading-7 text-mist/74">
                <p>{refreshProof.proofRoute}</p>
                {refreshProof.proofPages.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <h3 className="text-base font-semibold text-white">Durable SQL proof targets</h3>
              <div className="mt-3 grid gap-2 text-sm leading-7 text-mist/74">
                {refreshProof.proofSqlTargets.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <h3 className="text-base font-semibold text-white">Exact proof commands</h3>
              <div className="mt-3 grid gap-3">
                {refreshProofCommands.map((command) => (
                  <pre
                    key={command}
                    className="overflow-x-auto whitespace-pre-wrap rounded-2xl border border-white/8 bg-black/25 px-4 py-4 font-mono text-xs leading-6 text-mist/80"
                  >
                    {command}
                  </pre>
                ))}
              </div>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <h3 className="text-base font-semibold text-white">Exact SQL verification</h3>
              <div className="mt-3 grid gap-3">
                {refreshProofQueries.map((query) => (
                  <pre
                    key={query}
                    className="overflow-x-auto whitespace-pre-wrap rounded-2xl border border-white/8 bg-black/25 px-4 py-4 font-mono text-xs leading-6 text-mist/80"
                  >
                    {query}
                  </pre>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-5 rounded-[24px] border border-white/8 bg-black/15 p-5">
            <h3 className="text-base font-semibold text-white">Exact success criteria</h3>
            <div className="mt-3 grid gap-2 text-sm leading-7 text-mist/74">
              {refreshProofCriteria.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>
        </GlowCard>

        {marketDataDurableRuns.error ? (
          <GlowCard>
            <p className="text-sm leading-7 text-amber-100/88">
              Trigger market-data run history could not be loaded from the live run ledger: {marketDataDurableRuns.error}
            </p>
          </GlowCard>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Asset sheets</p>
            <p className="mt-2 text-3xl font-semibold text-white">{sourceMappingDeskSummary.assetSheets}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Source classes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{sourceMappingDeskSummary.sourceClasses}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Human owners</p>
            <p className="mt-2 text-3xl font-semibold text-white">{sourceMappingDeskSummary.humanOwners}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Active archive jobs</p>
            <p className="mt-2 text-3xl font-semibold text-white">{archiveRefreshMemory.summary.activeFamilies}</p>
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
            <p className="text-sm text-mist/68">Trigger worker runs</p>
            <p className="mt-2 text-3xl font-semibold text-white">{archiveDurableRuns.summary.total}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Succeeded worker runs</p>
            <p className="mt-2 text-3xl font-semibold text-white">{archiveDurableRuns.summary.succeeded}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Failed worker runs</p>
            <p className="mt-2 text-3xl font-semibold text-white">{archiveDurableRuns.summary.failed}</p>
          </GlowCard>
        </div>
        {archiveDurableRuns.error ? (
          <GlowCard>
            <p className="text-sm leading-7 text-amber-100/88">
              Trigger archive-run history could not be loaded from the live run ledger: {archiveDurableRuns.error}
            </p>
          </GlowCard>
        ) : null}

        <GlowCard>
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="source mapping lane"
            panelTitle="Write-through source-mapping action"
            panelDescription="Log source-stack, credential, archive, and human-mapping changes into the shared revision lane so this desk stops living only as a planning and intake board."
            defaultRouteTarget="/admin/source-mapping-desk"
            defaultOperator="Source Mapping Owner"
            defaultChangedFields="source_stack, mapping_status, archive_posture"
            actionNoun="source-mapping mutation"
          />
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Configured source stack</h2>
              <p className="max-w-4xl text-sm leading-7 text-mist/74">
                This desk now mirrors the live source URLs saved in launch config, so the backend plan can stay aligned
                with your multi-source architecture instead of hiding those upstream choices in chat or ad-hoc notes.
              </p>
            </div>
            <a
              href="/admin/launch-config-console"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open launch config console
            </a>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-6">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Configured URLs</p>
              <p className="mt-2 text-3xl font-semibold text-white">{sourceStackSummary.configured}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Missing URLs</p>
              <p className="mt-2 text-3xl font-semibold text-white">{sourceStackSummary.missing}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Primary endpoints</p>
              <p className="mt-2 text-3xl font-semibold text-white">{sourceStackSummary.primaryConfigured}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Reference fallbacks</p>
              <p className="mt-2 text-3xl font-semibold text-white">{sourceStackSummary.referenceConfigured}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Source credentials ready</p>
              <p className="mt-2 text-3xl font-semibold text-white">{sourceCredentialSummary.configured}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Source credentials missing</p>
              <p className="mt-2 text-3xl font-semibold text-white">{sourceCredentialSummary.missing}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            {sourceStackGroups.map((group) => (
              <div key={group.title} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <h3 className="text-lg font-semibold text-white">{group.title}</h3>
                <p className="mt-3 text-sm leading-7 text-mist/74">{group.description}</p>
                <div className="mt-5 grid gap-4">
                  {group.items.map((item) => (
                    <div key={item.key} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                          <p className="mt-2 text-xs leading-6 text-mist/58">{item.role}</p>
                        </div>
                        <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                          {item.status}
                        </span>
                      </div>
                      {item.url ? (
                        <a
                          href={item.url}
                          {...getExternalLinkProps()}
                          className="mt-3 block break-all text-sm leading-7 text-white underline decoration-white/25 underline-offset-4 transition hover:decoration-white/55"
                        >
                          {item.url}
                        </a>
                      ) : (
                        <p className="mt-3 break-all text-sm leading-7 text-mist/76">
                          Still needs to be entered in launch config.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            {sourceCredentialGroups.map((group) => (
              <div key={group.title} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <h3 className="text-lg font-semibold text-white">{group.title}</h3>
                <p className="mt-3 text-sm leading-7 text-mist/74">{group.description}</p>
                <div className="mt-5 grid gap-4">
                  {group.items.map((item) => (
                    <div key={item.key} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                          <p className="mt-2 text-xs leading-6 text-mist/58">{item.detail}</p>
                        </div>
                        <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Source-mapping registry</h2>
              <p className="max-w-4xl text-sm leading-7 text-mist/74">
                This registry turns the human source-mapping lane into a downloadable audit surface, combining intake
                families, owners, source classes, current route coverage, and first-wave targets in one place.
              </p>
            </div>
            <a
              href="/api/admin/source-mapping-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download CSV
            </a>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Registry rows</p>
              <p className="mt-2 text-3xl font-semibold text-white">{sourceMappingRegistrySummary.rows}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Intake families</p>
              <p className="mt-2 text-3xl font-semibold text-white">{sourceMappingRegistrySummary.intakeFamilies}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Human lanes</p>
              <p className="mt-2 text-3xl font-semibold text-white">{sourceMappingRegistrySummary.humanLanes}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Source classes</p>
              <p className="mt-2 text-3xl font-semibold text-white">{sourceMappingRegistrySummary.sourceClasses}</p>
            </div>
          </div>
        </GlowCard>

        <div className="grid gap-6">
          {sourceMappingDeskLanes.map((lane) => (
            <GlowCard key={lane.title}>
              <p className="text-xs uppercase tracking-[0.16em] text-mist/58">{lane.owner}</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">{lane.title}</h2>
              <p className="mt-3 text-sm leading-7 text-mist/74">{lane.summary}</p>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Official-source refresh queue</h2>
          <p className="mt-3 text-sm leading-7 text-mist/74">
            This queue now turns the archive-write backlog into a persisted backend planning lane, so results memory,
            FII / DII reports, fund factsheets, and IPO document continuity stop living only in narrative tracker copy.
          </p>
          <div className="mt-5 grid gap-4">
            {archiveRefreshMemory.runs.map((job) => (
              <div key={job.family} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{job.family}</h3>
                    <p className="mt-2 text-sm text-mist/66">
                      {job.sourceClass} · {job.cadence}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {job.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{job.nextStep}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-mist/76">
                    Pending writes: <span className="text-white">{job.pendingWrites}</span>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-mist/76">
                    Document backlog: <span className="text-white">{job.documentBacklog}</span>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-mist/76">
                    Next window: <span className="text-white">{job.nextWindow}</span>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-6 text-mist/58">
                  Last archive write: {new Date(job.lastWriteAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · {job.coveragePosture}
                </p>
              </div>
            ))}
          </div>
        </GlowCard>

        <div className="grid gap-4 xl:grid-cols-2">
          <ArchiveRefreshCreatePanel />
          <ArchiveRefreshUpdatePanel
            items={archiveRefreshMemory.runs.map((item) => ({
              family: item.family,
              status: item.status,
              pendingWrites: item.pendingWrites,
              documentBacklog: item.documentBacklog,
              nextWindow: item.nextWindow,
              nextStep: item.nextStep,
            }))}
          />
        </div>

        <ArchiveRefreshManagePanel
          items={archiveRefreshMemory.runs.map((item) => ({
            family: item.family,
            status: item.status,
            sourceClass: item.sourceClass,
          }))}
        />

        <ArchiveRefreshRunPanel
          items={archiveRefreshMemory.runs.map((item) => ({
            family: item.family,
            nextWindow: item.nextWindow,
          }))}
        />

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Recent archive executions</h2>
          <p className="mt-3 text-sm leading-7 text-mist/74">
            Archive refresh results now land in a shared internal execution ledger after the Trigger.dev worker runs, so operator cleanup and archive continuity review stay tied to actual queued work.
          </p>
          <div className="mt-5">
            <JobRunManagePanel
              endpoint="/api/admin/archive-refresh/run"
              emptyMessage="Keeps the shared archive execution ledger tidy after Trigger-backed archive runs complete."
              items={archiveRunMemory.runs.map((run) => ({
                id: run.id,
                title: run.target,
                subtitle: `${run.trigger} · ${run.outcome} · ${run.affectedRows} rows`,
              }))}
            />
          </div>
          <div className="mt-5 grid gap-4">
            {archiveRunMemory.runs.map((run) => (
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
          <h2 className="text-2xl font-semibold text-white">Desk rules</h2>
          <div className="mt-5 grid gap-3">
            {sourceMappingDeskRules.map((rule) => (
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
