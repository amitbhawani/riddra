import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { appendAdminActivityLog } from "@/lib/admin-activity-log";
import {
  getAdminPendingApproval,
  listAdminPendingApprovals,
  reviewAdminPendingApproval,
} from "@/lib/admin-approvals";
import { getAdminRecordEditorData } from "@/lib/admin-content-registry";
import {
  sanitizeAdminFailureMessage,
  sanitizeAdminRecordPayload,
} from "@/lib/admin-operator-guards";
import { getAdminManagedRecord } from "@/lib/admin-operator-store";
import { persistApprovedAdminRecordChange } from "@/lib/admin-record-workflow";
import type { AdminFamilyKey } from "@/lib/admin-content-schema";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function applyLatestPendingImportItem(payload: NonNullable<Parameters<typeof sanitizeAdminRecordPayload>[0]>) {
  if (!Array.isArray(payload.imports) || payload.imports.length === 0) {
    return [] as NonNullable<typeof payload.imports>;
  }

  let pendingApplied = false;
  return payload.imports.map((item) => {
    if (!pendingApplied && item.status === "pending_review") {
      pendingApplied = true;
      return {
        ...item,
        status: "applied" as const,
        liveValueState: "manual_live" as const,
        note: item.note ? `${item.note} Approved and applied.` : "Approved and applied.",
      };
    }

    return item;
  });
}

function getApprovalAppliedSummary(approvalTitle: string, approvalActionType: string) {
  if (approvalActionType === "content_import") {
    return `Approved the imported draft changes for ${approvalTitle}.`;
  }

  return `Approved ${approvalTitle} and applied the queued editor change.`;
}

function getApprovalRejectedSummary(approvalTitle: string, approvalActionType: string) {
  if (approvalActionType === "content_import") {
    return `Rejected the imported draft changes for ${approvalTitle}.`;
  }

  return `Rejected the queued editor change for ${approvalTitle}.`;
}

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({
      ok: true,
      approvals: await listAdminPendingApprovals({ decision: "pending" }),
    });
  } catch (error) {
    const safeError = sanitizeAdminFailureMessage(error);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();
    const payload = (await request.json()) as {
      action?: "approve" | "reject" | "approve_selected" | "approve_all";
      approvalId?: string;
      approvalIds?: string[];
      reviewNote?: string | null;
    };

    const action = payload.action ?? "approve_selected";
    const reviewNote = typeof payload.reviewNote === "string" ? payload.reviewNote : null;
    const rawTargets =
      action === "approve_all"
        ? await listAdminPendingApprovals({ decision: "pending" })
        : action === "approve" || action === "reject"
          ? [await getAdminPendingApproval(payload.approvalId ?? "")]
          : await Promise.all(
              Array.from(new Set(payload.approvalIds ?? [])).map((id) => getAdminPendingApproval(id)),
            );

    const targets = rawTargets
      .filter((item): item is NonNullable<(typeof rawTargets)[number]> => Boolean(item))
      .filter((item) => item.decision === "pending");

    if (!targets.length) {
      return badRequest("Select at least one pending approval.");
    }

    const shouldApprove = action !== "reject";
    const processed = [];

    for (const approval of targets) {
      if (shouldApprove) {
        const existing = await getAdminManagedRecord(
          approval.family,
          approval.snapshot.originalSlug?.trim() || approval.slug,
          approval.recordId,
        );
        const editorRecord = await getAdminRecordEditorData(
          approval.family as AdminFamilyKey,
          approval.snapshot.slug ?? approval.slug,
          existing,
        );
        const safePayload = sanitizeAdminRecordPayload(
          approval.snapshot,
          approval.family,
          editorRecord,
          existing,
        );
        if (approval.actionType === "content_import") {
          safePayload.imports = applyLatestPendingImportItem(safePayload);
        }

        const { saved } = await persistApprovedAdminRecordChange({
          actorUserId: user.id,
          actorEmail: user.email ?? "Admin",
          payload: safePayload,
          activityActorSource: "system",
        });

        const reviewed = await reviewAdminPendingApproval({
          id: approval.id,
          decision: "approved",
          reviewedByEmail: user.email ?? "Admin",
          reviewedByUserId: user.id,
          reviewNote,
        });

        await appendAdminActivityLog({
          actorUserId: user.id,
          actorEmail: user.email ?? "Admin",
          actionType: "approval.approved",
          targetType: "content_record",
          targetId: approval.id,
          targetFamily: approval.family,
          targetSlug: approval.slug,
          summary: getApprovalAppliedSummary(approval.title, approval.actionType),
          metadata: {
            approvalId: approval.id,
            targetStatus: approval.targetStatus,
            recordId: saved.id,
            actionType: approval.actionType,
          },
        });

        if (reviewed) {
          processed.push(reviewed);
        }
      } else {
        const reviewed = await reviewAdminPendingApproval({
          id: approval.id,
          decision: "rejected",
          reviewedByEmail: user.email ?? "Admin",
          reviewedByUserId: user.id,
          reviewNote,
        });

        await appendAdminActivityLog({
          actorUserId: user.id,
          actorEmail: user.email ?? "Admin",
          actionType: "approval.rejected",
          targetType: "content_record",
          targetId: approval.id,
          targetFamily: approval.family,
          targetSlug: approval.slug,
          summary: getApprovalRejectedSummary(approval.title, approval.actionType),
          metadata: {
            approvalId: approval.id,
            targetStatus: approval.targetStatus,
            actionType: approval.actionType,
          },
        });

        if (reviewed) {
          processed.push(reviewed);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      processedCount: processed.length,
      approvals: await listAdminPendingApprovals({ decision: "pending" }),
      operation: shouldApprove ? "approved" : "rejected",
    });
  } catch (error) {
    const safeError = sanitizeAdminFailureMessage(error);
    return NextResponse.json({ error: safeError.message }, { status: safeError.status });
  }
}
