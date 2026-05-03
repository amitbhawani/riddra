import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { requireOperator } from "@/lib/auth";
import { appendAdminActivityLog } from "@/lib/admin-activity-log";
import {
  getAdminFamilyRows,
  getAdminRecordEditorData,
} from "@/lib/admin-content-registry";
import {
  AdminOperatorValidationError,
  assertAdminFamily,
  assertAdminSlug,
  sanitizeAdminFailureMessage,
  sanitizeAdminRecordPayload,
} from "@/lib/admin-operator-guards";
import {
  appendAdminRecordRevision,
  deleteAdminManagedRecord,
  getAdminOperatorStore,
  getAdminManagedRecord,
  saveAdminManagedRecord,
  type SaveAdminRecordInput,
} from "@/lib/admin-operator-store";
import { canEditAdminFamily, hasProductUserCapability } from "@/lib/product-permissions";
import { saveAdminPendingApproval } from "@/lib/admin-approvals";
import { persistApprovedAdminRecordChange } from "@/lib/admin-record-workflow";
import { syncSearchIndexForAdminContentChange } from "@/lib/search-index-rebuild";
import type { AdminEditorRecord, AdminFamilyKey, AdminListRow } from "@/lib/admin-content-schema";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function revalidateAdminRecentEditSurfaces(family: AdminFamilyKey, slugs: string[] = []) {
  revalidatePath("/admin");
  revalidatePath("/admin/activity-log");
  revalidatePath("/admin/change-log");
  revalidatePath("/admin/readiness");
  revalidatePath("/admin/sitemap");
  revalidatePath("/admin/content");
  revalidatePath(`/admin/content/${family}`);
  for (const slug of slugs) {
    revalidatePath(`/admin/content/${family}/${slug}`);
  }
}

function getEditorFieldValue(
  record: AdminEditorRecord,
  sectionKey: string,
  fieldKey: string,
) {
  const section = record.sections.find((item) => item.definition.key === sectionKey);
  return section?.effectiveValues[fieldKey] ?? section?.manualValues[fieldKey] ?? "";
}

function buildSectionsFromEditorRecord(
  editorRecord: AdminEditorRecord,
  mode: "preserve" | "duplicate" = "preserve",
) {
  return Object.fromEntries(
    editorRecord.sections.map((section) => [
      section.definition.key,
      {
        mode:
          mode === "duplicate" && section.mode === "auto_source"
            ? "manual_override"
            : section.mode,
        values: mode === "duplicate" ? section.effectiveValues : section.manualValues,
        note: section.note,
        lastManualEditAt: section.lastManualEditAt,
        expiresAt: section.expiresAt,
      },
    ]),
  );
}

function buildSaveInputFromEditorRecord(
  editorRecord: AdminEditorRecord,
  overrides: Partial<SaveAdminRecordInput> = {},
  mode: "preserve" | "duplicate" = "preserve",
): SaveAdminRecordInput {
  return {
    recordId: editorRecord.id,
    originalSlug: editorRecord.slug,
    lastKnownUpdatedAt: editorRecord.updatedAt,
    family: editorRecord.family,
    slug: editorRecord.slug,
    title: editorRecord.title,
    symbol: editorRecord.symbol,
    benchmarkMapping:
      getEditorFieldValue(editorRecord, "identity", "benchmarkIndexSlug") ||
      getEditorFieldValue(editorRecord, "identity", "sectorIndexSlug") ||
      getEditorFieldValue(editorRecord, "identity", "benchmarkMapping") ||
      null,
    status: editorRecord.publishState,
    visibility: editorRecord.visibility,
    publicHref: editorRecord.publicHref,
    canonicalRoute: editorRecord.canonicalRoute,
    sourceTable: editorRecord.sourceTable,
    sourceRowId: editorRecord.sourceRowId,
    sourceLabel: editorRecord.sourceLabel,
    sourceDate: editorRecord.sourceDate,
    sourceUrl: editorRecord.sourceUrl,
    accessControl: editorRecord.accessControl,
    assignedTo: getEditorFieldValue(editorRecord, "workflow", "assignedTo") || null,
    assignedBy: getEditorFieldValue(editorRecord, "workflow", "assignedBy") || null,
    dueDate: getEditorFieldValue(editorRecord, "workflow", "dueDate") || null,
    scheduledPublishAt:
      getEditorFieldValue(editorRecord, "publishing", "scheduledPublishAt") || null,
    scheduledUnpublishAt:
      getEditorFieldValue(editorRecord, "publishing", "scheduledUnpublishAt") || null,
    sections: buildSectionsFromEditorRecord(editorRecord, mode),
    documents: [],
    ...overrides,
  };
}

