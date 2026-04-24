import { NextResponse } from "next/server";

import {
  getLaunchApprovalRegistryRows,
  toLaunchApprovalRegistryCsv,
} from "@/lib/launch-approval-registry";

export async function GET() {
  const rows = getLaunchApprovalRegistryRows();
  const csv = toLaunchApprovalRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="launch-approval-registry.csv"',
    },
  });
}
