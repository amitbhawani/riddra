import type { NextRequest } from "next/server";

import { getDurableJobSystemReadiness, queueDurableJob } from "@/lib/durable-jobs";
import {
  getMarketDataProviderSyncReadiness,
} from "@/lib/market-data-provider-sync";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";

function isAuthorized(request: NextRequest) {
  const config = getRuntimeLaunchConfig();
  const providedSecret = request.headers.get("x-riddra-refresh-secret");
  if (providedSecret && providedSecret === config.marketDataRefreshSecret) {
    return true;
  }

  const authHeader = request.headers.get("authorization");
  if (config.cronSecret && authHeader === `Bearer ${config.cronSecret}`) {
    return true;
  }

  return false;
}

async function queueProviderSync(source: "cron_get" | "manual_post" | "manual_put") {
  const handle = await queueDurableJob({
    taskId: "market-data-provider-sync",
    payload: {
      requestedBy: source,
      source,
    },
    idempotencyKey: `market-data-provider-sync:${source}:${new Date().toISOString().slice(0, 13)}`,
    tags: ["durable-job", "market-data", "provider-sync"],
    metadata: {
      routeTarget: "/api/market-data/provider-sync",
      source,
    },
  });

  return Response.json({
    ok: true,
    mode: "durable_job_queued",
    job: {
      id: handle.id,
      taskId: "market-data-provider-sync",
    },
    durableJobs: getDurableJobSystemReadiness(),
  });
}

export async function GET(request: NextRequest) {
  const config = getRuntimeLaunchConfig();
  const durableJobs = getDurableJobSystemReadiness();

  if (!config.marketDataRefreshSecret && !config.cronSecret) {
    return Response.json({
      ok: true,
      service: "market-data-provider-sync",
      readiness: getMarketDataProviderSyncReadiness(),
      durableJobs,
    });
  }

  if (!isAuthorized(request)) {
    return Response.json({
      ok: true,
      service: "market-data-provider-sync",
      readiness: getMarketDataProviderSyncReadiness(),
      durableJobs,
    });
  }

  if (!durableJobs.configured) {
    return Response.json(
      {
        ok: false,
        error: "Trigger.dev is not configured for durable market-data jobs yet.",
        readiness: getMarketDataProviderSyncReadiness(),
        durableJobs,
      },
      { status: 503 },
    );
  }

  try {
    return await queueProviderSync("cron_get");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown provider-sync failure";

    return Response.json(
      {
        ok: false,
        error: message,
        readiness: getMarketDataProviderSyncReadiness(),
        durableJobs,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const config = getRuntimeLaunchConfig();
  const durableJobs = getDurableJobSystemReadiness();

  if (!config.marketDataRefreshSecret && !config.cronSecret) {
    return Response.json(
      {
        ok: false,
        error: "MARKET_DATA_REFRESH_SECRET or CRON_SECRET must be configured.",
        readiness: getMarketDataProviderSyncReadiness(),
        durableJobs,
      },
      { status: 503 },
    );
  }

  if (!durableJobs.configured) {
    return Response.json(
      {
        ok: false,
        error: "Trigger.dev is not configured for durable market-data jobs yet.",
        readiness: getMarketDataProviderSyncReadiness(),
        durableJobs,
      },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return Response.json(
      {
        ok: false,
        error: "Unauthorized provider-sync request.",
      },
      { status: 401 },
    );
  }

  try {
    return await queueProviderSync("manual_post");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown provider-sync failure";

    return Response.json(
      {
        ok: false,
        error: message,
        readiness: getMarketDataProviderSyncReadiness(),
        durableJobs,
      },
      { status: 500 },
    );
  }
}

export async function HEAD(request: NextRequest) {
  if (!isAuthorized(request)) {
    return new Response(null, { status: 401 });
  }

  return new Response(null, { status: 200 });
}

export async function PUT(request: NextRequest) {
  const config = getRuntimeLaunchConfig();
  const durableJobs = getDurableJobSystemReadiness();

  if (!config.marketDataRefreshSecret && !config.cronSecret) {
    return Response.json(
      {
        ok: false,
        error: "MARKET_DATA_REFRESH_SECRET or CRON_SECRET must be configured.",
        readiness: getMarketDataProviderSyncReadiness(),
        durableJobs,
      },
      { status: 503 },
    );
  }

  if (!durableJobs.configured) {
    return Response.json(
      {
        ok: false,
        error: "Trigger.dev is not configured for durable market-data jobs yet.",
        readiness: getMarketDataProviderSyncReadiness(),
        durableJobs,
      },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return Response.json(
      {
        ok: false,
        error: "Unauthorized provider-sync request.",
      },
      { status: 401 },
    );
  }

  try {
    return await queueProviderSync("manual_put");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown provider-sync failure";

    return Response.json(
      {
        ok: false,
        error: message,
        readiness: getMarketDataProviderSyncReadiness(),
        durableJobs,
      },
      { status: 500 },
    );
  }
}
