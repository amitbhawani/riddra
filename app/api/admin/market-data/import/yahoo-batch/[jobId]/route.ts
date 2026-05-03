import { NextRequest, NextResponse } from "next/server";

import { appendAdminActivityLog } from "@/lib/admin-activity-log";
import { requireOperator } from "@/lib/auth";
import {
  controlYahooStockBatchImportJob,
  getYahooStockBatchImportReport,
  runYahooStockBatchImportUntilComplete,
  runYahooStockBatchImportWorker,
  type YahooBatchControlAction,
} from "@/lib/yahoo-finance-batch-import";

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeAction(value: unknown): "run" | YahooBatchControlAction {
  const normalized = cleanString(value, 120);
  if (normalized === "pause") return "pause";
  if (normalized === "resume") return "resume";
  if (normalized === "retry") return "retry";
  if (normalized === "stop") return "stop";
  return "run";
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  await requireOperator();
  const { jobId } = await context.params;

  try {
    const report = await getYahooStockBatchImportReport(jobId);
    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load the Yahoo batch import report right now.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  const { user } = await requireOperator();
  const { jobId } = await context.params;

  try {
    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = normalizeAction(payload.action);
    const maxItemsPerRun = Number(payload.maxItemsPerRun ?? 10);
    const runUntilComplete = payload.runUntilComplete === true;

    if (action === "run") {
      const result = runUntilComplete
        ? await runYahooStockBatchImportUntilComplete({
            jobId,
            actorEmail: user.email ?? "Operator",
            actorUserId: user.id,
            maxItemsPerRun: Number.isFinite(maxItemsPerRun) ? maxItemsPerRun : 10,
          })
        : await runYahooStockBatchImportWorker({
            jobId,
            actorEmail: user.email ?? "Operator",
            actorUserId: user.id,
            maxItemsPerRun: Number.isFinite(maxItemsPerRun) ? maxItemsPerRun : 10,
          });

      await appendAdminActivityLog({
        actorUserId: user.id,
        actorEmail: user.email ?? "Operator",
        actionType:
          result.report.status === "failed" ? "market_data.import_failed" : "market_data.import_completed",
        targetType: "stock_import_job",
        targetId: jobId,
        targetFamily: "stocks",
        targetSlug: null,
        summary: `Ran Yahoo batch worker for ${result.processedItems} module item${result.processedItems === 1 ? "" : "s"}.`,
        metadata: {
          jobId,
          runUntilComplete,
          processedItems: result.processedItems,
          warnings: result.warnings,
          report: result.report,
        },
      });

      return NextResponse.json(result);
    }

    const result = await controlYahooStockBatchImportJob({
      jobId,
      action,
      actorEmail: user.email ?? "Operator",
    });

    await appendAdminActivityLog({
      actorUserId: user.id,
      actorEmail: user.email ?? "Operator",
      actionType: "market_data.import_completed",
      targetType: "stock_import_job",
      targetId: jobId,
      targetFamily: "stocks",
      targetSlug: null,
      summary: `${action.charAt(0).toUpperCase() + action.slice(1)}d Yahoo batch import job.`,
      metadata: {
        jobId,
        action,
        report: result.report,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not control the Yahoo batch import job right now.",
      },
      { status: 500 },
    );
  }
}
