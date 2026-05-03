import type { Metadata } from "next";

import {
  AdminPageFrame,
  AdminPageHeader,
} from "@/components/admin/admin-primitives";
import { AdminActivityLogBrowser } from "@/components/admin/admin-activity-log-browser";
import { listAdminActivityLog } from "@/lib/admin-activity-log";

export const metadata: Metadata = {
  title: "Activity Log",
  description: "Latest admin actions across users, content, settings, overrides, and refresh jobs.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminActivityLogPage() {
  const entries = await listAdminActivityLog(500);

  console.info("[admin/activity-log] page load", {
    count: entries.length,
    newestCreatedAt: entries[0]?.createdAt ?? null,
    newestActionType: entries[0]?.actionType ?? null,
  });

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Activity Log", href: "/admin/activity-log" },
        ]}
        eyebrow="Audit"
        title="Activity log"
        description="Review recent admin actions, group them in the clearest way for the task at hand, and jump straight to the affected page or version history when a revert follow-up is needed."
      />
      <AdminActivityLogBrowser entries={entries} mode="activity" />
    </AdminPageFrame>
  );
}
