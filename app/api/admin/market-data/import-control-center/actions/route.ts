import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { appendAdminActivityLog } from "@/lib/admin-activity-log";
import {
  getAdminImportControlCenterData,
} from "@/lib/admin-import-control-center";
import {
  getFailedImportStocks,
  listStocksForImportByYahooSymbols,
} from "@/lib/admin-stock-import-dashboard";
import { requireOperator } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createYahooDailyChartUpdateJob,
  createYahooStockBatchImportJob,
  runYahooStockBatchImportUntilComplete,
} from "@/lib/yahoo-finance-batch-import";
import { runYahooDryRunImport } from "@/lib/yahoo-finance-import";

type ControlCenterAction =
  | "run_safe_dry_run"
  | "run_daily_chart_update"
  | "import_missing_historical_data"
  | "refresh_todays_snapshots"
  | "retry_failed_safe_modules";

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeAction(value: unknown): ControlCenterAction {
  const normalized = cleanString(value, 160);
  if (normalized === "run_safe_dry_run") return "run_safe_dry_run";
  if (normalized === "run_daily_chart_update") return "run_daily_chart_update";
  if (normalized === "import_missing_historical_data") return "import_missing_historical_data";
  if (normalized === "refresh_todays_snapshots") return "refresh_todays_snapshots";
  return "retry_failed_safe_modules";
}

function revalidateControlCenterRoutes(slugs: string[] = []) {
  revalidatePath("/admin");
  revalidatePath("/admin/activity-log");
  revalidatePath("/admin/market-data");
  revalidatePath("/admin/market-data/stocks");
  revalidatePath("/admin/market-data/import-control-center");
  for (const slug of slugs) {
    if (!slug) continue;
    revalidatePath(`/stocks/${slug}`);
    revalidatePath(`/admin/content/stocks/${slug}`);
  }
}

function createBatchSummary(
  label: string,
  stockCount: number,
  processedItems: number,
  warnings: string[],
) {
  return `${label} processed ${stockCount} stock${stockCount === 1 ? "" : "s"} across ${processedItems} batch item${processedItems === 1 ? "" : "s"}${warnings.length ? ` with ${warnings.length} warning${warnings.length === 1 ? "" : "s"}` : ""}.`;
}

async function loadRequestedStocksByYahooSymbols(yahooSymbols: string[]) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("stocks_master")
    .select("id, slug, symbol, yahoo_symbol")
    .in("yahoo_symbol", yahooSymbols)
    .order("symbol", { ascending: true });

  if (error) {
    throw new Error(`Could not resolve the requested Yahoo symbols. ${error.message}`);
  }

  return Array.isArray(data)
    ? data
        .map((row) => ({
          stockId: cleanString((row as Record<string, unknown>).id, 160),
          slug: cleanString((row as Record<string, unknown>).slug, 160),
          yahooSymbol:
            cleanString((row as Record<string, unknown>).yahoo_symbol, 160) ||
            cleanString((row as Record<string, unknown>).symbol, 160),
        }))
        .filter((row) => row.stockId && row.slug && row.yahooSymbol)
    : [];
}

