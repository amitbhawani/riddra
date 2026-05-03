import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";

import { appendAdminActivityLog } from "@/lib/admin-activity-log";
import {
  getDurableJobSystemReadiness,
  queueDurableJob,
} from "@/lib/durable-jobs";
import { resolveIndianTradingDatePolicy } from "@/lib/stock-freshness-policy";
import {
  prepareYahooDailySameDayCronJob,
  type YahooDailyCronWindow,
} from "@/lib/yahoo-finance-batch-import";
import { getRuntimeLaunchConfig } from "@/lib/runtime-launch-config";

type YahooDailyCronSource = "cron_get" | "manual_post" | "worker_post";
export const YAHOO_DAILY_CRON_WORKER_SLICE_SIZE = 25;

export type YahooDailyCronReadinessSnapshot = {
  configured: boolean;
  executionSecretReady: boolean;
  executionAuthMode: ("x-riddra-refresh-secret" | "authorization: bearer")[];
  cronWindows: YahooDailyCronWindow[];
  worker: {
    taskId: string;
    route: string;
    maxItemsPerRun: number;
  };
  durableJobs: {
    configured: boolean;
    triggerSecretReady: boolean;
    triggerSecretSource: string;
    triggerProjectReady: boolean;
    missingEnv: string[];
    totalTaskFamilies: number;
    totalTasks: number;
  };
  controlCenter: {
    route: string;
    activeCronProgressVisible: boolean;
    durableJobsRoute: string;
  };
};

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

export function getYahooDailyCronReadinessSnapshot(): YahooDailyCronReadinessSnapshot {
  const durableJobs = getDurableJobSystemReadiness();

  return {
    configured: Boolean(hasExecutionSecret() && durableJobs.configured),
    executionSecretReady: hasExecutionSecret(),
    executionAuthMode: ["x-riddra-refresh-secret", "authorization: bearer"],
    cronWindows: ["primary", "retry"],
    worker: {
      taskId: "yahoo-daily-update-cron-worker",
      route: "/api/cron/yahoo-daily-update/worker",
      maxItemsPerRun: YAHOO_DAILY_CRON_WORKER_SLICE_SIZE,
    },
    durableJobs: {
      configured: durableJobs.configured,
      triggerSecretReady: durableJobs.triggerSecretReady,
      triggerSecretSource: durableJobs.triggerSecretSource,
      triggerProjectReady: durableJobs.triggerProjectReady,
      missingEnv: durableJobs.missingEnv,
      totalTaskFamilies: durableJobs.totalTaskFamilies,
      totalTasks: durableJobs.totalTasks,
    },
    controlCenter: {
      route: "/admin/market-data/import-control-center",
      activeCronProgressVisible: true,
      durableJobsRoute: "/api/admin/durable-jobs?family=market_data",
    },
  };
}

function diagnosticsRequested(request: NextRequest) {
  const value = request.nextUrl.searchParams.get("diagnostics")?.trim();
  return value === "1" || value === "true";
}

