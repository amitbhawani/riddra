"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  type AdminActivityGroupBy,
  type AdminActivityLogEntry,
} from "@/lib/admin-activity-log";
import {
  getAdminActivityActorContext,
  getAdminActivityActorLabel,
  formatAdminActivityTarget,
  getAdminActivityActionTone,
  getAdminActivityRevertHref,
  getAdminActivityTargetHref,
} from "@/lib/admin-activity-presentation";
import { formatAdminDateLabel, formatAdminDateTime } from "@/lib/admin-time";
import {
  AdminBadge,
  AdminEmptyState,
  AdminSectionCard,
  AdminSimpleTable,
} from "@/components/admin/admin-primitives";

type ActivityBrowserMode = "activity" | "change-log";

function humanizeAction(actionType: string) {
  return actionType.replaceAll(".", " · ").replaceAll("_", " ");
}

function getPageFilterValue(entry: AdminActivityLogEntry) {
  return getAdminActivityTargetHref(entry) ?? `${entry.targetType}:${formatAdminActivityTarget(entry)}`;
}

function getPageFilterLabel(entry: AdminActivityLogEntry) {
  const href = getAdminActivityTargetHref(entry);
  const target = formatAdminActivityTarget(entry);
  return href ? `${target} (${href})` : target;
}

function getGroupMeta(entry: AdminActivityLogEntry, groupBy: AdminActivityGroupBy) {
  if (groupBy === "user") {
    return {
      key: getAdminActivityActorLabel(entry),
      label: getAdminActivityActorLabel(entry),
    };
  }

  if (groupBy === "page") {
    return {
      key: getPageFilterValue(entry),
      label: getPageFilterLabel(entry),
    };
  }

  if (groupBy === "action") {
    return {
      key: entry.actionType,
      label: humanizeAction(entry.actionType),
    };
  }

  return {
    key: formatAdminDateLabel(entry.createdAt),
    label: formatAdminDateLabel(entry.createdAt),
  };
}

