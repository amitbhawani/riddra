import { NextResponse } from "next/server";

import { getSourceJobRegistryRows, toSourceJobRegistryCsv } from "@/lib/source-job-registry";

export async function GET() {
  const rows = getSourceJobRegistryRows();
  const csv = toSourceJobRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="source-job-registry.csv"',
    },
  });
}
