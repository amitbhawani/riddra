import type { Metadata } from "next";

import { AdminContentImportClient } from "@/components/admin/admin-content-import-client";
import { AdminImportWorkspaceClient } from "@/components/admin/admin-import-workspace-client";
import {
  AdminPageFrame,
  AdminPageHeader,
  AdminSectionCard,
} from "@/components/admin/admin-primitives";
import { requireOperator } from "@/lib/auth";
import {
  getAdminImportBatchDetails,
  getAdminImportTemplates,
  listAdminImportBatches,
} from "@/lib/admin-content-imports";
import { getAdminOperatorStore } from "@/lib/admin-operator-store";

export const metadata: Metadata = {
  title: "Imports Workspace",
  description: "Dedicated operator workspace for import review, duplicate/unmatched rows, and refresh-job visibility.",
};

export default async function AdminImportsPage() {
  const { role } = await requireOperator();
  const store = await getAdminOperatorStore();
  const importItems = store.records.flatMap((record) =>
    record.imports.map((item) => ({
      ...item,
      family: record.family,
      slug: record.slug,
      title: record.title,
    })),
  );
  const templates = getAdminImportTemplates();
  const recentBatches = await listAdminImportBatches();
  const batchDetails = await Promise.all(
    recentBatches.slice(0, 8).map(async (batch) => {
      const details = await getAdminImportBatchDetails(batch.id);
      return details ?? { batch, rows: [] };
    }),
  );

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Imports", href: "/admin/imports" },
        ]}
        eyebrow="Imports"
        title="Import workspace"
        description="Start CSV imports here, review what is waiting for action, and open the deeper diagnostics only when something looks blocked."
      />

      <AdminSectionCard
        title="Create or update records from CSV"
        description="Start from a sample template, upload a file, preview the rows, then import them into the same record system the editors use today."
      >
        <AdminContentImportClient
          templates={templates}
          initialBatchDetails={batchDetails}
          isAdmin={role === "admin"}
        />
      </AdminSectionCard>

      <AdminImportWorkspaceClient
        initialImportItems={importItems}
        sourceJobs={store.refreshJobs.map((job) => ({
          adapter: job.name,
          status: job.latestStatus,
          nextStep: job.latestError || `${job.cadence} • ${job.sourceDependency}`,
        }))}
      />
    </AdminPageFrame>
  );
}
