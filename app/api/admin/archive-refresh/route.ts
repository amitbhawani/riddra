import { NextResponse } from "next/server";

import { addArchiveRefreshRun, removeArchiveRefreshRun, saveArchiveRefreshRun } from "@/lib/archive-refresh-memory-store";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  await requireAdmin();
  const body = (await request.json()) as {
    family?: string;
    sourceClass?: string;
    cadence?: string;
    status?: "Ready" | "In progress" | "Blocked" | "Planned";
    pendingWrites?: number;
    documentBacklog?: number;
    nextWindow?: string;
    coveragePosture?: string;
    nextStep?: string;
  };

  const family = body.family?.trim() ?? "";
  const sourceClass = body.sourceClass?.trim() ?? "";
  const cadence = body.cadence?.trim() ?? "";
  const status = body.status;
  const nextWindow = body.nextWindow?.trim() ?? "";
  const coveragePosture = body.coveragePosture?.trim() ?? "";
  const nextStep = body.nextStep?.trim() ?? "";

  if (!family || !status || !nextWindow || !nextStep) {
    return NextResponse.json(
      { error: "Family, status, next window, and next step are required." },
      { status: 400 },
    );
  }

  const archiveRefreshMemory =
    sourceClass || cadence || coveragePosture
      ? await addArchiveRefreshRun({
          family,
          sourceClass: sourceClass || "Operator source class",
          cadence: cadence || "Operator scheduled",
          status,
          pendingWrites: Number.isFinite(body.pendingWrites) ? Number(body.pendingWrites) : 0,
          documentBacklog: Number.isFinite(body.documentBacklog) ? Number(body.documentBacklog) : 0,
          nextWindow,
          coveragePosture: coveragePosture || "Operator create saved without a coverage posture note yet.",
          nextStep,
        })
      : await saveArchiveRefreshRun({
          family,
          status,
          pendingWrites: Number.isFinite(body.pendingWrites) ? Number(body.pendingWrites) : 0,
          documentBacklog: Number.isFinite(body.documentBacklog) ? Number(body.documentBacklog) : 0,
          nextWindow,
          nextStep,
        });

  return NextResponse.json({
    ok: true,
    summary: archiveRefreshMemory.summary,
    runs: archiveRefreshMemory.runs,
    continuityLanes: archiveRefreshMemory.continuityLanes,
  });
}

export async function DELETE(request: Request) {
  await requireAdmin();
  const body = (await request.json()) as { family?: string };

  const family = body.family?.trim() ?? "";

  if (!family) {
    return NextResponse.json({ error: "Family is required." }, { status: 400 });
  }

  const archiveRefreshMemory = await removeArchiveRefreshRun({ family });

  return NextResponse.json({
    ok: true,
    summary: archiveRefreshMemory.summary,
    runs: archiveRefreshMemory.runs,
    continuityLanes: archiveRefreshMemory.continuityLanes,
  });
}
