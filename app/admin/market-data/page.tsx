import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { DerivativesAnalyticsManagePanel } from "@/components/derivatives-analytics-manage-panel";
import { DerivativesAnalyticsCreatePanel } from "@/components/derivatives-analytics-create-panel";
import { DerivativesAnalyticsUpdatePanel } from "@/components/derivatives-analytics-update-panel";
import { DerivativesSnapshotManagePanel } from "@/components/derivatives-snapshot-manage-panel";
import { DerivativesSnapshotCreatePanel } from "@/components/derivatives-snapshot-create-panel";
import { DerivativesSnapshotUpdatePanel } from "@/components/derivatives-snapshot-update-panel";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { env } from "@/lib/env";
import { getFunds, getStocks } from "@/lib/content";
import { requireUser } from "@/lib/auth";
import { listDurableJobRuns } from "@/lib/durable-jobs";
import { getDerivativesMemory } from "@/lib/derivatives-memory-store";
import { getDerivativesRegistrySummary } from "@/lib/derivatives-registry";
import {
  getMarketSourceCredentialGroups,
  getMarketSourceCredentialSummary,
  getMarketSourceStackGroups,
  getMarketSourceStackSummary,
} from "@/lib/market-source-stack";
import { getMarketDataIngestionReadiness } from "@/lib/market-data-ingestion";
import { marketDataRules, marketDataSummary, marketDataSurfaces } from "@/lib/market-data-ops";
import { getMarketDataProviderSyncReadiness } from "@/lib/market-data-provider-sync";
import { getMarketDataRefreshProofStatus, getMarketDataRefreshReadiness } from "@/lib/market-data-refresh";
import { getMarketDataTargetRegistrySummary } from "@/lib/market-data-target-registry";
import { getMarketDataTargetStatuses } from "@/lib/market-data-targets";
import { getIndexChartSymbolAuditRows, getIndexChartSymbolAuditSummary } from "@/lib/index-chart-symbol-audit";
import { getMarketHistoryMemory } from "@/lib/market-history-memory-store";
import { getMarketHistoryRegistrySummary } from "@/lib/market-history-registry";
import { getConfiguredPublicSiteUrl } from "@/lib/public-site-url";

export const metadata: Metadata = {
  title: "Market Data Ops",
  description: "Protected market-data readiness page for latency rules, source strategy, cache design, and launch-safe execution boundaries.",
};

export const dynamic = "force-dynamic";

