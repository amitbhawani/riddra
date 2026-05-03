import type { NextRequest } from "next/server";

import {
  applyYahooDailyCronDefaults,
  getYahooDailyCronAuthorizationError,
  recordCronLog,
  revalidateYahooDailySurfaces,
  YAHOO_DAILY_CRON_WORKER_SLICE_SIZE,
} from "@/app/api/cron/yahoo-daily-update/_shared";
import {
  runYahooDailySameDayCronWorker,
  type YahooDailyCronWindow,
} from "@/lib/yahoo-finance-batch-import";

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeCronWindow(value: unknown): YahooDailyCronWindow {
  return cleanString(value, 40) === "retry" ? "retry" : "primary";
}

export async function POST(request: NextRequest) {
  const authorizationError = getYahooDailyCronAuthorizationError(request);
  if (authorizationError) {
    return authorizationError;
  }

  applyYahooDailyCronDefaults();

  try {
    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const jobId = cleanString(payload.jobId, 160);
    const targetDate = cleanString(payload.targetDate, 40);
    const cronWindow = normalizeCronWindow(payload.cronWindow);
    const maxItemsPerRun = Number(payload.maxItemsPerRun ?? YAHOO_DAILY_CRON_WORKER_SLICE_SIZE);

    if (!jobId) {
      return Response.json(
        {
          ok: false,
          error: "jobId is required to process a bounded Yahoo daily cron slice.",
        },
        { status: 400 },
      );
    }

    if (!targetDate) {
      return Response.json(
        {
          ok: false,
          error: "targetDate is required to process a bounded Yahoo daily cron slice.",
        },
        { status: 400 },
      );
    }

    const outcome = await runYahooDailySameDayCronWorker({
      jobId,
      cronWindow,
      targetDate,
      actorEmail: "System",
      actorUserId: null,
      maxItemsPerRun: Number.isFinite(maxItemsPerRun)
        ? maxItemsPerRun
        : YAHOO_DAILY_CRON_WORKER_SLICE_SIZE,
    });

    await recordCronLog({
      cronWindow,
      summary: `Yahoo daily same-day-only cron worker processed ${outcome.processedStocks} stock${outcome.processedStocks === 1 ? "" : "s"} (${cronWindow}) for ${targetDate}.`,
      metadata: {
        source: "worker_post",
        stage: "worker_slice_completed",
        cronWindow,
        mode: "daily_same_day_only",
        targetDate,
        jobId,
        processedStocks: outcome.processedStocks,
        jobStatus: outcome.report.status,
        pendingStocks: outcome.report.pendingStocks,
        nextCursor: outcome.dispatchCursor,
        lastProcessedSymbol: outcome.lastProcessedSymbol,
        nextPendingSymbol: outcome.nextPendingSymbol,
        shouldQueueFollowUp: outcome.shouldQueueFollowUp,
      },
    });

    revalidateYahooDailySurfaces();

    return Response.json({
      ok: true,
      jobId,
      cronWindow,
      targetDate,
      outcome,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Yahoo daily cron worker failure.";
    return Response.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
