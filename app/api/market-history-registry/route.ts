import { NextResponse } from "next/server";

import {
  getMarketHistoryRegistryRows,
  toMarketHistoryRegistryCsv,
} from "@/lib/market-history-registry";

export async function GET() {
  const rows = await getMarketHistoryRegistryRows();
  const csv = toMarketHistoryRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="market-history-registry.csv"',
    },
  });
}
