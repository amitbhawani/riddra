"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";

import type {
  ExecuteMarketDataImportResult,
  MarketDataImportBatch,
  MarketDataImportDuplicateMode,
  MarketDataImportExecutionMode,
  MarketDataImportPreview,
  MarketDataImportRow,
  MarketDataImportSourceType,
  MarketDataImportTemplate,
  MarketDataImportType,
} from "@/lib/market-data-imports";
import { AdminBadge, AdminCard, AdminSectionCard } from "@/components/admin/admin-primitives";

const executionModeOptions: Array<{
  value: MarketDataImportExecutionMode;
  label: string;
  note: string;
}> = [
  {
    value: "validate_only",
    label: "Validate only",
    note: "Check rows, save the validation batch, and import later.",
  },
  {
    value: "import_valid_rows",
    label: "Import valid rows",
    note: "Import all valid rows and keep failed rows in the batch report.",
  },
];

const duplicateModeOptions: Array<{
  value: MarketDataImportDuplicateMode;
  label: string;
  note: string;
}> = [
  {
    value: "replace_matching_dates",
    label: "Replace matching dates",
    note: "Upsert matching durable dates when the same asset/date appears again.",
  },
  {
    value: "skip_existing_dates",
    label: "Skip existing dates",
    note: "Keep existing durable rows and skip matching dates in the file.",
  },
];

const sourceTypeOptions: Array<{
  value: MarketDataImportSourceType;
  label: string;
  note: string;
}> = [
  { value: "manual_csv", label: "Manual CSV", note: "Upload a file directly today." },
  { value: "google_sheet", label: "Google Sheet", note: "Connected sheet sync can reuse this same durable pipeline." },
  { value: "yahoo_finance", label: "Yahoo Finance", note: "Latest market-data sync can reuse this same durable pipeline." },
  { value: "provider_api", label: "Provider API", note: "Direct provider sync can reuse this same durable pipeline." },
];

function getRowTone(row: MarketDataImportRow) {
  if (row.status === "failed") return "danger" as const;
  if (row.status === "warning") return "warning" as const;
  if (row.status === "imported") return "success" as const;
  if (row.status === "skipped") return "info" as const;
  return "default" as const;
}

function formatBatchLabel(batch: MarketDataImportBatch) {
  return `${batch.dataType.replace(/_/g, " ")} · ${batch.fileName}`;
}

