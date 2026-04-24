import { NextResponse } from "next/server";

import {
  getSearchIndexRegistryRows,
  toSearchIndexRegistryCsv,
} from "@/lib/search-index-registry";

export async function GET() {
  const rows = await getSearchIndexRegistryRows();
  const csv = toSearchIndexRegistryCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="search-index-registry.csv"',
    },
  });
}
