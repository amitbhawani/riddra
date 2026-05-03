import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { appendAdminActivityLog } from "@/lib/admin-activity-log";
import {
  getFailedImportStocks,
  getPendingImportStocks,
  listStocksForImportByIds,
  listStocksForImportByYahooSymbols,
} from "@/lib/admin-stock-import-dashboard";
import { requireOperator } from "@/lib/auth";
import {
  runYahooHistoricalOhlcvImport,
  runYahooQuoteStatisticsImport,
} from "@/lib/yahoo-finance-import";

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

type ImportAction =
  | "import_one"
  | "import_selected"
  | "import_all_pending"
  | "retry_failed_imports";

function normalizeImportAction(value: unknown): ImportAction {
  const normalized = cleanString(value, 120);
  if (normalized === "import_one") return "import_one";
  if (normalized === "import_all_pending") return "import_all_pending";
  if (normalized === "retry_failed_imports") return "retry_failed_imports";
  return "import_selected";
}

function revalidateStockImportRoutes(slugs: string[]) {
  revalidatePath("/admin");
  revalidatePath("/admin/activity-log");
  revalidatePath("/admin/market-data/stocks");

  for (const slug of slugs) {
    if (!slug) continue;
    revalidatePath(`/stocks/${slug}`);
    revalidatePath(`/admin/content/stocks/${slug}`);
  }
}

export async function GET() {
  await requireOperator();

  return NextResponse.json({
    ok: true,
    endpoint: "/api/admin/market-data/stocks/import",
    method: "POST",
    description:
      "Trigger Yahoo stock imports from the admin stock import dashboard. Open this endpoint in the browser for status only; use POST to run imports.",
    supportedActions: [
      "import_one",
      "import_selected",
      "import_all_pending",
      "retry_failed_imports",
    ],
    supportedInput: {
      action: "import_selected",
      stockIds: ["stocks-master-id"],
      yahooSymbols: ["RELIANCE.NS"],
      dryRun: true,
    },
    safeDefaults: {
      enabledModules: ["historical_prices", "quote_statistics"],
      disabledModules: {
        financial_statements: "manual_single_stock_only",
      },
    },
  });
}

