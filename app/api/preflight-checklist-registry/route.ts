import { NextResponse } from "next/server";

import {
  getPreflightChecklistRegistryRows,
  toPreflightChecklistRegistryCsv,
} from "@/lib/preflight-checklist-registry";

export async function GET() {
  const rows = getPreflightChecklistRegistryRows();
  const csv = toPreflightChecklistRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="preflight-checklist-registry.csv"',
    },
  });
}
