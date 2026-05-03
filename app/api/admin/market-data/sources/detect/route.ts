import { NextRequest, NextResponse } from "next/server";

import { appendAdminActivityLog } from "@/lib/admin-activity-log";
import { requireOperator } from "@/lib/auth";
import {
  previewMarketDataSourceCandidate,
  type MarketDataSourceWizardAssetType,
  type MarketDataSourceWizardSourceType,
} from "@/lib/market-data-source-wizard";

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function parseAssetType(value: unknown): MarketDataSourceWizardAssetType {
  const normalized = cleanString(value, 80);
  if (normalized === "stock" || normalized === "benchmark" || normalized === "fund") {
    return normalized;
  }
  return "auto";
}

function parseSourceType(value: unknown): MarketDataSourceWizardSourceType {
  const normalized = cleanString(value, 120);
  if (
    normalized === "google_sheet" ||
    normalized === "yahoo_finance" ||
    normalized === "provider_api"
  ) {
    return normalized;
  }
  return "auto";
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireOperator();
    const payload = (await request.json()) as Record<string, unknown>;
    const sourceInput = cleanString(payload.sourceInput, 2000);
    if (!sourceInput) {
      return NextResponse.json(
        { error: "Paste a source URL or symbol before previewing." },
        { status: 400 },
      );
    }

    const preview = await previewMarketDataSourceCandidate({
      sourceInput,
      assetType: parseAssetType(payload.assetType),
      sourceType: parseSourceType(payload.sourceType),
    });

    await appendAdminActivityLog({
      actorUserId: user.id,
      actorEmail: user.email ?? "Operator",
      actionType: "market_data.source_previewed",
      targetType: "market_data_source",
      targetId: preview.existingSourceId,
      targetFamily: "market_data_source",
      targetSlug:
        preview.suggestedSource.assetSlug ||
        preview.suggestedSource.benchmarkSlug ||
        preview.suggestedSource.schemeCode ||
        null,
      summary: `Previewed ${preview.mapping?.mappedDisplayName || preview.suggestedSource.symbol || preview.detectedSourceType} from ${preview.detectedSourceType}. ${preview.rowsThatWillImport} row(s) would be imported.`,
      metadata: {
        sourceInput,
        detectedSourceType: preview.detectedSourceType,
        normalizedSourceUrl: preview.normalizedSourceUrl,
        mappedSlug: preview.mapping?.mappedSlug,
        mappedDisplayName: preview.mapping?.mappedDisplayName,
        confidence: preview.mapping?.confidenceScore ?? 0,
        rowCount: preview.rowCount,
        rowsAvailable: preview.rowsAvailable,
        rowsThatWillImport: preview.rowsThatWillImport,
        duplicateRows: preview.duplicateRows,
        latestDate: preview.latestDate,
        latestStoredDate: preview.latestStoredDate,
        warnings: preview.warnings,
      },
    }).catch(() => undefined);

    return NextResponse.json(preview);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not detect and preview that market-data source right now.",
      },
      { status: 500 },
    );
  }
}
