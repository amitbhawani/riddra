"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  AdminActionLink,
  AdminBadge,
  AdminEmptyState,
  AdminSectionCard,
} from "@/components/admin/admin-primitives";
import type {
  AdminSitemapAudit,
  AdminSitemapEntry,
  AdminSitemapGroup,
  AdminSitemapSection,
} from "@/lib/admin-sitemap";

function getPublishTone(state: AdminSitemapEntry["publishState"]) {
  if (state === "published" || state === "static") return "success" as const;
  if (state === "ready_for_review") return "warning" as const;
  if (state === "needs_fix" || state === "archived") return "danger" as const;
  if (state === "internal") return "warning" as const;
  if (state === "pattern") return "info" as const;
  return "default" as const;
}

function getSourceTone(state: AdminSitemapEntry["sourceState"]) {
  if (state === "source_backed") return "success" as const;
  if (state === "mixed_override") return "warning" as const;
  if (state === "manual_only") return "danger" as const;
  if (state === "internal") return "warning" as const;
  if (state === "pattern") return "info" as const;
  return "default" as const;
}

function formatPublishLabel(state: AdminSitemapEntry["publishState"]) {
  if (state === "static") return "Static route";
  if (state === "pattern") return "Dynamic pattern";
  if (state === "internal") return "Internal / noindex";
  return state.replaceAll("_", " ");
}

function formatSourceLabel(state: AdminSitemapEntry["sourceState"]) {
  if (state === "static") return "Code route";
  if (state === "pattern") return "Dynamic route";
  if (state === "internal") return "Special route";
  return state.replaceAll("_", " ");
}

function removeEntriesFromSections(sections: AdminSitemapSection[], entryIds: Set<string>) {
  return sections.map((section) => ({
    ...section,
    groups: section.groups.map((group) => ({
      ...group,
      items: group.items.filter((item) => !entryIds.has(item.id)),
    })),
  }));
}

function flattenEntries(sections: AdminSitemapSection[]) {
  return sections.flatMap((section) => section.groups.flatMap((group) => group.items));
}

function getGroupSelectedCount(group: AdminSitemapGroup, selectedIds: string[]) {
  return group.items.filter((item) => selectedIds.includes(item.id)).length;
}

