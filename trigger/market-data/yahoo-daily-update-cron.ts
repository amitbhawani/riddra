import { logger, task, tasks } from "@trigger.dev/sdk/v3";

import { appendAdminActivityLog } from "@/lib/admin-activity-log";
import {
  runYahooDailySameDayCronWorker,
  type YahooDailyCronWindow,
} from "@/lib/yahoo-finance-batch-import";

type YahooDailyUpdateCronPayload = {
  jobId: string;
  cronWindow: YahooDailyCronWindow;
  targetDate: string;
  requestedBy: string;
  source: string;
  maxItemsPerRun?: number;
};

async function recordTerminalCronLog(input: {
  cronWindow: YahooDailyCronWindow;
  targetDate: string;
  jobId: string;
  resultStatus: string;
  outcome: Awaited<ReturnType<typeof runYahooDailySameDayCronWorker>>;
}) {
  try {
    await appendAdminActivityLog({
      actorUserId: null,
      actorEmail: "System",
      actionType: "market_data.yahoo_daily_update_cron",
      targetType: "yahoo_daily_update",
      targetId: input.jobId,
      targetFamily: "market-data",
      targetSlug: input.cronWindow,
      summary: `Yahoo daily same-day-only cron ${input.resultStatus.replaceAll("_", " ")} (${input.cronWindow}) for ${input.targetDate}.`,
      metadata: {
        source: "durable_worker",
        stage: "completed",
        cronWindow: input.cronWindow,
        mode: "daily_same_day_only",
        targetDate: input.targetDate,
        jobId: input.jobId,
        resultStatus: input.resultStatus,
        processedStocks: input.outcome.processedStocks,
        requestedCount: input.outcome.report.totalStocks,
        processedCount: input.outcome.report.processedItems,
        completedCount: input.outcome.report.completedStocks,
        failedCount: input.outcome.report.failedStocks,
        pendingCount: input.outcome.report.pendingStocks,
        insertedRows: input.outcome.report.importedItems,
        updatedRows: input.outcome.report.updatedItems,
        skippedRows: input.outcome.report.skippedItems,
        warningItems: input.outcome.report.warningItems,
        nextCursor: input.outcome.dispatchCursor,
        lastProcessedSymbol: input.outcome.lastProcessedSymbol,
        nextPendingSymbol: input.outcome.nextPendingSymbol,
        warnings: input.outcome.warnings.slice(0, 25),
      },
    });
  } catch (error) {
    logger.error("Could not append terminal Yahoo daily cron log", {
      jobId: input.jobId,
      cronWindow: input.cronWindow,
      targetDate: input.targetDate,
      error: error instanceof Error ? error.message : "Unknown log failure",
    });
  }
}

export const yahooDailyUpdateCronWorkerTask = task({
  id: "yahoo-daily-update-cron-worker",
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 1_000,
    maxTimeoutInMs: 10_000,
    randomize: false,
  },
  run: async (payload: YahooDailyUpdateCronPayload) => {
    logger.info("Starting Yahoo daily cron worker task", payload);
    const outcome = await runYahooDailySameDayCronWorker({
      jobId: payload.jobId,
      cronWindow: payload.cronWindow,
      targetDate: payload.targetDate,
      actorEmail: "System",
      actorUserId: null,
      maxItemsPerRun: payload.maxItemsPerRun,
    });

    logger.info("Completed Yahoo daily cron worker task slice", {
      jobId: payload.jobId,
      cronWindow: payload.cronWindow,
      targetDate: payload.targetDate,
      processedStocks: outcome.processedStocks,
      jobStatus: outcome.report.status,
      pendingStocks: outcome.report.pendingStocks,
      shouldQueueFollowUp: outcome.shouldQueueFollowUp,
      lastProcessedSymbol: outcome.lastProcessedSymbol,
      nextPendingSymbol: outcome.nextPendingSymbol,
    });

    if (outcome.shouldQueueFollowUp) {
      const followUp = await tasks.trigger(
        "yahoo-daily-update-cron-worker",
        {
          ...payload,
          source: "durable_follow_up",
          maxItemsPerRun: payload.maxItemsPerRun,
        },
        {
          idempotencyKey: `yahoo-daily-update-cron-worker:${payload.jobId}:${outcome.dispatchCursor}:${payload.cronWindow}`,
          tags: [
            "durable-job",
            "market-data",
            "yahoo-daily-update",
            `cron-window:${payload.cronWindow}`,
          ],
          metadata: {
            jobId: payload.jobId,
            cronWindow: payload.cronWindow,
            targetDate: payload.targetDate,
            dispatchCursor: outcome.dispatchCursor,
            nextPendingSymbol: outcome.nextPendingSymbol,
            source: "durable_follow_up",
          },
        },
      );

      logger.info("Queued Yahoo daily cron follow-up slice", {
        jobId: payload.jobId,
        cronWindow: payload.cronWindow,
        targetDate: payload.targetDate,
        taskRunId: followUp.id,
        dispatchCursor: outcome.dispatchCursor,
        nextPendingSymbol: outcome.nextPendingSymbol,
      });
    } else if (["completed", "failed", "stopped", "cooling_down", "paused"].includes(outcome.report.status)) {
      const resultStatus =
        outcome.report.status === "cooling_down" || outcome.report.status === "paused"
          ? "stopped_early"
          : outcome.report.status;

      await recordTerminalCronLog({
        cronWindow: payload.cronWindow,
        targetDate: payload.targetDate,
        jobId: payload.jobId,
        resultStatus,
        outcome,
      });
    }

    return {
      requestedBy: payload.requestedBy,
      source: payload.source,
      jobId: payload.jobId,
      cronWindow: payload.cronWindow,
      targetDate: payload.targetDate,
      outcome,
    };
  },
});
