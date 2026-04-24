import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getMarketDataIngestionReadiness,
  ingestMarketDataPayload,
} from "@/lib/market-data-ingestion";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";

export async function GET() {
  await requireAdmin();

  return NextResponse.json({
    ok: true,
    service: "admin-market-data-ingest",
    readiness: getMarketDataIngestionReadiness(),
  });
}

export async function POST(request: NextRequest) {
  await requireAdmin();
  const config = getRuntimeLaunchConfig();

  if (!config.marketDataRefreshSecret) {
    return NextResponse.json(
      {
        ok: false,
        error: "MARKET_DATA_REFRESH_SECRET is not configured.",
        readiness: getMarketDataIngestionReadiness(),
      },
      { status: 503 },
    );
  }

  const providedSecret = request.headers.get("x-riddra-refresh-secret");

  if (providedSecret !== config.marketDataRefreshSecret) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized ingestion request.",
      },
      { status: 401 },
    );
  }

  try {
    const payload = await request.json();
    const result = await ingestMarketDataPayload(payload);

    return NextResponse.json({
      ok: true,
      mode: "verified_market_data_ingestion",
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ingestion failure";

    return NextResponse.json(
      {
        ok: false,
        error: message,
        readiness: getMarketDataIngestionReadiness(),
      },
      { status: 500 },
    );
  }
}
