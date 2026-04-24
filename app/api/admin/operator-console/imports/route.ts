import { NextRequest, NextResponse } from "next/server";

import { requireOperator } from "@/lib/auth";
import {
  AdminOperatorValidationError,
  assertAdminFamily,
  assertAdminIdentifier,
  assertAdminSlug,
  sanitizeAdminFailureMessage,
} from "@/lib/admin-operator-guards";
import { hasProductUserCapability } from "@/lib/product-permissions";
import {
  appendAdminRecordRevision,
  getAdminManagedRecord,
  type AdminImportState,
  updateAdminImportItemStatus,
} from "@/lib/admin-operator-store";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

const allowedStatuses = new Set<AdminImportState>([
  "pending_review",
  "applied",
  "rejected",
  "failed",
  "duplicate",
  "unmatched",
  "conflict",
  "blocked_by_lock",
  "source_failed",
  "partial_update",
]);

export async function POST(request: NextRequest) {
  try {
    const { user, role, capabilities } = await requireOperator();
    if (!hasProductUserCapability(role, capabilities, "can_manage_imports")) {
      throw new AdminOperatorValidationError("You do not have permission to manage imports.", 403);
    }

    const payload = (await request.json()) as {
      family?: string;
      slug?: string;
      importId?: string;
      status?: AdminImportState;
      note?: string;
    };

    if (!payload.family || !payload.slug || !payload.importId || !payload.status) {
      return badRequest("Family, slug, importId, and status are required.");
    }

    const family = assertAdminFamily(payload.family);
    const slug = assertAdminSlug(payload.slug);
    const importId = assertAdminIdentifier(payload.importId, "Import ID");

    if (!allowedStatuses.has(payload.status)) {
      return badRequest("Unsupported import status.");
    }

    const updated = await updateAdminImportItemStatus({
      family,
      slug,
      importId,
      status: payload.status,
      note: payload.note,
    });

    if (!updated) {
      return badRequest("Could not find the import row to update.");
    }

    const record = await getAdminManagedRecord(family, slug);

    if (record) {
      await appendAdminRecordRevision({
        family: record.family,
        slug: record.slug,
        title: record.title,
        editor: user.email ?? "Admin",
        action: `Import row marked ${payload.status.replaceAll("_", " ")}`,
        changedFields: ["imports"],
        reason:
          cleanReason(payload.status),
        revisionState:
          record.status === "published"
            ? "Published"
            : record.status === "ready_for_review"
              ? "Review ready"
              : record.status === "needs_fix"
                ? "Needs fix"
              : "Rollback staged",
        routeTarget: `/admin/content/${record.family}/${record.slug}`,
      });
    }

    return NextResponse.json({ ok: true, item: updated, savedAt: updated.ranAt });
  } catch (error) {
    const safeError = sanitizeAdminFailureMessage(error);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}

function cleanReason(status: AdminImportState) {
  switch (status) {
    case "applied":
      return "Operator applied an import row into the live source-backed record.";
    case "rejected":
      return "Operator rejected an import row and kept the current live value.";
    case "blocked_by_lock":
      return "Import was blocked because a permanent manual lock is active.";
    case "conflict":
      return "Import conflicted with current live state and now needs review.";
    case "source_failed":
      return "Source read failed while attempting to update this record.";
    case "partial_update":
      return "Only part of the import payload could be applied.";
    default:
      return "Operator updated import posture for this record.";
  }
}
