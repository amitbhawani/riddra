import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { addRollbackScenario, removeRollbackScenario } from "@/lib/editorial-revision-memory-store";

export async function POST(request: Request) {
  await requireAdmin();
  const body = (await request.json()) as {
    asset?: string;
    change?: string;
    risk?: "Low" | "Medium" | "High";
    fallback?: string;
    lastKnownGood?: string;
    queueState?: "Ready" | "Needs approval" | "Needs source reset";
    routeTarget?: string;
  };

  const asset = body.asset?.trim() ?? "";
  const change = body.change?.trim() ?? "";
  const risk = body.risk;
  const fallback = body.fallback?.trim() ?? "";
  const lastKnownGood = body.lastKnownGood?.trim() ?? "";
  const queueState = body.queueState;
  const routeTarget = body.routeTarget?.trim() ?? "";

  if (!asset || !change || !risk || !fallback || !lastKnownGood || !queueState || !routeTarget) {
    return NextResponse.json(
      { error: "Asset, change, risk, fallback, last known good, queue state, and route target are required." },
      { status: 400 },
    );
  }

  const revisionMemory = await addRollbackScenario({
    asset,
    change,
    risk,
    fallback,
    lastKnownGood,
    queueState,
    routeTarget,
  });

  return NextResponse.json({
    ok: true,
    summary: revisionMemory.summary,
    rollbackScenarios: revisionMemory.rollbackScenarios,
  });
}

export async function DELETE(request: Request) {
  await requireAdmin();
  const body = (await request.json()) as {
    id?: string;
  };

  const id = body.id?.trim() ?? "";

  if (!id) {
    return NextResponse.json({ error: "Rollback scenario id is required." }, { status: 400 });
  }

  try {
    const revisionMemory = await removeRollbackScenario({ id });

    return NextResponse.json({
      ok: true,
      summary: revisionMemory.summary,
      rollbackScenarios: revisionMemory.rollbackScenarios,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to remove rollback scenario." },
      { status: 400 },
    );
  }
}
