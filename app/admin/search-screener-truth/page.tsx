import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { SearchIndexCreatePanel } from "@/components/search-index-create-panel";
import { SearchIndexRebuildPanel } from "@/components/search-index-rebuild-panel";
import { SearchIndexManagePanel } from "@/components/search-index-manage-panel";
import { SearchQueryReviewManagePanel } from "@/components/search-query-review-manage-panel";
import { SearchQueryReviewPanel } from "@/components/search-query-review-panel";
import { SearchIndexUpdatePanel } from "@/components/search-index-update-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listDurableJobRuns } from "@/lib/durable-jobs";
import { getSearchEnginePublicState, getSearchEngineStatus } from "@/lib/search-engine/meilisearch";
import { getSearchIndexMemory } from "@/lib/search-index-memory-store";
import { getSearchQueryMemory } from "@/lib/search-query-memory-store";
import { getSearchQueryReviewMemory } from "@/lib/search-query-review-store";
import { getSearchIndexRegistrySummary } from "@/lib/search-index-registry";
import {
  searchScreenerTruthBreakdown,
  searchScreenerTruthItems,
  searchScreenerTruthRules,
  searchScreenerTruthSummary,
} from "@/lib/search-screener-truth";
import { screenerMetricRegistrySummary } from "@/lib/screener-metric-registry";

export const metadata: Metadata = {
  title: "Search and Screener Truth",
  description:
    "Protected Phase 18 page for moving search suggestions and screener results from sample coverage to canonical asset-backed truth.",
};

export const dynamic = "force-dynamic";

