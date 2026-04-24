import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  addDerivativesAnalyticsLane,
  getDerivativesMemory,
  removeDerivativesAnalyticsLane,
  saveDerivativesAnalyticsLane,
} from "@/lib/derivatives-memory-store";

export async function POST(request: Request) {
  await requireAdmin();
  const body = (await request.json()) as {
    lane?: string;
    status?: "In progress" | "Planned" | "Blocked";
    retainedSessions?: number;
    nextJob?: string;
    note?: string;
  };

  const lane = body.lane?.trim() ?? "";
  const status = body.status;
  const retainedSessions = Number(body.retainedSessions);
  const nextJob = body.nextJob?.trim() ?? "";
  const note = body.note?.trim() ?? "";

  if (!lane || !status || !Number.isFinite(retainedSessions) || !nextJob || !note) {
    return NextResponse.json(
      { error: "Lane, status, retained sessions, next job, and note are required." },
      { status: 400 },
    );
  }

  const currentMemory = await getDerivativesMemory();
  const existingLane = currentMemory.analyticsLanes.some((item) => item.lane === lane);

  const derivativesMemory = existingLane
    ? await saveDerivativesAnalyticsLane({
        lane,
        status,
        retainedSessions,
        nextJob,
        note,
      })
    : await addDerivativesAnalyticsLane({
        lane,
        status,
        retainedSessions,
        nextJob,
        note,
      });

  return NextResponse.json({
    ok: true,
    summary: derivativesMemory.summary,
    analyticsLanes: derivativesMemory.analyticsLanes,
  });
}

export async function DELETE(request: Request) {
  await requireAdmin();
  const body = (await request.json()) as { lane?: string };

  const lane = body.lane?.trim() ?? "";

  if (!lane) {
    return NextResponse.json({ error: "Lane is required." }, { status: 400 });
  }

  const derivativesMemory = await removeDerivativesAnalyticsLane({ lane });

  return NextResponse.json({
    ok: true,
    summary: derivativesMemory.summary,
    analyticsLanes: derivativesMemory.analyticsLanes,
  });
}
