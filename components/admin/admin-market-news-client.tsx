"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  AdminBadge,
  AdminEmptyState,
  AdminSectionCard,
  AdminSimpleTable,
  AdminStatGrid,
} from "@/components/admin/admin-primitives";
import { formatAdminDateTime } from "@/lib/admin-time";
import type {
  MarketNewsAdminArticleRecord,
  MarketNewsAdminDashboardState,
  MarketNewsAdminFailedRewriteItem,
  MarketNewsAdminIngestionRun,
  MarketNewsAdminSourceRecord,
  MarketNewsSourceDraftInput,
  MarketNewsSourceTestResult,
} from "@/lib/market-news/types";

type SourceFormState = {
  id: string | null;
  name: string;
  homepage_url: string;
  feed_url: string;
  api_url: string;
  category: string;
  region: string;
  reliability_score: string;
  is_enabled: boolean;
  notes: string;
};

function getStatusTone(status: string) {
  if (status === "published" || status === "processed" || status === "success" || status === "working") {
    return "success" as const;
  }

  if (status === "ready" || status === "running" || status === "candidate" || status === "enabled") {
    return "warning" as const;
  }

  if (status === "rejected" || status === "failed" || status === "blocked" || status === "disabled") {
    return "danger" as const;
  }

  return "default" as const;
}

function getSourceStatusLabel(source: MarketNewsAdminSourceRecord) {
  if (source.source_type === "blocked") {
    return "Blocked";
  }

  if (source.last_status === "success" || source.last_status === "working") {
    return source.is_enabled ? "Working" : "Working";
  }

  if (source.source_type === "candidate") {
    return "Candidate";
  }

  if (source.last_status === "failed") {
    return "Failed";
  }

  if (source.is_enabled) {
    return "Enabled";
  }

  return "Disabled";
}

function createEmptySourceDraft(): SourceFormState {
  return {
    id: null,
    name: "",
    homepage_url: "",
    feed_url: "",
    api_url: "",
    category: "market_news",
    region: "India",
    reliability_score: "75",
    is_enabled: false,
    notes: "",
  };
}

function sourceRecordToDraft(source: MarketNewsAdminSourceRecord): SourceFormState {
  return {
    id: source.id,
    name: source.name,
    homepage_url: source.homepage_url ?? "",
    feed_url: source.feed_url ?? "",
    api_url: source.api_url ?? "",
    category: source.category ?? "market_news",
    region: source.region ?? "India",
    reliability_score: String(source.reliability_score ?? 75),
    is_enabled: source.is_enabled,
    notes: source.notes ?? "",
  };
}

function buildSourcePayload(draft: SourceFormState) {
  return {
    id: draft.id,
    name: draft.name.trim(),
    homepage_url: draft.homepage_url.trim() || null,
    feed_url: draft.feed_url.trim() || null,
    api_url: draft.api_url.trim() || null,
    category: draft.category.trim() || null,
    region: draft.region.trim() || null,
    reliability_score: Number(draft.reliability_score || 0),
    is_enabled: draft.is_enabled,
    notes: draft.notes.trim() || null,
  } satisfies Partial<MarketNewsSourceDraftInput> & { id?: string | null };
}

