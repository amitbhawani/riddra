import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { getSearchQueryMemory, toSearchQueryRegistryCsv } from "@/lib/search-query-memory-store";

export async function GET(request: Request) {
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");
  const searchQueryMemory = await getSearchQueryMemory();

  if (format === "json") {
    return NextResponse.json(searchQueryMemory);
  }

  return new NextResponse(toSearchQueryRegistryCsv(searchQueryMemory.events), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="search-query-registry.csv"',
    },
  });
}
