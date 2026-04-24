import { NextResponse } from "next/server";

import {
  screenerMetricRegistryRows,
  toScreenerMetricRegistryCsv,
} from "@/lib/screener-metric-registry";

export async function GET() {
  const csv = toScreenerMetricRegistryCsv(screenerMetricRegistryRows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="screener-metric-registry.csv"',
    },
  });
}
