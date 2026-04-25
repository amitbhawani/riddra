import type { Metadata } from "next";

import {
  AdminGuidanceCard,
  AdminStorageStatusCard,
} from "@/components/admin/admin-operator-notices";
import { AdminSettingsClient } from "@/components/admin/admin-settings-client";
import { AdminPageFrame, AdminPageHeader } from "@/components/admin/admin-primitives";
import { getSystemSettings } from "@/lib/user-product-store";

export const metadata: Metadata = {
  title: "Settings",
  description: "System defaults for site identity, SEO, membership, support, and global feature toggles.",
};

export default async function AdminSettingsPage() {
  const settings = await getSystemSettings();

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Settings", href: "/admin/settings" },
        ]}
        eyebrow="Settings"
        title="System settings"
        description="Manage site identity, default SEO posture, support configuration, membership defaults, and global product toggles."
      />

      <AdminGuidanceCard
        title="Shared page sidebar"
        description="Market snapshot and common sidebar functions are controlled from one backend-owned checklist so you do not have to tweak every page one by one."
        items={[
          "Use the shared page sidebar screen to choose whether market snapshot, actions, route links, and short checklists appear where a page supports them.",
          "Pages that do not supply a given sidebar block simply leave it hidden, so one checklist stays safe across the product.",
        ]}
        links={[{ href: "/admin/global-site/page-sidebar", label: "Open shared sidebar settings", tone: "primary" }]}
      />

      <AdminGuidanceCard
        title="Header code and tracking"
        description="Global header navigation, logo settings, and trusted head snippets are managed from the dedicated Global Header screen so operators have one clear place for all shared top-of-site controls."
        items={[
          "Use Global Header settings to choose the top menu groups, manage the brand logo text, and paste trusted analytics or verification snippets that should load in the real document head.",
          "This is intended for trusted admin-managed code such as Google Analytics, Google Ads, or search-console verification tags.",
        ]}
        links={[{ href: "/admin/global-site/header", label: "Open global header settings", tone: "primary" }]}
      />

      <AdminSettingsClient initialSettings={settings} />

      <AdminStorageStatusCard scope="system settings" />
    </AdminPageFrame>
  );
}
