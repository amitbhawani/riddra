"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  AdminBadge,
  AdminCard,
  AdminSectionCard,
} from "@/components/admin/admin-primitives";
import type { MarketDataImportRow } from "@/lib/market-data-imports";
import type {
  MarketDataSourceLatestRow,
  MarketDataSourceRecord,
  MarketDataSourceSyncStatus,
} from "@/lib/market-data-source-registry";
import type { MarketDataSyncResult } from "@/lib/market-data-sync";

const sourceTypeOptions = [
  { value: "google_sheet", label: "Google Sheet" },
  { value: "yahoo_finance", label: "Yahoo Finance" },
  { value: "provider_api", label: "Provider API" },
] as const;

const syncStatusOptions: Array<{
  value: MarketDataSourceSyncStatus;
  label: string;
}> = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "error", label: "Error" },
];

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function stringifyMetadata(value: Record<string, unknown>) {
  return JSON.stringify(value, null, 2);
}

function getStatusTone(status: MarketDataSourceSyncStatus) {
  if (status === "active") {
    return "success" as const;
  }

  if (status === "error") {
    return "danger" as const;
  }

  return "warning" as const;
}

function getSourceHealth(source: MarketDataSourceRecord) {
  if (source.syncStatus === "paused") {
    return "paused" as const;
  }

  if (source.syncStatus === "error" || cleanString(source.metadata.last_sync_error, 400)) {
    return "error" as const;
  }

  if (cleanString(source.metadata.last_sync_outcome, 120) === "no_new_rows") {
    return "no_new_rows" as const;
  }

  return "healthy" as const;
}

function getSourceHealthTone(source: MarketDataSourceRecord) {
  const health = getSourceHealth(source);
  if (health === "healthy") {
    return "success" as const;
  }
  if (health === "no_new_rows") {
    return "info" as const;
  }
  if (health === "paused") {
    return "warning" as const;
  }
  return "danger" as const;
}

