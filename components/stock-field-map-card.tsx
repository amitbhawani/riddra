"use client";

import { useMemo, useState } from "react";

import type { AdminEditorRecord } from "@/lib/admin-content-schema";
import { buildStockFieldMapRows } from "@/lib/stock-field-registry";

function prettifySourceType(value: string) {
  return value.replace(/_/g, " ");
}

export function StockFieldMapCard({
  record,
  title = "Show field map",
  description = "Frontend label, backend field key, data source, and editability are aligned here for internal users only.",
  defaultExpanded = false,
  compact = false,
}: {
  record: AdminEditorRecord;
  title?: string;
  description?: string;
  defaultExpanded?: boolean;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const rows = useMemo(() => buildStockFieldMapRows(record), [record]);

  const groupedRows = useMemo(() => {
    const groups = new Map<
      string,
      { label: string; rows: ReturnType<typeof buildStockFieldMapRows> }
    >();

    for (const row of rows) {
      if (!groups.has(row.sectionId)) {
        groups.set(row.sectionId, { label: row.sectionLabel, rows: [] });
      }

      groups.get(row.sectionId)?.rows.push(row);
    }

    return Array.from(groups.entries()).map(([sectionId, value]) => ({
      sectionId,
      label: value.label,
      rows: value.rows,
    }));
  }, [rows]);

  const missingCritical = rows.filter(
    (row) => row.requiredPriority === "critical" && row.missing,
  ).length;
  const missingImportant = rows.filter(
    (row) => row.requiredPriority === "important" && row.missing,
  ).length;
  const importManaged = rows.filter((row) => row.dataSourceType === "imported_time_series").length;
  const editableCount = rows.filter((row) => row.editableBy !== "none").length;

  return (
    <div className="rounded-[18px] border border-[rgba(27,58,107,0.12)] bg-[rgba(255,255,255,0.98)] p-4 shadow-[0_12px_24px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[0.96rem] font-semibold text-[#1F2937]">{title}</p>
          <p className="max-w-3xl text-[12px] leading-5 text-[rgba(75,85,99,0.88)]">
            {description}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="inline-flex h-9 items-center rounded-[11px] border border-[rgba(27,58,107,0.14)] bg-white px-3.5 text-[13px] font-semibold text-[#1B3A6B]"
        >
          {expanded ? "Hide field map" : "Show field map"}
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Editable fields", value: String(editableCount) },
          { label: "Import-managed fields", value: String(importManaged) },
          { label: "Missing critical", value: String(missingCritical) },
          { label: "Missing important", value: String(missingImportant) },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-[13px] border border-[rgba(27,58,107,0.1)] bg-[#F8FAFC] px-3 py-2.5"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(107,114,128,0.74)]">
              {item.label}
            </p>
            <p className="mt-1 text-[1.02rem] font-semibold text-[#1F2937]">{item.value}</p>
          </div>
        ))}
      </div>

      {!expanded ? null : (
        <div className={`mt-4 space-y-3 ${compact ? "" : "max-h-[540px] overflow-auto pr-1"}`}>
          {groupedRows.map((group) => (
            <div
              key={group.sectionId}
              className="rounded-[14px] border border-[rgba(226,232,240,0.96)] bg-white"
            >
              <div className="border-b border-[rgba(226,232,240,0.92)] px-3.5 py-2.5">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[rgba(107,114,128,0.78)]">
                  {group.label}
                </p>
              </div>
              <div className="divide-y divide-[rgba(226,232,240,0.88)]">
                {group.rows.map((row) => (
                  <div key={row.id} className="grid gap-2 px-3.5 py-3 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1.15fr)]">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13px] font-semibold text-[#1F2937]">{row.frontendLabel}</p>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            row.missing
                              ? "bg-[rgba(254,242,242,0.95)] text-[#B91C1C]"
                              : "bg-[rgba(240,253,244,0.96)] text-[#166534]"
                          }`}
                        >
                          {row.missing ? "Needs data" : "Mapped"}
                        </span>
                      </div>
                      <p className="text-[11px] leading-5 text-[rgba(75,85,99,0.84)]">
                        <span className="font-semibold text-[#1B3A6B]">{row.backendFieldKey}</span>
                      </p>
                      <p className="text-[11px] leading-5 text-[rgba(107,114,128,0.86)]">
                        {row.statusLabel}
                      </p>
                      {row.helpText ? (
                        <p className="text-[11px] leading-5 text-[rgba(107,114,128,0.86)]">
                          {row.helpText}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(107,114,128,0.72)]">
                        Current value
                      </p>
                      <p className="text-[12px] leading-6 text-[#374151]">
                        {row.currentValue || "—"}
                      </p>
                      <p className="text-[11px] leading-5 text-[rgba(107,114,128,0.82)]">
                        Source: {prettifySourceType(row.dataSourceType)} · Format: {row.expectedFormat} · Editable by: {row.editableBy}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
