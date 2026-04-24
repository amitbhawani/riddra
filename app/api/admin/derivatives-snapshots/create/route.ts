import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { addDerivativesSnapshot } from "@/lib/derivatives-memory-store";

export async function POST(request: Request) {
  await requireAdmin();
  const body = (await request.json()) as {
    symbol?: string;
    expiry?: string;
    snapshotState?: "Preview snapshot" | "Analytics ready" | "Awaiting source";
    strikeWindow?: string;
    nextRefresh?: string;
    note?: string;
  };

  const symbol = body.symbol?.trim() ?? "";
  const expiry = body.expiry?.trim() ?? "";
  const snapshotState = body.snapshotState;
  const strikeWindow = body.strikeWindow?.trim() ?? "";
  const nextRefresh = body.nextRefresh?.trim() ?? "";
  const note = body.note?.trim() ?? "";

  if (!symbol || !expiry || !snapshotState || !strikeWindow || !nextRefresh || !note) {
    return NextResponse.json(
      { error: "Symbol, expiry, snapshot state, strike window, next refresh, and note are required." },
      { status: 400 },
    );
  }

  const derivativesMemory = await addDerivativesSnapshot({
    symbol,
    expiry,
    snapshotState,
    strikeWindow,
    nextRefresh,
    note,
  });

  return NextResponse.json({
    ok: true,
    summary: derivativesMemory.summary,
    snapshots: derivativesMemory.snapshots,
  });
}
