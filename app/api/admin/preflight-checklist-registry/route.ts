import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getPreflightChecklistRegistryRows,
  toPreflightChecklistRegistryCsv,
} from "@/lib/preflight-checklist-registry";

export async function GET() {
  await requireAdmin();
  const rows = getPreflightChecklistRegistryRows();
  const csv = toPreflightChecklistRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-preflight-checklist-registry.csv"',
    },
  });
}
