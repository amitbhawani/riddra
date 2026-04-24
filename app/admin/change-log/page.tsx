import type { Metadata } from "next";

import { AdminActivityLogBrowser } from "@/components/admin/admin-activity-log-browser";
import {
  AdminPageFrame,
  AdminPageHeader,
} from "@/components/admin/admin-primitives";
import { listAdminActivityLog } from "@/lib/admin-activity-log";

export const metadata: Metadata = {
  title: "Change Log",
  description: "Filter saved changes by user, page, and action.",
};

export default async function AdminChangeLogPage() {
  const entries = await listAdminActivityLog(220);

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Change Log", href: "/admin/change-log" },
        ]}
        eyebrow="Changes"
        title="Change log"
        description="See every saved backend change in one flat list, then filter by person, page, or action to answer who changed what."
      />

      <AdminActivityLogBrowser entries={entries} mode="change-log" />
    </AdminPageFrame>
  );
}
