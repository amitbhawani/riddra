import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getLaunchDayRunbookRegistryRows,
  toLaunchDayRunbookCsv,
} from "@/lib/launch-day-runbook-registry";

export async function GET() {
  await requireAdmin();
  const rows = getLaunchDayRunbookRegistryRows();

  return new NextResponse(toLaunchDayRunbookCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-launch-day-runbook-registry.csv"',
    },
  });
}
