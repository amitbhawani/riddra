import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { getSourceJobRegistryRows, toSourceJobRegistryCsv } from "@/lib/source-job-registry";

export async function GET() {
  await requireAdmin();
  const rows = getSourceJobRegistryRows();
  const csv = toSourceJobRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-source-job-registry.csv"',
    },
  });
}
