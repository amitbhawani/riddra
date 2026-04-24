import type { NextRequest } from "next/server";

import { getDurableJobSystemReadiness, queueDurableJob } from "@/lib/durable-jobs";
import {
  getMarketDataRefreshReadiness,
} from "@/lib/market-data-refresh";
import {
  applyRateLimitHeaders,
  checkRequestRateLimit,
} from "@/lib/request-rate-limit";
import { getHostedRuntimeRequirements, getRuntimeLaunchConfig, isHostedRuntimeEnvironment } from "@/lib/runtime-launch-config";

export async function GET() {
  return Response.json({
    ok: true,
    service: "market-data-refresh",
    readiness: getMarketDataRefreshReadiness(),
    durableJobs: getDurableJobSystemReadiness(),
  });
}

export async function POST(request: NextRequest) {
  const rateLimit = checkRequestRateLimit(request, {
    keyPrefix: "market-data-refresh",
    windowMs: 5 * 60 * 1000,
    maxRequests: 10,
  });

  if (!rateLimit.allowed) {
    return applyRateLimitHeaders(
      Response.json(
        {
          ok: false,
          error: "Too many market-data refresh requests from this client. Please try again shortly.",
        },
        { status: 429 },
      ),
      rateLimit,
    );
  }

  const config = getRuntimeLaunchConfig();
  const hostedRequirements = getHostedRuntimeRequirements();
  const durableJobs = getDurableJobSystemReadiness();

  if (!config.marketDataRefreshSecret) {
    const hostedMessage =
      isHostedRuntimeEnvironment() && hostedRequirements.missingMarketData.length > 0
        ? `Hosted market-data refresh requires ${hostedRequirements.missingMarketData.join(", ")}.`
        : "MARKET_DATA_REFRESH_SECRET is not configured.";

    return applyRateLimitHeaders(
      Response.json(
        {
          ok: false,
          error: hostedMessage,
          readiness: getMarketDataRefreshReadiness(),
          durableJobs,
        },
        { status: 503 },
      ),
      rateLimit,
    );
  }

  if (!durableJobs.configured) {
    return applyRateLimitHeaders(
      Response.json(
        {
          ok: false,
          error: "Trigger.dev is not configured for durable market-data jobs yet.",
          readiness: getMarketDataRefreshReadiness(),
          durableJobs,
        },
        { status: 503 },
      ),
      rateLimit,
    );
  }

  const providedSecret = request.headers.get("x-riddra-refresh-secret");

  if (providedSecret !== config.marketDataRefreshSecret) {
    return applyRateLimitHeaders(
      Response.json(
        {
          ok: false,
          error: "Unauthorized refresh request.",
        },
        { status: 401 },
      ),
      rateLimit,
    );
  }

  try {
    const handle = await queueDurableJob({
      taskId: "market-data-snapshot-refresh",
      payload: {
        requestedBy: "manual_post",
        source: "manual_post",
      },
      idempotencyKey: `market-data-snapshot-refresh:${new Date().toISOString()}`,
      tags: ["durable-job", "market-data", "snapshot-refresh"],
      metadata: {
        routeTarget: "/api/market-data/refresh",
        source: "manual_post",
      },
    });

    return applyRateLimitHeaders(
      Response.json({
        ok: true,
        mode: "durable_job_queued",
        job: {
          id: handle.id,
          taskId: "market-data-snapshot-refresh",
        },
        durableJobs,
      }),
      rateLimit,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown refresh failure";

    return applyRateLimitHeaders(
      Response.json(
        {
          ok: false,
          error: message,
          readiness: getMarketDataRefreshReadiness(),
          durableJobs,
        },
        { status: 500 },
      ),
      rateLimit,
    );
  }
}
