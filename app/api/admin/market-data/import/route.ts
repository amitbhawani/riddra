import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { appendAdminActivityLog } from "@/lib/admin-activity-log";
import { requireOperator } from "@/lib/auth";
import {
  executeMarketDataImport,
  runMarketDataIngestion,
  supportedMarketDataImportTypes,
  type MarketDataImportDuplicateMode,
  type MarketDataImportExecutionMode,
  type MarketDataImportSourceType,
  type MarketDataImportType,
} from "@/lib/market-data-imports";

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
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

function parseSourceType(value: unknown): MarketDataImportSourceType {
  const normalized = cleanString(value, 120);
  if (
    normalized === "google_sheet" ||
    normalized === "yahoo_finance" ||
    normalized === "provider_api"
  ) {
    return normalized;
  }

  return "manual_csv";
}

function isDevSimulationEnabled(value: unknown) {
  return process.env.NODE_ENV !== "production" && value === true;
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

    const result = (await runMarketDataIngestion("manual_csv", {
      mode: "execute",
      type,
      csvText: cleanString(payload.csvText, 5_000_000),
      fileName: cleanString(payload.fileName, 240) || `${type}.csv`,
      executionMode: parseExecutionMode(payload.executionMode),
      duplicateMode: parseDuplicateMode(payload.duplicateMode),
      sourceType: parseSourceType(payload.sourceType),
      sourceLabel: cleanString(payload.sourceLabel, 240) || null,
      sourceUrl: cleanString(payload.sourceUrl, 600) || null,
      actorUserId,
      actorEmail,
      simulateFinalBatchUpdateFailure: isDevSimulationEnabled(
        payload.__simulateFinalBatchUpdateFailure,
      ),
    })) as Awaited<ReturnType<typeof executeMarketDataImport>>;

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
      if (isDevSimulationEnabled(payload.__simulateActivityLogFailure)) {
        throw new Error("Simulated activity log failure after data writes.");
      }

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
            ? `Market-data import failed for ${result.batch.fileName}.`
            : `Imported ${result.batch.successCount} ${type} row${result.batch.successCount === 1 ? "" : "s"} from ${result.batch.fileName}.`,
        metadata: {
          batchId: result.batch.id,
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
      const warning = `Activity log warning: ${activityError instanceof Error ? activityError.message : "Could not append import activity log after data writes."}`;
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
    const message = error instanceof Error ? error.message : "We could not process that market-data import right now.";
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
          summary: `Market-data import failed for ${cleanString(payload.fileName, 240) || `${type}.csv`}.`,
          metadata: {
            fileName: cleanString(payload.fileName, 240) || `${type}.csv`,
            executionMode: parseExecutionMode(payload.executionMode),
            duplicateMode: parseDuplicateMode(payload.duplicateMode),
            sourceType: parseSourceType(payload.sourceType),
            sourceLabel: cleanString(payload.sourceLabel, 240) || null,
            sourceUrl: cleanString(payload.sourceUrl, 600) || null,
            error: message,
          },
        });
      } catch (activityError) {
        console.error("[market-data-import] failed to append failure activity log", activityError);
      }
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
