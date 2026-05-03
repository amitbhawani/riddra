"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";

import type {
  AdminImportBatch,
  AdminImportBatchRow,
  AdminImportFieldKey,
  AdminImportMode,
  AdminImportPreview,
  AdminImportTemplate,
  SupportedAdminImportFamily,
} from "@/lib/admin-content-imports";
import { formatAdminDateTime, formatAdminSavedState } from "@/lib/admin-time";
import {
  AdminActionLink,
  AdminBadge,
  AdminCard,
  AdminEmptyState,
  AdminSectionCard,
  AdminSimpleTable,
} from "@/components/admin/admin-primitives";

const importModeOptions: Array<{ value: AdminImportMode; label: string; note: string }> = [
  {
    value: "create_new_only",
    label: "Create new only",
    note: "Use this when the file contains only brand-new records.",
  },
  {
    value: "update_existing_only",
    label: "Update existing only",
    note: "Use this when every row should match a record already known in the system.",
  },
  {
    value: "create_or_update",
    label: "Create or update",
    note: "Use this when the file may contain a mix of new and existing rows.",
  },
];

function getStatusTone(status: string) {
  if (["completed", "created", "updated"].includes(status)) return "success" as const;
  if (["warning", "queued_for_approval", "queued_for_approval"].includes(status)) return "warning" as const;
  if (["failed", "completed_with_errors"].includes(status)) return "danger" as const;
  return "info" as const;
}

function getRowLabel(row: AdminImportBatchRow) {
  return row.title || row.slug || row.identifier || `Row ${row.rowNumber}`;
}

