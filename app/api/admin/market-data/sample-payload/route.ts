import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { getSampleMarketDataPayload } from "@/lib/market-data-provider-sample";

export async function GET() {
  await requireAdmin();

  return NextResponse.json({
    ok: true,
    service: "admin-market-data-sample-payload",
    ...getSampleMarketDataPayload(),
  });
}