export async function POST(request: NextRequest) {
  const { user } = await requireOperator();

  try {
    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = normalizeAction(payload.action);
    const actorEmail = user.email ?? "Operator";
    const actorUserId = user.id;
    const requestedYahooSymbols = Array.isArray(payload.yahooSymbols)
      ? payload.yahooSymbols
          .map((value) => cleanString(value, 160).toUpperCase())
          .filter(Boolean)
      : [];
    const dryRunRequested = payload.dryRun === true;

    if (action === "run_safe_dry_run") {
      const relianceStock = (
        await listStocksForImportByYahooSymbols(["RELIANCE.NS"])
      )[0];

      const dryRun = await runYahooDryRunImport({
        yahooSymbol: "RELIANCE.NS",
        stockId: relianceStock?.id ?? null,
        actorEmail,
        actorUserId,
      });

      revalidateControlCenterRoutes(dryRun.stock.slug ? [dryRun.stock.slug] : []);

      await appendAdminActivityLog({
        actorUserId,
        actorEmail,
        actionType: "market_data.import_completed",
        targetType: "stock_import_job",
        targetId: dryRun.historical.jobId,
        targetFamily: "stocks",
        targetSlug: dryRun.stock.slug,
        summary: `Ran Yahoo dry-run for ${dryRun.stock.companyName ?? dryRun.stock.symbol}.`,
        metadata: {
          controlCenterAction: action,
          yahooSymbol: dryRun.stock.yahooSymbol,
          stockSlug: dryRun.stock.slug,
          dryRun: true,
          historicalJobId: dryRun.historical.jobId,
          quoteStatisticsJobId: dryRun.quoteStatistics.jobId,
          financialStatementsJobId: dryRun.financialStatements.jobId,
        },
      }).catch(() => undefined);

      return NextResponse.json({
        ok: true,
        action,
        mode: "dry_run",
        message: `Ran the no-network RELIANCE.NS dry-run through historical, quote/statistics, and financial-statement lanes.`,
        affectedSlugs: [dryRun.stock.slug],
        warnings: [
          ...dryRun.historical.warnings,
          ...dryRun.quoteStatistics.warnings,
          ...dryRun.financialStatements.warnings,
        ],
        details: {
          stock: dryRun.stock,
          historicalJobId: dryRun.historical.jobId,
          quoteStatisticsJobId: dryRun.quoteStatistics.jobId,
          financialStatementsJobId: dryRun.financialStatements.jobId,
        },
      });
    }

    const controlCenter = await getAdminImportControlCenterData();
    const boundedSlice = Math.max(1, controlCenter.actionScope.boundedWorkerSlice);

    const buildStocks = (
      stocks: Array<{
        stockId: string;
        slug: string;
        yahooSymbol: string;
      }>,
    ) =>
      stocks.map((stock) => ({
        stockId: stock.stockId,
        yahooSymbol: stock.yahooSymbol,
        slug: stock.slug,
      }));

    if (action === "run_daily_chart_update") {
      const selected = requestedYahooSymbols.length
        ? await loadRequestedStocksByYahooSymbols(requestedYahooSymbols)
        : controlCenter.dashboard.stocks
            .filter((stock) => stock.importable)
            .sort((left, right) =>
              `${Number(left.latestSnapshotCompleted)}:${left.lastSuccessfulImportAt ?? ""}:${left.slug}`.localeCompare(
                `${Number(right.latestSnapshotCompleted)}:${right.lastSuccessfulImportAt ?? ""}:${right.slug}`,
              ),
            )
            .slice(0, boundedSlice)
            .map((stock) => ({
              stockId: stock.stockId,
              slug: stock.slug,
              yahooSymbol: stock.yahooSymbol ?? stock.symbol,
            }));

      if (!selected.length) {
        return NextResponse.json(
          { error: "No importable stocks are currently available for the daily Yahoo chart update." },
          { status: 400 },
        );
      }

      const created = await createYahooDailyChartUpdateJob({
        stocks: buildStocks(selected),
        actorEmail,
        actorUserId,
        dryRun: dryRunRequested,
      });
      const runResult = await runYahooStockBatchImportUntilComplete({
        jobId: created.jobId,
        actorEmail,
        actorUserId,
        maxItemsPerRun: selected.length * 2,
      });

      revalidateControlCenterRoutes(selected.map((stock) => stock.slug));

      await appendAdminActivityLog({
        actorUserId,
        actorEmail,
        actionType: "market_data.import_completed",
        targetType: "stock_import_job",
        targetId: created.jobId,
        targetFamily: "stocks",
        targetSlug: null,
        summary: createBatchSummary(
          "Ran the daily Yahoo chart update slice",
          selected.length,
          runResult.processedItems,
          runResult.warnings,
        ),
        metadata: {
          controlCenterAction: action,
          jobId: created.jobId,
          selectedStocks: selected,
          modules: ["historical_prices", "quote_statistics"],
          importOnlyMissingData: false,
          chartOnly: true,
          snapshotOnly: true,
          historicalPeriod: "1mo",
          dryRun: dryRunRequested,
          report: runResult.report,
          warnings: runResult.warnings,
        },
      }).catch(() => undefined);

      return NextResponse.json({
        ok: true,
        action,
        jobId: created.jobId,
        message: `Processed ${selected.length} stocks through the safe daily chart-only Yahoo update lane${dryRunRequested ? " in no-network dry-run mode" : ""}.`,
        affectedSlugs: selected.map((stock) => stock.slug),
        warnings: runResult.warnings,
        report: runResult.report,
      });
    }

    if (action === "import_missing_historical_data") {
      const selected = controlCenter.dashboard.stocks
        .filter((stock) => stock.importable && !stock.historicalCompleted)
        .slice(0, boundedSlice)
        .map((stock) => ({
          stockId: stock.stockId,
          slug: stock.slug,
          yahooSymbol: stock.yahooSymbol ?? stock.symbol,
        }));

      if (!selected.length) {
        return NextResponse.json(
          { error: "No stocks are currently missing historical Yahoo coverage." },
          { status: 400 },
        );
      }

      const created = await createYahooStockBatchImportJob({
        stocks: buildStocks(selected),
        modules: ["historical_prices"],
        importOnlyMissingData: true,
        duplicateMode: "skip_existing_dates",
        actorEmail,
        actorUserId,
      });
      const runResult = await runYahooStockBatchImportUntilComplete({
        jobId: created.jobId,
        actorEmail,
        actorUserId,
        maxItemsPerRun: selected.length,
      });

      revalidateControlCenterRoutes(selected.map((stock) => stock.slug));

      await appendAdminActivityLog({
        actorUserId,
        actorEmail,
        actionType: "market_data.import_completed",
        targetType: "stock_import_job",
        targetId: created.jobId,
        targetFamily: "stocks",
        targetSlug: null,
        summary: createBatchSummary(
          "Imported missing Yahoo historical coverage",
          selected.length,
          runResult.processedItems,
          runResult.warnings,
        ),
        metadata: {
          controlCenterAction: action,
          jobId: created.jobId,
          selectedStocks: selected,
          modules: ["historical_prices"],
          importOnlyMissingData: true,
          report: runResult.report,
          warnings: runResult.warnings,
        },
      }).catch(() => undefined);

      return NextResponse.json({
        ok: true,
        action,
        jobId: created.jobId,
        message: `Processed the next ${selected.length} stocks missing historical coverage.`,
        affectedSlugs: selected.map((stock) => stock.slug),
        warnings: runResult.warnings,
        report: runResult.report,
      });
    }

    if (action === "refresh_todays_snapshots") {
      const selected = controlCenter.dashboard.stocks
        .filter((stock) => stock.importable)
        .sort((left, right) => Number(left.latestSnapshotCompleted) - Number(right.latestSnapshotCompleted))
        .slice(0, boundedSlice)
        .map((stock) => ({
          stockId: stock.stockId,
          slug: stock.slug,
          yahooSymbol: stock.yahooSymbol ?? stock.symbol,
        }));

      if (!selected.length) {
        return NextResponse.json(
          { error: "No importable stocks are available for snapshot refresh." },
          { status: 400 },
        );
      }

      const created = await createYahooStockBatchImportJob({
        stocks: buildStocks(selected),
        modules: ["quote_statistics"],
        importOnlyMissingData: true,
        duplicateMode: "skip_existing_dates",
        actorEmail,
        actorUserId,
      });
      const runResult = await runYahooStockBatchImportUntilComplete({
        jobId: created.jobId,
        actorEmail,
        actorUserId,
        maxItemsPerRun: selected.length,
      });

      revalidateControlCenterRoutes(selected.map((stock) => stock.slug));

      await appendAdminActivityLog({
        actorUserId,
        actorEmail,
        actionType: "market_data.import_completed",
        targetType: "stock_import_job",
        targetId: created.jobId,
        targetFamily: "stocks",
        targetSlug: null,
        summary: createBatchSummary(
          "Refreshed today’s Yahoo snapshots in safe mode",
          selected.length,
          runResult.processedItems,
          runResult.warnings,
        ),
        metadata: {
          controlCenterAction: action,
          jobId: created.jobId,
          selectedStocks: selected,
          modules: ["quote_statistics"],
          importOnlyMissingData: true,
          report: runResult.report,
          warnings: runResult.warnings,
        },
      }).catch(() => undefined);

      return NextResponse.json({
        ok: true,
        action,
        jobId: created.jobId,
        message: `Processed the next ${selected.length} stocks for today’s snapshot refresh.`,
        affectedSlugs: selected.map((stock) => stock.slug),
        warnings: runResult.warnings,
        report: runResult.report,
      });
    }

    const failedStocks = (await getFailedImportStocks())
      .slice(0, Math.max(1, Math.min(8, boundedSlice)))
      .map((stock) => ({
        stockId: stock.stockId,
        slug: stock.slug,
        yahooSymbol: stock.yahooSymbol ?? stock.symbol,
      }));

    if (!failedStocks.length) {
      return NextResponse.json(
        { error: "There are no failed safe-module stocks to retry right now." },
        { status: 400 },
      );
    }

    const created = await createYahooStockBatchImportJob({
      stocks: buildStocks(failedStocks),
      modules: ["historical_prices", "quote_statistics"],
      importOnlyMissingData: true,
      duplicateMode: "skip_existing_dates",
      actorEmail,
      actorUserId,
    });
    const runResult = await runYahooStockBatchImportUntilComplete({
      jobId: created.jobId,
      actorEmail,
      actorUserId,
      maxItemsPerRun: failedStocks.length * 2,
    });

    revalidateControlCenterRoutes(failedStocks.map((stock) => stock.slug));

    await appendAdminActivityLog({
      actorUserId,
      actorEmail,
      actionType: runResult.report.status === "failed" ? "market_data.import_failed" : "market_data.import_completed",
      targetType: "stock_import_job",
      targetId: created.jobId,
      targetFamily: "stocks",
      targetSlug: null,
      summary: createBatchSummary(
        "Retried failed safe Yahoo modules",
        failedStocks.length,
        runResult.processedItems,
        runResult.warnings,
      ),
      metadata: {
        controlCenterAction: action,
        jobId: created.jobId,
        selectedStocks: failedStocks,
        modules: ["historical_prices", "quote_statistics"],
        importOnlyMissingData: true,
        report: runResult.report,
        warnings: runResult.warnings,
      },
    }).catch(() => undefined);

    return NextResponse.json({
      ok: true,
      action,
      jobId: created.jobId,
      message: `Retried safe Yahoo modules for ${failedStocks.length} failed stock${failedStocks.length === 1 ? "" : "s"}.`,
      affectedSlugs: failedStocks.map((stock) => stock.slug),
      warnings: runResult.warnings,
      report: runResult.report,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "The Yahoo import control center action could not complete right now.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
