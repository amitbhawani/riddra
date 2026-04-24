import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { getDurableJobSystemReadiness, queueDurableJob } from "@/lib/durable-jobs";
import {
  getMarketDataRefreshReadiness,
} from "@/lib/market-data-refresh";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";

export async function GET() {
  await requireAdmin();

  return NextResponse.json({
    ok: true,
    service: "admin-market-data-refresh",
    readiness: getMarketDataRefreshReadiness(),
    durableJobs: getDurableJobSystemReadiness(),
  });
}

export async function POST(request: NextRequest) {
  await requireAdmin();
  const config = getRuntimeLaunchConfig();
  const durableJobs = getDurableJobSystemReadiness();

  if (!config.marketDataRefreshSecret) {
    return NextResponse.json(
      {
        ok: false,
        error: "MARKET_DATA_REFRESH_SECRET is not configured.",
        readiness: getMarketDataRefreshReadiness(),
        durableJobs,
      },
      { status: 503 },
    );
  }

  if (!durableJobs.configured) {
    return NextResponse.json(
      {
        ok: false,
        error: "Trigger.dev is not configured for durable market-data jobs yet.",
        readiness: getMarketDataRefreshReadiness(),
        durableJobs,
      },
      { status: 503 },
    );
  }

  const providedSecret = request.headers.get("x-riddra-refresh-secret");

  if (providedSecret !== config.marketDataRefreshSecret) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized refresh request.",
      },
      { status: 401 },
    );
  }

  try {
    const handle = await queueDurableJob({
      taskId: "market-data-snapshot-refresh",
      payload: {
        requestedBy: "admin_post",
        source: "admin_post",
      },
      idempotencyKey: `market-data-snapshot-refresh:admin:${new Date().toISOString()}`,
      tags: ["durable-job", "market-data", "snapshot-refresh", "admin"],
      metadata: {
        routeTarget: "/api/admin/market-data/refresh",
        source: "admin_post",
      },
    });

    return NextResponse.json({
      ok: true,
      mode: "durable_job_queued",
      job: {
        id: handle.id,
        taskId: "market-data-snapshot-refresh",
      },
      durableJobs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown refresh failure";

    return NextResponse.json(
      {
        ok: false,
        error: message,
        readiness: getMarketDataRefreshReadiness(),
        durableJobs,
      },
      { status: 500 },
    );
  }
}
