"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AdminBadge, AdminEmptyState } from "@/components/admin/admin-primitives";
import type { AdminActivityLogEntry } from "@/lib/admin-activity-log";
import {
  formatAdminActivityTarget,
  getAdminActivityActionTone,
  getAdminActivityActorLabel,
  getAdminActivityTargetHref,
} from "@/lib/admin-activity-presentation";
import { formatAdminDateTime } from "@/lib/admin-time";

const PAGE_SIZE = 5;

function humanizeAction(actionType: string) {
  return actionType.replaceAll(".", " · ").replaceAll("_", " ");
}

function getChangedFieldSummary(entry: AdminActivityLogEntry) {
  const changedFields = Array.isArray(entry.metadata.changedFields)
    ? entry.metadata.changedFields.filter((field): field is string => typeof field === "string")
    : [];

  if (!changedFields.length) {
    return null;
  }

  return changedFields.slice(0, 6).join(", ");
}

function getImportSummary(entry: AdminActivityLogEntry) {
  const fileName =
    typeof entry.metadata.fileName === "string" ? entry.metadata.fileName : null;
  const createdCount =
    typeof entry.metadata.createdCount === "number" ? entry.metadata.createdCount : null;
  const updatedCount =
    typeof entry.metadata.updatedCount === "number" ? entry.metadata.updatedCount : null;
  const queuedCount =
    typeof entry.metadata.queuedCount === "number" ? entry.metadata.queuedCount : null;
  const failedCount =
    typeof entry.metadata.failedCount === "number" ? entry.metadata.failedCount : null;

  if (!fileName && createdCount === null && updatedCount === null && queuedCount === null && failedCount === null) {
    return null;
  }

  return [
    fileName ? `File: ${fileName}` : null,
    createdCount !== null ? `Created: ${createdCount}` : null,
    updatedCount !== null ? `Updated: ${updatedCount}` : null,
    queuedCount !== null ? `Queued: ${queuedCount}` : null,
    failedCount !== null ? `Failed: ${failedCount}` : null,
  ]
    .filter(Boolean)
    .join(" • ");
}

export function AdminDashboardRecentEdits({
  entries,
  className,
  entryClassName,
}: {
  entries: AdminActivityLogEntry[];
  className?: string;
  entryClassName?: string;
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const visibleEntries = useMemo(
    () => entries.slice(0, visibleCount),
    [entries, visibleCount],
  );
  const hasMore = visibleCount < entries.length;
  const canCollapse = visibleCount > PAGE_SIZE;

  if (!entries.length) {
    return (
      <AdminEmptyState
        title="No recent edits yet"
        description="As soon as editors or admins save content and key settings, the latest changes will appear here."
        className={entryClassName}
      />
    );
  }

  return (
    <div className={clsx("space-y-2.5", className)}>
      {visibleEntries.map((entry) => {
        const isExpanded = expandedIds.includes(entry.id);
        const changedFieldSummary = getChangedFieldSummary(entry);
        const importSummary = getImportSummary(entry);
        const targetHref = getAdminActivityTargetHref(entry);

        return (
          <div
            key={entry.id}
            className={clsx(
              "rounded-lg border border-[#d1d5db] bg-[#f8fafc] p-[14px] shadow-sm",
              entryClassName,
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1.5">
                <p className="font-semibold text-[#111827]">{entry.summary}</p>
                <p className="text-sm leading-5 text-[#4b5563]">
                  {getAdminActivityActorLabel(entry)} • {formatAdminDateTime(entry.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <AdminBadge
                  label={humanizeAction(entry.actionType)}
                  tone={getAdminActivityActionTone(entry.actionType)}
                />
                <button
                  type="button"
                  onClick={() =>
                    setExpandedIds((current) =>
                      isExpanded
                        ? current.filter((id) => id !== entry.id)
                        : [...current, entry.id],
                    )
                  }
                  className="text-sm font-medium text-[#2e4a7d] transition hover:text-[#1f3760]"
                >
                  {isExpanded ? "Hide details" : "Show details"}
                </button>
              </div>
            </div>

            {isExpanded ? (
              <div className="mt-3 space-y-2 border-t border-[#e5e7eb] pt-3 text-sm leading-5 text-[#4b5563]">
                <p>
                  Target:{" "}
                  <span className="font-medium text-[#111827]">
                    {formatAdminActivityTarget(entry)}
                  </span>
                </p>

                {changedFieldSummary ? (
                  <p>
                    Changed fields:{" "}
                    <span className="text-[#111827]">{changedFieldSummary}</span>
                  </p>
                ) : null}

                {importSummary ? <p>{importSummary}</p> : null}

                {targetHref ? (
                  <div className="pt-0.5">
                    <Link
                      href={targetHref}
                      className="text-sm font-medium text-[#2e4a7d] transition hover:text-[#1f3760]"
                    >
                      Open affected page
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}

      {hasMore || canCollapse ? (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {hasMore ? (
            <button
              type="button"
              onClick={() =>
                setVisibleCount((current) => Math.min(current + PAGE_SIZE, entries.length))
              }
              className="text-sm font-medium text-[#d4853b] transition hover:text-[#b86c25]"
            >
              Show 5 more
            </button>
          ) : null}
          {canCollapse ? (
            <button
              type="button"
              onClick={() => setVisibleCount(PAGE_SIZE)}
              className="text-sm font-medium text-[#6b7280] transition hover:text-[#111827]"
            >
              Show less
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
