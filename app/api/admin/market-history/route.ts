import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { addMarketHistoryLane, getMarketHistoryMemory, removeMarketHistoryLane, saveMarketHistoryLane } from "@/lib/market-history-memory-store";

export async function POST(request: Request) {
  await requireAdmin();
  return NextResponse.json(
    {
      error: "Market-history lanes now derive from durable table telemetry and no longer accept manual edits.",
    },
    { status: 409 },
  );
}

export async function DELETE(request: Request) {
  await requireAdmin();
  return NextResponse.json(
    {
      error: "Market-history lanes now derive from durable table telemetry and no longer accept manual edits.",
    },
    { status: 409 },
  );
}