export default async function AdminSearchScreenerTruthPage() {
  await requireUser();
  const [registrySummary, searchIndexMemory, searchQueryMemory, searchQueryReviewMemory, searchJobRuns, searchEngineStatus] = await Promise.all([
    getSearchIndexRegistrySummary(),
    getSearchIndexMemory(),
    getSearchQueryMemory(),
    getSearchQueryReviewMemory(),
    listDurableJobRuns({ family: "search", limit: 6 }),
    getSearchEngineStatus(),
  ]);
  const searchEnginePublicState = getSearchEnginePublicState(searchEngineStatus);
  const readinessItems = [
    ...searchScreenerTruthItems.map((item) => ({
      label: item.title,
      status: item.status,
      detail: item.detail,
      routeTarget: item.href,
    })),
    ...searchIndexMemory.lanes.map((lane) => ({
      label: `Search lane · ${lane.lane}`,
      status: lane.status === "Blocked" ? "Blocked" : "Preview / internal",
      detail: `File-backed internal registry lane. ${lane.filterCoverage} ${lane.nextStep}`,
      routeTarget: "/admin/search-screener-truth",
    })),
    ...searchIndexMemory.backlogLanes.map((lane) => ({
      label: `Backlog · ${lane.lane}`,
      status: lane.status === "Blocked" ? "Blocked" : "Preview / internal",
      detail: `File-backed internal backlog lane. ${lane.note}`,
      routeTarget: "/admin/search-screener-truth",
    })),
    {
      label: "Meilisearch engine readiness",
      status: searchEnginePublicState.available ? "Real" : searchEngineStatus.configured ? "Partial" : "Blocked",
      detail: searchEnginePublicState.available
        ? `${searchEngineStatus.indexedDocuments} indexed documents are live inside ${searchEngineStatus.indexUid}.`
        : searchEngineStatus.message ??
          "Search still needs Meilisearch host and API key configuration plus the first successful rebuild before the live engine is available.",
      routeTarget: "/admin/search-screener-truth",
    },
    {
      label: "Screener metric registry posture",
      status:
        screenerMetricRegistrySummary.blocked > 0
          ? "Blocked"
          : screenerMetricRegistrySummary.inProgress > 0
            ? "Preview / internal"
            : "Partial",
      detail: `${screenerMetricRegistrySummary.total} metric rows are tracked here as an admin registry. They do not by themselves prove live source-backed screener truth.`,
      routeTarget: "/api/admin/screener-metric-registry",
    },
    {
      label: "Search analytics feedback loop",
      status: searchQueryMemory.summary.trackedQueries > 0 ? "Preview / internal" : "Blocked",
      detail:
        searchQueryMemory.summary.trackedQueries > 0
          ? `${searchQueryMemory.summary.trackedQueries} file-backed private-beta query events now track zero-result gaps and strongest route handoffs behind the live search surface.`
          : "Search still needs query logs and zero-result audits before the ranking loop can learn from real usage.",
      routeTarget: "/api/admin/search-query-registry",
    },
    {
      label: "Zero-result review backlog",
      status:
        searchQueryReviewMemory.summary.openReviews > 0 || searchQueryReviewMemory.summary.inProgressReviews > 0
          ? "Preview / internal"
          : searchQueryReviewMemory.summary.readyReviews > 0
            ? "Preview / internal"
            : "Blocked",
      detail:
        searchQueryReviewMemory.summary.totalReviews > 0
          ? `${searchQueryReviewMemory.summary.totalReviews} file-backed review rows now turn tracked misses into owned alias, route, and index follow-up work.`
          : "Repeated weak-result queries still need an owned review backlog so search misses become executable fixes.",
      routeTarget: "/api/admin/search-query-reviews",
    },
  ];

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Admin", href: "/admin" },
              { name: "Search and Screener Truth", href: "/admin/search-screener-truth" },
            ]}
          />
          <Eyebrow>Phase 18 execution</Eyebrow>
          <SectionHeading
            title="Search and screener truth"
            description="This page keeps search and screener honest by separating the real Meilisearch engine state from preview registries, seeded coverage metrics, and file-backed feedback loops."
          />
        </div>

        <GlowCard>
          <p className="text-sm leading-7 text-mist/74">
            Only the search-engine status and indexed-document count below reflect live engine truth. Catalog coverage,
            screener rows, query analytics, and review backlog counts are still admin-facing preview or file-backed
            operational aids.
          </p>
        </GlowCard>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Search engine</p>
            <p className="mt-2 text-3xl font-semibold text-white">{searchEnginePublicState.statusLabel}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Indexed documents (live)</p>
            <p className="mt-2 text-3xl font-semibold text-white">{searchEngineStatus.indexedDocuments}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Preview catalog rows</p>
            <p className="mt-2 text-3xl font-semibold text-white">{searchScreenerTruthSummary.suggestionUniverse}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Canonical backlog lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{searchScreenerTruthSummary.canonicalBacklog}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Seeded screener rows (preview)</p>
            <p className="mt-2 text-3xl font-semibold text-white">{searchScreenerTruthSummary.seededScreenerRows}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Alias groups (file-backed ops)</p>
            <p className="mt-2 text-3xl font-semibold text-white">{searchIndexMemory.summary.aliasGroups}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Typo-protected routes (ops)</p>
            <p className="mt-2 text-3xl font-semibold text-white">{searchIndexMemory.summary.typoProtectedRoutes}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Blocked backlog lanes</p>
            <p className="mt-2 text-3xl font-semibold text-white">{searchIndexMemory.summary.blockedBacklogLanes}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Tracked query events (file-backed)</p>
            <p className="mt-2 text-3xl font-semibold text-white">{searchQueryMemory.summary.trackedQueries}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Zero-result queries (file-backed)</p>
            <p className="mt-2 text-3xl font-semibold text-white">{searchQueryMemory.summary.zeroResultQueries}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Guided handoffs (file-backed)</p>
            <p className="mt-2 text-3xl font-semibold text-white">{searchQueryMemory.summary.guidedHandoffs}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Review backlog rows (file-backed)</p>
            <p className="mt-2 text-3xl font-semibold text-white">{searchQueryReviewMemory.summary.totalReviews}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Open query reviews (file-backed)</p>
            <p className="mt-2 text-3xl font-semibold text-white">{searchQueryReviewMemory.summary.openReviews}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Ready query reviews (file-backed)</p>
            <p className="mt-2 text-3xl font-semibold text-white">{searchQueryReviewMemory.summary.readyReviews}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <ReadinessRevisionPanel
            items={readinessItems}
            assetType="search and screener truth lane"
            panelTitle="Write-through search-truth action"
            panelDescription="Log route-index, alias, and screener-truth changes into the shared revision lane so search posture stops living only as a registry and checklist desk."
            defaultRouteTarget="/admin/search-screener-truth"
            defaultOperator="Search Truth Owner"
            defaultChangedFields="route_index, alias_coverage, screener_truth"
            actionNoun="search-truth mutation"
          />
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">Search query feedback loop</h2>
              <p className="max-w-4xl text-sm leading-7 text-mist/74">
                Live search queries now persist behind the public search route, but this admin feedback loop is still file-backed for private beta. Treat it as an operational aid, not a fully durable analytics warehouse.
              </p>
            </div>
            <a
              href="/api/admin/search-query-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download query registry
            </a>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Tracked queries</p>
              <p className="mt-2 text-3xl font-semibold text-white">{searchQueryMemory.summary.trackedQueries}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Zero-result runs</p>
              <p className="mt-2 text-3xl font-semibold text-white">{searchQueryMemory.summary.zeroResultQueries}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Focus-card hits</p>
              <p className="mt-2 text-3xl font-semibold text-white">{searchQueryMemory.summary.focusCardHits}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Avg. results/query</p>
              <p className="mt-2 text-3xl font-semibold text-white">{searchQueryMemory.summary.averageResultCount}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {searchQueryMemory.topQueries.length ? (
              searchQueryMemory.topQueries.map((item) => (
                <div key={item.query} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-white">{item.query}</h3>
                    <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                      {item.count} runs
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-mist/74">
                    {item.zeroResultCount} zero-result runs
                    {item.bestLeadHref ? ` · strongest lead ${item.bestLeadHref}` : " · no stable lead route captured yet"}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm leading-7 text-mist/74">
                Query logs will start appearing here once the live search route receives tracked searches.
              </div>
            )}
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">Zero-result review backlog</h2>
              <p className="max-w-4xl text-sm leading-7 text-mist/74">
                Tracked search misses can now become real review rows with owners, proposed aliases, route targets, and status instead of staying as passive analytics. This turns search quality work into a queue the team can actually close.
              </p>
            </div>
            <a
              href="/api/admin/search-query-reviews"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download review backlog
            </a>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Total reviews</p>
              <p className="mt-2 text-3xl font-semibold text-white">{searchQueryReviewMemory.summary.totalReviews}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Open</p>
              <p className="mt-2 text-3xl font-semibold text-white">{searchQueryReviewMemory.summary.openReviews}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Preview / internal</p>
              <p className="mt-2 text-3xl font-semibold text-white">{searchQueryReviewMemory.summary.inProgressReviews}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Zero-result signals</p>
              <p className="mt-2 text-3xl font-semibold text-white">{searchQueryReviewMemory.summary.totalZeroResultSignals}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <SearchQueryReviewPanel
              suggestions={searchQueryMemory.topQueries.map((item) => ({
                query: item.query,
                zeroResultCount: item.zeroResultCount,
                bestLeadHref: item.bestLeadHref,
              }))}
            />
            <SearchQueryReviewManagePanel
              items={searchQueryReviewMemory.reviews.map((item) => ({
                query: item.query,
                status: item.status,
                owner: item.owner,
                sourceZeroResultCount: item.sourceZeroResultCount,
              }))}
            />
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {searchQueryReviewMemory.reviews.length ? (
              searchQueryReviewMemory.reviews.map((item) => (
                <div key={item.query} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-white">{item.query}</h3>
                      <p className="mt-2 text-sm text-mist/66">
                        {item.owner} · {item.sourceZeroResultCount} zero-result signals
                      </p>
                    </div>
                    <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{item.note}</p>
                  <p className="mt-3 text-xs leading-6 text-mist/58">
                    Alias: {item.proposedAlias || "Pending"} · Route: {item.proposedRoute || "Pending"} · Updated{" "}
                    {new Date(item.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm leading-7 text-mist/74">
                No review rows yet. Promote repeated weak-result queries into this backlog when search misses need real alias, route, or indexing follow-up.
              </div>
            )}
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">Durable search job lane</h2>
              <p className="max-w-4xl text-sm leading-7 text-mist/74">
                Search rebuild work now has a Trigger.dev execution lane instead of depending only on manual lane updates. Use this to rebuild the live Meilisearch document layer whenever route coverage, aliases, or owned review work changes.
              </p>
            </div>
            <a
              href="/api/admin/durable-jobs?family=search&format=csv"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download search job runs
            </a>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Recent runs</p>
              <p className="mt-2 text-3xl font-semibold text-white">{searchJobRuns.summary.total}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Queued</p>
              <p className="mt-2 text-3xl font-semibold text-white">{searchJobRuns.summary.queued}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Running</p>
              <p className="mt-2 text-3xl font-semibold text-white">{searchJobRuns.summary.running}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Failed</p>
              <p className="mt-2 text-3xl font-semibold text-white">{searchJobRuns.summary.failed}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <SearchIndexRebuildPanel />
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <h3 className="text-lg font-semibold text-white">Recent Trigger.dev runs</h3>
              <div className="mt-4 grid gap-3">
                {searchJobRuns.items.length ? (
                  searchJobRuns.items.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-medium text-white">{item.label}</p>
                        <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-6 text-mist/60">
                        {new Date(item.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        {" · "}
                        {item.id}
                      </p>
                      {item.errorMessage ? (
                        <p className="mt-2 text-sm leading-7 text-amber-200/85">{item.errorMessage}</p>
                      ) : (
                        <p className="mt-2 text-sm leading-7 text-mist/72">
                          {typeof item.metadata?.routeTarget === "string"
                            ? `Triggered from ${item.metadata.routeTarget}.`
                            : "No failure recorded on the latest run."}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-7 text-mist/72">
                    Queue the first rebuild to start capturing durable search worker history.
                  </p>
                )}
              </div>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Search-index backend lane</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-mist/74">
            This persisted index-memory layer now tracks live engine posture too: route counts, alias groups, typo
            protection, and screener filter posture stay visible in one backend desk instead of being inferred only
            from public search behavior.
          </p>
          <div className="mt-5 grid gap-4">
            {searchIndexMemory.lanes.map((lane) => (
              <div key={lane.lane} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white">{lane.lane}</h3>
                    <p className="mt-2 text-sm text-mist/66">
                      {lane.indexedRecords} indexed records · {lane.aliasGroups} alias groups · {lane.typoProtectedRoutes} typo-protected routes
                    </p>
                  </div>
                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                    {lane.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-mist/74">{lane.filterCoverage}</p>
                <p className="mt-3 text-xs leading-6 text-mist/58">
                  Last refresh: {new Date(lane.lastRefreshAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · {lane.nextStep}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <SearchIndexCreatePanel />
            <SearchIndexUpdatePanel items={searchIndexMemory.lanes} />
            <SearchIndexManagePanel
              items={searchIndexMemory.lanes.map((item) => ({
                lane: item.lane,
                status: item.status,
                indexedRecords: item.indexedRecords,
              }))}
            />
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Index backlog lanes</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {searchIndexMemory.backlogLanes.map((lane) => (
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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">Search-index registry</h2>
              <p className="max-w-4xl text-sm leading-7 text-mist/74">
                Search now has a downloadable registry behind it, so the team can audit the actual indexed route graph instead of reviewing only public search behavior.
              </p>
            </div>
            <a
              href="/api/admin/search-index-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download search registry
            </a>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Indexed routes</p>
              <p className="mt-2 text-3xl font-semibold text-white">{registrySummary.totalRows}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Asset routes</p>
              <p className="mt-2 text-3xl font-semibold text-white">{registrySummary.assetRoutes}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Compare routes</p>
              <p className="mt-2 text-3xl font-semibold text-white">{registrySummary.compareRoutes}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Workflow routes</p>
              <p className="mt-2 text-3xl font-semibold text-white">{registrySummary.workflowRoutes}</p>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">Canonical coverage handoff</h2>
              <p className="max-w-4xl text-sm leading-7 text-mist/74">
                Search and screener truth now has one exportable route registry behind it, so the team can audit which
                asset pages really exist before promising broader autocomplete or screener coverage.
              </p>
            </div>
            <a
              href="/api/admin/canonical-coverage"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download route registry
            </a>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Canonical route coverage</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {searchScreenerTruthSummary.canonicalRouteCoverage}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-mist/68">Canonical compare coverage</p>
                  <p className="mt-2 text-3xl font-semibold text-white">
                    {searchScreenerTruthSummary.canonicalCompareCoverage}
                  </p>
                </div>
                <a
              href="/api/admin/canonical-compare-coverage"
                  className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
                >
                  Download compare registry
                </a>
              </div>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">Screener metric registry</h2>
              <p className="max-w-4xl text-sm leading-7 text-mist/74">
                The screener lane now has a dedicated exportable registry for route-backed metrics, decision-handoff
                fields, and blocked future factors. It remains an admin truth aid, not proof that all screener factors
                are source-backed yet.
              </p>
            </div>
            <a
              href="/api/admin/screener-metric-registry"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
            >
              Download metric registry
            </a>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Metric rows</p>
              <p className="mt-2 text-3xl font-semibold text-white">{screenerMetricRegistrySummary.total}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Live-backed</p>
              <p className="mt-2 text-3xl font-semibold text-white">{screenerMetricRegistrySummary.ready}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Preview-backed</p>
              <p className="mt-2 text-3xl font-semibold text-white">{screenerMetricRegistrySummary.inProgress}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-5">
              <p className="text-sm text-mist/68">Blocked</p>
              <p className="mt-2 text-3xl font-semibold text-white">{screenerMetricRegistrySummary.blocked}</p>
            </div>
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Coverage breakdown</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {searchScreenerTruthBreakdown.map((item) => (
              <div key={item.title} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <p className="text-sm uppercase tracking-[0.18em] text-mist/58">{item.title}</p>
                <p className="mt-3 text-xl font-semibold text-white">{item.value}</p>
                <p className="mt-3 text-sm leading-7 text-mist/74">{item.detail}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Truth checklist</h2>
          <div className="mt-5 grid gap-4">
            {searchScreenerTruthItems.map((item) => (
              <div key={item.title} className="rounded-[24px] border border-white/8 bg-black/15 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-base font-semibold text-white">{item.title}</h3>
                      <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/80">
                        {item.status}
                      </span>
                    </div>
                    <p className="text-sm leading-7 text-mist/74">{item.detail}</p>
                  </div>
                  <Link
                    href={item.href}
                    className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/18 hover:bg-white/[0.06]"
                  >
                    Open related surface
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Truth rules</h2>
          <div className="mt-5 grid gap-3">
            {searchScreenerTruthRules.map((rule) => (
              <div
                key={rule}
                className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76"
              >
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
