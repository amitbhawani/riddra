import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminBadge } from "@/components/admin/admin-primitives";
import { formatAdminDateTime } from "@/lib/admin-time";
import {
  adminFamilyMeta,
  getAdminRecordEditorData,
  type AdminFamilyKey,
} from "@/lib/admin-content-registry";
import {
  type AdminManagedDocument,
  type AdminManagedRecord,
  type AdminPublishState,
} from "@/lib/admin-operator-store";
import {
  advancedSectionKeys,
  getSectionOrderForFamily,
  getSectionPresentation,
} from "@/lib/admin-record-presentation";
import { requireOperator } from "@/lib/auth";
import { canEditAdminFamily } from "@/lib/product-permissions";
import { getCmsPreviewSession, isValidCmsPreviewToken } from "@/lib/user-product-store";

type Params = Promise<{ token: string }>;

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

function getStatusTone(status: AdminPublishState) {
  if (status === "published") return "success" as const;
  if (status === "ready_for_review") return "warning" as const;
  if (status === "needs_fix") return "danger" as const;
  return "default" as const;
}

function hasMeaningfulValue(value: string | null | undefined) {
  return Boolean(String(value ?? "").trim());
}

function buildPreviewRecord(preview: NonNullable<Awaited<ReturnType<typeof getCmsPreviewSession>>>) {
  const payload = preview.payload;

  return {
    id: `preview-${preview.token}`,
    family: preview.family,
    slug: preview.slug,
    title: preview.title,
    symbol: payload.symbol ?? null,
    benchmarkMapping: payload.benchmarkMapping ?? null,
    status: payload.status,
    visibility:
      payload.visibility ??
      (payload.status === "published"
        ? "public"
        : payload.status === "archived"
          ? "archived"
          : "private"),
    publicHref: payload.publicHref ?? payload.canonicalRoute ?? preview.routeTarget ?? null,
    canonicalRoute: payload.canonicalRoute ?? payload.publicHref ?? preview.routeTarget ?? null,
    sourceTable: payload.sourceTable ?? null,
    sourceRowId: payload.sourceRowId ?? null,
    sourceLabel: payload.sourceLabel ?? "",
    sourceDate: payload.sourceDate ?? "",
    sourceUrl: payload.sourceUrl ?? "",
    sourceState: {
      sourceLabel: payload.sourceLabel ?? "",
      sourceUrl: payload.sourceUrl ?? "",
      sourceDate: payload.sourceDate ?? "",
      lastRefreshAt: payload.sourceDate ?? null,
      lastSuccessfulRefreshAt: payload.sourceDate ?? null,
      nextScheduledRefreshAt: null,
      freshnessState: payload.sourceLabel ? "fresh" : "manual_only",
      sourceStatus: payload.sourceLabel ? "ok" : "manual_only",
      importStatus: payload.sourceLabel ? "source_current" : "not_connected",
      readFailure: null,
      latestError: null,
    },
    refreshState: {
      laneKey: payload.family,
      laneLabel: `${adminFamilyMeta[preview.family as AdminFamilyKey]?.singular ?? "Record"} preview`,
      refreshEnabled: false,
      cadence: "Preview only",
      lastRunAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      latestStatus: "planned",
      latestError: null,
      nextScheduledRunAt: null,
      manualRunSupported: false,
      sourceDependency: "Draft preview session",
    },
    accessControl: {
      mode: payload.accessControl?.mode ?? "public_free",
      allowedMembershipTiers: payload.accessControl?.allowedMembershipTiers ?? [],
      requireLogin: payload.accessControl?.requireLogin ?? false,
      showTeaserPublicly: payload.accessControl?.showTeaserPublicly ?? true,
      showLockedPreview: payload.accessControl?.showLockedPreview ?? false,
      ctaLabel: payload.accessControl?.ctaLabel ?? null,
      ctaHref: payload.accessControl?.ctaHref ?? null,
      internalNotes: payload.accessControl?.internalNotes ?? null,
    },
    assignedTo: payload.assignedTo ?? null,
    assignedBy: payload.assignedBy ?? null,
    dueDate: payload.dueDate ?? null,
    createdAt: preview.createdAt,
    updatedAt: preview.createdAt,
    scheduledPublishAt: payload.scheduledPublishAt ?? null,
    scheduledUnpublishAt: payload.scheduledUnpublishAt ?? null,
    sections: payload.sections ?? {},
    documents: (payload.documents ?? []) as AdminManagedDocument[],
    imports: [],
  } satisfies AdminManagedRecord;
}

