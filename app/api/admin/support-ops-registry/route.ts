import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { getSupportOpsRegistryRows, toSupportOpsRegistryCsv } from "@/lib/support-ops-registry";

export async function GET() {
  await requireAdmin();
  const rows = getSupportOpsRegistryRows("admin");
  const csv = toSupportOpsRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-support-ops-registry.csv"',
    },
  });
}
