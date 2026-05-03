import type { Metadata } from "next";

import { AdminGuidanceCard, AdminStorageStatusCard } from "@/components/admin/admin-operator-notices";
import { AdminPageFrame, AdminPageHeader } from "@/components/admin/admin-primitives";
import { AdminSeoSettingsClient } from "@/components/admin/admin-seo-settings-client";
import { requireAdmin } from "@/lib/auth";
import { getLaunchConfigStore } from "@/lib/launch-config-store";

export const metadata: Metadata = {
  title: "SEO Controls",
  description:
    "Global crawl, sitemap, and indexing controls for the public Riddra site.",
};

export default async function AdminSeoPage() {
  await requireAdmin();
  const launchConfig = await getLaunchConfigStore();

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "SEO", href: "/admin/seo" },
        ]}
        eyebrow="SEO controls"
        title="SEO control center"
        description="Control what gets indexed, what gets excluded, and which public route families deserve sitemap discovery."
      />

      <AdminGuidanceCard
        title="How to use this page"
        description="Treat this as the master crawl policy, then use each content record's SEO section for page-level title, description, canonical, and stricter noindex overrides."
        items={[
          "Global rules decide whether a route family is indexable at all.",
          "Per-record SEO fields can tighten a page further, but should not loosen a blocked family.",
          "Robots, sitemap, and page metadata all read this same policy layer now.",
        ]}
      />

      <AdminSeoSettingsClient initialSettings={launchConfig.seo} />
      <AdminStorageStatusCard scope="SEO control settings" />
    </AdminPageFrame>
  );
}
