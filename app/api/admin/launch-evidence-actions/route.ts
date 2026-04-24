import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  saveLaunchEvidenceAction,
  type LaunchEvidenceActionStatus,
} from "@/lib/launch-evidence-action-memory-store";

export async function POST(request: Request) {
  await requireAdmin();

  try {
    const payload = (await request.json()) as {
      itemId?: string;
      actionStatus?: LaunchEvidenceActionStatus;
      owner?: string;
      proof?: string;
      nextStep?: string;
      operatorNote?: string;
    };

    if (!payload.itemId?.trim()) {
      return NextResponse.json(
        { error: "Launch evidence lane is required." },
        { status: 400 },
      );
    }

    const memory = await saveLaunchEvidenceAction({
      itemId: payload.itemId.trim(),
      actionStatus: payload.actionStatus ?? "Not started",
      owner: payload.owner ?? "",
      proof: payload.proof ?? "",
      nextStep:
        payload.nextStep?.trim() ||
        "Evidence update saved without a concrete next step yet.",
      operatorNote: payload.operatorNote ?? "",
    });

    return NextResponse.json(memory);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save launch evidence action.",
      },
      { status: 500 },
    );
  }
}
