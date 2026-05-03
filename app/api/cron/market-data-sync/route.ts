import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";

import { appendAdminActivityLog } from "@/lib/admin-activity-log";
import { runAllActiveMarketDataSyncs } from "@/lib/market-data-sync";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";

function isAuthorized(request: NextRequest) {
  const config = getRuntimeLaunchConfig();
  const providedRefreshSecret = request.headers.get("x-riddra-refresh-secret")?.trim();
  if (
    providedRefreshSecret &&
    config.marketDataRefreshSecret &&
    providedRefreshSecret === config.marketDataRefreshSecret
  ) {
    return true;
  }

  const authHeader = request.headers.get("authorization")?.trim();
  if (config.cronSecret && authHeader === `Bearer ${config.cronSecret}`) {
    return true;
  }

  return false;
}

function hasExecutionSecret() {
  const config = getRuntimeLaunchConfig();
  return Boolean(config.marketDataRefreshSecret || config.cronSecret);
}

function revalidateMarketDataSurfaces(routes: string[]) {
  revalidatePath("/admin");
  revalidatePath("/admin/activity-log");
  revalidatePath("/admin/market-data");
  revalidatePath("/admin/market-data/sources");
  revalidatePath("/stocks");

  for (const route of routes) {
    revalidatePath(route);
  }
}

async function recordCronLog(input: {
  summary: string;
  metadata: Record<string, unknown>;
}) {
  try {
    await appendAdminActivityLog({
      actorUserId: null,
      actorEmail: "System",
      actionType: "market_data_sync_cron",
      targetType: "market_data_sync",
      targetId: null,
      targetFamily: "market-data",
      targetSlug: null,
      summary: input.summary,
      metadata: input.metadata,
    });
  } catch (error) {
    console.error("[cron][market-data-sync] Could not append admin activity log", error);
  }
}

async function executeCronSync(source: "cron_get" | "manual_post") {
  const startedAt = Date.now();
  console.info("[cron][market-data-sync] Starting market-data sync", {
    source,
    startedAt: new Date(startedAt).toISOString(),
  });

  await recordCronLog({
    summary: `Market-data sync started via ${source}.`,
    metadata: {
      source,
      stage: "started",
      startedAt: new Date(startedAt).toISOString(),
    },
  });

  const results = await runAllActiveMarketDataSyncs({
    actorUserId: null,
    actorEmail: "System",
  });

  const durationMs = Date.now() - startedAt;
  const routes = Array.from(new Set(results.flatMap((result) => result.affectedRoutes)));
  revalidateMarketDataSurfaces(routes);

  const completedSources = results.filter((result) => result.outcome !== "failed").length;
  const failedSources = results.filter((result) => result.outcome === "failed").length;
  const importedRows = results.reduce((sum, result) => sum + result.importedRows, 0);
  const skippedRows = results.reduce((sum, result) => sum + result.skippedRows, 0);
  const warnings = results.flatMap((result) => result.warnings);

  console.info("[cron][market-data-sync] Completed market-data sync", {
    source,
    durationMs,
    syncedSources: results.length,
    completedSources,
    failedSources,
    importedRows,
    skippedRows,
  });

  await recordCronLog({
    summary: `Market-data sync completed via ${source}: ${completedSources}/${results.length} sources completed, ${failedSources} failed.`,
    metadata: {
      source,
      stage: "completed",
      durationMs,
      syncedSources: results.length,
      completedSources,
      failedSources,
      importedRows,
      skippedRows,
      warnings: warnings.slice(0, 25),
    },
  });

  return Response.json({
    ok: true,
    source,
    syncedSources: results.length,
    completedSources,
    failedSources,
    importedRows,
    skippedRows,
    durationMs,
    results,
  });
}

export async function GET(request: NextRequest) {
  if (!hasExecutionSecret()) {
    return Response.json(
      {
        ok: false,
        error: "MARKET_DATA_REFRESH_SECRET or CRON_SECRET must be configured.",
      },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return Response.json(
      {
        ok: false,
        error: "Unauthorized cron request.",
      },
      { status: 401 },
    );
  }

  try {
    return await executeCronSync("cron_get");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cron sync failure.";
    console.error("[cron][market-data-sync] Sync failed", error);
    await recordCronLog({
      summary: `Market-data sync failed via cron_get: ${message}`,
      metadata: {
        source: "cron_get",
        stage: "failed",
        error: message,
      },
    });
    return Response.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!hasExecutionSecret()) {
    return Response.json(
      {
        ok: false,
        error: "MARKET_DATA_REFRESH_SECRET or CRON_SECRET must be configured.",
      },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return Response.json(
      {
        ok: false,
        error: "Unauthorized cron request.",
      },
      { status: 401 },
    );
  }

  try {
    return await executeCronSync("manual_post");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cron sync failure.";
    console.error("[cron][market-data-sync] Manual sync failed", error);
    await recordCronLog({
      summary: `Market-data sync failed via manual_post: ${message}`,
      metadata: {
        source: "manual_post",
        stage: "failed",
        error: message,
      },
    });
    return Response.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}

export async function HEAD(request: NextRequest) {
  if (!hasExecutionSecret()) {
    return new Response(null, { status: 503 });
  }

  if (!isAuthorized(request)) {
    return new Response(null, { status: 401 });
  }

  return new Response(null, { status: 200 });
}
