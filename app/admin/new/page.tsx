import type { Metadata } from "next";

import { AdminCreateHubClient } from "@/components/admin/admin-create-hub-client";
import { AdminEmptyState, AdminPageFrame, AdminPageHeader } from "@/components/admin/admin-primitives";
import { requireOperator } from "@/lib/auth";
import { supportedAdminImportFamilies } from "@/lib/admin-content-imports";
import { type AdminCreateOption, adminFamilyMeta, type AdminFamilyKey } from "@/lib/admin-content-schema";
import { canEditAdminFamily } from "@/lib/product-permissions";

export const metadata: Metadata = {
  title: "New",
  description: "Create a new record across every supported CMS family and global-site object.",
};

function getCreateOptions(): AdminCreateOption[] {
  const familyOptions = (Object.entries(adminFamilyMeta) as Array<
    [keyof typeof adminFamilyMeta, (typeof adminFamilyMeta)[keyof typeof adminFamilyMeta]]
  >).map(([family, meta]) => ({
    id: family,
    label: meta.singular,
    familyGroup: meta.createGroup,
    description: meta.description,
    href: `/admin/content/${family}/new`,
    keywords: [meta.label, meta.singular, family],
  }));

  const importOptions: AdminCreateOption[] = (Object.entries(adminFamilyMeta) as Array<
    [keyof typeof adminFamilyMeta, (typeof adminFamilyMeta)[keyof typeof adminFamilyMeta]]
  >)
    .filter(([family]) =>
      supportedAdminImportFamilies.includes(family as (typeof supportedAdminImportFamilies)[number]),
    )
    .map(([family, meta]) => ({
      id: `${family}-import`,
      label: `Import ${meta.label}`,
      familyGroup: "Import from file",
      description: `Upload a CSV to create or update ${meta.label.toLowerCase()} in bulk.`,
      href: `/admin/content/${family}/import`,
      keywords: [meta.label, meta.singular, family, "import", "csv", "template"],
    }));

  const globalOptions: AdminCreateOption[] = [
    {
      id: "global-banner",
      label: "Banner",
      familyGroup: "Global site objects",
      description: "Create a reusable banner or notice for public-site rollout, messaging, or alerts.",
      href: "/admin/global-site/banners?create=1",
      keywords: ["global site", "banner", "notice"],
    },
    {
      id: "global-route-strip",
      label: "Route strip",
      familyGroup: "Global site objects",
      description: "Create a reusable route strip or CTA module that can be assigned across surfaces.",
      href: "/admin/global-site/route-strips?create=1",
      keywords: ["global site", "route strip", "cta module"],
    },
    {
      id: "global-shared-block",
      label: "Shared support block",
      familyGroup: "Global site objects",
      description: "Create a reusable support or sidebar module for operator-controlled placements.",
      href: "/admin/global-site/shared-blocks?create=1",
      keywords: ["global site", "shared block", "support block", "sidebar"],
    },
    {
      id: "global-market-module",
      label: "Market module",
      familyGroup: "Global site objects",
      description: "Create a reusable market-context module for shared placements.",
      href: "/admin/global-site/market-modules?create=1",
      keywords: ["global site", "market module", "snapshot"],
    },
    {
      id: "global-header-item",
      label: "Header item",
      familyGroup: "Global site objects",
      description: "Open the header editor to add or edit top-navigation and quick-link items.",
      href: "/admin/global-site/header?focus=headerQuickLinks&create=1",
      keywords: ["global site", "header", "navigation", "quick links"],
    },
    {
      id: "global-footer-item",
      label: "Footer item",
      familyGroup: "Global site objects",
      description: "Open the footer editor to add or edit footer-link items and trust navigation.",
      href: "/admin/global-site/footer?focus=footerLinks&create=1",
      keywords: ["global site", "footer", "links"],
    },
  ];

  return [...familyOptions, ...importOptions, ...globalOptions];
}

export default async function AdminCreatePage() {
  const { role, capabilities } = await requireOperator();
  const options = getCreateOptions().filter((option) => {
    if (option.href.startsWith("/admin/content/")) {
      const family = option.href.split("/")[3] ?? "";
      return canEditAdminFamily(role, capabilities, family as AdminFamilyKey);
    }

    return role === "admin";
  });

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "New", href: "/admin/new" },
        ]}
        eyebrow="Create"
        title="Create a new record"
        description="Choose a family or reusable global object and jump directly into its structured editor."
      />

      {options.length ? (
        <AdminCreateHubClient options={options} />
      ) : (
        <AdminEmptyState
          title="No create actions available"
          description="This operator profile does not currently have permission to create content or global-site objects."
        />
      )}
    </AdminPageFrame>
  );
}
