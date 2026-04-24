import type { Metadata } from "next";

import {
  AdminActionLink,
  AdminEmptyState,
  AdminPageFrame,
  AdminPageHeader,
  AdminSectionCard,
  AdminSimpleTable,
  AdminStatGrid,
} from "@/components/admin/admin-primitives";
import { getFunds, getStocks } from "@/lib/content";
import { getIndexSnapshots } from "@/lib/index-content";
import { getAdminOperatorStore } from "@/lib/admin-operator-store";
import { formatAdminDateTime } from "@/lib/admin-time";

export const metadata: Metadata = {
  title: "Documents / Sources",
  description: "Operator desk for factsheet links, filing links, source labels, source dates, and source URLs.",
};

export default async function AdminDocumentsPage() {
  const [stocks, funds, indices, store] = await Promise.all([
    getStocks(),
    getFunds(),
    getIndexSnapshots(),
    getAdminOperatorStore(),
  ]);

  const sourceRows = [
    ...stocks.flatMap((stock) => [
      stock.fundamentalsMeta
        ? {
            asset: stock.name,
            family: "Stock",
            label: "Fundamentals source",
            href: stock.fundamentalsMeta.sourceUrl,
            sourceLabel: stock.fundamentalsMeta.source,
            sourceDate: stock.fundamentalsMeta.sourceDate,
            editHref: `/admin/content/stocks/${stock.slug}`,
          }
        : null,
      stock.shareholdingMeta
        ? {
            asset: stock.name,
            family: "Stock",
            label: "Shareholding source",
            href: stock.shareholdingMeta.sourceUrl,
            sourceLabel: stock.shareholdingMeta.source,
            sourceDate: stock.shareholdingMeta.sourceDate,
            editHref: `/admin/content/stocks/${stock.slug}`,
          }
        : null,
    ]),
    ...funds.flatMap((fund) => [
      fund.factsheetMeta?.referenceUrl
        ? {
            asset: fund.name,
            family: "Mutual fund",
            label: fund.factsheetMeta.documentLabel || "Factsheet",
            href: fund.factsheetMeta.referenceUrl,
            sourceLabel: fund.factsheetMeta.source || "",
            sourceDate: fund.factsheetMeta.sourceDate || "",
            editHref: `/admin/content/mutual-funds/${fund.slug}`,
          }
        : null,
      fund.holdingsMeta?.referenceUrl
        ? {
            asset: fund.name,
            family: "Mutual fund",
            label: "Holdings source",
            href: fund.holdingsMeta.referenceUrl,
            sourceLabel: fund.holdingsMeta.source,
            sourceDate: fund.holdingsMeta.sourceDate,
            editHref: `/admin/content/mutual-funds/${fund.slug}`,
          }
        : null,
      fund.allocationMeta?.referenceUrl
        ? {
            asset: fund.name,
            family: "Mutual fund",
            label: "Sector allocation source",
            href: fund.allocationMeta.referenceUrl,
            sourceLabel: fund.allocationMeta.source,
            sourceDate: fund.allocationMeta.sourceDate,
            editHref: `/admin/content/mutual-funds/${fund.slug}`,
          }
        : null,
    ]),
    ...indices.flatMap((index) =>
      index.compositionMeta?.referenceUrl
        ? [
            {
              asset: index.title,
              family: "Index",
              label: "Composition source",
              href: index.compositionMeta.referenceUrl,
              sourceLabel: index.compositionMeta.sourceLabel || index.sourceCode,
              sourceDate: index.compositionMeta.sourceDate || index.lastUpdated,
              editHref: `/admin/content/indices/${index.slug}`,
            },
          ]
        : [],
    ),
  ].filter(Boolean) as Array<{
    asset: string;
    family: string;
    label: string;
    href: string;
    sourceLabel: string;
    sourceDate: string;
    editHref: string;
  }>;

  const manualDocuments = store.records.flatMap((record) =>
    record.documents.map((document) => ({
      asset: record.title,
      family: record.family,
      label: document.label,
      href: document.href,
      sourceLabel: document.sourceLabel,
      sourceDate: document.sourceDate,
      editHref: `/admin/content/${record.family}/${record.slug}`,
    })),
  );

  const uniqueSourceLabels = [...new Set(sourceRows.map((row) => row.sourceLabel).filter(Boolean))].sort();

  return (
    <AdminPageFrame>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Documents / Sources", href: "/admin/documents" },
        ]}
        eyebrow="Documents / sources"
        title="Documents / sources"
        description="Manage factsheet links, filing references, source labels, source dates, and source URLs from one operator-facing desk."
      />

      <AdminStatGrid
        stats={[
          { label: "Source-backed links", value: String(sourceRows.length), note: "Links gathered from current stock and mutual-fund source metadata." },
          { label: "Manual documents", value: String(manualDocuments.length), note: "Operator-managed document rows saved through the new editor." },
          { label: "Source labels", value: String(uniqueSourceLabels.length), note: "Unique source labels currently visible in record metadata." },
          { label: "Editable records", value: String(store.records.length), note: "Managed records with local operator state available." },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <AdminSectionCard
          title="Factsheets, filings, and source URLs"
          description="Real source-backed links already visible on public pages and traceable here."
        >
          {sourceRows.length ? (
            <AdminSimpleTable
              columns={["Asset", "Kind", "Source", "Date", "Edit"]}
              rows={sourceRows.slice(0, 20).map((row) => [
                <div key={`${row.asset}-${row.label}`} className="space-y-1">
                  <p className="font-semibold text-[#111827]">{row.asset}</p>
                  <a href={row.href} className="text-xs leading-5 text-[#1d4ed8] underline" target="_blank" rel="noreferrer">
                    {row.label}
                  </a>
                </div>,
                row.family,
                row.sourceLabel,
                formatAdminDateTime(row.sourceDate, "No source date"),
                <AdminActionLink key={`${row.asset}-edit`} href={row.editHref} label="Open record" />,
              ])}
            />
          ) : (
            <AdminEmptyState
              title="No source-backed document links yet"
              description="As source URLs and factsheet links become available on public routes, they will appear here automatically."
            />
          )}
        </AdminSectionCard>

        <AdminSectionCard
          title="Source label mappings"
          description="Current source labels visible across the local operator-managed public content."
        >
          {uniqueSourceLabels.length ? (
            <div className="flex flex-wrap gap-2">
              {uniqueSourceLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-sm text-[#4b5563]"
                >
                  {label}
                </span>
              ))}
            </div>
          ) : (
            <AdminEmptyState
              title="No source labels captured yet"
              description="Source labels will appear here as soon as routes expose real source metadata or operator-managed labels."
            />
          )}
        </AdminSectionCard>
      </div>

      <AdminSectionCard
        title="Record source state"
        description="Cross-record source freshness, next refresh, and source-status review for operator-managed records."
      >
        {store.records.length ? (
          <AdminSimpleTable
            columns={["Record", "Source", "Freshness", "Next refresh", "Edit"]}
            rows={store.records.slice(0, 24).map((record) => [
              record.title,
              record.sourceState.sourceLabel || "Manual only",
              `${record.sourceState.freshnessState.replaceAll("_", " ")} / ${record.sourceState.sourceStatus.replaceAll("_", " ")}`,
              formatAdminDateTime(record.refreshState.nextScheduledRunAt, "No scheduled run"),
              <AdminActionLink key={`${record.id}-edit`} href={`/admin/content/${record.family}/${record.slug}`} label="Open record" />,
            ])}
          />
        ) : (
          <AdminEmptyState
            title="No operator-managed records yet"
            description="Once records are saved through the CMS editor, their source state will appear here for cross-record review."
          />
        )}
      </AdminSectionCard>

      <AdminSectionCard
        title="Manual document rows"
        description="Operator-managed document links added through record editors."
      >
        {manualDocuments.length ? (
          <AdminSimpleTable
            columns={["Asset", "Label", "Source", "Date", "Edit"]}
            rows={manualDocuments.map((row) => [
              row.asset,
              row.label,
              row.sourceLabel || "Manual",
              formatAdminDateTime(row.sourceDate, "No source date"),
              <AdminActionLink key={`${row.asset}-open`} href={row.editHref} label="Open record" />,
            ])}
          />
        ) : (
          <AdminEmptyState
            title="No manual document rows yet"
            description="Add document links inside the record editor and they will appear here for cross-record management."
          />
        )}
      </AdminSectionCard>
    </AdminPageFrame>
  );
}
