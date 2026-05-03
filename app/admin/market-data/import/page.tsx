import type { Metadata } from "next";

import { AdminActionLink, AdminPageFrame, AdminPageHeader, AdminSectionCard } from "@/components/admin/admin-primitives";
import { AdminMarketDataImportClient } from "@/components/admin/admin-market-data-import-client";
import { requireOperator } from "@/lib/auth";
import {
  getMarketDataImportBatchDetails,
  listMarketDataImportBatches,
  listMarketDataImportTemplates,
  type MarketDataImportBatch,
  type MarketDataImportRow,
} from "@/lib/market-data-imports";

export const metadata: Metadata = {
  title: "Market Data Import",
  description:
    "Upload durable stock, benchmark, and mutual-fund time-series history without mixing it into page-content imports.",
};

export const dynamic = "force-dynamic";

export default async function AdminMarketDataImportPage() {
  await requireOperator();

  const templates = listMarketDataImportTemplates();
  let batchDetails: Array<{ batch: MarketDataImportBatch; rows: MarketDataImportRow[] }> = [];
  let storageWarning: string | null = null;

  try {
    const recentBatches = await listMarketDataImportBatches(null, 8);
    batchDetails = await Promise.all(
      recentBatches.map(async (batch) => {
        const details = await getMarketDataImportBatchDetails(batch.id);
        return details ?? { batch, rows: [] };
      }),
    );
  } catch (error) {
    storageWarning =
      error instanceof Error
        ? error.message
        : "Market Data Import history could not be loaded right now.";
  }

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Market Data Ops", href: "/admin/market-data" },
          { label: "Import", href: "/admin/market-data/import" },
        ]}
        eyebrow="Historical data import"
        title="Market Data Import"
        description="Use this lane for durable OHLCV and NAV history. Do not use the stock CMS import for prices, candles, or historical NAV rows."
        actions={
          <>
            <AdminActionLink href="/admin/market-data" label="Back to market data ops" />
            <AdminActionLink href="/admin/market-data/sources" label="Open source registry" />
            <AdminActionLink href="/admin/help" label="Open help" />
          </>
        }
      />

      <AdminSectionCard
        title="How this import lane works"
        description="Historical market data goes into durable time-series tables, not CMS page-content rows."
      >
        {storageWarning ? (
          <div className="mb-4 rounded-lg border border-[#fecaca] bg-[#fff7ed] px-4 py-3 text-sm leading-6 text-[#9a3412]">
            {storageWarning}
          </div>
        ) : null}
        <div className="grid gap-3 xl:grid-cols-4">
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Step 1</p>
            <p className="mt-1 text-[13px] leading-5 text-[#4b5563]">
              Choose whether this file contains stock OHLCV, benchmark OHLCV, or mutual fund NAV rows.
            </p>
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Step 2</p>
            <p className="mt-1 text-[13px] leading-5 text-[#4b5563]">
              Check the file first so mapping, duplicates, and row-level validation are visible before import.
            </p>
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Step 3</p>
            <p className="mt-1 text-[13px] leading-5 text-[#4b5563]">
              Import only the valid rows into the durable history tables, then refresh the latest route snapshot from the newest imported date.
            </p>
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2.5">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">Step 4</p>
            <p className="mt-1 text-[13px] leading-5 text-[#4b5563]">
              CSV upload still works, and the same durable pipeline now also powers incremental source sync from the source registry.
            </p>
          </div>
        </div>
      </AdminSectionCard>

      <AdminMarketDataImportClient
        templates={templates}
        initialBatchDetails={batchDetails}
      />
    </AdminPageFrame>
  );
}