export default async function AdminMarketDataPage() {
  await requireUser();
  const [stocks, funds, targetStatuses, marketHistoryMemory, marketHistoryRegistrySummary, derivativesMemory, derivativesRegistrySummary, marketDataJobRuns] = await Promise.all([
    getStocks(),
    getFunds(),
    getMarketDataTargetStatuses(),
    getMarketHistoryMemory(),
    getMarketHistoryRegistrySummary(),
    getDerivativesMemory(),
    getDerivativesRegistrySummary(),
    listDurableJobRuns({ family: "market_data", limit: 6 }),
  ]);
  const targetRegistrySummary = await getMarketDataTargetRegistrySummary();
  const chartSymbolAuditRows = getIndexChartSymbolAuditRows();
  const chartSymbolAuditSummary = getIndexChartSymbolAuditSummary();
  const sourceStackGroups = getMarketSourceStackGroups();
  const sourceStackSummary = getMarketSourceStackSummary();
  const sourceCredentialGroups = getMarketSourceCredentialGroups();
  const sourceCredentialSummary = getMarketSourceCredentialSummary();
  const refreshReadiness = getMarketDataRefreshReadiness();
  const refreshProof = getMarketDataRefreshProofStatus();
  const ingestionReadiness = getMarketDataIngestionReadiness();
  const providerSyncReadiness = getMarketDataProviderSyncReadiness();
  const publicProofOrigin = getConfiguredPublicSiteUrl() || "https://www.riddra.com";
  const refreshProofCommands = [
    `npm run trigger:dev`,
    `curl -s -X POST ${publicProofOrigin}/api/market-data/refresh \\
  -H 'x-riddra-refresh-secret: <MARKET_DATA_REFRESH_SECRET>'`,
    `curl -s '${publicProofOrigin}/api/admin/durable-jobs?family=market_data'`,
  ];
  const refreshProofCriteria = [
    "The refresh API returns ok: true with mode durable_job_queued and a non-empty job id.",
    "The durable-jobs API shows a fresh market_data run after the refresh call.",
    "The newest market_refresh_runs rows show succeeded with records_written greater than 0 and no error_message.",
    "The newest market_series_status rows show live retained stock_quote and fund_nav state with records_retained greater than 0.",
    "Primary stock and fund pages open with durable values instead of the unavailable or degraded waiting state.",
  ];
  const delayedStockSnapshots = stocks.filter(
    (stock) =>
      stock.snapshotMeta?.mode === "delayed_snapshot" ||
      stock.snapshotMeta?.mode === "manual_close",
  ).length;
  const delayedFundSnapshots = funds.filter(
    (fund) =>
      fund.snapshotMeta?.mode === "delayed_snapshot" ||
      fund.snapshotMeta?.mode === "manual_nav",
  ).length;
  const readinessItems = [
    {
      label: "Refresh route admin environment",
      status: refreshReadiness.adminSupabaseReady ? "Configured, needs proof" : "Blocked",
      detail:
        "The refresh route is only launch-safe once admin Supabase credentials are present and the delayed-snapshot job can write trusted stock and fund rows.",
      routeTarget: "/api/admin/market-data/refresh",
    },
    {
      label: "Refresh secret gate",
      status: refreshReadiness.refreshSecretReady ? "Configured, needs proof" : "Blocked",
      detail:
        "Cron and operator refreshes still need the refresh secret before market-data writes can be triggered safely outside the console.",
      routeTarget: "/admin/launch-config-console",
    },
    {
      label: "Verified ingestion gate",
      status: ingestionReadiness.adminSupabaseReady ? "Configured, needs proof" : "Blocked",
      detail: `Accepted payloads: ${ingestionReadiness.acceptedPayloads.join(", ")}.`,
      routeTarget: "/api/admin/market-data/ingest",
    },
    {
      label: "Provider sync handshake",
      status:
        providerSyncReadiness.adminSupabaseReady && providerSyncReadiness.providerUrlReady
          ? "Configured, needs proof"
          : "Blocked",
      detail:
        providerSyncReadiness.providerUrlReady
          ? "Provider URL is present, but the upstream payload still needs live verification through the sync and ingest path."
          : "Provider URL is still missing, so live provider sync cannot move past preview mode yet.",
      routeTarget: "/api/admin/market-data/provider-sync",
    },
    ...targetStatuses.map((item) => ({
      label: item.title,
      status:
        item.status === "verified"
          ? "Verified durable"
          : item.status === "seeded"
            ? "Manual / degraded"
            : "Blocked",
      detail: `${item.detail} Source: ${item.source}. Updated: ${item.updated}.`,
      routeTarget: item.route,
    })),
    ...chartSymbolAuditRows.map((row) => ({
      label: `${row.label} chart symbol`,
      status:
        row.status === "Ready"
          ? "Verified durable"
          : row.status === "In progress"
            ? "Preview / internal"
            : "Blocked",
      detail: row.note,
      routeTarget: row.route,
    })),
  ];

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Admin", href: "/admin" },
    { name: "Market Data Ops", href: "/admin/market-data" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Market-data governance</Eyebrow>
          <SectionHeading
            title="Market data ops"
            description="This page tracks which market-data surfaces are genuinely provider-backed, which ones are still manual or degraded, and which ones remain blocked or internal-only."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <GlowCard>
            <p className="text-sm text-mist/68">Verified durable surfaces</p>
            <p className="mt-2 text-3xl font-semibold text-white">{marketDataSummary.verifiedDurable}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Manual / degraded surfaces</p>
            <p className="mt-2 text-3xl font-semibold text-white">{marketDataSummary.manualOrDegraded}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked surfaces</p>
            <p className="mt-2 text-3xl font-semibold text-white">{marketDataSummary.blocked}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Preview / internal surfaces</p>
            <p className="mt-2 text-3xl font-semibold text-white">{marketDataSummary.previewInternal}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <GlowCard>
            <p className="text-sm text-mist/68">Stock routes with delayed snapshots</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {delayedStockSnapshots} / {stocks.length}
            </p>
            <p className="mt-3 text-sm leading-7 text-mist/74">
              Public stock routes now depend on durable quote writes or clearly labeled manual retained closes instead of quietly borrowing the older source-snapshot fallback.
            </p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Fund routes with delayed snapshots</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {delayedFundSnapshots} / {funds.length}
            </p>
            <p className="mt-3 text-sm leading-7 text-mist/74">
              Mutual fund routes now depend on durable NAV writes or clearly labeled manual retained NAV rows, which keeps the public route honest when provider-backed data is still missing.
            </p>
          </GlowCard>
        </div>

        <GlowCard>
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="market data readiness lane"
            panelTitle="Write-through market-data readiness action"
            panelDescription="Log market-data activation, sync, and chart-truth changes into the shared revision lane so this desk stops living only as an operator report."
            defaultRouteTarget="/admin/market-data"
            defaultOperator="Market Data Operations Owner"
            defaultChangedFields="provider_stack, refresh_gate, market_truth"
            actionNoun="market-data readiness mutation"
          />
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-white">Configured source and endpoint stack</h2>
              <p className="max-w-4xl text-sm leading-7 text-mist/74">
                This now mirrors the URLs saved in launch config so market-data ops can treat your backend as a
                layered source stack, not a single API dependency. The operator goal is still backend then cache then
                multiple upstreams, with NSE, BSE, AMFI, MFAPI, FX, metals, and news visible in one place.
              </p>
            </div>
            <Link
              href="/admin/launch-config-console"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open launch config console
            </Link>
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
              <p className="text-sm text-mist/68">Primary endpoints configured</p>
              <p className="mt-2 text-3xl font-semibold text-white">{sourceStackSummary.primaryConfigured}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Reference fallbacks configured</p>
              <p className="mt-2 text-3xl font-semibold text-white">{sourceStackSummary.referenceConfigured}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Source credentials configured</p>
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
                          target="_blank"
                          rel="noreferrer"
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
          <h2 className="text-2xl font-semibold text-white">Durable market-data job lane</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-mist/74">
            Trigger.dev is the real private-beta execution path for refresh and provider sync. Use these runs as the authoritative worker ledger. The source-job desk below remains internal preview planning only.
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Recent runs</p>
              <p className="mt-2 text-3xl font-semibold text-white">{marketDataJobRuns.summary.total}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Queued</p>
              <p className="mt-2 text-3xl font-semibold text-white">{marketDataJobRuns.summary.queued}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Running</p>
              <p className="mt-2 text-3xl font-semibold text-white">{marketDataJobRuns.summary.running}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Failed</p>
              <p className="mt-2 text-3xl font-semibold text-white">{marketDataJobRuns.summary.failed}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/api/admin/durable-jobs?family=market_data&format=csv"
              className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Download market-data job runs
            </Link>
            <Link
              href="/admin/source-jobs"
              className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-sm font-medium text-mist/84 transition hover:border-white/20 hover:bg-white/[0.04]"
            >
              Open preview source-job desk
            </Link>
          </div>
          {marketDataJobRuns.error ? (
            <div className="mt-5 rounded-[24px] border border-amber-300/20 bg-amber-500/10 p-5 text-sm leading-7 text-amber-100/88">
              Trigger worker history could not be loaded from the live run ledger: {marketDataJobRuns.error}
            </div>
          ) : null}
          <div className="mt-5 grid gap-4">
            {marketDataJobRuns.items.length ? (
              marketDataJobRuns.items.map((item) => (
                <div key={item.id} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-white">{item.label}</h3>
                      <p className="mt-2 text-sm text-mist/66">{item.taskId}</p>
                    </div>
                    <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-mist/74">
                    {item.errorMessage
                      ? item.errorMessage
                      : typeof item.metadata?.routeTarget === "string"
                        ? `Triggered from ${item.metadata.routeTarget}.`
                        : "No failure recorded on the latest run."}
                  </p>
                  <p className="mt-3 text-xs leading-6 text-mist/58">
                    Started {new Date(item.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · {item.id}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm leading-7 text-mist/74">
                Queue the first refresh or provider-sync run to start capturing durable market-data worker history here.
              </div>
            )}
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <h3 className="text-lg font-semibold text-white">Exact refresh proof inputs</h3>
              <div className="mt-3 grid gap-2 text-sm leading-7 text-mist/74">
                {refreshProof.exactMissing.length ? (
                  refreshProof.exactMissing.map((item) => <p key={item}>{item}</p>)
                ) : (
                  <p>Refresh inputs are configured. Run the retained refresh proof next.</p>
                )}
              </div>
              <div className="mt-4 grid gap-3">
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
              <h3 className="text-lg font-semibold text-white">Exact success criteria</h3>
              <div className="mt-3 grid gap-2 text-sm leading-7 text-mist/74">
                {refreshProofCriteria.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
              <div className="mt-4 grid gap-2 text-xs leading-6 text-mist/58">
                {refreshProof.proofSqlTargets.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Market-history persistence lane</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-mist/74">
            This market-history lane now derives its retained and verified counts from the durable market tables directly. It tracks chart and history continuity without relying on hand-edited operator memory.
          </p>
          <div className="mt-5 grid gap-3 lg:grid-cols-4">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Registry rows</p>
              <p className="mt-2 text-3xl font-semibold text-white">{marketHistoryRegistrySummary.totalRows}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">History rows</p>
              <p className="mt-2 text-3xl font-semibold text-white">{marketHistoryRegistrySummary.historyRows}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Backlog rows</p>
              <p className="mt-2 text-3xl font-semibold text-white">{marketHistoryRegistrySummary.backlogRows}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Blocked rows</p>
              <p className="mt-2 text-3xl font-semibold text-white">{marketHistoryRegistrySummary.blockedRows}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/api/admin/market-history-registry"
              className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Download market-history CSV
            </Link>
            <Link
              href="/admin/source-jobs"
              className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-sm font-medium text-mist/84 transition hover:border-white/20 hover:bg-white/[0.04]"
            >
              Open preview source-job desk
            </Link>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-5">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Retained series</p>
              <p className="mt-2 text-3xl font-semibold text-white">{marketHistoryMemory.summary.retainedSeries}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Verified series</p>
              <p className="mt-2 text-3xl font-semibold text-white">{marketHistoryMemory.summary.verifiedSeries}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Preview series</p>
              <p className="mt-2 text-3xl font-semibold text-white">{marketHistoryMemory.summary.previewSeries}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Active history lanes</p>
              <p className="mt-2 text-3xl font-semibold text-white">{marketHistoryMemory.summary.activeHistoryLanes}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Blocked backlog lanes</p>
              <p className="mt-2 text-3xl font-semibold text-white">{marketHistoryMemory.summary.blockedBacklogLanes}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {marketHistoryMemory.lanes.map((lane) => (
              <div key={lane.lane} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-white">{lane.lane}</h3>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {lane.status}
                  </span>
                </div>
                <p className="mt-3 text-sm text-mist/66">
                  {lane.retainedSeries} retained · {lane.verifiedSeries} verified · {lane.previewSeries} preview
                </p>
                <p className="mt-3 text-sm leading-7 text-mist/74">{lane.continuityNote}</p>
                <p className="mt-3 text-xs leading-6 text-mist/58">
                  Refresh window: {lane.refreshWindow} · {lane.nextStep}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-[24px] border border-white/8 bg-black/15 p-5">
            <h3 className="text-lg font-semibold text-white">Telemetry-backed lane</h3>
            <p className="mt-3 text-sm leading-7 text-mist/74">
              Manual create, update, and remove actions are disabled here now. This desk derives market-history posture from the durable table telemetry so it cannot overstate quote, OHLCV, index, or fund chronology persistence through operator edits.
            </p>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {marketHistoryMemory.backlogLanes.map((lane) => (
              <div key={lane.lane} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-white">{lane.lane}</h3>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {lane.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{lane.note}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Derivatives persistence lane</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-mist/74">
            This file-backed derivatives layer turns option-chain and trader-workstation storage into a real backend
            lane. It keeps expiry-aware strike windows, analytics posture, and refresh backlog visible instead of
            leaving derivatives readiness as layout copy alone.
          </p>
          <div className="mt-5 grid gap-3 lg:grid-cols-4">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Registry rows</p>
              <p className="mt-2 text-3xl font-semibold text-white">{derivativesRegistrySummary.totalRows}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Snapshot rows</p>
              <p className="mt-2 text-3xl font-semibold text-white">{derivativesRegistrySummary.snapshotRows}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Analytics rows</p>
              <p className="mt-2 text-3xl font-semibold text-white">{derivativesRegistrySummary.analyticsRows}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Blocked backlog rows</p>
              <p className="mt-2 text-3xl font-semibold text-white">{derivativesRegistrySummary.blockedRows}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/api/admin/derivatives-registry"
              className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              Download derivatives CSV
            </Link>
            <Link
              href="/trader-workstation"
              className="rounded-full border border-white/12 bg-black/15 px-4 py-2 text-sm font-medium text-mist/84 transition hover:border-white/20 hover:bg-white/[0.04]"
            >
              Open trader workstation
            </Link>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Retained snapshots</p>
              <p className="mt-2 text-3xl font-semibold text-white">{derivativesMemory.summary.retainedSnapshots}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Active analytics lanes</p>
              <p className="mt-2 text-3xl font-semibold text-white">{derivativesMemory.summary.analyticsLanes}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Blocked backlog lanes</p>
              <p className="mt-2 text-3xl font-semibold text-white">{derivativesMemory.summary.blockedBacklogLanes}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Feed posture</p>
              <p className="mt-2 text-2xl font-semibold text-white">{derivativesMemory.summary.derivativesFeed}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {derivativesMemory.snapshots.map((item) => (
              <div key={`${item.symbol}-${item.expiry}`} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{item.symbol}</h3>
                    <p className="mt-2 text-sm text-mist/66">
                      {item.expiry} · {item.strikeWindow}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {item.snapshotState}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
                <p className="mt-2 text-xs leading-6 text-mist/55">Next refresh: {item.nextRefresh}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {derivativesMemory.analyticsLanes.map((lane) => (
              <div key={lane.lane} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-white">{lane.lane}</h3>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {lane.status}
                  </span>
                </div>
                <p className="mt-3 text-sm text-mist/66">
                  {lane.retainedSessions} retained sessions · Next job: {lane.nextJob}
                </p>
                <p className="mt-3 text-sm leading-7 text-mist/74">{lane.note}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {derivativesMemory.backlogLanes.map((lane) => (
              <div key={lane.lane} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-white">{lane.lane}</h3>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {lane.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{lane.note}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <DerivativesSnapshotCreatePanel />
            <DerivativesSnapshotUpdatePanel
              items={derivativesMemory.snapshots.map((item) => ({
                symbol: item.symbol,
                expiry: item.expiry,
                snapshotState: item.snapshotState,
                strikeWindow: item.strikeWindow,
                nextRefresh: item.nextRefresh,
                note: item.note,
              }))}
            />
          </div>
          <div className="mt-5">
            <DerivativesSnapshotManagePanel
              items={derivativesMemory.snapshots.map((item) => ({
                symbol: item.symbol,
                expiry: item.expiry,
                snapshotState: item.snapshotState,
              }))}
            />
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <DerivativesAnalyticsCreatePanel />
            <DerivativesAnalyticsUpdatePanel
              items={derivativesMemory.analyticsLanes.map((item) => ({
                lane: item.lane,
                status: item.status,
                retainedSessions: item.retainedSessions,
                nextJob: item.nextJob,
                note: item.note,
              }))}
            />
          </div>
          <div className="mt-5">
            <DerivativesAnalyticsManagePanel
              items={derivativesMemory.analyticsLanes.map((item) => ({
                lane: item.lane,
                status: item.status,
                retainedSessions: item.retainedSessions,
              }))}
            />
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Refresh and ingestion readiness</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-5">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">API route</p>
              <p className="mt-2 text-sm font-semibold text-white">/api/admin/market-data/refresh</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Admin env</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {refreshReadiness.adminSupabaseReady ? "Configured" : "Missing"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Refresh secret</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {refreshReadiness.refreshSecretReady ? "Configured" : "Missing"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Refresh source mode</p>
              <p className="mt-2 text-sm font-semibold text-white">{refreshReadiness.sourceMode}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Segmented endpoints</p>
              <p className="mt-2 text-sm font-semibold text-white">{refreshReadiness.segmentedEndpointCount}</p>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76">
            This route is now configured for cron or manual execution once <span className="text-white">SUPABASE_SERVICE_ROLE_KEY</span> and <span className="text-white">MARKET_DATA_REFRESH_SECRET</span> are present. It still needs one clean provider-backed refresh proof before operators should treat it as live. It now expects either one normalized provider payload or segmented refresh endpoints for quotes, OHLCV, fund NAVs, and index snapshots, and writes those into retained durable history tables inside <span className="text-white">{env.supabaseUrl ? "the configured Supabase project" : "the future configured Supabase project"}</span>.
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Verified ingest route</p>
              <p className="mt-2 text-sm font-semibold text-white">/api/admin/market-data/ingest</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Accepted payloads</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {ingestionReadiness.acceptedPayloads.join(", ")}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Verified ingest mode</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {ingestionReadiness.adminSupabaseReady ? "Configured" : "Missing admin env"}
              </p>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-4 py-4 text-sm leading-7 text-mist/74">
            This route is now the durable bridge for stock routes, fund routes, and tracked index pages. Once a legitimate provider posts verified quote, OHLCV, fund NAV, and index breadth payloads into this endpoint, those public routes can move beyond waiting-feed messaging without depending on demo snapshot inserts.
          </div>
          <div className="mt-4 rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76">
            Verified ingest now also retains fund NAV history and chart continuity metadata, so the app can keep the latest good market series visible even when a later refresh run only partially succeeds.
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Provider sync route</p>
              <p className="mt-2 text-sm font-semibold text-white">/api/admin/market-data/provider-sync</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Provider URL</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {providerSyncReadiness.providerUrlReady ? "Configured" : "Missing"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/68">Provider token</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {providerSyncReadiness.providerTokenReady ? "Configured" : "Optional / missing"}
              </p>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76">
            Provider sync lets the app pull one normalized JSON payload from an external source endpoint and feed it directly into the retained quote, OHLCV, fund NAV, and index snapshot history paths.
          </div>
          <div className="mt-5 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-4 py-4 text-sm leading-7 text-mist/74">
            The repo now includes a Vercel cron entry for end-of-day provider sync at <span className="text-white">16:30 IST</span>. That is safe for Hobby plans. If this project upgrades to Pro, the same route can be scheduled more frequently during market hours to keep retained chart and index history moving while the market is open.
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">First live target coverage</h2>
          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <p className="max-w-3xl text-sm leading-7 text-mist/74">
              This rollout set now has its own exportable registry, so the completed stock routes, Tata Motors chart
              payload, and tracked index routes can be audited and shared as one source of rollout truth.
            </p>
            <a
              href="/api/admin/market-data-target-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download target CSV
            </a>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Registry rows</p>
              <p className="mt-2 text-3xl font-semibold text-white">{targetRegistrySummary.total}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Verified durable</p>
              <p className="mt-2 text-3xl font-semibold text-white">{targetRegistrySummary.verified}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Manual / degraded</p>
              <p className="mt-2 text-3xl font-semibold text-white">{targetRegistrySummary.seeded}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Pending / missing</p>
              <p className="mt-2 text-3xl font-semibold text-white">{targetRegistrySummary.pending}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {targetStatuses.map((item) => (
              <div key={item.title} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm text-mist/66">
                      {item.type === "stock_quote"
                        ? "Public stock quote"
                        : item.type === "stock_chart"
                          ? "Dedicated stock chart"
                          : "Tracked index intelligence"}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-mist/52">{item.route}</p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {item.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{item.detail}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/76">
                    Source: <span className="text-white">{item.source}</span>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/76">
                    Updated: <span className="text-white">{item.updated}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Index chart symbol verification</h2>
          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <p className="max-w-3xl text-sm leading-7 text-mist/74">
              Phase 17 now treats index-chart symbol mapping as an explicit rollout lane. Sensex is the clean control
              case, while the NSE index routes can now be overridden from the Launch Config Console and verified one by
              one.
            </p>
            <a
              href="/admin/launch-config-console"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Open launch config console
            </a>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Tracked routes</p>
              <p className="mt-2 text-3xl font-semibold text-white">{chartSymbolAuditSummary.total}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Verified durable</p>
              <p className="mt-2 text-3xl font-semibold text-white">{chartSymbolAuditSummary.ready}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Overrides in use</p>
              <p className="mt-2 text-3xl font-semibold text-white">{chartSymbolAuditSummary.overrides}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Still blocked</p>
              <p className="mt-2 text-3xl font-semibold text-white">{chartSymbolAuditSummary.blocked}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {chartSymbolAuditRows.map((row) => (
              <div key={row.slug} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{row.label}</h3>
                    <p className="mt-2 text-sm text-mist/66">{row.route}</p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {row.status}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/76">
                    Current symbol: <span className="text-white">{row.currentSymbol}</span>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/76">
                    Source: <span className="text-white">{row.source}</span>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-mist/74">{row.note}</p>
                <div className="mt-4 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-4 py-3 text-sm leading-7 text-mist/74">
                  Launch-config field: <span className="text-white">{row.overrideField}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {row.candidates.map((candidate) => (
                    <div
                      key={candidate}
                      className="rounded-full border border-white/8 bg-black/20 px-3 py-1 text-xs text-white/82"
                    >
                      {candidate}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Surface readiness</h2>
          <div className="mt-5 grid gap-4">
            {marketDataSurfaces.map((surface) => (
              <div key={surface.surface} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{surface.surface}</h3>
                    <p className="mt-2 text-sm text-mist/66">{surface.latency}</p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {surface.status}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                    <span className="text-white">Source strategy:</span> {surface.sourceStrategy}
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                    <span className="text-white">Cache strategy:</span> {surface.cacheStrategy}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Execution rules</h2>
          <div className="mt-5 grid gap-3">
            {marketDataRules.map((rule) => (
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
