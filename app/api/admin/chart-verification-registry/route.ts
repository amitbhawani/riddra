import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getChartVerificationRows,
  toChartVerificationCsv,
} from "@/lib/chart-verification-registry";

export async function GET() {
  await requireAdmin();
  const rows = getChartVerificationRows();

  return new NextResponse(toChartVerificationCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-chart-verification-registry.csv"',
    },
  });
}
