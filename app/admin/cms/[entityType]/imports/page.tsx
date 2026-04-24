import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ButtonLink, Container, Eyebrow, GlowCard } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getOperatorCmsImportListPageData } from "@/lib/operator-cms-imports";

type PageProps = {
  params: Promise<{ entityType: string }>;
  searchParams: Promise<{ status?: string; success?: string; error?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { entityType } = await params;

  return {
    title: `${entityType} import batches`,
    description: `Operator-only import batches for ${entityType}.`,
  };
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function buildFilterHref(entityType: string, status?: string) {
  return status ? `/admin/cms/${entityType}/imports?status=${status}` : `/admin/cms/${entityType}/imports`;
}

export default async function AdminCmsImportBatchesPage({ params, searchParams }: PageProps) {
  await requireAdmin();
  const { entityType } = await params;
  const filters = await searchParams;
  const data = await getOperatorCmsImportListPageData({
    entityType,
    status: filters.status,
  });

  if (!data.entity) {
    notFound();
  }

  const batchStatuses = ["review", "approved", "applied", "rejected", "failed"] as const;

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-8">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Eyebrow>{data.entity.label} imports</Eyebrow>
            <Link
              href={`/admin/cms/${entityType}`}
              className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-mist/74 transition hover:text-white"
            >
              Back to section
            </Link>
          </div>
          <h1 className="display-font text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Import batches
          </h1>
          <p className="max-w-4xl text-base leading-8 text-mist/76">
            Review durable import batches before anything creates or updates CMS records.
          </p>
        </div>

        {filters.success ? (
          <GlowCard className="border-emerald-500/25 bg-emerald-500/10">
            <p className="text-sm leading-7 text-emerald-50/95">{filters.success}</p>
          </GlowCard>
        ) : null}

        {filters.error ? (
          <GlowCard className="border-rose-500/25 bg-rose-500/10">
            <p className="text-sm leading-7 text-rose-50/95">{filters.error}</p>
          </GlowCard>
        ) : null}

        {!data.schemaReady ? (
          <GlowCard className="border-amber-500/25 bg-amber-500/10">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-100/80">Schema required</p>
            <p className="mt-3 text-sm leading-7 text-amber-50/90">{data.schemaError}</p>
          </GlowCard>
        ) : (
          <>
            <GlowCard>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-white">Batch filters</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">
                    Filter import batches by status and open the durable review queue for row-by-row decisions.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <ButtonLink href={`/admin/cms/${entityType}/imports/new`} tone="primary">
                    New import
                  </ButtonLink>
                  <ButtonLink href={buildFilterHref(entityType)} tone="secondary">
                    Clear filters
                  </ButtonLink>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {batchStatuses.map((status) => (
                  <Link
                    key={status}
                    href={buildFilterHref(
                      entityType,
                      status === data.activeStatus ? undefined : status,
                    )}
                    className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] transition ${
                      status === data.activeStatus
                        ? "bg-aurora text-ink"
                        : "border border-white/10 bg-white/[0.03] text-mist/74 hover:text-white"
                    }`}
                  >
                    {status}
                  </Link>
                ))}
              </div>
            </GlowCard>

            <GlowCard className="space-y-5">
              <div>
                <h2 className="text-2xl font-semibold text-white">Batches</h2>
                <p className="mt-3 text-sm leading-7 text-mist/74">
                  Import batches never publish content directly. They only queue validated rows for controlled apply.
                </p>
              </div>
              <div className="grid gap-3">
                {data.batches.length ? (
                  data.batches.map((batch) => (
                    <div
                      key={batch.id}
                      className="rounded-3xl border border-white/8 bg-black/15 px-4 py-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-lg font-semibold text-white">{batch.sourceLabel}</p>
                          <p className="mt-2 text-xs leading-6 text-mist/60">
                            {batch.sourceReference ?? batch.uploadedFilename ?? "Manual operator import"} ·{" "}
                            {formatDateTime(batch.createdAt)}
                          </p>
                        </div>
                        <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.16em] text-mist/74">
                          {batch.batchStatus}
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-6">
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
                          Invalid: <span className="font-semibold text-white">{batch.invalidRows}</span>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/76">
                          Approved / applied:{" "}
                          <span className="font-semibold text-white">
                            {batch.approvedRows} / {batch.appliedRows}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Link
                          href={`/admin/cms/${entityType}/imports/${batch.id}`}
                          className="inline-flex items-center justify-center rounded-full bg-aurora px-4 py-2 text-sm font-medium text-ink transition hover:bg-[#75f0d3]"
                        >
                          Open batch
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/12 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/72">
                    No durable import batches have been created for this content type yet.
                  </div>
                )}
              </div>
            </GlowCard>
          </>
        )}
      </Container>
    </div>
  );
}
