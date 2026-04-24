import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OperatorCmsConfirmPostForm } from "@/components/operator-cms-confirm-post-form";
import { Container, Eyebrow, GlowCard } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { cmsImportRowStates } from "@/lib/operator-cms";
import { getOperatorCmsImportBatchPageData } from "@/lib/operator-cms-imports";

type PageProps = {
  params: Promise<{ entityType: string; batchId: string }>;
  searchParams: Promise<{ state?: string; q?: string; success?: string; error?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { entityType, batchId } = await params;

  return {
    title: `${entityType} import batch ${batchId}`,
    description: `Review CMS import batch ${batchId}.`,
  };
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function buildFilterHref(input: {
  entityType: string;
  batchId: string;
  state?: string;
  q?: string;
}) {
  const params = new URLSearchParams();

  if (input.state) {
    params.set("state", input.state);
  }

  if (input.q) {
    params.set("q", input.q);
  }

  const suffix = params.toString();
  return suffix
    ? `/admin/cms/${input.entityType}/imports/${input.batchId}?${suffix}`
    : `/admin/cms/${input.entityType}/imports/${input.batchId}`;
}

export default async function AdminCmsImportBatchPage({ params, searchParams }: PageProps) {
  await requireAdmin();
  const { entityType, batchId } = await params;
  const filters = await searchParams;
  const data = await getOperatorCmsImportBatchPageData({
    entityType,
    batchId,
    state: filters.state,
    query: filters.q,
  });

  if (!data.entity) {
    notFound();
  }

  if (data.schemaReady && !data.batch) {
    notFound();
  }

  const returnTo = buildFilterHref({
    entityType,
    batchId,
    state: data.activeState || undefined,
    q: data.activeQuery || undefined,
  });

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-8">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Eyebrow>{data.entity.label} import batch</Eyebrow>
            <Link
              href={`/admin/cms/${entityType}/imports`}
              className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-mist/74 transition hover:text-white"
            >
              Back to batches
            </Link>
          </div>
          <h1 className="display-font text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {data.batch?.sourceLabel ?? "Import batch"}
          </h1>
          <p className="max-w-4xl text-base leading-8 text-mist/76">
            Review row-level validation, approve safe rows for import, reject unsafe rows, and apply
            approved rows into CMS records without bypassing workflow or publish rules.
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
        ) : data.batch ? (
          <>
            <div className="grid gap-6 xl:grid-cols-6">
              <GlowCard>
                <p className="text-sm text-mist/68">Rows</p>
                <p className="mt-2 text-2xl font-semibold text-white">{data.batch.rowCount}</p>
              </GlowCard>
              <GlowCard>
                <p className="text-sm text-mist/68">Valid</p>
                <p className="mt-2 text-2xl font-semibold text-white">{data.batch.validRows}</p>
              </GlowCard>
              <GlowCard>
                <p className="text-sm text-mist/68">Duplicate</p>
                <p className="mt-2 text-2xl font-semibold text-white">{data.batch.duplicateRows}</p>
              </GlowCard>
              <GlowCard>
                <p className="text-sm text-mist/68">Unmatched</p>
                <p className="mt-2 text-2xl font-semibold text-white">{data.batch.unmatchedRows}</p>
              </GlowCard>
              <GlowCard>
                <p className="text-sm text-mist/68">Invalid</p>
                <p className="mt-2 text-2xl font-semibold text-white">{data.batch.invalidRows}</p>
              </GlowCard>
              <GlowCard>
                <p className="text-sm text-mist/68">Approved / applied</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {data.batch.approvedRows} / {data.batch.appliedRows}
                </p>
              </GlowCard>
            </div>

            <GlowCard className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-white">Batch status</h2>
                  <p className="mt-3 text-sm leading-7 text-mist/74">
                    {data.batch.sourceReference ?? data.batch.uploadedFilename ?? "Manual import"} ·{" "}
                    {formatDateTime(data.batch.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm uppercase tracking-[0.16em] text-mist/74">
                    {data.batch.batchStatus}
                  </div>
                  <OperatorCmsConfirmPostForm
                    action={`/api/admin/cms/import-batches/${batchId}/apply`}
                    confirmMessage="Apply all approved rows to CMS records? This will create or update draft-safe CMS records only."
                    fields={{ returnTo }}
                    label="Apply approved rows"
                    tone="primary"
                  />
                </div>
              </div>
              <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <p className="text-sm text-mist/66">Row filters</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {cmsImportRowStates.map((state) => (
                      <Link
                        key={state}
                        href={buildFilterHref({
                          entityType,
                          batchId,
                          state: state === data.activeState ? undefined : state,
                          q: data.activeQuery || undefined,
                        })}
                        className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] transition ${
                          state === data.activeState
                            ? "bg-aurora text-ink"
                            : "border border-white/10 bg-white/[0.03] text-mist/74 hover:text-white"
                        }`}
                      >
                        {state.replaceAll("_", " ")}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <p className="text-sm text-mist/66">Search rows</p>
                  <form className="mt-3 flex items-center gap-2" action={`/admin/cms/${entityType}/imports/${batchId}`}>
                    {data.activeState ? <input type="hidden" name="state" value={data.activeState} /> : null}
                    <input
                      type="search"
                      name="q"
                      defaultValue={data.activeQuery}
                      placeholder="Search slug, title, or symbol"
                      className="w-full rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm text-white outline-none placeholder:text-mist/50"
                    />
                    <button
                      type="submit"
                      className="rounded-full bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.16em] text-white transition hover:bg-white/16"
                    >
                      Apply
                    </button>
                  </form>
                </div>
              </div>
            </GlowCard>

            <GlowCard className="space-y-5">
              <div>
                <h2 className="text-2xl font-semibold text-white">Row review queue</h2>
                <p className="mt-3 text-sm leading-7 text-mist/74">
                  Only valid rows can be approved for import. Duplicate, unmatched, and invalid rows stay out of public content.
                </p>
              </div>
              <div className="grid gap-3">
                {data.rows.length ? (
                  data.rows.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-3xl border border-white/8 bg-black/15 px-4 py-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-lg font-semibold text-white">
                            Row {row.rowNumber} · {row.proposedTitle ?? row.proposedSlug ?? "Untitled row"}
                          </p>
                          <p className="mt-2 text-xs leading-6 text-mist/60">
                            {row.proposedSlug ?? "no slug"}
                            {row.proposedSymbol ? ` · ${row.proposedSymbol}` : ""}
                            {` · Updated ${formatDateTime(row.updatedAt)}`}
                          </p>
                        </div>
                        <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.16em] text-mist/74">
                          {row.validationState.replaceAll("_", " ")}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-3">
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/76">
                          Trusted match: <span className="font-semibold text-white">{row.trustedMatchStatus}</span>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/76">
                          Target record: <span className="font-semibold text-white">{row.targetRecordId ?? "New record"}</span>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/76">
                          Duplicate of: <span className="font-semibold text-white">{row.duplicateOfId ?? "None"}</span>
                        </div>
                      </div>

                      <p className="mt-4 text-sm leading-7 text-mist/74">{row.trustedMatchSummary}</p>

                      {row.validationErrors.length ? (
                        <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-100">
                          {row.validationErrors.join(" ")}
                        </div>
                      ) : null}

                      <form
                        action={`/api/admin/cms/import-batches/${batchId}/rows/${row.id}/review`}
                        method="post"
                        className="mt-4 grid gap-3"
                      >
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <textarea
                          className="min-h-[96px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-white/20"
                          name="reviewNotes"
                          defaultValue={row.reviewNotes ?? ""}
                          placeholder="Add operator review notes if needed"
                        />
                        <div className="flex flex-wrap gap-3">
                          {row.validationState === "valid" ? (
                            <button
                              className="inline-flex items-center justify-center rounded-full bg-aurora px-4 py-2 text-sm font-medium text-ink transition hover:bg-[#75f0d3]"
                              name="decision"
                              type="submit"
                              value="approve_for_import"
                            >
                              Approve for import
                            </button>
                          ) : null}
                          {row.validationState !== "rejected" ? (
                            <button
                              className="inline-flex items-center justify-center rounded-full border border-rose-500/25 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/16"
                              name="decision"
                              type="submit"
                              value="reject"
                            >
                              Reject row
                            </button>
                          ) : null}
                        </div>
                      </form>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/12 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/72">
                    No import rows match the current filters.
                  </div>
                )}
              </div>
            </GlowCard>
          </>
        ) : null}
      </Container>
    </div>
  );
}
