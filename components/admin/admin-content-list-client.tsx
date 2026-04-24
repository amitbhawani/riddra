"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import { formatAdminDateTime, formatAdminSavedState } from "@/lib/admin-time";
import {
  adminAccessModeOptions,
  type AdminFamilyKey,
  type AdminListRow,
  adminFamilyMeta,
  adminPublishStateOptions,
} from "@/lib/admin-content-schema";
import {
  AdminActionLink,
  AdminBadge,
  AdminCard,
  AdminEmptyState,
} from "@/components/admin/admin-primitives";

function getToneForPublishState(state: AdminListRow["publishState"]) {
  if (state === "published") return "success" as const;
  if (state === "ready_for_review") return "warning" as const;
  if (state === "needs_fix") return "danger" as const;
  if (state === "archived") return "default" as const;
  return "info" as const;
}

function getToneForSourceState(state: AdminListRow["sourceState"]) {
  if (state === "source_backed") return "success" as const;
  if (state === "mixed_override") return "warning" as const;
  return "info" as const;
}

function getToneForOverride(state: AdminListRow["overrideIndicator"]) {
  if (state === "locked") return "danger" as const;
  if (state === "temporary") return "warning" as const;
  if (state === "manual") return "info" as const;
  return "default" as const;
}

function getSourceStateLabel(row: AdminListRow) {
  if (row.overrideIndicator === "locked") return "Manual locked";
  if (row.overrideIndicator === "temporary") return "Temporary manual";
  if (row.overrideIndicator === "manual") return "Manual live";
  if (row.sourceState === "manual_only") return "Manual only";
  return "Using source data";
}

function getToneForAccess(mode: AdminListRow["accessMode"]) {
  if (mode === "public_free") return "success" as const;
  if (mode === "membership_tiers") return "warning" as const;
  if (mode === "hidden_internal") return "default" as const;
  if (mode === "coming_soon_registration_required") return "info" as const;
  if (mode === "purchased_enrolled") return "danger" as const;
  return "info" as const;
}

function getToneForHealthScore(score: number) {
  if (score >= 80) return "success" as const;
  if (score >= 55) return "warning" as const;
  return "danger" as const;
}

const PAGE_SIZE = 25;

