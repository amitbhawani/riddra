import type { Metadata } from "next";

import {
  AdminActionLink,
  AdminPageFrame,
  AdminPageHeader,
  AdminStatGrid,
} from "@/components/admin/admin-primitives";
import { AdminSitemapClient } from "@/components/admin/admin-sitemap-client";
import { buildAdminSitemapAudit } from "@/lib/admin-sitemap";

export const metadata: Metadata = {
  title: "Admin Sitemap",
  description: "Tree view of public routes, internal test routes, and cleanup candidates with quick edit/delete actions.",
};

export default async function AdminSitemapPage() {
  const audit = await buildAdminSitemapAudit();

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Sitemap", href: "/admin/sitemap" },
        ]}
        eyebrow="Sitemap"
        title="Public route sitemap"
        description="Use this as the live tree of what the product currently exposes: public content pages, internal/noindex routes, dynamic patterns, and manual junk records that are safe to remove."
        actions={
          <>
            <AdminActionLink href="/admin/content" label="Open content" tone="primary" />
            <AdminActionLink href="/admin/activity-log" label="Open activity log" />
          </>
        }
      />

      <AdminStatGrid
        stats={[
          {
            label: "Public routes",
            value: String(audit.summary.totalPublicEntries),
            note: "Public static pages plus source-backed content pages shown in the sitemap tree.",
          },
          {
            label: "Internal / noindex",
            value: String(audit.summary.totalInternalEntries),
            note: "QA, prototype, and operator-visible routes that are not core public navigation.",
          },
          {
            label: "Dynamic patterns",
            value: String(audit.summary.totalDynamicPatterns),
            note: "Live route patterns that exist as families rather than one fixed page each.",
          },
          {
            label: "Cleanup candidates",
            value: String(audit.summary.totalCleanupCandidates),
            note: "Manual-only junk or draft records that can be removed safely from this page.",
          },
        ]}
      />

      <AdminSitemapClient initialAudit={audit} />
    </AdminPageFrame>
  );
}
