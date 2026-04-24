import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getSupportOpsRegistryRows, toSupportOpsRegistryCsv } from "@/lib/support-ops-registry";

export async function GET() {
  await requireUser();
  const rows = getSupportOpsRegistryRows("account");
  const csv = toSupportOpsRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="support-ops-registry.csv"',
    },
  });
}
