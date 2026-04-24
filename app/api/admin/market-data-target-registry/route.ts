import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getMarketDataTargetRegistryRows,
  toMarketDataTargetCsv,
} from "@/lib/market-data-target-registry";

export async function GET() {
  await requireAdmin();
  const rows = await getMarketDataTargetRegistryRows();

  return new NextResponse(toMarketDataTargetCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-market-data-target-registry.csv"',
    },
  });
}
