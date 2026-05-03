import { NextRequest, NextResponse } from "next/server";

import { appendAdminActivityLog } from "@/lib/admin-activity-log";
import { requireOperator } from "@/lib/auth";
import {
  createYahooStockBatchImportJob,
  runYahooStockBatchImportUntilComplete,
  type YahooBatchDuplicateMode,
  type YahooBatchImportModule,
} from "@/lib/yahoo-finance-batch-import";

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeModules(value: unknown): YahooBatchImportModule[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const modules = value
    .map((item) => cleanString(item, 160))
    .filter(Boolean) as YahooBatchImportModule[];
  return modules.length ? modules : undefined;
}

function normalizeDuplicateMode(value: unknown): YahooBatchDuplicateMode {
  return cleanString(value, 160) === "replace_matching_dates"
    ? "replace_matching_dates"
    : "skip_existing_dates";
}

export async function GET() {
  await requireOperator();

  return NextResponse.json({
    ok: true,
    endpoint: "/api/admin/market-data/import/yahoo-batch",
    method: "POST",
    description:
      "Create a durable Yahoo batch import job for one stock or a selected stock list, then optionally run the worker immediately.",
    supportedModules: [
      "historical_prices",
      "quote_statistics",
      "financial_statements",
    ],
    safeDefaults: {
      importOnlyMissingData: true,
      defaultModules: ["quote_statistics"],
      historicalReimportRequiresExplicitModule: true,
      financialStatementsBatchMode: "disabled_use_manual_single_stock_test",
    },
    supportedInput: {
      stocks: [
        { yahooSymbol: "RELIANCE.NS" },
        { stockId: "existing-stocks-master-id" },
      ],
      modules: ["quote_statistics"],
      importOnlyMissingData: true,
      duplicateMode: "skip_existing_dates",
      runUntilComplete: false,
      maxItemsPerRun: 10,
    },
  });
}

export async function POST(request: NextRequest) {
  const { user } = await requireOperator();

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const stocks = Array.isArray(payload.stocks)
      ? payload.stocks
          .map((item) => (item && typeof item === "object" ? (item as Record<string, unknown>) : {}))
          .map((item) => ({
            stockId: cleanString(item.stockId, 160) || null,
            yahooSymbol: cleanString(item.yahooSymbol, 160).toUpperCase() || null,
          }))
      : [];

    if (!stocks.length) {
      return NextResponse.json(
        { error: "Add at least one stock using yahooSymbol or stockId." },
        { status: 400 },
      );
    }

    const created = await createYahooStockBatchImportJob({
      stocks,
      modules: normalizeModules(payload.modules),
      importOnlyMissingData: payload.importOnlyMissingData !== false,
      duplicateMode: normalizeDuplicateMode(payload.duplicateMode),
      actorEmail: user.email ?? "Operator",
      actorUserId: user.id,
    });

    const runUntilComplete = payload.runUntilComplete === true;
    const maxItemsPerRun = Number(payload.maxItemsPerRun ?? 10);
    const result = runUntilComplete
      ? await runYahooStockBatchImportUntilComplete({
          jobId: created.jobId,
          actorEmail: user.email ?? "Operator",
          actorUserId: user.id,
          maxItemsPerRun: Number.isFinite(maxItemsPerRun) ? maxItemsPerRun : 10,
        })
      : null;

    await appendAdminActivityLog({
      actorUserId: user.id,
      actorEmail: user.email ?? "Operator",
      actionType: "market_data.import_completed",
      targetType: "stock_import_job",
      targetId: created.jobId,
      targetFamily: "stocks",
      targetSlug: null,
      summary: runUntilComplete
        ? `Started Yahoo batch import and processed ${result?.processedItems ?? 0} module item${result?.processedItems === 1 ? "" : "s"}.`
        : "Created Yahoo batch import job.",
      metadata: {
        jobId: created.jobId,
        runUntilComplete,
        stocks,
        modules: normalizeModules(payload.modules) ?? null,
        report: result?.report ?? created.report,
      },
    });

    return NextResponse.json({
      jobId: created.jobId,
      createdReport: created.report,
      runResult: result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create the Yahoo batch import job right now.";

    await appendAdminActivityLog({
      actorUserId: user.id,
      actorEmail: user.email ?? "Operator",
      actionType: "market_data.import_failed",
      targetType: "stock_import_job",
      targetId: null,
      targetFamily: "stocks",
      targetSlug: null,
      summary: "Yahoo batch import creation failed.",
      metadata: {
        error: message,
      },
    }).catch(() => undefined);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
