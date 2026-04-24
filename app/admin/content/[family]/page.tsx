import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminContentListClient } from "@/components/admin/admin-content-list-client";
import {
  AdminActionLink,
  AdminPageFrame,
  AdminPageHeader,
  AdminSectionCard,
  AdminStatGrid,
} from "@/components/admin/admin-primitives";
import {
  adminFamilyMeta,
  getAdminFamilyRows,
  type AdminFamilyKey,
} from "@/lib/admin-content-registry";
import { requireOperator } from "@/lib/auth";
import { supportedAdminImportFamilies } from "@/lib/admin-content-imports";
import { getAdminOperatorStore } from "@/lib/admin-operator-store";
import { hasProductUserCapability } from "@/lib/product-permissions";

type Params = Promise<{ family: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { family } = await params;
  const typedFamily = family as AdminFamilyKey;
  const meta = adminFamilyMeta[typedFamily];

  return {
    title: meta ? `${meta.label} Admin` : "Content Family",
  };
}

export default async function AdminContentFamilyPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams?: Promise<{ query?: string }>;
}) {
  const { family } = await params;
  const resolvedSearchParams = await searchParams;
  const typedFamily = family as AdminFamilyKey;

  if (!adminFamilyMeta[typedFamily]) {
    notFound();
  }

  const store = await getAdminOperatorStore();
  const { user, role, capabilities } = await requireOperator();
  const rows = await getAdminFamilyRows(typedFamily, store.records, {
    cacheKey: store.updatedAt,
  });
  const meta = adminFamilyMeta[typedFamily];
  const supportsImport = supportedAdminImportFamilies.includes(
    typedFamily as (typeof supportedAdminImportFamilies)[number],
  );
  const stats = rows.reduce(
    (summary, row) => {
      summary.published += row.publishState === "published" ? 1 : 0;
      summary.overrides += row.overrideIndicator !== "none" ? 1 : 0;
      summary.needsReview +=
        row.publishState === "ready_for_review" ||
        row.publishState === "needs_fix" ||
        row.importStatus === "import_conflict_needs_review"
          ? 1
          : 0;
      summary.incomplete += row.missingCriticalCount > 0 || row.missingImportantCount > 0 ? 1 : 0;
      return summary;
    },
    { published: 0, overrides: 0, needsReview: 0, incomplete: 0 },
  );

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Content", href: "/admin/content" },
          { label: meta.label, href: `/admin/content/${typedFamily}` },
        ]}
        eyebrow="Content family"
        title={meta.label}
        description={meta.description}
        actions={
          <>
            <AdminActionLink
              href={`/admin/content/${typedFamily}/new`}
              label={`New ${meta.singular}`}
              tone="primary"
            />
            {supportsImport ? (
              <>
                <AdminActionLink
                  href={`/admin/content/${typedFamily}/import`}
                  label={`Import ${meta.label}`}
                />
                <a
                  href={`/api/admin/operator-console/import-templates/${typedFamily}`}
                  className="inline-flex h-8 shrink-0 items-center rounded-lg border border-[#d1d5db] bg-white px-3 text-[13px] font-medium whitespace-nowrap text-[#111827] transition hover:bg-[#f9fafb]"
                >
                  Download sample CSV
                </a>
              </>
            ) : null}
          </>
        }
      />

      <AdminStatGrid
        stats={[
          { label: "Records", value: String(rows.length), note: "Source-backed plus manual-only records in this family." },
          { label: "Published", value: String(stats.published), note: "Currently published records." },
          { label: "Manual changes", value: String(stats.overrides), note: "Records with active manual edits or protected source overrides." },
          { label: "Needs review", value: String(stats.needsReview), note: "Review queue and import-conflict items." },
          { label: "Incomplete", value: String(stats.incomplete), note: "Records with missing critical or important workflow fields." },
        ]}
      />

      <AdminSectionCard
        title={`${meta.label} list view`}
        description="Search, filter, sort, and open every record in this family."
      >
        <AdminContentListClient
          family={typedFamily}
          rows={rows}
          initialQuery={resolvedSearchParams?.query ?? ""}
          currentOperatorEmail={user.email ?? ""}
          canPublishContent={hasProductUserCapability(role, capabilities, "can_publish_content")}
          isAdmin={role === "admin"}
        />
      </AdminSectionCard>
    </AdminPageFrame>
  );
}
