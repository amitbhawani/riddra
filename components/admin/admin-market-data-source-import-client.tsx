"use client";

import { ChangeEvent, useMemo, useState } from "react";

import {
  AdminBadge,
  AdminCard,
  AdminSectionCard,
} from "@/components/admin/admin-primitives";
import type { MarketDataSourceBulkPreviewRow } from "@/lib/market-data-source-wizard";

type BannerState = {
  tone: "success" | "danger";
  text: string;
  detail?: string;
};

type BulkImportResponse = {
  rows: MarketDataSourceBulkPreviewRow[];
  totalRows: number;
  readyRows?: number;
  warningRows: number;
  failedRows: number;
  savedRows?: number;
  skippedDuplicates?: number;
  error?: string;
};

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function statusTone(status: MarketDataSourceBulkPreviewRow["status"]) {
  if (status === "ready") {
    return "success" as const;
  }
  if (status === "warning") {
    return "warning" as const;
  }
  return "danger" as const;
}

const sampleCsv = [
  "source_type,source_url,symbol,asset_slug,timeframe",
  "google_sheet,https://docs.google.com/spreadsheets/d/1B3w34RAM7v0q4H-WIY6bInptVE_RAReQ53k2ZPyQV2Y/edit?usp=sharing,RELIANCE.NS,reliance-industries,1D",
  "yahoo_finance,https://finance.yahoo.com/quote/TATAMOTORS.NS,TATAMOTORS.NS,tata-motors,1D",
  "yahoo_finance,https://finance.yahoo.com/quote/INFY.NS,INFY.NS,infosys,1D",
  "yahoo_finance,https://finance.yahoo.com/quote/HDFCBANK.NS,HDFCBANK.NS,hdfc-bank,1D",
].join("\n");