function getOrderedSections(family: AdminFamilyKey, sections: Awaited<ReturnType<typeof getAdminRecordEditorData>>["sections"]) {
  const order = getSectionOrderForFamily(family);
  const ranks = new Map(order.map((key, index) => [key, index]));

  return [...sections].sort((left, right) => {
    const leftRank = ranks.get(left.definition.key) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = ranks.get(right.definition.key) ?? Number.MAX_SAFE_INTEGER;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return left.definition.label.localeCompare(right.definition.label);
  });
}

function extractSectionRows(section: Awaited<ReturnType<typeof getAdminRecordEditorData>>["sections"][number]) {
  return section.definition.fields
    .map((field) => ({
      key: field.key,
      label: field.label,
      value:
        section.effectiveValues[field.key] ??
        section.manualValues[field.key] ??
        section.sourceValues[field.key] ??
        "",
    }))
    .filter((item) => hasMeaningfulValue(item.value));
}

function findFirstValue(
  sections: Awaited<ReturnType<typeof getAdminRecordEditorData>>["sections"],
  fieldKeys: string[],
) {
  for (const section of sections) {
    for (const fieldKey of fieldKeys) {
      const value =
        section.effectiveValues[fieldKey] ??
        section.manualValues[fieldKey] ??
        section.sourceValues[fieldKey] ??
        "";
      if (hasMeaningfulValue(value)) {
        return value;
      }
    }
  }

  return "";
}

