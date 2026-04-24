import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  saveLaunchPendingAuditAction,
  type LaunchPendingAuditActionStatus,
} from "@/lib/launch-pending-audit-action-memory-store";

export async function POST(request: Request) {
  await requireAdmin();

  try {
    const payload = (await request.json()) as {
      itemId?: string;
      actionStatus?: LaunchPendingAuditActionStatus;
      owner?: string;
      nextStep?: string;
      note?: string;
    };

    if (!payload.itemId?.trim()) {
      return NextResponse.json(
        { error: "Pending audit item is required." },
        { status: 400 },
      );
    }

    const memory = await saveLaunchPendingAuditAction({
      itemId: payload.itemId.trim(),
      actionStatus: payload.actionStatus ?? "Open",
      owner: payload.owner ?? "",
      nextStep:
        payload.nextStep?.trim() ||
        "Operator update saved without a concrete next step yet.",
      note: payload.note ?? "",
    });

    return NextResponse.json(memory);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save launch backlog action.",
      },
      { status: 500 },
    );
  }
}
