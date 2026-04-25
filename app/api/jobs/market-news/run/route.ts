import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  executeMarketNewsRun,
  getConfiguredMarketNewsSecret,
  isAuthorizedMarketNewsRunRequest,
  parseMarketNewsRetryFailed,
  parseMarketNewsRunLimit,
} from "@/lib/market-news/run";
import { getMarketNewsRewriteReadiness } from "@/lib/market-news/rewrite";
import { hasRuntimeSupabaseAdminEnv } from "@/lib/runtime-launch-config";

export async function POST(request: NextRequest) {
  if (!getConfiguredMarketNewsSecret()) {
    return NextResponse.json(
      {
        ok: false,
        error: "MARKET_NEWS_CRON_SECRET must be configured.",
        readiness: getMarketNewsRewriteReadiness(),
      },
      { status: 503 },
    );
  }

  if (!isAuthorizedMarketNewsRunRequest(request)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized market news run request.",
      },
      { status: 401 },
    );
  }

  if (!hasRuntimeSupabaseAdminEnv()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase admin environment variables are required for market news automation.",
        readiness: getMarketNewsRewriteReadiness(),
      },
      { status: 503 },
    );
  }

  const result = await executeMarketNewsRun({
    limit: parseMarketNewsRunLimit(request),
    retryFailed: parseMarketNewsRetryFailed(request),
  });

  if (!result.ok && "error" in result) {
    return NextResponse.json(result, { status: 503 });
  }

  return NextResponse.json(result);
}
