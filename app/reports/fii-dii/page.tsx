import type { Metadata } from "next";

import { GlobalSidebarPageShell } from "@/components/global-sidebar-page-shell";
import { JsonLd } from "@/components/json-ld";
import {
  ProductBreadcrumbs,
  ProductCard,
  ProductSectionTitle,
} from "@/components/product-page-system";
import { Eyebrow } from "@/components/ui";
import {
  buildFiiDiiCsv,
  fiiDiiReport,
  formatFiiDiiCurrency,
  type FiiDiiReportRow,
  type FiiDiiReportSection,
} from "@/lib/fii-dii-report";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: "FII / DII Activity",
  description: "Institutional activity report for FII / FPI and DII buy, sell, and net values in the capital market segment.",
};

export default async function FiiDiiReportPage() {
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Reports", href: "/reports" },
    { label: "FII / DII Activity", href: "/reports/fii-dii" },
  ];

  return (
    <>
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs.map((item) => ({ name: item.label, href: item.href })))} />
      <JsonLd
        data={buildWebPageSchema({
          title: "FII / DII Activity",
          description: "Institutional activity report for FII / FPI and DII buy, sell, and net values in the capital market segment.",
          path: "/reports/fii-dii",
        })}
      />
      <GlobalSidebarPageShell
        category="reports"
        className="space-y-3.5 sm:space-y-4"
        leftClassName="riddra-legacy-light-surface space-y-6"
      >
        <ProductBreadcrumbs items={breadcrumbs} />

        <ProductCard tone="primary" className="space-y-5 p-4 sm:p-5">
          <div className="space-y-2">
            <Eyebrow>Institutional flow report</Eyebrow>
            <h1 className="riddra-product-body text-[28px] font-semibold tracking-tight text-[#1B3A6B] sm:text-[36px]">
              FII/FPI & DII trading activity in Capital Market segment
            </h1>
            <p className="riddra-product-body max-w-3xl text-[14px] leading-7 text-[rgba(107,114,128,0.88)] sm:text-[15px]">
              A dedicated reports page for institutional buying and selling activity, structured in the same public format traders
              already recognize from the NSE reports surface.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ReportMetaCard label="Source" value={fiiDiiReport.sourceLabel} />
            <ReportMetaCard label="Report date" value={fiiDiiReport.reportDateLabel} />
            <ReportMetaCard label="Last updated" value={fiiDiiReport.lastUpdatedLabel} />
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={fiiDiiReport.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-full border border-[rgba(27,58,107,0.14)] bg-white px-4 py-2 text-sm font-medium text-[#1B3A6B] transition hover:border-[#D4853B] hover:text-[#D4853B]"
            >
              Open NSE source
            </a>
          </div>
        </ProductCard>

        <div className="space-y-5">
          {fiiDiiReport.sections.map((section) => (
            <ReportSectionCard key={section.id} section={section} />
          ))}
        </div>

        <ProductCard tone="secondary" className="space-y-4 p-4">
          <ProductSectionTitle
            eyebrow="Report notes"
            title="How this page is set up"
            description="This route is ready as the public report destination and already uses the same shared product shell plus global sidebar as the rest of the site."
          />
          <div className="grid gap-3">
            {fiiDiiReport.notes.map((note) => (
              <div
                key={note}
                className="rounded-[12px] border border-[rgba(221,215,207,0.9)] bg-[rgba(255,255,255,0.78)] px-4 py-3 text-sm leading-7 text-[rgba(75,85,99,0.84)]"
              >
                {note}
              </div>
            ))}
          </div>
        </ProductCard>
      </GlobalSidebarPageShell>
    </>
  );
}

function ReportMetaCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <ProductCard tone="secondary" className="p-4">
      <p className="riddra-product-body text-[11px] font-medium uppercase tracking-[0.18em] text-[rgba(107,114,128,0.74)]">
        {label}
      </p>
      <p className="riddra-product-body mt-2 text-[20px] font-semibold text-[#1B3A6B]">{value}</p>
    </ProductCard>
  );
}

function ReportSectionCard({
  section,
}: {
  section: FiiDiiReportSection;
}) {
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(buildFiiDiiCsv(section))}`;

  return (
    <ProductCard tone="secondary" className="overflow-hidden p-0">
      <div className="flex flex-col gap-4 border-b border-[rgba(221,215,207,0.82)] px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="riddra-product-body text-[11px] font-medium uppercase tracking-[0.18em] text-[rgba(107,114,128,0.74)]">
            Institutional activity report
          </p>
          <h2 className="riddra-product-body text-[22px] font-semibold tracking-tight text-[#1B3A6B]">{section.title}</h2>
          <p className="riddra-product-body text-[14px] leading-7 text-[rgba(107,114,128,0.86)]">{section.description}</p>
        </div>

        <a
          href={csvHref}
          download={section.csvFileName}
          className="inline-flex shrink-0 rounded-full border border-[rgba(27,58,107,0.14)] bg-white px-4 py-2 text-sm font-medium text-[#1B3A6B] transition hover:border-[#D4853B] hover:text-[#D4853B]"
        >
          Download (.csv)
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="bg-[#47408C] text-white">
            <tr className="text-[12px] uppercase tracking-[0.14em]">
              <th className="px-4 py-4 font-semibold">Category</th>
              <th className="px-4 py-4 font-semibold">Date</th>
              <th className="px-4 py-4 text-right font-semibold">Buy Value (₹ Crores)</th>
              <th className="px-4 py-4 text-right font-semibold">Sell Value (₹ Crores)</th>
              <th className="px-4 py-4 text-right font-semibold">Net Value (₹ Crores)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(221,215,207,0.82)] bg-white">
            {section.rows.map((row) => (
              <ReportRow key={`${section.id}-${row.category}`} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </ProductCard>
  );
}

function ReportRow({
  row,
}: {
  row: FiiDiiReportRow;
}) {
  const netPositive = row.netValue >= 0;

  return (
    <tr className="align-top">
      <td className="px-4 py-4 text-[15px] font-semibold text-[#111827]">{row.category}</td>
      <td className="px-4 py-4 text-[15px] text-[rgba(55,65,81,0.92)]">{row.dateLabel}</td>
      <td className="px-4 py-4 text-right text-[15px] font-medium text-[rgba(17,24,39,0.92)]">
        {formatFiiDiiCurrency(row.buyValue)}
      </td>
      <td className="px-4 py-4 text-right text-[15px] font-medium text-[rgba(17,24,39,0.92)]">
        {formatFiiDiiCurrency(row.sellValue)}
      </td>
      <td className={`px-4 py-4 text-right text-[15px] font-semibold ${netPositive ? "text-[#1A7F4B]" : "text-[#C0392B]"}`}>
        {netPositive ? "" : "−"}
        {formatFiiDiiCurrency(Math.abs(row.netValue))}
      </td>
    </tr>
  );
}
