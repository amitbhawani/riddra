import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { appendAdminActivityLog } from "@/lib/admin-activity-log";
import { requireOperator } from "@/lib/auth";
import {
  runYahooHistoricalOhlcvImport,
  runYahooHistoricalOhlcvImportBatch,
  type YahooHistoricalOhlcvImportBatchResult,
  type YahooHistoricalOhlcvImportResult,
} from "@/lib/yahoo-finance-import";

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function parsePeriod(value: unknown) {
  return cleanString(value, 40) || "max";
}

function parseInterval(value: unknown): "1d" {
  const normalized = cleanString(value, 20).toLowerCase();
  if (normalized && normalized !== "1d") {
    throw new Error("Yahoo historical OHLCV importer currently supports interval 1d only.");
  }
  return "1d";
}

function parseDuplicateMode(value: unknown): "replace_matching_dates" | "skip_existing_dates" {
  return cleanString(value, 160) === "skip_existing_dates"
    ? "skip_existing_dates"
    : "replace_matching_dates";
}

function revalidateHistoricalSurfaces(slugs: string[]) {
  revalidatePath("/admin");
  revalidatePath("/admin/activity-log");
  revalidatePath("/admin/market-data");

  for (const slug of slugs) {
    if (slug) {
      revalidatePath(`/stocks/${slug}`);
    }
  }
}

function createSingleSummary(result: YahooHistoricalOhlcvImportResult) {
  const label = result.stock.companyName ?? result.stock.symbol;
  return `Imported Yahoo daily history for ${label}. Inserted ${result.insertedRows} row${result.insertedRows === 1 ? "" : "s"}, updated ${result.updatedRows} row${result.updatedRows === 1 ? "" : "s"}, skipped ${result.skippedRows} row${result.skippedRows === 1 ? "" : "s"}. Latest date: ${result.coverage.lastAvailableDate ?? "unknown"}.`;
}

function createBatchSummary(result: YahooHistoricalOhlcvImportBatchResult) {
  const insertedRows = result.results.reduce((sum, item) => sum + item.insertedRows, 0);
  const updatedRows = result.results.reduce((sum, item) => sum + item.updatedRows, 0);
  const skippedRows = result.results.reduce((sum, item) => sum + item.skippedRows, 0);
  return `Imported Yahoo daily history for ${result.completedCount} stock${result.completedCount === 1 ? "" : "s"}. Inserted ${insertedRows} row${insertedRows === 1 ? "" : "s"}, updated ${updatedRows} row${updatedRows === 1 ? "" : "s"}, skipped ${skippedRows} row${skippedRows === 1 ? "" : "s"}${result.failedCount > 0 ? `. ${result.failedCount} stock${result.failedCount === 1 ? "" : "s"} failed.` : ""}`;
}

