import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminRecordEditorClient } from "@/components/admin/admin-record-editor-client";
import { StockFieldMapCard } from "@/components/stock-field-map-card";
import {
  AdminActionLink,
  AdminPageFrame,
  AdminPageHeader,
} from "@/components/admin/admin-primitives";
import {
  adminFamilyMeta,
  getAdminRecordEditorData,
  type AdminFamilyKey,
} from "@/lib/admin-content-registry";
import { requireOperator } from "@/lib/auth";
import { supportedAdminImportFamilies } from "@/lib/admin-content-imports";
import { hasProductUserCapability } from "@/lib/product-permissions";
import { listMediaAssets } from "@/lib/user-product-store";

type Params = Promise<{ family: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { family } = await params;
  const typedFamily = family as AdminFamilyKey;
  const meta = adminFamilyMeta[typedFamily];

  return {
    title: meta ? `New ${meta.singular}` : "New record",
  };
}

export default async function AdminNewRecordPage({
  params,
}: {
  params: Params;
}) {
  const { family } = await params;
  const typedFamily = family as AdminFamilyKey;
  const { role, capabilities } = await requireOperator();
  const supportsImport = supportedAdminImportFamilies.includes(
    typedFamily as (typeof supportedAdminImportFamilies)[number],
  );

  if (!adminFamilyMeta[typedFamily]) {
    notFound();
  }

  const [editor, mediaAssets] = await Promise.all([
    getAdminRecordEditorData(typedFamily, `draft-${typedFamily}`, null),
    listMediaAssets(),
  ]);

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Content", href: "/admin/content" },
          { label: adminFamilyMeta[typedFamily].label, href: `/admin/content/${typedFamily}` },
          { label: "New", href: `/admin/content/${typedFamily}/new` },
        ]}
        eyebrow="Create record"
        title={`New ${adminFamilyMeta[typedFamily].singular}`}
        description="Choose manual entry or CSV import, save the result as a draft first, and send it for review when the main page sections are ready."
        actions={
          <>
            {supportsImport ? (
              <AdminActionLink
                href={`/admin/content/${typedFamily}/import`}
                label={`Import ${adminFamilyMeta[typedFamily].label}`}
              />
            ) : null}
            {supportsImport ? (
              <a
                href={`/api/admin/operator-console/import-templates/${typedFamily}`}
                className="inline-flex h-8 shrink-0 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] font-medium whitespace-nowrap text-[#111827] transition hover:bg-[#f9fafb]"
              >
                Download sample CSV
              </a>
            ) : null}
            <AdminActionLink href="/admin/help" label="Open help" />
          </>
        }
      />

      {typedFamily === "stocks" ? (
        <StockFieldMapCard
          record={editor}
          title="Stock field parity map"
          description="Use this before manual entry so the frontend stock labels and the backend editor keys stay in the same order and naming."
        />
      ) : null}

      <AdminRecordEditorClient
        record={editor}
        importHistory={[]}
        revisions={[]}
        versions={[]}
        mediaAssets={mediaAssets}
        permissions={{
          canPublishContent: hasProductUserCapability(role, capabilities, "can_publish_content"),
          isAdmin: role === "admin",
        }}
        isNew
        creationSupport={{
          singularLabel: adminFamilyMeta[typedFamily].singular.toLowerCase(),
          importHref: supportsImport ? `/admin/content/${typedFamily}/import` : null,
          templateHref: supportsImport ? `/api/admin/operator-console/import-templates/${typedFamily}` : null,
          helpHref: "/admin/help",
        }}
      />
    </AdminPageFrame>
  );
}
