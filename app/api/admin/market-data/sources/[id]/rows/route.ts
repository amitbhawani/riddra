import { NextRequest, NextResponse } from "next/server";

import { requireOperator } from "@/lib/auth";
import {
  getMarketDataSourceById,
  listLatestMarketDataSourceRows,
} from "@/lib/market-data-source-registry";
import { previewMarketDataSourceSnapshot } from "@/lib/market-data-sync";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireOperator();
    const { id } = await context.params;
    const source = await getMarketDataSourceById(id);
    if (!source) {
      return NextResponse.json({ error: "Market-data source not found." }, { status: 404 });
    }

    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "10");
    const [dbRows, previewResult] = await Promise.all([
      listLatestMarketDataSourceRows(id, limit),
      previewMarketDataSourceSnapshot(source, limit).catch((error) => ({
        error:
          error instanceof Error
            ? error.message
            : "Could not preview the upstream source rows right now.",
      })),
    ]);

    return NextResponse.json({
      source,
      dbRows,
      sourceRows: "sourceRows" in previewResult ? previewResult.sourceRows : [],
      sourcePreview:
        "sourceRows" in previewResult
          ? {
              latestStoredDate: previewResult.latestStoredDate,
              latestSourceDate: previewResult.latestSourceDate,
              latestStoredValue: previewResult.latestStoredValue,
              latestSourceValue: previewResult.latestSourceValue,
              rowsAvailable: previewResult.rowsAvailable,
              rowsThatWillImport: previewResult.rowsThatWillImport,
              duplicateRows: previewResult.preview.duplicateRows,
              warningRows: previewResult.preview.warningRows,
              failedRows: previewResult.preview.failedRows,
              missingColumns: previewResult.preview.missingColumns,
              warnings: previewResult.warnings,
            }
          : null,
      previewError: "error" in previewResult ? previewResult.error : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load the latest source rows right now.",
      },
      { status: 500 },
    );
  }
}