export async function GET() {
  await requireOperator();

  return NextResponse.json({
    ok: true,
    endpoint: "/api/admin/market-data/import/yahoo-historical",
    message:
      "Use POST with yahooSymbol + optional stockId for a single import, or a stocks array for a batch import.",
    supportedInput: {
      yahooSymbol: "RELIANCE.NS",
      stockId: "optional stocks_master id",
      period: "max",
      interval: "1d",
      duplicateMode: "replace_matching_dates | skip_existing_dates",
      force: false,
      stocks: [
        {
          yahooSymbol: "RELIANCE.NS",
          stockId: "optional stocks_master id",
        },
      ],
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

    const interval = parseInterval(payload.interval);
    const period = parsePeriod(payload.period);
    const duplicateMode = parseDuplicateMode(payload.duplicateMode);
    const force = payload.force === true;
    const rawStocks = Array.isArray(payload.stocks) ? payload.stocks : [];

    if (rawStocks.length > 0) {
      const stocks = rawStocks
        .map((item) => (item && typeof item === "object" ? (item as Record<string, unknown>) : {}))
        .map((item) => ({
          yahooSymbol: cleanString(item.yahooSymbol, 80).toUpperCase(),
          stockId: cleanString(item.stockId, 160) || null,
        }))
        .filter((item) => item.yahooSymbol);

      if (!stocks.length) {
        return NextResponse.json(
          { error: "Add at least one Yahoo symbol in the stocks array." },
          { status: 400 },
        );
      }

      const result = await runYahooHistoricalOhlcvImportBatch({
        stocks,
        actorEmail,
        actorUserId,
        period,
        interval,
        duplicateMode,
      });

      const warnings: string[] = [];
      const slugs = result.results
        .map((item) => cleanString(item.stock.slug, 160))
        .filter(Boolean);

      try {
        revalidateHistoricalSurfaces(slugs);
      } catch (revalidationError) {
        warnings.push(
          `Revalidation warning: ${revalidationError instanceof Error ? revalidationError.message : "Could not revalidate historical import surfaces."}`,
        );
      }

      if (result.completedCount > 0) {
        try {
          await appendAdminActivityLog({
            actorUserId,
            actorEmail,
            actionType: "market_data.import_completed",
            targetType: "stock_import_job",
            targetId: null,
            targetFamily: "stocks",
            targetSlug: null,
            summary: createBatchSummary(result),
            metadata: {
              yahooSymbols: stocks.map((item) => item.yahooSymbol),
              period,
              interval,
              duplicateMode,
              completedCount: result.completedCount,
              failedCount: result.failedCount,
              jobIds: result.results.map((item) => item.jobId),
              results: result.results.map((item) => ({
                yahooSymbol: item.stock.yahooSymbol,
                stockSlug: item.stock.slug,
                insertedRows: item.insertedRows,
                updatedRows: item.updatedRows,
                skippedRows: item.skippedRows,
                latestDate: item.coverage.lastAvailableDate,
              })),
              failures: result.failures,
            },
          });
        } catch (activityError) {
          warnings.push(
            `Activity log warning: ${activityError instanceof Error ? activityError.message : "Could not append Yahoo historical batch import activity log."}`,
          );
        }
      }

      if (result.completedCount === 0) {
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
              summary: `Yahoo historical daily import failed for ${stocks.length} selected stock${stocks.length === 1 ? "" : "s"}.`,
              metadata: {
                yahooSymbols: stocks.map((item) => item.yahooSymbol),
                period,
                interval,
                duplicateMode,
                failures: result.failures,
              },
            });
          } catch (activityError) {
            console.error(
              "[yahoo-historical-import-route] failed to append failure activity log",
              activityError,
            );
          }
        }

        return NextResponse.json(
          {
            error: "Yahoo historical daily import failed for all selected stocks.",
            ...result,
            warnings,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        ...result,
        warnings,
      });
    }

    const yahooSymbol = cleanString(payload.yahooSymbol, 80).toUpperCase();
    if (!yahooSymbol) {
      return NextResponse.json(
        { error: "Enter a Yahoo symbol such as RELIANCE.NS." },
        { status: 400 },
      );
    }

    const result = await runYahooHistoricalOhlcvImport({
      yahooSymbol,
      stockId: cleanString(payload.stockId, 160) || null,
      actorEmail,
      actorUserId,
      period,
      interval,
      duplicateMode,
      force,
    });

    const warnings = [...result.warnings];
    try {
      revalidateHistoricalSurfaces([cleanString(result.stock.slug, 160)]);
    } catch (revalidationError) {
      warnings.push(
        `Revalidation warning: ${revalidationError instanceof Error ? revalidationError.message : "Could not revalidate historical import surfaces."}`,
      );
    }

    try {
      await appendAdminActivityLog({
        actorUserId,
        actorEmail,
        actionType: "market_data.import_completed",
        targetType: "stock_import_job",
        targetId: result.jobId,
        targetFamily: "stocks",
        targetSlug: result.stock.slug,
        summary: createSingleSummary(result),
        metadata: {
          yahooSymbol: result.stock.yahooSymbol,
          stockSlug: result.stock.slug,
          stockId: result.stock.stockId,
          jobId: result.jobId,
          rawImportId: result.rawImportId,
          period: result.period,
          interval: result.interval,
          insertedRows: result.insertedRows,
          updatedRows: result.updatedRows,
          skippedRows: result.skippedRows,
          totalProcessedRows: result.totalProcessedRows,
          coverage: result.coverage,
          warnings: result.warnings,
        },
      });
    } catch (activityError) {
      warnings.push(
        `Activity log warning: ${activityError instanceof Error ? activityError.message : "Could not append Yahoo historical import activity log."}`,
      );
    }

    return NextResponse.json({
      ...result,
      warnings,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "We could not process that Yahoo historical daily import right now.";

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
          summary: `Yahoo historical daily import failed for ${cleanString(payload.yahooSymbol, 80) || "unknown symbol"}.`,
          metadata: {
            yahooSymbol: cleanString(payload.yahooSymbol, 80) || null,
            stockId: cleanString(payload.stockId, 160) || null,
            period: parsePeriod(payload.period),
            interval: cleanString(payload.interval, 20) || "1d",
            duplicateMode: parseDuplicateMode(payload.duplicateMode),
            error: message,
          },
        });
      } catch (activityError) {
        console.error(
          "[yahoo-historical-import-route] failed to append failure activity log",
          activityError,
        );
      }
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