function formatRowsImported(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

type BannerState = {
  tone: "success" | "danger";
  text: string;
  detail?: string;
};

type SourceRowsPanelState = {
  dbRows: MarketDataSourceLatestRow[];
  sourceRows: MarketDataImportRow[];
  previewError: string | null;
  sourcePreview: {
    latestStoredDate: string | null;
    latestSourceDate: string | null;
    latestStoredValue: number | null;
    latestSourceValue: number | null;
    rowsAvailable: number;
    rowsThatWillImport: number;
    duplicateRows: number;
    warningRows: number;
    failedRows: number;
    missingColumns: string[];
    warnings: string[];
  } | null;
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatSourceTypeLabel(value: MarketDataSourceRecord["sourceType"]) {
  if (value === "google_sheet") return "Google Sheet";
  if (value === "yahoo_finance") return "Yahoo Finance";
  return "Provider API";
}

function inferSourceName(source: MarketDataSourceRecord) {
  const explicit = cleanString(source.metadata.source_name, 240);
  if (explicit) {
    return explicit;
  }

  const slug =
    cleanString(source.assetSlug, 240) ||
    cleanString(source.benchmarkSlug, 240) ||
    cleanString(source.symbol, 240) ||
    cleanString(source.schemeCode, 240);
  if (!slug) {
    return source.id;
  }

  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatLastResult(source: MarketDataSourceRecord) {
  const outcome = cleanString(source.metadata.last_sync_outcome, 120);
  if (outcome === "completed" || outcome === "completed_with_errors") {
    return "completed";
  }
  if (outcome === "no_new_rows") {
    return "no_new_rows";
  }
  if (outcome === "failed") {
    return "error";
  }
  return source.syncStatus === "error" ? "error" : "Not run yet";
}

function getRecommendedAction(source: MarketDataSourceRecord) {
  const health = getSourceHealth(source);
  if (health === "paused") {
    return "Resume this source when the upstream feed is ready again.";
  }
  if (health === "error") {
    return "Preview the source, fix the upstream issue, then sync again.";
  }
  if (health === "no_new_rows") {
    return "Wait for the next source update or preview the upstream rows.";
  }
  if (!source.lastSyncedAt) {
    return "Run the first sync to seed durable history rows.";
  }
  return "Open the frontend route and confirm the latest imported price/date.";
}

function getPrimaryFrontendRoute(source: MarketDataSourceRecord) {
  if (source.assetSlug && source.symbol) {
    return `/stocks/${source.assetSlug}`;
  }
  if (source.benchmarkSlug) {
    return `/${source.benchmarkSlug}`;
  }
  if (source.assetSlug && source.schemeCode) {
    return `/mutual-funds/${source.assetSlug}`;
  }
  return null;
}

function extractLatestImportedValue(result: MarketDataSyncResult) {
  const importedRows = result.rows
    .filter((row) => row.status === "imported")
    .sort((left, right) => cleanString(right.importDate, 120).localeCompare(cleanString(left.importDate, 120)));
  const latestRow = importedRows[0];
  if (!latestRow) {
    return null;
  }

  const rawValue = latestRow.payload.nav || latestRow.payload.close;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : null;
}

type SourceDraft = {
  id: string | null;
  sourceType: MarketDataSourceRecord["sourceType"];
  sourceUrl: string;
  assetSlug: string;
  symbol: string;
  schemeCode: string;
  benchmarkSlug: string;
  timeframe: string;
  syncStatus: MarketDataSourceSyncStatus;
  metadataText: string;
};

function createEmptyDraft(): SourceDraft {
  return {
    id: null,
    sourceType: "google_sheet",
    sourceUrl: "",
    assetSlug: "",
    symbol: "",
    schemeCode: "",
    benchmarkSlug: "",
    timeframe: "1D",
    syncStatus: "active",
    metadataText: JSON.stringify(
      {
        sourceLabel: "",
        duplicateMode: "replace_matching_dates",
      },
      null,
      2,
    ),
  };
}

function sourceToDraft(source: MarketDataSourceRecord): SourceDraft {
  return {
    id: source.id,
    sourceType: source.sourceType,
    sourceUrl: source.sourceUrl,
    assetSlug: source.assetSlug ?? "",
    symbol: source.symbol ?? "",
    schemeCode: source.schemeCode ?? "",
    benchmarkSlug: source.benchmarkSlug ?? "",
    timeframe: source.timeframe,
    syncStatus: source.syncStatus,
    metadataText: stringifyMetadata(source.metadata),
  };
}

export function AdminMarketDataSourcesClient({
  initialSources,
}: {
  initialSources: MarketDataSourceRecord[];
}) {
  const router = useRouter();
  const [sources, setSources] = useState(initialSources);
  const [draft, setDraft] = useState<SourceDraft>(createEmptyDraft);
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<MarketDataSyncResult | null>(null);
  const [latestRowsBySource, setLatestRowsBySource] = useState<
    Record<string, SourceRowsPanelState>
  >({});
  const [rowLoadingSourceId, setRowLoadingSourceId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sortedSources = useMemo(
    () =>
      [...sources].sort((left, right) =>
        `${right.updatedAt}${right.id}`.localeCompare(`${left.updatedAt}${left.id}`),
      ),
    [sources],
  );

  function resetDraft() {
    setDraft(createEmptyDraft());
  }

  async function saveSource() {
    let metadata: Record<string, unknown> = {};
    try {
      metadata = draft.metadataText.trim()
        ? (JSON.parse(draft.metadataText) as Record<string, unknown>)
        : {};
    } catch {
      setBanner({
        tone: "danger",
        text: "Metadata must be valid JSON.",
      });
      return;
    }

    startTransition(async () => {
      setBanner(null);
      const response = await fetch("/api/admin/market-data/sources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: draft.id,
          sourceType: draft.sourceType,
          sourceUrl: draft.sourceUrl,
          assetSlug: draft.assetSlug,
          symbol: draft.symbol,
          schemeCode: draft.schemeCode,
          benchmarkSlug: draft.benchmarkSlug,
          timeframe: draft.timeframe,
          syncStatus: draft.syncStatus,
          metadata,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; source?: MarketDataSourceRecord }
        | null;

      if (!response.ok || !data?.source) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "Could not save that source right now.",
        });
        return;
      }

      setSources((current) => {
        const next = current.filter((item) => item.id !== data.source!.id);
        return [data.source!, ...next];
      });
      resetDraft();
      setBanner({
        tone: "success",
        text: "Market-data source saved.",
        detail: `${data.source.sourceType} · ${data.source.sourceUrl}`,
      });
      router.refresh();
    });
  }

  function syncSource(source: MarketDataSourceRecord) {
    startTransition(async () => {
      setBanner(null);
      setLastSyncResult(null);

      const response = await fetch(`/api/admin/market-data/sources/${source.id}/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          allowPaused: true,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | ({ error?: string } & MarketDataSyncResult)
        | null;

      if (!response.ok || !data?.source) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "Could not sync that source right now.",
          detail:
            data?.persistenceWarnings?.join(" ") ||
            data?.warnings?.join(" ") ||
            (source.metadata.last_sync_error as string | undefined),
        });
        return;
      }

      setSources((current) => {
        const next = current.filter((item) => item.id !== data.source!.id);
        return [data.source!, ...next];
      });
      setLastSyncResult(data as MarketDataSyncResult);
      setBanner({
        tone: "success",
        text:
          data.outcome === "no_new_rows"
            ? "Sync completed with no new rows."
            : "Sync completed.",
        detail: [
          `Imported ${data.importedRows}, skipped ${data.skippedRows}, failed ${data.failedRows}.`,
          data.affectedRoutes[0] ? `Affected route: ${data.affectedRoutes[0]}.` : "",
          data.persistenceWarnings.join(" "),
          data.warnings.join(" "),
        ]
          .filter(Boolean)
          .join(" "),
      });
      router.refresh();
    });
  }

  function updateSourceStatus(source: MarketDataSourceRecord, nextStatus: MarketDataSourceSyncStatus) {
    startTransition(async () => {
      setBanner(null);
      const response = await fetch("/api/admin/market-data/sources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: source.id,
          sourceType: source.sourceType,
          sourceUrl: source.sourceUrl,
          assetSlug: source.assetSlug,
          symbol: source.symbol,
          schemeCode: source.schemeCode,
          benchmarkSlug: source.benchmarkSlug,
          timeframe: source.timeframe,
          syncStatus: nextStatus,
          metadata: source.metadata,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; source?: MarketDataSourceRecord }
        | null;

      if (!response.ok || !data?.source) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "Could not update that source right now.",
        });
        return;
      }

      setSources((current) => {
        const next = current.filter((item) => item.id !== data.source!.id);
        return [data.source!, ...next];
      });
      setBanner({
        tone: "success",
        text: nextStatus === "paused" ? "Source paused." : "Source resumed.",
        detail: `${inferSourceName(data.source)} is now ${nextStatus}.`,
      });
      router.refresh();
    });
  }

  function syncAllActiveSources() {
    startTransition(async () => {
      setBanner(null);
      const response = await fetch("/api/admin/market-data/sources/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            syncedSources?: number;
            results?: MarketDataSyncResult[];
          }
        | null;

      if (!response.ok || !data?.results) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "Could not sync active sources right now.",
        });
        return;
      }

      const updatedSources = data.results.map((result) => result.source);
      setSources((current) => {
        const byId = new Map(current.map((source) => [source.id, source]));
        for (const source of updatedSources) {
          byId.set(source.id, source);
        }
        return Array.from(byId.values());
      });
      setLastSyncResult(data.results[0] ?? null);
      setBanner({
        tone: "success",
        text: `Synced ${data.syncedSources ?? data.results.length} active source${
          (data.syncedSources ?? data.results.length) === 1 ? "" : "s"
        }.`,
        detail: data.results
          .flatMap((result) => [...result.persistenceWarnings, ...result.warnings])
          .filter(Boolean)
          .join(" "),
      });
      router.refresh();
    });
  }

  function loadLatestRows(source: MarketDataSourceRecord) {
    startTransition(async () => {
      setRowLoadingSourceId(source.id);
      const response = await fetch(`/api/admin/market-data/sources/${source.id}/rows?limit=10`, {
        method: "GET",
      });
      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            dbRows?: MarketDataSourceLatestRow[];
            sourceRows?: MarketDataImportRow[];
            previewError?: string | null;
            sourcePreview?: SourceRowsPanelState["sourcePreview"];
          }
        | null;

      if (!response.ok || !data?.dbRows) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "Could not load the latest source rows right now.",
        });
        setRowLoadingSourceId(null);
        return;
      }

      setLatestRowsBySource((current) => ({
        ...current,
        [source.id]: {
          dbRows: data.dbRows ?? [],
          sourceRows: data.sourceRows ?? [],
          previewError: data.previewError ?? null,
          sourcePreview: data.sourcePreview ?? null,
        },
      }));
      setRowLoadingSourceId(null);
    });
  }

  return (
    <div className="space-y-4">
      {banner ? (
        <AdminCard tone={banner.tone === "success" ? "compact" : "warning"} className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <AdminBadge
              label={banner.tone === "success" ? "Updated" : "Needs attention"}
              tone={banner.tone === "success" ? "success" : "warning"}
            />
            <p className="text-sm leading-6 text-[#374151]">{banner.text}</p>
          </div>
          {banner.detail ? (
            <p className="text-xs leading-5 text-[#6b7280]">{banner.detail}</p>
          ) : null}
        </AdminCard>
      ) : null}

      <AdminSectionCard
        title="Editor-friendly onboarding"
        description="Use the source wizard for one source at a time, or the bulk onboarding CSV when you need to register many sources at once. The manual JSON form stays here for advanced overrides only."
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <Link
            href="/admin/market-data/sources/new"
            className="inline-flex h-10 items-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-4 text-sm font-medium text-white transition hover:bg-[#111c33]"
          >
            Open source wizard
          </Link>
          <Link
            href="/admin/market-data/sources/import"
            className="inline-flex h-10 items-center rounded-lg border border-[#d1d5db] bg-white px-4 text-sm font-medium text-[#111827] transition hover:bg-[#f9fafb]"
          >
            Bulk onboard sources
          </Link>
          <button
            type="button"
            onClick={syncAllActiveSources}
            disabled={isPending || !sources.some((source) => source.syncStatus === "active")}
            className="inline-flex h-10 items-center rounded-lg border border-[#d1d5db] bg-white px-4 text-sm font-medium text-[#111827] transition hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Syncing..." : "Sync all active sources"}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
              Source type
            </span>
            <select
              value={draft.sourceType}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  sourceType: event.target.value as SourceDraft["sourceType"],
                }))
              }
              className="h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
            >
              {sourceTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 xl:col-span-3">
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
              Source URL
            </span>
            <input
              value={draft.sourceUrl}
              onChange={(event) =>
                setDraft((current) => ({ ...current, sourceUrl: event.target.value }))
              }
              className="h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
              placeholder="https://docs.google.com/... or provider endpoint"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
              Asset slug
            </span>
            <input
              value={draft.assetSlug}
              onChange={(event) =>
                setDraft((current) => ({ ...current, assetSlug: event.target.value }))
              }
              className="h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
              placeholder="reliance-industries"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
              Symbol
            </span>
            <input
              value={draft.symbol}
              onChange={(event) =>
                setDraft((current) => ({ ...current, symbol: event.target.value }))
              }
              className="h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
              placeholder="RELIANCE.NS"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
              Scheme code
            </span>
            <input
              value={draft.schemeCode}
              onChange={(event) =>
                setDraft((current) => ({ ...current, schemeCode: event.target.value }))
              }
              className="h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
              placeholder="Fund source identifier"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
              Benchmark slug
            </span>
            <input
              value={draft.benchmarkSlug}
              onChange={(event) =>
                setDraft((current) => ({ ...current, benchmarkSlug: event.target.value }))
              }
              className="h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
              placeholder="nifty50"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
              Timeframe
            </span>
            <input
              value={draft.timeframe}
              onChange={(event) =>
                setDraft((current) => ({ ...current, timeframe: event.target.value }))
              }
              className="h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
              placeholder="1D"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
              Sync status
            </span>
            <select
              value={draft.syncStatus}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  syncStatus: event.target.value as MarketDataSourceSyncStatus,
                }))
              }
              className="h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
            >
              {syncStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 block space-y-1.5">
          <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
            Metadata JSON
          </span>
          <textarea
            value={draft.metadataText}
            onChange={(event) =>
              setDraft((current) => ({ ...current, metadataText: event.target.value }))
            }
            className="min-h-[170px] w-full rounded-lg border border-[#d1d5db] bg-white px-3 py-2.5 font-mono text-xs text-[#111827]"
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={saveSource}
            disabled={isPending}
            className="inline-flex h-10 items-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-4 text-sm font-medium text-white transition hover:bg-[#111c33] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {draft.id ? "Update source" : "Add source"}
          </button>
          <button
            type="button"
            onClick={resetDraft}
            disabled={isPending}
            className="inline-flex h-10 items-center rounded-lg border border-[#d1d5db] bg-white px-4 text-sm font-medium text-[#111827] transition hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset form
          </button>
        </div>
      </AdminSectionCard>

      {lastSyncResult ? (
        <AdminSectionCard
          title="Latest sync result"
          description="This shows the last manual sync response returned by the API."
        >
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                Outcome
              </p>
              <p className="mt-1 text-sm font-semibold text-[#111827]">{lastSyncResult.outcome}</p>
            </div>
            <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                Imported
              </p>
              <p className="mt-1 text-sm font-semibold text-[#111827]">{lastSyncResult.importedRows}</p>
            </div>
            <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                Skipped
              </p>
              <p className="mt-1 text-sm font-semibold text-[#111827]">{lastSyncResult.skippedRows}</p>
            </div>
            <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                Latest imported date
              </p>
              <p className="mt-1 text-sm font-semibold text-[#111827]">
                {lastSyncResult.latestImportedDate || "None"}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                Affected frontend route
              </p>
              <div className="mt-1 text-sm font-semibold text-[#111827]">
                {lastSyncResult.affectedRoutes[0] ? (
                  <Link href={lastSyncResult.affectedRoutes[0]} className="underline">
                    {lastSyncResult.affectedRoutes[0]}
                  </Link>
                ) : (
                  "None"
                )}
              </div>
            </div>
            <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                Latest imported price / NAV
              </p>
              <p className="mt-1 text-sm font-semibold text-[#111827]">
                {extractLatestImportedValue(lastSyncResult) ?? "None"}
              </p>
            </div>
          </div>
          {lastSyncResult.persistenceWarnings.length ? (
            <div className="mt-4 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm leading-6 text-[#92400e]">
              {lastSyncResult.persistenceWarnings.join(" ")}
            </div>
          ) : null}
        </AdminSectionCard>
      ) : null}

      <AdminSectionCard
        title="Registered sources"
        description="Each source stays durable, triggerable, and future-cron ready."
      >
        <div className="space-y-3">
          {sortedSources.length ? (
            sortedSources.map((source) => (
              <div
                key={source.id}
                className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-[#111827]">
                        {inferSourceName(source)}
                      </h3>
                      <AdminBadge label={formatSourceTypeLabel(source.sourceType)} tone="info" />
                      <AdminBadge label={source.syncStatus} tone={getStatusTone(source.syncStatus)} />
                      <AdminBadge
                        label={getSourceHealth(source)}
                        tone={getSourceHealthTone(source)}
                      />
                    </div>
                    <dl className="grid gap-2 text-xs leading-5 text-[#4b5563] md:grid-cols-2 xl:grid-cols-3">
                      <div>
                        <dt className="font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                          Source name
                        </dt>
                        <dd>{inferSourceName(source)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                          Source type
                        </dt>
                        <dd>{formatSourceTypeLabel(source.sourceType)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                          Mapped asset
                        </dt>
                        <dd>{source.assetSlug || source.benchmarkSlug || source.schemeCode || "Not set"}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                          Asset slug
                        </dt>
                        <dd>{source.assetSlug || "Not set"}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                          Symbol
                        </dt>
                        <dd>{source.symbol || "Not set"}</dd>
                      </div>
                      <div className="md:col-span-2 xl:col-span-3">
                        <dt className="font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                          Source URL
                        </dt>
                        <dd className="break-all">{source.sourceUrl}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                          Sync status
                        </dt>
                        <dd>{source.syncStatus}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                          Last synced at
                        </dt>
                        <dd>{formatDateTime(source.lastSyncedAt)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                          Last synced date
                        </dt>
                        <dd>{source.lastSyncedDate || "None"}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                          Last result
                        </dt>
                        <dd>{formatLastResult(source)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                          Rows imported in last sync
                        </dt>
                        <dd>{formatRowsImported(source.metadata.last_rows_imported)}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                          Source health
                        </dt>
                        <dd>{getSourceHealth(source)}</dd>
                      </div>
                      <div className="md:col-span-2 xl:col-span-3">
                        <dt className="font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                          Next recommended action
                        </dt>
                        <dd>{getRecommendedAction(source)}</dd>
                      </div>
                    </dl>
                    {typeof source.metadata.last_sync_error === "string" &&
                    source.metadata.last_sync_error ? (
                      <div className="rounded-lg border border-[#fecaca] bg-[#fff7ed] px-3 py-2 text-xs leading-5 text-[#9a3412]">
                        <span className="font-semibold">Last error:</span>{" "}
                        {source.metadata.last_sync_error}
                      </div>
                    ) : null}
                    {cleanString(source.metadata.last_sync_message, 400) ? (
                      <div className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-xs leading-5 text-[#4b5563]">
                        <span className="font-semibold">Latest sync message:</span>{" "}
                        {cleanString(source.metadata.last_sync_message, 400)}
                      </div>
                    ) : null}
                    {latestRowsBySource[source.id] ? (
                      <div className="space-y-3 rounded-lg border border-[#e5e7eb] bg-white px-3 py-3">
                        {latestRowsBySource[source.id].sourcePreview ? (
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                                Source vs DB latest date
                              </p>
                              <p className="mt-1 text-xs text-[#111827]">
                                {latestRowsBySource[source.id].sourcePreview?.latestSourceDate || "Unknown"} vs{" "}
                                {latestRowsBySource[source.id].sourcePreview?.latestStoredDate || "None"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                                Source vs DB latest close
                              </p>
                              <p className="mt-1 text-xs text-[#111827]">
                                {latestRowsBySource[source.id].sourcePreview?.latestSourceValue ?? "—"} vs{" "}
                                {latestRowsBySource[source.id].sourcePreview?.latestStoredValue ?? "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                                Rows available / importable
                              </p>
                              <p className="mt-1 text-xs text-[#111827]">
                                {latestRowsBySource[source.id].sourcePreview?.rowsAvailable ?? 0} /{" "}
                                {latestRowsBySource[source.id].sourcePreview?.rowsThatWillImport ?? 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                                Duplicate / warning rows
                              </p>
                              <p className="mt-1 text-xs text-[#111827]">
                                {latestRowsBySource[source.id].sourcePreview?.duplicateRows ?? 0} /{" "}
                                {latestRowsBySource[source.id].sourcePreview?.warningRows ?? 0}
                              </p>
                            </div>
                          </div>
                        ) : null}
                        {latestRowsBySource[source.id].previewError ? (
                          <div className="rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-xs leading-5 text-[#92400e]">
                            {latestRowsBySource[source.id].previewError}
                          </div>
                        ) : null}
                        {latestRowsBySource[source.id].sourcePreview?.warnings.length ? (
                          <div className="rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-xs leading-5 text-[#92400e]">
                            {latestRowsBySource[source.id].sourcePreview?.warnings.join(" ")}
                          </div>
                        ) : null}
                        <div className="grid gap-3 xl:grid-cols-2">
                          <div className="overflow-x-auto rounded-lg border border-[#e5e7eb]">
                            <div className="border-b border-[#e5e7eb] bg-[#f8fafc] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                              Latest source rows
                            </div>
                            <table className="min-w-full divide-y divide-[#e5e7eb] text-xs">
                              <thead>
                                <tr className="text-left uppercase tracking-[0.14em] text-[#6b7280]">
                                  <th className="px-3 py-2">Date</th>
                                  <th className="px-3 py-2">Close / NAV</th>
                                  <th className="px-3 py-2">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#e5e7eb]">
                                {latestRowsBySource[source.id].sourceRows.map((row) => (
                                  <tr key={row.id}>
                                    <td className="px-3 py-2 text-[#111827]">{row.importDate || "—"}</td>
                                    <td className="px-3 py-2 text-[#4b5563]">
                                      {row.payload.nav || row.payload.close || "—"}
                                    </td>
                                    <td className="px-3 py-2 text-[#4b5563]">{row.status}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="overflow-x-auto rounded-lg border border-[#e5e7eb]">
                            <div className="border-b border-[#e5e7eb] bg-[#f8fafc] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                              Latest DB rows
                            </div>
                            <table className="min-w-full divide-y divide-[#e5e7eb] text-xs">
                              <thead>
                                <tr className="text-left uppercase tracking-[0.14em] text-[#6b7280]">
                                  <th className="px-3 py-2">Date</th>
                                  <th className="px-3 py-2">Close / NAV</th>
                                  <th className="px-3 py-2">Volume</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#e5e7eb]">
                                {latestRowsBySource[source.id].dbRows.map((row) => (
                                  <tr key={`${source.id}-${row.tradeDate}-${row.updatedAt}`}>
                                    <td className="px-3 py-2 text-[#111827]">{row.tradeDate}</td>
                                    <td className="px-3 py-2 text-[#4b5563]">
                                      {row.nav ?? row.close ?? "—"}
                                    </td>
                                    <td className="px-3 py-2 text-[#4b5563]">{row.volume ?? "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/market-data/sources/new?source=${encodeURIComponent(
                        source.sourceUrl,
                      )}&sourceType=${encodeURIComponent(source.sourceType)}&assetType=${encodeURIComponent(
                        source.benchmarkSlug ? "benchmark" : source.schemeCode ? "fund" : "stock",
                      )}`}
                      className="inline-flex h-9 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-sm font-medium text-[#111827] transition hover:bg-[#f9fafb]"
                    >
                      Preview source
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setDraft(sourceToDraft(source));
                        setBanner(null);
                      }}
                      className="inline-flex h-9 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-sm font-medium text-[#111827] transition hover:bg-[#f9fafb]"
                    >
                      Edit source
                    </button>
                    <button
                      type="button"
                      onClick={() => loadLatestRows(source)}
                      disabled={isPending}
                      className="inline-flex h-9 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-sm font-medium text-[#111827] transition hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {rowLoadingSourceId === source.id ? "Loading..." : "View latest rows"}
                    </button>
                    {source.syncStatus === "paused" ? (
                      <button
                        type="button"
                        onClick={() => updateSourceStatus(source, "active")}
                        disabled={isPending}
                        className="inline-flex h-9 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-sm font-medium text-[#111827] transition hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Resume source
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => updateSourceStatus(source, "paused")}
                        disabled={isPending}
                        className="inline-flex h-9 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-sm font-medium text-[#111827] transition hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Pause source
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => syncSource(source)}
                      disabled={isPending}
                      className="inline-flex h-9 items-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-3 text-sm font-medium text-white transition hover:bg-[#111c33] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPending ? "Syncing..." : "Sync now"}
                    </button>
                    {getPrimaryFrontendRoute(source) ? (
                      <Link
                        href={getPrimaryFrontendRoute(source)!}
                        className="inline-flex h-9 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-sm font-medium text-[#111827] transition hover:bg-[#f9fafb]"
                      >
                        Open stock page
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm leading-6 text-[#4b5563]">
              No market-data sources are registered yet.
            </p>
          )}
        </div>
      </AdminSectionCard>
    </div>
  );
}
