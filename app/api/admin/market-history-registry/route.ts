import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getMarketHistoryRegistryRows,
  toMarketHistoryRegistryCsv,
} from "@/lib/market-history-registry";

export async function GET() {
  await requireAdmin();
  const rows = await getMarketHistoryRegistryRows();
  const csv = toMarketHistoryRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-market-history-registry.csv"',
    },
  });
}
