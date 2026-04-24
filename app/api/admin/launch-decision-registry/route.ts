import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getLaunchDecisionRegistryRows,
  toLaunchDecisionRegistryCsv,
} from "@/lib/launch-decision-registry";

export async function GET() {
  await requireAdmin();
  const rows = getLaunchDecisionRegistryRows();
  const csv = toLaunchDecisionRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-launch-decision-registry.csv"',
    },
  });
}
