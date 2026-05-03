import { NextRequest } from "next/server";

import { requireOperator } from "@/lib/auth";
import {
  getMarketDataImportSampleCsv,
  supportedMarketDataImportTypes,
  type MarketDataImportType,
} from "@/lib/market-data-imports";

function parseImportType(value: string): MarketDataImportType | null {
  return supportedMarketDataImportTypes.includes(value as MarketDataImportType)
    ? (value as MarketDataImportType)
    : null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  await requireOperator();
  const { type } = await params;
  const parsedType = parseImportType(type);

  if (!parsedType) {
    return new Response("Unsupported market-data template.", { status: 404 });
  }

  const sampleCsv = getMarketDataImportSampleCsv(parsedType);
  return new Response(sampleCsv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${parsedType}-sample.csv"`,
    },
  });
}