export function AdminActivityLogBrowser({
  entries,
  mode,
}: {
  entries: AdminActivityLogEntry[];
  mode: ActivityBrowserMode;
}) {
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedPage, setSelectedPage] = useState("all");
  const [selectedAction, setSelectedAction] = useState("all");
  const [groupBy, setGroupBy] = useState<AdminActivityGroupBy>("day");

  const sortedEntries = useMemo(
    () =>
      [...entries].sort((left, right) => {
        const createdAtOrder = right.createdAt.localeCompare(left.createdAt);
        if (createdAtOrder !== 0) {
          return createdAtOrder;
        }

        return right.id.localeCompare(left.id);
      }),
    [entries],
  );

  const userOptions = Array.from(
    new Set(sortedEntries.map((entry) => getAdminActivityActorLabel(entry)).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));
  const pageOptions = Array.from(
    new Map(
      sortedEntries.map((entry) => [getPageFilterValue(entry), getPageFilterLabel(entry)]),
    ).entries(),
  );
  const actionOptions = Array.from(new Set(sortedEntries.map((entry) => entry.actionType))).sort();

  const filteredEntries = sortedEntries.filter((entry) => {
    if (selectedUser !== "all" && getAdminActivityActorLabel(entry) !== selectedUser) {
      return false;
    }

    if (selectedPage !== "all" && getPageFilterValue(entry) !== selectedPage) {
      return false;
    }

    if (selectedAction !== "all" && entry.actionType !== selectedAction) {
      return false;
    }

    return true;
  });

  const groups = useMemo(() => {
    const grouped = filteredEntries.reduce<
      Map<string, { key: string; label: string; entries: AdminActivityLogEntry[] }>
    >((collection, entry) => {
      const { key, label } = getGroupMeta(entry, groupBy);
      const existing = collection.get(key);
      if (existing) {
        existing.entries.push(entry);
        return collection;
      }

      collection.set(key, { key, label, entries: [entry] });
      return collection;
    }, new Map());

    return Array.from(grouped.values())
      .map((group) => ({
        ...group,
        entries: [...group.entries].sort((left, right) => {
          const createdAtOrder = right.createdAt.localeCompare(left.createdAt);
          if (createdAtOrder !== 0) {
            return createdAtOrder;
          }

          return right.id.localeCompare(left.id);
        }),
      }))
      .sort((left, right) => {
        const leftNewest = left.entries[0]?.createdAt ?? "";
        const rightNewest = right.entries[0]?.createdAt ?? "";
        const createdAtOrder = rightNewest.localeCompare(leftNewest);
        if (createdAtOrder !== 0) {
          return createdAtOrder;
        }

        return right.key.localeCompare(left.key);
      });
  }, [filteredEntries, groupBy]);

  return (
    <div className="space-y-3">
      <AdminSectionCard
        title={mode === "activity" ? "Find activity quickly" : "Filter saved changes"}
        description={
          mode === "activity"
            ? "Start with the main grouping, then open the extra filters only when you need to narrow the trail further."
            : "Start with the person filter, then open the extra filters only when you need to narrow the saved changes further."
        }
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-1">
            <span className="text-[12px] font-medium text-[#4b5563]">User</span>
            <select
              value={selectedUser}
              onChange={(event) => setSelectedUser(event.target.value)}
              className="h-10 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] text-[#111827]"
            >
              <option value="all">All users</option>
              {userOptions.map((user) => (
                <option key={user} value={user}>
                  {user}
                </option>
              ))}
            </select>
          </label>

          {mode === "activity" ? (
            <label className="space-y-1">
              <span className="text-[12px] font-medium text-[#4b5563]">Group by</span>
              <select
                value={groupBy}
                onChange={(event) => setGroupBy(event.target.value as AdminActivityGroupBy)}
                className="h-10 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] text-[#111827]"
              >
                <option value="day">Day</option>
                <option value="user">User</option>
                <option value="page">Page</option>
                <option value="action">Action</option>
              </select>
            </label>
          ) : (
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedUser("all");
                  setSelectedPage("all");
                  setSelectedAction("all");
                }}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] font-medium text-[#111827]"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
        <details className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc]">
          <summary className="cursor-pointer list-none px-3 py-2 text-[12px] font-medium text-[#111827]">
            More filters
          </summary>
          <div className="grid gap-3 border-t border-[#e5e7eb] px-3 py-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[12px] font-medium text-[#4b5563]">Page</span>
              <select
                value={selectedPage}
                onChange={(event) => setSelectedPage(event.target.value)}
                className="h-10 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] text-[#111827]"
              >
                <option value="all">All pages</option>
                {pageOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[12px] font-medium text-[#4b5563]">Action</span>
              <select
                value={selectedAction}
                onChange={(event) => setSelectedAction(event.target.value)}
                className="h-10 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] text-[#111827]"
              >
                <option value="all">All actions</option>
                {actionOptions.map((action) => (
                  <option key={action} value={action}>
                    {humanizeAction(action)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </details>
        {mode === "activity" ? (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                setSelectedUser("all");
                setSelectedPage("all");
                setSelectedAction("all");
                setGroupBy("day");
              }}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827]"
            >
              Clear filters
            </button>
          </div>
        ) : null}
      </AdminSectionCard>

      {filteredEntries.length ? (
        mode === "activity" ? (
          groups.map((group) => (
            <AdminSectionCard
              key={group.key}
              title={group.label}
              description={`${group.entries.length} logged action${group.entries.length === 1 ? "" : "s"} in this group.`}
            >
              <div className="space-y-2.5">
                {group.entries.map((entry) => {
                  const targetHref = getAdminActivityTargetHref(entry);
                  const revertHref = getAdminActivityRevertHref(entry);
                  return (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-[#d1d5db] bg-[#f8fafc] p-[14px] shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <AdminBadge
                              label={humanizeAction(entry.actionType)}
                              tone={getAdminActivityActionTone(entry.actionType)}
                            />
                            <span className="text-[12px] text-[#6b7280]">
                              {formatAdminDateTime(entry.createdAt)}
                            </span>
                          </div>
                          <p className="text-[13px] font-medium text-[#111827]">
                            {formatAdminActivityTarget(entry)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {targetHref ? (
                            <Link
                              href={targetHref}
                              className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827]"
                            >
                              Open page
                            </Link>
                          ) : null}
                          {revertHref ? (
                            <Link
                              href={revertHref}
                              className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827]"
                            >
                              Quick revert
                            </Link>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-2 text-[13px] leading-5 text-[#4b5563]">{entry.summary}</p>
                      <p className="mt-1 text-[12px] leading-5 text-[#6b7280]">
                        {getAdminActivityActorLabel(entry)} • {entry.targetType.replaceAll("_", " ")}
                      </p>
                    </div>
                  );
                })}
              </div>
            </AdminSectionCard>
          ))
        ) : (
          <AdminSectionCard
            title="Change history"
            description="All saved changes are listed newest first so managers can see what changed and jump straight into the affected page."
          >
            <AdminSimpleTable
              columns={["When", "User", "Page", "Action", "Summary", "Open"]}
              rows={filteredEntries.map((entry) => {
                const targetHref = getAdminActivityTargetHref(entry);
                const revertHref = getAdminActivityRevertHref(entry);
                return [
                  <span key={`${entry.id}-when`}>{formatAdminDateTime(entry.createdAt)}</span>,
                  <div key={`${entry.id}-user`} className="space-y-1">
                    <p className="font-medium text-[#111827]">{getAdminActivityActorLabel(entry)}</p>
                    <p className="text-[12px] text-[#6b7280]">{getAdminActivityActorContext(entry)}</p>
                  </div>,
                  <div key={`${entry.id}-page`} className="space-y-1">
                    <p className="font-medium text-[#111827]">{formatAdminActivityTarget(entry)}</p>
                    <p className="text-[12px] text-[#6b7280]">{entry.targetType.replaceAll("_", " ")}</p>
                  </div>,
                  <AdminBadge
                    key={`${entry.id}-action`}
                    label={humanizeAction(entry.actionType)}
                    tone={getAdminActivityActionTone(entry.actionType)}
                  />,
                  <p key={`${entry.id}-summary`} className="text-[13px] leading-5 text-[#4b5563]">
                    {entry.summary}
                  </p>,
                  <div key={`${entry.id}-open`} className="flex flex-col items-start gap-2">
                    {targetHref ? (
                      <Link
                        href={targetHref}
                        className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827]"
                      >
                        Open page
                      </Link>
                    ) : null}
                    {revertHref ? (
                      <Link
                        href={revertHref}
                        className="inline-flex h-8 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-[#111827]"
                      >
                        Quick revert
                      </Link>
                    ) : null}
                  </div>,
                ];
              })}
            />
          </AdminSectionCard>
        )
      ) : (
        <AdminEmptyState
          title={mode === "activity" ? "No activity matches these filters" : "No saved changes match these filters"}
          description={
            mode === "activity"
              ? "Try clearing one or more filters to bring the broader audit trail back into view."
              : "Try clearing the user, page, or action filters to see more saved changes."
          }
        />
      )}
    </div>
  );
}
