import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { appendAdminActivityLog } from "@/lib/admin-activity-log";
import { requireOperator } from "@/lib/auth";
import {
  runMarketDataIngestion,
  supportedMarketDataImportTypes,
  type ExecuteMarketDataImportResult,
  type MarketDataImportDuplicateMode,
  type MarketDataImportExecutionMode,
  type MarketDataImportPreview,
  type MarketDataImportType,
} from "@/lib/market-data-imports";

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function parseMode(value: unknown) {
  return cleanString(value, 40) === "preview" ? "preview" : "execute";
}

function parseImportType(value: unknown): MarketDataImportType | null {
  const normalized = cleanString(value, 120);
  return supportedMarketDataImportTypes.includes(normalized as MarketDataImportType)
    ? (normalized as MarketDataImportType)
    : null;
}

function parseExecutionMode(value: unknown): MarketDataImportExecutionMode {
  return cleanString(value, 120) === "validate_only" ? "validate_only" : "import_valid_rows";
}

function parseDuplicateMode(value: unknown): MarketDataImportDuplicateMode {
  return cleanString(value, 160) === "skip_existing_dates"
    ? "skip_existing_dates"
    : "replace_matching_dates";
}

function revalidateMarketDataImportSurfaces(routes: string[]) {
  revalidatePath("/admin");
  revalidatePath("/admin/activity-log");
  revalidatePath("/admin/market-data");
  revalidatePath("/admin/market-data/import");

  for (const route of routes) {
    revalidatePath(route);
  }
}

export async function POST(request: NextRequest) {
  let actorUserId: string | null = null;
  let actorEmail = "Operator";
  let payload: Record<string, unknown> = {};
  let type: MarketDataImportType | null = null;

  try {
    const { user } = await requireOperator();
    actorUserId = user.id;
    actorEmail = user.email ?? "Operator";
    payload = (await request.json()) as Record<string, unknown>;
    type = parseImportType(payload.type);

    if (!type) {
      return NextResponse.json(
        { error: "Choose a supported market-data import type." },
        { status: 400 },
      );
    }

    const googleSheetUrl = cleanString(payload.googleSheetUrl, 2000);
    if (!googleSheetUrl) {
      return NextResponse.json(
        { error: "Enter a Google Sheet URL before importing." },
        { status: 400 },
      );
    }

    const mode = parseMode(payload.mode);

    if (mode === "preview") {
      const preview = (await runMarketDataIngestion("google_sheet", {
        mode: "preview",
        type,
        googleSheetUrl,
        executionMode: parseExecutionMode(payload.executionMode),
        duplicateMode: parseDuplicateMode(payload.duplicateMode),
        fileName: cleanString(payload.fileName, 240) || `${type}-google-sheet.csv`,
        sourceLabel: cleanString(payload.sourceLabel, 240) || null,
        sourceUrl: cleanString(payload.sourceUrl, 600) || googleSheetUrl,
      })) as MarketDataImportPreview;

      await appendAdminActivityLog({
        actorUserId,
        actorEmail,
        actionType: "market_data.import_previewed",
        targetType: "market_data_import_preview",
        targetId: null,
        targetFamily: type,
        targetSlug: null,
        summary: `Previewed ${preview.totalRows} ${type} row${preview.totalRows === 1 ? "" : "s"} from Google Sheet.`,
        metadata: {
          sourceType: "google_sheet",
          googleSheetUrl,
          fileName: preview.fileName,
          executionMode: preview.executionMode,
          duplicateMode: preview.duplicateMode,
          validRows: preview.validRows,
          warningRows: preview.warningRows,
          failedRows: preview.failedRows,
          duplicateRows: preview.duplicateRows,
        },
      });

      return NextResponse.json(preview);
    }

    const result = (await runMarketDataIngestion("google_sheet", {
      mode: "execute",
      type,
      googleSheetUrl,
      executionMode: parseExecutionMode(payload.executionMode),
      duplicateMode: parseDuplicateMode(payload.duplicateMode),
      fileName: cleanString(payload.fileName, 240) || `${type}-google-sheet.csv`,
      sourceLabel: cleanString(payload.sourceLabel, 240) || null,
      sourceUrl: cleanString(payload.sourceUrl, 600) || googleSheetUrl,
      actorUserId,
      actorEmail,
    })) as ExecuteMarketDataImportResult;

    const warnings = [...result.warnings];
    const persistenceWarnings = [...result.persistenceWarnings];

    try {
      revalidateMarketDataImportSurfaces(result.affectedRoutes);
    } catch (revalidationError) {
      warnings.push(
        `Revalidation warning: ${revalidationError instanceof Error ? revalidationError.message : "Could not revalidate affected routes after import."}`,
      );
    }

    try {
      await appendAdminActivityLog({
        actorUserId,
        actorEmail,
        actionType:
          result.batch.status === "failed"
            ? "market_data.import_failed"
            : "market_data.import_completed",
        targetType: "market_data_import_batch",
        targetId: result.batch.id,
        targetFamily: type,
        targetSlug: null,
        summary:
          result.batch.status === "failed"
            ? `Google Sheet import failed for ${result.batch.fileName}.`
            : `Imported ${result.batch.successCount} ${type} row${result.batch.successCount === 1 ? "" : "s"} from Google Sheet.`,
        metadata: {
          batchId: result.batch.id,
          sourceType: "google_sheet",
          googleSheetUrl,
          fileName: result.batch.fileName,
          executionMode: result.batch.executionMode,
          duplicateMode: result.batch.duplicateMode,
          rowCount: result.batch.rowCount,
          successCount: result.batch.successCount,
          failureCount: result.batch.failureCount,
          skippedCount: result.batch.skippedCount,
          affectedAssets: result.affectedAssets,
          affectedRoutes: result.affectedRoutes,
        },
      });
    } catch (activityError) {
      const warning = `Activity log warning: ${activityError instanceof Error ? activityError.message : "Could not append Google Sheet import activity log after data writes."}`;
      warnings.push(warning);
      persistenceWarnings.push(warning);
      result.batch = {
        ...result.batch,
        metadata: {
          ...result.batch.metadata,
          activity_log_warning: warning,
        },
      };
    }

    return NextResponse.json({
      ...result,
      warnings,
      persistenceWarnings,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "We could not process that Google Sheet market-data import right now.";

    if (actorUserId && type) {
      try {
        await appendAdminActivityLog({
          actorUserId,
          actorEmail,
          actionType: "market_data.import_failed",
          targetType: "market_data_import_batch",
          targetId: null,
          targetFamily: type,
          targetSlug: null,
          summary: `Google Sheet import failed for ${cleanString(payload.fileName, 240) || `${type}-google-sheet.csv`}.`,
          metadata: {
            fileName: cleanString(payload.fileName, 240) || `${type}-google-sheet.csv`,
            sourceType: "google_sheet",
            googleSheetUrl: cleanString(payload.googleSheetUrl, 2000) || null,
            executionMode: parseExecutionMode(payload.executionMode),
            duplicateMode: parseDuplicateMode(payload.duplicateMode),
            sourceLabel: cleanString(payload.sourceLabel, 240) || null,
            sourceUrl: cleanString(payload.sourceUrl, 600) || null,
            error: message,
          },
        });
      } catch (activityError) {
        console.error(
          "[market-data-import-google-sheet] failed to append failure activity log",
          activityError,
        );
      }
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
