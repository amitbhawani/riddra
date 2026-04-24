import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import {
  getSearchIndexRegistryRows,
  toSearchIndexRegistryCsv,
} from "@/lib/search-index-registry";

export async function GET() {
  await requireAdmin();
  const rows = await getSearchIndexRegistryRows();
  const csv = toSearchIndexRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admin-search-index-registry.csv"',
    },
  });
}
