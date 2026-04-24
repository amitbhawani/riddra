"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";

import type {
  PortfolioImportFieldKey,
  PortfolioImportPreview,
  PortfolioImportTemplate,
} from "@/lib/portfolio-imports";

export function UserPortfolioImportClient({
  template,
}: {
  template: PortfolioImportTemplate;
}) {
  const router = useRouter();
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [fieldMapping, setFieldMapping] = useState<Record<string, PortfolioImportFieldKey>>({});
  const [preview, setPreview] = useState<PortfolioImportPreview | null>(null);
  const [banner, setBanner] = useState<{
    tone: "success" | "danger";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      return;
    }

    setBanner(null);
    setPreview(null);
    setFieldMapping({});
    setFileName(file.name);
    setCsvText(await file.text());
  }

  function runPreview(nextMapping = fieldMapping) {
    if (!csvText.trim()) {
      setBanner({
        tone: "danger",
        text: "Choose a CSV file before checking it.",
      });
      return;
    }

    startTransition(async () => {
      setBanner(null);
      const response = await fetch("/api/account/portfolio-import/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          csvText,
          fileName,
          fieldMapping: nextMapping,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | ({ error?: string } & PortfolioImportPreview)
        | null;

      if (!response.ok || !data) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "We could not check that file right now.",
        });
        return;
      }

      setPreview(data);
      setFieldMapping(data.fieldMapping);
      setBanner({
        tone: "success",
        text:
          data.unmappedHeaders.length > 0
            ? "We checked the file and found a few column names that still need mapping."
            : "File checked. Review the holdings below before importing.",
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
      const response = await fetch("/api/account/portfolio-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          csvText,
          fileName,
          fieldMapping,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            importedCount?: number;
          }
        | null;

      if (!response.ok) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "We could not import that portfolio file right now.",
        });
        return;
      }

      setBanner({
        tone: "success",
        text: `${data?.importedCount ?? 0} holding${data?.importedCount === 1 ? "" : "s"} imported. Your portfolio has been updated.`,
      });
      setPreview(null);
      setCsvText("");
      setFileName("");
      setFieldMapping({});
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {banner ? (
        <div
          className={`rounded-[16px] border px-4 py-3 text-sm ${
            banner.tone === "success"
              ? "border-[rgba(34,197,94,0.18)] bg-[rgba(240,253,244,0.92)] text-[#166534]"
              : "border-[rgba(248,113,113,0.18)] bg-[rgba(254,242,242,0.92)] text-[#b91c1c]"
          }`}
        >
          {banner.text}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="space-y-4 rounded-[22px] border border-[rgba(221,215,207,0.96)] bg-white p-5">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#1B3A6B]">Sample template</p>
            <p className="text-sm leading-7 text-[rgba(75,85,99,0.84)]">
              Start with the sample CSV if you want the quickest setup.
            </p>
          </div>

          <div className="space-y-3">
            {template.help.map((item) => (
              <p key={item} className="text-sm leading-7 text-[rgba(75,85,99,0.84)]">
                • {item}
              </p>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/api/account/portfolio-import-template"
              className="inline-flex h-10 items-center rounded-[12px] border border-[rgba(221,215,207,0.96)] bg-white px-4 text-sm font-medium text-[#1B3A6B]"
            >
              Download sample CSV
            </a>
            <Link
              href="/portfolio"
              className="inline-flex h-10 items-center rounded-[12px] border border-[rgba(221,215,207,0.96)] bg-[rgba(27,58,107,0.03)] px-4 text-sm font-medium text-[#1B3A6B]"
            >
              Back to portfolio
            </Link>
          </div>
        </div>

        <div className="space-y-4 rounded-[22px] border border-[rgba(221,215,207,0.96)] bg-white p-5">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#1B3A6B]">Upload CSV</p>
            <p className="text-sm leading-7 text-[rgba(75,85,99,0.84)]">
              Upload a CSV file, check the rows, then import only the valid holdings.
            </p>
          </div>

          <div className="space-y-3 rounded-[18px] border border-dashed border-[rgba(27,58,107,0.22)] bg-[rgba(27,58,107,0.03)] p-4">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[rgba(107,114,128,0.88)]">
                Portfolio file
              </p>
              <p className="text-sm leading-6 text-[rgba(75,85,99,0.84)]">
                Choose a CSV file from your device. We will not import anything until you check the rows first.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="sr-only"
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-10 items-center justify-center rounded-[12px] border border-[rgba(27,58,107,0.14)] bg-white px-4 text-sm font-medium text-[#1B3A6B]"
              >
                {fileName ? "Replace CSV file" : "Choose CSV file"}
              </button>
              <div className="min-w-0 flex-1 rounded-[12px] border border-[rgba(221,215,207,0.96)] bg-white px-3 py-2">
                <p className="truncate text-sm font-medium text-[#1B3A6B]">
                  {fileName || "No file chosen yet"}
                </p>
                <p className="mt-1 text-xs text-[rgba(107,114,128,0.88)]">
                  Accepted format: `.csv`
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[16px] border border-[rgba(221,215,207,0.96)] bg-[rgba(27,58,107,0.03)] p-4">
            <p className="text-sm font-semibold text-[#1B3A6B]">What this file should contain</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[rgba(75,85,99,0.84)]">
              {template.help.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => runPreview()}
              disabled={isPending}
              className="inline-flex min-w-[150px] h-10 items-center justify-center rounded-[12px] border border-[rgba(27,58,107,0.14)] bg-[#1B3A6B] px-4 text-sm font-medium !text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Checking..." : "Check file"}
            </button>
            <button
              type="button"
              onClick={runImport}
              disabled={isPending || !preview?.canImport}
              className="inline-flex min-w-[150px] h-10 items-center justify-center rounded-[12px] border border-[rgba(221,215,207,0.96)] bg-white px-4 text-sm font-medium text-[#1B3A6B] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Importing..." : "Import holdings"}
            </button>
          </div>
        </div>
      </div>

      {preview?.unmappedHeaders.length ? (
        <div className="rounded-[22px] border border-[rgba(221,215,207,0.96)] bg-white p-5">
          <p className="text-sm font-semibold text-[#1B3A6B]">Finish the column mapping</p>
          <p className="mt-2 text-sm leading-7 text-[rgba(75,85,99,0.84)]">
            We found column names that did not match automatically. Pick the right field for each one, then check the file again.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {preview.unmappedHeaders.map((header) => (
              <label key={header} className="space-y-2">
                <span className="text-sm font-semibold text-[#1B3A6B]">{header}</span>
                <select
                  value={fieldMapping[header] ?? ""}
                  onChange={(event) =>
                    setFieldMapping((current) => ({
                      ...current,
                      [header]: event.target.value as PortfolioImportFieldKey,
                    }))
                  }
                  className="h-11 w-full rounded-[12px] border border-[rgba(221,215,207,0.96)] bg-white px-4 text-sm text-[#111827]"
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
              className="inline-flex h-10 items-center rounded-[12px] border border-[rgba(27,58,107,0.14)] bg-[#1B3A6B] px-4 text-sm font-medium text-white"
            >
              {isPending ? "Checking..." : "Re-check file"}
            </button>
          </div>
        </div>
      ) : null}

      {preview ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="rounded-[22px] border border-[rgba(221,215,207,0.96)] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#1B3A6B]">Preview rows</p>
                <p className="mt-1 text-sm leading-7 text-[rgba(75,85,99,0.84)]">
                  Review what will happen before you import the file.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-[rgba(75,85,99,0.84)]">
                <span>{preview.validRows} valid</span>
                <span>{preview.warningRows} warning</span>
                <span>{preview.failedRows} failed</span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {preview.rows.slice(0, 12).map((row) => (
                <div key={`${row.rowNumber}-${row.stockInput}`} className="rounded-[16px] border border-[rgba(221,215,207,0.96)] bg-[rgba(27,58,107,0.03)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#1B3A6B]">
                        {(row.matchedName ?? row.stockInput) || `Row ${row.rowNumber}`}
                      </p>
                      <p className="mt-1 text-xs text-[rgba(107,114,128,0.88)]">
                        {row.matchedSlug ?? "No stock match yet"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        row.status === "failed"
                          ? "bg-[rgba(254,242,242,0.92)] text-[#b91c1c]"
                          : row.status === "warning"
                            ? "bg-[rgba(255,251,235,0.92)] text-[#b45309]"
                            : "bg-[rgba(240,253,244,0.92)] text-[#166534]"
                      }`}
                    >
                      {row.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[rgba(75,85,99,0.84)]">{row.note}</p>
                  {[...row.errors, ...row.warnings].map((item) => (
                    <p key={item} className="mt-2 text-sm leading-6 text-[rgba(75,85,99,0.84)]">
                      {item}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[22px] border border-[rgba(221,215,207,0.96)] bg-white p-5">
            <p className="text-sm font-semibold text-[#1B3A6B]">Template fields</p>
            <div className="mt-4 space-y-3">
              {template.fields.map((field) => (
                <div key={field.key} className="rounded-[16px] border border-[rgba(221,215,207,0.96)] bg-[rgba(27,58,107,0.03)] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[#1B3A6B]">{field.label}</p>
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-[rgba(75,85,99,0.84)]">
                      {field.required ? "Required" : "Optional"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[rgba(75,85,99,0.84)]">{field.description}</p>
                  <p className="mt-1 text-xs text-[rgba(107,114,128,0.88)]">Example: {field.example}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
