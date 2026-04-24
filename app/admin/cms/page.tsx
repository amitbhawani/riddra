import Link from "next/link";
import type { Metadata } from "next";

import { ButtonLink, Container, Eyebrow, GlowCard } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { cmsWorkflowStates, getOperatorCmsOverview } from "@/lib/operator-cms";

const familyOrder = ["market", "wealth", "education", "publishing"] as const;

const familyLabels: Record<(typeof familyOrder)[number], string> = {
  market: "Market products",
  wealth: "Wealth products",
  education: "Education",
  publishing: "Publishing",
};

export const metadata: Metadata = {
  title: "Operator CMS",
  description: "Protected structured CMS backend for product and publishing operations.",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function getWorkflowTone(state: string) {
  switch (state) {
    case "published":
      return "bg-emerald-500/12 text-emerald-200";
    case "approved":
      return "bg-sky-500/12 text-sky-200";
    case "pending_review":
    case "review":
      return "bg-amber-500/12 text-amber-100";
    case "rejected":
    case "failed":
      return "bg-rose-500/12 text-rose-200";
    default:
      return "bg-white/[0.06] text-mist/74";
  }
}

export default async function AdminCmsPage() {
  await requireAdmin();
  const overview = await getOperatorCmsOverview();

  const sections = familyOrder.map((family) => ({
    family,
    label: familyLabels[family],
    items: overview.entityCards.filter((card) => card.family === family),
  }));

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <Eyebrow>Operator CMS</Eyebrow>
          <h1 className="display-font text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Structured content operations backend
          </h1>
          <p className="max-w-4xl text-base leading-8 text-mist/76">
            This is the durable foundation for a WordPress-style backend with financial-grade controls:
            one workflow model, one import review lane, one publish gate, and one operator-only surface
            across every content family.
          </p>
        </div>

        {!overview.schemaReady ? (
          <GlowCard className="border-amber-500/25 bg-amber-500/10">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-100/80">Phase 1 readiness</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">CMS durable foundation needs activation</h2>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-amber-50/90">
              {overview.schemaError}
            </p>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-amber-400/20 bg-black/20 px-4 py-4 text-sm leading-7 text-amber-50/90">
                Run migration: <span className="font-semibold text-white">`db/migrations/0014_operator_cms_foundation.sql`</span>
              </div>
              <div className="rounded-2xl border border-amber-400/20 bg-black/20 px-4 py-4 text-sm leading-7 text-amber-50/90">
                Run seed: <span className="font-semibold text-white">`db/seeds/0010_operator_cms_foundation.sql`</span>
              </div>
            </div>
          </GlowCard>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-5">
          <GlowCard>
            <p className="text-sm text-mist/68">Tracked CMS records</p>
            <p className="mt-2 text-3xl font-semibold text-white">{overview.totals.records}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Verified records</p>
            <p className="mt-2 text-3xl font-semibold text-white">{overview.totals.verified}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Pending editorial review</p>
            <p className="mt-2 text-3xl font-semibold text-white">{overview.totals.pendingReview}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Import review queue</p>
            <p className="mt-2 text-3xl font-semibold text-white">{overview.totals.reviewQueue}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Publicly publishable now</p>
            <p className="mt-2 text-3xl font-semibold text-white">{overview.totals.published}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <h2 className="text-2xl font-semibold text-white">Publishing guardrails</h2>
              <p className="mt-3 text-sm leading-7 text-mist/74">
                Public pages must not appear because raw source rows exist. The CMS foundation now
                models explicit workflow and verification truth so only records that are verified,
                approved, and published can become public.
              </p>
            </div>
            <ButtonLink href="/admin/content-models" tone="secondary">
              Open content models
            </ButtonLink>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76">
              Workflow states: {cmsWorkflowStates.join(" -> ")}
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76">
              Import rows now have their own validation queue for duplicates, unmatched rows, and invalid payloads.
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76">
              The durable `publishable_content_records` view is the future public gate for search and route publishing.
            </div>
          </div>
        </GlowCard>

        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.family} className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{section.label}</h2>
                  <p className="mt-2 text-sm leading-7 text-mist/72">
                    Operator sections grouped by product family so the backend stays extensible as new
                    content types are added.
                  </p>
                </div>
              </div>
              <div className="grid gap-6 xl:grid-cols-2">
                {section.items.map((item) => (
                  <GlowCard key={item.code}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-mist/56">{item.code}</p>
                        <h3 className="mt-2 text-2xl font-semibold text-white">{item.label}</h3>
                        <p className="mt-3 text-sm leading-7 text-mist/74">{item.description}</p>
                      </div>
                      <Link
                        href={item.href}
                        className="inline-flex rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.06]"
                      >
                        Open section
                      </Link>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                        <p className="text-sm text-mist/66">Total</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{item.stats.total}</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                        <p className="text-sm text-mist/66">Pending review</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{item.stats.pendingReview}</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                        <p className="text-sm text-mist/66">Verified</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{item.stats.verified}</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                        <p className="text-sm text-mist/66">Publicly visible</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{item.stats.publicVisible}</p>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {item.fieldHighlights.map((field) => (
                        <span
                          key={field}
                          className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.16em] text-mist/72"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                    <div className="mt-5 grid gap-3 lg:grid-cols-3">
                      <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76">
                        List view and filters live in this section now.
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76">
                        Draft create, edit, archive, and publish actions land next on the same durable model.
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76">
                        Import preview and validation queue use the same review-safe backend instead of direct public writes.
                      </div>
                    </div>
                  </GlowCard>
                ))}
              </div>
            </div>
          ))}
        </div>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Recent import batches</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-mist/74">
            Import batches stay separate from public publishing so operators can validate, reject, and
            review bad rows before anything reaches product pages or search.
          </p>
          <div className="mt-5 grid gap-3">
            {overview.recentImportBatches.length ? (
              overview.recentImportBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {batch.sourceLabel} · {batch.entityType}
                      </p>
                      <p className="mt-2 text-xs leading-6 text-mist/60">
                        {batch.uploadedFilename ?? batch.sourceReference ?? "Manual operator batch"} ·{" "}
                        {formatDateTime(batch.createdAt)}
                      </p>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${getWorkflowTone(batch.batchStatus)}`}>
                      {batch.batchStatus.replaceAll("_", " ")}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-5">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/76">
                      Rows: <span className="font-semibold text-white">{batch.rowCount}</span>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/76">
                      Valid: <span className="font-semibold text-white">{batch.validRows}</span>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/76">
                      Duplicate: <span className="font-semibold text-white">{batch.duplicateRows}</span>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/76">
                      Unmatched: <span className="font-semibold text-white">{batch.unmatchedRows}</span>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/76">
                      Invalid / review: <span className="font-semibold text-white">{batch.invalidRows + batch.pendingReviewRows}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/12 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/72">
                No durable import batches are recorded yet. Phase 2 will wire the actual upload and validation preview workflow into these tables.
              </div>
            )}
          </div>
        </GlowCard>
      </Container>
    </div>
  );
}
