import { NextRequest, NextResponse } from "next/server";

import { appendAdminActivityLog } from "@/lib/admin-activity-log";
import { requireOperator } from "@/lib/auth";
import {
  previewMarketDataImport,
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

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireOperator();
    const payload = (await request.json()) as Record<string, unknown>;
    const type = parseImportType(payload.type);

    if (!type) {
      return NextResponse.json(
        { error: "Choose a supported market-data import type." },
        { status: 400 },
      );
    }

    const preview = (await runMarketDataIngestion("manual_csv", {
      mode: "preview",
      type,
      csvText: cleanString(payload.csvText, 5_000_000),
      fileName: cleanString(payload.fileName, 240) || `${type}.csv`,
      executionMode: parseExecutionMode(payload.executionMode),
      duplicateMode: parseDuplicateMode(payload.duplicateMode),
      sourceType: parseSourceType(payload.sourceType),
      sourceLabel: cleanString(payload.sourceLabel, 240) || null,
      sourceUrl: cleanString(payload.sourceUrl, 600) || null,
    })) as Awaited<ReturnType<typeof previewMarketDataImport>>;

    await appendAdminActivityLog({
      actorUserId: user.id,
      actorEmail: user.email ?? "Operator",
      actionType: "market_data.import_previewed",
      targetType: "market_data_import_preview",
      targetId: null,
      targetFamily: type,
      targetSlug: null,
      summary: `Previewed ${preview.totalRows} ${type} row${preview.totalRows === 1 ? "" : "s"} from ${preview.fileName}.`,
      metadata: {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "We could not preview that import right now.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
