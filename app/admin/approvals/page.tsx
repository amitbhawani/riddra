import type { Metadata } from "next";

import { AdminGuidanceCard, AdminStorageStatusCard } from "@/components/admin/admin-operator-notices";
import { AdminApprovalsClient } from "@/components/admin/admin-approvals-client";
import { AdminPageFrame, AdminPageHeader } from "@/components/admin/admin-primitives";
import { listAdminPendingApprovals } from "@/lib/admin-approvals";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Approvals",
  description: "Review editor-submitted content changes before they reach live records.",
};

export default async function AdminApprovalsPage() {
  await requireAdmin();
  const approvals = await listAdminPendingApprovals({ decision: "pending" });

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Approvals", href: "/admin/approvals" },
        ]}
        eyebrow="Approvals"
        title="Content approvals"
        description="Editors can stage content changes here, but only admins can approve them into the final CMS record."
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <AdminGuidanceCard
          title="How approvals work"
          description="This queue turns editor changes into reviewable requests instead of direct live mutations."
          items={[
            "Editors can save draft, review, publish, and archive requests, but the final record is not overwritten until an admin approves the queued change.",
            "Approve applies the queued snapshot into the durable record and logs both the approval and the resulting content change.",
            "Reject keeps the live record untouched and closes the queued editor request.",
          ]}
          links={[
            { href: "/admin/activity-log", label: "Activity log", tone: "primary" },
            { href: "/admin/content", label: "Content workspace" },
          ]}
        />
        <AdminStorageStatusCard scope="content approval queue" />
      </div>

      <AdminApprovalsClient initialApprovals={approvals} />
    </AdminPageFrame>
  );
}