export function AdminContentListClient({
  family,
  rows,
  initialQuery = "",
  currentOperatorEmail = "",
  canPublishContent = true,
  isAdmin = false,
}: {
  family: AdminFamilyKey;
  rows: AdminListRow[];
  initialQuery?: string;
  currentOperatorEmail?: string;
  canPublishContent?: boolean;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const meta = adminFamilyMeta[family];
  const [rowState, setRowState] = useState(rows);
  const [query, setQuery] = useState(initialQuery);
  const [publishFilter, setPublishFilter] = useState("all");
  const [workflowFilter, setWorkflowFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [overrideFilter, setOverrideFilter] = useState("all");
  const [accessFilter, setAccessFilter] = useState("all");
  const [importFilter, setImportFilter] = useState("all");
  const [refreshFilter, setRefreshFilter] = useState("all");
  const [updatedFilter, setUpdatedFilter] = useState("all");
  const [sortBy, setSortBy] = useState("last_updated");
  const [page, setPage] = useState(1);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [quickEditSlug, setQuickEditSlug] = useState<string | null>(null);
  const [quickEditDraft, setQuickEditDraft] = useState<{
    title: string;
    status: AdminListRow["publishState"];
    accessMode: AdminListRow["accessMode"];
  } | null>(null);
  const [bulkAssignEmail, setBulkAssignEmail] = useState("");
  const [banner, setBanner] = useState<{
    tone: "success" | "danger";
    text: string;
    detail?: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    setRowState(rows);
  }, [rows]);

  useEffect(() => {
    setSelectedSlugs((current) =>
      current.filter((slug) => rows.some((row) => row.slug === slug)),
    );
  }, [rows]);

  const filteredRows = useMemo(() => {
    const lowered = deferredQuery.trim().toLowerCase();

    const next = rowState
      .filter((row) => (lowered ? row.searchText.includes(lowered) : true))
      .filter((row) => (publishFilter === "all" ? true : row.publishState === publishFilter))
      .filter((row) => {
        if (workflowFilter === "all") {
          return true;
        }
        if (workflowFilter === "incomplete") {
          return row.missingCriticalCount > 0 || row.missingImportantCount > 0;
        }
        if (workflowFilter === "stale") {
          return row.isStale;
        }
        if (workflowFilter === "assigned_to_me") {
          return Boolean(currentOperatorEmail) && row.assignedTo?.toLowerCase() === currentOperatorEmail.toLowerCase();
        }
        if (workflowFilter === "needs_review") {
          return row.needsReview;
        }
        if (workflowFilter === "recently_edited") {
          return row.recentlyEdited;
        }
        return true;
      })
      .filter((row) => (sourceFilter === "all" ? true : row.sourceState === sourceFilter))
      .filter((row) => (overrideFilter === "all" ? true : row.overrideIndicator === overrideFilter))
      .filter((row) => (accessFilter === "all" ? true : row.accessMode === accessFilter))
      .filter((row) => (importFilter === "all" ? true : row.importStatus === importFilter))
      .filter((row) => (refreshFilter === "all" ? true : row.refreshHealth === refreshFilter))
      .filter((row) =>
        updatedFilter === "all"
          ? true
          : updatedFilter === "recent"
            ? row.lastUpdated !== "Awaiting first operator save"
            : row.lastUpdated === "Awaiting first operator save",
      );

    return [...next].sort((left, right) => {
      if (sortBy === "title") {
        return left.title.localeCompare(right.title);
      }
      if (sortBy === "publish") {
        return left.publishState.localeCompare(right.publishState);
      }
      if (sortBy === "source_freshness") {
        return (right.sourceFreshness ?? "").localeCompare(left.sourceFreshness ?? "");
      }
      return right.lastUpdated.localeCompare(left.lastUpdated);
    });
  }, [
    accessFilter,
    currentOperatorEmail,
    deferredQuery,
    importFilter,
    overrideFilter,
    publishFilter,
    refreshFilter,
    rowState,
    sortBy,
    sourceFilter,
    updatedFilter,
    workflowFilter,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    accessFilter,
    deferredQuery,
    family,
    importFilter,
    overrideFilter,
    publishFilter,
    refreshFilter,
    rowState,
    sortBy,
    sourceFilter,
    updatedFilter,
    workflowFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredRows]);
  const resultStart = filteredRows.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const resultEnd = Math.min(currentPage * PAGE_SIZE, filteredRows.length);
  const visiblePageSlugs = paginatedRows.map((row) => row.slug);
  const allVisibleSelected =
    visiblePageSlugs.length > 0 &&
    visiblePageSlugs.every((slug) => selectedSlugs.includes(slug));
  const quickEditStatusOptions = canPublishContent
    ? adminPublishStateOptions
    : adminPublishStateOptions.filter(
        (option) => option.value !== "published" && option.value !== "archived",
      );

  function mergeRows(nextRows: AdminListRow[]) {
    if (!nextRows.length) {
      return;
    }

    setRowState((current) => {
      const map = new Map(current.map((row) => [row.slug, row]));
      for (const row of nextRows) {
        map.set(row.slug, row);
      }
      return Array.from(map.values());
    });
  }

  function toggleSlugSelection(slug: string) {
    setSelectedSlugs((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug],
    );
  }

  function toggleVisiblePageSelection() {
    setSelectedSlugs((current) => {
      if (allVisibleSelected) {
        return current.filter((slug) => !visiblePageSlugs.includes(slug));
      }

      return Array.from(new Set([...current, ...visiblePageSlugs]));
    });
  }

  function startQuickEdit(row: AdminListRow) {
    setBanner(null);
    setQuickEditSlug(row.slug);
    setQuickEditDraft({
      title: row.title,
      status: row.publishState,
      accessMode: row.accessMode,
    });
  }

  function resetQuickEdit() {
    setQuickEditSlug(null);
    setQuickEditDraft(null);
  }

  function runRecordAction(
    payload: Record<string, unknown>,
    onSuccess: (data: {
      row?: AdminListRow | null;
      rows?: AdminListRow[];
      editorHref?: string;
      updatedCount?: number;
      operation?: string;
      savedAt?: string;
    }) => void,
  ) {
    startTransition(async () => {
      setBanner(null);
      const response = await fetch("/api/admin/operator-console/records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          family,
          ...payload,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            row?: AdminListRow | null;
            rows?: AdminListRow[];
            editorHref?: string;
            updatedCount?: number;
            operation?: string;
            savedAt?: string;
          }
        | null;

      if (!response.ok) {
        setBanner({
          tone: "danger",
          text: data?.error ?? "Could not complete that content action right now.",
        });
        return;
      }

      onSuccess({
        row: data?.row ?? null,
        rows: data?.rows ?? [],
        editorHref: data?.editorHref,
        updatedCount: data?.updatedCount,
        operation: data?.operation,
        savedAt: data?.savedAt,
      });
      router.refresh();
    });
  }

  function handleQuickEditSave(row: AdminListRow) {
    if (!quickEditDraft) {
      return;
    }

    runRecordAction(
      {
        action: "quick_edit",
        slug: row.slug,
        title: quickEditDraft.title.trim() || row.title,
        status: quickEditDraft.status,
        accessMode: quickEditDraft.accessMode,
      },
      (data) => {
        if (data.row) {
          mergeRows([data.row]);
        }
        resetQuickEdit();
        setBanner({
          tone: "success",
          text: `Quick edit saved for ${data.row?.title ?? row.title}.`,
          detail: data.savedAt ? formatAdminSavedState(data.savedAt) : "List reloaded from server truth.",
        });
      },
    );
  }

  function handleBulkAction(action: "publish" | "archive" | "assign") {
    if (!selectedSlugs.length) {
      setBanner({
        tone: "danger",
        text: "Select at least one record before running a bulk action.",
      });
      return;
    }

    if (action === "assign" && !bulkAssignEmail.trim()) {
      setBanner({
        tone: "danger",
        text: "Enter an assignee email before bulk assigning records.",
      });
      return;
    }

    runRecordAction(
      {
        action: "bulk_update",
        slug: selectedSlugs[0],
        slugs: selectedSlugs,
        bulkAction: action,
        assignedToEmail: action === "assign" ? bulkAssignEmail.trim() : null,
      },
      (data) => {
        mergeRows(data.rows ?? []);
        setSelectedSlugs([]);
        setBanner({
          tone: "success",
          text:
            action === "assign"
              ? `Assigned ${data.updatedCount ?? 0} record${data.updatedCount === 1 ? "" : "s"} to ${bulkAssignEmail.trim()}.`
              : `${action === "publish" ? "Published" : "Archived"} ${data.updatedCount ?? 0} record${data.updatedCount === 1 ? "" : "s"}.`,
          detail: "The list has been refreshed from the current backend state.",
        });
      },
    );
  }

  function handleDuplicate(row: AdminListRow) {
    runRecordAction(
      {
        action: "duplicate",
        slug: row.slug,
        title: row.title,
      },
      (data) => {
        if (data.row) {
          mergeRows([data.row]);
        }
        setBanner({
          tone: "success",
          text: `Created a draft copy of ${row.title}.`,
          detail:
            data.editorHref
              ? "The duplicated record is now in this list and ready to open."
              : "The duplicated record was created successfully.",
        });
      },
    );
  }

  return (
    <div className="space-y-4">
      {banner ? (
        <AdminCard
          tone={banner.tone === "success" ? "primary" : "warning"}
          className="space-y-1.5"
        >
          <div className="flex flex-wrap items-center gap-2">
            <AdminBadge
              label={banner.tone === "success" ? "Saved" : "Action blocked"}
              tone={banner.tone === "success" ? "success" : "danger"}
            />
            <p className="text-sm text-[#111827]">{banner.text}</p>
          </div>
          {banner.detail ? (
            <p className="text-[12px] leading-5 text-[#6b7280]">{banner.detail}</p>
          ) : null}
        </AdminCard>
      ) : null}

      <AdminCard tone="primary" className="space-y-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="grid gap-x-3 gap-y-2.5 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-1.5 md:col-span-2 xl:col-span-1">
                <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                  Search
                </span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={`Search ${meta.label} by name, slug, or symbol`}
                  className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] placeholder:text-[#9ca3af] outline-none transition focus:border-[#2563eb] focus:bg-white"
                />
              </label>
              <SelectField
                label="Publish"
                value={publishFilter}
                onChange={setPublishFilter}
                options={[
                  ["all", "All"],
                  ["published", "Published"],
                  ["ready_for_review", "Ready for review"],
                  ["needs_fix", "Needs fix"],
                  ["draft", "Draft"],
                  ["archived", "Archived"],
                ]}
              />
              <SelectField
                label="Workflow"
                value={workflowFilter}
                onChange={setWorkflowFilter}
                options={[
                  ["all", "All"],
                  ["incomplete", "Incomplete"],
                  ["stale", "Stale"],
                  ["assigned_to_me", "Assigned to me"],
                  ["needs_review", "Needs review"],
                  ["recently_edited", "Recently edited"],
                ]}
              />
              <SelectField
                label="Sort"
                value={sortBy}
                onChange={setSortBy}
                options={[
                  ["last_updated", "Last updated"],
                  ["title", "Title"],
                  ["publish", "Publish state"],
                  ["source_freshness", "Source freshness"],
                ]}
              />
            </div>
            <details className="rounded-lg border border-[#d1d5db] bg-white">
              <summary className="cursor-pointer list-none px-3 py-2 text-[12px] font-medium text-[#111827]">
                More filters
              </summary>
              <div className="grid gap-x-3 gap-y-2.5 border-t border-[#e5e7eb] px-3 py-3 md:grid-cols-2 xl:grid-cols-6">
                <SelectField
                  label="Data source"
                  value={sourceFilter}
                  onChange={setSourceFilter}
                  options={[
                    ["all", "All"],
                    ["source_backed", "Using source data"],
                    ["mixed_override", "Mixed source + manual"],
                    ["manual_only", "Manual only"],
                  ]}
                />
                <SelectField
                  label="Manual changes"
                  value={overrideFilter}
                  onChange={setOverrideFilter}
                  options={[
                    ["all", "All"],
                    ["none", "None"],
                    ["manual", "Manual"],
                    ["temporary", "Temporary"],
                    ["locked", "Locked"],
                  ]}
                />
                <SelectField
                  label="Access"
                  value={accessFilter}
                  onChange={setAccessFilter}
                  options={[
                    ["all", "All"],
                    ["public_free", "Public / free"],
                    ["logged_in_free_member", "Logged-in free member"],
                    ["membership_tiers", "Membership tiers"],
                    ["hidden_internal", "Hidden / internal"],
                    ["coming_soon_registration_required", "Coming soon / registration"],
                    ["purchased_enrolled", "Purchased / enrolled"],
                  ]}
                />
                <SelectField
                  label="Import"
                  value={importFilter}
                  onChange={setImportFilter}
                  options={[
                    ["all", "All"],
                    ["source_current", "Source current"],
                    ["source_newer_than_manual", "Source newer than manual"],
                    ["manual_overriding_source", "Manual overriding source"],
                    ["temporary_override_pending_expiry", "Temporary override"],
                    ["locked_manual_value", "Locked manual"],
                    ["import_conflict_needs_review", "Conflict review"],
                    ["not_connected", "Not connected"],
                  ]}
                />
                <SelectField
                  label="Refresh"
                  value={refreshFilter}
                  onChange={setRefreshFilter}
                  options={[
                    ["all", "All"],
                    ["healthy", "Healthy"],
                    ["running", "Running"],
                    ["warning", "Warning"],
                    ["failed", "Failed"],
                    ["paused", "Paused"],
                    ["planned", "Planned"],
                    ["not_applicable", "Not applicable"],
                  ]}
                />
                <SelectField
                  label="Updated"
                  value={updatedFilter}
                  onChange={setUpdatedFilter}
                  options={[
                    ["all", "All"],
                    ["recent", "With operator edits"],
                    ["none", "No manual edits yet"],
                  ]}
                />
              </div>
            </details>
          </div>
          <div className="flex items-center gap-2">
            <AdminActionLink
              href={`/admin/content/${family}/new`}
              label={`Create new ${meta.singular}`}
              tone="primary"
            />
          </div>
        </div>
      </AdminCard>

      {filteredRows.length ? (
        <>
      {isAdmin ? (
        <AdminCard tone="secondary" className="space-y-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <AdminBadge
                  label={`${selectedSlugs.length} selected`}
                  tone={selectedSlugs.length ? "info" : "default"}
                />
                <p className="text-[13px] text-[#4b5563]">
                  Bulk actions work on the records selected from this filtered list.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={toggleVisiblePageSelection}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827]"
                >
                  {allVisibleSelected ? "Clear visible results" : "Select visible results"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSlugs([])}
                  disabled={!selectedSlugs.length}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[12px] font-medium text-[#6b7280] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear selection
                </button>
              </div>
            </div>

            <div className="grid gap-2 xl:grid-cols-[minmax(220px,1fr)_auto_auto_auto]">
              <input
                value={bulkAssignEmail}
                onChange={(event) => setBulkAssignEmail(event.target.value)}
                placeholder="Assign selected records to email"
                className="h-9 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] text-[#111827] placeholder:text-[#9ca3af] outline-none transition focus:border-[#2563eb]"
              />
              <button
                type="button"
                onClick={() => handleBulkAction("assign")}
                disabled={isPending || !selectedSlugs.length}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Applying..." : "Bulk assign"}
              </button>
              {canPublishContent ? (
                <button
                  type="button"
                  onClick={() => handleBulkAction("publish")}
                  disabled={isPending || !selectedSlugs.length}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-3 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? "Applying..." : "Bulk publish"}
                </button>
              ) : null}
              {canPublishContent ? (
                <button
                  type="button"
                  onClick={() => handleBulkAction("archive")}
                  disabled={isPending || !selectedSlugs.length}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[12px] font-medium text-[#6b7280] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? "Applying..." : "Bulk archive"}
                </button>
              ) : null}
            </div>
          </div>
        </AdminCard>
      ) : null}

          <AdminCard tone="secondary" className="space-y-0 overflow-hidden p-0">
            <div className="hidden border-b border-[#d1d5db] bg-[#f3f4f6] px-4 py-2 lg:grid lg:grid-cols-[auto_minmax(0,2.1fr)_minmax(0,1.1fr)_minmax(0,1.15fr)_minmax(0,1.25fr)_minmax(0,1.1fr)_minmax(0,1.25fr)_minmax(0,1.05fr)_auto] lg:gap-4">
              {[
                "Pick",
                "Name",
                "Workflow",
                "Assignment",
                "Health",
                "Access",
                "Data mode",
                "Last updated",
                "Actions",
              ].map((label) => (
                <p key={label} className="text-[12px] font-medium text-[#6b7280]">
                  {label}
                </p>
              ))}
            </div>

            <div className="divide-y divide-[#e5e7eb] bg-white">
              {paginatedRows.map((row) => {
                const isQuickEditing = quickEditSlug === row.slug && Boolean(quickEditDraft);

                return (
                  <div key={`${row.family}-${row.slug}`} className="px-4 py-3 transition hover:bg-[#f9fafb]">
                    <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,2.1fr)_minmax(0,1.1fr)_minmax(0,1.15fr)_minmax(0,1.25fr)_minmax(0,1.1fr)_minmax(0,1.25fr)_minmax(0,1.05fr)_auto] lg:items-start lg:gap-4">
                      <FieldBlock label="Pick">
                        {isAdmin ? (
                          <label className="flex h-9 items-center justify-start lg:justify-center">
                            <input
                              type="checkbox"
                              checked={selectedSlugs.includes(row.slug)}
                              onChange={() => toggleSlugSelection(row.slug)}
                              className="h-4 w-4 rounded border border-[#cbd5e1]"
                            />
                          </label>
                        ) : (
                          <span className="text-[12px] text-[#9ca3af]">-</span>
                        )}
                      </FieldBlock>

                      <FieldBlock label="Name">
                        <div className="space-y-2">
                          {isQuickEditing ? (
                            <input
                              value={quickEditDraft?.title ?? row.title}
                              onChange={(event) =>
                                setQuickEditDraft((current) =>
                                  current
                                    ? { ...current, title: event.target.value }
                                    : current,
                                )
                              }
                              className="h-9 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#2563eb]"
                            />
                          ) : (
                            <p className="text-[13px] font-medium text-[#111827]">{row.title}</p>
                          )}
                          <p className="text-[12px] text-[#6b7280]">
                            {row.slug}
                            {row.symbol ? ` • ${row.symbol}` : ""}
                          </p>
                          {row.summary ? (
                            <p className="line-clamp-2 max-w-[36rem] text-[12px] leading-5 text-[#6b7280]">
                              {row.summary}
                            </p>
                          ) : (
                            <p className="text-[12px] leading-5 text-[#9ca3af]">
                              Add a summary so this record is easier to scan in CMS lists.
                            </p>
                          )}
                        </div>
                      </FieldBlock>

                      <FieldBlock label="Workflow">
                        <div className="space-y-1.5">
                          {isQuickEditing ? (
                            <select
                              value={quickEditDraft?.status ?? row.publishState}
                              onChange={(event) =>
                                setQuickEditDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        status: event.target.value as AdminListRow["publishState"],
                                      }
                                    : current,
                                )
                              }
                              className="h-9 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#2563eb]"
                            >
                              {[
                                ...quickEditStatusOptions,
                                ...(quickEditStatusOptions.some((option) => option.value === row.publishState)
                                  ? []
                                  : adminPublishStateOptions.filter(
                                      (option) => option.value === row.publishState,
                                    )),
                              ].map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <AdminBadge
                                label={row.publishState.replaceAll("_", " ")}
                                tone={getToneForPublishState(row.publishState)}
                              />
                              {row.needsReview ? (
                                <AdminBadge label="Needs attention" tone="warning" />
                              ) : null}
                            </div>
                          )}
                          <p className="text-[12px] leading-5 text-[#6b7280]">
                            {row.needsReview
                              ? "This record is waiting for review or fixes."
                              : "Workflow is currently stable."}
                          </p>
                        </div>
                      </FieldBlock>

                      <FieldBlock label="Assignment">
                        <div className="space-y-1">
                          <p className="text-[13px] text-[#111827]">{row.assignedTo || "Unassigned"}</p>
                          <p className="text-[12px] text-[#6b7280]">
                            {row.assignedBy ? `Assigned by ${row.assignedBy}` : "No owner set yet"}
                          </p>
                          <p className="text-[12px] text-[#6b7280]">
                            {row.dueDate ? `Due ${formatAdminDateTime(row.dueDate)}` : "No due date"}
                          </p>
                        </div>
                      </FieldBlock>

                      <FieldBlock label="Health">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <AdminBadge
                              label={`Health ${row.contentHealthScore}%`}
                              tone={getToneForHealthScore(row.contentHealthScore)}
                            />
                            <AdminBadge
                              label={`Completeness ${row.completenessPercent}%`}
                              tone={
                                row.missingCriticalCount
                                  ? "danger"
                                  : row.missingImportantCount
                                    ? "warning"
                                    : "success"
                              }
                            />
                          </div>
                          <p className="text-[12px] text-[#6b7280]">
                            Freshness {row.freshnessScore}% • Source coverage {row.sourceCoverageScore}%
                          </p>
                          <p className="text-[12px] text-[#6b7280]">
                            Missing {row.missingCriticalCount} critical • {row.missingImportantCount} important
                          </p>
                          {row.dependencyWarnings.length ? (
                            <div className="flex flex-wrap gap-1.5">
                              {row.dependencyWarnings.map((warning) => (
                                <AdminBadge key={`${row.slug}-${warning}`} label={warning} tone="warning" />
                              ))}
                            </div>
                          ) : (
                            <p className="text-[12px] text-[#6b7280]">
                              No dependency blockers detected.
                            </p>
                          )}
                        </div>
                      </FieldBlock>

                      <FieldBlock label="Access">
                        <div className="space-y-1.5">
                          {isQuickEditing ? (
                            <select
                              value={quickEditDraft?.accessMode ?? row.accessMode}
                              onChange={(event) =>
                                setQuickEditDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        accessMode: event.target.value as AdminListRow["accessMode"],
                                      }
                                    : current,
                                )
                              }
                              className="h-9 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#2563eb]"
                            >
                              {adminAccessModeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <AdminBadge label={row.accessLabel} tone={getToneForAccess(row.accessMode)} />
                              {row.requireLogin ? <AdminBadge label="Login" tone="info" /> : null}
                            </div>
                          )}
                          <p className="text-[12px] leading-5 text-[#6b7280]">
                            {row.accessDetail || "Open access"}
                          </p>
                        </div>
                      </FieldBlock>

                      <FieldBlock label="Data mode">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <AdminBadge
                              label={getSourceStateLabel(row)}
                              tone={getToneForSourceState(row.sourceState)}
                            />
                            {row.overrideIndicator !== "none" ? (
                              <AdminBadge
                                label={
                                  row.overrideIndicator === "temporary"
                                    ? "temporary manual"
                                    : row.overrideIndicator.replaceAll("_", " ")
                                }
                                tone={getToneForOverride(row.overrideIndicator)}
                              />
                            ) : null}
                          </div>
                          <p className="text-[12px] leading-5 text-[#6b7280]">
                            {row.sourceLabel || "No source label saved yet"}
                          </p>
                          <p className="text-[12px] leading-5 text-[#6b7280]">
                            Refresh health: {row.refreshHealth.replaceAll("_", " ")}
                          </p>
                        </div>
                      </FieldBlock>

                      <FieldBlock label="Last updated">
                        <div className="space-y-1">
                          <p className="text-[13px] text-[#111827]">
                            {row.lastUpdated === "Awaiting first operator save"
                              ? row.lastUpdated
                              : formatAdminDateTime(row.lastUpdated)}
                          </p>
                          {row.sourceFreshness ? (
                            <p className="text-[12px] text-[#6b7280]">
                              Source {formatAdminDateTime(row.sourceFreshness)}
                            </p>
                          ) : null}
                          {row.nextRefreshAt ? (
                            <p className="text-[12px] text-[#6b7280]">
                              Next refresh {formatAdminDateTime(row.nextRefreshAt)}
                            </p>
                          ) : null}
                        </div>
                      </FieldBlock>

                      <FieldBlock label="Actions">
                        <div className="flex min-w-[152px] flex-col items-start gap-2">
                          <Link
                            href={`/admin/content/${family}/${row.slug}`}
                            className="inline-flex h-8 shrink-0 items-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-3 text-[13px] font-medium text-white whitespace-nowrap"
                          >
                            Edit
                          </Link>
                          {isAdmin && isQuickEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleQuickEditSave(row)}
                                disabled={isPending}
                                className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isPending ? "Saving..." : "Save quick edit"}
                              </button>
                              <button
                                type="button"
                                onClick={resetQuickEdit}
                                disabled={isPending}
                                className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[12px] font-medium text-[#6b7280] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </>
                          ) : isAdmin ? (
                            <button
                              type="button"
                              onClick={() => startQuickEdit(row)}
                              disabled={isPending}
                              className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Quick edit
                            </button>
                          ) : null}
                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={() => handleDuplicate(row)}
                              disabled={isPending}
                              className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isPending ? "Duplicating..." : "Duplicate"}
                            </button>
                          ) : null}
                          {row.publicHref ? (
                            <Link
                              href={row.publicHref}
                              className="inline-flex h-8 shrink-0 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827] whitespace-nowrap"
                            >
                              Open page
                            </Link>
                          ) : null}
                        </div>
                      </FieldBlock>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 border-t border-[#d1d5db] bg-[#f8fafc] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] leading-5 text-[#6b7280]">
                Showing {resultStart}-{resultEnd} of {filteredRows.length} records
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-[12px] font-medium text-[#4b5563]">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </AdminCard>
        </>
      ) : (
        <AdminEmptyState
          title={`No ${meta.label} matched the current filters`}
          description="Try clearing one or two filters, search by slug or symbol, or create a new draft record if the item does not exist yet."
          action={
            <AdminActionLink
              href={`/admin/content/${family}/new`}
              label={`Create new ${meta.singular}`}
              tone="primary"
            />
          }
        />
      )}
    </div>
  );
}

function FieldBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280] lg:hidden">
        {label}
      </p>
      {children}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-lg border border-[#d1d5db] bg-[#f9fafb] px-3 text-[13px] text-[#111827] outline-none transition focus:border-[#2563eb] focus:bg-white"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
