import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { getResearchArchiveRegistryRows, toResearchArchiveRegistryCsv } from "@/lib/research-archive-registry";

export async function GET() {
  await requireAdmin();
  const rows = await getResearchArchiveRegistryRows();
  const csv = toResearchArchiveRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-research-archive-registry.csv"',
    },
  });
}
