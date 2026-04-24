import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getReliabilityOpsRegistryRows,
  toReliabilityOpsCsv,
} from "@/lib/reliability-ops-registry";

export async function GET() {
  await requireAdmin();
  const rows = getReliabilityOpsRegistryRows();

  return new NextResponse(toReliabilityOpsCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-reliability-ops-registry.csv"',
    },
  });
}