export function AdminMarketDataImportClient({
  templates,
  initialBatchDetails,
}: {
  templates: MarketDataImportTemplate[];
  initialBatchDetails: Array<{ batch: MarketDataImportBatch; rows: MarketDataImportRow[] }>;
}) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<MarketDataImportType>(
    templates[0]?.type ?? "stock_ohlcv",
  );
  const [executionMode, setExecutionMode] =
    useState<MarketDataImportExecutionMode>("import_valid_rows");
  const [duplicateMode, setDuplicateMode] =
    useState<MarketDataImportDuplicateMode>("replace_matching_dates");
  const [sourceType, setSourceType] = useState<MarketDataImportSourceType>("manual_csv");
  const [sourceLabel, setSourceLabel] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<MarketDataImportPreview | null>(null);
  const [batchDetails, setBatchDetails] = useState(initialBatchDetails);
  const [selectedPreviewFilter, setSelectedPreviewFilter] = useState<
    "all" | "failed" | "warning" | "valid"
  >("all");
  const [banner, setBanner] = useState<{
    tone: "success" | "danger";
    text: string;
    detail?: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const template = useMemo(
    () => templates.find((item) => item.type === selectedType) ?? templates[0],
    [selectedType, templates],
  );

  const filteredPreviewRows = useMemo(() => {
    if (!preview) {
      return [];
    }

    if (selectedPreviewFilter === "all") {
      return preview.rows;
    }

    return preview.rows.filter((row) =>
      selectedPreviewFilter === "valid"
        ? row.status === "valid"
        : row.status === selectedPreviewFilter,
    );
  }, [preview, selectedPreviewFilter]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      return;
    }

    setBanner(null);
    setPreview(null);
    setFileName(file.name);
    setCsvText(await file.text());
  }

  function previewFile() {
    if (!csvText.trim()) {
      setBanner({
        tone: "danger",
        text: "Choose a CSV file before checking it.",
      });
      return;
    }

    startTransition(async () => {
      setBanner(null);
      const response = await fetch("/api/admin/market-data/import/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: selectedType,
          csvText,
          fileName,
          executionMode,
          duplicateMode,
          sourceType,
          sourceLabel,
          sourceUrl,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | (MarketDataImportPreview & { error?: string })
        | null;

      if (!response.ok || !data) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "We could not preview that file right now.",
        });
        return;
      }

      setPreview(data);
      setSelectedPreviewFilter("all");
      setBanner({
        tone: "success",
        text:
          data.failedRows > 0
            ? "Preview ready. Fix the failed rows or keep them out of the import."
            : "Preview ready. The valid rows can be imported now.",
        detail: `${data.totalRows} rows checked · ${data.validRows} valid · ${data.warningRows} warning · ${data.failedRows} failed`,
      });
    });
  }

  function runImport() {
    if (!csvText.trim()) {
      setBanner({
        tone: "danger",
        text: "Choose a CSV file before importing.",
      });
      return;
    }

    startTransition(async () => {
      setBanner(null);
      const response = await fetch("/api/admin/market-data/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: selectedType,
          csvText,
          fileName,
          executionMode,
          duplicateMode,
          sourceType,
          sourceLabel,
          sourceUrl,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | ({ error?: string } & ExecuteMarketDataImportResult)
        | null;

      if (!response.ok || !data?.batch || !data.rows) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "We could not process that market-data import right now.",
        });
        return;
      }

      setBatchDetails((current) => [{ batch: data.batch!, rows: data.rows! }, ...current].slice(0, 8));
      setPreview(null);
      setCsvText("");
      setFileName("");
      setBanner({
        tone: "success",
        text:
          executionMode === "validate_only"
            ? "Validation batch saved."
            : "Market-data import completed.",
        detail: data.batch.summary,
      });
      router.refresh();
    });
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
        title="Import historical market data"
        description="Use this route for OHLCV candles and NAV history. Do not use the content importer for historical prices, NAVs, or chart series."
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.98fr)_minmax(320px,0.92fr)]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                  Data type
                </span>
                <select
                  value={selectedType}
                  onChange={(event) => {
                    setSelectedType(event.target.value as MarketDataImportType);
                    setPreview(null);
                    setBanner(null);
                  }}
                  className="h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
                >
                  {templates.map((item) => (
                    <option key={item.type} value={item.type}>
                      {item.label}
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
                  onChange={(event) => setSourceType(event.target.value as MarketDataImportSourceType)}
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

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                  Execution mode
                </span>
                <select
                  value={executionMode}
                  onChange={(event) =>
                    setExecutionMode(event.target.value as MarketDataImportExecutionMode)
                  }
                  className="h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
                >
                  {executionModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                  Duplicate mode
                </span>
                <select
                  value={duplicateMode}
                  onChange={(event) =>
                    setDuplicateMode(event.target.value as MarketDataImportDuplicateMode)
                  }
                  className="h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
                >
                  {duplicateModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                  Source label
                </span>
                <input
                  value={sourceLabel}
                  onChange={(event) => setSourceLabel(event.target.value)}
                  placeholder="manual_csv_upload"
                  className="h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                  Source URL
                </span>
                <input
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  placeholder="https://..."
                  className="h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
                />
              </label>
            </div>

            <div className="rounded-lg border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#111827]">Upload CSV</p>
                  <p className="text-sm leading-6 text-[#4b5563]">
                    {template?.description}
                  </p>
                  <p className="text-xs leading-5 text-[#6b7280]">{template?.sourceCopy}</p>
                </div>
                <a
                  href={`/api/admin/market-data/import/templates/${selectedType}`}
                  className="inline-flex h-9 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] font-medium text-[#111827]"
                >
                  Download sample CSV
                </a>
              </div>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="mt-3 block w-full text-sm text-[#374151]"
              />
              {fileName ? (
                <p className="mt-2 text-xs leading-5 text-[#6b7280]">Selected file: {fileName}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={previewFile}
                disabled={isPending}
                className="inline-flex h-10 items-center rounded-lg border border-[#1B3A6B] bg-[#1B3A6B] px-4 text-sm font-medium text-white disabled:opacity-70"
              >
                {isPending ? "Checking..." : "Check file"}
              </button>
              <button
                type="button"
                onClick={runImport}
                disabled={isPending || !csvText.trim()}
                className="inline-flex h-10 items-center rounded-lg border border-[#d1d5db] bg-white px-4 text-sm font-medium text-[#111827] disabled:opacity-70"
              >
                {executionMode === "validate_only"
                  ? isPending
                    ? "Saving validation..."
                    : "Save validation batch"
                  : isPending
                    ? "Importing..."
                    : "Import valid rows"}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] p-4">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                Column guide
              </p>
              <div className="mt-3 grid gap-2">
                {template?.columns.map((column) => (
                  <div
                    key={column.key}
                    className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[#111827]">{column.label}</p>
                      {column.required ? (
                        <AdminBadge label="Required" tone="warning" />
                      ) : (
                        <AdminBadge label="Optional" tone="default" />
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[#6b7280]">{column.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-[#e5e7eb] bg-white p-4">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                Import modes
              </p>
              <div className="mt-3 grid gap-2">
                {executionModeOptions.map((option) => (
                  <div key={option.value} className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
                    <p className="text-sm font-semibold text-[#111827]">{option.label}</p>
                    <p className="mt-1 text-xs leading-5 text-[#6b7280]">{option.note}</p>
                  </div>
                ))}
                {duplicateModeOptions.map((option) => (
                  <div key={option.value} className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
                    <p className="text-sm font-semibold text-[#111827]">{option.label}</p>
                    <p className="mt-1 text-xs leading-5 text-[#6b7280]">{option.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AdminSectionCard>

      {preview ? (
        <AdminSectionCard
          title="Preview"
          description="Review mapped rows, errors, warnings, and duplicates before importing."
        >
          <div className="grid gap-3 lg:grid-cols-5">
            {[
              { label: "Total rows", value: String(preview.totalRows) },
              { label: "Valid", value: String(preview.validRows) },
              { label: "Warnings", value: String(preview.warningRows) },
              { label: "Failed", value: String(preview.failedRows) },
              { label: "Duplicates", value: String(preview.duplicateRows) },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                  {item.label}
                </p>
                <p className="mt-1 text-[1.15rem] font-semibold text-[#111827]">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { value: "all", label: "All rows" },
              { value: "valid", label: "Valid" },
              { value: "warning", label: "Warnings" },
              { value: "failed", label: "Failed" },
            ].map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() =>
                  setSelectedPreviewFilter(filter.value as "all" | "failed" | "warning" | "valid")
                }
                className={`inline-flex h-8 items-center rounded-full border px-3 text-[13px] font-medium ${
                  selectedPreviewFilter === filter.value
                    ? "border-[#1B3A6B] bg-[#1B3A6B] text-white"
                    : "border-[#d1d5db] bg-white text-[#111827]"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {filteredPreviewRows.map((row) => (
              <div key={row.id} className="rounded-lg border border-[#e5e7eb] bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[#111827]">
                        Row {row.rowNumber - 1} · {row.mappedLabel ?? row.identifier ?? "Unmapped row"}
                      </p>
                      <AdminBadge label={row.status} tone={getRowTone(row)} />
                      {row.duplicateState !== "none" ? (
                        <AdminBadge label={row.duplicateState.replace(/_/g, " ")} tone="warning" />
                      ) : null}
                    </div>
                    <p className="text-xs leading-5 text-[#6b7280]">
                      {row.resultNote}
                      {row.mappedSlug ? ` Mapped slug: ${row.mappedSlug}.` : ""}
                    </p>
                  </div>
                  <p className="text-xs leading-5 text-[#6b7280]">{row.importDate ?? "Invalid date"}</p>
                </div>

                {row.errors.length ? (
                  <div className="mt-3 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-xs leading-5 text-[#b91c1c]">
                    {row.errors.join(" ")}
                  </div>
                ) : null}
                {row.warnings.length ? (
                  <div className="mt-3 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-xs leading-5 text-[#b45309]">
                    {row.warnings.join(" ")}
                  </div>
                ) : null}

                <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  {Object.entries(row.payload).map(([key, value]) => (
                    <div key={`${row.id}-${key}`} className="rounded-lg border border-[#f1f5f9] bg-[#f8fafc] px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                        {key}
                      </p>
                      <p className="mt-1 break-all text-sm text-[#111827]">{value || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </AdminSectionCard>
      ) : null}

      <AdminSectionCard
        title="Recent market-data import batches"
        description="Latest durable validation and import runs for historical candles and NAV files."
      >
        <div className="space-y-3">
          {batchDetails.map((detail) => (
            <div key={detail.batch.id} className="rounded-lg border border-[#e5e7eb] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[#111827]">
                      {formatBatchLabel(detail.batch)}
                    </p>
                    <AdminBadge label={detail.batch.status.replace(/_/g, " ")} tone={detail.batch.status === "failed" ? "danger" : detail.batch.status === "completed_with_errors" ? "warning" : "success"} />
                  </div>
                  <p className="text-xs leading-5 text-[#6b7280]">
                    {detail.batch.summary}
                  </p>
                </div>
                <div className="text-right text-xs leading-5 text-[#6b7280]">
                  <p>{detail.batch.importedAt}</p>
                  <p>{detail.batch.actorEmail}</p>
                </div>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-4">
                {[
                  { label: "Rows", value: String(detail.batch.rowCount) },
                  { label: "Imported", value: String(detail.batch.successCount) },
                  { label: "Skipped", value: String(detail.batch.skippedCount) },
                  { label: "Failed", value: String(detail.batch.failureCount) },
                ].map((item) => (
                  <div key={`${detail.batch.id}-${item.label}`} className="rounded-lg border border-[#f1f5f9] bg-[#f8fafc] px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#111827]">{item.value}</p>
                  </div>
                ))}
              </div>

              {detail.rows.length ? (
                <details className="mt-3 rounded-lg border border-[#e5e7eb] bg-[#f8fafc]">
                  <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-[#111827]">
                    Show row results
                  </summary>
                  <div className="border-t border-[#e5e7eb] px-3 py-3">
                    <div className="space-y-2">
                      {detail.rows.slice(0, 10).map((row) => (
                        <div key={row.id} className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium text-[#111827]">
                              Row {row.rowNumber - 1} · {row.mappedLabel ?? row.identifier ?? "Unknown row"}
                            </p>
                            <AdminBadge label={row.status} tone={getRowTone(row)} />
                          </div>
                          <p className="mt-1 text-xs leading-5 text-[#6b7280]">{row.resultNote}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              ) : null}
            </div>
          ))}
        </div>
      </AdminSectionCard>
    </div>
  );
}
