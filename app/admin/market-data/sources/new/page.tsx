import type { Metadata } from "next";

import {
  AdminActionLink,
  AdminPageFrame,
  AdminPageHeader,
  AdminSectionCard,
} from "@/components/admin/admin-primitives";
import { AdminMarketDataSourceWizardClient } from "@/components/admin/admin-market-data-source-wizard-client";
import { requireOperator } from "@/lib/auth";

export const metadata: Metadata = {
  title: "New Market Data Source",
  description:
    "Detect, preview, map, save, and sync a Google Sheet, Yahoo Finance, or provider source without manual technical setup.",
};

export const dynamic = "force-dynamic";

export default async function AdminMarketDataSourceWizardPage() {
  await requireOperator();

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Market Data Ops", href: "/admin/market-data" },
          { label: "Sources", href: "/admin/market-data/sources" },
          { label: "New source", href: "/admin/market-data/sources/new" },
        ]}
        eyebrow="Editor-friendly onboarding"
        title="Source Wizard"
        description="Paste one source URL or symbol, preview the rows, confirm the asset mapping, then save and sync it through the normal incremental pipeline."
        actions={
          <>
            <AdminActionLink href="/admin/market-data/sources" label="Back to sources" />
            <AdminActionLink href="/admin/market-data/sources/import" label="Bulk onboard sources" />
          </>
        }
      />

      <AdminSectionCard
        title="What the wizard does"
        description="The wizard reuses the same durable import and sync engine the registry already uses, so onboarding previews, duplicate checks, and live syncs all stay consistent."
      >
        <div className="grid gap-3 xl:grid-cols-4">
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5 text-sm leading-6 text-[#4b5563]">
            Detect source type from Google Sheet URLs, Yahoo links, raw symbols, or provider endpoints.
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5 text-sm leading-6 text-[#4b5563]">
            Normalize URLs and symbols so the saved source stays scheduler-ready later.
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5 text-sm leading-6 text-[#4b5563]">
            Preview the real rows before saving, including duplicate counts and missing columns.
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5 text-sm leading-6 text-[#4b5563]">
            Save the source and optionally trigger the same incremental sync engine immediately.
          </div>
        </div>
      </AdminSectionCard>

      <AdminMarketDataSourceWizardClient />
    </AdminPageFrame>
  );
}