export function AdminContentImportClient({
  family,
  templates,
  initialBatchDetails,
  isAdmin,
}: {
  family?: SupportedAdminImportFamily | null;
  templates: AdminImportTemplate[];
  initialBatchDetails: Array<{ batch: AdminImportBatch; rows: AdminImportBatchRow[] }>;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [selectedFamily, setSelectedFamily] = useState<SupportedAdminImportFamily>(
    family ?? templates[0]?.family ?? "stocks",
  );
  const [importMode, setImportMode] = useState<AdminImportMode>("create_or_update");
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [fieldMapping, setFieldMapping] = useState<Record<string, AdminImportFieldKey>>({});
  const [preview, setPreview] = useState<AdminImportPreview | null>(null);
  const [selectedPreviewRowId, setSelectedPreviewRowId] = useState<string | null>(null);
  const [batchDetails, setBatchDetails] = useState(initialBatchDetails);
  const [banner, setBanner] = useState<{
    tone: "success" | "danger";
    text: string;
    detail?: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.family === selectedFamily) ?? templates[0],
    [selectedFamily, templates],
  );
  const selectedFieldMap = useMemo(
    () => new Map((selectedTemplate?.fields ?? []).map((field) => [field.key, field])),
    [selectedTemplate],
  );
  const requiredFields = useMemo(
    () => (selectedTemplate?.fields ?? []).filter((field) => field.required),
    [selectedTemplate],
  );
  const optionalFields = useMemo(
    () => (selectedTemplate?.fields ?? []).filter((field) => !field.required),
    [selectedTemplate],
  );

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      return;
    }

    setBanner(null);
    setPreview(null);
    setSelectedPreviewRowId(null);
    setFieldMapping({});
    setFileName(file.name);
    setCsvText(await file.text());
  }

  function runPreview(nextMapping = fieldMapping, nextRows?: AdminImportBatchRow[]) {
    if (!csvText.trim() && (!nextRows || nextRows.length === 0)) {
      setBanner({
        tone: "danger",
        text: "Choose a CSV file before checking it.",
      });
      return;
    }

    startTransition(async () => {
      setBanner(null);
      const response = await fetch("/api/admin/operator-console/import-batches/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          family: selectedFamily,
          csvText,
          fileName,
          importMode,
          fieldMapping: nextMapping,
          rows: nextRows,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | ({ error?: string } & AdminImportPreview)
        | null;

      if (!response.ok || !data) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "We could not check that file right now.",
        });
        return;
      }

      setPreview(data);
      setSelectedPreviewRowId((current) =>
        data.rows.some((row) => row.id === current) ? current : data.rows[0]?.id ?? null,
      );
      setFieldMapping(data.fieldMapping ?? nextMapping);
      setBanner({
        tone: "success",
        text:
          data.unmappedHeaders.length > 0
            ? "We checked the file and found a few column names that still need mapping."
            : "File checked. Review the rows below before importing.",
      });
    });
  }

  function runImport() {
    if (!preview?.canImport) {
      setBanner({
        tone: "danger",
        text: "Fix the remaining column mapping or row issues before importing.",
      });
      return;
    }

    startTransition(async () => {
      setBanner(null);
      const response = await fetch("/api/admin/operator-console/import-batches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          family: selectedFamily,
          csvText,
          fileName,
          importMode,
          fieldMapping,
          rows: preview.rows,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            batch?: AdminImportBatch;
            rows?: AdminImportBatchRow[];
            savedAt?: string;
          }
        | null;

      if (!response.ok || !data?.batch || !data.rows) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "We could not import that file right now.",
        });
        return;
      }

      setBatchDetails((current) => [{ batch: data.batch!, rows: data.rows! }, ...current].slice(0, 8));
      setPreview(null);
      setCsvText("");
      setFileName("");
      setFieldMapping({});
      setBanner({
        tone: "success",
        text: data.batch.status === "queued_for_approval"
          ? "Import submitted for approval."
          : "Import finished successfully.",
        detail: formatAdminSavedState(data.savedAt ?? data.batch.updatedAt),
      });
      router.refresh();
    });
  }

  const recentFailedRows = preview?.rows.filter((row) => row.status === "failed").slice(0, 5) ?? [];
  const recentWarningRows = preview?.rows.filter((row) => row.status === "warning").slice(0, 5) ?? [];
  const selectedPreviewRow =
    preview?.rows.find((row) => row.id === selectedPreviewRowId) ?? preview?.rows[0] ?? null;
  const selectedPreviewGroups = useMemo(() => {
    if (!selectedTemplate || !selectedPreviewRow) {
      return [];
    }

    return selectedTemplate.groups
      .map((group) => ({
        ...group,
        fields: group.fieldKeys
          .map((fieldKey) => selectedFieldMap.get(fieldKey))
          .filter((field): field is NonNullable<typeof field> => Boolean(field))
          .filter((field) => field.required || Boolean(selectedPreviewRow.payload[field.key])),
      }))
      .filter((group) => group.fields.length > 0);
  }, [selectedFieldMap, selectedPreviewRow, selectedTemplate]);

  function updatePreviewRowField(rowId: string, fieldKey: AdminImportFieldKey, value: string) {
    setPreview((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        rows: current.rows.map((row) => {
          if (row.id !== rowId) {
            return row;
          }

          const nextPayload = {
            ...row.payload,
            [fieldKey]: value,
          };

          return {
            ...row,
            payload: nextPayload,
            title:
              fieldKey === "companyName" ||
              fieldKey === "fundName" ||
              fieldKey === "name" ||
              fieldKey === "title"
                ? value || row.title
                : row.title,
            slug: fieldKey === "slug" ? value || null : row.slug,
            updatedAt: new Date().toISOString(),
          };
        }),
      };
    });
  }

  return (
    <div className="space-y-4">
      {banner ? (
        <div className="rounded-lg border border-[#d1d5db] bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <AdminBadge
              label={banner.tone === "success" ? "Saved" : "Needs attention"}
              tone={banner.tone === "success" ? "success" : "danger"}
            />
            <p className="text-sm leading-6 text-[#4b5563]">{banner.text}</p>
          </div>
          {banner.detail ? (
            <p className="mt-1 text-[12px] leading-5 text-[#6b7280]">{banner.detail}</p>
          ) : null}
        </div>
      ) : null}

      <AdminCard tone="primary" className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="space-y-1">
            <p className="text-[14px] font-semibold text-[#111827]">Import from file</p>
            <p className="max-w-3xl text-sm leading-6 text-[#4b5563]">
              Upload a CSV, preview how the rows will match, then create or update records without filling the long editor one entry at a time.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/admin/operator-console/import-templates/${selectedFamily}`}
              className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] font-medium text-[#111827]"
            >
              Download sample CSV
            </a>
            {family ? null : (
              <AdminActionLink href={`/admin/content/${selectedFamily}`} label={`Open ${selectedTemplate?.label ?? "family"} list`} />
            )}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#6b7280]">Family</span>
                {family ? (
                  <div className="rounded-lg border border-[#d1d5db] bg-[#f8fafc] px-3 py-2 text-sm text-[#111827]">
                    {selectedTemplate?.label}
                  </div>
                ) : (
                  <select
                    value={selectedFamily}
                    onChange={(event) => {
                      setSelectedFamily(event.target.value as SupportedAdminImportFamily);
                      setPreview(null);
                      setFieldMapping({});
                      setBanner(null);
                    }}
                    className="h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
                  >
                    {templates.map((template) => (
                      <option key={template.family} value={template.family}>
                        {template.label}
                      </option>
                    ))}
                  </select>
                )}
              </label>

              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#6b7280]">Import mode</span>
                <select
                  value={importMode}
                  onChange={(event) => setImportMode(event.target.value as AdminImportMode)}
                  className="h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
                >
                  {importModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-lg border border-[#d1d5db] bg-[#f8fafc] p-4">
              <p className="text-sm font-semibold text-[#111827]">Sample template</p>
              <p className="mt-1 text-sm leading-6 text-[#4b5563]">{selectedTemplate?.description}</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[#4b5563]">
                {selectedTemplate?.importHelp.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
              <p className="mt-3 text-sm leading-6 text-[#4b5563]">{selectedTemplate?.matchingHelp}</p>
              <details className="mt-4 rounded-lg border border-[#e5e7eb] bg-white">
                <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
                  What happens after import
                </summary>
                <div className="border-t border-[#e5e7eb] px-3 py-3">
                  <ul className="space-y-2 text-sm leading-6 text-[#4b5563]">
                    {selectedTemplate?.afterImportHelp.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </details>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-lg border border-[#e5e7eb] bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
                    Required columns
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {requiredFields.map((field) => (
                      <span
                        key={field.key}
                        className="rounded-full border border-[#d1d5db] bg-[#f8fafc] px-2 py-1 text-[12px] text-[#111827]"
                      >
                        {field.key}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-[#e5e7eb] bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
                    Optional columns
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {optionalFields.slice(0, 16).map((field) => (
                      <span
                        key={field.key}
                        className="rounded-full border border-[#d1d5db] bg-[#f8fafc] px-2 py-1 text-[12px] text-[#111827]"
                      >
                        {field.key}
                      </span>
                    ))}
                  </div>
                  {optionalFields.length > 16 ? (
                    <p className="mt-2 text-xs leading-5 text-[#6b7280]">
                      The full optional column list is grouped below in the template field guide.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[#d1d5db] bg-white p-4">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[#111827]">Upload CSV</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-[#4b5563]"
                />
              </label>
              <p className="mt-2 text-xs leading-5 text-[#6b7280]">
                Use a CSV file. If your column names already match the sample template, we will map them automatically. Check the file first, then import only when the preview looks correct.
              </p>
              {fileName ? (
                <p className="mt-2 text-sm font-medium text-[#111827]">Selected file: {fileName}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => runPreview()}
                  disabled={isPending}
                  className="inline-flex h-9 items-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-4 text-sm font-medium text-white"
                >
                  {isPending ? "Checking..." : "Check file"}
                </button>
                <button
                  type="button"
                  onClick={runImport}
                  disabled={isPending || !preview?.canImport}
                  className="inline-flex h-9 items-center rounded-lg border border-[#d1d5db] bg-white px-4 text-sm font-medium text-[#111827] disabled:opacity-50"
                >
                  {isPending ? "Importing..." : isAdmin ? "Import rows" : "Submit for approval"}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {preview && selectedPreviewRow ? (
              <AdminSectionCard
                title="Imported row review"
                description="Review and edit the uploaded values here before you import or submit them for approval."
              >
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                    <label className="space-y-2">
                      <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                        Preview row
                      </span>
                      <select
                        value={selectedPreviewRow.id}
                        onChange={(event) => setSelectedPreviewRowId(event.target.value)}
                        className="h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
                      >
                        {preview.rows.map((row) => (
                          <option key={row.id} value={row.id}>
                            Row {row.rowNumber} · {getRowLabel(row)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => runPreview(fieldMapping, preview.rows)}
                      disabled={isPending}
                      className="inline-flex h-10 items-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-4 text-sm font-medium text-white"
                    >
                      {isPending ? "Refreshing..." : "Re-check edited preview"}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <AdminBadge
                      label={selectedPreviewRow.status.replaceAll("_", " ")}
                      tone={getStatusTone(selectedPreviewRow.status)}
                    />
                    <p className="text-sm leading-6 text-[#4b5563]">{selectedPreviewRow.resultNote}</p>
                  </div>

                  {(selectedPreviewRow.errors.length || selectedPreviewRow.warnings.length) ? (
                    <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] p-3">
                      {[...selectedPreviewRow.errors, ...selectedPreviewRow.warnings].map((item) => (
                        <p key={item} className="text-sm leading-6 text-[#4b5563]">
                          {item}
                        </p>
                      ))}
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    {selectedPreviewGroups.map((group) => (
                      <div key={group.key} className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] p-3">
                        <p className="font-semibold text-[#111827]">{group.label}</p>
                        <p className="mt-1 text-sm leading-6 text-[#4b5563]">{group.description}</p>
                        <div className="mt-3 space-y-3">
                          {group.fields.map((field) => {
                            const value = selectedPreviewRow.payload[field.key] ?? "";
                            const useTextarea =
                              Boolean(field.repeatedFieldFormat) || value.length > 120;

                            return (
                              <div key={field.key} className="rounded-lg border border-[#dbe4ee] bg-white p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold text-[#111827]">{field.label}</p>
                                    <code className="rounded bg-[#eef2ff] px-2 py-1 text-[12px] text-[#312e81]">
                                      {field.key}
                                    </code>
                                    <AdminBadge
                                      label={field.required ? "Required" : "Imported"}
                                      tone={field.required ? "warning" : "default"}
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => updatePreviewRowField(selectedPreviewRow.id, field.key, "")}
                                    className="text-xs font-medium text-[#1f4b99]"
                                  >
                                    Clear value
                                  </button>
                                </div>
                                <p className="mt-1 text-sm leading-6 text-[#4b5563]">{field.description}</p>
                                {useTextarea ? (
                                  <textarea
                                    value={value}
                                    onChange={(event) =>
                                      updatePreviewRowField(selectedPreviewRow.id, field.key, event.target.value)
                                    }
                                    rows={field.repeatedFieldFormat ? 4 : 3}
                                    className="mt-3 w-full rounded-lg border border-[#d1d5db] bg-white px-3 py-2 text-sm text-[#111827]"
                                  />
                                ) : (
                                  <input
                                    value={value}
                                    onChange={(event) =>
                                      updatePreviewRowField(selectedPreviewRow.id, field.key, event.target.value)
                                    }
                                    className="mt-3 h-11 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </AdminSectionCard>
            ) : null}

            <AdminSectionCard
              title={preview ? "Template field guide" : "Template fields"}
              description="Use these grouped editor-aligned column names if you want the easiest upload. Required columns are marked clearly."
              collapsible
              defaultOpen={false}
            >
              <div className="space-y-3">
                {selectedTemplate?.groups.map((group) => (
                  <div key={group.key} className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] p-3">
                    <p className="font-semibold text-[#111827]">{group.label}</p>
                    <p className="mt-1 text-sm leading-6 text-[#4b5563]">{group.description}</p>
                    <div className="mt-3 space-y-3">
                      {group.fieldKeys.map((fieldKey) => {
                        const field = selectedFieldMap.get(fieldKey);
                        if (!field) {
                          return null;
                        }

                        return (
                          <div key={field.key} className="rounded-lg border border-[#dbe4ee] bg-white p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-[#111827]">{field.label}</p>
                              <code className="rounded bg-[#eef2ff] px-2 py-1 text-[12px] text-[#312e81]">
                                {field.key}
                              </code>
                              <AdminBadge
                                label={field.required ? "Required" : "Optional"}
                                tone={field.required ? "warning" : "default"}
                              />
                            </div>
                            <p className="mt-1 text-sm leading-6 text-[#4b5563]">{field.description}</p>
                            <p className="mt-1 text-xs leading-5 text-[#6b7280]">Example: {field.example}</p>
                            {field.repeatedFieldFormat ? (
                              <p className="mt-1 text-xs leading-5 text-[#6b7280]">
                                Repeated field format: {field.repeatedFieldFormat}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </AdminSectionCard>
          </div>
        </div>
      </AdminCard>

      {preview?.unmappedHeaders.length ? (
        <AdminSectionCard
          title="Finish the column mapping"
          description="We found column names that did not match the sample template automatically. Pick the correct field for each one, then check the file again."
        >
          <div className="grid gap-3 md:grid-cols-2">
            {preview.unmappedHeaders.map((header) => (
              <label key={header} className="space-y-2">
                <span className="text-sm font-semibold text-[#111827]">{header}</span>
                <select
                  value={fieldMapping[header] ?? ""}
                  onChange={(event) =>
                    setFieldMapping((current) => ({
                      ...current,
                      [header]: event.target.value as AdminImportFieldKey,
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
                >
                  <option value="">Choose a field</option>
                  {preview.availableFields.map((field) => (
                    <option key={field.key} value={field.key}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => runPreview(fieldMapping)}
              disabled={isPending}
              className="inline-flex h-9 items-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-4 text-sm font-medium text-white"
            >
              {isPending ? "Checking..." : "Re-check file"}
            </button>
          </div>
        </AdminSectionCard>
      ) : null}

      {preview ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <AdminSectionCard
            title="Preview rows"
            description="Review what will happen before you import the file."
          >
            <AdminSimpleTable
              columns={["Row", "Match", "Action", "Status", "Notes"]}
              rows={preview.rows.slice(0, 12).map((row) => [
                <div key={`${row.id}-row`} className="space-y-1">
                  <p className="font-semibold text-[#111827]">{getRowLabel(row)}</p>
                  <p className="text-xs leading-5 text-[#6b7280]">
                    {row.slug || row.identifier || `Row ${row.rowNumber}`}
                  </p>
                </div>,
                row.matchedSlug ? row.matchedSlug : "New record",
                row.operation.replaceAll("_", " "),
                <AdminBadge
                  key={`${row.id}-status`}
                  label={row.status.replaceAll("_", " ")}
                  tone={getStatusTone(row.status)}
                />,
                <div key={`${row.id}-notes`} className="space-y-1">
                  <p className="text-sm leading-5 text-[#4b5563]">{row.resultNote}</p>
                  {row.errors.map((item) => (
                    <p key={item} className="text-xs leading-5 text-[#b91c1c]">
                      {item}
                    </p>
                  ))}
                  {row.warnings.map((item) => (
                    <p key={item} className="text-xs leading-5 text-[#b45309]">
                      {item}
                    </p>
                  ))}
                </div>,
              ])}
            />
          </AdminSectionCard>

          <div className="space-y-4">
            <AdminSectionCard
              title="Validation report"
              description="Only rows without blocking issues can continue to the import step."
            >
              <div className="grid gap-3 md:grid-cols-3">
                <AdminCard tone="compact" className="space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">Valid rows</p>
                  <p className="text-2xl font-semibold text-[#111827]">{preview.validRows}</p>
                </AdminCard>
                <AdminCard tone="compact" className="space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">Warning rows</p>
                  <p className="text-2xl font-semibold text-[#111827]">{preview.warningRows}</p>
                </AdminCard>
                <AdminCard tone="compact" className="space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">Failed rows</p>
                  <p className="text-2xl font-semibold text-[#111827]">{preview.failedRows}</p>
                </AdminCard>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#4b5563]">
                {isAdmin
                  ? "When you import as an admin, valid rows create or update safe draft records in the normal editor. Nothing from the file goes live by itself."
                  : "When you import as an editor, valid rows save into the normal editor as draft records and are then sent to approval instead of changing live content directly."}
              </p>
            </AdminSectionCard>

            <AdminSectionCard
              title="How repeated fields work"
              description="Use these simple CSV conventions for multi-row editor fields."
              collapsible
              defaultOpen={false}
            >
              {selectedTemplate?.repeatedFieldHelp.length ? (
                <div className="space-y-3">
                  {selectedTemplate.repeatedFieldHelp.map((item) => (
                    <div key={item.key} className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] p-3">
                      <p className="font-semibold text-[#111827]">{item.label}</p>
                      <p className="mt-1 text-sm leading-6 text-[#4b5563]">{item.howToFormat}</p>
                      <p className="mt-1 text-xs leading-5 text-[#6b7280]">Example: {item.example}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <AdminEmptyState
                  title="No repeated fields in this template"
                  description="This family uses single-value columns only."
                />
              )}
            </AdminSectionCard>

            <AdminSectionCard
              title="What happens after import"
              description="The import step creates a draft workflow, not a direct live publish."
            >
              <ul className="space-y-2 text-sm leading-6 text-[#4b5563]">
                {selectedTemplate?.afterImportHelp.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </AdminSectionCard>

            <AdminSectionCard
              title="Rows that still need attention"
              description="The most common row issues are shown here first so they are easy to fix."
              collapsible
              defaultOpen={false}
            >
              {recentFailedRows.length || recentWarningRows.length ? (
                <div className="space-y-3">
                  {[...recentFailedRows, ...recentWarningRows].map((row) => (
                    <div key={row.id} className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-[#111827]">{getRowLabel(row)}</p>
                        <AdminBadge
                          label={row.status.replaceAll("_", " ")}
                          tone={getStatusTone(row.status)}
                        />
                      </div>
                      {[...row.errors, ...row.warnings].map((item) => (
                        <p key={item} className="mt-2 text-sm leading-6 text-[#4b5563]">
                          {item}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <AdminEmptyState
                  title="No row blockers"
                  description="This file is ready to import as soon as you confirm it."
                />
              )}
            </AdminSectionCard>
          </div>
        </div>
      ) : null}

      <AdminSectionCard
        title="Recent import batches"
        description="Recent file imports stay visible here with results, counts, and row issues."
        collapsible
        defaultOpen={false}
      >
        {batchDetails.length ? (
          <div className="space-y-3">
            {batchDetails.map(({ batch, rows }) => (
              <div key={batch.id} className="rounded-lg border border-[#d1d5db] bg-[#f8fafc] p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[#111827]">{batch.fileName}</p>
                      <AdminBadge label={batch.status.replaceAll("_", " ")} tone={getStatusTone(batch.status)} />
                    </div>
                    <p className="text-sm leading-6 text-[#4b5563]">
                      {batch.summary}
                    </p>
                    <p className="text-xs leading-5 text-[#6b7280]">
                      {batch.actorEmail} • {formatAdminDateTime(batch.updatedAt)} • {batch.importMode.replaceAll("_", " ")}
                    </p>
                  </div>
                  <div className="grid gap-1 text-right text-xs text-[#4b5563]">
                    <span>Created: {batch.createdCount}</span>
                    <span>Updated: {batch.updatedCount}</span>
                    <span>Queued: {batch.queuedCount}</span>
                    <span>Failed: {batch.failedCount}</span>
                  </div>
                </div>

                {rows.some((row) => row.errors.length || row.warnings.length) ? (
                  <details className="mt-4 rounded-lg border border-[#e5e7eb] bg-white">
                    <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-[#111827]">
                      Row issues in this batch
                    </summary>
                    <div className="space-y-2 border-t border-[#e5e7eb] px-3 py-3">
                      {rows
                        .filter((row) => row.errors.length || row.warnings.length)
                        .slice(0, 4)
                        .map((row) => (
                          <div key={row.id} className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-medium text-[#111827]">{getRowLabel(row)}</p>
                              <AdminBadge
                                label={row.status.replaceAll("_", " ")}
                                tone={getStatusTone(row.status)}
                              />
                            </div>
                            {[...row.errors, ...row.warnings].map((item) => (
                              <p key={item} className="mt-2 text-sm leading-6 text-[#4b5563]">
                                {item}
                              </p>
                            ))}
                          </div>
                        ))}
                    </div>
                  </details>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <AdminEmptyState
            title="No import batches yet"
            description="Import a CSV file once and the batch history will stay visible here."
          />
        )}
      </AdminSectionCard>
    </div>
  );
}
