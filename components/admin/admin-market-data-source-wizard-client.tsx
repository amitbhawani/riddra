"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  AdminBadge,
  AdminCard,
  AdminSectionCard,
} from "@/components/admin/admin-primitives";
import type { SaveMarketDataSourceInput } from "@/lib/market-data-source-registry";
import type {
  MarketDataSourceWizardAssetType,
  MarketDataSourceWizardPreview,
  MarketDataSourceWizardSourceType,
} from "@/lib/market-data-source-wizard";
import type { MarketDataSyncResult } from "@/lib/market-data-sync";

type BannerState = {
  tone: "success" | "danger";
  text: string;
  detail?: string;
};

type SaveDraft = {
  sourceUrl: string;
  assetSlug: string;
  symbol: string;
  benchmarkSlug: string;
  schemeCode: string;
  timeframe: string;
};

const assetTypeOptions: Array<{
  value: MarketDataSourceWizardAssetType;
  label: string;
}> = [
  { value: "auto", label: "Auto detect" },
  { value: "stock", label: "Stock" },
  { value: "benchmark", label: "Benchmark" },
  { value: "fund", label: "Fund" },
];

const sourceTypeOptions: Array<{
  value: MarketDataSourceWizardSourceType;
  label: string;
}> = [
  { value: "auto", label: "Auto detect" },
  { value: "google_sheet", label: "Google Sheet" },
  { value: "yahoo_finance", label: "Yahoo Finance" },
  { value: "provider_api", label: "Provider API" },
];

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function sourceTypeLabel(value: string) {
  if (value === "google_sheet") return "Google Sheet";
  if (value === "yahoo_finance") return "Yahoo Finance";
  if (value === "provider_api") return "Provider API";
  return value;
}

function buildSaveDraft(preview: MarketDataSourceWizardPreview): SaveDraft {
  return {
    sourceUrl: cleanString(preview.suggestedSource.sourceUrl, 2000),
    assetSlug: cleanString(preview.suggestedSource.assetSlug, 160),
    symbol: cleanString(preview.suggestedSource.symbol, 160),
    benchmarkSlug: cleanString(preview.suggestedSource.benchmarkSlug, 160),
    schemeCode: cleanString(preview.suggestedSource.schemeCode, 160),
    timeframe: cleanString(preview.suggestedSource.timeframe, 20) || "1D",
  };
}

export function AdminMarketDataSourceWizardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sourceInput, setSourceInput] = useState("");
  const [assetType, setAssetType] = useState<MarketDataSourceWizardAssetType>("auto");
  const [sourceType, setSourceType] = useState<MarketDataSourceWizardSourceType>("auto");
  const [preview, setPreview] = useState<MarketDataSourceWizardPreview | null>(null);
  const [draft, setDraft] = useState<SaveDraft | null>(null);
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [syncResult, setSyncResult] = useState<MarketDataSyncResult | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const autoPreviewKeyRef = useRef<string | null>(null);

  const importableRows = useMemo(
    () => preview?.preview.rows.filter((row) => row.status !== "failed") ?? [],
    [preview],
  );
  const canSave = preview?.canSave === true && !!draft;

  useEffect(() => {
    const source = cleanString(searchParams.get("source"), 2000);
    const nextAssetType = cleanString(searchParams.get("assetType"), 80);
    const nextSourceType = cleanString(searchParams.get("sourceType"), 120);
    if (!source) {
      return;
    }

    setSourceInput((current) => current || source);
    if (nextAssetType === "stock" || nextAssetType === "benchmark" || nextAssetType === "fund") {
      setAssetType(nextAssetType);
    }
    if (
      nextSourceType === "google_sheet" ||
      nextSourceType === "yahoo_finance" ||
      nextSourceType === "provider_api"
    ) {
      setSourceType(nextSourceType);
    }
  }, [searchParams]);

  async function handlePreview() {
    setIsPreviewing(true);
    setBanner(null);
    setSyncResult(null);
    try {
      const response = await fetch("/api/admin/market-data/sources/detect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceInput,
          assetType,
          sourceType,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | ({ error?: string } & MarketDataSourceWizardPreview)
        | null;

      if (!response.ok || !data || !("preview" in data)) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "Could not preview that source right now.",
        });
        return;
      }

      setPreview(data as MarketDataSourceWizardPreview);
      setDraft(buildSaveDraft(data as MarketDataSourceWizardPreview));
      setBanner({
        tone: "success",
        text: "Source preview ready.",
        detail: `${(data as MarketDataSourceWizardPreview).rowCount} row(s) detected with latest date ${
          (data as MarketDataSourceWizardPreview).latestDate || "unknown"
        }.`,
      });
    } finally {
      setIsPreviewing(false);
    }
  }

  useEffect(() => {
    const source = cleanString(searchParams.get("source"), 2000);
    const autoPreviewKey = [source, assetType, sourceType].join("::");
    if (
      !source ||
      !sourceInput ||
      sourceInput !== source ||
      preview ||
      isPreviewing ||
      autoPreviewKeyRef.current === autoPreviewKey
    ) {
      return;
    }

    autoPreviewKeyRef.current = autoPreviewKey;
    void handlePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, preview, isPreviewing, sourceInput, assetType, sourceType]);

  async function handleSave(syncAfterSave: boolean) {
    if (!preview || !draft) {
      setBanner({
        tone: "danger",
        text: "Preview the source before saving it.",
      });
      return;
    }

    setIsSaving(true);
    setBanner(null);
    setSyncResult(null);
    try {
      const payload: SaveMarketDataSourceInput = {
        ...preview.suggestedSource,
        sourceUrl: draft.sourceUrl,
        assetSlug: draft.assetSlug || null,
        symbol: draft.symbol || null,
        benchmarkSlug: draft.benchmarkSlug || null,
        schemeCode: draft.schemeCode || null,
        timeframe: draft.timeframe || "1D",
      };

      const saveResponse = await fetch("/api/admin/market-data/sources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const saveData = (await saveResponse.json().catch(() => null)) as
        | {
            error?: string;
            source?: {
              id: string;
              sourceType: string;
              assetSlug: string | null;
              symbol: string | null;
              sourceUrl: string;
            };
          }
        | null;

      if (!saveResponse.ok || !saveData?.source) {
        setBanner({
          tone: "danger",
          text: saveData?.error ?? "Could not save that source right now.",
        });
        return;
      }

      if (!syncAfterSave) {
        setBanner({
          tone: "success",
          text: "Market-data source saved.",
          detail: `${saveData.source.sourceType} source saved for ${
            saveData.source.assetSlug || saveData.source.symbol || saveData.source.id
          }.`,
        });
        router.refresh();
        return;
      }

      const syncResponse = await fetch(
        `/api/admin/market-data/sources/${saveData.source.id}/sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );

      const syncData = (await syncResponse.json().catch(() => null)) as
        | ({ error?: string } & MarketDataSyncResult)
        | null;

      if (!syncResponse.ok || !syncData?.source) {
        setBanner({
          tone: "danger",
          text: syncData?.error ?? "Source was saved, but sync could not be completed.",
        });
        return;
      }

      setSyncResult(syncData as MarketDataSyncResult);
      setBanner({
        tone: "success",
        text:
          syncData.outcome === "no_new_rows"
            ? "Source saved. Sync completed with no new rows."
            : "Source saved and sync completed.",
        detail: [
          `Imported ${syncData.importedRows}, skipped ${syncData.skippedRows}, failed ${syncData.failedRows}.`,
          syncData.affectedRoutes[0] ? `Affected route: ${syncData.affectedRoutes[0]}.` : "",
          syncData.warnings.join(" "),
          syncData.persistenceWarnings.join(" "),
        ]
          .filter(Boolean)
          .join(" "),
      });
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {banner ? (
        <AdminCard tone={banner.tone === "success" ? "compact" : "warning"} className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <AdminBadge
              label={banner.tone === "success" ? "Ready" : "Needs attention"}
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
        title="Source wizard"
        description="Paste a Google Sheet URL, Yahoo Finance URL or symbol, or provider endpoint. Riddra will detect the source, normalize it, preview the data, and suggest the asset mapping before you save."
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)_minmax(220px,1fr)]">
          <label className="space-y-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
              Source URL or symbol
            </span>
            <input
              value={sourceInput}
              onChange={(event) => setSourceInput(event.target.value)}
              className="h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
              placeholder="Google Sheet URL, Yahoo quote URL, RELIANCE.NS, or provider API URL"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
              Asset type
            </span>
            <select
              value={assetType}
              onChange={(event) =>
                setAssetType(event.target.value as MarketDataSourceWizardAssetType)
              }
              className="h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
            >
              {assetTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
              Source type
            </span>
            <select
              value={sourceType}
              onChange={(event) =>
                setSourceType(event.target.value as MarketDataSourceWizardSourceType)
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
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handlePreview}
            disabled={isPreviewing || isSaving}
            className="inline-flex h-10 items-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-4 text-sm font-medium text-white transition hover:bg-[#111c33] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPreviewing ? "Previewing..." : "Detect and preview source"}
          </button>
          <Link
            href="/admin/market-data/sources"
            className="inline-flex h-10 items-center rounded-lg border border-[#d1d5db] bg-white px-4 text-sm font-medium text-[#111827] transition hover:bg-[#f9fafb]"
          >
            Back to source registry
          </Link>
        </div>
      </AdminSectionCard>

      {preview ? (
        <>
          <AdminSectionCard
            title="Detection and mapping preview"
            description="Review the normalized source, asset mapping, and preview counts before saving the source."
          >
            <div className="grid gap-3 xl:grid-cols-4">
              <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                  Detected source
                </p>
                <p className="mt-1 text-sm font-semibold text-[#111827]">
                  {sourceTypeLabel(preview.detectedSourceType)}
                </p>
              </div>
              <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                  Asset type
                </p>
                <p className="mt-1 text-sm font-semibold text-[#111827]">{preview.assetType}</p>
              </div>
              <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                  Latest date
                </p>
                <p className="mt-1 text-sm font-semibold text-[#111827]">
                  {preview.latestDate || "Unknown"}
                </p>
              </div>
              <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                  Latest DB date
                </p>
                <p className="mt-1 text-sm font-semibold text-[#111827]">
                  {preview.latestStoredDate || "None"}
                </p>
              </div>
            </div>

            <div className="mt-3 grid gap-3 xl:grid-cols-4">
              <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                  Rows available
                </p>
                <p className="mt-1 text-sm font-semibold text-[#111827]">{preview.rowsAvailable}</p>
              </div>
              <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                  Rows that will import
                </p>
                <p className="mt-1 text-sm font-semibold text-[#111827]">
                  {preview.rowsThatWillImport}
                </p>
              </div>
              <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                  Duplicate rows
                </p>
                <p className="mt-1 text-sm font-semibold text-[#111827]">
                  {preview.duplicateRows}
                </p>
              </div>
              <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                  Future-dated rows
                </p>
                <p className="mt-1 text-sm font-semibold text-[#111827]">
                  {preview.futureDatedRows}
                </p>
              </div>
            </div>

            <dl className="mt-4 grid gap-3 text-sm leading-6 text-[#374151] xl:grid-cols-2">
              <div>
                <dt className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                  Normalized source URL
                </dt>
                <dd className="break-all">{preview.normalizedSourceUrl}</dd>
              </div>
              <div>
                <dt className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                  Detected symbol
                </dt>
                <dd>{preview.normalizedSymbol || preview.mapping?.detectedSymbol || "None"}</dd>
              </div>
              <div>
                <dt className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                  Mapped slug
                </dt>
                <dd>{preview.mapping?.mappedSlug || "Needs confirmation"}</dd>
              </div>
              <div>
                <dt className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                  Display name
                </dt>
                <dd>{preview.mapping?.mappedDisplayName || "Needs confirmation"}</dd>
              </div>
              <div>
                <dt className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                  Source latest close / NAV
                </dt>
                <dd>{preview.latestSourceValue ?? "Unknown"}</dd>
              </div>
              <div>
                <dt className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                  DB latest close / NAV
                </dt>
                <dd>{preview.latestStoredValue ?? "None"}</dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <AdminBadge
                label={`Confidence ${Math.round((preview.mapping?.confidenceScore ?? 0) * 100)}%`}
                tone={
                  preview.mapping?.confidenceLabel === "high"
                    ? "success"
                    : preview.mapping?.confidenceLabel === "medium"
                      ? "warning"
                      : "danger"
                }
              />
              <AdminBadge label={preview.mapping?.method ?? "manual_confirmation"} tone="info" />
            </div>

            {preview.warnings.length ? (
              <div className="mt-4 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm leading-6 text-[#92400e]">
                {preview.warnings.join(" ")}
              </div>
            ) : null}
            {preview.duplicateSourceDetected ? (
              <div className="mt-4 rounded-lg border border-[#dbeafe] bg-[#eff6ff] px-4 py-3 text-sm leading-6 text-[#1d4ed8]">
                This source already exists in the registry{preview.existingSourceId ? ` (${preview.existingSourceId})` : ""}. Saving it will update the existing source instead of creating a duplicate.
              </div>
            ) : null}
            {preview.missingColumns.length ? (
              <div className="mt-4 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm leading-6 text-[#b91c1c]">
                Missing columns: {preview.missingColumns.join(", ")}
              </div>
            ) : null}
            {preview.dataQualityWarnings.length ? (
              <div className="mt-4 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm leading-6 text-[#92400e]">
                {preview.dataQualityWarnings.join(" ")}
              </div>
            ) : null}
          </AdminSectionCard>

          <AdminSectionCard
            title="Confirm source record"
            description="Adjust the mapped asset fields if needed, then save the source or save and sync it immediately."
          >
            {draft ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <label className="space-y-1.5 xl:col-span-2">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                      Source URL
                    </span>
                    <input
                      value={draft.sourceUrl}
                      onChange={(event) =>
                        setDraft((current) =>
                          current ? { ...current, sourceUrl: event.target.value } : current,
                        )
                      }
                      className="h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                      Asset slug
                    </span>
                    <input
                      value={draft.assetSlug}
                      onChange={(event) =>
                        setDraft((current) =>
                          current ? { ...current, assetSlug: event.target.value } : current,
                        )
                      }
                      className="h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                      Symbol
                    </span>
                    <input
                      value={draft.symbol}
                      onChange={(event) =>
                        setDraft((current) =>
                          current ? { ...current, symbol: event.target.value } : current,
                        )
                      }
                      className="h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <label className="space-y-1.5">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                      Benchmark slug
                    </span>
                    <input
                      value={draft.benchmarkSlug}
                      onChange={(event) =>
                        setDraft((current) =>
                          current ? { ...current, benchmarkSlug: event.target.value } : current,
                        )
                      }
                      className="h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                      Scheme code
                    </span>
                    <input
                      value={draft.schemeCode}
                      onChange={(event) =>
                        setDraft((current) =>
                          current ? { ...current, schemeCode: event.target.value } : current,
                        )
                      }
                      className="h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                      Timeframe
                    </span>
                    <input
                      value={draft.timeframe}
                      onChange={(event) =>
                        setDraft((current) =>
                          current ? { ...current, timeframe: event.target.value } : current,
                        )
                      }
                      className="h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
                    />
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSave(false)}
                    disabled={isSaving || isPreviewing || !canSave}
                    className="inline-flex h-10 items-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-4 text-sm font-medium text-white transition hover:bg-[#111c33] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Saving..." : "Save source"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave(true)}
                    disabled={isSaving || isPreviewing || !canSave}
                    className="inline-flex h-10 items-center rounded-lg border border-[#d1d5db] bg-white px-4 text-sm font-medium text-[#111827] transition hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Saving..." : "Save and sync now"}
                  </button>
                </div>
                {!canSave ? (
                  <p className="mt-3 text-xs leading-5 text-[#92400e]">
                    Save stays disabled until the source has a valid mapping, importable rows, and no missing required columns.
                  </p>
                ) : null}
              </>
            ) : null}
          </AdminSectionCard>

          <AdminSectionCard
            title="Preview rows"
            description="This is the same durable market-data preview contract the import lane uses, so row warnings and duplicate checks stay consistent."
          >
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                  Total rows
                </p>
                <p className="mt-1 text-sm font-semibold text-[#111827]">{preview.rowCount}</p>
              </div>
              <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                  Valid rows
                </p>
                <p className="mt-1 text-sm font-semibold text-[#111827]">
                  {preview.preview.validRows}
                </p>
              </div>
              <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                  Warning rows
                </p>
                <p className="mt-1 text-sm font-semibold text-[#111827]">
                  {preview.preview.warningRows}
                </p>
              </div>
              <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                  Failed rows
                </p>
                <p className="mt-1 text-sm font-semibold text-[#111827]">
                  {preview.preview.failedRows}
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-[#e5e7eb] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-[#6b7280]">
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Identifier</th>
                    <th className="px-3 py-2">Mapped slug</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e7eb]">
                  {preview.preview.rows.slice(0, 8).map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2 text-[#111827]">{row.rowNumber}</td>
                      <td className="px-3 py-2 text-[#4b5563]">{row.identifier || "—"}</td>
                      <td className="px-3 py-2 text-[#4b5563]">{row.mappedSlug || "—"}</td>
                      <td className="px-3 py-2 text-[#4b5563]">{row.importDate || "—"}</td>
                      <td className="px-3 py-2">
                        <AdminBadge
                          label={row.status}
                          tone={
                            row.status === "failed"
                              ? "danger"
                              : row.status === "warning"
                                ? "warning"
                                : "success"
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-[#4b5563]">{row.resultNote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.preview.rows.length > 8 ? (
              <p className="mt-3 text-xs leading-5 text-[#6b7280]">
                Showing the first 8 rows. {preview.preview.rows.length - 8} more row(s) are
                available in the preview.
              </p>
            ) : null}
          </AdminSectionCard>

          {syncResult ? (
            <AdminSectionCard
              title="Latest sync response"
              description="The saved source uses the normal incremental sync engine immediately after onboarding."
            >
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                    Outcome
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#111827]">{syncResult.outcome}</p>
                </div>
                <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                    Imported
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#111827]">
                    {syncResult.importedRows}
                  </p>
                </div>
                <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                    Skipped
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#111827]">
                    {syncResult.skippedRows}
                  </p>
                </div>
                <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                    Latest imported date
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#111827]">
                    {syncResult.latestImportedDate || "None"}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                    Affected frontend route
                  </p>
                  <div className="mt-1 text-sm font-semibold text-[#111827]">
                    {syncResult.affectedRoutes[0] ? (
                      <Link href={syncResult.affectedRoutes[0]} className="underline">
                        {syncResult.affectedRoutes[0]}
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
                    {(() => {
                      const row = [...syncResult.rows]
                        .filter((item) => item.status === "imported")
                        .sort((left, right) =>
                          cleanString(right.importDate, 120).localeCompare(
                            cleanString(left.importDate, 120),
                          ),
                        )[0];
                      return row?.payload.nav || row?.payload.close || "None";
                    })()}
                  </p>
                </div>
              </div>
            </AdminSectionCard>
          ) : null}
        </>
      ) : null}

      {preview && !importableRows.length ? (
        <AdminCard tone="warning">
          <p className="text-sm leading-6 text-[#92400e]">
            The source preview returned no importable rows yet. Fix the upstream data or mapping
            before saving this source.
          </p>
        </AdminCard>
      ) : null}
    </div>
  );
}