async function getAdminRow(family: AdminFamilyKey, slug: string): Promise<AdminListRow | null> {
  const store = await getAdminOperatorStore();
  const rows = await getAdminFamilyRows(family, store.records, {
    cacheKey: store.updatedAt,
  });
  return rows.find((row) => row.slug === slug) ?? null;
}

function buildDuplicateSlug(baseSlug: string, existingSlugs: Set<string>) {
  const base = `${baseSlug}-copy`;
  if (!existingSlugs.has(base)) {
    return base;
  }

  let index = 2;
  while (existingSlugs.has(`${base}-${index}`)) {
    index += 1;
  }

  return `${base}-${index}`;
}

export async function POST(request: NextRequest) {
  try {
    const { user, role, capabilities } = await requireOperator();
    const payload = (await request.json()) as SaveAdminRecordInput & {
      action?: "save" | "quick_edit" | "bulk_update" | "duplicate" | "delete";
      family: string;
      recordId?: string | null;
      originalSlug?: string | null;
      lastKnownUpdatedAt?: string | null;
      slugs?: string[];
      bulkAction?: "publish" | "archive" | "assign";
      accessMode?: SaveAdminRecordInput["accessControl"] extends { mode: infer T } ? T : never;
      assignedToEmail?: string | null;
    };

    if (!payload?.family) {
      return badRequest("Family is required.");
    }

    const family = assertAdminFamily(payload.family);
    if (!canEditAdminFamily(role, capabilities, family)) {
      throw new AdminOperatorValidationError("You do not have permission to edit this content family.", 403);
    }

    if (
      role !== "admin" &&
      (payload.action === "quick_edit" ||
        payload.action === "bulk_update" ||
        payload.action === "duplicate" ||
        payload.action === "delete")
    ) {
      throw new AdminOperatorValidationError(
        "These bulk and direct-edit actions are only available to admins.",
        403,
      );
    }

    if (payload.action === "delete") {
      if (!payload?.slug) {
        return badRequest("Slug is required to delete a record.");
      }

      const slug = assertAdminSlug(payload.slug);
      const existing = await getAdminManagedRecord(
        family,
        payload.originalSlug?.trim() || slug,
        payload.recordId?.trim() || null,
      );

      if (!existing) {
        return NextResponse.json({ error: "Record not found." }, { status: 404 });
      }

      const row = await getAdminRow(family, existing.slug);
      if (!row || row.sourceState !== "manual_only") {
        throw new AdminOperatorValidationError(
          "Only manual-only records can be deleted from the sitemap.",
          400,
        );
      }

      const deleted = await deleteAdminManagedRecord({
        family,
        slug: existing.slug,
        recordId: existing.id,
      });

      if (!deleted) {
        return NextResponse.json({ error: "Record could not be deleted." }, { status: 500 });
      }

      await appendAdminActivityLog({
        actorUserId: user.id,
        actorEmail: user.email ?? "Admin",
        actionType: "content.deleted",
        targetType: "content_record",
        targetId: deleted.id,
        targetFamily: family,
        targetSlug: deleted.slug,
        summary: `Deleted ${deleted.title} from ${family}.`,
        metadata: {
          title: deleted.title,
          publicHref: deleted.publicHref,
          sourceState: row.sourceState,
        },
      });

      revalidateAdminRecentEditSurfaces(family, [deleted.slug]);
      if (deleted.publicHref) {
        revalidatePath(deleted.publicHref);
      }
      if (family === "stocks") {
        try {
          await syncSearchIndexForAdminContentChange({
            family: "stocks",
            slugs: [deleted.slug],
            requestedBy: user.email ?? "Admin",
            source: "admin_records_delete",
            force: true,
            publicStatus: "archived",
          });
        } catch (error) {
          console.error("[search-index-sync] stock delete refresh failed", {
            family,
            slug: deleted.slug,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return NextResponse.json({
        ok: true,
        deletedSlug: deleted.slug,
        deletedTitle: deleted.title,
        operation: "deleted",
      });
    }

    if (payload.action === "quick_edit") {
      if (!payload?.slug || !payload?.title) {
        return badRequest("Slug and title are required for quick edit.");
      }

      const slug = assertAdminSlug(payload.slug);
      const existing = await getAdminManagedRecord(
        family,
        payload.originalSlug?.trim() || slug,
        payload.recordId?.trim() || null,
      );
      const editorRecord = await getAdminRecordEditorData(
        family,
        existing?.slug ?? slug,
        existing,
      );
      const nextStatus = payload.status ?? existing?.status ?? editorRecord.publishState;
      const currentStatus = existing?.status ?? editorRecord.publishState;
      const touchesLiveState =
        nextStatus !== currentStatus &&
        ([currentStatus, nextStatus].includes("published") ||
          [currentStatus, nextStatus].includes("archived"));
      if (
        (touchesLiveState || nextStatus === "published" || nextStatus === "archived") &&
        !hasProductUserCapability(role, capabilities, "can_publish_content")
      ) {
        throw new AdminOperatorValidationError(
          "You do not have permission to publish or archive content.",
          403,
        );
      }

      const baseInput = buildSaveInputFromEditorRecord(editorRecord, {
        recordId: existing?.id ?? null,
        originalSlug: existing?.slug ?? editorRecord.slug,
        title: payload.title?.trim() || editorRecord.title,
        status: nextStatus,
        accessControl: {
          ...editorRecord.accessControl,
          mode: payload.accessMode ?? editorRecord.accessControl.mode,
        },
      });

      const saved = await saveAdminManagedRecord(
        sanitizeAdminRecordPayload(baseInput, family, editorRecord, existing),
      );
      const row = await getAdminRow(family, saved.slug);

      await appendAdminActivityLog({
        actorUserId: user.id,
        actorEmail: user.email ?? "Admin",
        actionType: "content.quick_edited",
        targetType: "content_record",
        targetId: saved.id,
        targetFamily: family,
        targetSlug: saved.slug,
        summary: `Quick edited ${saved.title} in ${family}.`,
        metadata: {
          title: saved.title,
          status: nextStatus,
          accessMode: payload.accessMode ?? editorRecord.accessControl.mode,
        },
      });

      revalidateAdminRecentEditSurfaces(family, [saved.slug]);
      if (family === "stocks") {
        try {
          await syncSearchIndexForAdminContentChange({
            family: "stocks",
            slugs: [saved.slug],
            requestedBy: user.email ?? "Admin",
            source: "admin_records_quick_edit",
            publicStatus: saved.status,
          });
        } catch (error) {
          console.error("[search-index-sync] stock quick-edit refresh failed", {
            family,
            slug: saved.slug,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return NextResponse.json({
        ok: true,
        record: saved,
        row,
        savedAt: saved.updatedAt,
        operation: "quick_edited",
      });
    }

    if (payload.action === "bulk_update") {
      const slugs = Array.from(
        new Set((payload.slugs ?? []).map((item) => assertAdminSlug(item)).filter(Boolean)),
      );

      if (!slugs.length || !payload.bulkAction) {
        return badRequest("Bulk action and at least one record are required.");
      }

      if (
        (payload.bulkAction === "publish" || payload.bulkAction === "archive") &&
        !hasProductUserCapability(role, capabilities, "can_publish_content")
      ) {
        throw new AdminOperatorValidationError(
          "You do not have permission to publish or archive content.",
          403,
        );
      }

      const results = [];
      for (const targetSlug of slugs) {
        const currentRecord = await getAdminManagedRecord(family, targetSlug, null);
        const currentEditorRecord = await getAdminRecordEditorData(
          family,
          currentRecord?.slug ?? targetSlug,
          currentRecord,
        );
        const baseInput = buildSaveInputFromEditorRecord(currentEditorRecord, {
          recordId: currentRecord?.id ?? null,
          originalSlug: currentRecord?.slug ?? currentEditorRecord.slug,
        });

        const overrideInput =
          payload.bulkAction === "publish"
            ? { status: "published" as const }
            : payload.bulkAction === "archive"
              ? { status: "archived" as const }
              : {
                  assignedTo: payload.assignedToEmail ?? null,
                  assignedBy: payload.assignedToEmail ? user.email ?? "Admin" : null,
                };

        const nextInput = {
          ...baseInput,
          ...overrideInput,
        };
        const saved = await saveAdminManagedRecord(
          sanitizeAdminRecordPayload(nextInput, family, currentEditorRecord, currentRecord),
        );
        const row = await getAdminRow(family, saved.slug);
        if (row) {
          results.push(row);
        }
      }

      await appendAdminActivityLog({
        actorUserId: user.id,
        actorEmail: user.email ?? "Admin",
        actionType: `content.bulk_${payload.bulkAction}`,
        targetType: "content_record",
        targetId: null,
        targetFamily: family,
        targetSlug: null,
        summary:
          payload.bulkAction === "assign"
            ? `Bulk assigned ${results.length} ${family} record${results.length === 1 ? "" : "s"} to ${payload.assignedToEmail || "no owner"}.`
            : `Bulk ${payload.bulkAction === "archive" ? "archived" : "published"} ${results.length} ${family} record${results.length === 1 ? "" : "s"}.`,
        metadata: {
          slugs,
          assignedTo: payload.assignedToEmail ?? null,
        },
      });

      revalidateAdminRecentEditSurfaces(
        family,
        results.map((row) => row.slug),
      );
      if (family === "stocks" && payload.bulkAction !== "assign") {
        try {
          await syncSearchIndexForAdminContentChange({
            family: "stocks",
            slugs: results.map((row) => row.slug),
            requestedBy: user.email ?? "Admin",
            source: "admin_records_bulk_update",
            force: true,
            publicStatus: payload.bulkAction === "archive" ? "archived" : "published",
          });
        } catch (error) {
          console.error("[search-index-sync] stock bulk refresh failed", {
            family,
            bulkAction: payload.bulkAction,
            slugs,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return NextResponse.json({
        ok: true,
        rows: results,
        updatedCount: results.length,
        operation: `bulk_${payload.bulkAction}`,
      });
    }

    if (payload.action === "duplicate") {
      if (!payload?.slug) {
        return badRequest("Slug is required to duplicate a record.");
      }

      const slug = assertAdminSlug(payload.slug);
      const existing = await getAdminManagedRecord(
        family,
        payload.originalSlug?.trim() || slug,
        payload.recordId?.trim() || null,
      );
      const editorRecord = await getAdminRecordEditorData(
        family,
        existing?.slug ?? slug,
        existing,
      );
      const store = await getAdminOperatorStore();
      const existingSlugs = new Set(
        store.records.filter((item) => item.family === family).map((item) => item.slug),
      );
      const nextSlug = buildDuplicateSlug(editorRecord.slug, existingSlugs);
      const duplicateInput = buildSaveInputFromEditorRecord(
          editorRecord,
          {
            recordId: null,
            originalSlug: null,
            lastKnownUpdatedAt: null,
            slug: nextSlug,
            title: `${editorRecord.title} (Copy)`,
            status: "draft",
            visibility: "private",
            publicHref: null,
            canonicalRoute: null,
            assignedTo: null,
            assignedBy: null,
            dueDate: null,
            scheduledPublishAt: null,
            scheduledUnpublishAt: null,
          },
          "duplicate",
      );
      const duplicated = await saveAdminManagedRecord(
        sanitizeAdminRecordPayload(duplicateInput, family, editorRecord, null),
      );

      await appendAdminRecordRevision({
        family,
        slug: duplicated.slug,
        title: duplicated.title,
        editor: user.email ?? "Admin",
        action: "Duplicated operator record",
        changedFields: Object.keys(duplicated.sections),
        reason: "Created a new draft copy from an existing record.",
        revisionState: "Rollback staged",
        routeTarget: `/admin/content/${family}/${duplicated.slug}`,
      });

      await appendAdminActivityLog({
        actorUserId: user.id,
        actorEmail: user.email ?? "Admin",
        actionType: "content.duplicated",
        targetType: "content_record",
        targetId: duplicated.id,
        targetFamily: family,
        targetSlug: duplicated.slug,
        summary: `Duplicated ${editorRecord.title} to ${duplicated.title}.`,
        metadata: {
          sourceSlug: editorRecord.slug,
          duplicateSlug: duplicated.slug,
        },
      });

      revalidateAdminRecentEditSurfaces(family, [duplicated.slug]);

      const row = await getAdminRow(family, duplicated.slug);
      return NextResponse.json({
        ok: true,
        record: duplicated,
        row,
        editorHref: `/admin/content/${family}/${duplicated.slug}`,
        operation: "duplicated",
        savedAt: duplicated.updatedAt,
      });
    }

    if (!payload?.slug || !payload?.title) {
      return badRequest("Slug and title are required.");
    }

    const slug = assertAdminSlug(payload.slug);
    const existing = await getAdminManagedRecord(
      family,
      payload.originalSlug?.trim() || slug,
      payload.recordId?.trim() || null,
    );
    const editorRecord = await getAdminRecordEditorData(
      family,
      existing?.slug ?? slug,
      existing,
    );
    const safePayload = sanitizeAdminRecordPayload(payload, family, editorRecord, existing);

    if (
      existing?.updatedAt &&
      payload.lastKnownUpdatedAt &&
      new Date(existing.updatedAt).getTime() > new Date(payload.lastKnownUpdatedAt).getTime()
    ) {
      throw new AdminOperatorValidationError(
        "This record was updated recently. Refresh before saving.",
        409,
      );
    }

    const nextAssignedTo = safePayload.assignedTo?.trim() || null;
    if (nextAssignedTo) {
      safePayload.assignedBy =
        nextAssignedTo !== (existing?.assignedTo ?? null)
          ? user.email ?? "Admin"
          : safePayload.assignedBy ?? existing?.assignedBy ?? user.email ?? "Admin";
    } else {
      safePayload.assignedBy = null;
    }

    const publishStateChanged = (existing?.status ?? "draft") !== safePayload.status;
    const touchesLiveState =
      publishStateChanged &&
      ([existing?.status, safePayload.status].includes("published") ||
        [existing?.status, safePayload.status].includes("archived"));
    const touchesLifecycle =
      (existing?.scheduledPublishAt ?? null) !== (safePayload.scheduledPublishAt ?? null) ||
      (existing?.scheduledUnpublishAt ?? null) !== (safePayload.scheduledUnpublishAt ?? null);

    if (
      role === "admin" &&
      (touchesLiveState || touchesLifecycle || safePayload.status === "published" || safePayload.status === "archived") &&
      !hasProductUserCapability(role, capabilities, "can_publish_content")
    ) {
      throw new AdminOperatorValidationError("You do not have permission to publish or schedule content.", 403);
    }

    const sectionKeys = Object.keys(safePayload.sections ?? {});
    if (role !== "admin") {
      const pendingApproval = await saveAdminPendingApproval({
        family,
        slug: safePayload.slug,
        title: safePayload.title,
        recordId: existing?.id ?? null,
        submittedByUserId: user.id,
        submittedByEmail: user.email ?? "Editor",
        actionType:
          safePayload.status === "published"
            ? "publish_request"
            : safePayload.status === "archived"
              ? "archive_request"
              : "content_change",
        targetStatus: safePayload.status,
        summary:
          safePayload.status === "published"
            ? `Requested publish approval for ${safePayload.title}.`
            : safePayload.status === "archived"
              ? `Requested archive approval for ${safePayload.title}.`
              : `Submitted ${safePayload.title} for admin approval.`,
        changedFields: sectionKeys,
        snapshot: safePayload,
        baseRecordUpdatedAt: existing?.updatedAt ?? null,
      });

      await appendAdminActivityLog({
        actorUserId: user.id,
        actorEmail: user.email ?? "Admin",
        actionType: "approval.submitted",
        targetType: "content_record",
        targetId: pendingApproval.id,
        targetFamily: family,
        targetSlug: safePayload.slug,
        summary:
          safePayload.status === "published"
            ? `Submitted ${safePayload.title} for publish approval.`
            : safePayload.status === "archived"
              ? `Submitted ${safePayload.title} for archive approval.`
              : `Submitted ${safePayload.title} for content approval.`,
        metadata: {
          approvalId: pendingApproval.id,
          changedFields: sectionKeys,
          targetStatus: safePayload.status,
        },
      });

      return NextResponse.json({
        ok: true,
        record: {
          id: pendingApproval.recordId,
          updatedAt: pendingApproval.updatedAt,
        },
        pendingApproval,
        savedAt: pendingApproval.updatedAt,
        storageMode: "approval_queue",
        operation: "submitted_for_approval",
      });
    }

    const { saved } = await persistApprovedAdminRecordChange({
      actorUserId: user.id,
      actorEmail: user.email ?? "Admin",
      payload: safePayload,
    });

    return NextResponse.json({
      ok: true,
      record: saved,
      savedAt: saved.updatedAt ?? new Date().toISOString(),
      storageMode: "operator_store",
      operation:
        safePayload.status === "published"
          ? "published"
          : safePayload.status === "archived"
            ? "archived"
            : safePayload.status === "ready_for_review"
              ? "review_saved"
              : safePayload.status === "needs_fix"
                ? "needs_fix"
            : "saved",
    });
  } catch (error) {
    const safeError = sanitizeAdminFailureMessage(error);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}