export default async function CmsPreviewPage({
  params,
}: {
  params: Params;
}) {
  const { role, capabilities } = await requireOperator();
  const { token } = await params;
  if (!isValidCmsPreviewToken(token)) {
    notFound();
  }
  const preview = await getCmsPreviewSession(token);

  if (!preview) {
    notFound();
  }

  const family = preview.family as AdminFamilyKey;
  if (!adminFamilyMeta[family]) {
    notFound();
  }

  if (!canEditAdminFamily(role, capabilities, family)) {
    notFound();
  }

  const previewRecord = buildPreviewRecord(preview);
  const editor = await getAdminRecordEditorData(family, preview.slug, previewRecord);
  const orderedSections = getOrderedSections(family, editor.sections);
  const visibleSections = orderedSections.filter((section) => {
    if (
      advancedSectionKeys.has(section.definition.key) ||
      ["publishing", "access_control", "seo"].includes(section.definition.key)
    ) {
      return false;
    }

    return extractSectionRows(section).length > 0;
  });

  const heroImage = findFirstValue(editor.sections, ["coverImage", "thumbnail", "ogImage"]);
  const heroSummary = findFirstValue(editor.sections, [
    "shortDescription",
    "summary",
    "subtitle",
    "description",
    "body",
  ]);

  return (
    <div className="min-h-screen bg-[#f3f4f6] px-4 py-8 text-[#111827]">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="rounded-xl border border-[#d1d5db] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                Draft preview
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <AdminBadge label="Preview only" tone="info" />
                <AdminBadge label={editor.publishState.replaceAll("_", " ")} tone={getStatusTone(editor.publishState)} />
                <AdminBadge
                  label={editor.overrideActive ? "Draft overrides active" : "Source-backed draft"}
                  tone={editor.overrideActive ? "warning" : "info"}
                />
                <AdminBadge label={editor.familyLabel} tone="default" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-[#111827]">{editor.title}</h1>
                <p className="mt-2 text-sm leading-6 text-[#4b5563]">
                  This draft preview is isolated from live content. It uses the current CMS draft values only, never writes back to the live page, and expires on{" "}
                  {formatAdminDateTime(preview.expiresAt)}.
                </p>
              </div>
              {heroSummary ? (
                <p className="text-[15px] leading-7 text-[#374151]">{heroSummary}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {preview.routeTarget ? (
                  <Link
                    href={preview.routeTarget}
                    className="inline-flex h-9 items-center rounded-lg border border-[#0f172a] bg-[#0f172a] px-4 text-[13px] font-medium text-white"
                  >
                    View live route
                  </Link>
                ) : null}
                <Link
                  href={`/admin/content/${preview.family}/${preview.slug}`}
                  className="inline-flex h-9 items-center rounded-lg border border-[#d1d5db] bg-white px-4 text-[13px] font-medium text-[#111827]"
                >
                  Return to editor
                </Link>
              </div>
            </div>

            <div className="w-full max-w-sm rounded-xl border border-[#d1d5db] bg-[#f8fafc] p-3">
              {heroImage ? (
                <img
                  src={heroImage}
                  alt={editor.title}
                  className="h-48 w-full rounded-lg border border-[#d1d5db] object-cover"
                />
              ) : (
                <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-[#d1d5db] bg-white text-[13px] text-[#6b7280]">
                  No cover image selected yet
                </div>
              )}
              <div className="mt-3 grid gap-2">
                <div className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">
                    Preview status
                  </p>
                  <p className="mt-1 text-[13px] text-[#111827]">
                    Active until {formatAdminDateTime(preview.expiresAt)}
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-[#6b7280]">
                    Created by {preview.createdBy} on {formatAdminDateTime(preview.createdAt)}
                  </p>
                </div>
                <div className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">
                    Live route target
                  </p>
                  <p className="mt-1 text-[13px] capitalize text-[#111827]">
                    {editor.publicHref || "Will be assigned after save"}
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-[#6b7280]">
                    The preview itself does not publish to this route until the record is saved or published.
                  </p>
                </div>
                <div className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">
                    Access
                  </p>
                  <p className="mt-1 text-[13px] capitalize text-[#111827]">
                    {editor.accessControl.mode.replaceAll("_", " ")}
                  </p>
                </div>
                <div className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">
                    Lifecycle
                  </p>
                  <p className="mt-1 text-[13px] text-[#111827]">
                    Publish: {formatAdminDateTime(editor.scheduledPublishAt)}
                  </p>
                  <p className="mt-1 text-[13px] text-[#111827]">
                    Unpublish: {formatAdminDateTime(editor.scheduledUnpublishAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            {visibleSections.map((section) => {
              const presentation = getSectionPresentation(family, section.definition.key);
              const rows = extractSectionRows(section);

              return (
                <section
                  key={section.definition.key}
                  className="rounded-xl border border-[#d1d5db] bg-white p-6 shadow-sm"
                >
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
                      {presentation.frontendSection || "Draft section"}
                    </p>
                    <h2 className="text-xl font-semibold tracking-tight text-[#111827]">
                      {presentation.title || section.definition.label}
                    </h2>
                    <p className="text-sm leading-6 text-[#4b5563]">
                      {presentation.description || section.definition.description}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {rows.map((row) => (
                      <div
                        key={`${section.definition.key}-${row.key}`}
                        className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3"
                      >
                        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">
                          {row.label}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#111827]">
                          {row.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <section className="rounded-xl border border-[#d1d5db] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-[#111827]">SEO preview</h2>
              <div className="mt-3 space-y-2">
                {orderedSections
                  .filter((section) => section.definition.key === "seo")
                  .flatMap((section) => extractSectionRows(section))
                  .map((row) => (
                    <div key={row.key} className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#6b7280]">
                        {row.label}
                      </p>
                      <p className="mt-1 break-words text-[13px] leading-5 text-[#111827]">
                        {row.value}
                      </p>
                    </div>
                  ))}
              </div>
            </section>

            {previewRecord.documents.length ? (
              <section className="rounded-xl border border-[#d1d5db] bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-[#111827]">Documents and links</h2>
                <div className="mt-3 space-y-2">
                  {previewRecord.documents.filter((item) => item.enabled !== false).map((document) => (
                    <div
                      key={document.id}
                      className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-3 py-2"
                    >
                      <p className="text-[13px] font-medium text-[#111827]">{document.label}</p>
                      <p className="mt-1 break-words text-[12px] text-[#4b5563]">{document.href}</p>
                      {(document.sourceLabel || document.sourceDate) ? (
                        <p className="mt-1 text-[12px] text-[#6b7280]">
                          {document.sourceLabel} {document.sourceDate}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
