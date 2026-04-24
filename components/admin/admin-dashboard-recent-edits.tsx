"use client";

import { clsx } from "clsx";
import { useMemo, useState } from "react";

import { AdminBadge, AdminEmptyState } from "@/components/admin/admin-primitives";
import type { AdminActivityLogEntry } from "@/lib/admin-activity-log";
import { getAdminActivityActorLabel } from "@/lib/admin-activity-presentation";
import { formatAdminDateTime } from "@/lib/admin-time";

const PAGE_SIZE = 5;

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
      {visibleEntries.map((entry) => (
        <div
          key={entry.id}
          className={clsx(
            "rounded-lg border border-[#d1d5db] bg-[#f8fafc] p-[14px] shadow-sm",
            entryClassName,
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-[#111827]">{entry.summary}</p>
            <AdminBadge
              label={entry.actionType.replaceAll(".", " · ").replaceAll("_", " ")}
              tone={
                entry.actionType.includes("publish")
                  ? "success"
                  : entry.actionType.includes("archive")
                    ? "danger"
                    : "info"
              }
            />
          </div>
          <p className="mt-1.5 text-sm leading-5 text-[#4b5563]">
            {getAdminActivityActorLabel(entry)} • {formatAdminDateTime(entry.createdAt)}
          </p>
        </div>
      ))}

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