export async function POST(request: NextRequest) {
  let actorUserId: string | null = null;
  let actorEmail = "Operator";
  let payload: Record<string, unknown> = {};

  try {
    const { user } = await requireOperator();
    actorUserId = user.id;
    actorEmail = user.email ?? "Operator";
    payload = (await request.json()) as Record<string, unknown>;

    const action = normalizeImportAction(payload.action);
    const dryRun = payload.dryRun === true;
    const selectedIds = Array.isArray(payload.stockIds)
      ? payload.stockIds.map((item) => cleanString(item, 160)).filter(Boolean)
      : [];
    const selectedYahooSymbols = Array.isArray(payload.yahooSymbols)
      ? payload.yahooSymbols.map((item) => cleanString(item, 160).toUpperCase()).filter(Boolean)
      : [];

    let stocks: Array<{
      id: string;
      slug: string;
      symbol: string;
      company_name: string | null;
      yahoo_symbol: string | null;
    }> = [];

    if (action === "import_all_pending") {
      const pending = await getPendingImportStocks();
      stocks = await listStocksForImportByIds(pending.map((item) => item.stockId));
    } else if (action === "retry_failed_imports") {
      const failed = await getFailedImportStocks();
      stocks = await listStocksForImportByIds(failed.map((item) => item.stockId));
    } else {
      stocks = selectedIds.length
        ? await listStocksForImportByIds(selectedIds)
        : await listStocksForImportByYahooSymbols(selectedYahooSymbols);
    }

    const importableStocks = stocks.filter((stock) => cleanString(stock.yahoo_symbol, 160));
    if (!importableStocks.length) {
      return NextResponse.json(
        { error: "No importable stocks were selected for Yahoo import." },
        { status: 400 },
      );
    }

    const results: Array<{
      stockId: string;
      slug: string;
      symbol: string;
      yahooSymbol: string;
      historicalJobId: string;
      quoteStatsJobId: string;
      historicalWarnings: string[];
      quoteStatsWarnings: string[];
    }> = [];
    const failures: Array<{ stockId: string; slug: string; yahooSymbol: string; error: string }> = [];

    for (const stock of importableStocks) {
      try {
        const yahooSymbol = cleanString(stock.yahoo_symbol, 160).toUpperCase();
        const historical = await runYahooHistoricalOhlcvImport({
          yahooSymbol,
          stockId: stock.id,
          actorEmail,
          actorUserId,
          period: "max",
          interval: "1d",
          duplicateMode: "replace_matching_dates",
          dryRun,
        });
        const quoteStats = await runYahooQuoteStatisticsImport({
          yahooSymbol,
          stockId: stock.id,
          actorEmail,
          actorUserId,
          dryRun,
        });

        results.push({
          stockId: stock.id,
          slug: stock.slug,
          symbol: stock.symbol,
          yahooSymbol,
          historicalJobId: historical.jobId,
          quoteStatsJobId: quoteStats.jobId,
          historicalWarnings: historical.warnings,
          quoteStatsWarnings: quoteStats.warnings,
        });
      } catch (error) {
        failures.push({
          stockId: stock.id,
          slug: stock.slug,
          yahooSymbol: cleanString(stock.yahoo_symbol, 160).toUpperCase(),
          error: error instanceof Error ? error.message : "Unknown Yahoo stock import failure.",
        });
      }
    }

    const warnings: string[] = [];
    try {
      revalidateStockImportRoutes(results.map((item) => item.slug));
    } catch (revalidationError) {
      warnings.push(
        `Revalidation warning: ${revalidationError instanceof Error ? revalidationError.message : "Could not revalidate affected stock routes."}`,
      );
    }

    const importedCount = results.length;
    const failedCount = failures.length;
    const summary =
      importedCount > 0
        ? `${dryRun ? "Ran Yahoo dry-run import" : "Imported Yahoo stock data"} for ${importedCount} stock${importedCount === 1 ? "" : "s"}${failedCount ? `, with ${failedCount} failure${failedCount === 1 ? "" : "s"}` : ""}.`
        : `${dryRun ? "Yahoo dry-run import" : "Yahoo stock import"} failed for ${failedCount} selected stock${failedCount === 1 ? "" : "s"}.`;

    if (actorUserId) {
      try {
        await appendAdminActivityLog({
          actorUserId,
          actorEmail,
          actionType: importedCount > 0 ? "market_data.import_completed" : "market_data.import_failed",
          targetType: "stock_import_job",
          targetId: null,
          targetFamily: "stocks",
          targetSlug: null,
          summary,
          metadata: {
            action,
            importedCount,
            failedCount,
            stockIds: importableStocks.map((stock) => stock.id),
            slugs: importableStocks.map((stock) => stock.slug),
            dryRun,
            modulePolicy: {
              financial_statements: "disabled_for_multi_stock_dashboard_imports",
            },
            results,
            failures,
          },
        });
      } catch (activityError) {
        warnings.push(
          `Activity log warning: ${activityError instanceof Error ? activityError.message : "Could not append stock import dashboard activity log."}`,
        );
      }
    }

    if (importedCount === 0) {
      return NextResponse.json(
        {
          error: "Yahoo stock import failed for all selected stocks.",
          importedCount,
          failedCount,
          failures,
          warnings,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      importedCount,
      failedCount,
      results,
      failures,
      warnings,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "We could not run the Yahoo stock import dashboard action right now.";

    if (actorUserId) {
      try {
        await appendAdminActivityLog({
          actorUserId,
          actorEmail,
          actionType: "market_data.import_failed",
          targetType: "stock_import_job",
          targetId: null,
          targetFamily: "stocks",
          targetSlug: null,
          summary: "Yahoo stock import dashboard action failed.",
          metadata: {
            action: normalizeImportAction(payload.action),
            stockIds: Array.isArray(payload.stockIds) ? payload.stockIds : [],
            dryRun: payload.dryRun === true,
            error: message,
          },
        });
      } catch (activityError) {
        console.error(
          "[admin-stock-import-dashboard] failed to append failure activity log",
          activityError,
        );
      }
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
