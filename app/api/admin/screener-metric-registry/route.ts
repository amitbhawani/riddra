import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  screenerMetricRegistryRows,
  toScreenerMetricRegistryCsv,
} from "@/lib/screener-metric-registry";

export async function GET() {
  await requireAdmin();
  const csv = toScreenerMetricRegistryCsv(screenerMetricRegistryRows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-screener-metric-registry.csv"',
    },
  });
}
