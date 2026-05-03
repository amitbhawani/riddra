import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { appendAdminActivityLog } from "@/lib/admin-activity-log";
import { requireOperator } from "@/lib/auth";
import {
  previewBulkMarketDataSources,
  type MarketDataSourceBulkPreviewRow,
} from "@/lib/market-data-source-wizard";
import { saveMarketDataSource } from "@/lib/market-data-source-registry";

function cleanString(value: unknown, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function humanizeSlug(value: string) {
  return cleanString(value, 240)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function revalidateMarketDataSourceSurfaces() {
  revalidatePath("/admin");
  revalidatePath("/admin/activity-log");
  revalidatePath("/admin/market-data");
  revalidatePath("/admin/market-data/sources");
  revalidatePath("/admin/market-data/sources/import");
}

function canSaveBulkRow(row: MarketDataSourceBulkPreviewRow) {
  return (
    row.status !== "failed" &&
    !!row.suggestedSource &&
    !!cleanString(row.suggestedSource.sourceUrl, 2000) &&
    !!cleanString(
      row.suggestedSource.assetSlug ||
        row.suggestedSource.benchmarkSlug ||
        row.suggestedSource.schemeCode,
      160,
    )
  );
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireOperator();
    const payload = (await request.json()) as Record<string, unknown>;
    const mode = cleanString(payload.mode, 80) === "save" ? "save" : "preview";
    const csvText = cleanString(payload.csvText, 2_000_000);
    if (!csvText) {
      return NextResponse.json(
        { error: "Upload or paste the source onboarding CSV before continuing." },
        { status: 400 },
      );
    }

    const rows = await previewBulkMarketDataSources(csvText);

    if (mode === "preview") {
      return NextResponse.json({
        rows,
        totalRows: rows.length,
        readyRows: rows.filter((row) => row.status === "ready").length,
        warningRows: rows.filter((row) => row.status === "warning").length,
        failedRows: rows.filter((row) => row.status === "failed").length,
      });
    }

    const savedSources = [];
    let skippedDuplicates = 0;
    for (const row of rows) {
      if (!canSaveBulkRow(row) || !row.suggestedSource) {
        continue;
      }

      if (row.duplicateSourceDetected) {
        skippedDuplicates += 1;
        continue;
      }

      savedSources.push(await saveMarketDataSource(row.suggestedSource));
    }

    revalidateMarketDataSourceSurfaces();

    await Promise.all(
      savedSources.map((source) =>
        appendAdminActivityLog({
          actorUserId: user.id,
          actorEmail: user.email ?? "Operator",
          actionType: "market_data.source_created",
          targetType: "market_data_source",
          targetId: source.id,
          targetFamily: "market_data_source",
          targetSlug:
            source.assetSlug || source.benchmarkSlug || cleanString(source.schemeCode, 160) || null,
          summary: `Created ${source.sourceType} source for ${
            cleanString(source.metadata.source_name, 240) ||
            humanizeSlug(source.assetSlug || "") ||
            source.benchmarkSlug ||
            source.symbol ||
            source.schemeCode ||
            source.id
          } from the bulk onboarding CSV.`,
          metadata: {
            sourceId: source.id,
            sourceType: source.sourceType,
            sourceUrl: source.sourceUrl,
            assetSlug: source.assetSlug,
            symbol: source.symbol,
            benchmarkSlug: source.benchmarkSlug,
            schemeCode: source.schemeCode,
            timeframe: source.timeframe,
          },
        }).catch(() => undefined),
      ),
    );

    await appendAdminActivityLog({
      actorUserId: user.id,
      actorEmail: user.email ?? "Operator",
      actionType: "market_data.source_bulk_saved",
      targetType: "market_data_source_import",
      targetId: null,
      targetFamily: "market_data_source",
      targetSlug: null,
      summary: `Saved ${savedSources.length} market-data source row${
        savedSources.length === 1 ? "" : "s"
      } from bulk onboarding CSV and skipped ${skippedDuplicates} duplicate row${
        skippedDuplicates === 1 ? "" : "s"
      }.`,
      metadata: {
        totalRows: rows.length,
        savedRows: savedSources.length,
        skippedDuplicates,
        failedRows: rows.filter((row) => row.status === "failed").length,
        warningRows: rows.filter((row) => row.status === "warning").length,
      },
    });

    return NextResponse.json({
      rows,
      savedSources,
      totalRows: rows.length,
      savedRows: savedSources.length,
      skippedDuplicates,
      failedRows: rows.filter((row) => row.status === "failed").length,
      warningRows: rows.filter((row) => row.status === "warning").length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not process the bulk source onboarding CSV right now.",
      },
      { status: 500 },
    );
  }
}
