import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getLiveSmokeTestRegistryRows,
  toLiveSmokeTestCsv,
} from "@/lib/live-smoke-tests";

export async function GET() {
  await requireAdmin();
  const rows = getLiveSmokeTestRegistryRows();

  return new NextResponse(toLiveSmokeTestCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-smoke-test-journeys.csv"',
    },
  });
}
