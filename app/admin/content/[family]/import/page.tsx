import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminContentImportClient } from "@/components/admin/admin-content-import-client";
import {
  AdminActionLink,
  AdminPageFrame,
  AdminPageHeader,
  AdminSectionCard,
} from "@/components/admin/admin-primitives";
import { requireOperator } from "@/lib/auth";
import {
  canUseAdminFamilyImport,
  getAdminImportBatchDetails,
  getAdminImportTemplate,
  listAdminImportBatches,
  supportedAdminImportFamilies,
  type SupportedAdminImportFamily,
} from "@/lib/admin-content-imports";

type Params = Promise<{ family: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { family } = await params;
  const typedFamily = family as SupportedAdminImportFamily;

  return {
    title: supportedAdminImportFamilies.includes(typedFamily)
      ? `${getAdminImportTemplate(typedFamily).label} Import`
      : "Import",
  };
}

export default async function AdminContentFamilyImportPage({
  params,
}: {
  params: Params;
}) {
  const { family } = await params;
  const typedFamily = family as SupportedAdminImportFamily;

  if (!supportedAdminImportFamilies.includes(typedFamily)) {
    notFound();
  }

  const { role, capabilities } = await requireOperator();
  if (!canUseAdminFamilyImport(role, capabilities, typedFamily)) {
    notFound();
  }

  const template = getAdminImportTemplate(typedFamily);
  const recentBatches = await listAdminImportBatches(typedFamily);
  const batchDetails = await Promise.all(
    recentBatches.slice(0, 6).map(async (batch) => {
      const details = await getAdminImportBatchDetails(batch.id);
      return details ?? { batch, rows: [] };
    }),
  );

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Content", href: "/admin/content" },
          { label: template.label, href: `/admin/content/${typedFamily}` },
          { label: "Import", href: `/admin/content/${typedFamily}/import` },
        ]}
        eyebrow="Import"
        title={`Import ${template.label}`}
        description="Upload a CSV, check the rows, then create or update draft records in this content family without filling the editor one entry at a time."
        actions={
          <>
            <AdminActionLink href={`/admin/content/${typedFamily}/new`} label={`Create ${template.label} manually`} />
            <a
              href={`/api/admin/operator-console/import-templates/${typedFamily}`}
              className="inline-flex h-8 shrink-0 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] font-medium whitespace-nowrap text-[#111827] transition hover:bg-[#f9fafb]"
            >
              Download sample CSV
            </a>
            <AdminActionLink href="/admin/help" label="Open help" />
          </>
        }
      />

      <AdminSectionCard
        title="How this import flow works"
        description="Use this when you already have a spreadsheet. The file is checked before saving, imported rows become draft records, and editor changes still go through approval."
      >
        <div className="grid gap-3 xl:grid-cols-4">
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Step 1</p>
            <p className="mt-1 text-[13px] leading-5 text-[#4b5563]">
              Download the sample CSV so the columns match the real editor fields.
            </p>
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Step 2</p>
            <p className="mt-1 text-[13px] leading-5 text-[#4b5563]">
              Upload the file and check it first. Warnings stay visible before anything is saved.
            </p>
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Step 3</p>
            <p className="mt-1 text-[13px] leading-5 text-[#4b5563]">
              Valid rows create or update normal draft records in the same editor your team already uses.
            </p>
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Step 4</p>
            <p className="mt-1 text-[13px] leading-5 text-[#4b5563]">
              Editors send imported drafts for approval. Admins approve the final change before anything moves forward.
            </p>
          </div>
        </div>
      </AdminSectionCard>

      <AdminContentImportClient
        family={typedFamily}
        templates={[template]}
        initialBatchDetails={batchDetails}
        isAdmin={role === "admin"}
      />
    </AdminPageFrame>
  );
}
