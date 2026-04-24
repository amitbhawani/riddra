import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { PublicSurfaceTruthSection } from "@/components/public-surface-truth-section";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { fiiDiiReport, type FiiDiiParticipantRow } from "@/lib/fii-dii-report";
import { getPublicTruthCopy } from "@/lib/public-route-truth";
import { buildBreadcrumbSchema, buildWebPageSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: "FII / DII Activity",
  description: "NSE-inspired institutional activity report for FII / FPI and DII buy, sell, and net-flow tracking.",
};

export default function FiiDiiReportPage() {
  const truthCopy = getPublicTruthCopy({
    continuitySubject: "report usage",
    handoffLabel: "report-to-account handoff",
    billingSubject: "premium report workflow language",
    supportSubject: "report users who convert into assisted workflows",
  });
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Reports", href: "/reports" },
    { name: "FII / DII Activity", href: "/reports/fii-dii" },
  ];

  return (
    <div className="py-16 sm:py-24">
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <JsonLd
        data={buildWebPageSchema({
          title: "FII / DII Activity",
          description: "NSE-inspired institutional activity report for FII / FPI and DII buy, sell, and net-flow tracking.",
          path: "/reports/fii-dii",
        })}
      />
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={breadcrumbs} />
          <Eyebrow>Institutional flow</Eyebrow>
          <SectionHeading
            title="FII / DII activity"
            description="This route is modeled on the NSE institutional activity report so Riddra can carry a dedicated public page for foreign and domestic institutional flow, not just scattered references inside stock pages."
          />
        </div>

        <PublicSurfaceTruthSection
          eyebrow="Institutional-flow truth"
          title="This report route is useful for public market context right now, but saved continuity still depends on launch activation"
          description="Use FII and DII activity confidently for public market context, while keeping auth continuity, premium workflow promises, and support follow-through honest until those live paths are fully verified."
          authReady={truthCopy.authReady}
          authPending={truthCopy.authPending}
          billingReady={truthCopy.billingReady}
          billingPending={truthCopy.billingPending}
          supportReady={truthCopy.supportReady}
          supportPending={truthCopy.supportPending}
          href="/launch-readiness"
          hrefLabel="Open launch readiness"
          secondaryHref="/account/support"
          secondaryHrefLabel="Open support continuity"
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Source benchmark</p>
            <p className="mt-2 text-2xl font-semibold text-white">{fiiDiiReport.sourceLabel}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Current mode</p>
            <p className="mt-2 text-2xl font-semibold text-white">{fiiDiiReport.syncMode}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Latest sync</p>
            <p className="mt-2 text-2xl font-semibold text-white">{fiiDiiReport.lastSyncLabel}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Source and sync posture</h2>
          <p className="mt-3 text-sm leading-7 text-mist/74">
            The public structure is now in place, but the values below remain intentionally explicit until verified source ingestion is live.
            This keeps the page useful without pretending that institutional numbers are already flowing into production.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={fiiDiiReport.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:bg-white/[0.06]"
            >
              Open NSE source
            </a>
          </div>
          <p className="mt-4 text-sm text-mist/62">Coverage: {fiiDiiReport.reportCoverage}</p>
        </GlowCard>

        <div className="grid gap-6 xl:grid-cols-2">
          <ReportTableCard title="NSE-exclusive capital-market activity" rows={fiiDiiReport.nseExclusiveRows} />
          <ReportTableCard title="Combined exchange activity" rows={fiiDiiReport.combinedExchangeRows} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">NSE-inspired report notes</h2>
            <div className="mt-5 grid gap-3">
              {fiiDiiReport.notes.map((note) => (
                <div key={note} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                  {note}
                </div>
              ))}
            </div>
          </GlowCard>
          <GlowCard>
            <h2 className="text-2xl font-semibold text-white">Next activation steps</h2>
            <div className="mt-5 grid gap-3">
              {fiiDiiReport.workflow.map((step) => (
                <div key={step} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                  {step}
                </div>
              ))}
            </div>
          </GlowCard>
        </div>
      </Container>
    </div>
  );
}

function ReportTableCard({
  title,
  rows,
}: {
  title: string;
  rows: FiiDiiParticipantRow[];
}) {
  return (
    <GlowCard>
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <div className="mt-5 overflow-hidden rounded-[24px] border border-white/8 bg-black/15">
        <table className="min-w-full divide-y divide-white/8 text-left">
          <thead className="bg-white/[0.03]">
            <tr className="text-xs uppercase tracking-[0.16em] text-mist/56">
              <th className="px-4 py-3 font-medium">Participant</th>
              <th className="px-4 py-3 font-medium">Buy</th>
              <th className="px-4 py-3 font-medium">Sell</th>
              <th className="px-4 py-3 font-medium">Net</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8">
            {rows.map((row) => (
              <tr key={row.participant} className="align-top">
                <td className="px-4 py-4 text-sm font-semibold text-white">{row.participant}</td>
                <td className="px-4 py-4 text-sm text-mist/74">{row.buyValue}</td>
                <td className="px-4 py-4 text-sm text-mist/74">{row.sellValue}</td>
                <td className="px-4 py-4 text-sm text-mist/74">{row.netValue}</td>
                <td className="px-4 py-4 text-sm text-amber-100/86">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlowCard>
  );
}