function SitemapRow({
  entry,
  expanded,
  selected,
  onToggleExpanded,
  onToggleSelected,
  onDelete,
  deletePending,
}: {
  entry: AdminSitemapEntry;
  expanded: boolean;
  selected: boolean;
  onToggleExpanded: (entryId: string) => void;
  onToggleSelected: (entryId: string) => void;
  onDelete: (entry: AdminSitemapEntry) => void;
  deletePending: boolean;
}) {
  const deleteDisabled = !entry.deletable || deletePending;

  return (
    <div className="rounded-xl border border-[#dbe3ed] bg-white shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col gap-3 px-4 py-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelected(entry.id)}
            aria-label={`Select ${entry.title}`}
            className="mt-0.5 h-4 w-4 rounded border border-[#cbd5e1] text-[#1B3A6B] focus:ring-[#1B3A6B]"
          />

          <div className="min-w-0 flex-1 space-y-2">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13px] font-semibold text-[#111827]">{entry.title}</p>
                <AdminBadge
                  label={formatPublishLabel(entry.publishState)}
                  tone={getPublishTone(entry.publishState)}
                />
                <AdminBadge
                  label={formatSourceLabel(entry.sourceState)}
                  tone={getSourceTone(entry.sourceState)}
                />
                {entry.accessLabel ? <AdminBadge label={entry.accessLabel} tone="default" /> : null}
              </div>
              <p className="truncate text-xs leading-5 text-[#6b7280]">{entry.breadcrumb}</p>
            </div>

            {!expanded && entry.note ? (
              <p className="line-clamp-1 text-sm leading-5 text-[#4b5563]">{entry.note}</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          {entry.editHref ? <AdminActionLink href={entry.editHref} label="Edit" tone="primary" /> : null}
          {entry.href ? <AdminActionLink href={entry.href} label="Open page" /> : null}
          <button
            type="button"
            onClick={() => onDelete(entry)}
            disabled={deleteDisabled}
            className={[
              "inline-flex h-8 items-center rounded-lg border px-3 text-[13px] font-medium transition",
              deleteDisabled
                ? "cursor-not-allowed border-[#e5e7eb] bg-[#f9fafb] text-[#9ca3af]"
                : "border-[#fecaca] bg-[#fef2f2] text-[#b91c1c] hover:bg-[#fee2e2]",
            ].join(" ")}
          >
            {deletePending ? "Deleting..." : "Delete"}
          </button>
          <button
            type="button"
            onClick={() => onToggleExpanded(entry.id)}
            className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] font-medium text-[#111827] transition hover:bg-[#f9fafb]"
          >
            {expanded ? "Hide" : "Details"}
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="space-y-3 border-t border-[#e5e7eb] px-4 py-3">
          {entry.note ? (
            <p className="text-sm leading-5 text-[#4b5563]">{entry.note}</p>
          ) : (
            <p className="text-sm leading-5 text-[#6b7280]">No extra description has been added for this route.</p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">Location</p>
              <p className="text-sm leading-5 text-[#111827]">{entry.breadcrumb}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">Delete status</p>
              <p className="text-sm leading-5 text-[#111827]">
                {entry.deletable
                  ? "This row can be deleted directly from the sitemap."
                  : entry.deleteReason ?? "This route is not deletable from the sitemap."}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SitemapGroupCard({
  group,
  selectedIds,
  expandedRowIds,
  pendingEntryId,
  onToggleExpandedRow,
  onToggleSelected,
  onDelete,
}: {
  group: AdminSitemapGroup;
  selectedIds: string[];
  expandedRowIds: string[];
  pendingEntryId: string | null;
  onToggleExpandedRow: (entryId: string) => void;
  onToggleSelected: (entryId: string) => void;
  onDelete: (entry: AdminSitemapEntry) => void;
}) {
  const selectedCount = getGroupSelectedCount(group, selectedIds);

  return (
    <details className="rounded-xl border border-[#dbe3ed] bg-[#f8fafc]">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3">
        <div className="space-y-1">
          <p className="text-[13px] font-semibold text-[#111827]">{group.title}</p>
          <p className="text-xs leading-5 text-[#6b7280]">{group.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {selectedCount ? (
            <span className="rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-2.5 py-1 text-[11px] font-medium text-[#1d4ed8]">
              {selectedCount} selected
            </span>
          ) : null}
          <span className="rounded-full border border-[#d1d5db] bg-white px-2.5 py-1 text-[11px] font-medium text-[#4b5563]">
            {group.items.length}
          </span>
        </div>
      </summary>

      <div className="space-y-3 border-t border-[#e5e7eb] p-3">
        {group.items.length ? (
          group.items.map((entry) => (
            <SitemapRow
              key={entry.id}
              entry={entry}
              expanded={expandedRowIds.includes(entry.id)}
              selected={selectedIds.includes(entry.id)}
              onToggleExpanded={onToggleExpandedRow}
              onToggleSelected={onToggleSelected}
              onDelete={onDelete}
              deletePending={pendingEntryId === entry.id}
            />
          ))
        ) : (
          <AdminEmptyState
            title={`No ${group.title.toLowerCase()} right now`}
            description="This part of the tree is currently empty."
          />
        )}
      </div>
    </details>
  );
}

export function AdminSitemapClient({
  initialAudit,
}: {
  initialAudit: AdminSitemapAudit;
}) {
  const router = useRouter();
  const [sections, setSections] = useState(initialAudit.sections);
  const [cleanupCandidates, setCleanupCandidates] = useState(initialAudit.cleanupCandidates);
  const [banner, setBanner] = useState<{
    tone: "success" | "danger";
    text: string;
  } | null>(null);
  const [pendingEntryId, setPendingEntryId] = useState<string | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedRowIds, setExpandedRowIds] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  const allEntries = useMemo(
    () => [...cleanupCandidates, ...flattenEntries(sections)],
    [cleanupCandidates, sections],
  );
  const selectedEntries = useMemo(
    () => allEntries.filter((entry) => selectedIds.includes(entry.id)),
    [allEntries, selectedIds],
  );
  const deletableSelectedEntries = useMemo(
    () => selectedEntries.filter((entry) => entry.deletable && entry.family && entry.slug),
    [selectedEntries],
  );

  function toggleSelected(entryId: string) {
    setSelectedIds((current) =>
      current.includes(entryId)
        ? current.filter((item) => item !== entryId)
        : [...current, entryId],
    );
  }

  function toggleExpandedRow(entryId: string) {
    setExpandedRowIds((current) =>
      current.includes(entryId)
        ? current.filter((item) => item !== entryId)
        : [...current, entryId],
    );
  }

  async function deleteEntries(entries: AdminSitemapEntry[]) {
    const deletableEntries = entries.filter(
      (entry): entry is AdminSitemapEntry & { family: NonNullable<AdminSitemapEntry["family"]>; slug: NonNullable<AdminSitemapEntry["slug"]> } =>
        Boolean(entry.deletable && entry.family && entry.slug),
    );
    const skippedCount = entries.length - deletableEntries.length;

    if (!deletableEntries.length) {
      setBanner({
        tone: "danger",
        text: "Selected routes are not deletable from the sitemap. Only manual-only records can be removed here.",
      });
      return;
    }

    const deletedIds = new Set<string>();
    const failures: string[] = [];

    for (const entry of deletableEntries) {
      const response = await fetch("/api/admin/operator-console/records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "delete",
          family: entry.family,
          slug: entry.slug,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        failures.push(`${entry.title}: ${payload?.error || "Delete failed."}`);
        continue;
      }

      deletedIds.add(entry.id);
    }

    if (deletedIds.size) {
      setSections((current) => removeEntriesFromSections(current, deletedIds));
      setCleanupCandidates((current) => current.filter((entry) => !deletedIds.has(entry.id)));
      setSelectedIds((current) => current.filter((entryId) => !deletedIds.has(entryId)));
      setExpandedRowIds((current) => current.filter((entryId) => !deletedIds.has(entryId)));
      startTransition(() => {
        router.refresh();
      });
    }

    if (failures.length) {
      setBanner({
        tone: "danger",
        text: [
          deletedIds.size ? `Deleted ${deletedIds.size} route${deletedIds.size === 1 ? "" : "s"}.` : null,
          skippedCount ? `Skipped ${skippedCount} locked route${skippedCount === 1 ? "" : "s"}.` : null,
          failures[0],
        ]
          .filter(Boolean)
          .join(" "),
      });
      return;
    }

    setBanner({
      tone: "success",
      text: [
        `Deleted ${deletedIds.size} route${deletedIds.size === 1 ? "" : "s"} from the operator store.`,
        skippedCount ? `Skipped ${skippedCount} locked route${skippedCount === 1 ? "" : "s"}.` : null,
      ]
        .filter(Boolean)
        .join(" "),
    });
  }

  async function handleDelete(entry: AdminSitemapEntry) {
    const confirmed = window.confirm(
      `Delete ${entry.title}? This should only be used for manual junk or draft records.`,
    );

    if (!confirmed) {
      return;
    }

    setPendingEntryId(entry.id);
    setBanner(null);

    try {
      await deleteEntries([entry]);
    } finally {
      setPendingEntryId(null);
    }
  }

  async function handleDeleteSelected() {
    const confirmed = window.confirm(
      `Delete ${deletableSelectedEntries.length} selected route${deletableSelectedEntries.length === 1 ? "" : "s"}? Only manual-only rows will be removed.`,
    );

    if (!confirmed) {
      return;
    }

    setPendingBulkDelete(true);
    setBanner(null);

    try {
      await deleteEntries(selectedEntries);
    } finally {
      setPendingBulkDelete(false);
    }
  }

  return (
    <div className="space-y-[15px]">
      {banner ? (
        <div
          className={
            banner.tone === "success"
              ? "rounded-xl border border-[#bbf7d0] bg-[#ecfdf5] px-4 py-3 text-sm text-[#166534]"
              : "rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]"
          }
        >
          {banner.text}
        </div>
      ) : null}

      <AdminSectionCard
        title="Selection actions"
        description="Use row checkboxes across stocks, tools, trackers, and other route families, then delete only the manual-only routes that are actually safe to remove."
        tone="compact"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-[#111827]">
              {selectedEntries.length} route{selectedEntries.length === 1 ? "" : "s"} selected
            </p>
            <p className="text-sm leading-5 text-[#4b5563]">
              {deletableSelectedEntries.length
                ? `${deletableSelectedEntries.length} selected route${deletableSelectedEntries.length === 1 ? "" : "s"} can be deleted directly from this page.`
                : "Static, pattern, internal, and source-backed routes stay selectable for review, but only manual-only routes can be deleted here."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              disabled={!selectedEntries.length || pendingBulkDelete}
              className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] font-medium text-[#111827] transition hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Clear selection
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={!deletableSelectedEntries.length || pendingBulkDelete}
              className="inline-flex h-8 items-center rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 text-[13px] font-medium text-[#b91c1c] transition hover:bg-[#fee2e2] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendingBulkDelete ? "Deleting..." : "Delete selected"}
            </button>
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="Cleanup candidates"
        description="Manual-only records that do not have source-backed public pages. Open this only when you want to review junk or draft rows that are safest to delete."
        collapsible
        defaultOpen={cleanupCandidates.length > 0}
      >
        {cleanupCandidates.length ? (
          <div className="space-y-3">
            {cleanupCandidates.map((entry) => (
              <SitemapRow
                key={entry.id}
                entry={entry}
                expanded={expandedRowIds.includes(entry.id)}
                selected={selectedIds.includes(entry.id)}
                onToggleExpanded={toggleExpandedRow}
                onToggleSelected={toggleSelected}
                onDelete={handleDelete}
                deletePending={pendingEntryId === entry.id}
              />
            ))}
          </div>
        ) : (
          <AdminEmptyState
            title="No cleanup candidates right now"
            description="The operator store is currently free of manual-only draft records that look like junk pages."
          />
        )}
      </AdminSectionCard>

      {sections.map((section) => (
        <AdminSectionCard
          key={section.id}
          title={section.title}
          description={`${section.description} Open this only when you want to inspect or act on that part of the route tree.`}
          collapsible
          defaultOpen={false}
        >
          <div className="space-y-3">
            {section.groups.map((group) => (
              <SitemapGroupCard
                key={group.id}
                group={group}
                selectedIds={selectedIds}
                expandedRowIds={expandedRowIds}
                pendingEntryId={pendingEntryId}
                onToggleExpandedRow={toggleExpandedRow}
                onToggleSelected={toggleSelected}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </AdminSectionCard>
      ))}
    </div>
  );
}