export function getYahooDailyCronAuthorizationError(request: NextRequest) {
  const includeReadiness = diagnosticsRequested(request);

  if (!hasExecutionSecret()) {
    return Response.json(
      {
        ok: false,
        error: "MARKET_DATA_REFRESH_SECRET or CRON_SECRET must be configured.",
        ...(includeReadiness ? { readiness: getYahooDailyCronReadinessSnapshot() } : {}),
      },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return Response.json(
      {
        ok: false,
        error: "Unauthorized cron request.",
        ...(includeReadiness ? { readiness: getYahooDailyCronReadinessSnapshot() } : {}),
      },
      { status: 401 },
    );
  }

  return null;
}

export function applyYahooDailyCronDefaults() {
  if (!String(process.env.YAHOO_FINANCE_REQUESTS_PER_SECOND ?? "").trim()) {
    process.env.YAHOO_FINANCE_REQUESTS_PER_SECOND = String(1 / 3);
  }
  if (!String(process.env.YAHOO_FINANCE_MAX_CONCURRENT_WORKERS ?? "").trim()) {
    process.env.YAHOO_FINANCE_MAX_CONCURRENT_WORKERS = "1";
  }
}

export function revalidateYahooDailySurfaces() {
  revalidatePath("/admin");
  revalidatePath("/admin/activity-log");
  revalidatePath("/admin/market-data");
  revalidatePath("/admin/market-data/import-control-center");
  revalidatePath("/stocks");
}

export async function recordCronLog(input: {
  cronWindow: YahooDailyCronWindow;
  summary: string;
  metadata: Record<string, unknown>;
}) {
  try {
    await appendAdminActivityLog({
      actorUserId: null,
      actorEmail: "System",
      actionType: "market_data.yahoo_daily_update_cron",
      targetType: "yahoo_daily_update",
      targetId: null,
      targetFamily: "market-data",
      targetSlug: input.cronWindow,
      summary: input.summary,
      metadata: input.metadata,
    });
  } catch (error) {
    console.error("[cron][yahoo-daily-update] Could not append admin activity log", error);
  }
}

function getTargetTradingDate() {
  return resolveIndianTradingDatePolicy().expectedTradingDate;
}

async function queueYahooDailyUpdateWorker(input: {
  jobId: string;
  cronWindow: YahooDailyCronWindow;
  targetDate: string;
  source: YahooDailyCronSource;
  dispatchCursor: number;
}) {
  const handle = await queueDurableJob({
    taskId: "yahoo-daily-update-cron-worker",
    payload: {
      jobId: input.jobId,
      cronWindow: input.cronWindow,
      targetDate: input.targetDate,
      requestedBy: input.source,
      source: input.source,
      maxItemsPerRun: YAHOO_DAILY_CRON_WORKER_SLICE_SIZE,
    },
    idempotencyKey: `yahoo-daily-update-cron-worker:${input.jobId}:${input.dispatchCursor}:${input.cronWindow}`,
    tags: [
      "durable-job",
      "market-data",
      "yahoo-daily-update",
      `cron-window:${input.cronWindow}`,
    ],
    metadata: {
      routeTarget:
        input.cronWindow === "retry"
          ? "/api/cron/yahoo-daily-update-retry"
          : "/api/cron/yahoo-daily-update",
      cronWindow: input.cronWindow,
      targetDate: input.targetDate,
      jobId: input.jobId,
      dispatchCursor: input.dispatchCursor,
      source: input.source,
    },
  });

  return handle;
}

export async function executeYahooDailyUpdateCron(
  request: NextRequest,
  input: {
    cronWindow: YahooDailyCronWindow;
    source: YahooDailyCronSource;
  },
) {
  const authorizationError = getYahooDailyCronAuthorizationError(request);
  if (authorizationError) {
    return authorizationError;
  }

  if (diagnosticsRequested(request)) {
    return Response.json({
      ok: true,
      mode: "diagnostics",
      cronWindow: input.cronWindow,
      source: input.source,
      targetDate: getTargetTradingDate(),
      readiness: getYahooDailyCronReadinessSnapshot(),
    });
  }

  const durableJobs = getDurableJobSystemReadiness();
  if (!durableJobs.configured) {
    return Response.json(
      {
        ok: false,
        error: "Trigger.dev is not configured for durable Yahoo cron jobs yet.",
        readiness: getYahooDailyCronReadinessSnapshot(),
      },
      { status: 503 },
    );
  }

  applyYahooDailyCronDefaults();
  const targetDate = getTargetTradingDate();
  const startedAt = new Date().toISOString();

  try {
    const prepared = await prepareYahooDailySameDayCronJob({
      cronWindow: input.cronWindow,
      targetDate,
      actorEmail: "System",
      actorUserId: null,
    });

    if (prepared.mode === "no_work") {
      await recordCronLog({
        cronWindow: input.cronWindow,
        summary: `Yahoo daily same-day-only cron found no remaining stocks to process (${input.cronWindow}) for ${targetDate}.`,
        metadata: {
          source: input.source,
          stage: "no_work",
          cronWindow: input.cronWindow,
          mode: "daily_same_day_only",
          targetDate,
          command: "npm run yahoo:daily-update",
          requestedCount: 0,
          jobId: null,
        },
      });

      revalidateYahooDailySurfaces();

      return Response.json({
        ok: true,
        cronWindow: input.cronWindow,
        source: input.source,
        targetDate,
        mode: prepared.mode,
        requestedCount: 0,
      });
    }

    let durableHandle: Awaited<ReturnType<typeof queueYahooDailyUpdateWorker>> | null = null;
    if (prepared.queueWorker && prepared.jobId) {
      durableHandle = await queueYahooDailyUpdateWorker({
        jobId: prepared.jobId,
        cronWindow: input.cronWindow,
        targetDate,
        source: input.source,
        dispatchCursor: prepared.dispatchCursor,
      });
    }

    const stage =
      prepared.mode === "already_running"
        ? "already_running"
        : prepared.created
          ? "queued"
          : "resumed";

    await recordCronLog({
      cronWindow: input.cronWindow,
      summary: `Yahoo daily same-day-only cron ${stage.replaceAll("_", " ")} (${input.cronWindow}) for ${targetDate}.`,
      metadata: {
        source: input.source,
        stage,
        cronWindow: input.cronWindow,
        mode: "daily_same_day_only",
        targetDate,
        command: "npm run yahoo:daily-update",
        startedAt,
        jobId: prepared.jobId,
        requestedCount: prepared.requestedCount,
        dispatchCursor: prepared.dispatchCursor,
        lastProcessedSymbol: prepared.lastProcessedSymbol,
        nextPendingSymbol: prepared.nextPendingSymbol,
        durableJobRunId: durableHandle?.id ?? null,
        resultStatus: stage,
      },
    });

    revalidateYahooDailySurfaces();

    return Response.json({
      ok: true,
      cronWindow: input.cronWindow,
      source: input.source,
      targetDate,
      mode: prepared.mode,
      jobId: prepared.jobId,
      created: prepared.created,
      reused: prepared.reused,
      requestedCount: prepared.requestedCount,
      queueWorker: prepared.queueWorker,
      dispatchCursor: prepared.dispatchCursor,
      lastProcessedSymbol: prepared.lastProcessedSymbol,
      nextPendingSymbol: prepared.nextPendingSymbol,
      durableTaskRunId: durableHandle?.id ?? null,
      report: prepared.report,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Yahoo daily cron failure.";
    console.error("[cron][yahoo-daily-update] Cron enqueue failed", {
      cronWindow: input.cronWindow,
      source: input.source,
      targetDate,
      error: message,
    });

    await recordCronLog({
      cronWindow: input.cronWindow,
      summary: `Yahoo daily same-day-only cron failed to queue (${input.cronWindow}) for ${targetDate}: ${message}`,
      metadata: {
        source: input.source,
        stage: "failed",
        cronWindow: input.cronWindow,
        mode: "daily_same_day_only",
        targetDate,
        startedAt,
        resultStatus: "failed",
        error: message,
      },
    });

    return Response.json(
      {
        ok: false,
        cronWindow: input.cronWindow,
        source: input.source,
        targetDate,
        error: message,
      },
      { status: 500 },
    );
  }
}

export function handleYahooDailyUpdateCronHead(request: NextRequest) {
  const authorizationError = getYahooDailyCronAuthorizationError(request);
  if (authorizationError) {
    return new Response(null, { status: authorizationError.status });
  }

  return new Response(null, { status: 200 });
}
