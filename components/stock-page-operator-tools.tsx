"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { AdminEditorRecord } from "@/lib/admin-content-schema";
import {
  getStockInlineEditRows,
  getStockInlineEditSections,
  type StockFieldMapRow,
  type StockInlineEditSectionId,
} from "@/lib/stock-field-registry";
import { StockFieldMapCard } from "@/components/stock-field-map-card";

type EditableSectionState = Record<
  string,
  {
    mode: string;
    values: Record<string, string>;
    note: string;
    lastManualEditAt: string | null;
    expiresAt: string | null;
  }
>;

function buildEditableSections(record: AdminEditorRecord): EditableSectionState {
  return Object.fromEntries(
    record.sections.map((section) => [
      section.definition.key,
      {
        mode: section.mode,
        values: { ...section.manualValues },
        note: section.note,
        lastManualEditAt: section.lastManualEditAt,
        expiresAt: section.expiresAt,
      },
    ]),
  );
}

function formatIstTimestamp(value: string | null) {
  if (!value) {
    return "Not saved yet";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(parsed);
}

function useBeforeUnload(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled]);
}

function renderFieldInput({
  row,
  value,
  onChange,
}: {
  row: StockFieldMapRow;
  value: string;
  onChange: (nextValue: string) => void;
}) {
  if (row.editableBy === "none") {
    return (
      <div className="rounded-[12px] border border-[rgba(203,213,225,0.92)] bg-[#F8FAFC] px-3 py-2.5 text-[12px] leading-6 text-[#4B5563]">
        {row.statusLabel}
      </div>
    );
  }

  if (row.options?.length) {
    return (
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-[12px] border border-[rgba(203,213,225,0.92)] bg-white px-3 text-[13px] text-[#111827]"
      >
        <option value="">Select</option>
        {row.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (row.expectedFormat === "textarea") {
    return (
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full rounded-[12px] border border-[rgba(203,213,225,0.92)] bg-white px-3 py-2.5 text-[13px] leading-6 text-[#111827]"
      />
    );
  }

  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full rounded-[12px] border border-[rgba(203,213,225,0.92)] bg-white px-3 text-[13px] text-[#111827]"
    />
  );
}

export function StockPageOperatorTools({
  record,
  role,
  canPublishContent,
}: {
  record: AdminEditorRecord;
  role: "admin" | "editor";
  canPublishContent: boolean;
}) {
  const router = useRouter();
  const [selectedSectionId, setSelectedSectionId] = useState<StockInlineEditSectionId | null>(null);
  const [showFieldMap, setShowFieldMap] = useState(false);
  const [draftSections, setDraftSections] = useState<EditableSectionState>(() =>
    buildEditableSections(record),
  );
  const [savedSections, setSavedSections] = useState<EditableSectionState>(() =>
    buildEditableSections(record),
  );
  const [lastSavedAt, setLastSavedAt] = useState(record.updatedAt);
  const [recordId, setRecordId] = useState(record.id);
  const [banner, setBanner] = useState<{
    tone: "success" | "danger" | "info";
    text: string;
  } | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [dirty, setDirty] = useState(false);

  useBeforeUnload(dirty);

  useEffect(() => {
    const nextSections = buildEditableSections(record);
    setDraftSections(nextSections);
    setSavedSections(nextSections);
    setLastSavedAt(record.updatedAt);
    setRecordId(record.id);
    setDirty(false);
  }, [record]);

  const inlineSections = useMemo(() => getStockInlineEditSections(), []);
  const selectedSection = useMemo(
    () => inlineSections.find((section) => section.id === selectedSectionId) ?? null,
    [inlineSections, selectedSectionId],
  );

  const selectedRows = useMemo(() => {
    if (!selectedSectionId) {
      return [];
    }

    const clonedRecord: AdminEditorRecord = {
      ...record,
      id: recordId,
      updatedAt: lastSavedAt,
      sections: record.sections.map((section) => ({
        ...section,
        manualValues: { ...draftSections[section.definition.key]?.values },
        effectiveValues: {
          ...section.effectiveValues,
          ...draftSections[section.definition.key]?.values,
        },
        mode:
          (draftSections[section.definition.key]?.mode as typeof section.mode | undefined) ??
          section.mode,
        note: draftSections[section.definition.key]?.note ?? section.note,
        lastManualEditAt:
          draftSections[section.definition.key]?.lastManualEditAt ?? section.lastManualEditAt,
        expiresAt: draftSections[section.definition.key]?.expiresAt ?? section.expiresAt,
      })),
    };

    return getStockInlineEditRows(clonedRecord, selectedSectionId, role);
  }, [draftSections, lastSavedAt, record, recordId, role, selectedSectionId]);

  function setFieldValue(row: StockFieldMapRow, nextValue: string) {
    if (!row.adminSectionKey || !row.adminFieldKey) {
      return;
    }

    setDraftSections((current) => {
      const sectionKey = row.adminSectionKey;
      if (!sectionKey) {
        return current;
      }

      const existing = current[sectionKey] ?? {
        mode: "manual_override",
        values: {},
        note: "",
        lastManualEditAt: null,
        expiresAt: null,
      };

      return {
        ...current,
        [sectionKey]: {
          ...existing,
          mode: existing.mode === "auto_source" ? "manual_override" : existing.mode,
          values: {
            ...existing.values,
            [row.adminFieldKey!]: nextValue,
          },
          lastManualEditAt: new Date().toISOString(),
        },
      };
    });
    setDirty(true);
    setBanner(null);
  }

  function cancelChanges() {
    setDraftSections(savedSections);
    setDirty(false);
    setBanner({
      tone: "info",
      text: "Unsaved stock-page edits were discarded.",
    });
    setSelectedSectionId(null);
  }

  async function submitChanges(action: "save" | "publish" | "request_review") {
    setIsPending(true);
    setBanner(null);

    const benchmarkMapping =
      draftSections.identity?.values.sectorIndexSlug ??
      record.sections.find((section) => section.definition.key === "identity")?.effectiveValues
        .sectorIndexSlug ??
      null;
    const nextStatus =
      role === "editor"
        ? action === "request_review"
          ? "ready_for_review"
          : "draft"
        : action === "publish"
          ? "published"
          : record.publishState === "published"
            ? "published"
            : "draft";

    const payload = {
      family: "stocks",
      recordId,
      originalSlug: record.slug,
      lastKnownUpdatedAt: lastSavedAt,
      slug: record.slug,
      title: draftSections.identity?.values.companyName || record.title,
      symbol: draftSections.identity?.values.symbol || record.symbol,
      benchmarkMapping,
      status: nextStatus,
      visibility: record.visibility,
      publicHref: record.publicHref,
      canonicalRoute: record.canonicalRoute,
      sourceTable: record.sourceTable,
      sourceRowId: record.sourceRowId,
      sourceLabel: record.sourceLabel,
      sourceDate: record.sourceDate,
      sourceUrl: record.sourceUrl,
      accessControl: record.accessControl,
      scheduledPublishAt: record.scheduledPublishAt,
      scheduledUnpublishAt: record.scheduledUnpublishAt,
      sections: Object.fromEntries(
        record.sections.map((section) => [
          section.definition.key,
          {
            mode:
              draftSections[section.definition.key]?.mode ??
              section.mode,
            values:
              draftSections[section.definition.key]?.values ??
              section.manualValues,
            note: draftSections[section.definition.key]?.note ?? section.note,
            lastManualEditAt:
              draftSections[section.definition.key]?.lastManualEditAt ??
              section.lastManualEditAt,
            expiresAt:
              draftSections[section.definition.key]?.expiresAt ?? section.expiresAt,
          },
        ]),
      ),
    };

    try {
      const response = await fetch("/api/admin/operator-console/records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            record?: { id?: string | null; updatedAt?: string | null };
            pendingApproval?: { updatedAt?: string | null };
            savedAt?: string | null;
            operation?: string;
          }
        | null;

      if (!response.ok || data?.error) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "We could not save these stock-page edits right now.",
        });
        return;
      }

      const nextSavedAt = data?.savedAt ?? data?.record?.updatedAt ?? data?.pendingApproval?.updatedAt ?? new Date().toISOString();
      const nextRecordId = data?.record?.id ?? recordId;

      setSavedSections(draftSections);
      setLastSavedAt(nextSavedAt);
      setRecordId(nextRecordId ?? null);
      setDirty(false);
      setSelectedSectionId(null);
      setBanner({
        tone: "success",
        text:
          role === "editor"
            ? action === "request_review"
              ? "Sent for approval."
              : "Saved as draft."
            : action === "publish"
              ? "Published directly."
              : "Saved from the stock page.",
      });
      router.refresh();
    } catch (error) {
      setBanner({
        tone: "danger",
        text: error instanceof Error ? error.message : "We could not save these stock-page edits right now.",
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[18px] border border-[rgba(27,58,107,0.12)] bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FBFF_100%)] px-4 py-3 shadow-[0_12px_24px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">
              Internal editor controls
            </p>
            <p className="text-[14px] font-semibold text-[#1F2937]">
              {role === "admin"
                ? "Admin can edit live-facing stock sections here."
                : "Editor can stage stock-page changes here for approval."}
            </p>
            <p className="text-[12px] leading-5 text-[rgba(75,85,99,0.86)]">
              Historical chart candles and benchmark history stay import-managed. Manual snapshot and editorial fields can be edited inline from this page.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFieldMap((current) => !current)}
              className="inline-flex h-9 items-center rounded-[11px] border border-[rgba(27,58,107,0.14)] bg-white px-3.5 text-[13px] font-semibold text-[#1B3A6B]"
            >
              {showFieldMap ? "Hide field map" : "Show field map"}
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {inlineSections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setSelectedSectionId(section.id)}
              className={`inline-flex h-9 items-center rounded-[11px] border px-3.5 text-[13px] font-semibold ${
                selectedSectionId === section.id
                  ? "border-[#1B3A6B] bg-[#1B3A6B] text-white"
                  : "border-[rgba(27,58,107,0.14)] bg-white text-[#1B3A6B]"
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-[rgba(75,85,99,0.84)]">
          <span className={`inline-flex rounded-full px-2.5 py-1 font-semibold ${dirty ? "bg-[rgba(254,249,195,0.96)] text-[#92400E]" : "bg-[rgba(240,253,244,0.96)] text-[#166534]"}`}>
            {dirty ? "Unsaved changes" : "No unsaved changes"}
          </span>
          <span>Last saved: {formatIstTimestamp(lastSavedAt)}</span>
        </div>

        {banner ? (
          <div
            className={`mt-3 rounded-[12px] px-3 py-2.5 text-[12px] leading-6 ${
              banner.tone === "danger"
                ? "bg-[rgba(254,242,242,0.96)] text-[#991B1B]"
                : banner.tone === "info"
                  ? "bg-[rgba(239,246,255,0.96)] text-[#1D4ED8]"
                  : "bg-[rgba(240,253,244,0.96)] text-[#166534]"
            }`}
          >
            {banner.text}
          </div>
        ) : null}
      </div>

      {showFieldMap ? (
        <StockFieldMapCard
          record={{
            ...record,
            id: recordId,
            updatedAt: lastSavedAt,
            sections: record.sections.map((section) => ({
              ...section,
              manualValues: { ...draftSections[section.definition.key]?.values },
              effectiveValues: {
                ...section.effectiveValues,
                ...draftSections[section.definition.key]?.values,
              },
              mode:
                (draftSections[section.definition.key]?.mode as typeof section.mode | undefined) ??
                section.mode,
              note: draftSections[section.definition.key]?.note ?? section.note,
              lastManualEditAt:
                draftSections[section.definition.key]?.lastManualEditAt ?? section.lastManualEditAt,
              expiresAt: draftSections[section.definition.key]?.expiresAt ?? section.expiresAt,
            })),
          }}
          title="Stock field map"
          description="This internal map keeps frontend labels, backend field keys, import-managed fields, and operator editability aligned."
          defaultExpanded
          compact
        />
      ) : null}

      {!selectedSection ? null : (
        <div className="fixed inset-0 z-[80] bg-[rgba(15,23,42,0.35)]">
          <div className="absolute inset-y-0 right-0 w-full max-w-[460px] overflow-y-auto border-l border-[rgba(203,213,225,0.92)] bg-white shadow-[0_18px_44px_rgba(15,23,42,0.22)]">
            <div className="sticky top-0 z-10 border-b border-[rgba(226,232,240,0.92)] bg-white px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[rgba(107,114,128,0.72)]">
                    {selectedSection.label}
                  </p>
                  <p className="text-[14px] leading-6 text-[#4B5563]">
                    {selectedSection.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={cancelChanges}
                  className="inline-flex h-9 items-center rounded-[11px] border border-[rgba(203,213,225,0.92)] bg-white px-3.5 text-[13px] font-semibold text-[#1F2937]"
                >
                  Close
                </button>
              </div>
              {selectedSection.managedByImportNote ? (
                <div className="mt-3 rounded-[12px] bg-[rgba(239,246,255,0.96)] px-3 py-2.5 text-[12px] leading-6 text-[#1D4ED8]">
                  {selectedSection.managedByImportNote}
                </div>
              ) : null}
            </div>

            <div className="space-y-4 px-4 py-4">
              {selectedRows.map((row) => {
                const value =
                  row.adminSectionKey && row.adminFieldKey
                    ? draftSections[row.adminSectionKey]?.values[row.adminFieldKey] ??
                      row.currentValue
                    : row.currentValue;

                return (
                  <div
                    key={row.id}
                    className="rounded-[14px] border border-[rgba(226,232,240,0.92)] bg-[#F8FAFC] p-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13px] font-semibold text-[#1F2937]">{row.frontendLabel}</p>
                        <span className="inline-flex rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#1B3A6B]">
                          {row.backendFieldKey}
                        </span>
                      </div>
                      <p className="text-[11px] leading-5 text-[rgba(107,114,128,0.84)]">
                        {row.statusLabel}
                      </p>
                    </div>
                    <div className="mt-2">
                      {renderFieldInput({
                        row,
                        value,
                        onChange: (nextValue) => setFieldValue(row, nextValue),
                      })}
                    </div>
                  </div>
                );
              })}

              <div className="flex flex-wrap items-center gap-2 border-t border-[rgba(226,232,240,0.92)] pt-3">
                {role === "editor" ? (
                  <>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => submitChanges("save")}
                      className="inline-flex h-10 items-center rounded-[12px] border border-[#1B3A6B] bg-[#1B3A6B] px-4 text-[13px] font-semibold text-white disabled:opacity-70"
                    >
                      {isPending ? "Saving..." : "Save pending draft"}
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => submitChanges("request_review")}
                      className="inline-flex h-10 items-center rounded-[12px] border border-[rgba(203,213,225,0.92)] bg-white px-4 text-[13px] font-semibold text-[#111827] disabled:opacity-70"
                    >
                      {isPending ? "Saving..." : "Send for approval"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => submitChanges("save")}
                      className="inline-flex h-10 items-center rounded-[12px] border border-[#1B3A6B] bg-[#1B3A6B] px-4 text-[13px] font-semibold text-white disabled:opacity-70"
                    >
                      {isPending
                        ? "Saving..."
                        : record.publishState === "published"
                          ? "Save live update"
                          : "Save draft"}
                    </button>
                    {canPublishContent ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => submitChanges("publish")}
                        className="inline-flex h-10 items-center rounded-[12px] border border-[rgba(203,213,225,0.92)] bg-white px-4 text-[13px] font-semibold text-[#111827] disabled:opacity-70"
                      >
                        {isPending ? "Saving..." : "Publish directly"}
                      </button>
                    ) : null}
                  </>
                )}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={cancelChanges}
                  className="inline-flex h-10 items-center rounded-[12px] border border-[rgba(203,213,225,0.92)] bg-white px-4 text-[13px] font-semibold text-[#4B5563] disabled:opacity-70"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
