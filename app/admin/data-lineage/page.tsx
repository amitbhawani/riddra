import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReadinessRevisionPanel } from "@/components/readiness-revision-panel";
import { Container, Eyebrow, GlowCard, SectionHeading } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { dataLineageItems, dataLineageRules, dataLineageSummary } from "@/lib/data-lineage";

export const metadata: Metadata = {
  title: "Data Lineage",
  description: "Protected data-lineage page for source traceability, editorial history, derived outputs, and audit memory planning.",
};

export default async function AdminDataLineagePage() {
  await requireUser();
  const readinessItems = dataLineageItems.map((item) => ({
    label: item.title,
    status: item.status === "Live" ? "Ready" : "Needs verification",
    detail: item.summary,
    routeTarget:
      item.title === "Source ingestion lineage"
        ? "/admin/source-jobs"
        : item.title === "Editorial mutation lineage"
          ? "/admin/revisions"
          : item.title === "Derived data lineage"
            ? "/admin/search-screener-truth"
            : item.title === "Delivery artifact lineage"
              ? "/admin/delivery-layers"
              : "/admin/payment-events",
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Admin", href: "/admin" }, { name: "Data Lineage", href: "/admin/data-lineage" }]} />
          <Eyebrow>Traceability</Eyebrow>
          <SectionHeading
            title="Data lineage"
            description="This page makes traceability a first-class backend system so every important public output can be traced back through source, editorial, derived, and delivery records."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlowCard>
            <p className="text-sm text-mist/68">Tracked layers</p>
            <p className="mt-2 text-3xl font-semibold text-white">{dataLineageSummary.trackedLayers}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Lineage records</p>
            <p className="mt-2 text-3xl font-semibold text-white">{dataLineageSummary.lineageRecords}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Audit domains</p>
            <p className="mt-2 text-3xl font-semibold text-white">{dataLineageSummary.auditDomains}</p>
          </GlowCard>
        </div>

        <div className="grid gap-6">
          <GlowCard>
            <ReadinessRevisionPanel
              items={readinessItems}
              assetType="data-lineage track"
              panelTitle="Write-through data-lineage action"
              panelDescription="Log lineage and audit-boundary changes into the shared revision lane so traceability posture stops living only as a descriptive architecture page."
              defaultRouteTarget="/admin/data-lineage"
              defaultOperator="Data Lineage Operator"
              defaultChangedFields="lineage_layer, audit_boundary, traceability_state"
              actionNoun="data-lineage mutation"
            />
          </GlowCard>
          {dataLineageItems.map((item) => (
            <GlowCard key={item.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">{item.summary}</p>
                </div>
                <div className="rounded-full bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/84">
                  {item.status}
                </div>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Lineage rules</h2>
          <div className="mt-5 grid gap-3">
            {dataLineageRules.map((rule) => (
              <div key={rule} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm leading-7 text-mist/76">
                {rule}
              </div>
            ))}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