export function AdminMarketDataSourceImportClient() {
  const [csvText, setCsvText] = useState(sampleCsv);
  const [results, setResults] = useState<MarketDataSourceBulkPreviewRow[]>([]);
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const summary = useMemo(() => {
    return {
      readyRows: results.filter((row) => row.status === "ready").length,
      warningRows: results.filter((row) => row.status === "warning").length,
      failedRows: results.filter((row) => row.status === "failed").length,
      duplicateRows: results.filter((row) => row.duplicateSourceDetected).length,
    };
  }, [results]);

  function downloadSampleCsv() {
    const blob = new Blob([sampleCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "riddra-market-data-sources-sample.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function runBulk(mode: "preview" | "save") {
    setIsWorking(true);
    setBanner(null);
    try {
      const response = await fetch("/api/admin/market-data/sources/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          csvText,
        }),
      });

      const data = (await response.json().catch(() => null)) as BulkImportResponse | null;
      if (!response.ok || !data?.rows) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "Could not process that source onboarding CSV right now.",
        });
        return;
      }

      setResults(data.rows);
      setBanner({
        tone: "success",
        text:
          mode === "save"
            ? `Saved ${data.savedRows ?? 0} source row${(data.savedRows ?? 0) === 1 ? "" : "s"}.`
            : "Bulk source preview ready.",
        detail:
          mode === "save"
            ? `${data.failedRows} failed row(s), ${data.warningRows} warning row(s), ${data.skippedDuplicates ?? 0} duplicate row(s) skipped.`
            : `${data.totalRows} total row(s), ${data.failedRows} failed row(s).`,
      });
    } finally {
      setIsWorking(false);
    }
  }

  function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    file.text().then((text) => {
      setCsvText(text);
      setResults([]);
      setBanner(null);
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
        title="Bulk source onboarding CSV"
        description="Use this when you want to register many sources quickly. CSV upload today. Google Sheet and provider sync can be connected later."
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex h-10 cursor-pointer items-center rounded-lg border border-[#d1d5db] bg-white px-4 text-sm font-medium text-[#111827] transition hover:bg-[#f9fafb]">
                Upload CSV
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileUpload} />
              </label>
              <button
                type="button"
                onClick={downloadSampleCsv}
                className="inline-flex h-10 items-center rounded-lg border border-[#d1d5db] bg-white px-4 text-sm font-medium text-[#111827] transition hover:bg-[#f9fafb]"
              >
                Download sample CSV
              </button>
              <button
                type="button"
                onClick={() => runBulk("preview")}
                disabled={isWorking}
                className="inline-flex h-10 items-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-4 text-sm font-medium text-white transition hover:bg-[#111c33] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isWorking ? "Working..." : "Validate file"}
              </button>
              <button
                type="button"
                onClick={() => runBulk("save")}
                disabled={isWorking}
                className="inline-flex h-10 items-center rounded-lg border border-[#d1d5db] bg-white px-4 text-sm font-medium text-[#111827] transition hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isWorking ? "Working..." : "Save valid sources"}
              </button>
            </div>

            <textarea
              value={csvText}
              onChange={(event) => setCsvText(event.target.value)}
              className="min-h-[280px] w-full rounded-lg border border-[#d1d5db] bg-white px-3 py-2.5 font-mono text-xs text-[#111827]"
            />
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                CSV format
              </p>
              <p className="mt-2 text-sm leading-6 text-[#4b5563]">
                Required columns: <code>source_type</code>, <code>source_url</code>, <code>symbol</code>,{" "}
                <code>asset_slug</code>, <code>timeframe</code>
              </p>
            </div>
            <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                What gets validated
              </p>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-[#4b5563]">
                <li>Source type detection and URL normalization</li>
                <li>Symbol to slug mapping confidence</li>
                <li>Whether each row is ready, warning, or failed</li>
              </ul>
            </div>
          </div>
        </div>
      </AdminSectionCard>

      {results.length ? (
        <AdminSectionCard
          title="Bulk preview results"
          description="Save valid rows directly or use the warnings to clean up the onboarding CSV first."
        >
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                Ready rows
              </p>
              <p className="mt-1 text-sm font-semibold text-[#111827]">{summary.readyRows}</p>
            </div>
            <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                Warning rows
              </p>
              <p className="mt-1 text-sm font-semibold text-[#111827]">{summary.warningRows}</p>
            </div>
            <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                Failed rows
              </p>
              <p className="mt-1 text-sm font-semibold text-[#111827]">{summary.failedRows}</p>
            </div>
            <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                Duplicate sources
              </p>
              <p className="mt-1 text-sm font-semibold text-[#111827]">{summary.duplicateRows}</p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-[#e5e7eb] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-[#6b7280]">
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Normalized URL</th>
                  <th className="px-3 py-2">Mapping</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb]">
                {results.map((row) => (
                  <tr key={`${row.rowNumber}-${row.normalizedSourceUrl || "blank"}`}>
                    <td className="px-3 py-2 text-[#111827]">{row.rowNumber}</td>
                    <td className="px-3 py-2 text-[#4b5563]">{row.sourceType || "—"}</td>
                    <td className="px-3 py-2 text-[#4b5563] break-all">
                      {row.normalizedSourceUrl || "—"}
                    </td>
                    <td className="px-3 py-2 text-[#4b5563]">
                      {row.mapping?.mappedSlug
                        ? `${row.mapping.mappedDisplayName} → ${row.mapping.mappedSlug}`
                        : "Needs confirmation"}
                    </td>
                    <td className="px-3 py-2">
                      <AdminBadge label={row.status} tone={statusTone(row.status)} />
                    </td>
                    <td className="px-3 py-2 text-[#4b5563]">
                      {[
                        row.duplicateSourceDetected ? "Duplicate source already exists in the registry." : "",
                        ...row.errors,
                        ...row.warnings,
                      ]
                        .filter(Boolean)
                        .join(" ") || "Ready to save."}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminSectionCard>
      ) : null}
    </div>
  );
}
