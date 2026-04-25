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
} from "@/lib/market-news/types";

function getStatusTone(status: string) {
  if (status === "published" || status === "processed" || status === "success") {
    return "success" as const;
  }

  if (status === "ready" || status === "running") {
    return "warning" as const;
  }

  if (status === "rejected" || status === "failed") {
    return "danger" as const;
  }

  return "default" as const;
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

function EntityPills({
  article,
}: {
  article: MarketNewsAdminArticleRecord;
}) {
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
              <p className="font-medium text-[#111827]">
                {article.rewritten_title || article.original_title}
              </p>
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
              <Link
                href={article.internal_url}
                className="text-[12px] font-medium text-[#1d4ed8] hover:underline"
              >
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

function IngestionRunsTable({
  runs,
}: {
  runs: MarketNewsAdminIngestionRun[];
}) {
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
        label: "Rejected",
        value: String(state.rejected_articles.length),
        note: "Articles held back from the public surface.",
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
    payload: { articleId?: string; rawItemId?: string },
    successText: string,
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
      router.refresh();
      setBanner({
        tone: "success",
        text: successText,
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
