import type { Metadata } from "next";

import {
  AdminActionLink,
  AdminPageFrame,
  AdminPageHeader,
  AdminSectionCard,
} from "@/components/admin/admin-primitives";
import { AdminMarketDataSourcesClient } from "@/components/admin/admin-market-data-sources-client";
import { requireOperator } from "@/lib/auth";
import {
  listMarketDataSources,
  type MarketDataSourceRecord,
} from "@/lib/market-data-source-registry";

export const metadata: Metadata = {
  title: "Market Data Sources",
  description:
    "Register Google Sheets, Yahoo Finance, and provider endpoints as durable incremental market-data sync sources.",
};

export const dynamic = "force-dynamic";

export default async function AdminMarketDataSourcesPage() {
  await requireOperator();

  let initialSources: MarketDataSourceRecord[] = [];
  let storageWarning: string | null = null;

  try {
    initialSources = await listMarketDataSources();
  } catch (error) {
    storageWarning =
      error instanceof Error
        ? error.message
        : "Market-data sources could not be loaded right now.";
  }

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Market Data Ops", href: "/admin/market-data" },
          { label: "Sources", href: "/admin/market-data/sources" },
        ]}
        eyebrow="Incremental sync registry"
        title="Market Data Sources"
        description="Register durable Google Sheet, Yahoo Finance, and provider sources once, then sync only the missing dates on every run."
        actions={
          <>
            <AdminActionLink href="/admin/market-data" label="Back to market data ops" />
            <AdminActionLink href="/admin/market-data/stocks" label="Open stock import dashboard" />
            <AdminActionLink href="/admin/market-data/yahoo-import-guide" label="Yahoo import guide" />
            <AdminActionLink href="/admin/market-data/sources/new" label="Open source wizard" />
            <AdminActionLink href="/admin/market-data/sources/import" label="Bulk onboard sources" />
            <AdminActionLink href="/admin/market-data/import" label="Open import lane" />
          </>
        }
      />

      <AdminSectionCard
        title="How incremental sync works"
        description="Each source keeps its own registry row, sync status, and last-synced pointers."
      >
        {storageWarning ? (
          <div className="rounded-lg border border-[#fecaca] bg-[#fff7ed] px-4 py-3 text-sm leading-6 text-[#9a3412]">
            {storageWarning}
          </div>
        ) : (
          <div className="grid gap-3 xl:grid-cols-4">
            <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
              <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Step 1</p>
              <p className="mt-1 text-[13px] leading-5 text-[#4b5563]">
                Save a source once with its asset slug, symbol, or benchmark mapping.
              </p>
            </div>
            <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
              <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Step 2</p>
              <p className="mt-1 text-[13px] leading-5 text-[#4b5563]">
                Each sync previews the upstream source first and reads the latest stored DB date.
              </p>
            </div>
            <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
              <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Step 3</p>
              <p className="mt-1 text-[13px] leading-5 text-[#4b5563]">
                Only rows newer than the latest stored date are sent into the shared durable import pipeline.
              </p>
            </div>
            <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
              <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Step 4</p>
              <p className="mt-1 text-[13px] leading-5 text-[#4b5563]">
                Source rows are scheduler-ready now, so future cron runs can reuse the same ids without new logic.
              </p>
            </div>
          </div>
        )}
      </AdminSectionCard>

      <AdminMarketDataSourcesClient initialSources={initialSources} />
    </AdminPageFrame>
  );
}
