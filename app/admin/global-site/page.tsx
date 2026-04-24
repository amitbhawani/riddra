import type { Metadata } from "next";

import { AdminActionLink, AdminPageFrame, AdminPageHeader, AdminSectionCard } from "@/components/admin/admin-primitives";
import { adminGlobalSiteSections } from "@/lib/admin-navigation";

export const metadata: Metadata = {
  title: "Global Site",
  description:
    "Global-site management screens for header, footer, shared page sidebars, banners, reusable support blocks, and route strips.",
};

export default function AdminGlobalSitePage() {
  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Global Site", href: "/admin/global-site" },
        ]}
        eyebrow="Global site"
        title="Global site management"
        description="Manage reusable public-site chrome and shared modules without editing code."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {adminGlobalSiteSections.map((section) => (
          <AdminSectionCard
            key={section.key}
            title={section.label}
            description={section.description}
          >
            <div className="flex items-center gap-2">
              <AdminActionLink href={section.href} label="Open page" tone="primary" />
            </div>
          </AdminSectionCard>
        ))}
      </div>
    </AdminPageFrame>
  );
}
