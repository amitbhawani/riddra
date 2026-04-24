import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { addMarketHistoryLane } from "@/lib/market-history-memory-store";

export async function POST(request: Request) {
  await requireAdmin();

  try {
    const payload = (await request.json()) as {
      lane?: string;
      status?: "Ready" | "In progress" | "Blocked" | "Planned";
      retainedSeries?: number;
      verifiedSeries?: number;
      previewSeries?: number;
      refreshWindow?: string;
      continuityNote?: string;
      nextStep?: string;
    };

    if (!payload.lane?.trim()) {
      return NextResponse.json({ error: "Lane is required." }, { status: 400 });
    }

    const memory = await addMarketHistoryLane({
      lane: payload.lane.trim(),
      status: payload.status ?? "Planned",
      retainedSeries: Number(payload.retainedSeries ?? 0),
      verifiedSeries: Number(payload.verifiedSeries ?? 0),
      previewSeries: Number(payload.previewSeries ?? 0),
      refreshWindow: payload.refreshWindow?.trim() || "Operator create saved without a refresh window yet.",
      continuityNote: payload.continuityNote?.trim() || "Operator create saved without a continuity note yet.",
      nextStep: payload.nextStep?.trim() || "Operator create saved without a next step yet.",
    });

    return NextResponse.json(memory);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create market-history lane." },
      { status: 500 },
    );
  }
}