function ActionButton({
  label,
  onClick,
  tone = "secondary",
  disabled,
}: {
  label: string;
  onClick: () => void;
  tone?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}) {
  const toneClass =
    tone === "primary"
      ? "border-[#0f172a] bg-[#0f172a] text-white hover:bg-[#111c33]"
      : tone === "danger"
        ? "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c] hover:bg-[#fee2e2]"
        : "border-[#d1d5db] bg-white text-[#111827] hover:bg-[#f9fafb]";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 items-center rounded-lg border px-3 text-[13px] font-medium whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-60 ${toneClass}`}
    >
      {label}
    </button>
  );
}

function EntityPills({ article }: { article: MarketNewsAdminArticleRecord }) {
  if (!article.entities.length) {
    return <span className="text-[12px] text-[#6b7280]">No linked entities yet.</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {article.entities.slice(0, 5).map((entity) => (
        <span
          key={entity.id}
          className="inline-flex items-center rounded-full border border-[#dbe3ed] bg-[#f8fafc] px-2 py-1 text-[11px] font-medium text-[#1b3a6b]"
        >
          {entity.display_name}
        </span>
      ))}
      {article.entities.length > 5 ? (
        <span className="inline-flex items-center rounded-full border border-[#e5e7eb] bg-white px-2 py-1 text-[11px] text-[#6b7280]">
          +{article.entities.length - 5} more
        </span>
      ) : null}
    </div>
  );
}

function ArticleTable({
  title,
  description,
  articles,
  onPublish,
  onUnpublish,
  onReject,
  isPending,
}: {
  title: string;
  description: string;
  articles: MarketNewsAdminArticleRecord[];
  onPublish: (articleId: string) => void;
  onUnpublish: (articleId: string) => void;
  onReject: (articleId: string) => void;
  isPending: boolean;
}) {
  return (
    <AdminSectionCard title={title} description={description}>
      {articles.length ? (
        <AdminSimpleTable
          columns={[
            "Title",
            "Source",
            "Status",
            "Category",
            "Impact",
            "Created",
            "Linked entities",
            "Links",
            "Actions",
          ]}
          rows={articles.map((article) => [
            <div key={article.id} className="space-y-1">
              <p className="font-medium text-[#111827]">{article.rewritten_title || article.original_title}</p>
              <p className="text-[12px] text-[#6b7280]">{article.original_title}</p>
            </div>,
            <div key={`${article.id}-source`} className="space-y-1">
              <p className="font-medium text-[#111827]">{article.source_name}</p>
              <p className="text-[12px] text-[#6b7280]">
                {formatAdminDateTime(article.source_published_at || article.published_at || article.created_at)}
              </p>
            </div>,
            <AdminBadge
              key={`${article.id}-status`}
              label={article.status.replaceAll("_", " ")}
              tone={getStatusTone(article.status)}
            />,
            article.category || "Market news",
            article.impact_label || "neutral",
            formatAdminDateTime(article.created_at),
            <EntityPills key={`${article.id}-entities`} article={article} />,
            <div key={`${article.id}-links`} className="flex flex-col gap-2">
              <Link href={article.internal_url} className="text-[12px] font-medium text-[#1d4ed8] hover:underline">
                {article.internal_url}
              </Link>
              <a
                href={article.source_url}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] font-medium text-[#1d4ed8] hover:underline"
              >
                Open source URL
              </a>
            </div>,
            <div key={`${article.id}-actions`} className="flex flex-wrap gap-2">
              {article.status !== "published" ? (
                <ActionButton
                  label="Publish"
                  tone="primary"
                  disabled={isPending}
                  onClick={() => onPublish(article.id)}
                />
              ) : (
                <ActionButton
                  label="Unpublish"
                  disabled={isPending}
                  onClick={() => onUnpublish(article.id)}
                />
              )}
              {article.status !== "rejected" ? (
                <ActionButton
                  label="Reject"
                  tone="danger"
                  disabled={isPending}
                  onClick={() => onReject(article.id)}
                />
              ) : null}
            </div>,
          ])}
        />
      ) : (
        <AdminEmptyState
          title={`No ${title.toLowerCase()} yet`}
          description="This section will populate automatically as ingestion and rewrite flows create more articles."
        />
      )}
    </AdminSectionCard>
  );
}

function FailedRewriteTable({
  items,
  onRetry,
  isPending,
}: {
  items: MarketNewsAdminFailedRewriteItem[];
  onRetry: (rawItemId: string) => void;
  isPending: boolean;
}) {
  return (
    <AdminSectionCard
      title="Failed rewrite items"
      description="Raw items that failed during rewrite and can be queued for another pass."
    >
      {items.length ? (
        <AdminSimpleTable
          columns={["Raw item", "Source", "Status", "Latest rewrite log", "Created", "Source URL", "Actions"]}
          rows={items.map((item) => [
            <div key={item.id} className="space-y-1">
              <p className="font-medium text-[#111827]">{item.original_title}</p>
              <p className="text-[12px] text-[#6b7280]">{item.id}</p>
            </div>,
            item.source_name,
            <AdminBadge
              key={`${item.id}-status`}
              label={item.status.replaceAll("_", " ")}
              tone={getStatusTone(item.status)}
            />,
            <div key={`${item.id}-log`} className="space-y-1">
              <p className="font-medium text-[#111827]">
                {item.latest_rewrite_log?.status?.replaceAll("_", " ") || "No log recorded"}
              </p>
              <p className="text-[12px] text-[#6b7280]">
                {item.latest_rewrite_log?.error_message || "No error message recorded."}
              </p>
            </div>,
            formatAdminDateTime(item.created_at),
            <a
              key={`${item.id}-source-url`}
              href={item.source_url}
              target="_blank"
              rel="noreferrer"
              className="text-[12px] font-medium text-[#1d4ed8] hover:underline"
            >
              Open source URL
            </a>,
            <ActionButton
              key={`${item.id}-retry`}
              label="Retry rewrite"
              tone="primary"
              disabled={isPending}
              onClick={() => onRetry(item.id)}
            />,
          ])}
        />
      ) : (
        <AdminEmptyState
          title="No failed rewrite items"
          description="Rewrite failures will appear here if any raw item needs manual retry."
        />
      )}
    </AdminSectionCard>
  );
}

function IngestionRunsTable({ runs }: { runs: MarketNewsAdminIngestionRun[] }) {
  return (
    <AdminSectionCard
      title="Recent ingestion runs"
      description="Latest source ingestions with fetched, inserted, duplicate, and failed counts."
    >
      {runs.length ? (
        <AdminSimpleTable
          columns={["Source", "Started", "Finished", "Status", "Counts", "Error"]}
          rows={runs.map((run) => [
            <div key={run.id} className="space-y-1">
              <p className="font-medium text-[#111827]">{run.source_name || "Source unavailable"}</p>
              <p className="text-[12px] text-[#6b7280]">{run.source_slug || run.source_id}</p>
            </div>,
            formatAdminDateTime(run.started_at),
            formatAdminDateTime(run.finished_at),
            <AdminBadge
              key={`${run.id}-status`}
              label={run.status.replaceAll("_", " ")}
              tone={getStatusTone(run.status)}
            />,
            <div key={`${run.id}-counts`} className="space-y-1 text-[12px] text-[#4b5563]">
              <p>Fetched: {run.fetched_count}</p>
              <p>Inserted: {run.inserted_count}</p>
              <p>Duplicates: {run.duplicate_count}</p>
              <p>Failed: {run.failed_count}</p>
            </div>,
            run.error_message || "—",
          ])}
        />
      ) : (
        <AdminEmptyState
          title="No ingestion runs yet"
          description="The latest market-news ingestion runs will appear here once the source sync starts creating activity."
        />
      )}
    </AdminSectionCard>
  );
}

function SourceTestResultCard({
  result,
}: {
  result: MarketNewsSourceTestResult | null;
}) {
  if (!result) {
    return null;
  }

  return (
    <div className="rounded-lg border border-[#d1d5db] bg-white px-4 py-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <AdminBadge label={result.classification} tone={getStatusTone(result.classification)} />
        <p className="text-sm font-medium text-[#111827]">{result.sourceName}</p>
      </div>
      <div className="mt-3 grid gap-2 text-[13px] text-[#4b5563] md:grid-cols-2 xl:grid-cols-5">
        <p>Reachable: {result.reachable ? "true" : "false"}</p>
        <p>Status: {result.statusCode ?? "n/a"}</p>
        <p>Sample items: {result.sampleItemCount}</p>
        <p>Detected feed: {result.detectedFeedUrl || "—"}</p>
        <p>Error: {result.errorMessage || "—"}</p>
      </div>
    </div>
  );
}

function SourceManagementSection({
  sources,
  draft,
  setDraft,
  onSave,
  onTestDraft,
  onImportCandidates,
  onEdit,
  onTestExisting,
  onEnable,
  onDisable,
  onSoftDisable,
  lastTestResult,
  isPending,
}: {
  sources: MarketNewsAdminSourceRecord[];
  draft: SourceFormState;
  setDraft: (value: SourceFormState) => void;
  onSave: () => void;
  onTestDraft: () => void;
  onImportCandidates: () => void;
  onEdit: (source: MarketNewsAdminSourceRecord) => void;
  onTestExisting: (sourceId: string) => void;
  onEnable: (sourceId: string) => void;
  onDisable: (sourceId: string) => void;
  onSoftDisable: (sourceId: string) => void;
  lastTestResult: MarketNewsSourceTestResult | null;
  isPending: boolean;
}) {
  return (
    <AdminSectionCard
      title="Sources"
      description="Add, edit, test, enable, disable, and review candidate publisher sources without changing the ingestion code path."
    >
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1.5">
            <span className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#6b7280]">Name</span>
            <input
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              className="rounded-lg border border-[#d1d5db] px-3 py-2 text-sm text-[#111827]"
              placeholder="CNBC Markets"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#6b7280]">Homepage URL</span>
            <input
              value={draft.homepage_url}
              onChange={(event) => setDraft({ ...draft, homepage_url: event.target.value })}
              className="rounded-lg border border-[#d1d5db] px-3 py-2 text-sm text-[#111827]"
              placeholder="https://www.cnbc.com/markets/"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#6b7280]">Feed URL</span>
            <input
              value={draft.feed_url}
              onChange={(event) => setDraft({ ...draft, feed_url: event.target.value })}
              className="rounded-lg border border-[#d1d5db] px-3 py-2 text-sm text-[#111827]"
              placeholder="Optional RSS feed URL"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#6b7280]">API URL</span>
            <input
              value={draft.api_url}
              onChange={(event) => setDraft({ ...draft, api_url: event.target.value })}
              className="rounded-lg border border-[#d1d5db] px-3 py-2 text-sm text-[#111827]"
              placeholder="Optional API URL"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#6b7280]">Category</span>
            <select
              value={draft.category}
              onChange={(event) => setDraft({ ...draft, category: event.target.value })}
              className="rounded-lg border border-[#d1d5db] px-3 py-2 text-sm text-[#111827]"
            >
              {["company_news", "market_news", "regulatory", "macro", "ipo"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#6b7280]">Region</span>
            <select
              value={draft.region}
              onChange={(event) => setDraft({ ...draft, region: event.target.value })}
              className="rounded-lg border border-[#d1d5db] px-3 py-2 text-sm text-[#111827]"
            >
              {["India", "Global"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#6b7280]">
              Reliability score
            </span>
            <input
              type="number"
              min={0}
              max={100}
              value={draft.reliability_score}
              onChange={(event) => setDraft({ ...draft, reliability_score: event.target.value })}
              className="rounded-lg border border-[#d1d5db] px-3 py-2 text-sm text-[#111827]"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#6b7280]">Notes</span>
            <input
              value={draft.notes}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              className="rounded-lg border border-[#d1d5db] px-3 py-2 text-sm text-[#111827]"
              placeholder="Optional notes or operator context"
            />
          </label>
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-[#111827]">
          <input
            type="checkbox"
            checked={draft.is_enabled}
            onChange={(event) => setDraft({ ...draft, is_enabled: event.target.checked })}
            className="h-4 w-4 rounded border border-[#d1d5db]"
          />
          Enabled
        </label>

        <div className="flex flex-wrap gap-2">
          <ActionButton
            label={draft.id ? "Save source" : "Add source"}
            tone="primary"
            disabled={isPending}
            onClick={onSave}
          />
          <ActionButton label="Test source fetch" disabled={isPending} onClick={onTestDraft} />
          <ActionButton label="Import candidate publishers" disabled={isPending} onClick={onImportCandidates} />
          {draft.id ? (
            <ActionButton label="Clear form" disabled={isPending} onClick={() => setDraft(createEmptySourceDraft())} />
          ) : null}
        </div>

        <SourceTestResultCard result={lastTestResult} />

        {sources.length ? (
          <AdminSimpleTable
            columns={[
              "Name",
              "Type",
              "URLs",
              "Category / region",
              "Reliability",
              "Status",
              "Last run",
              "Last error",
              "Actions",
            ]}
            rows={sources.map((source) => [
              <div key={source.id} className="space-y-1">
                <p className="font-medium text-[#111827]">{source.name}</p>
                <p className="text-[12px] text-[#6b7280]">{source.slug}</p>
              </div>,
              <div key={`${source.id}-type`} className="space-y-1">
                <p className="text-sm text-[#111827]">{source.source_type}</p>
                <p className="text-[12px] text-[#6b7280]">{source.is_enabled ? "Enabled" : "Disabled"}</p>
              </div>,
              <div key={`${source.id}-urls`} className="space-y-1 text-[12px] text-[#1d4ed8]">
                {source.feed_url ? <p>{source.feed_url}</p> : null}
                {source.detected_feed_url && source.detected_feed_url !== source.feed_url ? (
                  <p>{source.detected_feed_url}</p>
                ) : null}
                {source.homepage_url ? <p className="text-[#6b7280]">{source.homepage_url}</p> : null}
              </div>,
              <div key={`${source.id}-meta`} className="space-y-1">
                <p>{source.category || "Market news"}</p>
                <p className="text-[12px] text-[#6b7280]">{source.region || "—"}</p>
              </div>,
              source.reliability_score,
              <div key={`${source.id}-status`} className="space-y-2">
                <AdminBadge label={getSourceStatusLabel(source)} tone={getStatusTone(source.last_status || source.source_type)} />
                <p className="text-[12px] text-[#6b7280]">{source.last_status || "No checks yet"}</p>
              </div>,
              <div key={`${source.id}-run`} className="space-y-1 text-[12px] text-[#4b5563]">
                <p>{formatAdminDateTime(source.last_checked_at || source.last_run_started_at)}</p>
                <p>{source.last_run_status || "No ingestion run yet"}</p>
              </div>,
              <div key={`${source.id}-error`} className="max-w-[240px] text-[12px] text-[#6b7280]">
                {source.last_error || source.last_run_error || "—"}
              </div>,
              <div key={`${source.id}-actions`} className="flex flex-wrap gap-2">
                <ActionButton label="Edit" disabled={isPending} onClick={() => onEdit(source)} />
                <ActionButton label="Test" disabled={isPending} onClick={() => onTestExisting(source.id)} />
                {source.is_enabled ? (
                  <ActionButton label="Disable" disabled={isPending} onClick={() => onDisable(source.id)} />
                ) : (
                  <ActionButton
                    label="Enable"
                    tone="primary"
                    disabled={isPending}
                    onClick={() => onEnable(source.id)}
                  />
                )}
                <ActionButton
                  label="Soft-disable"
                  tone="danger"
                  disabled={isPending}
                  onClick={() => onSoftDisable(source.id)}
                />
              </div>,
            ])}
          />
        ) : (
          <AdminEmptyState
            title="No sources yet"
            description="Add a source above or import the candidate publisher list to start managing feeds from this dashboard."
          />
        )}
      </div>
    </AdminSectionCard>
  );
}

export function AdminMarketNewsClient({
  initialState,
}: {
  initialState: MarketNewsAdminDashboardState;
}) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [banner, setBanner] = useState<{
    tone: "success" | "danger";
    text: string;
  } | null>(null);
  const [draft, setDraft] = useState<SourceFormState>(createEmptySourceDraft());
  const [lastTestResult, setLastTestResult] = useState<MarketNewsSourceTestResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const stats = useMemo(
    () => [
      {
        label: "Ready",
        value: String(state.ready_articles.length),
        note: "Ready articles waiting for publish review.",
      },
      {
        label: "Published",
        value: String(state.published_articles.length),
        note: "Articles already live on the public market-news surface.",
      },
      {
        label: "Sources",
        value: String(state.sources.length),
        note: "Configured sources across working, candidate, blocked, and disabled states.",
      },
      {
        label: "Failed rewrites",
        value: String(state.failed_rewrite_items.length),
        note: "Raw items that need another rewrite pass.",
      },
    ],
    [state],
  );

  function runAction(
    action: string,
    payload: Record<string, unknown>,
    successText: string,
    options?: {
      resetDraft?: boolean;
    },
  ) {
    startTransition(async () => {
      setBanner(null);
      const response = await fetch("/api/admin/market-news", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          ...payload,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            state?: MarketNewsAdminDashboardState;
            testResult?: MarketNewsSourceTestResult;
            importSummary?: { inserted: number; skipped: number };
          }
        | null;

      if (!response.ok || !data?.state) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "Could not update market news right now.",
        });
        return;
      }

      setState(data.state);
      setLastTestResult(data.testResult ?? null);
      if (options?.resetDraft) {
        setDraft(createEmptySourceDraft());
      }
      router.refresh();

      const importText = data.importSummary
        ? ` Imported ${data.importSummary.inserted} new candidate sources and skipped ${data.importSummary.skipped} existing ones.`
        : "";

      setBanner({
        tone: "success",
        text: `${successText}${importText}`,
      });
    });
  }

  return (
    <div className="space-y-3">
      {banner ? (
        <div className="rounded-lg border border-[#d1d5db] bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <AdminBadge
              label={banner.tone === "success" ? "Updated" : "Error"}
              tone={banner.tone === "success" ? "success" : "danger"}
            />
            <p className="text-sm text-[#111827]">{banner.text}</p>
          </div>
        </div>
      ) : null}

      <AdminStatGrid stats={stats} />

      <SourceManagementSection
        sources={state.sources}
        draft={draft}
        setDraft={setDraft}
        lastTestResult={lastTestResult}
        isPending={isPending}
        onSave={() =>
          runAction("save_source", { sourceId: draft.id, source: buildSourcePayload(draft) }, "Market news source saved.", {
            resetDraft: true,
          })
        }
        onTestDraft={() =>
          runAction("test_source", { sourceId: draft.id, source: buildSourcePayload(draft) }, "Market news source test completed.")
        }
        onImportCandidates={() =>
          runAction("import_candidate_sources", {}, "Candidate publisher import completed.")
        }
        onEdit={(source) => {
          setDraft(sourceRecordToDraft(source));
          setLastTestResult(null);
        }}
        onTestExisting={(sourceId) =>
          runAction("test_source", { sourceId }, "Market news source test completed.")
        }
        onEnable={(sourceId) =>
          runAction("enable_source", { sourceId }, "Market news source enabled.")
        }
        onDisable={(sourceId) =>
          runAction("disable_source", { sourceId }, "Market news source disabled.")
        }
        onSoftDisable={(sourceId) =>
          runAction("soft_disable_source", { sourceId }, "Market news source soft-disabled.")
        }
      />

      <ArticleTable
        title="Ready articles"
        description="Articles that are rewritten and prepared but not yet live."
        articles={state.ready_articles}
        isPending={isPending}
        onPublish={(articleId) =>
          runAction("publish_article", { articleId }, "Market news article published.")
        }
        onUnpublish={(articleId) =>
          runAction("unpublish_article", { articleId }, "Market news article moved back to ready.")
        }
        onReject={(articleId) =>
          runAction("reject_article", { articleId }, "Market news article rejected.")
        }
      />

      <ArticleTable
        title="Published articles"
        description="Articles currently live on the public market-news route."
        articles={state.published_articles}
        isPending={isPending}
        onPublish={(articleId) =>
          runAction("publish_article", { articleId }, "Market news article published.")
        }
        onUnpublish={(articleId) =>
          runAction("unpublish_article", { articleId }, "Market news article unpublished.")
        }
        onReject={(articleId) =>
          runAction("reject_article", { articleId }, "Market news article rejected.")
        }
      />

      <ArticleTable
        title="Rejected articles"
        description="Articles kept internal after review."
        articles={state.rejected_articles}
        isPending={isPending}
        onPublish={(articleId) =>
          runAction("publish_article", { articleId }, "Rejected market news article published.")
        }
        onUnpublish={(articleId) =>
          runAction("unpublish_article", { articleId }, "Rejected market news article moved to ready.")
        }
        onReject={(articleId) =>
          runAction("reject_article", { articleId }, "Market news article remains rejected.")
        }
      />

      <FailedRewriteTable
        items={state.failed_rewrite_items}
        isPending={isPending}
        onRetry={(rawItemId) =>
          runAction("retry_rewrite", { rawItemId }, "Failed raw item queued for rewrite retry.")
        }
      />

      <IngestionRunsTable runs={state.recent_ingestion_runs} />
    </div>
  );
}
