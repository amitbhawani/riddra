import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OperatorCmsConfirmPostForm } from "@/components/operator-cms-confirm-post-form";
import { ButtonLink, Container, Eyebrow, GlowCard } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import {
  cmsVerificationStates,
  cmsWorkflowStates,
  getOperatorCmsEntityDefinition,
  getOperatorCmsEntityPageData,
} from "@/lib/operator-cms";
import { getOperatorCmsWorkflowActionDescriptors } from "@/lib/operator-cms-mutations";

type PageProps = {
  params: Promise<{ entityType: string }>;
  searchParams: Promise<{ workflow?: string; verification?: string; q?: string; success?: string; error?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { entityType } = await params;
  const entity = getOperatorCmsEntityDefinition(entityType);

  return {
    title: entity ? `${entity.label} CMS` : "CMS section not found",
    description: entity
      ? `Operator-only CMS list view for ${entity.label}.`
      : "Operator-only CMS section.",
  };
}

function buildFilterHref(input: {
  entityType: string;
  workflow?: string;
  verification?: string;
  q?: string;
}) {
  const params = new URLSearchParams();

  if (input.workflow) {
    params.set("workflow", input.workflow);
  }

  if (input.verification) {
    params.set("verification", input.verification);
  }

  if (input.q) {
    params.set("q", input.q);
  }

  const suffix = params.toString();
  return suffix ? `/admin/cms/${input.entityType}?${suffix}` : `/admin/cms/${input.entityType}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function toneForWorkflow(value: string) {
  switch (value) {
    case "published":
      return "bg-emerald-500/12 text-emerald-200";
    case "approved":
      return "bg-sky-500/12 text-sky-200";
    case "pending_review":
      return "bg-amber-500/12 text-amber-100";
    case "rejected":
      return "bg-rose-500/12 text-rose-200";
    default:
      return "bg-white/[0.05] text-mist/74";
  }
}

function toneForVerification(value: string) {
  switch (value) {
    case "verified":
      return "bg-emerald-500/12 text-emerald-200";
    case "trusted_match":
      return "bg-sky-500/12 text-sky-200";
    case "needs_review":
      return "bg-amber-500/12 text-amber-100";
    case "rejected":
      return "bg-rose-500/12 text-rose-200";
    default:
      return "bg-white/[0.05] text-mist/74";
  }
}

function toneForImportReview(value: string) {
  switch (value) {
    case "valid":
    case "approved_for_import":
      return "bg-emerald-500/12 text-emerald-200";
    case "duplicate":
    case "unmatched":
    case "invalid":
    case "pending_validation":
      return "bg-amber-500/12 text-amber-100";
    case "rejected":
      return "bg-rose-500/12 text-rose-200";
    default:
      return "bg-white/[0.05] text-mist/74";
  }
}

export default async function AdminCmsEntityPage({ params, searchParams }: PageProps) {
  await requireAdmin();
  const { entityType } = await params;
  const filters = await searchParams;
  const data = await getOperatorCmsEntityPageData({
    entityType,
    workflow: filters.workflow,
    verification: filters.verification,
    query: filters.q,
  });

  if (!data.entity) {
    notFound();
  }

  return (
    <div className="py-16 sm:py-24">
      <Container className="space-y-10">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Eyebrow>{data.entity.label}</Eyebrow>
            <Link
              href="/admin/cms"
              className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-mist/74 transition hover:text-white"
            >
              Back to CMS
            </Link>
          </div>
          <h1 className="display-font text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {data.entity.label}
          </h1>
          <p className="max-w-4xl text-base leading-8 text-mist/76">
            {data.entity.description}
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
        ) : null}

        {data.schemaReady ? (
          <>
        <div className="grid gap-6 lg:grid-cols-5">
          <GlowCard>
            <p className="text-sm text-mist/68">Total records</p>
            <p className="mt-2 text-3xl font-semibold text-white">{data.stats.total}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Pending review</p>
            <p className="mt-2 text-3xl font-semibold text-white">{data.stats.pendingReview}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Verified</p>
            <p className="mt-2 text-3xl font-semibold text-white">{data.stats.verified}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Publicly visible</p>
            <p className="mt-2 text-3xl font-semibold text-white">{data.stats.publicVisible}</p>
          </GlowCard>
          <GlowCard>
            <p className="text-sm text-mist/68">Import review queue</p>
            <p className="mt-2 text-3xl font-semibold text-white">{data.stats.reviewQueue}</p>
          </GlowCard>
        </div>

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Filters</h2>
              <p className="mt-3 text-sm leading-7 text-mist/74">
                Filter by workflow and verification, search by title or slug, and jump straight into
                the durable record editor from this section.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={`/admin/cms/${entityType}/imports`} tone="secondary">
                Import batches
              </ButtonLink>
              <ButtonLink href={`/admin/cms/${entityType}/imports/new`} tone="secondary">
                New import
              </ButtonLink>
              <ButtonLink href={`/admin/cms/${entityType}/new`} tone="primary">
                New record
              </ButtonLink>
              <ButtonLink href={buildFilterHref({ entityType })} tone="secondary">
                Clear filters
              </ButtonLink>
            </div>
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr_1.2fr]">
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
              <p className="text-sm text-mist/66">Workflow</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {cmsWorkflowStates.map((state) => (
                  <Link
                    key={state}
                    href={buildFilterHref({
                      entityType,
                      workflow: state === data.activeWorkflow ? undefined : state,
                      verification: data.activeVerification || undefined,
                      q: data.activeQuery || undefined,
                    })}
                    className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] transition ${
                      state === data.activeWorkflow
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
              <p className="text-sm text-mist/66">Verification</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {cmsVerificationStates.map((state) => (
                  <Link
                    key={state}
                    href={buildFilterHref({
                      entityType,
                      workflow: data.activeWorkflow || undefined,
                      verification: state === data.activeVerification ? undefined : state,
                      q: data.activeQuery || undefined,
                    })}
                    className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] transition ${
                      state === data.activeVerification
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
              <p className="text-sm text-mist/66">Search</p>
              <form className="mt-3 flex items-center gap-2" action={`/admin/cms/${entityType}`}>
                {data.activeWorkflow ? <input type="hidden" name="workflow" value={data.activeWorkflow} /> : null}
                {data.activeVerification ? (
                  <input type="hidden" name="verification" value={data.activeVerification} />
                ) : null}
                <input
                  type="search"
                  name="q"
                  defaultValue={data.activeQuery}
                  placeholder={`Search ${data.entity.label.toLowerCase()}`}
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

        <GlowCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Records</h2>
              <p className="mt-3 text-sm leading-7 text-mist/74">
                Only records that eventually become <span className="text-white">verified</span> and <span className="text-white">published</span> should ever appear on public routes or search.
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/76">
              Public route base: <span className="font-semibold text-white">{data.entity.publicRouteBase ?? "Not assigned yet"}</span>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {data.records.length ? (
              data.records.map((record) => (
                <div key={record.id} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-white">{record.title}</p>
                      <p className="mt-2 text-xs leading-6 text-mist/60">
                        {record.canonicalSlug}
                        {record.canonicalSymbol ? ` · ${record.canonicalSymbol}` : ""} · Updated {formatDateTime(record.updatedAt)}
                      </p>
                      {record.reviewQueueReason ? (
                        <p className="mt-3 text-sm leading-7 text-amber-100/90">{record.reviewQueueReason}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${toneForWorkflow(record.workflowState)}`}>
                        {record.workflowState.replaceAll("_", " ")}
                      </div>
                      <div className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${toneForVerification(record.verificationState)}`}>
                        {record.verificationState.replaceAll("_", " ")}
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.16em] text-mist/74">
                        {record.publicationVisibility}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/76">
                      Published at:{" "}
                      <span className="font-semibold text-white">
                        {record.publishedAt ? formatDateTime(record.publishedAt) : "Not published"}
                      </span>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/76">
                      Public eligibility:{" "}
                      <span className="font-semibold text-white">
                        {record.workflowState === "published" &&
                        record.verificationState === "verified" &&
                        record.publicationVisibility === "public"
                          ? "Eligible"
                          : "Blocked"}
                      </span>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-mist/76">
                      Next operator step:{" "}
                      <span className="font-semibold text-white">
                        {record.workflowState === "draft"
                          ? "Prepare review"
                          : record.workflowState === "pending_review"
                            ? "Review and approve"
                            : record.workflowState === "approved"
                              ? "Publish when verified"
                              : record.workflowState === "published"
                                ? "Monitor and archive safely"
                                : "Review state"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/admin/cms/${entityType}/${record.id}`}
                      className="inline-flex items-center justify-center rounded-full bg-aurora px-4 py-2 text-sm font-medium text-ink transition hover:bg-[#75f0d3]"
                    >
                      Edit
                    </Link>
                    {getOperatorCmsWorkflowActionDescriptors({
                      workflowState: record.workflowState,
                      verificationState: record.verificationState,
                    }).map((item) => (
                      <OperatorCmsConfirmPostForm
                        key={`${record.id}-${item.action}`}
                        action={`/api/admin/cms/records/${record.id}/workflow`}
                        compact
                        confirmMessage={item.confirmMessage}
                        fields={{
                          action: item.action,
                          returnTo: buildFilterHref({
                            entityType,
                            workflow: data.activeWorkflow || undefined,
                            verification: data.activeVerification || undefined,
                            q: data.activeQuery || undefined,
                          }),
                        }}
                        label={item.label}
                        tone={item.tone}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/12 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/72">
                No durable records are loaded for the current filters yet.
              </div>
            )}
          </div>
        </GlowCard>

        <GlowCard>
          <h2 className="text-2xl font-semibold text-white">Import review queue</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-mist/74">
            Duplicate, unmatched, and invalid import rows stay in a durable operator queue so raw imports never create accidental public pages.
          </p>
          <div className="mt-5 grid gap-3">
            {data.reviewQueue.length ? (
              data.reviewQueue.map((row) => (
                <div key={row.id} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">
                        Row {row.rowNumber} · {row.proposedTitle ?? row.proposedSlug ?? "Untitled import row"}
                      </p>
                      <p className="mt-2 text-xs leading-6 text-mist/60">
                        {row.sourceLabel} · {formatDateTime(row.updatedAt)}
                        {row.proposedSymbol ? ` · ${row.proposedSymbol}` : ""}
                      </p>
                      {row.reviewNotes ? (
                        <p className="mt-3 text-sm leading-7 text-mist/72">{row.reviewNotes}</p>
                      ) : null}
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${toneForImportReview(row.validationState)}`}>
                      {row.validationState.replaceAll("_", " ")}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/12 bg-black/15 px-4 py-4 text-sm leading-7 text-mist/72">
                No durable review-queue rows are recorded for this content type right now.
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
