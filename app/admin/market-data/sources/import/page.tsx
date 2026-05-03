import type { Metadata } from "next";

import {
  AdminActionLink,
  AdminPageFrame,
  AdminPageHeader,
} from "@/components/admin/admin-primitives";
import { AdminMarketDataSourceImportClient } from "@/components/admin/admin-market-data-source-import-client";
import { requireOperator } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Bulk Market Data Source Onboarding",
  description:
    "Upload a CSV of market-data sources, validate detection and mapping, then save many sources in one pass.",
};

export const dynamic = "force-dynamic";

export default async function AdminMarketDataSourceImportPage() {
  await requireOperator();

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Market Data Ops", href: "/admin/market-data" },
          { label: "Sources", href: "/admin/market-data/sources" },
          { label: "Bulk import", href: "/admin/market-data/sources/import" },
        ]}
        eyebrow="Scalable onboarding"
        title="Bulk Source Onboarding"
        description="Use one CSV to register many Google Sheet, Yahoo Finance, or provider sources. This is for source registry rows, not historical OHLCV content imports."
        actions={
          <>
            <AdminActionLink href="/admin/market-data/sources" label="Back to sources" />
            <AdminActionLink href="/admin/market-data/sources/new" label="Open source wizard" />
          </>
        }
      />

      <AdminMarketDataSourceImportClient />
    </AdminPageFrame>
  );
}
