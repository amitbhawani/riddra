import type { NextRequest } from "next/server";

import {
  getMarketDataIngestionReadiness,
  ingestMarketDataPayload,
} from "@/lib/market-data-ingestion";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";

export async function GET() {
  return Response.json({
    ok: true,
    service: "market-data-ingest",
    readiness: getMarketDataIngestionReadiness(),
  });
}

export async function POST(request: NextRequest) {
  const config = getRuntimeLaunchConfig();

  if (!config.marketDataRefreshSecret) {
    return Response.json(
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
    return Response.json(
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

    return Response.json({
      ok: true,
      mode: "verified_market_data_ingestion",
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ingestion failure";

    return Response.json(
      {
        ok: false,
        error: message,
        readiness: getMarketDataIngestionReadiness(),
      },
      { status: 500 },
    );
  }
}
