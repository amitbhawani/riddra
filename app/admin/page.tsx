import type { Metadata } from "next";

import {
  AdminActionLink,
  AdminBadge,
  AdminEmptyState,
  AdminPageFrame,
  AdminPageHeader,
  AdminSectionCard,
  AdminSimpleTable,
  AdminStatGrid,
} from "@/components/admin/admin-primitives";
import { AdminDashboardRecentEdits } from "@/components/admin/admin-dashboard-recent-edits";
import { AdminGuidanceCard } from "@/components/admin/admin-operator-notices";
import { listAdminActivityLog } from "@/lib/admin-activity-log";
import { listAdminPendingApprovals } from "@/lib/admin-approvals";
import { adminContentFamilies } from "@/lib/admin-navigation";
import { getAdminFamilyRows, type AdminFamilyKey } from "@/lib/admin-content-registry";
import { adminFamilyMeta } from "@/lib/admin-content-schema";
import { getAdminOperatorStore } from "@/lib/admin-operator-store";
import { formatAdminDateTime } from "@/lib/admin-time";
import { requireOperator } from "@/lib/auth";
import {
  canEditAdminFamily,
  hasProductUserCapability,
} from "@/lib/product-permissions";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Content-manager-first dashboard for assigned work, incomplete pages, stale data, and recent edits.",
};

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const { user, role, capabilities } = await requireOperator();
  const [store, activityEntries, pendingApprovals] = await Promise.all([
    getAdminOperatorStore(),
    listAdminActivityLog(50),
    role === "admin" ? listAdminPendingApprovals({ decision: "pending" }) : Promise.resolve([]),
  ]);

  const familyEntries = adminContentFamilies.filter(
    (item): item is (typeof adminContentFamilies)[number] & { href: `/admin/content/${AdminFamilyKey}` } =>
      item.href.startsWith("/admin/content/") &&
      canEditAdminFamily(
        role,
        capabilities,
        item.href.replace("/admin/content/", "") as AdminFamilyKey,
      ),
  );

  const familyRows = await Promise.all(
    familyEntries.map(async (family) => {
      const familyKey = family.href.replace("/admin/content/", "") as AdminFamilyKey;
      const rows = await getAdminFamilyRows(familyKey, store.records, {
        cacheKey: store.updatedAt,
      });
      return {
        familyKey,
        rows,
      };
    }),
  );

  const allRows = familyRows.flatMap((entry) => entry.rows);
  const assignedRows = allRows
    .filter((row) => row.assignedTo?.toLowerCase() === (user.email ?? "").toLowerCase())
    .sort((left, right) => {
      if (left.dueDate && right.dueDate) {
        return left.dueDate.localeCompare(right.dueDate);
      }

      if (left.dueDate) {
        return -1;
      }

      if (right.dueDate) {
        return 1;
      }

      return left.title.localeCompare(right.title);
    });
  const incompleteRows = allRows
    .filter((row) => row.missingCriticalCount > 0 || row.missingImportantCount > 0)
    .sort(
      (left, right) =>
        right.missingCriticalCount - left.missingCriticalCount ||
        right.missingImportantCount - left.missingImportantCount ||
        left.completenessPercent - right.completenessPercent,
    );
  const staleRows = allRows
    .filter((row) => row.isStale)
    .sort((left, right) => right.lastUpdated.localeCompare(left.lastUpdated));
  const recentEdits = activityEntries.filter((entry) =>
    ["content.", "settings.", "membership.", "override.", "user."].some((prefix) =>
      entry.actionType.startsWith(prefix),
    ),
  );

  const dashboardCanvasClassName =
    "rounded-[28px] bg-[#e9eef4] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] sm:px-5 sm:py-5 xl:px-6 xl:py-6 space-y-[18px]";
  const dashboardCardClassName =
    "border-[#dbe3ed] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)]";
  const dashboardInsetCardClassName =
    "rounded-xl border border-[#dbe3ed] bg-white p-[14px] shadow-[0_8px_20px_rgba(15,23,42,0.05)]";
  const dashboardGridGapClassName = "gap-[15px]";

  return (
    <AdminPageFrame className={dashboardCanvasClassName}>
      <AdminPageHeader
        eyebrow="Dashboard"
        title="Admin dashboard"
        description="Use this page as the calm starting point for editorial work: what is assigned, what is incomplete, what looks stale, and what changed recently."
        actions={
          <>
            <AdminActionLink href="/admin/content" label="Open content" tone="primary" />
            <AdminActionLink href="/admin/activity-log" label="Open activity log" />
          </>
        }
      />

      <AdminGuidanceCard
        title="Start here"
        description="Pick the area that matches the task instead of digging through the whole admin."
        className={dashboardCardClassName}
        items={[
          "Open Content to edit pages, use Media Library for shared assets, and use Activity Log when you need to confirm a recent change.",
          role === "admin"
            ? "Admins can also check Users, Memberships, System Health, and Readiness when the work is broader than page editing."
            : "Editors can stay focused on pages, media, recent activity, and help without needing the heavier operator tools.",
        ]}
        links={[
          { href: "/admin/content", label: "Content", tone: "primary" },
          ...(hasProductUserCapability(role, capabilities, "can_manage_media")
            ? [{ href: "/admin/media-library", label: "Media" as const }]
            : []),
          { href: "/admin/activity-log", label: "Activity Log" },
          { href: "/admin/help", label: "Help" },
          ...(role === "admin"
            ? [
                { href: "/admin/users", label: "Users" as const },
                { href: "/admin/memberships", label: "Memberships" as const },
                { href: "/admin/system-health", label: "System Health" as const },
                { href: "/admin/readiness", label: "Readiness" as const },
              ]
            : []),
        ]}
      />

      <AdminStatGrid
        className={dashboardGridGapClassName}
        cardClassName={dashboardCardClassName}
        stats={[
          {
            label: "Assigned to me",
            value: String(assignedRows.length),
            note: "Records that currently name you as the assignee.",
          },
          {
            label: "Incomplete pages",
            value: String(incompleteRows.length),
            note: "Pages still missing critical or important fields.",
          },
          ...(role === "admin"
            ? [
                {
                  label: "Pending approvals",
                  value: String(pendingApprovals.length),
                  note: "Editor-submitted changes still waiting for an admin decision.",
                },
              ]
            : []),
          {
            label: "Stale data",
            value: String(staleRows.length),
            note: "Pages whose source or refresh posture needs follow-up.",
          },
          {
            label: "Recent edits",
            value: String(recentEdits.slice(0, 8).length),
            note: "The latest saved changes across content and key admin areas.",
          },
        ]}
      />

      <div className={`grid xl:grid-cols-2 ${dashboardGridGapClassName}`}>
        <AdminSectionCard
          title="Assigned tasks"
          description="Pages with your name on them appear here first so you do not need to search the content workspace."
          className={dashboardCardClassName}
        >
          {assignedRows.length ? (
            <div className="space-y-2.5">
              {assignedRows.slice(0, 6).map((row) => (
                <div
                  key={`${row.family}-${row.slug}`}
                  className={dashboardInsetCardClassName}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-[#111827]">{row.title}</p>
                    <AdminBadge
                      label={row.publishState.replaceAll("_", " ")}
                      tone={
                        row.publishState === "published"
                          ? "success"
                          : row.publishState === "archived"
                            ? "danger"
                            : "warning"
                      }
                    />
                  </div>
                  <p className="mt-1.5 text-sm leading-5 text-[#4b5563]">
                    {row.familyLabel} • {row.slug}
                  </p>
                  <p className="mt-1 text-[12px] text-[#6b7280]">
                    Due: {formatAdminDateTime(row.dueDate, "No due date")}
                  </p>
                  <div className="mt-2.5">
                    <AdminActionLink href={`/admin/content/${row.family}/${row.slug}`} label="Open page" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <AdminEmptyState
              title="Nothing is assigned to you right now"
              description="When a page is assigned to your email, it will appear here with its due date and workflow status."
              className={dashboardInsetCardClassName}
            />
          )}
        </AdminSectionCard>

        <AdminSectionCard
          title={role === "admin" ? "Pending approvals" : "Incomplete pages"}
          description={
            role === "admin"
              ? "Admin review work stays near the top so queued editor changes do not get buried."
              : "Use this list to find pages that still need core content before they are ready for review or publishing."
          }
          className={dashboardCardClassName}
        >
          {role === "admin" ? (
            pendingApprovals.length ? (
              <div className="space-y-2.5">
                {pendingApprovals.slice(0, 6).map((approval) => (
                  <div
                    key={approval.id}
                    className={dashboardInsetCardClassName}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-[#111827]">{approval.title}</p>
                      <AdminBadge label={approval.targetStatus.replaceAll("_", " ")} tone="warning" />
                    </div>
                    <p className="mt-1.5 text-sm leading-5 text-[#4b5563]">{approval.summary}</p>
                    <p className="mt-1 text-[12px] text-[#6b7280]">
                      {approval.family} • {approval.slug} • {approval.submittedByEmail}
                    </p>
                    <div className="mt-2.5">
                      <AdminActionLink href="/admin/approvals" label="Open approvals" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <AdminEmptyState
                title="No approvals are waiting right now"
                description="Editor-submitted changes will appear here as soon as someone sends a draft forward."
                className={dashboardInsetCardClassName}
              />
            )
          ) : incompleteRows.length ? (
            <AdminSimpleTable
              columns={["Page", "Status", "Completeness", "Missing", "Open page"]}
              rows={incompleteRows.slice(0, 8).map((row) => [
                <div key={`${row.family}-${row.slug}-page`} className="space-y-1">
                  <p className="font-medium text-[#111827]">{row.title}</p>
                  <p className="text-[12px] text-[#6b7280]">
                    {row.familyLabel} • {row.slug}
                  </p>
                </div>,
                <AdminBadge
                  key={`${row.family}-${row.slug}-status`}
                  label={row.publishState.replaceAll("_", " ")}
                  tone={row.publishState === "needs_fix" ? "danger" : "warning"}
                />,
                <div key={`${row.family}-${row.slug}-completeness`} className="space-y-1">
                  <p className="font-medium text-[#111827]">{row.completenessPercent}%</p>
                  <p className="text-[12px] text-[#6b7280]">
                    {row.completedFields}/{row.totalTrackedFields} tracked fields
                  </p>
                </div>,
                <div key={`${row.family}-${row.slug}-missing`} className="space-y-1">
                  <p className="text-[12px] text-[#6b7280]">
                    Critical: {row.missingCriticalCount}
                  </p>
                  <p className="text-[12px] text-[#6b7280]">
                    Important: {row.missingImportantCount}
                  </p>
                </div>,
                <AdminActionLink
                  key={`${row.family}-${row.slug}-open`}
                  href={`/admin/content/${row.family}/${row.slug}`}
                  label="Open page"
                />,
              ])}
            />
          ) : (
            <AdminEmptyState
              title="No incomplete pages in your visible families"
              description="Missing critical or important fields will surface here automatically when a page still needs work."
              className={dashboardInsetCardClassName}
            />
          )}
        </AdminSectionCard>
      </div>

      <div className={`grid xl:grid-cols-2 ${dashboardGridGapClassName}`}>
        {role === "admin" ? (
          <AdminSectionCard
            title="Incomplete pages"
            description="Use this list to find pages that still need core content before they are ready for review or publishing."
            className={dashboardCardClassName}
          >
            {incompleteRows.length ? (
              <AdminSimpleTable
                columns={["Page", "Status", "Completeness", "Missing", "Open page"]}
                rows={incompleteRows.slice(0, 8).map((row) => [
                  <div key={`${row.family}-${row.slug}-page`} className="space-y-1">
                    <p className="font-medium text-[#111827]">{row.title}</p>
                    <p className="text-[12px] text-[#6b7280]">
                      {row.familyLabel} • {row.slug}
                    </p>
                  </div>,
                  <AdminBadge
                    key={`${row.family}-${row.slug}-status`}
                    label={row.publishState.replaceAll("_", " ")}
                    tone={row.publishState === "needs_fix" ? "danger" : "warning"}
                  />,
                  <div key={`${row.family}-${row.slug}-completeness`} className="space-y-1">
                    <p className="font-medium text-[#111827]">{row.completenessPercent}%</p>
                    <p className="text-[12px] text-[#6b7280]">
                      {row.completedFields}/{row.totalTrackedFields} tracked fields
                    </p>
                  </div>,
                  <div key={`${row.family}-${row.slug}-missing`} className="space-y-1">
                    <p className="text-[12px] text-[#6b7280]">
                      Critical: {row.missingCriticalCount}
                    </p>
                    <p className="text-[12px] text-[#6b7280]">
                      Important: {row.missingImportantCount}
                    </p>
                  </div>,
                  <AdminActionLink
                    key={`${row.family}-${row.slug}-open`}
                    href={`/admin/content/${row.family}/${row.slug}`}
                    label="Open page"
                  />,
                ])}
              />
            ) : (
              <AdminEmptyState
                title="No incomplete pages in your visible families"
                description="Missing critical or important fields will surface here automatically when a page still needs work."
                className={dashboardInsetCardClassName}
              />
            )}
          </AdminSectionCard>
        ) : null}

        <AdminSectionCard
          title="Stale data"
          description="These pages are still editable, but their source or refresh posture suggests they need a quick review."
          collapsible
          defaultOpen={false}
          className={dashboardCardClassName}
        >
          {staleRows.length ? (
            <div className="space-y-2.5">
              {staleRows.slice(0, 6).map((row) => (
                <div
                  key={`${row.family}-${row.slug}-stale`}
                  className={dashboardInsetCardClassName}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-[#111827]">{row.title}</p>
                    <AdminBadge label="Stale" tone="warning" />
                  </div>
                  <p className="mt-1.5 text-sm leading-5 text-[#4b5563]">
                    {row.familyLabel} • {row.sourceLabel}
                  </p>
                  <p className="mt-1 text-[12px] text-[#6b7280]">
                    Last updated {formatAdminDateTime(row.lastUpdated)}
                  </p>
                  <div className="mt-2.5">
                    <AdminActionLink href={`/admin/content/${row.family}/${row.slug}`} label="Review page" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <AdminEmptyState
              title="No stale pages right now"
              description="When a page looks behind its source or refresh cadence, it will show up here."
              className={dashboardInsetCardClassName}
            />
          )}
        </AdminSectionCard>

        <AdminSectionCard
          title="Recent edits"
          description="A quick record of the latest saved work so managers can confirm progress without opening every page."
          className={dashboardCardClassName}
        >
          <AdminDashboardRecentEdits
            entries={recentEdits}
            entryClassName={dashboardInsetCardClassName}
          />
        </AdminSectionCard>
      </div>

      <AdminSectionCard
        title="Visible families"
        description="Counts here reflect the content families this signed-in user can actually open and edit."
        collapsible
        defaultOpen={false}
        className={dashboardCardClassName}
      >
        <AdminSimpleTable
          columns={["Family", "Count", "Incomplete", "Assigned", "Open family"]}
          rows={familyRows.map((entry) => {
            const meta = adminFamilyMeta[entry.familyKey];
            const incompleteCount = entry.rows.filter(
              (row) => row.missingCriticalCount > 0 || row.missingImportantCount > 0,
            ).length;
            const assignedCount = entry.rows.filter(
              (row) => row.assignedTo?.toLowerCase() === (user.email ?? "").toLowerCase(),
            ).length;
            return [
              <div key={`${entry.familyKey}-title`} className="space-y-1">
                <p className="font-semibold text-[#111827]">{meta.label}</p>
                <p className="line-clamp-2 text-xs leading-[18px] text-[#4b5563]">
                  {meta.description}
                </p>
              </div>,
              <span key={`${entry.familyKey}-count`}>{entry.rows.length}</span>,
              <span key={`${entry.familyKey}-incomplete`}>{incompleteCount}</span>,
              <span key={`${entry.familyKey}-assigned`}>{assignedCount}</span>,
              <AdminActionLink
                key={`${entry.familyKey}-open`}
                href={`/admin/content/${entry.familyKey}`}
                label="Open family"
              />,
            ];
          })}
        />
      </AdminSectionCard>
    </AdminPageFrame>
  );
}
